"""Value-over-replacement ranking, computed from *your* league's scoring.

Replacement level is recomputed from the currently-available pool on every
poll (not a fixed preseason baseline) -- as a position gets drafted out,
the "last starter available" bar rises, which is what should drive urgency
during a live draft.
"""
from collections import defaultdict

FLEX_DEFAULT_POOL = ("RB", "WR", "TE")
BENCH_LIKE = {"BE", "BENCH", "IR"}
BASE_POSITIONS = {"QB", "RB", "WR", "TE", "K", "D/ST", "DST"}


def _flex_positions_from_label(label: str) -> tuple:
    label_up = label.upper()
    hits = tuple(pos for pos in BASE_POSITIONS if pos in label_up)
    return hits or FLEX_DEFAULT_POOL


def starters_by_position(roster_slots: dict, team_count: int) -> dict:
    """Approximate league-wide starter demand per real position, folding
    shared FLEX-type slots into their eligible positions. ESPN's API only
    exposes slot *counts*, not how a flex slot actually gets used across a
    league, so flex demand is split evenly across its eligible positions --
    a heuristic, not an observed fact.
    """
    per_team = defaultdict(float)
    flex_slots = []
    for label, count in roster_slots.items():
        if not count:
            continue
        label_up = label.upper()
        if label_up in BENCH_LIKE:
            continue
        if label_up in BASE_POSITIONS:
            per_team[label_up] += count
        else:
            flex_slots.append((label, count))

    for label, count in flex_slots:
        eligible = _flex_positions_from_label(label)
        share = count / len(eligible)
        for pos in eligible:
            per_team[pos] += share

    return {pos: max(1, round(n * team_count)) for pos, n in per_team.items()}


def _best_available_points(p: dict) -> float:
    return p["custom_projected_points"] if p["custom_projected_points"] is not None else p["espn_projected_points"]


def compute_rankings(player_pool: dict, drafted_ids: set, roster_slots: dict, team_count: int) -> list:
    available = {pid: p for pid, p in player_pool.items() if pid not in drafted_ids}
    replacement_rank = starters_by_position(roster_slots, team_count)

    by_pos = defaultdict(list)
    for p in available.values():
        by_pos[p["position"]].append((_best_available_points(p), p))

    replacement_value = {}
    for pos, entries in by_pos.items():
        entries.sort(key=lambda t: t[0], reverse=True)
        rank = replacement_rank.get(pos, team_count)
        idx = min(rank, len(entries) - 1)
        replacement_value[pos] = entries[idx][0]

    ranked = []
    for p in available.values():
        pts = _best_available_points(p)
        vor = pts - replacement_value.get(p["position"], 0.0)
        ranked.append({**p, "projected_points": round(pts, 2), "value_over_replacement": round(vor, 2)})

    ranked.sort(key=lambda p: p["value_over_replacement"], reverse=True)

    # Crude tiering: start a new tier whenever there's a sizeable point
    # drop-off to the next-best player at large. Makes "the good ones at
    # this spot are drying up" visible at a glance.
    tier = 1
    for i, p in enumerate(ranked):
        if i > 0:
            gap = ranked[i - 1]["value_over_replacement"] - p["value_over_replacement"]
            if gap > 3.0:
                tier += 1
        p["tier"] = tier

    return ranked
