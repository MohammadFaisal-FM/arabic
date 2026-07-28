"""Add seventh batch of everyday English nouns toward 1000 ism total."""
import json
import re
from pathlib import Path

from deep_translator import GoogleTranslator


ROOT = Path(__file__).resolve().parents[1]
ISM_PATH = ROOT / "Saudi-Arabic" / "vocab" / "ism-source.json"

BATCH7_NOUNS = [
    "romance", "roof", "roommate", "root", "rope", "rose", "rotation", "round", "route", "routine",
    "row", "royalty", "rubber", "rubbish", "rug", "ruin", "rulebook", "rumor", "runner", "running",
    "rural", "rush", "sacrifice", "saddle", "safeguard", "sailor", "salary", "salesman", "salmon", "salon",
    "salt", "salvation", "sandwich", "satellite", "satisfaction", "sauce", "saving", "scale", "scandal", "scar",
    "scenario", "scene", "scenery", "scheme", "scholar", "scholarship", "schooling", "scientist", "scope", "score",
    "scrap", "scratch", "scream", "screen", "script", "sculpture", "seafront", "seal", "seat", "secondary",
    "secretary", "sector", "security", "seed", "segment", "selection", "self", "seller", "seminar", "senator",
    "sensation", "sensitivity", "sensor", "sentiment", "separation", "sequence", "series", "servant", "settlement", "severity",
    "shade", "shadow", "shame", "shape", "shareholder", "sharing", "sheep", "sheet", "shelf", "shell",
    "shelter", "sheriff", "shield", "shift", "ship", "shipment", "shock", "shooting", "shopkeeper", "shore",
    "shortage", "shortcut", "shoulder", "show", "shower", "sibling", "sickness", "sidewalk", "sight", "sightseeing",
    "silence", "silk", "silver", "similarity", "simplicity", "sin", "singer", "sir", "sisterhood", "site",
    "sketch", "ski", "skin", "skirt", "skull", "slave", "slavery", "sleep", "sleeve", "slice",
    "slide", "slogan", "slope", "slot", "smell", "smile", "smoke", "smoking", "snake", "snow",
    "soap", "soccer", "sock", "software", "soil", "soldier", "solidarity", "solo", "somebody", "someone",
    "song", "sorrow", "sort", "soul", "soup", "sovereignty", "specialist", "species", "spectacle", "spectator",
    "speech", "sphere", "spice", "spider", "spine", "spirit", "spirituality", "spite", "spokesman", "sponsor",
    "sponsorship", "spot", "spotlight", "spouse", "spray", "spread", "spring", "squad", "square", "stability",
    "stadium", "staff", "stake", "stamp", "stand", "standing", "star", "startup", "statement", "station",
    "statistics", "statue", "stay", "steam", "steel", "stem", "stereotype", "steward", "stick", "stimulus",
    "stock", "stomach", "stone", "stop", "store", "storm", "story", "stove", "strain", "strand",
    "stranger", "strategy", "straw", "stream", "street", "strength", "stress", "stretch", "strike", "string",
    "strip", "stroke", "studio", "study", "stuff", "substance", "suburb", "subway", "succession", "suffering",
    "sugar", "suggestion", "suicide", "suit", "suitcase", "sum", "summary", "summer", "summit", "sunlight",
    "supermarket", "supervisor", "supplier", "supply", "supreme", "surgeon", "surgery", "surprise", "surveillance", "survey",
    "survival", "survivor", "suspicion", "sustainability", "sweater", "sweep", "sweet", "swim", "swimming", "swing",
    "switch", "sword", "symbol", "sympathy", "symphony", "syndrome", "synthesis", "tablet", "tactic", "tail",
    "talent", "tank", "tape", "target", "taste", "tax", "taxpayer", "tea", "teaching", "technique",
    "teenager", "telephone", "telescope", "television", "temper", "temperature", "temple", "temptation", "tenant", "tendency",
    "tennis", "tension", "tent", "terminal", "territory", "terrorism", "terrorist", "textbook", "textile", "texture",
    "thanksgiving", "theater", "theft", "therapy", "thigh", "thinness", "thirst", "threat", "threshold", "throat",
    "throne", "thumb", "thunder", "ticket", "tide", "tie", "timber", "timeline", "timing", "tin",
    "tissue", "title", "toast", "tobacco", "today", "toe", "token", "tolerance", "tomato", "tone",
    "tongue", "tonight", "tonne", "tooth", "top", "torch", "torture", "total", "touch", "tourism",
    "tourist", "towel", "tower", "town", "toy", "trace", "track", "tractor", "trade", "trader",
    "trading", "tradition", "traffic", "tragedy", "trail", "trailer", "train", "trainer", "trait", "transaction",
    "transcript", "transfer", "transformation", "transit", "translation", "transmission", "transparency", "transportation", "trap", "trash",
    "trauma", "travel", "traveler", "tray", "treasure", "treasury", "treat", "treatment", "treaty", "tree",
    "trench", "trial", "triangle", "tribe", "tribute", "trick", "trigger", "trip", "triumph", "troop",
    "trophy", "trouble", "trousers", "truck", "trust", "trustee", "truth", "tube", "tumor", "tune",
    "tunnel", "turkey", "turn", "turnout", "turnover", "tutor", "twin", "twist", "typhoon", "tyre",
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

    for en in BATCH7_NOUNS:
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
