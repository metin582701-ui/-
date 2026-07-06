"""ユーザーからのフィードバックに基づき、9F/8Fのタグ付けデータを一括修正するワンショットスクリプト。"""
import requests

BASE = "http://127.0.0.1:8000"
s = requests.Session()
r = s.post(f"{BASE}/api/admin/login", json={"password": "admin1234"})
r.raise_for_status()


def delete_untagged_rooms(floor_id):
    rooms = s.get(f"{BASE}/api/floors/{floor_id}/rooms").json()
    n = 0
    for room in rooms:
        if not room["type"]:
            resp = s.delete(f"{BASE}/api/admin/rooms/{room['id']}")
            resp.raise_for_status()
            n += 1
    print(f"{floor_id}: deleted {n} untagged room candidates")


def delete_all_seats(floor_id):
    seats = s.get(f"{BASE}/api/floors/{floor_id}/seats").json()
    for seat in seats:
        s.delete(f"{BASE}/api/admin/seats/{seat['id']}").raise_for_status()
    print(f"{floor_id}: deleted {len(seats)} existing seats")


def add_seat(floor_id, x, y, w=14, h=14, label=None):
    body = {"x": x, "y": y, "w": w, "h": h}
    if label:
        body["label"] = label
    resp = s.post(f"{BASE}/api/admin/floors/{floor_id}/seats", json=body)
    resp.raise_for_status()
    return resp.json()


def add_room(floor_id, x, y, w, h, type_, name, capacity=None):
    body = {"x": x, "y": y, "w": w, "h": h, "type": type_, "name": name}
    if capacity:
        body["capacity"] = capacity
    resp = s.post(f"{BASE}/api/admin/floors/{floor_id}/rooms", json=body)
    resp.raise_for_status()
    return resp.json()


def update_room(room_id, **kwargs):
    resp = s.put(f"{BASE}/api/admin/rooms/{room_id}", json=kwargs)
    resp.raise_for_status()
    return resp.json()


def delete_room(room_id):
    s.delete(f"{BASE}/api/admin/rooms/{room_id}").raise_for_status()


# ============ 1. 全フロアの未設定(type=None)候補を一括削除 ============
delete_untagged_rooms("8F")
delete_untagged_rooms("9F")

# ============ 2. 既存座席を一旦クリアして再配置(重複防止) ============
delete_all_seats("8F")
delete_all_seats("9F")

# ============ 3. 9F: 会議室・応接室・テーブルの位置修正 ============
rooms_9f = {r["name"]: r for r in s.get(f"{BASE}/api/floors/9F/rooms").json() if r["name"]}

if "大会議室" in rooms_9f:
    update_room(rooms_9f["大会議室"]["id"], x=170, y=400, w=260, h=590)

if "応接室" in rooms_9f:
    update_room(rooms_9f["応接室"]["id"], x=360, y=1990, w=90, h=90)

if "打ち合わせテーブル1" in rooms_9f:
    update_room(rooms_9f["打ち合わせテーブル1"]["id"], x=205, y=1405, w=160, h=140)
if "打ち合わせテーブル2" in rooms_9f:
    update_room(rooms_9f["打ち合わせテーブル2"]["id"], x=390, y=1405, w=140, h=110)
if "打ち合わせテーブル3" in rooms_9f:
    update_room(rooms_9f["打ち合わせテーブル3"]["id"], x=205, y=1600, w=160, h=150)

# ============ 4. 9F: 座席5席(長方形テーブル4脚+単独椅子1脚) ============
add_seat("9F", 225, 2170, label="9F-1")
add_seat("9F", 330, 2170, label="9F-2")
add_seat("9F", 225, 2260, label="9F-3")
add_seat("9F", 330, 2260, label="9F-4")
add_seat("9F", 285, 2670, label="9F-5")

# ============ 5. 8F: 打ち合わせテーブルを1つに統合(打ち合わせスペース) ============
rooms_8f = {r["name"]: r for r in s.get(f"{BASE}/api/floors/8F/rooms").json() if r["name"]}
if "打ち合わせテーブル2" in rooms_8f:
    update_room(rooms_8f["打ち合わせテーブル2"]["id"], name="打ち合わせスペース", x=108, y=536, w=32, h=110)
for name in ("打ち合わせテーブル1", "打ち合わせテーブル3"):
    if name in rooms_8f:
        delete_room(rooms_8f[name]["id"])

# ============ 6. 8F: 座席25脚(行1:4脚 / ブロック2:6脚 / 中央ブロック:12脚 / 三角テーブル:3脚) ============
row1_y = 137
row1_xs = [173, 201, 230, 259]
for i, x in enumerate(row1_xs):
    add_seat("8F", x, row1_y, label=f"8F-{i+1}")

block2_xs = [172, 201, 231]
block2_ys = [186, 235]
n = 5
for y in block2_ys:
    for x in block2_xs:
        n += 1
        add_seat("8F", x, y, label=f"8F-{n}")

mid_xs = [174, 220]
mid_ys = [308, 339, 371, 402, 434, 465]
for y in mid_ys:
    for x in mid_xs:
        n += 1
        add_seat("8F", x, y, label=f"8F-{n}")

triangle_seats = [(200, 552), (230, 552), (215, 588)]
for x, y in triangle_seats:
    n += 1
    add_seat("8F", x, y, label=f"8F-{n}")

print("total 8F seats added:", n)
print("done")
