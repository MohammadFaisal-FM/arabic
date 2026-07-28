import json
import re
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(r"c:\Users\USER\Documents\Cursor\Personal Gigs\Arabic")
VOCAB = ROOT / "Saudi-Arabic" / "vocab"

SOURCE_PATH = VOCAB / "ism-candidates-online-poc.json"
TARGET_PATH = VOCAB / "ism-source.json"
BACKUP_PATH = VOCAB / "ism-source.backup.json"

AR_ONLY = re.compile(r"[^\u0621-\u064A]")

WIKTIONARY_API = "https://en.wiktionary.org/w/api.php"
UA = {"User-Agent": "ArabicIsmRebuild/1.0 (local project script)"}


def clean_ar(s: str) -> str:
    return AR_ONLY.sub("", s or "").strip()


def _clean_wiki_markup(text: str) -> str:
    text = re.sub(r"\{\{[^{}]*\}\}", "", text)
    text = re.sub(r"\[\[([^|\]]+)\|([^\]]+)\]\]", r"\2", text)
    text = re.sub(r"\[\[([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"''+", "", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text).strip(" ;:-")
    return text


def fetch_definition_from_wikitext(title: str) -> str:
    params = {
        "action": "parse",
        "page": title,
        "prop": "wikitext",
        "format": "json",
        "redirects": "1",
    }
    url = WIKTIONARY_API + "?" + urllib.parse.urlencode(params)
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=25) as r:
            payload = json.loads(r.read().decode("utf-8", errors="ignore"))
    except Exception:
        return ""

    raw = (
        payload.get("parse", {})
        .get("wikitext", {})
        .get("*", "")
    )
    if not raw:
        return ""

    m_ar = re.search(r"==Arabic==([\s\S]*?)(?:\n==[^=]|\Z)", raw)
    if not m_ar:
        return ""
    ar = m_ar.group(1)

    # Prefer noun / proper noun sections
    sections = re.findall(r"===\s*(Noun|Proper noun)\s*===([\s\S]*?)(?=\n===|\Z)", ar)
    bodies = [sec[1] for sec in sections] if sections else [ar]

    for body in bodies:
        for line in body.splitlines():
            line = line.strip()
            if not line.startswith("#"):
                continue
            gloss = re.sub(r"^#+\s*", "", line)
            gloss = _clean_wiki_markup(gloss)
            if gloss and not gloss.startswith("=="):
                return gloss[:140]
    return ""


def fetch_definition(word: str) -> str:
    by_wikitext = fetch_definition_from_wikitext(word)
    if by_wikitext:
        return by_wikitext

    params = {
        "action": "query",
        "prop": "extracts",
        "explaintext": "1",
        "redirects": "1",
        "titles": word,
        "format": "json",
    }
    url = WIKTIONARY_API + "?" + urllib.parse.urlencode(params)
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=25) as r:
            payload = json.loads(r.read().decode("utf-8", errors="ignore"))
    except Exception:
        return "definition unavailable (online lookup)"

    pages = payload.get("query", {}).get("pages", {})
    if not pages:
        return "definition unavailable (online lookup)"
    page = next(iter(pages.values()))
    extract = (page.get("extract") or "").strip()
    if not extract:
        return "definition unavailable (online lookup)"

    lines = [ln.strip() for ln in extract.splitlines() if ln.strip()]
    in_arabic = False
    for i, ln in enumerate(lines):
        lower = ln.lower()
        if lower == "arabic":
            in_arabic = True
            continue
        if in_arabic and lower in {"noun", "proper noun", "adjective"}:
            for j in range(i + 1, min(i + 10, len(lines))):
                cand = lines[j].strip()
                cl = cand.lower()
                if cl in {
                    "pronunciation",
                    "etymology",
                    "synonyms",
                    "antonyms",
                    "derived terms",
                    "related terms",
                    "anagrams",
                    "references",
                }:
                    break
                if any("a" <= ch.lower() <= "z" for ch in cand) and "==" not in cand:
                    return cand[:140]
        if in_arabic and any("a" <= ch.lower() <= "z" for ch in ln):
            if "==" not in ln:
                return ln[:140]

    for ln in lines:
        if any("a" <= ch.lower() <= "z" for ch in ln):
            return ln[:140]
    return "noun entry from online source"


def main():
    old = json.loads(TARGET_PATH.read_text(encoding="utf-8"))
    BACKUP_PATH.write_text(json.dumps(old, ensure_ascii=False, indent=2), encoding="utf-8")

    data = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    candidates = data.get("candidates", [])

    items = []
    seen = set()
    counter = 1

    for c in candidates:
        ar = clean_ar(c.get("arabic_norm", ""))
        title = (c.get("wiktionary_title") or "").strip() or ar
        if len(ar) < 3:
            continue
        if ar in seen:
            continue
        seen.add(ar)
        ex = (c.get("example") or "").strip()
        if not ex:
            ex = f"{ar} — example pending verification"
        meaning = fetch_definition(title)

        items.append(
            {
                "id": f"online-{counter:03d}",
                "arabic": ar,
                "meaning": meaning,
                "subtype": "noun",
                "example": ex,
            }
        )
        counter += 1

    out = {
        "note": (
            "Auto-generated from online extractable sources (Wiktionary Arabic nouns + "
            "Tatoeba usage evidence). Meanings are fetched from online dictionary extracts."
        ),
        "items": items,
    }
    TARGET_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Backed up previous list: {BACKUP_PATH}")
    print(f"Wrote new ism list: {TARGET_PATH}")
    print(f"Items: {len(items)}")


if __name__ == "__main__":
    main()
