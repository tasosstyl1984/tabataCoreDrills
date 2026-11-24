#!/usr/bin/env python3
"""Tune shipped metabolic presets for athlete-first defaults."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DRILLS = ROOT / "drills"


def load(name: str) -> dict:
    return json.loads((DRILLS / name).read_text(encoding="utf-8"))


def save(name: str, data: dict) -> None:
    (DRILLS / name).write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def set_rest_all(data: dict, set_rest: int) -> None:
    for s in (data.get("structuredPlan") or {}).get("sets") or []:
        s["restAfterSetSeconds"] = set_rest
    data["restBetweenSetsSeconds"] = set_rest


def set_round_rest_all(data: dict, round_rest: int) -> None:
    for s in (data.get("structuredPlan") or {}).get("sets") or []:
        for r in s.get("rounds") or []:
            r["restAfterSeconds"] = round_rest
    data["restBetweenRepsSeconds"] = round_rest


def main() -> None:
    hiit = load("remote_hiit_strength_30.json")
    set_round_rest_all(hiit, 60)
    hiit["warmupEnabled"] = True
    hiit["description"] = (
        "Strength and conditioning circuits at a strong, repeatable pace. "
        "Shorten rest in the app when you want more challenge."
    )
    save("remote_hiit_strength_30.json", hiit)

    engine = load("remote_engine_conditioning_45.json")
    set_rest_all(engine, 120)
    engine["warmupEnabled"] = True
    engine["description"] = (
        "Ropes, carries, and slam-style work to build work capacity — "
        "controlled effort with room to recover between sets."
    )
    save("remote_engine_conditioning_45.json", engine)

    for name in ("remote_plyo_power_30.json", "remote_plyo_lateral_30.json"):
        plyo = load(name)
        set_rest_all(plyo, 120)
        plyo["warmupEnabled"] = True
        save(name, plyo)

    loco = load("remote_locomotion_40.json")
    loco["warmupEnabled"] = True
    save("remote_locomotion_40.json", loco)

    kb_box = load("remote_kb_boxing_complex.json")
    set_rest_all(kb_box, 90)
    kb_box["warmupEnabled"] = True
    save("remote_kb_boxing_complex.json", kb_box)

    kb = load("remote_kb_complex_40.json")
    kb["description"] = (
        "Linked kettlebell complexes for strength, grip, and conditioning — "
        "stay in control and adjust rest to match your pace."
    )
    save("remote_kb_complex_40.json", kb)

    tabata_desc = (
        "Classic 20-on / 10-off stations — repeat the eight-move circuit for three rounds "
        "with full rest between rounds. Work strong and controlled; shorten rest in the app "
        "when you want more challenge."
    )
    for name in ("remote_tabata_classic.json", "remote_tabata_bodyweight.json"):
        t = load(name)
        t["description"] = tabata_desc if "classic" in name else (
            "Classic Tabata timing with a full-body bodyweight rotation — three circuits with "
            "rest between rounds. Finish feeling worked, not wrecked."
        )
        save(name, t)

    power = load("remote_tabata_power.json")
    power["description"] = (
        "Explosive bodyweight intervals on 20/10 timing — two circuits with long set rest. "
        "Warm up well, land softly, and scale effort to your level."
    )
    save("remote_tabata_power.json", power)

    print("Patched metabolic + Tabata copy.")


if __name__ == "__main__":
    main()