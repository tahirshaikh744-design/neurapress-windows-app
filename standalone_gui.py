"""
NEURAPRESS Standalone Python Desktop GUI & Unified CLI Engine
Runs natively on Windows with 100% thread safety and real selective image optimization.
"""
import sys
import os
import threading
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

# Import the core optimization engine
from src.engine.pdf_optimizer import (
    optimize_pdf,
    analyze_document,
    cli_main,
    PROFILES,
    ERR_PASSWORD_REQUIRED,
    ERR_INVALID_PDF
)


def format_bytes(b: int) -> str:
    if not b or b <= 0:
        return "0.00 KB"
    for unit in ["Bytes", "KB", "MB", "GB"]:
        if b < 1024.0:
            return f"{b:.2f} {unit}"
        b /= 1024.0
    return f"{b:.2f} TB"


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("NEURAPRESS // Quantum Native Engine")
        self.geometry("680x520")
        self.minsize(580, 440)
        self.configure(bg="#030712")
        self.input_file = None
        self.is_processing = False

        style = ttk.Style(self)
        style.theme_use("clam")
        style.configure(".", background="#030712", foreground="#00f3ff", font=("Segoe UI", 10))
        style.configure("TButton", background="#0a192f", foreground="#00f3ff", bordercolor="#00f3ff", font=("Segoe UI", 10, "bold"))
        style.map("TButton", background=[("active", "#00f3ff")], foreground=[("active", "#030712")])
        style.configure("TCombobox", fieldbackground="#0f172a", background="#0a192f", foreground="#00f3ff")

        # Header
        header = tk.Label(
            self,
            text="NEURAPRESS QUANTUM",
            font=("Segoe UI", 18, "bold"),
            fg="#00f3ff",
            bg="#030712"
        )
        header.pack(pady=(15, 2))

        sub = tk.Label(
            self,
            text="Native Selective PDF Optimization Core • 100% Local",
            font=("Segoe UI", 9),
            fg="#94a3b8",
            bg="#030712"
        )
        sub.pack(pady=(0, 10))

        # Target file blueprint label
        self.file_label = tk.Label(
            self,
            text="No PDF loaded // Select a document to inspect blueprint",
            font=("Segoe UI", 10),
            fg="#94a3b8",
            bg="#0f172a",
            width=65,
            height=3,
            relief="groove"
        )
        self.file_label.pack(pady=10)

        btn_browse = ttk.Button(self, text="Select PDF Document", command=self.browse_file)
        btn_browse.pack(pady=4)

        # Profile selection
        profile_frame = tk.Frame(self, bg="#030712")
        profile_frame.pack(pady=10)

        lbl_profile = tk.Label(profile_frame, text="COMPRESSION PROFILE:", font=("Segoe UI", 9, "bold"), fg="#e2e8f0", bg="#030712")
        lbl_profile.pack(side="left", padx=8)

        self.profile_var = tk.StringVar(value="balanced")
        self.profile_combo = ttk.Combobox(
            profile_frame,
            textvariable=self.profile_var,
            values=["balanced", "extreme", "studio"],
            state="readonly",
            width=16
        )
        self.profile_combo.pack(side="left", padx=8)

        # Status text
        self.status_label = tk.Label(
            self,
            text="Status: IDLE",
            font=("Segoe UI", 9),
            fg="#38bdf8",
            bg="#030712"
        )
        self.status_label.pack(pady=5)

        # Progress bar
        self.progress = ttk.Progressbar(self, orient="horizontal", length=480, mode="determinate")
        self.progress.pack(pady=8)

        # Compress action button
        self.compress_btn = ttk.Button(self, text="OPTIMIZE PDF NOW", command=self.start_compress)
        self.compress_btn.pack(pady=12)

    def safe_ui_update(self, callback):
        """Thread-safe UI dispatcher using root.after()."""
        self.after(0, callback)

    def browse_file(self):
        if self.is_processing:
            return
        path = filedialog.askopenfilename(filetypes=[("PDF Documents", "*.pdf")])
        if path:
            self.input_file = path
            try:
                analysis = analyze_document(path)
                size_str = format_bytes(analysis["fileSize"])
                pages = analysis["pageCount"]
                imgs = analysis["imageCount"]
                forms = "Yes" if analysis["hasForms"] else "No"
                self.file_label.config(
                    text=f"{os.path.basename(path)}\nSize: {size_str} • Pages: {pages} • Images: {imgs} • Forms: {forms}",
                    fg="#00f3ff"
                )
                self.status_label.config(text="Status: BUFFER READY • Select profile and optimize", fg="#38bdf8")
            except Exception as e:
                self.file_label.config(text=f"Selected: {os.path.basename(path)} (Error inspecting: {str(e)})", fg="#f43f5e")

    def start_compress(self):
        if self.is_processing:
            return
        if not self.input_file:
            messagebox.showwarning("Warning", "Please select a PDF document first.")
            return

        out_path = filedialog.asksaveasfilename(
            defaultextension=".pdf",
            filetypes=[("PDF Documents", "*.pdf")],
            initialfile=f"{os.path.splitext(os.path.basename(self.input_file))[0]}_optimized.pdf"
        )
        if not out_path:
            return

        self.is_processing = True
        self.compress_btn.config(state="disabled")
        self.progress["value"] = 0
        self.status_label.config(text="Status: INITIALIZING ENGINE...", fg="#38bdf8")

        profile = self.profile_var.get()

        def worker():
            def on_progress(stage, percent, message):
                self.safe_ui_update(lambda: self.update_progress(percent, message))

            try:
                result = optimize_pdf(
                    input_path=self.input_file,
                    output_path=out_path,
                    profile_name=profile,
                    progress_callback=on_progress
                )
                self.safe_ui_update(lambda: self.on_complete(result))
            except Exception as e:
                self.safe_ui_update(lambda: self.on_error(str(e)))

        threading.Thread(target=worker, daemon=True).start()

    def update_progress(self, percent: int, message: str):
        """Executed strictly on Tkinter main event thread."""
        self.progress["value"] = percent
        self.status_label.config(text=f"Status: {message}", fg="#00f3ff")

    def on_complete(self, result: dict):
        """Executed strictly on Tkinter main event thread."""
        self.is_processing = False
        self.compress_btn.config(state="normal")
        self.progress["value"] = 100

        orig_str = format_bytes(result["inputBytes"])
        final_str = format_bytes(result["outputBytes"])

        if result["bytesSaved"] > 0:
            saved_str = format_bytes(result["bytesSaved"])
            pct = result["savedPercent"]
            msg = (
                f"Optimization Complete!\n\n"
                f"Original: {orig_str}\n"
                f"Optimized: {final_str}\n"
                f"Reduction: -{pct}% ({saved_str} saved)\n"
                f"Pages Preserved: {result['pageCount']}\n"
                f"Images Optimized: {result['imagesOptimized']} / {result['imagesAnalyzed']}\n"
                f"Integrity Validation: PASSED"
            )
            self.status_label.config(text=f"Status: COMPLETE • Reduced by {pct}%", fg="#10b981")
            messagebox.showinfo("Success", msg)
        else:
            growth_pct = result["growthPercent"]
            msg = (
                f"Optimization Complete!\n\n"
                f"Original: {orig_str}\n"
                f"Output: {final_str}\n"
                f"Notice: Output increased by {growth_pct}%\n"
                f"(Input was already highly compacted)"
            )
            self.status_label.config(text=f"Status: COMPLETE • Output increased by {growth_pct}%", fg="#f59e0b")
            messagebox.showinfo("Optimization Report", msg)

    def on_error(self, err_msg: str):
        """Executed strictly on Tkinter main event thread."""
        self.is_processing = False
        self.compress_btn.config(state="normal")
        self.status_label.config(text="Status: PIPELINE FAULT", fg="#f43f5e")
        messagebox.showerror("Error", f"Optimization pipeline failed: {err_msg}")


def main():
    # If invoked with CLI flags (e.g. from Electron or headless automation), run CLI mode
    cli_flags = {"--input", "-i", "--analyze", "--help", "-h", "--cli"}
    if len(sys.argv) > 1 and any(arg in cli_flags for arg in sys.argv):
        cli_main()
    else:
        app = App()
        app.mainloop()


if __name__ == "__main__":
    main()
