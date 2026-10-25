#!/usr/bin/env python3
"""Create a compact, theme-balanced Lichess puzzle sample for Ata Wawé.

Usage (Python 3.14+):
  python scripts/import_lichess_puzzles.py path/to/lichess_db_puzzle.csv.zst

The Lichess puzzle database is released under CC0. This importer streams the
compressed CSV and writes only a small deterministic sample to the app folder.
"""
import argparse
import csv
import json
import random
from collections import Counter
from pathlib import Path

from compression.zstd import open as zstd_open


THEMES = (
    # Phases and endgames
    "opening", "middlegame", "endgame", "rookEndgame", "bishopEndgame",
    "pawnEndgame", "knightEndgame", "queenEndgame", "queenRookEndgame",
    # Tactical motifs
    "advancedPawn", "attackingF2F7", "capturingDefender", "discoveredAttack",
    "doubleCheck", "exposedKing", "fork", "hangingPiece", "kingsideAttack",
    "pin", "queensideAttack", "sacrifice", "skewer", "trappedPiece",
    # Advanced tactics
    "attraction", "clearance", "defensiveMove", "deflection", "interference",
    "intermezzo", "quietMove", "xRayAttack", "zugzwang",
    # Checkmates and named mate patterns
    "mate", "mateIn1", "mateIn2", "mateIn3", "mateIn4", "mateIn5",
    "anastasiaMate", "arabianMate", "backRankMate", "bodenMate",
    "doubleBishopMate", "dovetailMate", "hookMate", "smotheredMate",
    # Special moves and puzzle goals
    "castling", "enPassant", "promotion", "underPromotion", "equality",
    "advantage", "crushing",
)
RATING_BUCKETS = ((0, 999), (1000, 1299), (1300, 1599), (1600, 1899),
                  (1900, 2199), (2200, 2499), (2500, 9999))
PER_BUCKET = 6
SEED = 20261025


def bucket_for(rating):
    for index, (_, upper) in enumerate(RATING_BUCKETS):
        if rating <= upper:
            return index
    return len(RATING_BUCKETS) - 1


def app_level(rating):
    # Map Lichess ratings to the app's 1–9 gradual difficulty scale.
    bounds = (800, 1000, 1200, 1450, 1700, 1950, 2200, 2500)
    return 1 + sum(rating >= bound for bound in bounds)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="lichess_db_puzzle.csv.zst")
    parser.add_argument("--output", type=Path, default=Path("lichess_puzzles.js"))
    parser.add_argument("--per-theme", type=int, default=42,
                        help="Maximum sample size per theme (default: 42)")
    args = parser.parse_args()
    if args.per_theme < 1:
        parser.error("--per-theme must be positive")

    rng = random.Random(SEED)
    reservoirs = {theme: [[] for _ in RATING_BUCKETS] for theme in THEMES}
    seen = Counter()
    scanned = 0
    with zstd_open(args.source, "rt", encoding="utf-8", newline="") as stream:
        reader = csv.DictReader(stream)
        required = {"PuzzleId", "FEN", "Moves", "Rating", "Themes"}
        if not reader.fieldnames or not required.issubset(reader.fieldnames):
            raise ValueError("Unexpected Lichess CSV columns")
        for row in reader:
            scanned += 1
            tags = set(row["Themes"].split())
            selected = tags.intersection(THEMES)
            if not selected:
                continue
            rating = int(row["Rating"])
            bucket = bucket_for(rating)
            puzzle = {
                "id": row["PuzzleId"], "fen": row["FEN"],
                "moves": row["Moves"].split(), "themes": sorted(tags),
                "rating": app_level(rating), "sourceRating": rating,
            }
            for theme in selected:
                seen[theme] += 1
                reservoir_counts[(theme, bucket)] += 1
                sample = reservoirs[theme][bucket]
                if len(sample) < PER_BUCKET:
                    sample.append(puzzle)
                else:
                    index = rng.randrange(reservoir_counts[(theme, bucket)])
                    if index < PER_BUCKET:
                        sample[index] = puzzle

    chosen = {}
    for theme in THEMES:
        candidates = [p for sample in reservoirs[theme] for p in sample]
        rng.shuffle(candidates)
        for puzzle in candidates[:args.per_theme]:
            chosen[puzzle["id"]] = puzzle
    ordered = sorted(chosen.values(), key=lambda puzzle: puzzle["id"])
    args.output.write_text(
        "/* Lichess puzzle database sample; CC0: https://database.lichess.org/#puzzles */\n"
        "window.LICHESS_PUZZLES = " + json.dumps(ordered, ensure_ascii=False,
                                                separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    available = {theme: sum(theme in p["themes"] for p in ordered) for theme in THEMES}
    print(f"Scanned {scanned:,} puzzles; wrote {len(ordered):,} unique puzzles to {args.output}.")
    print("Available themes (sample / source): " + ", ".join(
        f"{theme}={count}/{seen[theme]}" for theme, count in available.items() if count))


if __name__ == "__main__":
    # Counters used to keep each theme/rating bucket uniformly sampled.
    reservoir_counts = Counter()
    main()
