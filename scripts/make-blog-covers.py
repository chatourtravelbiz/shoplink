#!/usr/bin/env python3
"""Sampul bermerek artikel blog Chatour Travel (1200x630, OG size).

Grafis jujur: gradasi merah bata + logo + judul artikel. Bukan foto.
Jalankan: python3 scripts/make-blog-covers.py  -> PNG di blog-covers/
"""
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1200, 630
TOP = (176, 42, 0)      # #b02a00
BOTTOM = (126, 30, 0)   # #7e1e00
WHITE = (255, 255, 255)
CREAM = (255, 235, 220)
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO = os.path.join(os.path.expanduser("~"), "workspace/user/media_library/image/LOGO_CHATOUR_icon.png")
FONT_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_R = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

ARTICLES = [
    ("chatour-travel-kediri-agen-umroh-haji-badas.png",
     "Chatour Travel Kediri", "Agen Umroh & Haji di Badas, Kediri"),
    ("panduan-umroh-pertama-kali.png",
     "Panduan Umroh Pertama Kali", "Persiapan, Dokumen, dan Tips"),
    ("umroh-reguler-vs-umroh-plus.png",
     "Umroh Reguler vs Umroh Plus", "Mana yang Cocok untukmu?"),
    ("tips-memilih-travel-umroh-aman-berizin-resmi.png",
     "Tips Memilih Travel Umroh", "yang Aman & Berizin Resmi"),
]

def gradient():
    img = Image.new("RGB", (W, H))
    px = img.load()
    for y in range(H):
        t = y / (H - 1)
        c = tuple(int(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3))
        for x in range(W):
            px[x, y] = c
    return img

def wrap(draw, text, font, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = f"{cur} {w}".strip()
        if draw.textlength(t, font=font) <= max_w:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines

def make(out_name, title, subtitle):
    img = gradient()
    d = ImageDraw.Draw(img, "RGBA")
    # garis aksen tipis
    d.rectangle([64, 196, 160, 204], fill=(255, 255, 255))
    # chip logo putih + logo
    logo = Image.open(LOGO).convert("RGBA")
    logo.thumbnail((150, 150))
    chip_w, chip_h = logo.width + 36, logo.height + 36
    chip = Image.new("RGBA", (chip_w, chip_h), (255, 255, 255, 255))
    mask = Image.new("L", (chip_w, chip_h), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, chip_w - 1, chip_h - 1], radius=24, fill=255)
    img.paste(chip, (64, 56), mask)
    img.paste(logo, (64 + 18, 56 + 18), logo)
    d = ImageDraw.Draw(img, "RGBA")
    # nama brand di samping logo
    fb = ImageFont.truetype(FONT_B, 34)
    d.text((64 + chip_w + 24, 56 + chip_h // 2 - 20), "CHATOUR TRAVEL", font=fb, fill=WHITE)
    # judul
    ft = ImageFont.truetype(FONT_B, 62)
    lines = wrap(d, title, ft, W - 128)
    y = 236
    for ln in lines:
        d.text((64, y), ln, font=ft, fill=WHITE)
        y += 76
    # subjudul
    fs = ImageFont.truetype(FONT_R, 32)
    y += 8
    for ln in wrap(d, subtitle, fs, W - 128):
        d.text((64, y), ln, font=fs, fill=CREAM)
        y += 44
    # footer
    ff = ImageFont.truetype(FONT_B, 24)
    d.text((64, H - 64), "chatourtravel.com  •  Biro Umroh & Haji", font=ff, fill=(255, 255, 255))
    out = os.path.join(BASE, "blog-covers", out_name)
    img.save(out, optimize=True)
    print(out, os.path.getsize(out), "bytes")

for name, title, sub in ARTICLES:
    make(name, title, sub)
