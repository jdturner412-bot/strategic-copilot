"""Live NFL fantasy draft dashboard.

Polls ESPN in a background thread for picks as they happen, recomputes
best-available rankings under YOUR league's scoring, and serves a
localhost dashboard to keep open next to your ESPN draft room.

Run with: python server.py
"""
import threading
import time

from flask import Flask, jsonify

import config
from espn_client import load_league, get_scoring_dict, get_roster_slots, get_team_names, fetch_player_pool, DraftPoller
from valuation import compute_rankings
from draft_state import DraftState
from recommender import recommend

app = Flask(__name__)
_lock = threading.Lock()
_state = {"ready": False, "error": None}


def _build_context():
    league = load_league(config.LEAGUE_ID, config.SEASON, config.ESPN_S2, config.ESPN_SWID)
    scoring_dict = get_scoring_dict(league)
    roster_slots = get_roster_slots(league)
    team_names = get_team_names(league)
    player_pool = fetch_player_pool(league, scoring_dict, size=config.DRAFT_POOL_SIZE)
    poller = DraftPoller(config.LEAGUE_ID, config.SEASON, config.ESPN_S2, config.ESPN_SWID)
    draft = DraftState(team_count=league.settings.team_count, my_team_id=config.MY_TEAM_ID, team_names=team_names)
    return {
        "league": league,
        "roster_slots": roster_slots,
        "team_names": team_names,
        "player_pool": player_pool,
        "poller": poller,
        "draft": draft,
    }


def _poll_loop():
    global _state
    try:
        ctx = _build_context()
    except Exception as exc:  # noqa: BLE001 -- surfaced to the dashboard, not swallowed
        with _lock:
            _state = {"ready": False, "error": f"Startup failed: {exc}"}
        return

    while True:
        try:
            raw_picks = ctx["poller"].fetch_picks()
            ctx["draft"].ingest(raw_picks)

            drafted_ids = ctx["draft"].drafted_ids
            ranked = compute_rankings(ctx["player_pool"], drafted_ids, ctx["roster_slots"], ctx["league"].settings.team_count)
            my_players = [ctx["player_pool"][pid] for pid in ctx["draft"].team_roster_ids(config.MY_TEAM_ID) if pid in ctx["player_pool"]]
            recent_raw = ctx["draft"].picks[-8:]
            recent_players = [ctx["player_pool"][p["player_id"]] for p in recent_raw if p["player_id"] in ctx["player_pool"]]
            recs = recommend(ranked, my_players, ctx["roster_slots"], recent_players)

            new_state = {
                "ready": True,
                "error": None,
                "on_the_clock": ctx["draft"].on_the_clock(),
                "picks_until_me": ctx["draft"].picks_until_me(),
                "my_team_id": config.MY_TEAM_ID,
                "my_roster": my_players,
                "recommendations": recs,
                "recent_picks": [
                    {
                        "team": ctx["team_names"].get(p["team_id"], str(p["team_id"])),
                        "player": ctx["player_pool"].get(p["player_id"], {}).get("name", "Unknown"),
                        "position": ctx["player_pool"].get(p["player_id"], {}).get("position", ""),
                    }
                    for p in reversed(recent_raw)
                ],
                "total_picks": len(ctx["draft"].picks),
                "undrafted_count": len(ctx["player_pool"]) - len(drafted_ids),
            }
            with _lock:
                _state = new_state
        except Exception as exc:  # noqa: BLE001 -- keep polling; surface the error, don't crash the loop
            with _lock:
                _state["error"] = str(exc)
        time.sleep(config.POLL_SECONDS)


@app.route("/api/state")
def api_state():
    with _lock:
        return jsonify(_state)


@app.route("/")
def index():
    return DASHBOARD_HTML


DASHBOARD_HTML = """<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Draft Analyzer</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 20px;
    background: #0f1115; color: #e6e8ec;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  h1 { font-size: 18px; margin: 0 0 4px; color: #9aa4b2; font-weight: 600; letter-spacing: 0.02em; }
  .top {
    display: flex; gap: 16px; flex-wrap: wrap; align-items: stretch;
    margin-bottom: 20px;
  }
  .card {
    background: #171a21; border: 1px solid #262b36; border-radius: 10px;
    padding: 14px 18px; flex: 1; min-width: 200px;
  }
  .card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #8892a0; margin-bottom: 6px; }
  .card .value { font-size: 22px; font-weight: 700; }
  .value.me { color: #4ade80; }
  .value.warn { color: #fbbf24; }
  .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; align-items: start; }
  @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; color: #8892a0; padding: 6px 8px; border-bottom: 1px solid #262b36; }
  td { padding: 8px; border-bottom: 1px solid #1c2028; vertical-align: top; }
  tr:hover td { background: #1a1e26; }
  .pos { display: inline-block; padding: 1px 7px; border-radius: 5px; font-size: 11px; font-weight: 700; }
  .pos-QB { background: #3730a3; }
  .pos-RB { background: #166534; }
  .pos-WR { background: #1e40af; }
  .pos-TE { background: #92400e; }
  .pos-K  { background: #4b5563; }
  .pos-DST, .pos-D-ST { background: #6b21a8; }
  .name { font-weight: 600; }
  .meta { color: #8892a0; font-size: 12px; }
  .reasons { color: #9aa4b2; font-size: 12px; margin-top: 2px; }
  .vor { font-weight: 700; color: #4ade80; }
  .section-title { font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: #8892a0; margin: 0 0 10px; }
  .error { background: #3f1d1d; border: 1px solid #7f1d1d; color: #fca5a5; padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; }
  .injured { color: #f87171; font-size: 11px; }
  #loading { color: #8892a0; padding: 40px; text-align: center; }
</style>
</head>
<body>
<div id="loading">Connecting to your league...</div>
<div id="app" style="display:none">
  <div class="top">
    <div class="card"><div class="label">On the clock</div><div class="value" id="clock">-</div></div>
    <div class="card"><div class="label">Picks until you</div><div class="value" id="untilMe">-</div></div>
    <div class="card"><div class="label">Overall pick</div><div class="value" id="overall">-</div></div>
    <div class="card"><div class="label">Players available</div><div class="value" id="avail">-</div></div>
  </div>
  <div id="errBox"></div>
  <div class="grid">
    <div>
      <p class="section-title">Best available (ranked for your scoring)</p>
      <table>
        <thead><tr><th>Player</th><th>Proj pts</th><th>VOR</th><th>Why</th></tr></thead>
        <tbody id="recs"></tbody>
      </table>
    </div>
    <div>
      <p class="section-title">Your roster</p>
      <table>
        <thead><tr><th>Player</th><th>Pos</th></tr></thead>
        <tbody id="roster"></tbody>
      </table>
      <p class="section-title" style="margin-top:20px">Recent picks</p>
      <table>
        <tbody id="recent"></tbody>
      </table>
    </div>
  </div>
</div>
<script>
function posClass(pos) { return "pos pos-" + (pos || "").replace("/", "-"); }

async function tick() {
  try {
    const res = await fetch("/api/state");
    const s = await res.json();
    if (!s.ready) {
      document.getElementById("loading").textContent = s.error ? ("Error: " + s.error) : "Connecting to your league...";
      return;
    }
    document.getElementById("loading").style.display = "none";
    document.getElementById("app").style.display = "block";

    const errBox = document.getElementById("errBox");
    errBox.innerHTML = s.error ? ('<div class="error">' + s.error + '</div>') : "";

    const clock = s.on_the_clock;
    const clockEl = document.getElementById("clock");
    clockEl.textContent = clock.is_me ? "YOU!" : clock.team_name;
    clockEl.className = "value " + (clock.is_me ? "me" : "");

    const untilEl = document.getElementById("untilMe");
    untilEl.textContent = s.picks_until_me === null ? "-" : (s.picks_until_me === 0 ? "YOU'RE UP" : s.picks_until_me);
    untilEl.className = "value " + (s.picks_until_me !== null && s.picks_until_me <= 1 ? "warn" : "");

    document.getElementById("overall").textContent = "#" + clock.overall + " (Rd " + clock.round + ")";
    document.getElementById("avail").textContent = s.undrafted_count;

    document.getElementById("recs").innerHTML = s.recommendations.map(p => `
      <tr>
        <td><span class="${posClass(p.position)}">${p.position}</span> <span class="name">${p.name}</span>
            <div class="meta">${p.pro_team}${p.injury_status && p.injury_status !== "ACTIVE" ? ' <span class="injured">' + p.injury_status + '</span>' : ""}</div>
        </td>
        <td>${p.projected_points.toFixed(1)}</td>
        <td class="vor">+${p.value_over_replacement.toFixed(1)}</td>
        <td class="reasons">${p.reasons.join(" · ")}</td>
      </tr>`).join("");

    document.getElementById("roster").innerHTML = s.my_roster.map(p => `
      <tr><td class="name">${p.name}</td><td><span class="${posClass(p.position)}">${p.position}</span></td></tr>
    `).join("") || '<tr><td class="meta">No picks yet</td></tr>';

    document.getElementById("recent").innerHTML = s.recent_picks.map(p => `
      <tr><td><span class="${posClass(p.position)}">${p.position}</span> ${p.player} <span class="meta">— ${p.team}</span></td></tr>
    `).join("") || '<tr><td class="meta">No picks yet</td></tr>';
  } catch (e) {
    console.error(e);
  }
}
tick();
setInterval(tick, 3000);
</script>
</body>
</html>
"""

if __name__ == "__main__":
    threading.Thread(target=_poll_loop, daemon=True).start()
    print(f"Draft dashboard starting at http://127.0.0.1:{config.PORT}")
    app.run(host="127.0.0.1", port=config.PORT, debug=False)
