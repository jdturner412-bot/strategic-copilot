"""Thin wrapper around ESPN's fantasy football data.

Two data sources are used deliberately:

- `espn_api` (a maintained community library) for the one-time pre-draft
  snapshot: league scoring settings, roster slots, team names, and the
  full player pool with ESPN's season projections. It already handles
  ESPN's messy stat/scoring JSON correctly, so we lean on it there.
- A small direct HTTP poller for LIVE draft picks. `espn_api`'s own draft
  parsing intentionally ignores an in-progress draft (it's built for
  post-draft analysis), so live pick-by-pick tracking is done here
  against ESPN's `mDraftDetail` view -- the same endpoint ESPN's own
  draft room polls.
"""
from collections import defaultdict

import requests
from espn_api.football import League
from espn_api.football.constant import PLAYER_STATS_MAP

DRAFT_VIEW_URL = "https://fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{league_id}"

# espn_api translates a player's stat-breakdown keys from raw numeric stat
# IDs into human-readable names for every ID it recognizes (e.g. "3" ->
# "passingYards"), leaving only unrecognized IDs as raw numeric strings.
# League scoring settings stay keyed by the raw numeric ID, so a breakdown
# key needs to be translated back before it can be matched against them.
#
# That translation is ambiguous: PLAYER_STATS_MAP maps a handful of
# *different* stat IDs to the *same* name (e.g. both 3 and 22 -> \
# 'passingYards', both 24 and 40 -> 'rushingYards' -- see espn_api's own
# constant.py, which flags these as unexplained duplicates). Naively
# picking one ID per name is wrong whichever way it's picked. Instead,
# every candidate ID for a name is tried against *this league's* actual
# scoring settings, and whichever one the league actually scores wins.
_NAME_TO_STAT_IDS = defaultdict(list)
for _stat_id, _name in PLAYER_STATS_MAP.items():
    _NAME_TO_STAT_IDS[_name].append(str(_stat_id))


def _stat_key_to_id(key, scoring_dict: dict) -> str:
    candidates = _NAME_TO_STAT_IDS.get(key)
    if not candidates:
        return str(key)
    for candidate in candidates:
        if candidate in scoring_dict:
            return candidate
    return candidates[0]


def load_league(league_id: int, season: int, espn_s2: str, swid: str) -> League:
    return League(league_id=league_id, year=season, espn_s2=espn_s2 or None, swid=swid or None)


def get_scoring_dict(league: League) -> dict:
    """stat_id (str) -> points per unit, for this league's actual scoring rules."""
    return {str(item["id"]): item["points"] for item in league.settings.scoring_format}


def get_roster_slots(league: League) -> dict:
    return dict(league.settings.position_slot_counts)


def get_team_names(league: League) -> dict:
    return {team.team_id: (team.team_name or f"Team {team.team_id}") for team in league.teams}


def fetch_player_pool(league: League, scoring_dict: dict, size: int = 500) -> dict:
    """Snapshot the draftable player universe, keyed by playerId.

    Before the draft starts every drafted-later player is still a "free
    agent" from ESPN's point of view, so this call made once beforehand
    (or refreshed) captures the full pool. Live availability is then
    tracked locally by subtracting drafted IDs seen from the live poll,
    rather than re-querying free agents mid-draft (which can lag).
    """
    players = league.free_agents(size=size)
    pool = {}
    for p in players:
        season_stats = p.stats.get(0, {}) or {}
        breakdown = season_stats.get("projected_breakdown", {}) or {}
        custom_points = sum(
            float(v) * scoring_dict.get(_stat_key_to_id(stat_key, scoring_dict), 0.0) for stat_key, v in breakdown.items()
        )
        pool[p.playerId] = {
            "id": p.playerId,
            "name": p.name,
            "position": p.position,
            "pro_team": p.proTeam,
            "injury_status": getattr(p, "injuryStatus", "ACTIVE"),
            "percent_owned": round(getattr(p, "percent_owned", 0.0) or 0.0, 1),
            "espn_projected_points": round(p.projected_total_points or 0.0, 2),
            # None (rather than 0) when ESPN gave us no stat breakdown to
            # recompute from, so callers can fall back to espn_projected_points.
            "custom_projected_points": round(custom_points, 2) if breakdown else None,
        }
    return pool


class DraftPoller:
    """Polls ESPN's live draft-detail endpoint directly."""

    def __init__(self, league_id: int, season: int, espn_s2: str, swid: str):
        self.url = DRAFT_VIEW_URL.format(year=season, league_id=league_id)
        self.session = requests.Session()
        if espn_s2 and swid:
            self.session.cookies.update({"espn_s2": espn_s2, "SWID": swid})

    def fetch_picks(self) -> list:
        resp = self.session.get(self.url, params={"view": "mDraftDetail"}, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return data.get("draftDetail", {}).get("picks", [])
