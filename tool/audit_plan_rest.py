#!/usr/bin/env python3
"""Classify drill rest timing vs athlete-first rules."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DRILLS = ROOT / "drills"


def distinct_acts(rounds: list) -> int:
    ids = [r.get("activityId") for r in rounds if r.get("activityId")]
    return len(set(ids))


def classify(path: Path) -> str:
    data = json.loads(path.read_text(encoding="utf-8"))
    name = data.get("name") or path.stem
    if "tabata" in path.stem.lower():
        sets = (data.get("structuredPlan") or {}).get("sets") or []
        n = len(sets)
        if n <= 1:
            return f"TABATA_REVIEW  sets={n}  ({name})"
        return f"TABATA_OK  sets={n}  ({name})"

    work = int(data.get("workSeconds") or 0)
    rr = int(data.get("restBetweenRepsSeconds") or 0)
    sr = int(data.get("restBetweenSetsSeconds") or 0)
    sets = (data.get("structuredPlan") or {}).get("sets") or []
    max_d = 0
    for s in sets:
        max_d = max(max_d, distinct_acts(s.get("rounds") or []))

    if max_d >= 2 and rr <= work:
        return f"FIX  work={work} rr={rr} sr={sr} acts={max_d}  ({name})"
    if rr >= work and work > 0:
        return f"OK   work={work} rr={rr} sr={sr}  ({name})"
    return f"CHECK work={work} rr={rr} sr={sr}  ({name})"


def main() -> int:
    for p in sorted(DRILLS.glob("remote_*.json")):
        print(f"{p.name:45} {classify(p)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())