"""Turns raw value-over-replacement rankings into an explainable,
need-aware recommendation list for the person actually drafting."""
from collections import Counter
from typing import Optional

from valuation import BASE_POSITIONS


def roster_needs(my_players: list, roster_slots: dict) -> dict:
    have = Counter(p["position"] for p in my_players)
    needs = {}
    for pos in BASE_POSITIONS:
        want = roster_slots.get(pos, 0)
        needs[pos] = max(0, want - have.get(pos, 0))
    flex_want = sum(
        count for label, count in roster_slots.items()
        if label.upper() not in BASE_POSITIONS and label.upper() not in ("BE", "BENCH", "IR") and count
    )
    needs["FLEX"] = flex_want
    return needs


def recent_position_run(recent_picks: list, window: int = 5) -> Optional[str]:
    if len(recent_picks) < 3:
        return None
    last = [p["position"] for p in recent_picks[-window:]]
    pos, count = Counter(last).most_common(1)[0]
    return pos if count >= 3 else None


def recommend(ranked_available: list, my_players: list, roster_slots: dict, recent_picks: list, top_n: int = 15) -> list:
    needs = roster_needs(my_players, roster_slots)
    run_position = recent_position_run(recent_picks)

    out = []
    for p in ranked_available[: max(top_n * 4, 40)]:
        reasons = []
        pos = p["position"]
        if needs.get(pos, 0) > 0:
            reasons.append(f"fills an open starting {pos} slot")
        elif pos in ("RB", "WR", "TE") and needs.get("FLEX", 0) > 0:
            reasons.append("eligible for your open FLEX slot")
        else:
            reasons.append("bench/depth stash at this point")
        if run_position == pos:
            reasons.append(f"{pos}s are running off the board fast — tier may not last")
        reasons.append(f"tier {p['tier']}, +{p['value_over_replacement']:.1f} pts over replacement")
        out.append({**p, "reasons": reasons})

    out.sort(key=lambda p: p["value_over_replacement"], reverse=True)
    return out[:top_n]
