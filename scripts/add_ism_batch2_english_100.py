"""Add second batch of 100 everyday English nouns to ism-source.json."""
import json
import re
from pathlib import Path

from deep_translator import GoogleTranslator


ROOT = Path(__file__).resolve().parents[1]
ISM_PATH = ROOT / "Saudi-Arabic" / "vocab" / "ism-source.json"

BATCH2_NOUNS = [
    "account", "address", "age", "agreement", "air", "alarm", "album", "animal", "appointment", "area",
    "army", "arrival", "artist", "athlete", "attention", "author", "backpack", "bakery", "barber", "basket",
    "beauty", "behavior", "beginning", "bicycle", "bird", "blood", "boat", "body", "bone", "border",
    "brain", "branch", "break", "budget", "building", "business", "button", "camp", "capital", "career",
    "case", "cash", "celebration", "center", "chance", "change", "character", "chat", "check", "childhood",
    "choice", "church", "circle", "citizen", "cleaner", "climate", "clothes", "club", "coach", "coast",
    "collection", "college", "color", "comfort", "command", "comment", "community", "competition", "condition", "connection",
    "contact", "context", "control", "conversation", "corner", "cost", "culture", "customer", "damage", "dance",
    "danger", "decision", "delivery", "department", "design", "detail", "development", "device", "difference", "difficulty",
    "direction", "distance", "district", "document", "dream", "driver", "earth", "economy", "education", "effect",
    "effort", "electricity", "emotion", "energy", "environment", "event", "evidence", "example", "exchange", "experience",
    "expert", "fact", "failure", "faith", "feature", "fee", "feedback", "festival", "figure", "file",
    "focus", "foodcourt", "freedom", "future", "garage", "gift", "government", "growth", "habit", "hair",
    "hand", "history", "hobby", "hope", "hour", "image", "importance", "industry", "information", "injury",
    "interest", "interview", "issue", "item", "knowledge", "lab", "law", "level", "library", "limit",
    "line", "list", "location", "luck", "machine", "mail", "manner", "material", "memory", "method",
    "middle", "mind", "moment", "movement", "nation", "nature", "need", "notice", "object", "offer",
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

    target_add = 100
    added = 0
    skipped = 0
    failed = 0

    for en in BATCH2_NOUNS:
        if added >= target_add:
            break
        key = en.strip().lower()
        if key in by_meaning:
            skipped += 1
            continue
        try:
            ar = (tr.translate(key) or "").strip()
        except Exception:
            ar = ""
        if not ar:
            failed += 1
            continue

        ar_key = norm_ar(ar)
        if not ar_key or ar_key in by_ar:
            skipped += 1
            continue

        base_id = slug(key)
        item_id = base_id
        n = 2
        while item_id in by_id:
            item_id = f"{base_id}-{n}"
            n += 1

        new_item = {
            "id": item_id,
            "arabic": ar,
            "meaning": key,
            "subtype": "noun",
            "example": f"هذا {ar}",
            "exampleEn": f"This is {key}",
        }
        items.append(new_item)
        by_id[item_id] = new_item
        by_meaning.add(key)
        by_ar.add(ar_key)
        added += 1

    data["items"] = items
    ISM_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Requested add: {target_add}")
    print(f"Added: {added}")
    print(f"Skipped duplicate/existing: {skipped}")
    print(f"Failed translate: {failed}")
    print(f"Total ism now: {len(items)}")


if __name__ == "__main__":
    main()

