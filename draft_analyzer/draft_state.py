"""In-memory live draft state, rebuilt from ESPN's raw pick feed each poll."""
from typing import Optional


class DraftState:
    def __init__(self, team_count: int, my_team_id: int, team_names: dict):
        self.team_count = team_count
        self.my_team_id = my_team_id
        self.team_names = team_names
        self.picks = []          # ordered list of {round, round_pick, team_id, player_id}
        self.draft_order = None  # round-1 pick order, learned once round 1 is in

    def ingest(self, raw_picks: list):
        raw_picks = sorted(raw_picks, key=lambda p: (p.get("roundId", 0), p.get("roundPickNumber", 0)))
        self.picks = [
            {
                "round": p.get("roundId"),
                "round_pick": p.get("roundPickNumber"),
                "team_id": p.get("teamId"),
                "player_id": p.get("playerId"),
            }
            for p in raw_picks
        ]
        if self.draft_order is None and len(self.picks) >= self.team_count:
            self.draft_order = [pk["team_id"] for pk in self.picks[: self.team_count]]

    @property
    def drafted_ids(self) -> set:
        return {p["player_id"] for p in self.picks if p["player_id"]}

    def team_roster_ids(self, team_id: int) -> list:
        return [p["player_id"] for p in self.picks if p["team_id"] == team_id]

    def _team_for_slot(self, overall_idx: int) -> Optional[int]:
        """overall_idx is 0-based pick number. Standard snake order."""
        if not self.draft_order:
            return None
        round_no = overall_idx // self.team_count + 1
        slot = overall_idx % self.team_count
        if round_no % 2 == 1:
            return self.draft_order[slot]
        return self.draft_order[self.team_count - 1 - slot]

    def on_the_clock(self) -> dict:
        idx = len(self.picks)
        team_id = self._team_for_slot(idx)
        return {
            "overall": idx + 1,
            "round": idx // self.team_count + 1,
            "team_id": team_id,
            "team_name": self.team_names.get(team_id, "waiting for round 1 order...") if team_id is not None else "waiting for round 1 order...",
            "is_me": team_id == self.my_team_id,
        }

    def picks_until_me(self) -> Optional[int]:
        if not self.draft_order or self.my_team_id not in self.draft_order:
            return None
        idx = len(self.picks)
        for lookahead in range(0, self.team_count * 2 + 1):
            if self._team_for_slot(idx + lookahead) == self.my_team_id:
                return lookahead
        return None
