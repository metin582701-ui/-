"""パース結果(座席・什器候補+装飾線)を画像化して目視確認するための簡易プレビュー描画スクリプト。"""
import sys
sys.path.insert(0, "scripts")
from excel_parser import parse_drawing, parse_lines_for_preview
from PIL import Image, ImageDraw

EMU_PER_PIXEL = 9525


def render(path, out_path, scale=0.12, label=True):
    shapes = parse_drawing(path)
    lines = parse_lines_for_preview(path)

    xs = [s.x1 for s in shapes] + [s.x2 for s in shapes] + [l[0] for l in lines] + [l[2] for l in lines]
    ys = [s.y1 for s in shapes] + [s.y2 for s in shapes] + [l[1] for l in lines] + [l[3] for l in lines]
    minx, maxx = min(xs), max(xs)
    miny, maxy = min(ys), max(ys)

    def px(v_emu, origin):
        return int((v_emu - origin) / EMU_PER_PIXEL * scale)

    W = px(maxx, minx) + 40
    H = px(maxy, miny) + 40
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)

    for (x1, y1, x2, y2) in lines:
        d.line([px(x1, minx) + 20, px(y1, miny) + 20, px(x2, minx) + 20, px(y2, miny) + 20],
               fill=(160, 160, 160), width=1)

    for s in shapes:
        x1, y1 = px(s.x1, minx) + 20, px(s.y1, miny) + 20
        x2, y2 = px(s.x2, minx) + 20, px(s.y2, miny) + 20
        if s.kind == "seat":
            color = (200, 40, 40) if s.fill_state == "filled" else (255, 120, 120)
            d.ellipse([x1, y1, x2, y2], outline=color, width=2)
        else:  # room_candidate
            color = (40, 80, 220)
            d.rectangle([x1, y1, x2, y2], outline=color, width=2)
        if label:
            d.text((x1, max(0, y1 - 10)), s.id, fill=(0, 0, 0))

    img.save(out_path)
    print("saved", out_path, "size", W, H, "n_shapes", len(shapes), "n_lines", len(lines))


if __name__ == "__main__":
    render(sys.argv[1], sys.argv[2], float(sys.argv[3]) if len(sys.argv) > 3 else 0.12)
