"""Encode Blender renders without changing framing or color treatment."""
from PIL import Image
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
import json

project=Path(__file__).resolve().parents[1]
source=project.parent/'gt3_reference'/'sequence-renders'
target=project/'dist'/'assets'/'sequence'

def encode(path):
    destination=target/(path.stem+'.webp')
    if destination.exists() and destination.stat().st_mtime>=path.stat().st_mtime:
        try:
            with Image.open(destination) as image:image.load()
            return
        except OSError:pass
    temporary=destination.with_suffix('.encoding')
    with Image.open(path) as image:image.save(temporary,format='WEBP',quality=92,method=3)
    temporary.replace(destination)

if __name__=='__main__':
    target.mkdir(exist_ok=True)
    with ProcessPoolExecutor(max_workers=4) as pool:
        for index,_ in enumerate(pool.map(encode,sorted(source.glob('turn-*.png')))):
            if index%12==0:print(f'Encoded {index+1} frames',flush=True)
    paths=list(target.glob('*.webp'))
    print(json.dumps({'frames':len(paths),'bytes':sum(p.stat().st_size for p in paths)}))
