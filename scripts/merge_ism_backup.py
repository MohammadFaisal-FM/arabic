"""
Merge ism-source.json with ism-source.backup.json and the original curated list
(recovered from git markdown at c0c7e8a).

Dedupes by normalized Arabic. Prefers curated entries (rootId, hand meanings) over
online-import noise. Skips backup-only junk (particles, bad definitions).
"""
import json
import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VOCAB = ROOT / "Saudi-Arabic" / "vocab"
ISM_PATH = VOCAB / "ism-source.json"
BACKUP_PATH = VOCAB / "ism-source.backup.json"
GIT_REF = "c0c7e8a"
GIT_ISM_DIR = "Saudi-Arabic/vocab/ism"

AR_ONLY = re.compile(r"[^\u0621-\u064A]")

SKIP_NORM = {
    "انا",
    "الي",
    "انه",
    "اين",
    "انك",
    "اني",
    "اليه",
    "ايه",
}


def norm_arabic(s: str) -> str:
    s = AR_ONLY.sub("", s or "")
    s = s.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
    s = s.replace("ة", "ه").replace("ى", "ي")
    return s


def is_bad_meaning(meaning: str) -> bool:
    m = (meaning or "").strip().lower()
    return (
        not m
        or m.startswith("==")
        or "unavailable" in m
        or "noun entry from online source" in m
    )


def score(item: dict) -> int:
    s = 0
    if item.get("rootId"):
        s += 100
    meaning = item.get("meaning", "")
    if not is_bad_meaning(meaning):
        s += 50 + min(len(meaning), 120)
    example = item.get("example", "")
    if example:
        s += min(len(example), 80)
    item_id = str(item.get("id", ""))
    if not item_id.startswith("online-"):
        s += 25
    if item.get("subtype") in {"masdar", "doer", "place", "loan"}:
        s += 5
    return s


def merge_pair(primary: dict, secondary: dict) -> dict:
    """Keep the higher-scored record; enrich from the other."""
    if score(secondary) > score(primary):
        primary, secondary = secondary, primary
    out = dict(primary)
    if secondary.get("rootId") and not out.get("rootId"):
        out["rootId"] = secondary["rootId"]
    if is_bad_meaning(out.get("meaning", "")) and not is_bad_meaning(
        secondary.get("meaning", "")
    ):
        out["meaning"] = secondary["meaning"]
    if not out.get("example") and secondary.get("example"):
        out["example"] = secondary["example"]
    elif secondary.get("example") and len(secondary["example"]) > len(out.get("example", "")):
        out["example"] = secondary["example"]
    if not out.get("subtype") and secondary.get("subtype"):
        out["subtype"] = secondary["subtype"]
    return out


def git_ism_md_paths() -> list[str]:
    out = subprocess.check_output(
        ["git", "ls-tree", "-r", "--name-only", GIT_REF, GIT_ISM_DIR],
        text=True,
        cwd=ROOT,
    )
    paths = []
    for line in out.splitlines():
        line = line.strip()
        if line.endswith(".md") and not line.endswith("README.md"):
            paths.append(line)
    return paths


def parse_example_from_md(content: str) -> str:
    m = re.search(r"## Example\s*\n+(.*?)(?:\n---|\n## |\Z)", content, re.S)
    if not m:
        return ""
    for line in m.group(1).splitlines():
        line = line.strip()
        if not line.startswith("|"):
            continue
        inner = line.strip("|").strip()
        if not inner or inner.startswith("**") or "English" in inner:
            continue
        if re.fullmatch(r"-+", inner.replace(" ", "")):
            continue
        if " — " in inner:
            inner = inner.split(" — ", 1)[0].strip()
        return inner
    return ""


def parse_ism_md(content: str, rel_path: str) -> dict | None:
    stem = Path(rel_path).stem
    arabic_m = re.search(r"\| \*\*Arabic\*\* \| (.+?) \|", content)
    meaning_m = re.search(r"\| \*\*Meaning\*\* \| (.+?) \|", content)
    subtype_m = re.search(r"\| \*\*Subtype\*\* \| (.+?) \|", content)
    root_m = re.search(r"\| \*\*Root\*\* \|[^`]*`([^`]+)`", content)
    if not arabic_m or not meaning_m:
        return None

    arabic = arabic_m.group(1).strip()
    meaning = meaning_m.group(1).strip()
    subtype = (subtype_m.group(1).strip() if subtype_m else "noun")
    example = parse_example_from_md(content)

    item = {
        "id": stem,
        "arabic": arabic,
        "meaning": meaning,
        "subtype": subtype,
        "example": example,
    }
    if root_m:
        item["rootId"] = root_m.group(1).strip()
    return item


def load_curated_from_git() -> list[dict]:
    items = []
    for rel in git_ism_md_paths():
        raw = subprocess.check_output(
            ["git", "show", f"{GIT_REF}:{rel}"],
            cwd=ROOT,
        )
        content = raw.decode("utf-8")
        parsed = parse_ism_md(content, rel)
        if parsed:
            items.append(parsed)
    return items


def load_json(path: Path) -> list[dict]:
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    return data.get("items", [])


def merge_sources(
    current: list[dict],
    curated: list[dict],
    backup: list[dict],
) -> tuple[list[dict], dict]:
    merged: dict[str, dict] = {}
    stats = {
        "from_current": 0,
        "from_curated": 0,
        "from_backup": 0,
        "added_curated": 0,
        "added_backup": 0,
        "skipped_backup_junk": 0,
        "skipped_particles": 0,
        "upgraded": 0,
    }

    def ingest(item: dict, source: str) -> None:
        key = norm_arabic(item.get("arabic", ""))
        if not key:
            return
        if key in SKIP_NORM:
            stats["skipped_particles"] += 1
            return

        if source == "backup":
            if key not in merged and is_bad_meaning(item.get("meaning", "")):
                stats["skipped_backup_junk"] += 1
                return

        if key in merged:
            before = dict(merged[key])
            merged[key] = merge_pair(merged[key], item)
            # Prefer non-empty example from either side
            ex_a = before.get("example", "")
            ex_b = item.get("example", "")
            if not merged[key].get("example"):
                merged[key]["example"] = ex_a or ex_b
            if merged[key] != before or merged[key].get("example") != before.get("example"):
                stats["upgraded"] += 1
        else:
            merged[key] = dict(item)
            if source == "curated":
                stats["added_curated"] += 1
            elif source == "backup":
                stats["added_backup"] += 1

    for item in current:
        ingest(item, "current")
        stats["from_current"] += 1
    for item in curated:
        ingest(item, "curated")
        stats["from_curated"] += 1
    for item in backup:
        ingest(item, "backup")
        stats["from_backup"] += 1

    # Sort: Arabic script order (by normalized key)
    items = sorted(merged.values(), key=lambda i: norm_arabic(i.get("arabic", "")))

    return items, stats


def main():
    current = load_json(ISM_PATH)
    backup = load_json(BACKUP_PATH)
    curated = load_curated_from_git()

    items, stats = merge_sources(current, curated, backup)

    out = {
        "note": (
            "Merged curated Saudi/Najdi nouns (git) with online Tatoeba/Wiktionary import. "
            "Deduped by Arabic form; backup junk (particles, failed lookups) excluded."
        ),
        "items": items,
    }
    ISM_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")

    print("Merge complete")
    print(f"  Current input:   {len(current)}")
    print(f"  Curated (git):   {len(curated)}")
    print(f"  Backup input:    {len(backup)}")
    print(f"  Output total:    {len(items)}")
    print(f"  Added curated:   {stats['added_curated']}")
    print(f"  Added backup:    {stats['added_backup']}")
    print(f"  Upgraded merges: {stats['upgraded']}")
    print(f"  Skipped junk:    {stats['skipped_backup_junk']}")
    print(f"  Skipped particles: {stats['skipped_particles']}")


if __name__ == "__main__":
    main()
