"""Add first batch of 100 everyday English nouns to ism-source.json.

Source style: standard everyday dictionary nouns (A1/A2-ish).
"""
import json
import re
from pathlib import Path

from deep_translator import GoogleTranslator


ROOT = Path(__file__).resolve().parents[1]
ISM_PATH = ROOT / "Saudi-Arabic" / "vocab" / "ism-source.json"


ENGLISH_NOUNS_100 = [
    "person", "people", "man", "woman", "boy", "girl", "child", "family", "friend", "name",
    "house", "home", "room", "door", "window", "table", "chair", "bed", "kitchen", "bathroom",
    "street", "road", "city", "country", "village", "school", "class", "teacher", "student", "book",
    "word", "language", "question", "answer", "idea", "job", "work", "office", "shop", "market",
    "car", "bus", "taxi", "train", "plane", "airport", "ticket", "phone", "computer", "internet",
    "message", "email", "number", "time", "day", "week", "month", "year", "morning", "night",
    "food", "water", "coffee", "tea", "bread", "rice", "meat", "fruit", "vegetable", "restaurant",
    "money", "price", "bank", "card", "key", "bag", "shirt", "shoe", "doorbell", "map",
    "hospital", "doctor", "medicine", "problem", "help", "meeting", "company", "project", "plan", "goal",
    "weather", "sun", "moon", "star", "tree", "flower", "sea", "mountain", "photo", "music",
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
    data = json.loads(ISM_PATH.read_text(encoding="utf-8"))
    items = data.get("items", [])

    by_id = {i.get("id"): i for i in items}
    by_meaning = {(i.get("meaning") or "").strip().lower() for i in items}
    by_ar = {norm_ar(i.get("arabic", "")) for i in items}

    tr = GoogleTranslator(source="en", target="ar")

    added = 0
    skipped_existing = 0
    failed = 0

    for en in ENGLISH_NOUNS_100:
        if en in by_meaning:
            skipped_existing += 1
            continue
        try:
            ar = (tr.translate(en) or "").strip()
        except Exception:
            ar = ""
        if not ar:
            failed += 1
            continue

        ar_key = norm_ar(ar)
        if not ar_key or ar_key in by_ar:
            skipped_existing += 1
            continue

        base_id = slug(en)
        item_id = base_id
        k = 2
        while item_id in by_id:
            item_id = f"{base_id}-{k}"
            k += 1

        new_item = {
            "id": item_id,
            "arabic": ar,
            "meaning": en,
            "subtype": "noun",
            "example": f"هذا {ar}",
            "exampleEn": f"This is {en}",
        }
        items.append(new_item)
        by_id[item_id] = new_item
        by_meaning.add(en)
        by_ar.add(ar_key)
        added += 1

    data["items"] = items
    ISM_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Requested nouns: {len(ENGLISH_NOUNS_100)}")
    print(f"Added: {added}")
    print(f"Skipped existing/duplicate: {skipped_existing}")
    print(f"Failed translate: {failed}")
    print(f"Total ism now: {len(items)}")


if __name__ == "__main__":
    main()

