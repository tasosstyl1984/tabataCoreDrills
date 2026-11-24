#!/usr/bin/env python3
"""Bump catalog/presets versions and sync descriptions from drill JSON."""
from __future__ import annotations

import json
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DRILLS = ROOT / "drills"
NOW_MS = int(time.time() * 1000)


def sync_descriptions(entries: list) -> None:
    for entry in entries:
        p = DRILLS / f"{entry['id']}.json"
        if not p.is_file():
            continue
        data = json.loads(p.read_text(encoding="utf-8"))
        if data.get("description"):
            entry["description"] = data["description"]
        entry["updatedAtMs"] = NOW_MS


def main() -> None:
    presets_path = ROOT / "presets.json"
    catalog_path = ROOT / "catalog.json"

    presets = json.loads(presets_path.read_text(encoding="utf-8"))
    presets["version"] = int(presets.get("version", 0)) + 1
    presets["updatedAtMs"] = NOW_MS
    sync_descriptions(presets.get("drills") or [])
    presets_path.write_text(
        json.dumps(presets, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    catalog["version"] = int(catalog.get("version", 0)) + 1
    catalog["updatedAtMs"] = NOW_MS
    sync_descriptions(catalog.get("drills") or [])
    catalog_path.write_text(
        json.dumps(catalog, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(f"presets v{presets['version']} catalog v{catalog['version']} @ {NOW_MS}")


if __name__ == "__main__":
    main()