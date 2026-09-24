"""Erzeugt App-Icons und iPhone-Startbilder im Stil des Logos.

Aufruf:  python tools/make_icons.py <Pfad zu SpaceGrotesk[wght].ttf>
Die TTF gibt es unter github.com/google/fonts (ofl/spacegrotesk). Sie wird nur
zum Zeichnen gebraucht und liegt nicht im Repo.
Gibt am Ende die <link>-Tags fuer die Startbilder aus (fuer index.html).
"""
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT_PATH = sys.argv[1]

BG = (14, 15, 18)
TEXT = (236, 238, 242)
MUTED = (139, 145, 156)
ACCENT = (214, 239, 90)

# iPhone-Bildschirme: (Breite, Hoehe) in CSS-Pixeln und Pixeldichte.
DEVICES = [
    (440, 956, 3),  # 16 Pro Max, 17 Pro Max
    (402, 874, 3),  # 16 Pro, 17, 17 Pro
    (420, 912, 3),  # Air
    (430, 932, 3),  # 14 Pro Max, 15 Plus/Pro Max, 16 Plus
    (393, 852, 3),  # 14 Pro, 15, 15 Pro, 16
    (428, 926, 3),  # 12/13 Pro Max, 14 Plus
    (390, 844, 3),  # 12, 13, 14
    (375, 812, 3),  # X, XS, 11 Pro, 12/13 mini (skaliert)
    (360, 780, 3),  # 12/13 mini
    (414, 896, 3),  # XS Max, 11 Pro Max
    (414, 896, 2),  # XR, 11
    (375, 667, 2),  # SE, 8
]


def font(size):
    f = ImageFont.truetype(FONT_PATH, size)
    f.set_variation_by_axes([700])
    return f


def draw_parts(draw, parts, center_x, baseline_y, size):
    """Zeichnet Textteile mit eigenen Farben nebeneinander, horizontal zentriert."""
    f = font(size)
    widths = [draw.textlength(text, font=f) for text, _ in parts]
    x = center_x - sum(widths) / 2
    for (text, color), width in zip(parts, widths):
        draw.text((x, baseline_y), text, font=f, fill=color, anchor="ls")
        x += width


def make_icon(size, padding=0.0):
    """Quadratisches Icon mit "I." in der Mitte. padding = Sicherheitsrand fuer maskable."""
    img = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(img)
    inner = size * (1 - 2 * padding)
    text_size = int(inner * 0.62)
    # Grossbuchstaben-Hoehe ~0.7 der Schriftgroesse: Grundlinie so setzen, dass "I" optisch mittig sitzt.
    baseline = size / 2 + text_size * 0.35
    draw_parts(draw, [("I", TEXT), (".", ACCENT)], size / 2, baseline, text_size)
    return img


def make_splash(width, height):
    img = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(img)
    title_size = int(width * 0.14)
    draw_parts(draw, [("Imposter", TEXT), (".", ACCENT)], width / 2, height / 2, title_size)
    tag = font(int(width * 0.04))
    tag.set_variation_by_axes([400])
    draw.text((width / 2, height / 2 + title_size * 0.55), "Ein Wort. Einer weiß es nicht.",
              font=tag, fill=MUTED, anchor="mt")
    return img


def main():
    icons = ROOT / "icons"
    splash = ROOT / "splash"
    icons.mkdir(exist_ok=True)
    splash.mkdir(exist_ok=True)

    make_icon(180).save(icons / "apple-touch-icon.png", optimize=True)
    make_icon(192).save(icons / "icon-192.png", optimize=True)
    make_icon(512).save(icons / "icon-512.png", optimize=True)
    make_icon(512, padding=0.1).save(icons / "icon-maskable-512.png", optimize=True)

    links = []
    for w, h, dpr in DEVICES:
        name = f"splash-{w * dpr}x{h * dpr}.png"
        make_splash(w * dpr, h * dpr).save(splash / name, optimize=True)
        media = (f"(device-width: {w}px) and (device-height: {h}px) and "
                 f"(-webkit-device-pixel-ratio: {dpr}) and (orientation: portrait)")
        links.append(f'  <link rel="apple-touch-startup-image" media="{media}" href="splash/{name}">')

    print("\n".join(links))


if __name__ == "__main__":
    main()
