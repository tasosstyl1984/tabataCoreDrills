#!/usr/bin/env python3
"""Apply athlete-first rest tiers to tabataCoreDrills plans (batch maintainer)."""
from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DRILLS = ROOT / "drills"

GYM_TIER = (30, 60, 80)
BW_TIER = (30, 60, 75)  # reference: remote_full_bw

BW_SKIP = {
    "remote_full_bw.json",
    "remote_upper_bw.json",
    "remote_legs_bw.json",
}

GYM_IDS = [
    "remote_back_mach.json",
    "remote_chest_mach.json",
    "remote_core_mach.json",
    "remote_full_mach.json",
    "remote_legs_mach.json",
    "remote_cardio_mach.json",
    "remote_back_db.json",
    "remote_chest_db.json",
    "remote_full_db.json",
    "remote_legs_db.json",
    "remote_cardio_db.json",
    "remote_core_kb.json",
    "remote_hyrox_20.json",
    "remote_hyrox_30.json",
    "remote_hyrox_40.json",
]

BW_IDS = [
    "remote_back_bw.json",
    "remote_chest_bw.json",
    "remote_core_bw.json",
    "remote_cardio_bw.json",
]


def apply_tier(path: Path, work: int, round_rest: int, set_rest: int) -> bool:
    data = json.loads(path.read_text(encoding="utf-8"))
    plan = data.get("structuredPlan") or {}
    sets = plan.get("sets") or []
    if not sets:
        print(f"  skip (no structuredPlan): {path.name}")
        return False

    for s in sets:
        for r in s.get("rounds") or []:
            r["workSeconds"] = work
            r["restAfterSeconds"] = round_rest
        s["restAfterSetSeconds"] = set_rest

    first_set = sets[0]
    first_round = (first_set.get("rounds") or [{}])[0]
    data["sets"] = len(sets)
    data["repsPerSet"] = len(first_set.get("rounds") or [])
    data["workSeconds"] = first_round.get("workSeconds", work)
    data["restBetweenRepsSeconds"] = first_round.get("restAfterSeconds", round_rest)
    data["restBetweenSetsSeconds"] = first_set.get("restAfterSetSeconds", set_rest)
    data["structuredPlan"] = plan

    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return True


def retime_bw(path: Path) -> bool:
    data = json.loads(path.read_text(encoding="utf-8"))
    w, r, s = BW_TIER
    sets = (data.get("structuredPlan") or {}).get("sets") or []
    if not sets:
        return False
    if data.get("sets") == 6 and len(sets) == 6:
        sets = sets[:4]
        data["structuredPlan"]["sets"] = sets
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return apply_tier(path, w, r, s)


def expand_tabata(path: Path, num_sets: int, set_rest: int, warmup: int, cooldown: int) -> bool:
    data = json.loads(path.read_text(encoding="utf-8"))
    plan = data.get("structuredPlan") or {}
    sets = plan.get("sets") or []
    if not sets:
        return False
    template = copy.deepcopy(sets[0])
    template["restAfterSetSeconds"] = set_rest
    plan["sets"] = [copy.deepcopy(template) for _ in range(num_sets)]
    data["structuredPlan"] = plan
    data["sets"] = num_sets
    data["repsPerSet"] = len(template.get("rounds") or [])
    first_round = (template.get("rounds") or [{}])[0]
    data["workSeconds"] = first_round.get("workSeconds", 20)
    data["restBetweenRepsSeconds"] = first_round.get("restAfterSeconds", 10)
    data["restBetweenSetsSeconds"] = set_rest
    data["warmupEnabled"] = True
    data["warmupSeconds"] = warmup
    data["cooldownEnabled"] = True
    data["cooldownSeconds"] = cooldown
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return True


def main() -> int:
    changed: list[str] = []

    for name in GYM_IDS:
        p = DRILLS / name
        if not p.is_file():
            continue
        if apply_tier(p, *GYM_TIER):
            changed.append(name)

    for name in BW_IDS:
        if name in BW_SKIP:
            continue
        p = DRILLS / name
        if not p.is_file():
            continue
        if retime_bw(p):
            changed.append(name)

    tabata_specs = {
        "remote_tabata_classic.json": (3, 180, 90, 60),
        "remote_tabata_bodyweight.json": (3, 180, 90, 60),
        "remote_tabata_power.json": (2, 240, 90, 60),
    }
    for name, (n, set_rest, warmup, cooldown) in tabata_specs.items():
        p = DRILLS / name
        if p.is_file() and expand_tabata(p, n, set_rest, warmup, cooldown):
            changed.append(name)

    for c in changed:
        print(c)
    print(f"Updated {len(changed)} drill file(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())