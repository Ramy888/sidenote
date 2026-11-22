#!/bin/sh
# Stages what the Remotion composition serves from public/ (git-ignored) and writes footage/clips.json (clip lengths).
set -e
cd "$(dirname "$0")"
mkdir -p public/footage public/voice
cp footage/*.mp4 public/footage/
cp voice/narration.wav public/voice/
cp ../submission/architecture.png public/architecture.png
cp ../apps/sidenote/assets/icon-only.png public/mark.png
[ -f stills/android.png ] && cp stills/android.png public/android.png
[ -f stills/iphone.png ] && cp stills/iphone.png public/iphone.png
python3 - <<'PY'
import json, subprocess, glob, os
d = {os.path.basename(p)[:-4]: float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',p]).decode()) for p in sorted(glob.glob('footage/*.mp4'))}
json.dump(d, open('footage/clips.json','w'), indent=1); print(d)
PY
