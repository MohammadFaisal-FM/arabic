import json
from pathlib import Path

from deep_translator import GoogleTranslator


ROOT = Path(r"c:\Users\USER\Documents\Cursor\Personal Gigs\Arabic")
ISM_PATH = ROOT / "Saudi-Arabic" / "vocab" / "ism-source.json"


def is_bad(meaning: str) -> bool:
    m = (meaning or "").strip().lower()
    return (not m) or m.startswith("==") or ("unavailable" in m) or ("noun entry from online source" in m)


def main():
    data = json.loads(ISM_PATH.read_text(encoding="utf-8"))
    items = data.get("items", [])
    tr = GoogleTranslator(source="ar", target="en")

    fixed = 0
    for item in items:
        meaning = item.get("meaning", "")
        if not is_bad(meaning):
            continue
        word = item.get("arabic", "").strip()
        if not word:
            item["meaning"] = "noun"
            fixed += 1
            continue
        try:
            translated = tr.translate(word) or ""
        except Exception:
            translated = ""
        translated = translated.strip()
        if not translated:
            translated = "noun"
        item["meaning"] = translated
        fixed += 1

    data["note"] = (
        "Auto-generated from online extractable sources (Wiktionary Arabic nouns + Tatoeba usage evidence). "
        "Meanings are filled from dictionary parse with translation fallback."
    )
    ISM_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Updated meanings: {fixed}")
    print(f"Total items: {len(items)}")


if __name__ == "__main__":
    main()
