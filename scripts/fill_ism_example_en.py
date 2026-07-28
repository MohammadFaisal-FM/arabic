"""Fill exampleEn for ism items (used in Roots → Related-Words)."""
import json
import re
from pathlib import Path

from deep_translator import GoogleTranslator


ROOT = Path(__file__).resolve().parents[1]
ISM_PATH = ROOT / "Saudi-Arabic" / "vocab" / "ism-source.json"


def split_bilingual(example: str) -> tuple[str, str | None]:
    if " — " in example:
        ar, en = example.split(" — ", 1)
        return ar.strip(), en.strip()
    if " - " in example and re.search(r"[a-zA-Z]", example):
        parts = example.split(" - ", 1)
        if re.search(r"[a-zA-Z]", parts[1]):
            return parts[0].strip(), parts[1].strip()
    return example.strip(), None


def main():
    data = json.loads(ISM_PATH.read_text(encoding="utf-8"))
    items = data.get("items", [])
    tr = GoogleTranslator(source="ar", target="en")

    # Fill exampleEn for any item with an Arabic example
    targets = [i for i in items if (i.get("example") or "").strip()]
    filled = 0
    for item in targets:
        raw = (item.get("example") or "").strip()
        if not raw:
            continue
        ar, existing_en = split_bilingual(raw)
        if existing_en:
            item["example"] = ar
            item["exampleEn"] = existing_en
            filled += 1
            continue
        if item.get("exampleEn"):
            continue
        try:
            en = (tr.translate(ar) or "").strip()
        except Exception:
            en = ""
        if en:
            item["exampleEn"] = en
            filled += 1

    ISM_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Filled exampleEn for {filled} isms (of {len(targets)} with examples)")


if __name__ == "__main__":
    main()
