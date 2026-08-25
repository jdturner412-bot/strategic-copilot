"""Loads and validates .env configuration for the draft analyzer."""
import os
import sys

from dotenv import load_dotenv

load_dotenv()


def _require(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        sys.exit(
            f"Missing required setting: {name}\n"
            f"Set it in draft_analyzer/.env -- see draft_analyzer/README.md for how to find it."
        )
    return value


LEAGUE_ID = int(_require("ESPN_LEAGUE_ID"))
MY_TEAM_ID = int(_require("MY_TEAM_ID"))
SEASON = int(os.environ.get("ESPN_SEASON", "2026"))
ESPN_S2 = os.environ.get("ESPN_S2", "").strip()
ESPN_SWID = os.environ.get("ESPN_SWID", "").strip()
POLL_SECONDS = float(os.environ.get("POLL_SECONDS", "4"))
DRAFT_POOL_SIZE = int(os.environ.get("DRAFT_POOL_SIZE", "500"))
PORT = int(os.environ.get("PORT", "5050"))
