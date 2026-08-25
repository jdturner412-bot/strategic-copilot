# Fantasy Football Draft Analyzer

A live dashboard for your ESPN Fantasy Football draft. It polls ESPN the same
way ESPN's own draft room does, tracks every pick as it happens, and ranks
who's still available using **your league's actual scoring settings** — not
generic rankings.

It runs on your own machine and only talks to ESPN's API with your own
cookies. No data leaves your computer.

**What it does:**
- Watches your live draft and knows who's been picked, in real time
- Recomputes every available player's projected points under your league's
  custom scoring (PPR, TE premium, negative points for INTs, whatever you run)
- Ranks by value over replacement (VOR) — not just raw points, but how much
  better a player is than what you could get later at the same position
- Groups players into tiers so you can see when a position's talent is about
  to fall off a cliff
- Tracks your own roster and open starting slots, and flags picks that fill
  a real need vs. picks that would just be a bench stash
- Warns when a position is getting drafted in a run

**What it doesn't do (yet):** auction drafts (budget/bid tracking) — this is
built for standard snake drafts. It also can't draft *for* you — ESPN
doesn't expose a way to submit picks through this API, so you'll still click
your pick in ESPN's draft room; this just tells you who to click.

---

## Before your draft: one-time setup (~10 minutes)

### 1. Install dependencies

```bash
cd draft_analyzer
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Find your league ID

Open your league on [fantasy.espn.com](https://fantasy.espn.com) and look at
the URL:

```
https://fantasy.espn.com/football/league?leagueId=123456
                                                    ^^^^^^ this
```

### 3. Find your team ID

Go to **your team's** page and check the URL:

```
https://fantasy.espn.com/football/team?leagueId=123456&teamId=7
                                                          ^ this
```

### 4. Get your ESPN cookies (private leagues only)

Most leagues are private, so ESPN needs proof you're logged in. Two cookies
do that — `espn_s2` and `SWID`. **Treat them like a password**: anyone with
them can act as you on ESPN. Don't commit them, don't share them.

**Chrome / Edge / Brave:**
1. Log into [fantasy.espn.com](https://fantasy.espn.com) and open your league
2. Open DevTools (F12 or right-click → Inspect) → **Application** tab →
   **Cookies** → `https://fantasy.espn.com`
3. Find the row named `espn_s2` — copy its **Value** (a long string)
4. Find the row named `SWID` — copy its **Value** (looks like
   `{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}`, curly braces included)

**Firefox:** same idea under DevTools → **Storage** → **Cookies**.

If your league is public, you can leave these blank.

### 5. Configure

```bash
cp .env.example .env
```

Open `.env` and fill in `ESPN_LEAGUE_ID`, `MY_TEAM_ID`, and (if private)
`ESPN_S2` / `ESPN_SWID`. `ESPN_SEASON` should already be right.

### 6. Do a dry run before draft day

Start it any time before your draft (even weeks ahead) to confirm it
connects:

```bash
python server.py
```

Then open **http://127.0.0.1:5050** in your browser. If your league's
scoring, roster settings, and your team's picks (once the draft starts)
show up correctly, you're set. Leave the tab closed until draft day — no
need to leave it running.

---

## On draft day

1. Open your ESPN live draft room as usual, in one tab
2. In `draft_analyzer/`, run `python server.py` (activate the venv first if
   it's a new terminal: `source venv/bin/activate`)
3. Open **http://127.0.0.1:5050** in another tab and keep it visible
   alongside the draft room
4. It refreshes itself every few seconds. When a pick happens in ESPN, it
   shows up here shortly after — no need to refresh or click anything

The dashboard shows, at a glance:
- **On the clock** — whose turn it is, and how many picks until yours
- **Best available**, ranked for your scoring, with a short reason for each
  (fills a starting need, tier is about to end, etc.)
- **Your roster** and what's already filled
- **Recent picks**, so you can see runs on a position forming

---

## How the ranking actually works

**Custom scoring.** ESPN gives every player a season projection broken down
stat-by-stat (passing yards, receptions, rushing TDs, etc). This tool takes
that same stat-by-stat projection and re-scores it using your league's exact
point values, pulled live from your league's settings — so a full-PPR league
and a standard league will rank the same players differently, correctly.

**Value over replacement (VOR).** A player's raw projected points aren't
that useful on their own — a QB projected for 320 points and a TE projected
for 150 points aren't directly comparable, because QBs score more than TEs
across the board. VOR instead measures how much better a player is than the
last starter-quality player left at their position (recalculated live as
players get drafted). That's what's actually scarce, and what the rankings
sort by.

**Tiers.** Within a position, a "tier" break is drawn wherever there's a
noticeably bigger point gap to the next-best player than the gaps around it.
It's a simple heuristic, not a scouting judgment — but it's useful for
spotting "if I don't take a WR in the next two picks, this tier is gone."

**FLEX slots.** ESPN's API tells us how many FLEX-type slots your league
has, but not how they actually tend to get used. This tool splits FLEX
demand evenly across its eligible positions (usually RB/WR/TE) to estimate
replacement level. It's a reasonable approximation, not an exact one.

---

## Troubleshooting

**"Missing required setting" on startup** — `.env` is missing
`ESPN_LEAGUE_ID` or `MY_TEAM_ID`. Fill them in (see steps 2–3 above).

**"Startup failed" with a 401 or 403 in the dashboard** — your `ESPN_S2` /
`ESPN_SWID` cookies are missing, expired, or wrong. Log into ESPN again and
re-copy them (step 4). Cookies can expire after a few weeks.

**Dashboard loads but "On the clock" never changes / no picks show up** —
double check `ESPN_LEAGUE_ID` and `ESPN_SEASON` match the league you're
actually drafting in, and that the draft has actually started in ESPN.

**Custom projected points look identical to a plain PPR ranking** — some
positions (especially K and D/ST) don't get a full stat breakdown from ESPN
ahead of time, so this tool falls back to ESPN's own projection for those.
Everything with a real stat breakdown (QB/RB/WR/TE) uses your league's exact
scoring.

**It feels slow to update** — `POLL_SECONDS` in `.env` controls how often it
checks ESPN (default 4s). Don't set this too low — it's polling ESPN's
public site, not a documented/rate-limit-friendly API, so keep it reasonable
(2s or higher) to avoid getting temporarily throttled mid-draft.

---

## A note on how this connects to ESPN

ESPN doesn't publish an official, supported API for fantasy football. This
tool uses the same undocumented endpoints ESPN's own website calls (for
league settings, player projections, and live draft picks), the way most
community fantasy tools do. That means:

- It can break if ESPN changes their site's internals — if that happens,
  open an issue or ask for a fix with the exact error message
- It's for your own personal use against your own league — don't hammer it
  with a very low `POLL_SECONDS`, and don't share your `.env` (your cookies
  are tied to your ESPN login)

---

*Built with Claude Code.*
