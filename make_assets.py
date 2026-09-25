"""
NEURAPRESS Quantum PDF Compressor - original asset generator.
Draws a unique, from-scratch "PDF under quantum compression" emblem:
  - a cyan flyleaf (PDF sheet) with rounded fold
  - two opposing chevrons squeezing it (compression)
  - an elliptical quantum orbit ring with glowing nodes
No external artwork or trademarks are used.
Outputs: build/icon.png, build/icon.ico, build/splash_emblem.png
"""
import math
import os

from PIL import Image, ImageDraw, ImageFilter

BUILD = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build")
os.makedirs(BUILD, exist_ok=True)

CYAN = (77, 231, 255)
INDIGO = (124, 92, 255)
VLIGHT = (232, 247, 255)
HALO = (0, 224, 255)

ROOT = os.path.dirname(os.path.abspath(__file__))


def lerp(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def radial_glow(size, center, color, radius):
    """Return an RGB canvas with a soft radial glow at center."""
    img = Image.new("RGB", size, (0, 0, 0))
    draw = ImageDraw.Draw(img)
    steps = 24
    for i in range(steps, 0, -1):
        r = int(radius * i / steps)
        a = int(255 * (steps - i + 1) / steps)
        t = i / steps
        c = lerp(color, (0, 0, 0), 1 - t * t)
        draw.ellipse((center[0] - r, center[1] - r, center[0] + r, center[1] + r),
                     fill=tuple(int(v * a // 255) for v in (c[0], c[1], c[2], 1)))
    return img


def supersample(size, factor):
    return (size[0] * factor, size[1] * factor)


def rounded_square_mask(size, radius):
    mask = Image.new("L", size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def draw_chevron_right(draw, cx, cy, a, t, color):
    pts = [
        (cx + a, cy), (cx, cy - a), (cx, cy - a + t),
        (cx + a - t, cy), (cx, cy + a - t), (cx, cy + a),
    ]
    draw.polygon(pts, fill=color)


def draw_chevron_left(draw, cx, cy, a, t, color):
    pts = [
        (cx - a, cy), (cx, cy - a), (cx, cy - a + t),
        (cx - a + t, cy), (cx, cy + a - t), (cx, cy + a),
    ]
    draw.polygon(pts, fill=color)


def draw_emblem(size, tile=False, scale=1.0):
    """Draw the emblem at the requested size on RGBA.

    tile=True  -> full rounded-square app tile (icon)
    tile=False -> standalone emblem on transparent background (splash)
    """
    W, H = size
    px = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # ----- rounded-square tile background -----
    if tile:
        SS = 4
        bg = Image.new("RGB", (W, H), (8, 12, 22))
        px_ = bg.load()
        for y in range(H):
            t = y / (H - 1)
            c = lerp((6, 10, 20), (13, 21, 38), t)
            for x in range(W):
                px_[x, y] = c
        cx, cy = int(W * 0.5), int(H * 0.42)
        glow = radial_glow(supersample((W, H), SS), (cx * SS, cy * SS), HALO, int(W * 0.45))
        glow = glow.resize((W, H), Image.LANCZOS)
        bg = Image.blend(bg, glow, 0.5)
        # vignette
        vig = Image.new("L", (W, H), 0)
        dv = ImageDraw.Draw(vig)
        dv.ellipse((int(W * 0.06), int(H * 0.06), int(W * 0.94), int(H * 0.94)), fill=90)
        vig = vig.filter(ImageFilter.GaussianBlur(W * 0.12))
        bg = Image.composite(
            Image.new("RGB", (W, H), (4, 6, 12)), bg, vig.point(lambda v: 255 - v)
        )
        mask = rounded_square_mask(supersample((W, H), SS), int(112 * SS))
        mask = mask.resize((W, H), Image.LANCZOS)
        bg.putalpha(mask)
        px.paste(bg, (0, 0), bg)

    c = (W / 2, H / 2)
    s = scale * (W / 512.0)

    # ----- quantum orbit ring (behind everything, slightly tilted) -----
    rx, ry = 200 * s, 150 * s
    def ring_layer():
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        # main ring path
        d.ellipse((c[0] - rx, c[1] - ry, c[0] + rx, c[1] + ry),
                  outline=(0, 224, 255, 160), width=max(3, int(13 * s)))
        # inner shimmer ring
        d.ellipse((c[0] - rx * 0.92, c[1] - ry * 0.92, c[0] + rx * 0.92, c[1] + ry * 0.92),
                  outline=(124, 92, 255, 90), width=max(2, int(4 * s)))
        return layer

    ring = ring_layer().rotate(-16, center=c, resample=Image.BICUBIC)

    # ----- the PDF flyleaf (sheet with folded corner) -----
    sw, sh = int(174 * s // 2) * 2, int(226 * s // 2) * 2
    x0, y0 = c[0] - sw / 2, c[1] - sh / 2
    x1, y1 = c[0] + sw / 2, c[1] + sh / 2
    sheet = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(sheet)
    corner = int(14 * s)
    # sheet body gradient
    grad = Image.new("RGB", (sw, sh), VLIGHT)
    gp = grad.load()
    for yy in range(sh):
        tt = yy / (sh - 1)
        col = lerp((240, 250, 255), (176, 226, 250), tt)
        for xx in range(sw):
            gp[xx, yy] = col
    grad = grad.convert("RGBA")
    m = Image.new("L", (sw, sh), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, sw - 1, sh - 1), radius=corner, fill=255, width=0)
    # folded corner cut (top-right) -> heavy indigo triangle
    fold = 52 * s
    ImageDraw.Draw(m).polygon(
        [(sw - 1 - fold, 0), (sw - 1, 0), (sw - 1, fold)], fill=0
    )
    grad.putalpha(m)
    sheet.paste(grad, (int(x0), int(y0)), grad)
    # content lines
    lcol = (56, 130, 175, 255)
    lh = 12 * s
    for i in range(3):
        ly = y0 + 46 * s + i * (lh + 16 * s)
        lx1 = x1 - 26 * s - (0 if i == 2 else 0)
        if i == 2:
            lx1 = x0 + 26 * s + sw * 0.34
        d.line([(x0 + 26 * s, ly), (lx1, ly)], fill=lcol, width=max(2, int(8 * s)))
    # folded corner shading triangle
    d.polygon(
        [(x1 - 2, y0), (x1 - 2, y0 + fold), (x1 - 2 - fold, y0)],
        fill=(96, 148, 220, 230),
    )

    # ----- glow pass for sheet edges -----
    sheet_glow = sheet.filter(ImageFilter.GaussianBlur(8 * s))
    px.alpha_composite(sheet_glow, (0, 0))
    px.alpha_composite(ring, (0, 0))
    px.alpha_composite(sheet, (0, 0))

    # ----- compression chevrons (in front, pinching the sheet) -----
    a, t = 40 * s, 18 * s
    cvy = c[1] + 2 * s
    chv = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(chv)
    draw_chevron_right(d, x0 - 4 * s, cvy, a, t, (0, 224, 255, 235))
    draw_chevron_left(d, x1 + 4 * s, cvy, a, t, (77, 90, 255, 235))
    # inner accent
    draw_chevron_right(d, x0 - 4 * s, cvy, a - 10 * s, t - 6 * s, (220, 245, 255, 180))
    draw_chevron_left(d, x1 + 4 * s, cvy, a - 10 * s, t - 6 * s, (180, 190, 255, 180))
    px.alpha_composite(chv, (0, 0))

    # ----- glowing orbit nodes -----
    nodes = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(nodes)
    for ang in (25, 155, 270):
        rad = math.radians(ang)
        nx = c[0] + rx * math.cos(rad) * 0.5 - rx * math.sin(rad) * -0.28
        ny = c[1] + ry * math.sin(rad)
        nx = c[0] + (rx * math.cos(rad) - rx * math.sin(rad) * 0) * 1
        nx = c[0] + rx * 0.96 * math.cos(rad)
        ny = c[1] + ry * 0.96 * math.sin(rad)
        nr = 9 * s
        halo_r = nr * 3
        d.ellipse((nx - halo_r, ny - halo_r, nx + halo_r, ny + halo_r), fill=(0, 224, 255, 46))
        d.ellipse((nx - nr, ny - nr, nx + nr, ny + nr), fill=(205, 250, 255, 255))
    nodes = nodes.filter(ImageFilter.GaussianBlur(0.6 * s)).rotate(-16, center=c, resample=Image.BICUBIC)
    px.alpha_composite(nodes, (0, 0))

    return px


def main():
    # App tile icon (512), plus multi-resolution ICO for Windows
    icon = draw_emblem((512, 512), tile=True, scale=1.0)
    icon.save(os.path.join(BUILD, "icon.png"))

    icon_png = icon.convert("RGBA")
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    frames = [icon_png.resize(sz, Image.LANCZOS) for sz in ico_sizes]
    icon_png.save(os.path.join(BUILD, "icon.ico"),
                  format="ICO", sizes=[(s, s) for s, _ in ico_sizes],
                  append_images=frames[1:])

    # Standalone transparent emblem for the splash screen (512)
    emblem = draw_emblem((512, 512), tile=False, scale=1.12)
    emblem.save(os.path.join(BUILD, "splash_emblem.png"))

    print("assets written:")
    for f in ("icon.png", "icon.ico", "splash_emblem.png"):
        fp = os.path.join(BUILD, f)
        print(" -", fp, round(os.path.getsize(fp) / 1024, 1), "KB")


if __name__ == "__main__":
    main()