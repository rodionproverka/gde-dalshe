import concurrent.futures, html, io, json, pathlib, re, threading, time, urllib.parse, urllib.request
from PIL import Image

ROOT=pathlib.Path(__file__).resolve().parents[1]/'dist'
OUT=ROOT/'assets/cities'
OUT.mkdir(parents=True,exist_ok=True)
HEADERS={'User-Agent':'RelocationAtlas/1.0 (personal relocation research; image attribution retained)'}
LOCK=threading.Lock()
photos=json.loads((ROOT/'photos.json').read_text()) if (ROOT/'photos.json').exists() else {}
errors=[]
RATE_LOCK=threading.Lock()
LAST_REQUEST=0
OVERRIDES={'laos-0':'Vientiane - Mekong - Panorama 0001.jpg','uzbekistan-0':'Tashkent city skyline.jpg'}

def request(url, binary=False):
    global LAST_REQUEST
    for attempt in range(3):
        try:
            with RATE_LOCK:
                time.sleep(max(0,1.1-(time.time()-LAST_REQUEST)))
                LAST_REQUEST=time.time()
            with urllib.request.urlopen(urllib.request.Request(url,headers=HEADERS),timeout=30) as response:
                raw=response.read()
                return raw if binary else json.loads(raw)
        except Exception as error:
            if attempt==2: raise
            if getattr(error,'code',0)==429:
                url=url+('&' if '?' in url else '?')+'redirect=true'
            time.sleep(3+attempt*5)

def plain(value):
    return html.unescape(re.sub('<[^>]+>','',value or '')).strip()

def save_state():
    temp=ROOT/'photos.json.tmp'
    temp.write_text(json.dumps(photos,ensure_ascii=False,indent=2))
    temp.replace(ROOT/'photos.json')
    (ROOT/'photos-errors.json').write_text(json.dumps(errors,ensure_ascii=False,indent=2))

def process(city):
    if city['id'] in photos: return
    try:
        summary=request('https://en.wikipedia.org/api/rest_v1/page/summary/'+urllib.parse.quote(city['wiki'],safe=''))
        image=summary.get('originalimage',summary.get('thumbnail',{})).get('source','')
        match=re.search(r'/commons/(?:thumb/)?[a-f0-9]/[a-f0-9]{2}/([^/?]+)',image)
        if not match and city['id'] not in OVERRIDES: raise ValueError('No Commons photo in summary')
        filename=OVERRIDES.get(city['id']) or urllib.parse.unquote(match.group(1))
        params={'action':'query','format':'json','prop':'imageinfo','iiprop':'url|extmetadata','iiurlwidth':960,'titles':'File:'+filename}
        response=request('https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(params))
        page=next(iter(response['query']['pages'].values()))
        info=page.get('imageinfo',[{}])[0]
        meta=info.get('extmetadata',{})
        license=plain(meta.get('LicenseShortName',{}).get('value',''))
        artist=plain(meta.get('Artist',{}).get('value',''))
        license_url=meta.get('LicenseUrl',{}).get('value','')
        if not license or not artist: raise ValueError('Missing license or author')
        if not re.search(r'CC|public domain|PD-|attribution|free art|FAL',license,re.I): raise ValueError('Unsupported license '+license)
        download=info.get('thumburl') or info.get('url')
        raw=request(download,binary=True)
        im=Image.open(io.BytesIO(raw)).convert('RGB')
        im.thumbnail((960,960))
        path=OUT/(city['id']+'.jpg')
        im.save(path,'JPEG',quality=86,optimize=True)
        result={'src':'assets/cities/'+path.name,'source':info.get('descriptionurl'),'title':plain(meta.get('ObjectName',{}).get('value',filename)),'author':artist,'license':license,'licenseUrl':license_url,'city':city['name'],'width':im.width,'height':im.height}
        with LOCK:
            photos[city['id']]=result
            save_state()
            print('OK',len(photos),city['id'],license,flush=True)
    except Exception as exc:
        with LOCK:
            errors.append({'id':city['id'],'wiki':city['wiki'],'error':str(exc)})
            save_state()
            print('FAIL',city['id'],str(exc),flush=True)

if __name__=='__main__':
    data=json.loads((ROOT/'data.json').read_text())
    cities=[city for country in data for city in country['cities']]
    priorities={'georgia','thailand','vietnam','serbia','armenia','indonesia'}
    cities.sort(key=lambda c:(0 if c['id'].rsplit('-',1)[0] in priorities else 1,not c['capital']))
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(process,cities))
    print('DONE',len(photos),'photos;',len(errors),'errors',flush=True)
