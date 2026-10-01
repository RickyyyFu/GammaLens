from pathlib import Path
import json, sys
root=Path(__file__).resolve().parents[1]
required=['SKILL.md','README.md','VALIDATION.md','references/06-positioning-crowding.md','assets/positioning-risk-card.md','assets/config.example.json']
missing=[x for x in required if not (root/x).exists()]
if missing: print('missing',missing); sys.exit(2)
json.load(open(root/'assets/config.example.json',encoding='utf-8'))
text='\n'.join(p.read_text(encoding='utf-8') for p in root.rglob('*.md'))
checks=['Short Interest','Short Volume','13F','GEX','Fuel','Trigger','Long unwind','two_sided_crowded']
miss=[x for x in checks if x not in text]
if miss: print('missing contract terms',miss); sys.exit(3)
print('bundle validation passed')
