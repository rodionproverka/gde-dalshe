import concurrent.futures, html, importlib.util, io, json, pathlib, re, time, urllib.parse, urllib.request
from PIL import Image

ROOT=pathlib.Path(__file__).resolve().parents[1]/'dist'
HEADERS={'User-Agent':'RelocationAtlas/1.0 (personal research project; Wikimedia author and license attribution preserved)'}
photos=json.loads((ROOT/'photos.json').read_text())
data=json.loads((ROOT/'data.json').read_text())
cities=[c for country in data for c in country['cities'] if c['id'] not in photos]
OVERRIDES={'laos-0':'Vientiane - Mekong - Panorama 0001.jpg','uzbekistan-0':'Tashkent city skyline.jpg','uae-1':'Dubai Skyline 2016.jpg','bulgaria-1':'The Sea Garden in Varna, Bulgaria.jpg'}
errors=[]

def request(url,binary=False):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers=HEADERS),timeout=30) as r:
                raw=r.read()
                return raw if binary else json.loads(raw)
        except urllib.error.HTTPError as e:
            if attempt==2: raise
            if e.code==429:
                delay=int(e.headers.get('Retry-After',35))+2
                print('RATE LIMIT: waiting',delay,flush=True)
                time.sleep(delay)
            else: raise

def plain(v): return html.unescape(re.sub('<[^>]+>','',v or '')).strip()

def locate(c):
    try:
        if c['id'] in OVERRIDES: return c,OVERRIDES[c['id']]
        d=request('https://en.wikipedia.org/api/rest_v1/page/summary/'+urllib.parse.quote(c['wiki'],safe=''))
        source=d.get('originalimage',d.get('thumbnail',{})).get('source','')
        m=re.search(r'/commons/(?:thumb/)?[a-f0-9]/[a-f0-9]{2}/([^/?]+)',source)
        if not m: raise ValueError('No Commons photo')
        return c,urllib.parse.unquote(m.group(1))
    except Exception as e:
        errors.append({'id':c['id'],'error':str(e)})
        print('SKIP',c['id'],str(e),flush=True)

print('Retrying',len(cities),'cities',flush=True)
located=[]
for c in cities:
    v=locate(c)
    if v: located.append(v)
    time.sleep(.3)
print('Located',len(located),'files; waiting for rate window',flush=True)
time.sleep(36)
for start in range(0,len(located),20):
    group=located[start:start+20]
    q={'action':'query','format':'json','prop':'imageinfo','iiprop':'url|extmetadata','iiurlwidth':960,'titles':'|'.join('File:'+name for c,name in group)}
    try:
        result=request('https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(q))
    except Exception as e:
        print('BATCH FAILED',str(e),flush=True)
        continue
    pages={p['title'].replace('_',' '):p for p in result['query']['pages'].values()}
    normalized={n['from'].replace('_',' '):n['to'].replace('_',' ') for n in result['query'].get('normalized',[])}
    for c,name in group:
        try:
            key='File:'+name.replace('_',' ')
            p=pages.get(normalized.get(key,key),{})
            i=p.get('imageinfo',[{}])[0]
            m=i.get('extmetadata',{})
            license=plain(m.get('LicenseShortName',{}).get('value',''))
            artist=plain(m.get('Artist',{}).get('value',''))
            if not license or not artist: raise ValueError('Missing license/author')
            if not re.search(r'CC|public domain|PD-|attribution|free art|FAL|KOGL Type 1',license,re.I): raise ValueError('Unsupported license '+license)
            raw=request(i.get('thumburl') or i['url'],True)
            im=Image.open(io.BytesIO(raw)).convert('RGB'); im.thumbnail((960,960))
            path=ROOT/'assets/cities'/(c['id']+'.jpg'); im.save(path,'JPEG',quality=86,optimize=True)
            photos[c['id']]={'src':'assets/cities/'+path.name,'source':i.get('descriptionurl'),'title':plain(m.get('ObjectName',{}).get('value',name)),'author':artist,'license':license,'licenseUrl':m.get('LicenseUrl',{}).get('value',''),'city':c['name'],'width':im.width,'height':im.height}
            temp=ROOT/'photos.json.tmp'; temp.write_text(json.dumps(photos,ensure_ascii=False,indent=2)); temp.replace(ROOT/'photos.json')
            print('OK',len(photos),c['id'],flush=True)
        except Exception as e:
            errors.append({'id':c['id'],'error':str(e)})
            print('FAIL',c['id'],str(e),flush=True)
        time.sleep(.5)
(ROOT/'photos-errors.json').write_text(json.dumps(errors,ensure_ascii=False,indent=2))
print('DONE',len(photos),'photos',flush=True)
