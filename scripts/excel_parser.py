"""
CADレイアウト変換Excel(.xlsx)から座席・机・会議室等の図形情報を抽出しJSON化するパーサー。

xdr:drawing の座標系(col+colOff, row+rowOff)をEMU座標系に変換し、
図形分類ルール(開発指示書 2.2節)に基づいて種別を判定する。
"""
import json
import re
import sys
import zipfile
from dataclasses import dataclass, field, asdict

EMU_PER_PIXEL = 9525
EMU_PER_POINT = 12700
DEFAULT_MDW = 7  # Calibri 11 相当のmax digit width(px)。日本語フォントも近似値として流用。


def col_width_chars_to_emu(width_chars: float, mdw: int = DEFAULT_MDW) -> float:
    px = int(((256 * width_chars + int(128 / mdw)) / 256) * mdw)
    return px * EMU_PER_PIXEL


def row_height_pt_to_emu(height_pt: float) -> float:
    return height_pt * EMU_PER_POINT


@dataclass
class Shape:
    id: str
    name: str
    kind: str  # seat | room_candidate | ignored
    tagged_type: str = None  # meeting_room | reception | table | None(未タグ)
    tagged_name: str = None
    fill_state: str = None  # empty | filled (seatのみ意味を持つ)
    x1: float = 0
    y1: float = 0
    x2: float = 0
    y2: float = 0

    @property
    def cx(self):
        return (self.x1 + self.x2) / 2

    @property
    def cy(self):
        return (self.y1 + self.y2) / 2

    @property
    def w(self):
        return self.x2 - self.x1

    @property
    def h(self):
        return self.y2 - self.y1


def get_sheet_geometry(z: zipfile.ZipFile, sheet_path="xl/worksheets/sheet1.xml"):
    xml = z.read(sheet_path).decode("utf-8", errors="replace")
    m = re.search(r'defaultColWidth="([\d.]+)"', xml)
    default_col_width = float(m.group(1)) if m else 8.43
    m = re.search(r'defaultRowHeight="([\d.]+)"', xml)
    default_row_height = float(m.group(1)) if m else 15.0

    col_width_emu = col_width_chars_to_emu(default_col_width)
    row_height_emu = row_height_pt_to_emu(default_row_height)
    return col_width_emu, row_height_emu


def parse_anchor_point(point_xml: str, col_width_emu: float, row_height_emu: float):
    col = int(re.search(r"<xdr:col>(\d+)</xdr:col>", point_xml).group(1))
    col_off = int(re.search(r"<xdr:colOff>(-?\d+)</xdr:colOff>", point_xml).group(1))
    row = int(re.search(r"<xdr:row>(\d+)</xdr:row>", point_xml).group(1))
    row_off = int(re.search(r"<xdr:rowOff>(-?\d+)</xdr:rowOff>", point_xml).group(1))
    x = col * col_width_emu + col_off
    y = row * row_height_emu + row_off
    return x, y


def classify_sp(sp_xml: str) -> tuple[str, str]:
    """returns (kind, fill_state)"""
    is_line = 'prst="line"' in sp_xml
    has_custgeom = "<a:custGeom>" in sp_xml
    has_rect = 'prst="rect"' in sp_xml
    has_nofill = "<a:noFill/>" in sp_xml
    has_solidfill = "<a:solidFill>" in sp_xml

    if is_line:
        return "ignored", None
    if has_custgeom:
        fill_state = "filled" if has_solidfill and not has_nofill else "empty"
        return "seat", fill_state
    if has_rect and has_nofill:
        return "room_candidate", None
    return "ignored", None


def extract_descr_tag(sp_xml: str):
    m = re.search(r'descr="([^"]*)"', sp_xml)
    if not m:
        return None, None
    descr = m.group(1)
    tm = re.search(r"type:(\w+)", descr)
    nm = re.search(r"name:([^;]+)", descr)
    return (tm.group(1) if tm else None), (nm.group(1) if nm else None)


def parse_drawing(xlsx_path: str, drawing_path="xl/drawings/drawing1.xml", sheet_path="xl/worksheets/sheet1.xml"):
    z = zipfile.ZipFile(xlsx_path)
    col_width_emu, row_height_emu = get_sheet_geometry(z, sheet_path)
    xml = z.read(drawing_path).decode("utf-8", errors="replace")

    anchors = re.findall(r"<xdr:twoCellAnchor>.*?</xdr:twoCellAnchor>", xml, re.S)
    shapes = []
    for anchor in anchors:
        # cxnSp(コネクタ/装飾線)は無視。sp要素のみが座席・什器候補。
        if "<xdr:sp " not in anchor and "<xdr:sp>" not in anchor:
            continue

        from_m = re.search(r"<xdr:from>(.*?)</xdr:from>", anchor, re.S)
        to_m = re.search(r"<xdr:to>(.*?)</xdr:to>", anchor, re.S)
        if not from_m or not to_m:
            continue
        x1, y1 = parse_anchor_point(from_m.group(1), col_width_emu, row_height_emu)
        x2, y2 = parse_anchor_point(to_m.group(1), col_width_emu, row_height_emu)

        id_m = re.search(r'<xdr:cNvPr id="(\d+)" name="([^"]*)"', anchor)
        shape_id = id_m.group(1) if id_m else "?"
        shape_name = id_m.group(2) if id_m else "?"

        kind, fill_state = classify_sp(anchor)
        if kind == "ignored":
            continue

        tagged_type, tagged_name = extract_descr_tag(anchor)

        shapes.append(Shape(
            id=shape_id, name=shape_name, kind=kind,
            tagged_type=tagged_type, tagged_name=tagged_name,
            fill_state=fill_state,
            x1=min(x1, x2), y1=min(y1, y2), x2=max(x1, x2), y2=max(y1, y2),
        ))
    return shapes


def parse_lines_for_preview(xlsx_path: str, drawing_path="xl/drawings/drawing1.xml", sheet_path="xl/worksheets/sheet1.xml"):
    """可視化用: cxnSp(装飾線・壁の輪郭)のfrom/to座標を返す。データモデルには使わない。"""
    z = zipfile.ZipFile(xlsx_path)
    col_width_emu, row_height_emu = get_sheet_geometry(z, sheet_path)
    xml = z.read(drawing_path).decode("utf-8", errors="replace")

    anchors = re.findall(r"<xdr:twoCellAnchor>.*?</xdr:twoCellAnchor>", xml, re.S)
    lines = []
    for anchor in anchors:
        if "<xdr:cxnSp" not in anchor:
            continue
        from_m = re.search(r"<xdr:from>(.*?)</xdr:from>", anchor, re.S)
        to_m = re.search(r"<xdr:to>(.*?)</xdr:to>", anchor, re.S)
        if not from_m or not to_m:
            continue
        x1, y1 = parse_anchor_point(from_m.group(1), col_width_emu, row_height_emu)
        x2, y2 = parse_anchor_point(to_m.group(1), col_width_emu, row_height_emu)
        lines.append((x1, y1, x2, y2))
    return lines


def shapes_to_dicts(shapes):
    out = []
    for s in shapes:
        d = asdict(s)
        d["cx"] = s.cx
        d["cy"] = s.cy
        d["w"] = s.w
        d["h"] = s.h
        out.append(d)
    return out


if __name__ == "__main__":
    path = sys.argv[1]
    shapes = parse_drawing(path)
    seats = [s for s in shapes if s.kind == "seat"]
    rooms = [s for s in shapes if s.kind == "room_candidate"]
    print(f"file={path}")
    print(f"  seats(custGeom)={len(seats)}  room_candidates(rect+noFill)={len(rooms)}")
    print(json.dumps(shapes_to_dicts(shapes), ensure_ascii=False, indent=2))
