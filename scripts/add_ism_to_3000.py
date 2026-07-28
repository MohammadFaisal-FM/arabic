"""Fill ism-source.json up to TARGET_TOTAL (default 3000) with English nouns.

Sources: Google 10k + popular dictionary words, filtered to noun-like forms.
Resumable — safe to re-run; skips existing meanings / Arabic forms.
"""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

from deep_translator import GoogleTranslator

ROOT = Path(__file__).resolve().parents[1]
ISM_PATH = ROOT / "Saudi-Arabic" / "vocab" / "ism-source.json"
WORD_FILES = [
    ROOT / "scripts" / "_en10k.txt",
    ROOT / "scripts" / "_en1k.txt",
    ROOT / "scripts" / "_popular.txt",
]
TARGET_TOTAL = 3000
SAVE_EVERY = 25

AR_ONLY = re.compile(r"[^\u0621-\u064A]")

STOP = {
    "a", "an", "the", "and", "or", "but", "if", "then", "so", "because", "as", "than",
    "of", "to", "in", "on", "at", "by", "for", "from", "with", "about", "into", "over",
    "after", "before", "between", "through", "during", "without", "under", "again",
    "i", "me", "my", "mine", "we", "us", "our", "you", "your", "he", "him", "his",
    "she", "her", "hers", "it", "its", "they", "them", "their", "this", "that", "these",
    "those", "who", "whom", "whose", "which", "what", "where", "when", "why", "how",
    "all", "any", "both", "each", "few", "more", "most", "other", "some", "such",
    "no", "nor", "not", "only", "own", "same", "too", "very", "can", "will", "just",
    "should", "now", "also", "even", "still", "already", "always", "never", "often",
    "here", "there", "yes", "ok", "okay", "oh", "hi", "hello", "please", "thanks",
    "be", "am", "is", "are", "was", "were", "been", "being", "have", "has", "had",
    "do", "does", "did", "done", "doing", "get", "got", "go", "goes", "went", "gone",
    "make", "made", "take", "took", "taken", "come", "came", "see", "saw", "seen",
    "know", "knew", "known", "think", "thought", "say", "said", "tell", "told",
    "ask", "give", "gave", "given", "find", "found", "want", "use", "used", "try",
    "need", "feel", "felt", "become", "became", "leave", "left", "put", "keep",
    "kept", "let", "begin", "began", "seem", "help", "show", "hear", "heard",
    "play", "run", "ran", "move", "live", "bring", "brought", "write", "wrote",
    "written", "sit", "sat", "stand", "stood", "lose", "lost", "pay", "paid",
    "meet", "met", "include", "continue", "set", "learn", "change", "lead", "led",
    "understand", "watch", "follow", "stop", "create", "speak", "spoke", "read",
    "spend", "spent", "grow", "grew", "open", "walk", "win", "won", "offer",
    "remember", "consider", "appear", "buy", "bought", "wait", "serve", "die",
    "send", "sent", "expect", "build", "built", "stay", "fall", "fell", "cut",
    "reach", "kill", "remain", "suggest", "raise", "pass", "sell", "sold",
    "require", "report", "decide", "pull", "push", "return", "explain", "develop",
    "carry", "break", "broke", "broken", "receive", "agree", "support", "hit",
    "produce", "eat", "ate", "cover", "catch", "caught", "draw", "choose", "chose",
    "wear", "wore", "drink", "drive", "drove", "sleep", "wake", "forget", "laugh",
    "cry", "sing", "dance", "swim", "fly", "throw", "good", "bad", "new", "old",
    "great", "big", "small", "large", "high", "low", "long", "short", "early",
    "late", "young", "right", "wrong", "true", "false", "first", "last", "next",
    "best", "better", "worst", "free", "full", "empty", "easy", "hard", "soft",
    "hot", "cold", "warm", "cool", "fast", "slow", "quick", "real", "sure", "clear",
    "simple", "special", "important", "possible", "available", "local", "national",
    "international", "public", "private", "personal", "social", "political",
    "economic", "financial", "medical", "legal", "final", "main", "major", "minor",
    "strong", "weak", "happy", "sad", "angry", "afraid", "ready", "busy", "nice",
    "beautiful", "ugly", "clean", "dirty", "rich", "poor", "safe", "dangerous",
    "different", "similar", "various", "certain", "general", "specific", "able",
    "much", "many", "little", "less", "least", "several", "every", "another",
    "up", "down", "out", "off", "away", "back", "around", "across", "along",
    "near", "far", "inside", "outside", "above", "below", "within", "among",
    "once", "almost", "quite", "rather", "really", "actually", "probably",
    "perhaps", "maybe", "especially", "usually", "however", "therefore",
    "although", "though", "while", "until", "unless", "whether", "either", "neither",
    "mr", "mrs", "ms", "dr", "etc", "via", "per", "plus", "minus", "vs",
    "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "would", "could", "should", "might", "must", "shall", "may", "like", "click",
    "online", "web", "www", "http", "https", "com", "org", "net", "html", "php",
    "yes", "nope", "yeah", "yep", "nah", "lol", "omg", "btw", "imo",
}

KEEP_ING = {
    "thing", "building", "meeting", "wedding", "ceiling", "feeling", "painting",
    "training", "shipping", "parking", "bedding", "clothing", "housing", "funding",
    "landing", "warning", "hearing", "opening", "ending", "living", "writing",
    "reading", "cooking", "cleaning", "planning", "shopping", "swimming", "running",
    "learning", "teaching", "marketing", "advertising", "engineering", "accounting",
    "manufacturing", "beginning", "understanding", "recording", "drawing", "meaning",
    "morning", "evening", "clothing", "lighting", "listing", "rating", "setting",
}

NOUN_SUFFIXES = (
    "tion", "sion", "ment", "ness", "ity", "ism", "ist", "ance", "ence", "ancy",
    "ency", "ship", "hood", "dom", "age", "ure", "ogy", "ics", "phy", "ette",
)


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def norm_ar(s: str) -> str:
    s = AR_ONLY.sub("", s or "")
    s = s.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
    s = s.replace("ة", "ه").replace("ى", "ي")
    return s


def looks_like_noun(w: str) -> bool:
    if len(w) < 3 or not w.isalpha() or w in STOP:
        return False
    if w.endswith("ly") and len(w) > 4:
        return False
    if w.endswith("ed"):
        return False
    if w.endswith("ing"):
        return w in KEEP_ING or any(w.endswith(x) for x in KEEP_ING)
    if any(w.endswith(suf) for suf in NOUN_SUFFIXES):
        return True
    # concrete / common short-mid nouns from frequency lists
    return 3 <= len(w) <= 14


def candidate_nouns() -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for path in WORD_FILES:
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            w = line.strip().lower()
            if not looks_like_noun(w) or w in seen:
                continue
            seen.add(w)
            out.append(w)
    return out


def main() -> None:
    data = json.loads(ISM_PATH.read_text(encoding="utf-8"))
    items = data.get("items", [])
    start = len(items)
    need = max(0, TARGET_TOTAL - start)
    print(f"Start: {start} | Need: {need} | Target: {TARGET_TOTAL}", flush=True)
    if need == 0:
        return

    by_id = {i.get("id"): i for i in items}
    by_meaning = {(i.get("meaning") or "").strip().lower() for i in items}
    by_ar = {norm_ar(i.get("arabic", "")) for i in items}
    tr = GoogleTranslator(source="en", target="ar")

    candidates = [c for c in candidate_nouns() if c not in by_meaning]
    print(f"Fresh candidates: {len(candidates)}", flush=True)

    added = 0
    skipped = 0
    failed = 0

    for en in candidates:
        if added >= need:
            break

        ar = ""
        for attempt in range(3):
            try:
                ar = (tr.translate(en) or "").strip()
                break
            except Exception:
                time.sleep(1.2 * (attempt + 1))
                ar = ""
        if not ar or re.fullmatch(r"[A-Za-z0-9 \-']+", ar):
            failed += 1
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

        if added % SAVE_EVERY == 0:
            data["items"] = items
            ISM_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"  progress: +{added} -> total {len(items)}", flush=True)

    data["items"] = items
    ISM_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Added: {added}", flush=True)
    print(f"Skipped (dup Arabic): {skipped}", flush=True)
    print(f"Failed translate: {failed}", flush=True)
    print(f"Total ism now: {len(items)}", flush=True)
    if len(items) < TARGET_TOTAL:
        print(f"SHORTFALL: need {TARGET_TOTAL - len(items)} more", flush=True)


if __name__ == "__main__":
    main()
