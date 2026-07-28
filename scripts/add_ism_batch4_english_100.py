"""Add fourth batch of 100 everyday English nouns to ism-source.json."""
import json
import re
from pathlib import Path

from deep_translator import GoogleTranslator


ROOT = Path(__file__).resolve().parents[1]
ISM_PATH = ROOT / "Saudi-Arabic" / "vocab" / "ism-source.json"

BATCH4_NOUNS = [
    "action", "accident", "addition", "administration", "advantage", "adventure", "airline", "ambulance", "analysis", "announcement",
    "approach", "approval", "argument", "arrangement", "art", "attack", "attempt", "authority", "award", "basement",
    "battle", "belief", "campaign", "campus", "cancer", "candidate", "cemetery", "ceremony", "chain", "challenge",
    "championship", "chapter", "charge", "circumstance", "claim", "client", "clinic", "clothing", "code", "colleague",
    "combination", "complaint", "complex", "concept", "concern", "conflict", "congress", "consequence", "consumer", "content",
    "continent", "contrast", "contribution", "cooperation", "corporation", "courage", "court", "creation", "crisis", "crowd",
    "currency", "curtain", "cycle", "defeat", "defense", "definition", "description", "destination", "destruction", "discount",
    "discovery", "discussion", "disease", "dish", "disk", "display", "division", "donation", "drawing", "duty",
    "earnings", "edition", "editor", "election", "element", "embassy", "emergency", "employer", "employee", "employment",
    "enemy", "engineering", "entrance", "entry", "error", "estate", "estimate", "exception", "exhibition", "expense",
    "experiment", "explanation", "export", "expression", "extension", "factory", "favor", "feeling", "fence", "fiction",
    "fight", "filter", "final", "finance", "finding", "flight", "flood", "footage", "formula", "fortune",
    "fraud", "freight", "function", "furniture", "gallery", "gap", "gasoline", "gender", "generation", "gentleman",
    "gesture", "ghost", "glass", "golf", "governor", "grant", "graph", "grass", "grief", "guarantee",
    "guard", "guideline", "gun", "hall", "handle", "happiness", "hardware", "headline", "headquarters", "heritage",
    "highway", "hire", "hole", "homeland", "honor", "horse", "host", "housing", "humanity", "hunger",
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

    for en in BATCH4_NOUNS:
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
