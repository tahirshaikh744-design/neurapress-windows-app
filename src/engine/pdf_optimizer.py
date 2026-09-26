"""
NEURAPRESS Production-Grade PDF Compression Engine
Selective optimization pipeline using pypdf and Pillow.
Preserves page structure, vectors, fonts, text, forms, links, annotations, and bookmarks.
"""

import sys
import os
import io
import math
import json
import time
import argparse
import traceback
from typing import Dict, Any, List, Optional, Tuple
import pypdf
from pypdf import PdfReader, PdfWriter
from pypdf.generic import DictionaryObject, ArrayObject, NameObject
from PIL import Image

# Supported structured error codes
ERR_INVALID_PDF = "INVALID_PDF"
ERR_PASSWORD_REQUIRED = "PASSWORD_REQUIRED"
ERR_ENCRYPTED_UNSUPPORTED = "ENCRYPTED_UNSUPPORTED"
ERR_OUTPUT_WRITE_FAILURE = "OUTPUT_WRITE_FAILURE"
ERR_OUTPUT_VALIDATION_FAILURE = "OUTPUT_VALIDATION_FAILURE"
ERR_CANCELLED = "CANCELLED"
ERR_UNKNOWN_FAILURE = "UNKNOWN_FAILURE"

PROFILES = {
    "extreme": {
        "target_dpi": 110,
        "jpeg_quality": 50,
        "downsample": True,
        "recompress": True,
        "monochrome": False,
        "structural_opt": True,
        "remove_metadata": False
    },
    "balanced": {
        "target_dpi": 150,
        "jpeg_quality": 70,
        "downsample": True,
        "recompress": True,
        "monochrome": False,
        "structural_opt": True,
        "remove_metadata": False
    },
    "studio": {
        "target_dpi": 300,
        "jpeg_quality": 85,
        "downsample": True,
        "recompress": True,
        "monochrome": False,
        "structural_opt": True,
        "remove_metadata": False
    },
    "custom": {
        "target_dpi": 150,
        "jpeg_quality": 70,
        "downsample": True,
        "recompress": True,
        "monochrome": False,
        "structural_opt": True,
        "remove_metadata": False
    }
}


def send_event(event_type: str, data: Dict[str, Any]):
    """Emit JSON event to stdout for IPC consumption."""
    payload = {"type": event_type, **data}
    try:
        sys.stdout.write(json.dumps(payload) + "\n")
        sys.stdout.flush()
    except Exception:
        pass


def detect_digital_signatures(reader: PdfReader) -> bool:
    """Detect if the PDF is digitally signed."""
    try:
        root = reader.trailer.get("/Root")
        if root and isinstance(root, DictionaryObject):
            if "/AcroForm" in root:
                acro = root["/AcroForm"]
                if hasattr(acro, "get_object"):
                    acro = acro.get_object()
                if isinstance(acro, dict):
                    if acro.get("/SigFlags", 0) > 0:
                        return True
                    fields = acro.get("/Fields", [])
                    for f in fields:
                        f_obj = f.get_object() if hasattr(f, "get_object") else f
                        if isinstance(f_obj, dict) and f_obj.get("/FT") == "/Sig":
                            return True
        for obj in reader.objects.values():
            if isinstance(obj, dict) and "/ByteRange" in obj and "/Contents" in obj:
                return True
    except Exception:
        pass
    return False


def extract_image_transformations(page: pypdf._page.PageObject) -> Dict[str, Tuple[float, float]]:
    """Derive displayed width and height in inches from the page content stream matrix stack."""
    transforms = {}
    try:
        content = page.get_contents()
        if not content:
            return transforms
        
        matrix_stack: List[List[float]] = []
        current_matrix = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0]  # [a, b, c, d, e, f]

        def multiply_matrix(m1, m2):
            a1, b1, c1, d1, e1, f1 = m1
            a2, b2, c2, d2, e2, f2 = m2
            return [
                a1 * a2 + b1 * c2,
                a1 * b2 + b1 * d2,
                c1 * a2 + d1 * c2,
                c1 * b2 + d1 * d2,
                e1 * a2 + f1 * c2 + e2,
                e1 * b2 + f1 * d2 + f2,
            ]

        for param, ope in content.operations:
            if ope == b"q":
                matrix_stack.append(list(current_matrix))
            elif ope == b"Q":
                if matrix_stack:
                    current_matrix = matrix_stack.pop()
            elif ope == b"cm" and len(param) == 6:
                try:
                    new_m = [float(p) for p in param]
                    current_matrix = multiply_matrix(new_m, current_matrix)
                except Exception:
                    pass
            elif ope == b"Do" and param:
                name = str(param[0])
                a, b, c, d, e, f = current_matrix
                scale_x = math.sqrt(a * a + b * b)
                scale_y = math.sqrt(c * c + d * d)
                width_in = max(0.01, scale_x / 72.0)
                height_in = max(0.01, scale_y / 72.0)
                transforms[name] = (width_in, height_in)
    except Exception:
        pass
    return transforms


def analyze_document(pdf_path: str) -> Dict[str, Any]:
    """Inspect and analyze PDF document properties and embedded elements."""
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"File not found: {pdf_path}")

    file_size = os.path.getsize(pdf_path)
    try:
        reader = PdfReader(pdf_path)
    except Exception as e:
        raise ValueError(f"Corrupt or unreadable PDF: {str(e)}")

    if reader.is_encrypted:
        try:
            # Attempt blank password decrypt
            decrypted = reader.decrypt("")
            if decrypted == 0:
                return {
                    "encrypted": True,
                    "password_required": True,
                    "fileSize": file_size,
                    "pageCount": 0,
                    "warnings": ["Document is password protected."]
                }
        except Exception:
            return {
                "encrypted": True,
                "password_required": True,
                "fileSize": file_size,
                "pageCount": 0,
                "warnings": ["Document is password protected."]
            }

    page_count = len(reader.pages)
    has_forms = False
    has_annotations = False
    has_outlines = False
    has_attachments = False
    is_signed = detect_digital_signatures(reader)
    warnings = []

    if is_signed:
        warnings.append("This PDF contains a digital signature. Optimizing it may invalidate the existing signature.")

    try:
        has_outlines = bool(reader.outline)
    except Exception:
        pass

    try:
        has_attachments = bool(reader.attachment_list)
    except Exception:
        pass

    image_count = 0
    inline_image_count = 0
    total_image_bytes_estimate = 0
    page_analyses = []

    has_text = False
    for idx, page in enumerate(reader.pages):
        page_num = idx + 1
        w = float(page.mediabox.width)
        h = float(page.mediabox.height)
        rot = int(page.rotation) if page.rotation else 0
        has_page_annots = bool(page.annotations)
        if has_page_annots:
            has_annotations = True

        page_text = ""
        try:
            page_text = page.extract_text() or ""
            if page_text.strip():
                has_text = True
        except Exception:
            pass

        page_images = []
        try:
            for img in page.images:
                is_inline = bool(getattr(img, "is_inline", False))
                if is_inline:
                    inline_image_count += 1
                else:
                    image_count += 1

                img_len = len(img.data) if hasattr(img, "data") and img.data else 0
                total_image_bytes_estimate += img_len

                pil_img = getattr(img, "image", None)
                dims = pil_img.size if pil_img else (0, 0)
                mode = pil_img.mode if pil_img else "UNKNOWN"
                fmt = pil_img.format if pil_img else "RAW"

                page_images.append({
                    "name": getattr(img, "name", f"img_{len(page_images)}"),
                    "isInline": is_inline,
                    "width": dims[0],
                    "height": dims[1],
                    "mode": mode,
                    "format": fmt,
                    "bytes": img_len
                })
        except Exception:
            pass

        page_analyses.append({
            "pageNumber": page_num,
            "width": w,
            "height": h,
            "rotation": rot,
            "hasAnnotations": has_page_annots,
            "hasText": bool(page_text.strip()),
            "imageCount": len(page_images),
            "images": page_images
        })

    try:
        fields = reader.get_fields()
        has_forms = bool(fields)
    except Exception:
        pass

    if inline_image_count > 0:
        warnings.append(f"{inline_image_count} inline image(s) detected. These will be preserved without page rasterization.")

    return {
        "fileSize": file_size,
        "pageCount": page_count,
        "encrypted": False,
        "password_required": False,
        "isSigned": is_signed,
        "hasText": has_text,
        "hasForms": has_forms,
        "hasAnnotations": has_annotations,
        "hasOutlines": has_outlines,
        "hasAttachments": has_attachments,
        "imageCount": image_count,
        "inlineImageCount": inline_image_count,
        "totalImageBytesEstimate": total_image_bytes_estimate,
        "warnings": warnings,
        "pageAnalyses": page_analyses
    }


def optimize_pdf(
    input_path: str,
    output_path: str,
    profile_name: str = "balanced",
    custom_settings: Optional[Dict[str, Any]] = None,
    progress_callback: Optional[callable] = None
) -> Dict[str, Any]:
    """Execute high-fidelity selective PDF optimization pipeline."""
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    # Build active profile settings
    cfg = dict(PROFILES.get(profile_name, PROFILES["balanced"]))
    if profile_name == "custom" and custom_settings:
        for k, v in custom_settings.items():
            if k in cfg:
                cfg[k] = v

    target_dpi = max(72, min(600, int(cfg.get("target_dpi", 150))))
    jpeg_quality = max(20, min(95, int(cfg.get("jpeg_quality", 70))))
    enable_downsample = bool(cfg.get("downsample", True))
    enable_recompress = bool(cfg.get("recompress", True))
    monochrome = bool(cfg.get("monochrome", False))
    structural_opt = bool(cfg.get("structural_opt", True))
    remove_metadata = bool(cfg.get("remove_metadata", False))

    orig_size = os.path.getsize(input_path)

    if progress_callback:
        progress_callback("analyzing", 5, "Analyzing PDF structure and resources...")

    analysis = analyze_document(input_path)
    if analysis.get("password_required"):
        raise PermissionError("Document is encrypted and requires a password to open.")

    reader = PdfReader(input_path)
    writer = PdfWriter()

    # Clone document root, outline, metadata, and pages
    if progress_callback:
        progress_callback("cloning", 15, "Cloning structural tree and document root...")
    writer.clone_document_from_reader(reader)

    total_pages = len(writer.pages)
    total_images_analyzed = 0
    total_images_optimized = 0
    total_images_skipped = 0
    warnings = list(analysis.get("warnings", []))

    # Phase B: Selective image optimization
    for page_idx, page in enumerate(writer.pages):
        page_num = page_idx + 1
        pct = 15 + int((page_num / max(1, total_pages)) * 60)
        if progress_callback:
            progress_callback(
                "optimizing_images",
                pct,
                f"Inspecting page {page_num} of {total_pages} ({total_images_optimized} optimized)..."
            )

        transforms = extract_image_transformations(page)

        try:
            page_images = list(page.images)
        except Exception:
            page_images = []

        for img_obj in page_images:
            total_images_analyzed += 1
            if getattr(img_obj, "is_inline", False):
                total_images_skipped += 1
                continue

            pil_img = getattr(img_obj, "image", None)
            if not pil_img:
                total_images_skipped += 1
                continue

            orig_w, orig_h = pil_img.size

            # Rule 1: Tiny images (icons, decorations, glyphs) are kept as-is
            if orig_w < 64 and orig_h < 64:
                total_images_skipped += 1
                continue

            # Rule 2: Derive effective DPI
            disp_in = transforms.get(getattr(img_obj, "name", ""), None)
            if disp_in:
                disp_w_in, disp_h_in = disp_in
                eff_dpi_x = orig_w / max(0.1, disp_w_in)
                eff_dpi_y = orig_h / max(0.1, disp_h_in)
                effective_dpi = min(eff_dpi_x, eff_dpi_y)
            else:
                effective_dpi = None

            # Calculate target dimensions
            target_w = orig_w
            target_h = orig_h

            if enable_downsample:
                if effective_dpi and effective_dpi > (target_dpi * 1.15):
                    ratio = target_dpi / effective_dpi
                    target_w = max(32, int(orig_w * ratio))
                    target_h = max(32, int(orig_h * ratio))
                elif not effective_dpi:
                    # Fallback conservative dimension capping for large scans without transform matrix
                    max_dim = int(target_dpi * 11.5)  # e.g. 150 * 11.5 = 1725px
                    if max(orig_w, orig_h) > max_dim:
                        scale_factor = max_dim / max(orig_w, orig_h)
                        target_w = max(32, int(orig_w * scale_factor))
                        target_h = max(32, int(orig_h * scale_factor))

            needs_resize = (target_w < orig_w) and (target_h < orig_h)
            needs_recompress = enable_recompress

            if not needs_resize and not needs_recompress and not monochrome:
                total_images_skipped += 1
                continue

            # Process PIL image
            processed_img = pil_img
            if monochrome:
                if processed_img.mode != "L":
                    processed_img = processed_img.convert("L")

            if needs_resize:
                try:
                    processed_img = processed_img.resize(
                        (target_w, target_h),
                        Image.Resampling.LANCZOS
                    )
                except Exception:
                    pass

            # Image format and transparency rules
            has_alpha = processed_img.mode in ("RGBA", "LA") or (
                processed_img.mode == "P" and "transparency" in processed_img.info
            )

            kwargs = {}
            if has_alpha:
                # Retain transparency without lossy destruction
                if needs_resize:
                    try:
                        img_obj.replace(processed_img)
                        total_images_optimized += 1
                    except Exception:
                        total_images_skipped += 1
                else:
                    total_images_skipped += 1
            else:
                # Safe JPEG quantization candidate
                if processed_img.mode not in ("RGB", "L"):
                    try:
                        processed_img = processed_img.convert("RGB")
                    except Exception:
                        pass
                kwargs["quality"] = jpeg_quality

                try:
                    img_obj.replace(processed_img, **kwargs)
                    total_images_optimized += 1
                except Exception:
                    total_images_skipped += 1

    # Phase C: Structural optimization
    if structural_opt:
        if progress_callback:
            progress_callback("structural", 80, "Compressing content streams & merging identical objects...")
        for p in writer.pages:
            try:
                p.compress_content_streams()
            except Exception:
                pass
        try:
            writer.compress_identical_objects(remove_duplicates=True, remove_unreferenced=True)
        except Exception:
            pass

    if remove_metadata:
        try:
            writer.add_metadata({})
        except Exception:
            pass

    # Phase D: Atomic write
    if progress_callback:
        progress_callback("writing", 90, "Writing optimized binary buffer...")

    temp_out = output_path + ".tmp"
    try:
        with open(temp_out, "wb") as f:
            writer.write(f)
    except Exception as e:
        if os.path.exists(temp_out):
            os.remove(temp_out)
        raise IOError(f"Failed to write output PDF: {str(e)}")

    # Phase E: Output validation
    if progress_callback:
        progress_callback("validating", 95, "Validating output PDF integrity...")

    validation = validate_output(input_path, temp_out)
    if not validation["valid"]:
        if os.path.exists(temp_out):
            os.remove(temp_out)
        raise ValueError(f"Output verification failed: {validation['reason']}")

    # Atomic move
    if os.path.exists(output_path):
        os.remove(output_path)
    os.rename(temp_out, output_path)

    final_size = os.path.getsize(output_path)
    saved_bytes = max(0, orig_size - final_size)
    growth_bytes = max(0, final_size - orig_size)
    saved_percent = round((saved_bytes / orig_size) * 100, 2) if orig_size > 0 else 0.0
    growth_percent = round((growth_bytes / orig_size) * 100, 2) if orig_size > 0 else 0.0

    if progress_callback:
        progress_callback("complete", 100, "Optimization pipeline complete.")

    result = {
        "success": True,
        "inputPath": input_path,
        "outputPath": output_path,
        "inputBytes": orig_size,
        "outputBytes": final_size,
        "bytesSaved": saved_bytes,
        "savedPercent": saved_percent,
        "bytesGrown": growth_bytes,
        "growthPercent": growth_percent,
        "pageCount": total_pages,
        "pagesOptimized": total_pages,
        "imagesAnalyzed": total_images_analyzed,
        "imagesOptimized": total_images_optimized,
        "imagesSkipped": total_images_skipped,
        "warnings": warnings,
        "validation": validation
    }
    return result


def validate_output(original_path: str, output_path: str) -> Dict[str, Any]:
    """Validate that the compressed output preserves document structure and text."""
    if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
        return {"valid": False, "reason": "Output file is empty or missing."}

    try:
        orig_reader = PdfReader(original_path)
        out_reader = PdfReader(output_path)
    except Exception as e:
        return {"valid": False, "reason": f"Output could not be parsed: {str(e)}"}

    # 1. Page count check
    if len(orig_reader.pages) != len(out_reader.pages):
        return {
            "valid": False,
            "reason": f"Page count mismatch: original has {len(orig_reader.pages)}, output has {len(out_reader.pages)}"
        }

    # 2. Dimensions & rotation check
    for idx in range(min(5, len(orig_reader.pages))):
        orig_p = orig_reader.pages[idx]
        out_p = out_reader.pages[idx]
        if abs(float(orig_p.mediabox.width) - float(out_p.mediabox.width)) > 2.0 or \
           abs(float(orig_p.mediabox.height) - float(out_p.mediabox.height)) > 2.0:
            return {
                "valid": False,
                "reason": f"Page {idx + 1} dimensions altered during optimization."
            }
        orig_rot = int(orig_p.rotation) if orig_p.rotation else 0
        out_rot = int(out_p.rotation) if out_p.rotation else 0
        if orig_rot != out_rot:
            return {
                "valid": False,
                "reason": f"Page {idx + 1} rotation mismatch ({orig_rot} != {out_rot})."
            }

    # 3. Text preservation check on sample pages
    for idx in range(min(5, len(orig_reader.pages))):
        orig_text = orig_reader.pages[idx].extract_text() or ""
        out_text = out_reader.pages[idx].extract_text() or ""
        # If original had text, output must retain the text (not converted to blank or raster)
        if len(orig_text.strip()) > 20:
            if len(out_text.strip()) < len(orig_text.strip()) * 0.70:
                return {
                    "valid": False,
                    "reason": f"Searchable text lost on page {idx + 1} during optimization."
                }

    return {"valid": True, "reason": "All integrity verifications passed successfully."}


def cli_main():
    """CLI Entry point for Electron IPC and command line usage."""
    parser = argparse.ArgumentParser(description="NeuraPress Quantum Native PDF Optimization Engine")
    parser.add_argument("--analyze", action="store_true", help="Analyze document without modifying")
    parser.add_argument("--input", "-i", type=str, required=True, help="Input PDF path")
    parser.add_argument("--output", "-o", type=str, help="Output PDF path")
    parser.add_argument("--profile", "-p", type=str, default="balanced", choices=list(PROFILES.keys()), help="Compression profile")
    parser.add_argument("--dpi", type=int, help="Target image DPI")
    parser.add_argument("--quality", type=int, help="JPEG quality level (15-95)")
    parser.add_argument("--monochrome", action="store_true", help="Convert images to monochrome")
    parser.add_argument("--no-downsample", action="store_true", help="Disable image downsampling")
    parser.add_argument("--no-recompress", action="store_true", help="Disable JPEG recompression")
    parser.add_argument("--remove-metadata", action="store_true", help="Strip document metadata")
    parser.add_argument("--no-structural", action="store_true", help="Disable structural optimization")

    args = parser.parse_args()

    if args.analyze:
        try:
            analysis = analyze_document(args.input)
            send_event("analysis", analysis)
            sys.exit(0)
        except Exception as e:
            send_event("error", {"code": ERR_INVALID_PDF, "message": str(e)})
            sys.exit(1)

    if not args.output:
        sys.stderr.write("Error: --output is required when optimizing.\n")
        sys.exit(1)

    custom_cfg = {}
    if args.dpi:
        custom_cfg["target_dpi"] = args.dpi
    if args.quality:
        custom_cfg["jpeg_quality"] = args.quality
    if args.monochrome:
        custom_cfg["monochrome"] = True
    if args.no_downsample:
        custom_cfg["downsample"] = False
    if args.no_recompress:
        custom_cfg["recompress"] = False
    if args.remove_metadata:
        custom_cfg["remove_metadata"] = True
    if args.no_structural:
        custom_cfg["structural_opt"] = False

    def on_progress(stage, percent, message):
        send_event("progress", {"stage": stage, "percent": percent, "message": message})

    try:
        result = optimize_pdf(
            input_path=args.input,
            output_path=args.output,
            profile_name=args.profile,
            custom_settings=custom_cfg,
            progress_callback=on_progress
        )
        send_event("result", result)
        sys.exit(0)
    except PermissionError as pe:
        send_event("error", {"code": ERR_PASSWORD_REQUIRED, "message": str(pe)})
        sys.exit(2)
    except FileNotFoundError as fe:
        send_event("error", {"code": ERR_INVALID_PDF, "message": str(fe)})
        sys.exit(3)
    except ValueError as ve:
        send_event("error", {"code": ERR_OUTPUT_VALIDATION_FAILURE, "message": str(ve)})
        sys.exit(4)
    except Exception as e:
        send_event("error", {"code": ERR_UNKNOWN_FAILURE, "message": str(e), "trace": traceback.format_exc()})
        sys.exit(5)


if __name__ == "__main__":
    cli_main()
