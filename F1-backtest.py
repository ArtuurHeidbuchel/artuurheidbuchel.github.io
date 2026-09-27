#!/usr/bin/env python3
"""
Backtests the F1 prediction model (see predictions.html) against every
completed race in the current season, using only data that existed
before each race — same weights, same ranking logic, ported from the
client-side JS so the two stay in sync.

Writes data/f1-accuracy.json with per-race results and aggregate stats,
plus a naive "standings-only" baseline for context.

Stdlib only (urllib), so no extra dependencies in the Actions runner.
"""

import json
import os
import time
import traceback
import urllib.request
import urllib.error
from datetime import datetime, timezone

API = "https://api.jolpi.ca/ergast/f1"
OUTPUT_PATH = os.path.join("data", "f1-accuracy.json")  # relative to repo root
SLEEP_SECONDS = 0.4  # stay comfortably under the API's burst limit

# Keep this identical to the WEIGHTS object in predictions.html.
WEIGHTS = {
    "recentForm": 0.35,
    "standings": 0.30,
    "team": 0.20,
    "track": 0.15,
}


def get_json(url, retries=5):
    req = urllib.request.Request(url, headers={"User-Agent": "f1-predictor-backtest/1.0 (+github-actions)"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if attempt == retries - 1:
                raise
            if e.code == 429:
                # Rate-limited — back off much longer, and honor Retry-After if given.
                wait = int(e.headers.get("Retry-After", 8)) if e.headers else 8
                print(f"Rate limited on {url}, waiting {wait}s (attempt {attempt + 1}/{retries})")
                time.sleep(wait)
            else:
                time.sleep(1 + attempt)
        except urllib.error.URLError:
            if attempt == retries - 1:
                raise
            time.sleep(1 + attempt)
    raise RuntimeError("unreachable")


def rank_to_unit(values, ids, fallback=0.5):
    """0 (best) .. 1 (worst) rank-based score. Missing ids get `fallback`."""
    present = [i for i in ids if i in values]
    ordered = sorted(present, key=lambda i: values[i])
    unit = {}
    for i in ids:
        if i not in values:
            unit[i] = fallback
            continue
        rank = ordered.index(i)
        unit[i] = rank / (len(present) - 1) if len(present) > 1 else 0.5
    return unit


def avg_finish_from_results(races_results):
    """races_results: list of Ergast/Jolpica `Results` arrays. Returns avg finish per driverId."""
    sums, counts = {}, {}
    for results in races_results:
        for res in results:
            did = res["Driver"]["driverId"]
            finish = int(res.get("position") or 20)
            sums[did] = sums.get(did, 0) + finish
            counts[did] = counts.get(did, 0) + 1
    return {did: sums[did] / counts[did] for did in sums}


def get_recent_form(year, prior_rounds):
    last5 = prior_rounds[-5:]
    all_results = []
    for rnd in last5:
        data = get_json(f"{API}/{year}/{rnd}/results.json")
        races = data.get("MRData", {}).get("RaceTable", {}).get("Races", [])
        if races:
            all_results.append(races[0]["Results"])
        time.sleep(SLEEP_SECONDS)
    return avg_finish_from_results(all_results)


def get_track_history(circuit_id, year):
    all_results = []
    found = 0
    for y in (year - 1, year - 2, year - 3):
        try:
            data = get_json(f"{API}/{y}/circuits/{circuit_id}/results.json?limit=40")
            races = data.get("MRData", {}).get("RaceTable", {}).get("Races", [])
            if races:
                found += 1
                all_results.append(races[0]["Results"])
        except Exception:
            pass
        time.sleep(SLEEP_SECONDS)
    return avg_finish_from_results(all_results), found > 0


def get_standings_before(year, round_number):
    """Standings as they stood immediately before `round_number`. Empty for round 1."""
    if round_number <= 1:
        return {}, {}
    driver_data = get_json(f"{API}/{year}/{round_number - 1}/driverStandings.json")
    constructor_data = get_json(f"{API}/{year}/{round_number - 1}/constructorStandings.json")
    time.sleep(SLEEP_SECONDS)
    driver_rank = {}
    constructor_of = {}
    # The list is already returned in standing order, so use that order as the
    # rank rather than trusting a "position" field — Jolpica doesn't always
    # populate it the same way Ergast did (e.g. on tied points).
    driver_list = driver_data["MRData"]["StandingsTable"]["StandingsLists"][0]["DriverStandings"]
    for rank, d in enumerate(driver_list, start=1):
        driver_rank[d["Driver"]["driverId"]] = int(d.get("position", rank))
        constructor_of[d["Driver"]["driverId"]] = d["Constructors"][0]["constructorId"]

    constructor_rank = {}
    constructor_list = constructor_data["MRData"]["StandingsTable"]["StandingsLists"][0]["ConstructorStandings"]
    for rank, c in enumerate(constructor_list, start=1):
        constructor_rank[c["Constructor"]["constructorId"]] = int(c.get("position", rank))

    team_rank = {did: constructor_rank.get(cid, 99) for did, cid in constructor_of.items()}
    return driver_rank, team_rank


def predict_order(driver_ids, recent_form, driver_rank, team_rank, track_avg, has_track_history):
    u_form = rank_to_unit(recent_form, driver_ids)
    u_standings = rank_to_unit(driver_rank, driver_ids)
    u_team = rank_to_unit(team_rank, driver_ids)
    u_track = rank_to_unit(track_avg, driver_ids) if has_track_history else None

    w = dict(WEIGHTS)
    if u_track is None:
        extra = w["track"] / 3
        w["recentForm"] += extra
        w["standings"] += extra
        w["team"] += extra
        w["track"] = 0

    scores = {}
    for did in driver_ids:
        scores[did] = (
            u_form[did] * w["recentForm"]
            + u_standings[did] * w["standings"]
            + u_team[did] * w["team"]
            + (u_track[did] * w["track"] if u_track else 0)
        )
    return sorted(driver_ids, key=lambda d: scores[d])


def baseline_order(driver_ids, driver_rank):
    """Naive baseline: just guess the pre-race championship order. No info -> input order."""
    if not driver_rank:
        return list(driver_ids)
    return sorted(driver_ids, key=lambda d: driver_rank.get(d, 99))


def score_prediction(predicted, actual):
    pred_rank = {d: i for i, d in enumerate(predicted)}
    act_rank = {d: i for i, d in enumerate(actual)}
    common = [d for d in predicted if d in act_rank]
    winner_hit = bool(common) and predicted[0] == actual[0]
    pred_top3 = set(predicted[:3])
    act_top3 = set(actual[:3])
    podium_overlap = len(pred_top3 & act_top3)
    if common:
        avg_rank_error = sum(abs(pred_rank[d] - act_rank[d]) for d in common) / len(common)
    else:
        avg_rank_error = None
    return winner_hit, podium_overlap, avg_rank_error


def main():
    now = datetime.now(timezone.utc)
    year = now.year

    schedule = get_json(f"{API}/{year}/races.json?limit=100")
    races = schedule["MRData"]["RaceTable"]["Races"]
    today = now.date()
    completed = [r for r in races if datetime.fromisoformat(r["date"]).date() < today]

    per_race = []
    model_hits, model_podiums, model_errors = [], [], []
    base_hits, base_podiums, base_errors = [], [], []

    for race in completed:
        round_number = int(race["round"])
        try:
            prior_rounds = [int(r["round"]) for r in completed if int(r["round"]) < round_number]

            actual_data = get_json(f"{API}/{year}/{round_number}/results.json")
            actual_races = actual_data["MRData"]["RaceTable"]["Races"]
            if not actual_races:
                continue
            actual_results = actual_races[0]["Results"]
            driver_ids = [r["Driver"]["driverId"] for r in actual_results]
            driver_names = {r["Driver"]["driverId"]: f"{r['Driver']['givenName']} {r['Driver']['familyName']}" for r in actual_results}
            actual_order = sorted(driver_ids, key=lambda d: int(next(r["position"] for r in actual_results if r["Driver"]["driverId"] == d) or 20))
            time.sleep(SLEEP_SECONDS)

            recent_form = get_recent_form(year, prior_rounds) if prior_rounds else {}
            driver_rank, team_rank = get_standings_before(year, round_number)
            track_avg, has_track_history = get_track_history(race["Circuit"]["circuitId"], year)

            predicted = predict_order(driver_ids, recent_form, driver_rank, team_rank, track_avg, has_track_history)
            baseline = baseline_order(driver_ids, driver_rank)

            m_hit, m_pod, m_err = score_prediction(predicted, actual_order)
            b_hit, b_pod, b_err = score_prediction(baseline, actual_order)

            model_hits.append(m_hit); model_podiums.append(m_pod)
            if m_err is not None: model_errors.append(m_err)
            base_hits.append(b_hit); base_podiums.append(b_pod)
            if b_err is not None: base_errors.append(b_err)

            per_race.append({
                "round": round_number,
                "race_name": race["raceName"],
                "date": race["date"],
                "predicted_winner": driver_names.get(predicted[0], predicted[0]),
                "actual_winner": driver_names.get(actual_order[0], actual_order[0]),
                "winner_hit": m_hit,
                "podium_overlap": m_pod,
                "avg_rank_error": round(m_err, 2) if m_err is not None else None,
            })
        except Exception as e:

            print(f"Skipping round {round_number} ({race.get('raceName')}): {e}")
            traceback.print_exc()
            continue

    def pct(values):
        return round(100 * sum(1 for v in values if v) / len(values), 1) if values else None

    def avg(values):
        return round(sum(values) / len(values), 2) if values else None

    output = {
        "generated_at": now.isoformat(timespec="seconds"),
        "season": year,
        "races_evaluated": len(per_race),
        "weights": WEIGHTS,
        "model": {
            "winner_hit_rate": pct(model_hits),
            "podium_precision": round(100 * avg(model_podiums) / 3, 1) if model_podiums else None,
            "avg_rank_error": avg(model_errors),
        },
        "baseline_standings_only": {
            "winner_hit_rate": pct(base_hits),
            "podium_precision": round(100 * avg(base_podiums) / 3, 1) if base_podiums else None,
            "avg_rank_error": avg(base_errors),
        },
        "races": per_race,
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)
    print(f"Wrote {OUTPUT_PATH}: {len(per_race)} races evaluated")


if __name__ == "__main__":
    main()