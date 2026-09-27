"""Create an inspectable source delivery ZIP. This does not approve commercial release."""
from pathlib import Path
import hashlib, json, subprocess, zipfile
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parent/'ApplyDock-1.0.0-rc.1-full.zip'
files=['release/applydock-extension-1.0.0-rc.1.zip','release/ApplyDock-Offline.html','release/ApplyDock-Complete-Template.xlsx','docs/testing-report.md','reports/unit-tests.json','reports/browser-tests.json','reports/release-gate.json']
items=[]
for name in files:
    p=ROOT/name
    if not p.is_file():raise SystemExit(f'Missing delivery file: {name}. Run build and tests first.')
    data=p.read_bytes();items.append({'file':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
source=subprocess.check_output(['node',str(ROOT/'scripts/fingerprint.mjs')],text=True).strip()
(ROOT/'DELIVERY-MANIFEST.json').write_text(json.dumps({'product':'ApplyDock','version':'1.0.0-rc.1','source_sha256':source,'release_decision':'HOLD unless a newly verified gate says otherwise','artifacts':items},ensure_ascii=False,indent=2))
(ROOT/'release/SHA256SUMS.txt').write_text(''.join(f'{x["sha256"]}  {x["file"]}\n' for x in items))
skip={'node_modules','__pycache__','.venv','.git'}
with zipfile.ZipFile(OUT,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in sorted(ROOT.rglob('*')):
        relative=p.relative_to(ROOT)
        if not p.is_file() or any(part in skip for part in relative.parts):continue
        if p.name.startswith('failure-') or p.name in ['http.pid','http.log'] or p.suffix=='.pyc':continue
        z.write(p,'ApplyDock/'+relative.as_posix())
with zipfile.ZipFile(OUT) as z:
    bad=z.testzip()
    if bad:raise SystemExit('ZIP verification failed: '+bad)
checksum=hashlib.sha256(OUT.read_bytes()).hexdigest()
OUT.with_suffix(OUT.suffix+'.sha256').write_text(checksum+'  '+OUT.name+'\n')
print(json.dumps({'file':str(OUT),'bytes':OUT.stat().st_size,'sha256':checksum},indent=2))
