# Tabata Core Drills — template guide

## North star

**Train correctly, don’t burn out.** Shipped and catalog templates are **starting points**. Athletes shorten rest or add sets in the app when they want more.

- Work should be **less than** rest between stations when a set rotates **2+ exercises** (Tabata 20/10 rounds are the exception; recovery comes from **set** rest).
- Avoid marketing copy that pushes all-out, max HR, redline, or “empty the tank” on **shipsWithApp** presets.

## Rest tiers (defaults for new plans)

| Tier | Use | Work | Round rest | Set rest |
|------|-----|------|------------|----------|
| Gym | Machines, dumbbells, KB category, Hyrox | 30 | 60 | 80 |
| Bodyweight category | Multi-move floor circuits | 30 | 60 | 75 |
| Shipped strength | `*_40` presets | 40 | 50–55 | 90–100 |
| Tabata (template) | Classic / bodyweight / power | 20 | 10 | 180–240 between sets |

**Reference bodyweight combo:** `remote_full_bw` (30 / 60 / 75, 4 sets).

## Intensity bands

- **A — Skill / strength:** Multiple sets, work ≤ rest, moderate set rest (shipped `*_40` family).
- **B — Conditioning:** Warmup on; generous set rest; copy stresses repeatable effort.
- **C — Tabata-style:** 20/10 rounds, **3+ sets** (2 for plyo Tabata Power), long set rest, warmup + cooldown on.

## shipsWithApp vs catalog

- **shipsWithApp:** Conservative, welcoming, session-shaped defaults only.
- **Catalog-only:** May include harder Hyrox-style or advanced Tabata single-round plans when explicitly labeled.

## Maintainer tools

```bash
python tool/audit_plan_rest.py
python tool/apply_plan_rest.py   # batch gym/BW/tabata tiers (see script lists)
```