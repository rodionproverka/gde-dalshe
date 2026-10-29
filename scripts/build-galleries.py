import concurrent.futures,html,io,json,pathlib,re,time,unicodedata,urllib.parse,urllib.request,urllib.error
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]/'dist'
HEADERS={'User-Agent':'GdeDalshe/2.0 (personal relocation site; Commons attribution retained)'}
data=json.loads((ROOT/'data.json').read_text());photos=json.loads((ROOT/'photos.json').read_text())
cities=[c for country in data for c in country['cities']]
OUT=ROOT/'assets/gallery';OUT.mkdir(exist_ok=True)
galleries={c['id']:[photos[c['id']]] for c in cities}
if (ROOT/'galleries.json').exists():galleries.update(json.loads((ROOT/'galleries.json').read_text()))
def request(url,binary=False):
 for attempt in range(4):
  try:
   req=urllib.request.Request(url,headers=HEADERS)
   with urllib.request.urlopen(req,timeout=40) as r:raw=r.read()
   return raw if binary else json.loads(raw)
  except urllib.error.HTTPError as e:
   if e.code in [429,503] and attempt<3:
    delay=min(55,int(e.headers.get('Retry-After',10))+1); print('wait',e.code,delay,flush=True);time.sleep(delay)
   else:raise
  except Exception:
   if attempt==3:raise
   time.sleep(2)
def plain(v):return html.unescape(re.sub('<[^>]+>','',v or '')).strip()
def norm(v):return re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',v).encode('ascii','ignore').decode().lower())
def save():
 p=ROOT/'galleries.json.tmp';p.write_text(json.dumps(galleries,ensure_ascii=False,indent=2));p.replace(ROOT/'galleries.json')
# Whitelist comes from each city's article: excludes flags, maps, people, historical depictions.
BAD=re.compile(r'flag|coat.of.arms|seal.of|logo|map|locator|location|population|density|chart|graph|emblem|portrait|person|king |queen |president|battle|army|soldier|war |military|statue|diagram|collage|montage|airport|railway|railroad|train|sports|stadium|football|cricket|team|university|dancer|wappen|tropenmuseum|\b(?:18\d\d|190\d|191\d|192\d|193\d|194\d|195\d)\b',re.I)
def score(name,c):
 if not re.search(r'\.(jpg|jpeg|png)$',name,re.I) or BAD.search(name):return -100
 n=norm(name);city=c['wiki'].replace('_',' ').split(',')[0];aliases=[city,city.replace('City','').strip(),c['name'].split(' · ')[0]]
 aliases += {'Da_Nang':['Da Nang','Danang','Đà Nẵng'],'Ho_Chi_Minh_City':['Ho Chi Minh','Saigon'],'George_Town,_Penang':['George Town','Penang'],'Phuket_(city)':['Phuket'],'Kraków':['Krakow'],'New_Delhi':['New Delhi','Delhi'],'Panaji':['Panaji','Panjim'],'Mérida,_Yucatán':['Merida'],'Brasília':['Brasilia'],'San_José,_Costa_Rica':['San Jose'],'Washington,_D.C.':['Washington','DC'],'Santiago':['Santiago','Chile']}.get(c['wiki'],[])
 hit=any(norm(a) in n for a in aliases if len(norm(a))>3)
 s=15 if hit else 1
 s+=sum(v for k,v in [('panorama',8),('skyline',8),('aerial',6),('view',4),('night',2),('beach',5),('bay',4),('cityscape',7),('bridge',3),('street',3)] if k in name.lower())
 if '(cropped)' in name.lower():s-=2
 return s
cache=ROOT/'gallery-candidates.json'
if cache.exists():candidates=json.loads(cache.read_text())
else:
 candidates={}
 for start in range(0,len(cities),3):
  group=cities[start:start+3];q={'action':'query','format':'json','prop':'images','imlimit':500,'titles':'|'.join(c['wiki'].replace('_',' ') for c in group),'redirects':1}
  try:
   result=request('https://en.wikipedia.org/w/api.php?'+urllib.parse.urlencode(q));pages=list(result['query']['pages'].values());redirects={r['from']:r['to'] for r in result['query'].get('redirects',[])}
   for c in group:
    title=c['wiki'].replace('_',' ');page=next((p for p in pages if p['title']==redirects.get(title,title)),{})
    old=norm(photos[c['id']].get('title',''))
    names=[i['title'] for i in page.get('images',[]) if score(i['title'],c)>0 and norm(i['title'].replace('File:','').rsplit('.',1)[0])!=old]
    names.sort(key=lambda n:score(n,c),reverse=True);candidates[c['id']]=names[:5]
   print('candidates',start+len(group),flush=True)
  except Exception as e:print('candidate failure',start,str(e),flush=True)
  time.sleep(.35)
 cache.write_text(json.dumps(candidates,ensure_ascii=False,indent=2))
# Metadata bundled in batches reduces API overhead and respects Commons load.
meta={};mcache=ROOT/'gallery-metadata.json'
if mcache.exists():meta=json.loads(mcache.read_text())
allnames=list(dict.fromkeys(n for names in candidates.values() for n in names if n not in meta))
for start in range(0,len(allnames),25):
 names=allnames[start:start+25]
 q={'action':'query','format':'json','prop':'imageinfo','iiprop':'url|extmetadata|size','iiurlwidth':1280,'titles':'|'.join(names)}
 try:
  result=request('https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(q));pages={p['title'].replace('_',' '):p for p in result['query']['pages'].values()};normalized={n['from'].replace('_',' '):n['to'].replace('_',' ') for n in result['query'].get('normalized',[])}
  for name in names:
   key=name.replace('_',' ');page=pages.get(normalized.get(key,key),{});meta[name]=page.get('imageinfo',[{}])[0]
  mcache.write_text(json.dumps(meta,ensure_ascii=False));print('metadata',start+len(names),'/',len(allnames),flush=True)
 except Exception as e:print('metadata failure',start,str(e),flush=True)
 time.sleep(.5)
def download_city(c):
 gid=c['id'];entries=galleries[gid];sources={e['source'] for e in entries}
 for name in candidates.get(gid,[]):
  if len(entries)>=3:break
  try:
   i=meta.get(name,{})
   if not i or i.get('width',0)<700 or i.get('height',0)<450 or i.get('width',0)/max(i.get('height',1),1)<1.1:continue
   m=i.get('extmetadata',{});license=plain(m.get('LicenseShortName',{}).get('value'));author=plain(m.get('Artist',{}).get('value'));licenseurl=m.get('LicenseUrl',{}).get('value','')
   if not license or not author or not re.search(r'CC|public domain|PD-|attribution|free art|FAL|KOGL Type 1',license,re.I):continue
   source=i.get('descriptionurl','')
   if source in sources:continue
   if not licenseurl:
    if re.search(r'public domain|PD-|CC0',license,re.I):licenseurl='https://creativecommons.org/publicdomain/mark/1.0/'
    elif re.search(r'FAL|Free Art',license,re.I):licenseurl='https://artlibre.org/licence/lal/en/'
    else:licenseurl=source+'#Licensing'
   raw=request(i.get('thumburl') or i['url'],True);im=Image.open(io.BytesIO(raw)).convert('RGB');im.thumbnail((1280,1280));path=OUT/(gid+'-'+str(len(entries)+1)+'.jpg');im.save(path,'JPEG',quality=84,optimize=True)
   entry={'src':str(path.relative_to(ROOT)),'source':source,'title':name.removeprefix('File:').rsplit('.',1)[0],'author':author,'license':license,'licenseUrl':licenseurl}
   if 'KOGL' in license:entry['attribution']=author+" public work used according to KOGL Type 1."
   entries.append(entry);sources.add(source)
  except Exception as e:print('download fail',gid,name,str(e),flush=True)
 return gid,len(entries)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 for gid,count in pool.map(download_city,cities):save();print('gallery',gid,count,flush=True)
save();print('DONE',len(galleries),'cities',sum(len(v) for v in galleries.values()),'photos',flush=True)
