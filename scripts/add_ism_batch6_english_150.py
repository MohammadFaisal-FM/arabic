"""Add sixth batch of everyday English nouns toward 1000 ism total."""
import json
import re
from pathlib import Path

from deep_translator import GoogleTranslator


ROOT = Path(__file__).resolve().parents[1]
ISM_PATH = ROOT / "Saudi-Arabic" / "vocab" / "ism-source.json"

BATCH6_NOUNS = [
    "output", "oven", "oxide", "oxygen", "pack", "pain", "palace", "palm", "panel", "panic",
    "parade", "paragraph", "parameter", "parcel", "parenthood", "parkway", "parliament", "participant", "participation", "particle",
    "partnership", "passage", "passion", "pasta", "patch", "patience", "pattern", "pause", "peace", "peak",
    "peasant", "pedestrian", "penalty", "pension", "percentage", "perception", "period", "permission", "personality", "perspective",
    "persuasion", "petrol", "philosopher", "philosophy", "photograph", "photography", "physician", "physics", "piano", "picnic",
    "piece", "pig", "pile", "pillar", "pilot", "pin", "pipeline", "pirate", "pit", "pitch",
    "pizza", "placement", "plain", "planet", "plant", "plastic", "plate", "platform", "playlist", "plea",
    "pleasure", "plot", "plug", "poem", "poet", "poetry", "poison", "pole", "politics", "poll",
    "pollution", "pond", "pool", "pop", "popularity", "portion", "portrait", "possession", "possibility", "postage",
    "poster", "potato", "poverty", "powder", "power", "praise", "prayer", "prediction", "preference", "pregnancy",
    "preparation", "prescription", "presentation", "president", "press", "prevention", "pride", "priest", "prince", "princess",
    "principle", "print", "printer", "prison", "privacy", "privilege", "prize", "probability", "procedure", "processor",
    "producer", "production", "productivity", "professor", "profile", "profit", "program", "programmer", "programming", "promise",
    "promotion", "proof", "propaganda", "proportion", "prosecution", "prosecutor", "prospect", "prosperity", "protein", "protest",
    "provider", "province", "provision", "psychology", "publication", "publisher", "pulse", "pump", "punch", "punishment",
    "pupil", "purchase", "purity", "purple", "pursuit", "puzzle", "qualification", "quarter", "queen", "quest",
    "questionnaire", "quota", "quote", "race", "racism", "radar", "radiation", "rail", "railroad", "railway",
    "rainfall", "ranch", "range", "rank", "rape", "rat", "rate", "rating", "ratio", "raw",
    "ray", "reality", "realization", "realm", "rebate", "rebel", "rebellion", "receipt", "receiver", "reception",
    "recipe", "recipient", "recognition", "recommendation", "reconstruction", "recorder", "recording", "recreation", "recruit", "recruitment",
    "reduction", "referendum", "reflection", "reform", "refugee", "refusal", "regard", "regime", "register", "registration",
    "regulation", "regulator", "rehabilitation", "reign", "rejection", "relief", "religion", "remainder", "remark", "remedy",
    "reminder", "removal", "renewal", "rent", "rental", "replacement", "replica", "reporter", "representation", "representative",
    "republic", "reputation", "requirement", "rescue", "reservation", "reservoir", "residence", "resident", "resignation", "resistance",
    "resolution", "resort", "restaurant", "restriction", "retail", "retirement", "retreat", "return", "revelation", "revenue",
    "revolution", "reward", "rhetoric", "rhythm", "rib", "ribbon", "rice", "rider", "ridge", "rifle",
    "right", "riot", "rise", "ritual", "rival", "riverbank", "robot", "rock", "rocket", "rod",
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
    target_total = 1000
    target_add = max(0, target_total - len(items))
    if target_add == 0:
        print(f"Already at/above {target_total}: {len(items)}")
        return

    by_id = {i.get("id"): i for i in items}
    by_meaning = {(i.get("meaning") or "").strip().lower() for i in items}
    by_ar = {norm_ar(i.get("arabic", "")) for i in items}
    tr = GoogleTranslator(source="en", target="ar")

    added = 0
    skipped = 0
    failed = 0

    for en in BATCH6_NOUNS:
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

    print(f"Target total: {target_total}")
    print(f"Added: {added}")
    print(f"Skipped duplicate/existing: {skipped}")
    print(f"Failed translate: {failed}")
    print(f"Total ism now: {len(items)}")


if __name__ == "__main__":
    main()
