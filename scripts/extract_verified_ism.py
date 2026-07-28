import json
import re
from pathlib import Path
from collections import Counter, defaultdict

from pypdf import PdfReader


ROOT = Path(r"c:\Users\USER\Documents\Cursor\Personal Gigs\Arabic")
SAUDI = ROOT / "Saudi-Arabic"
VOCAB = SAUDI / "vocab"

PDFS = [
    SAUDI / "arabic-english-dictionary-the-hans-wehr-dictionary-of-modern-written-arabic.pdf",
    SAUDI / "arabicenglishdic00hava.pdf",
    SAUDI / "Arabic-EnglishEnglish-Arabic practical dictionary.pdf",
    SAUDI / "Arabic_EnglishdictionaryPDFDrive.pdf",
    SAUDI / "Collins_Arabic_3000_words_and_phrases.pdf",
]

ARABIC_SEQ = re.compile(r"[\u0621-\u064A][\u0621-\u064A\u0640\u064B-\u065F]{1,}")
DIACRITICS = re.compile(r"[\u064B-\u065F\u0670\u0640]")
NON_AR = re.compile(r"[^\u0621-\u064A]")


def normalize(token: str) -> str:
    token = DIACRITICS.sub("", token)
    token = NON_AR.sub("", token)
    token = token.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
    token = token.replace("ة", "ه")
    token = token.replace("ى", "ي")
    return token.strip()


def looks_like_noun(token: str) -> bool:
    # conservative noun-shaped heuristics
    return (
        token.startswith("ال")
        or token.endswith("ة")
        or token.endswith("ات")
        or token.endswith("ان")
        or token.endswith("ون")
        or token.endswith("ين")
    )


def load_existing_words():
    ism = json.loads((VOCAB / "ism-source.json").read_text(encoding="utf-8"))
    harf = json.loads((VOCAB / "harf-source.json").read_text(encoding="utf-8"))
    fil_manifest = json.loads((ROOT / "web" / "public" / "fil-manifest.json").read_text(encoding="utf-8"))

    existing_ism = {normalize(i["arabic"]) for i in ism["items"]}
    harf_words = {normalize(i["arabic"]) for i in harf["items"]}
    fil_words = {normalize(i["arabic"]) for i in fil_manifest["items"]}
    return existing_ism, harf_words, fil_words


def extract_from_pdf(path: Path):
    tokens = []
    try:
        reader = PdfReader(str(path))
    except Exception:
        return tokens
    for page in reader.pages:
        text = page.extract_text() or ""
        for m in ARABIC_SEQ.findall(text):
            t = normalize(m)
            if len(t) >= 2:
                tokens.append(t)
    return tokens


def main():
    existing_ism, harf_words, fil_words = load_existing_words()

    token_sources = defaultdict(set)
    token_counts = Counter()
    readable = []

    for pdf in PDFS:
        if not pdf.exists():
            continue
        tokens = extract_from_pdf(pdf)
        if tokens:
            readable.append(pdf.name)
        for t in tokens:
            token_counts[t] += 1
            token_sources[t].add(pdf.name)

    candidates = []
    for t, count in token_counts.items():
        # strict filter: noun shape + multi-source + not in existing tabs
        if not looks_like_noun(t):
            continue
        if len(token_sources[t]) < 2:
            continue
        if t in existing_ism or t in harf_words or t in fil_words:
            continue
        # avoid obvious OCR garbage
        if "الل" in t[:2] and len(t) == 2:
            continue
        candidates.append(
            {
                "arabic_norm": t,
                "seen_count": count,
                "sources": sorted(token_sources[t]),
            }
        )

    candidates.sort(key=lambda x: (-len(x["sources"]), -x["seen_count"], x["arabic_norm"]))

    out = {
        "readable_pdfs": readable,
        "candidate_count": len(candidates),
        "candidates": candidates[:300],
    }
    out_path = SAUDI / "vocab" / "ism-candidates-verified.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Readable PDFs: {len(readable)}")
    print(f"Candidates: {len(candidates)}")
    print(f"Wrote: {out_path}")


if __name__ == "__main__":
    main()
