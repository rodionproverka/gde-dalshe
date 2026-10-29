import json,pathlib
p=pathlib.Path(__file__).resolve().parents[1]
data=json.loads((p/'dist/data.json').read_text())
for source in ['legal-europe.json','legal-world.json']:
 for entry in json.loads((p/'research'/source).read_text()):
  c=next(c for c in data if c['id']==entry['id']);old=c['sources'];c.update(entry);c['sources']+= [s for s in old if s['url'] not in {s['url'] for s in c['sources']}];c['verified']=True;c['official']=entry['sources'][0]['url']
  if c['id'] in ['finland','czechia']:
   c['social']='Подтверждены юридические ограничения, описанные в разделе въезда. Наличие визы или общей программы не гарантирует допуск или приём заявления. Это не измерение отношения всех жителей к россиянам.'
(p/'dist/data.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
r=json.loads((p/'dist/research.json').read_text());r['additionalLegalResearch']=[json.loads((p/'research'/s).read_text()) for s in ['legal-europe.json','legal-world.json']];(p/'dist/research.json').write_text(json.dumps(r,ensure_ascii=False,indent=2))
print('Verified countries:',sum(c['verified'] for c in data))
