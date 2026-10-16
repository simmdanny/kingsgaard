#!/bin/sh
# sync_github.sh "what changed": puts the Godot game on GitHub. Copies every file this project tracks into the godot/ folder of
# the Kingsgaard repo (C:\Users\User\Games\kingsgaard, origin github.com/simmdanny/kingsgaard - public), so it sits apart from
# the browser game's files; commits that folder alone on main and pushes. The female model is not tracked here (no license),
# so she never goes up. Run it after committing an update in this project.
set -e
SRC=/c/Users/User/Games/KingsgaardGodot
DST=/c/Users/User/Games/kingsgaard
MSG="${1:-update}"
cd "$SRC"
if ! git diff --quiet || ! git diff --cached --quiet; then echo "KingsgaardGodot has uncommitted changes - commit first"; exit 1; fi
cd "$DST"
[ "$(git branch --show-current)" = "main" ] || { echo "the kingsgaard repo is not on main"; exit 1; }
if ! git diff --quiet || ! git diff --cached --quiet; then echo "the kingsgaard repo has uncommitted changes"; exit 1; fi
git pull -q --ff-only origin main
rm -rf godot
mkdir godot
(cd "$SRC" && git ls-files -z | tar --null -T - -cf -) | (cd godot && tar -xf -)
git add -A godot
if git diff --cached --quiet; then echo "nothing new to upload"; exit 0; fi
git commit -q -m "Godot: $MSG ($(cd "$SRC" && git rev-parse --short HEAD))"
git push -q origin main
git log --oneline -1
