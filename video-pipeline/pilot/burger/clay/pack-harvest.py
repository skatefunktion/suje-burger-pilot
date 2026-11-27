"""Package all native 24fps harvest poses and their projected landmarks.

python3 pack-harvest.py /directory/rendered/by/sculpt-harvest.py
"""
import hashlib
import json
from pathlib import Path
import sys

from PIL import Image

HERE=Path(__file__).resolve().parent
SOURCE=Path(sys.argv[1])
ASSETS=HERE/'reference-assets'
landmarks=json.loads((SOURCE/'landmarks.json').read_text())
assert len(landmarks)==128,'Render both workers for all 64 source frames first'
paths=[]
for worker in (0,1):
    atlas=Image.new('RGBA',(3200,3200))
    for frame in range(64):
        image=Image.open(SOURCE/f'worker-{worker}-{frame:02d}.png').convert('RGBA')
        assert image.size==(400,400)
        assert landmarks[f'{worker}-{frame:02d}']['feet']==landmarks[f'{worker}-00']['feet']
        atlas.paste(image,(frame%8*400,frame//8*400))
    target=ASSETS/f'harvest-full-poses-{worker}.webp'
    atlas.save(target,lossless=True,method=6);paths.append(target)
target=ASSETS/'harvest-landmarks.json'
target.write_text(json.dumps(landmarks,indent=2)+'\n');paths.append(target)
manifest_path=ASSETS/'manifest.json'
manifest=json.loads(manifest_path.read_text())
entries=manifest['motion_assets']
for path in paths:
    entries[:]=[entry for entry in entries if entry['file']!=path.name]
    entries.append({'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
        'authoring':'Procedural Blender sculpt-harvest.py: 64 complete 3D poses per worker, native 24fps, fixed camera and feet, adult arm proportions, continuous jacket/seat/sleeves. Source-calibrated 270px upright height and lit profile features outside the cheek surface. No image flow, body cutouts or fingerprint textures. Crops and baskets are composited separately; projected landmarks keep the grasp attached.'})
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Packaged 128 complete harvest poses and matching landmarks')
