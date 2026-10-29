"""Collect extra city photos (Wikipedia article images, Commons-licensed) and
points of interest (OpenStreetMap via Overpass) for cities lacking them.
Writes dist/gallery-extra.json and dist/places-extra.json. Run: python3 scripts/enrich-media.py"""
import json, re, time, urllib.parse, urllib.request, pathlib, html

DIST = pathlib.Path(__file__).resolve().parent.parent / 'dist'
UA = {'User-Agent': 'gde-dalshe/1.0 (relocation catalogue; github pages)'}
BAD = re.compile(r'(map|flag|coat|logo|locator|location|emblem|seal|icon|symbol|banner|diagram|chart|karte|plan|svg|montage|collage|population|climate|wappen|signature|commons-logo|portal)', re.I)


def get(url, data=None, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read())
        except Exception as e:
            time.sleep(3 + i * 5)
    return None


def strip(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s or '')).strip()


def photos(wiki):
    q = urllib.parse.urlencode({'action': 'query', 'format': 'json', 'titles': wiki.replace('_', ' '), 'generator': 'images', 'gimlimit': 60,
                                'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size', 'iiurlwidth': 1400, 'redirects': 1})
    d = get('https://en.wikipedia.org/w/api.php?' + q)
    out = []
    for p in (d or {}).get('query', {}).get('pages', {}).values():
        t = p.get('title', '')
        if not re.search(r'\.(jpe?g)$', t, re.I) or BAD.search(t):
            continue
        ii = (p.get('imageinfo') or [{}])[0]
        if ii.get('width', 0) < 900 or ii.get('width', 0) < ii.get('height', 1) * 1.15:
            continue
        m = ii.get('extmetadata', {})
        lic = strip(m.get('LicenseShortName', {}).get('value'))
        if not lic or not re.search(r'CC|Public domain|PD', lic, re.I):
            continue
        out.append({'src': ii.get('thumburl'), 'source': ii.get('descriptionurl'), 'title': re.sub(r'^File:|\.\w+$', '', t).replace('_', ' '),
                    'author': strip(m.get('Artist', {}).get('value'))[:80] or 'Wikimedia Commons', 'license': lic,
                    'licenseUrl': strip(m.get('LicenseUrl', {}).get('value')), 'remote': True})
    return out[:8]


RULES = [('waterpark', r'аквапарк|water ?park'), ('themepark', r'парк (развлечений|аттракционов)|аттракцион|диснейленд|disney|theme park|amusement park'),
         ('zoo', r'зоопарк|океанариум|аквариум|zoo|aquarium'), ('mall', r'торгов|молл|\bmall\b|shopping'),
         ('museum', r'музей|галере|museum'), ('park', r'\bпарк\b|сад\b|ботанич|park|garden'),
         ('landmark', r'собор|храм|церк|мечеть|синагог|пагод|монастыр|крепост|замок|дворец|башн|мост\b|памятник|театр|достопримечат|мавзолей|ворота|площадь|набережн|cathedral|temple|mosque|fortress|castle|palace|tower|bridge|monument|landmark|square')]
SKIP = r'кинотеатр|офисн|этажн|небоскр|жилой|крупнейший город|столица|город в|курган|mixed-use|residential|skyscraper|office|was a|станци|улиц|район|школ|университет|институт|больниц|деревн|посёлок|поселок|муниципал|аэропорт|кладбищ|посольств|компани|банк\b|отель|гостиниц|стадион|вокзал|метро|station|street|district|school|university|hospital|village|airport|embassy|hotel|stadium|company'
LIMIT = {'mall': 5, 'waterpark': 2, 'themepark': 3, 'zoo': 2, 'museum': 3, 'park': 3, 'landmark': 6}


def wiki_geo(lang, lat, lng):
    q = urllib.parse.urlencode({'action': 'query', 'format': 'json', 'generator': 'geosearch', 'ggscoord': f'{lat}|{lng}', 'ggsradius': 10000, 'ggslimit': 120,
                                'prop': 'coordinates|description|pageprops', 'ppprop': 'disambiguation', 'colimit': 'max'})
    return list(((get(f'https://{lang}.wikipedia.org/w/api.php?' + q) or {}).get('query') or {}).get('pages', {}).values())


def extracts(lang, titles):
    if not titles:
        return {}
    q = urllib.parse.urlencode({'action': 'query', 'format': 'json', 'titles': '|'.join(titles), 'prop': 'extracts', 'exintro': 1, 'explaintext': 1, 'exsentences': 2, 'exlimit': 20})
    return {p['title']: p.get('extract', '') for p in ((get(f'https://{lang}.wikipedia.org/w/api.php?' + q) or {}).get('query') or {}).get('pages', {}).values()}


def places(cid, lat, lng):
    res, seen, count = [], set(), {}
    for lang in ('ru', 'en'):
        for p in wiki_geo(lang, lat, lng):
            t, d = p.get('title', ''), p.get('description', '')
            co = (p.get('coordinates') or [{}])[0]
            if 'lat' not in co or t in seen or re.search(SKIP, f'{t} {d}', re.I):
                continue
            kind = next((k for k, rx in RULES if re.search(rx, f'{t} {d}', re.I)), None)
            if not kind or count.get(kind, 0) >= LIMIT[kind]:
                continue
            count[kind] = count.get(kind, 0) + 1
            seen.add(t)
            res.append({'id': f'{cid}-wiki-{p["pageid"]}', 'name': t, 'type': kind, 'description': d, 'lat': co['lat'], 'lng': co['lon'],
                        'website': f'https://{lang}.wikipedia.org/wiki/{urllib.parse.quote(t.replace(" ", "_"))}', 'lang': lang})
        if len(res) >= 12:
            break
    for lang in ('ru', 'en'):
        ex = extracts(lang, [r['name'] for r in res if r['lang'] == lang][:20])
        for r in res:
            if r['lang'] == lang and ex.get(r['name']):
                r['description'] = re.sub(r'\s+', ' ', ex[r['name']])[:260]
    for r in res:
        r.pop('lang', None)
        if not r['description']:
            r['description'] = {'mall': 'Крупный торговый центр: магазины, фуд-корт, кино.', 'waterpark': 'Аквапарк: горки и бассейны. Сезон и билеты уточняйте на сайте.',
                                'themepark': 'Парк развлечений с аттракционами, хороший вариант на выходные с детьми.', 'zoo': 'Зоопарк или океанариум, популярное семейное место.',
                                'museum': 'Известный музей города.', 'park': 'Большой городской парк для прогулок и спорта.'}.get(r['type'], 'Одна из известных достопримечательностей города.')
    return res


def main():
    data = json.load(open(DIST / 'data.json'))
    coords = json.load(open(DIST / 'city-coordinates.json'))
    gal = json.load(open(DIST / 'galleries.json'))
    have = json.load(open(DIST / 'places.json'))
    gx_path, px_path = DIST / 'gallery-extra.json', DIST / 'places-extra.json'
    gx = json.load(open(gx_path)) if gx_path.exists() else {}
    px = json.load(open(px_path)) if px_path.exists() else {}
    for c in data:
        for city in c['cities']:
            cid = city['id']
            known = {g.get('source') for g in gal.get(cid, [])}
            if cid not in gx:
                gx[cid] = [p for p in photos(city['wiki']) if p['source'] not in known]
                json.dump(gx, open(gx_path, 'w'), ensure_ascii=False)
            if cid not in px and len(have.get(cid, [])) < 6 and cid in coords:
                r = places(cid, coords[cid]['lat'], coords[cid]['lng'])
                if r is not None:
                    px[cid] = r
                    json.dump(px, open(px_path, 'w'), ensure_ascii=False)
                time.sleep(.3)
            print(cid, len(gx.get(cid, [])), len(px.get(cid, [])), flush=True)


main()
