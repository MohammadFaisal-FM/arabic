"""Top up ism list with additional standard English nouns.

Default target is 56 so combined with previous +44 becomes +100.
"""
import json
import re
import sys
from pathlib import Path

from deep_translator import GoogleTranslator


ROOT = Path(__file__).resolve().parents[1]
ISM_PATH = ROOT / "Saudi-Arabic" / "vocab" / "ism-source.json"

TOPUP_NOUNS = [
    "garden", "park", "beach", "river", "lake", "forest", "island", "farm", "field", "bridge",
    "station", "stop", "route", "trip", "journey", "travel", "passport", "hotel", "guest", "visitor",
    "neighbor", "wife", "husband", "brother", "sister", "father", "mother", "son", "daughter", "baby",
    "uncle", "aunt", "cousin", "grandfather", "grandmother", "parent", "team", "group", "member", "leader",
    "boss", "worker", "driver", "police", "officer", "lawyer", "engineer", "manager", "chef", "cook",
    "waiter", "nurse", "patient", "health", "exercise", "sport", "game", "ball", "goalpost", "teamwork",
    "lesson", "course", "exam", "test", "result", "grade", "paper", "pen", "pencil", "notebook",
    "story", "news", "newspaper", "magazine", "article", "video", "movie", "song", "sound", "voice",
    "picture", "camera", "screen", "button", "battery", "charger", "clock", "watch", "calendar", "date",
    "holiday", "weekend", "season", "summer", "winter", "spring", "autumn", "rain", "wind", "cloud",
    "heat", "cold", "traffic", "signal", "crosswalk", "building", "floor", "wall", "roof", "stairs",
    "elevator", "gate", "garage", "yard", "closet", "mirror", "light", "lamp", "fan", "air conditioner",
    "toilet", "shower", "soap", "towel", "blanket", "pillow", "cup", "plate", "spoon", "fork",
    "knife", "bottle", "salt", "sugar", "oil", "egg", "milk", "cheese", "chicken", "fish",
    "soup", "breakfast", "lunch", "dinner", "snack", "dessert", "bill", "receipt", "salary", "rent",
]

AR_ONLY = re.compile(r"[^\u0621-\u064A]")


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def norm_ar(s: str) -> str:
    s = AR_ONLY.sub("", s or "")
    s = s.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
    s = s.replace("ة", "ه").replace("ى", "ي")
    return s


def main() -> None:
    target_add = int(sys.argv[1]) if len(sys.argv) > 1 else 56
    data = json.loads(ISM_PATH.read_text(encoding="utf-8"))
    items = data.get("items", [])
    by_id = {i.get("id"): i for i in items}
    by_meaning = {(i.get("meaning") or "").strip().lower() for i in items}
    by_ar = {norm_ar(i.get("arabic", "")) for i in items}

    tr = GoogleTranslator(source="en", target="ar")
    added = 0
    skipped = 0

    for en in TOPUP_NOUNS:
        if added >= target_add:
            break
        if en in by_meaning:
            skipped += 1
            continue
        try:
            ar = (tr.translate(en) or "").strip()
        except Exception:
            ar = ""
        if not ar:
            continue
        ar_key = norm_ar(ar)
        if not ar_key or ar_key in by_ar:
            skipped += 1
            continue
        base_id = slug(en)
        item_id = base_id
        n = 2
        while item_id in by_id:
            item_id = f"{base_id}-{n}"
            n += 1
        item = {
            "id": item_id,
            "arabic": ar,
            "meaning": en,
            "subtype": "noun",
            "example": f"هذا {ar}",
            "exampleEn": f"This is {en}",
        }
        items.append(item)
        by_id[item_id] = item
        by_meaning.add(en)
        by_ar.add(ar_key)
        added += 1

    data["items"] = items
    ISM_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Target add: {target_add}")
    print(f"Added: {added}")
    print(f"Skipped duplicates: {skipped}")
    print(f"Total ism now: {len(items)}")


if __name__ == "__main__":
    main()

