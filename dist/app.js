import {defaultFilters,findMatches,monthly,evaluateRoute,durationMonths,tagNames} from './core.js';
import {cityNotes} from './city-notes.js';

/* ---------- icons ---------- */
const P={
heart:'<path d="M12 20.5s-7.5-4.6-9.2-9.3C1.7 8 3.8 4.5 7.3 4.5c2 0 3.6 1.1 4.7 2.8 1.1-1.7 2.7-2.8 4.7-2.8 3.5 0 5.6 3.5 4.5 6.7-1.7 4.7-9.2 9.3-9.2 9.3z"/>',
search:'<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
sliders:'<path d="M4 7h9M18 7h2M4 17h4M13 17h7"/><circle cx="15.5" cy="7" r="2.3"/><circle cx="10.5" cy="17" r="2.3"/>',
close:'<path d="M6 6l12 12M18 6L6 18"/>',arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',back:'<path d="M19 12H5M11 6l-6 6 6 6"/>',chev:'<path d="M9 6l6 6-6 6"/>',
waves:'<path d="M3 8c2 0 2-1.5 4.5-1.5S9.5 8 12 8s2.5-1.5 4.5-1.5S19 8 21 8M3 13c2 0 2-1.5 4.5-1.5S9.5 13 12 13s2.5-1.5 4.5-1.5S19 13 21 13M3 18c2 0 2-1.5 4.5-1.5S9.5 18 12 18s2.5-1.5 4.5-1.5S19 18 21 18"/>',
umbrella:'<path d="M12 4a9 9 0 0 1 9 8.5H3A9 9 0 0 1 12 4zM12 2.5V4M12 12.5V19a2 2 0 0 1-4 0"/><path d="M12 4c-2.2 2.2-3 5-3 8.5M12 4c2.2 2.2 3 5 3 8.5"/>',
mountain:'<path d="M2.5 20l6.5-11 3.8 6 2.4-3.4L21.5 20z"/><path d="M7 12.3l2 1.2 1.7-1.2"/>',
metro:'<rect x="5" y="3" width="14" height="14" rx="4"/><path d="M5 10.5h14M8.5 21l2-4M15.5 21l-2-4"/><circle cx="9" cy="13.8" r=".6" fill="currentColor"/><circle cx="15" cy="13.8" r=".6" fill="currentColor"/>',
bag:'<path d="M5 8h14l-1.1 12.1a1 1 0 0 1-1 .9H7.1a1 1 0 0 1-1-.9z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>',
laptop:'<rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2 19.5h20M10 8.5l-2 2 2 2M14 8.5l2 2-2 2"/>',
gamepad:'<path d="M7 8.5h10a4 4 0 0 1 3.9 4.9l-.8 3.2a2.4 2.4 0 0 1-4 1.1L14.4 16H9.6l-1.7 1.7a2.4 2.4 0 0 1-4-1.1l-.8-3.2A4 4 0 0 1 7 8.5z"/><path d="M8.3 11v3M6.8 12.5h3"/><circle cx="15.5" cy="11.7" r=".8" fill="currentColor"/><circle cx="17.2" cy="13.4" r=".8" fill="currentColor"/>',
sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
leaf:'<path d="M5 19.5C5 11 10 5 20 4.5c0 10-5.5 15-14 15z"/><path d="M5 19.5l8-8"/>',
snow:'<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5L12 6l2.5-1.5M9.5 19.5L12 18l2.5 1.5"/>',
passport:'<rect x="5" y="2.5" width="14" height="19" rx="2.2"/><circle cx="12" cy="10" r="3.2"/><path d="M8.8 10h6.4M12 6.8c-1 .9-1.4 2-1.4 3.2s.4 2.3 1.4 3.2M12 6.8c1 .9 1.4 2 1.4 3.2s-.4 2.3-1.4 3.2M9 17h6"/>',
home:'<path d="M3 11l9-7 9 7M5 9.5V20h14V9.5M10 20v-5h4v5"/>',
briefcase:'<rect x="3" y="7" width="18" height="13" rx="2.2"/><path d="M8.5 7V5.2c0-.7.5-1.2 1.2-1.2h4.6c.7 0 1.2.5 1.2 1.2V7M3 12.5h18M11 12.5v1.5h2v-1.5"/>',
coins:'<ellipse cx="9" cy="7" rx="6" ry="2.6"/><path d="M3 7v5c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6V7"/><path d="M15 10.4c3.3 0 6 1.1 6 2.5v5c0 1.4-2.7 2.6-6 2.6-2.4 0-4.5-.6-5.4-1.6M9 14.6V17"/>',
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
calendar:'<rect x="3" y="5" width="18" height="16" rx="2.4"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="8" cy="14.5" r=".9" fill="currentColor"/><circle cx="12" cy="14.5" r=".9" fill="currentColor"/>',
wallet:'<path d="M4 7.5h14.5a1.5 1.5 0 0 1 1.5 1.5v9.5a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 18.5zM4 7.5l10.5-3.2a1 1 0 0 1 1.3 1V7.5"/><path d="M15.5 14h2"/>',
users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6 6 0 0 1 3.5 5.8"/>',
globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>',
sparkle:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
chat:'<path d="M4 5h16v11H9.5L4 20z"/><path d="M8 9.5h8M8 12.5h5"/>',
check:'<path d="M5 12.5l4.5 4.5L19 7"/>',
pin:'<path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
star:'<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
landmark:'<path d="M3 9l9-5 9 5M5 9.5v8.5M9.7 9.5v8.5M14.3 9.5v8.5M19 9.5v8.5M3 20.5h18"/>',
ferris:'<circle cx="12" cy="10" r="6.5"/><circle cx="12" cy="10" r="1.2"/><path d="M12 3.5v13M5.5 10h13M7.4 5.4l9.2 9.2M16.6 5.4l-9.2 9.2M8 21l4-11 4 11M6.5 21h11"/>',
slide:'<path d="M5 15V4h3v8M5 7.5h3"/><path d="M8 6.5c6 0 7.5 3.5 9 8.5"/><path d="M3 19c2 0 2-1.3 4.5-1.3S9.5 19 12 19s2.5-1.3 4.5-1.3S19 19 21 19"/>',
frame:'<rect x="3.5" y="4" width="17" height="16" rx="2.2"/><path d="M3.5 16l5-5 4 4 2.5-2.5 5.5 5.5"/><circle cx="15.5" cy="8.8" r="1.6"/>',
tree:'<path d="M12 21.5v-6.5M12 3c3.6 0 6.2 2.6 6.2 6 0 3.4-2.8 6-6.2 6s-6.2-2.6-6.2-6c0-3.4 2.6-6 6.2-6zM9 21.5h6"/>',
paw:'<circle cx="6.5" cy="9.5" r="1.8"/><circle cx="10" cy="5.8" r="1.8"/><circle cx="14" cy="5.8" r="1.8"/><circle cx="17.5" cy="9.5" r="1.8"/><path d="M12 11c-3 0-5.2 3.6-5.2 5.8 0 1.5 1.1 2.7 2.6 2.7 1 0 1.6-.6 2.6-.6s1.6.6 2.6.6c1.5 0 2.6-1.2 2.6-2.7 0-2.2-2.2-5.8-5.2-5.8z"/>',
compass:'<circle cx="12" cy="12" r="9"/><path d="M15.8 8.2l-2.3 5.3-5.3 2.3 2.3-5.3z"/>',
ext:'<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
share:'<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.3 10.8l7.4-3.6M8.3 13.2l7.4 3.6"/>',
shield:'<path d="M12 3l7 3v5.2c0 4.8-3.3 8.3-7 9.8-3.7-1.5-7-5-7-9.8V6z"/><path d="M9 12l2.1 2.1L15.2 10"/>',
info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.2"/>',
map:'<path d="M9 4L3 6.5V20l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
bus:'<rect x="4.5" y="3" width="15" height="15" rx="3"/><path d="M4.5 11h15M8 21v-3M16 21v-3"/><circle cx="8.5" cy="14.5" r=".8" fill="currentColor"/><circle cx="15.5" cy="14.5" r=".8" fill="currentColor"/>',
grad:'<path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5v4.3c1.5 1.3 3.4 2 5.5 2s4-.7 5.5-2v-4.3M21.5 9.5v5"/>',
family:'<circle cx="7.5" cy="6.5" r="2.5"/><circle cx="16.5" cy="6.5" r="2.5"/><circle cx="12" cy="13" r="2"/><path d="M3 20v-3.5a4.5 4.5 0 0 1 7-3.7M21 20v-3.5a4.5 4.5 0 0 0-7-3.7M9 20.5v-1.5a3 3 0 0 1 6 0v1.5"/>',
};
const svg=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]||P.star}</svg>`;
const I=n=>`<span data-i="${n}">${svg(n)}</span>`;
const hydrate=(root=document)=>root.querySelectorAll('[data-i]').forEach(e=>{if(!e.firstChild)e.innerHTML=svg(e.dataset.i)});

const TAGS={sea:['Море','waves','#D6E6EE','#3D6E8F'],beach:['Пляжи','umbrella','#F3E4BF','#8A6412'],mountains:['Горы','mountain','#D9E8DF','#2F6B57'],metro:['Метро','metro','#E4DDF0','#5B4A8A'],
  malls:['Большие ТЦ','bag','#F8DCCF','#B83E26'],work:['Коворкинги','laptop','#E8E1D3','#3B4256'],clubs:['Комп. клубы','gamepad','#DCE3F2','#3A4F8A']};
const CLIMATE={tropical:['Тропики','sun','#F3E4BF','#8A6412'],temperate:['Умеренный','leaf','#D9E8DF','#2F6B57'],cold:['Холодный','snow','#D6E6EE','#3D6E8F']};
const ROUTE={visaFree:['Без визы','passport','#D9E8DF','#2F6B57'],nomad:['Виза номада','laptop','#D6E6EE','#3D6E8F'],residence:['ВНЖ','home','#F3E4BF','#8A6412'],work:['Работа','briefcase','#E8E1D3','#3B4256'],
  passive:['Пассивный доход','coins','#F8DCCF','#B83E26'],extension:['Продление','clock','#E4DDF0','#5B4A8A'],study:['Учёба','grad','#DCE3F2','#3A4F8A'],family:['Семья','family','#F8DCCF','#B83E26']};
const PLACE={mall:['ТЦ','bag','#F8DCCF','#B83E26'],waterpark:['Аквапарки','slide','#D6E6EE','#3D6E8F'],themepark:['Парки аттракционов','ferris','#E4DDF0','#5B4A8A'],zoo:['Зоопарки','paw','#F3E4BF','#8A6412'],
  landmark:['Достопримечательности','landmark','#E8E1D3','#3B4256'],museum:['Музеи','frame','#DCE3F2','#3A4F8A'],park:['Парки','tree','#D9E8DF','#2F6B57']};
const tint=([,, t,c])=>`style="--tint:${t};--tone:${c}"`;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const $=s=>document.querySelector(s);
const store={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const plural=(n,a,b,c)=>{n=Math.abs(n)%100;const m=n%10;return n>10&&n<20?c:m>1&&m<5?b:m===1?a:c};
const RM=matchMedia('(prefers-reduced-motion:reduce)').matches;

/* ---------- data ---------- */
const j=(u,d={})=>fetch(u).then(r=>r.ok?r.json():d).catch(()=>d);
const [data,routes,gal,galX,places,placesX,coords,observed,ratesFile]=await Promise.all(['data.json','visa-routes.json','galleries.json','gallery-extra.json','places.json','places-extra.json','city-coordinates.json','observed.json','rates.json'].map(u=>j('./'+u)));
data.forEach(c=>c.routes=routes[c.id]||[]);
const byId=Object.fromEntries(data.map(c=>[c.id,c]));
let rates={...ratesFile.rates};
fetch('https://open.er-api.com/v6/latest/USD').then(r=>r.json()).then(d=>{if(d?.rates?.RUB){rates={...rates,...d.rates};if(typeof renderGrid==='function'&&$('#grid'))renderGrid()}}).catch(()=>{});

const photosOf=cid=>{const seen=new Set;return[...(gal[cid]||[]),...(galX[cid]||[])].filter(p=>p.src&&!seen.has(p.src)&&seen.add(p.src))};
const small=src=>src.includes('/thumb/')?src.replace(/\/\d+px-/,'/960px-'):src;
const placesOf=cid=>{const out=[];for(const p of[...(places[cid]||[]),...(placesX[cid]||[])]){if(!out.some(q=>q.name.toLowerCase()===p.name.toLowerCase()||Math.abs(q.lat-p.lat)<.0015&&Math.abs(q.lng-p.lng)<.0015))out.push(/[а-яё]/i.test(p.description||'')?p:{...p,description:PDESC[p.type]||PDESC.landmark})}return out};
const PDESC={mall:'Крупный торговый центр: магазины, фуд-корт, кино.',waterpark:'Аквапарк: горки и бассейны. Сезон и билеты уточняйте на сайте.',themepark:'Парк развлечений с аттракционами, хороший вариант на выходные с детьми.',zoo:'Зоопарк или океанариум, популярное семейное место.',museum:'Известный музей города.',park:'Большой городской парк для прогулок и спорта.',landmark:'Одна из известных достопримечательностей города.'};

/* ---------- state ---------- */
let F={...defaultFilters,currency:'USD',...store.get('gd-filters',{})};
let saved=store.get('gd-saved',[]);
const SIGN={USD:'$',EUR:'€',RUB:'₽'};
const rate=()=>rates[F.currency]||1;
const money=(usd,cur=F.currency)=>{let v=usd*(rates[cur]||1);v=cur==='RUB'?Math.round(v/100)*100:Math.round(v/10)*10;return cur==='RUB'?`${v.toLocaleString('ru-RU')} ₽`:`${SIGN[cur]}${v.toLocaleString('ru-RU')}`};
const persist=()=>{const {search,...rest}=F;store.set('gd-filters',rest)};
const set=(patch)=>{Object.assign(F,patch);persist();renderAll()};
const months=()=>durationMonths(F);
const durLabel=m=>m>=12&&m%12===0?`${m/12} ${plural(m/12,'год','года','лет')}`:`${m} ${plural(m,'месяц','месяца','месяцев')}`;
const daysLabel=r=>{const d=r.maxContinuousDays||r.durationDays;if(d&&d<365)return`до ${d} ${plural(d,'дня','дней','дней')}`;const m=r.durationMonths;if(m)return`${durLabel(m)}${r.maxWithExtensionsMonths?` · до ${durLabel(r.maxWithExtensionsMonths)} с продлением`:r.renewable?' · продлевается':''}`;return'срок по решению'};

/* ---------- filters panel ---------- */
const btn=(f,v,label,extra='')=>`<button type="button" class="chip plain" data-f="${f}" data-v="${esc(v)}" ${extra}>${label}</button>`;
const tileB=(f,v,meta,sub='')=>`<button type="button" class="tile" data-f="${f}" data-v="${v}"><span class="st" ${tint(meta)}>${I(meta[1])}</span><span>${meta[0]}${sub?`<small>${sub}</small>`:''}</span></button>`;
const sw=(f,label,sub='')=>`<label class="switch"><span>${label}${sub?`<small>${sub}</small>`:''}</span><input type="checkbox" data-sw="${f}"></label>`;
const REGIONS=['Европа','Азия','Кавказ','ЮВА','Центральная Азия','Ближний Восток','Латинская Америка','Северная Америка','Африка','Океания'];
function buildFilters(){
  $('#fBody').innerHTML=`
  <div class="fg"><h4>${I('wallet')}Бюджет</h4>
    <div class="seg" style="width:100%;margin-bottom:10px">${['income','savings'].map(v=>`<button type="button" style="flex:1" data-f="funding" data-v="${v}">${v==='income'?'Доход в месяц':'Накопления'}</button>`).join('')}</div>
    <label class="field" data-show="income"><input data-in="income" inputmode="numeric" placeholder="Любой бюджет"><b class="cur-sign">$</b></label>
    <label class="field" data-show="savings"><input data-in="savings" inputmode="numeric" placeholder="Сумма накоплений"><b class="cur-sign">$</b></label>
    <div class="row between" style="margin-top:12px"><span style="font-weight:600;font-size:.9rem">${I('users')} Сколько человек</span><div class="stepper" data-stepper="people"><button type="button" data-d="-1">−</button><output data-out="people">1</output><button type="button" data-d="1">+</button></div></div>
    <p class="hint" style="margin-bottom:6px">Жильё</p>
    <div class="chips">${btn('housing','','Любое')}${btn('housing','apartment','Квартира')}${btn('housing','house','Дом')}${btn('housing','condo','Кондо')}</div>
    <label class="field" style="margin-top:10px"><input data-in="maxRent" inputmode="numeric" placeholder="Аренда не дороже"><b class="cur-sign">$</b></label>
    ${sw('reserve','Заложить запас 20%','на непредвиденные расходы')}
  </div>
  <div class="fg"><h4>${I('calendar')}Планирую жить</h4>
    <div class="dur-box"><label class="field"><input data-in="durationAmount" inputmode="numeric" placeholder="Срок не важен"></label>
      <div class="seg"><button type="button" data-f="durationUnit" data-v="months">мес.</button><button type="button" data-f="durationUnit" data-v="years">лет</button></div></div>
    <div class="chips" style="margin-top:10px">${[[3,'months','3 мес.'],[6,'months','полгода'],[1,'years','1 год'],[2,'years','2 года'],[5,'years','5 лет']].map(([a,u,l])=>`<button type="button" class="chip plain" data-preset="${a}|${u}">${l}</button>`).join('')}</div>
    ${sw('allowRenewal','Готов продлевать статус','учитывать продления и повторные подачи')}
    <p class="hint">Сайт проверит каждый визовый маршрут: покрывает ли он ваш срок.</p>
  </div>
  <div class="fg"><h4>${I('passport')}Визы и документы</h4>
    <div class="tiles">${['visaFree','nomad','residence','work','passive'].map(v=>tileB('routeType',v,ROUTE[v],v==='residence'?'любое основание':'')).join('')}</div>
    ${sw('visaFree','Въезд без визы','для паспорта РФ')}
    ${sw('verifiedOnly','Только проверенные правила','34 страны с официальными источниками')}
    ${sw('longStay','Есть путь к долгому пребыванию')}
    <p class="hint" style="margin-bottom:6px">Гражданство</p>
    <div class="chips">${btn('citizenship','','Не важно')}${btn('citizenship','5','до 5 лет')}${btn('citizenship','10','до 10 лет')}</div>
    <p class="hint" style="margin-bottom:6px">Бюрократия</p>
    <div class="chips">${btn('bureaucracy','','Любая')}${btn('bureaucracy','2','Простая')}${btn('bureaucracy','3','Средняя')}</div>
  </div>
  <div class="fg"><h4>${I('sparkle')}Образ жизни</h4>
    <div class="tiles">${Object.keys(TAGS).map(t=>`<button type="button" class="tile" data-tag="${t}"><span class="st" ${tint(TAGS[t])}>${I(TAGS[t][1])}</span><span>${TAGS[t][0]}</span></button>`).join('')}</div>
    <div class="match-mode" role="radiogroup" aria-label="Как совпадать">
      <button type="button" data-f="matchMode" data-v="all">Все условия<small>город подходит по всем</small></button>
      <button type="button" data-f="matchMode" data-v="any">Хотя бы одно<small>совпадает любое</small></button></div>
  </div>
  <div class="fg"><h4>${I('globe')}Регион</h4><div class="chips">${btn('region','','Весь мир')}${REGIONS.map(r=>btn('region',r,r)).join('')}</div></div>
  <div class="fg"><h4>${I('sun')}Климат</h4><div class="tiles">${Object.keys(CLIMATE).map(k=>tileB('climate',k,CLIMATE[k])).join('')}</div></div>
  <div class="fg"><h4>${I('chat')}Язык и прочее</h4>${sw('russian','Понимают по-русски')}${sw('english','Английский распространён')}${sw('saved','Только избранное')}</div>`;
  hydrate($('#fBody'));
}
function syncControls(){
  document.querySelectorAll('[data-f]').forEach(b=>b.setAttribute('aria-pressed',String(F[b.dataset.f]??'')===b.dataset.v));
  document.querySelectorAll('[data-tag]').forEach(b=>b.setAttribute('aria-pressed',F.tags.includes(b.dataset.tag)));
  document.querySelectorAll('[data-sw]').forEach(i=>i.checked=!!F[i.dataset.sw]);
  document.querySelectorAll('[data-in]').forEach(i=>{if(document.activeElement!==i)i.value=F[i.dataset.in]??''});
  document.querySelectorAll('[data-out=people],#qPeople').forEach(o=>o.textContent=F.people);
  document.querySelectorAll('[data-show]').forEach(e=>e.hidden=F.funding!==e.dataset.show);
  document.querySelectorAll('[data-preset]').forEach(b=>{const [a,u]=b.dataset.preset.split('|');b.setAttribute('aria-pressed',String(F.durationAmount)===a&&F.durationUnit===u)});
  document.querySelectorAll('.cur-sign').forEach(e=>e.textContent=SIGN[F.currency]);
  document.querySelectorAll('#currency button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.cur===F.currency));
  document.querySelectorAll('#qUnit button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.u===F.durationUnit));
  if(document.activeElement!==$('#qIncome'))$('#qIncome').value=F.income;
  if(document.activeElement!==$('#qDur'))$('#qDur').value=F.durationAmount;
  if(document.activeElement!==$('#search'))$('#search').value=F.search;
  $('#sort').value=F.sort;
}
document.addEventListener('click',e=>{
  const f=e.target.closest('[data-f]');
  if(f){const k=f.dataset.f,v=f.dataset.v;const single=['funding','durationUnit','matchMode'].includes(k);set({[k]:!single&&String(F[k])===v&&v!==''?'':v});return}
  const t=e.target.closest('[data-tag]');
  if(t){const tag=t.dataset.tag;set({tags:F.tags.includes(tag)?F.tags.filter(x=>x!==tag):[...F.tags,tag]});return}
  const pr=e.target.closest('[data-preset]');
  if(pr){const [a,u]=pr.dataset.preset.split('|');set(String(F.durationAmount)===a&&F.durationUnit===u?{durationAmount:''}:{durationAmount:a,durationUnit:u});return}
  const st=e.target.closest('[data-stepper] [data-d]');
  if(st){set({people:Math.min(8,Math.max(1,+F.people+ +st.dataset.d))});return}
});
document.addEventListener('change',e=>{if(e.target.dataset.sw)set({[e.target.dataset.sw]:e.target.checked})});
document.addEventListener('input',e=>{const k=e.target.dataset.in;if(k){const v=e.target.value.replace(/[^\d]/g,'');e.target.value=v;set({[k]:v})}});

/* ---------- active chips ---------- */
function activeList(){
  const a=[],cs=SIGN[F.currency];
  if(F.search)a.push([`«${F.search}»`,{search:''}]);
  if(F.income!==''&&F.funding==='income')a.push([`до ${(+F.income).toLocaleString('ru-RU')} ${cs}/мес`,{income:''}]);
  if(F.savings!==''&&F.funding==='savings')a.push([`накопления ${(+F.savings).toLocaleString('ru-RU')} ${cs}`,{savings:''}]);
  if(+F.people>1)a.push([`${F.people} чел.`,{people:1}]);
  if(F.housing)a.push([{apartment:'Квартира',house:'Дом',condo:'Кондо'}[F.housing],{housing:''}]);
  if(F.maxRent!=='')a.push([`аренда до ${(+F.maxRent).toLocaleString('ru-RU')} ${cs}`,{maxRent:''}]);
  if(F.reserve)a.push(['+20% запас',{reserve:false}]);
  if(months())a.push([`живу ${durLabel(months())}`,{durationAmount:''}]);
  if(F.allowRenewal)a.push(['с продлениями',{allowRenewal:false}]);
  if(F.routeType)a.push([ROUTE[F.routeType][0],{routeType:''}]);
  if(F.visaFree)a.push(['въезд без визы',{visaFree:false}]);
  if(F.verifiedOnly)a.push(['проверенные',{verifiedOnly:false}]);
  if(F.longStay)a.push(['долгое пребывание',{longStay:false}]);
  if(F.easyStay)a.push(['без ВНЖ',{easyStay:false}]);
  if(F.citizenship)a.push([`гражданство ≤ ${F.citizenship} лет`,{citizenship:''}]);
  if(F.bureaucracy)a.push([F.bureaucracy==='2'?'простая бюрократия':'средняя бюрократия',{bureaucracy:''}]);
  F.tags.forEach(t=>a.push([TAGS[t][0],{tags:F.tags.filter(x=>x!==t)}]));
  if(F.tags.length>1&&F.matchMode==='any')a.push(['хотя бы одно',{matchMode:'all'}]);
  if(F.region)a.push([F.region,{region:''}]);
  if(F.climate)a.push([CLIMATE[F.climate][0],{climate:''}]);
  if(F.russian)a.push(['по-русски',{russian:false}]);
  if(F.english)a.push(['английский',{english:false}]);
  if(F.saved)a.push(['избранное',{saved:false}]);
  return a;
}

/* ---------- catalog ---------- */
function visaStamp(c){
  if(!c.verified)return{c:'#7A7466',top:'ПРАВИЛА',big:'?',bot:'уточняются'};
  const e=c.routes.find(r=>r.type==='visaFree');
  if(e&&c.visaFree){const d=e.maxContinuousDays||e.durationDays||Math.round((e.durationMonths||0)*30);return{c:'#2F6B57',top:'БЕЗ ВИЗЫ',big:d||'✓',bot:d?plural(d,'день','дня','дней'):'въезд'}}
  return{c:'#E0573C',top:'НУЖНА',big:'VISA',bot:'заранее'};
}
let hits=[];
function compute(f=F){
  let h=findMatches(data,f,rates,saved);
  if(f.sort==='recommended'&&f.tags.length)h=h.map((x,i)=>({x,i,s:new Set(x.cities.flatMap(c=>c.tags).filter(t=>f.tags.includes(t))).size})).sort((a,b)=>b.s-a.s||a.i-b.i).map(o=>o.x);
  return h;
}
function cardHTML(h,i){
  const c=h.country,ph=h.cities.flatMap(ci=>photosOf(ci.id).slice(0,ci===h.city?4:2)).slice(0,6);
  const s=visaStamp(c),m=months();
  const allTags=new Set(h.cities.flatMap(ci=>ci.tags));
  const fit=m&&h.routes.length?h.routes.map(r=>({r,e:evaluateRoute(r,m,F.allowRenewal)})).sort((a,b)=>a.e.conditional-b.e.conditional)[0]:null;
  const per=F.funding==='savings'?'':'<small>/мес</small>';
  return `<article class="card" style="--d:${Math.min(i,12)*.04}s" data-open="${c.id}" data-city="${h.city.id}" tabindex="0">
  <div class="media"><div class="slides">${ph.map((p,k)=>`<img src="${esc(small(p.src))}" alt="${esc(p.city||c.name)}" loading="lazy" decoding="async" ${k?'':`data-vt="1"`}>`).join('')}</div>
    ${ph.length>1?`<div class="dots">${ph.map((_,k)=>`<i class="${k?'':'on'}"></i>`).join('')}</div>`:''}
    <span class="flag"><span>${c.flag}</span>${esc(c.region)}</span>
    <button class="save" data-save="${c.id}" aria-label="В избранное" aria-pressed="${saved.includes(c.id)}">${svg('heart')}</button>
</div>
  <div class="body"><span class="mini-stamp" style="--c:${s.c}"><span>${s.top}</span><b>${s.big}</b><span>${s.bot}</span></span><h3>${esc(c.name)}</h3>
    <p class="cities">${h.cities.map(ci=>esc(ci.name)).join(' · ')}</p>
    ${F.tags.length?`<div class="matches">${F.tags.map(t=>allTags.has(t)?`<span>${I('check')}${TAGS[t][0]}</span>`:`<span class="no">${TAGS[t][0]}</span>`).join('')}</div>`:''}
    ${fit?`<div class="route-line"><span class="pill ${fit.e.conditional?'warn':'ok'}">${fit.e.conditional?'с продлением':'подходит'}</span>${esc(fit.r.title)}</div>`:''}
    <div class="facts"><div><div class="price-big">${money(h.budget.total)} ${per}</div><small class="muted" style="font-weight:600;font-size:.76rem">${esc(h.city.name)} · ${F.people} чел.</small></div>
    <div class="tags">${h.city.tags.filter(t=>TAGS[t]).slice(0,4).map(t=>`<span ${tint(TAGS[t])} title="${TAGS[t][0]}">${I(TAGS[t][1])}</span>`).join('')}</div></div></div></article>`;
}
let shown=0;
function renderGrid(){
  hits=compute();
  const n=hits.length;
  $('#found').innerHTML=`Найдено <b>${n}</b> ${plural(n,'страна','страны','стран')}${F.tags.length>1?` · режим: <b>${F.matchMode==='any'?'хотя бы одно условие':'все условия'}</b>`:''}`;
  $('#empty').hidden=!!n;
  shown=Math.min(n,24);
  $('#grid').innerHTML=hits.slice(0,shown).map(cardHTML).join('');
  moreObs();
  const a=activeList();
  $('#activeChips').innerHTML=a.map(([l],i)=>`<button data-rm="${i}">${esc(l)}${I('close')}</button>`).join('')+(a.length>1?`<button data-rm="all" style="background:var(--accent)">Сбросить всё</button>`:'');
  $('#activeChips').onclick=e=>{const b=e.target.closest('[data-rm]');if(!b)return;b.dataset.rm==='all'?reset():set(a[+b.dataset.rm][1])};
  $('#fBadge').hidden=!a.length;$('#fBadge').textContent=a.length;
  countTo($('#fCount'),n);countTo($('#qCount'),n);
}
let sentinel;
function moreObs(){
  sentinel?.remove();if(shown>=hits.length)return;
  sentinel=document.createElement('div');sentinel.style.height='1px';$('#grid').after(sentinel);
  new IntersectionObserver((en,o)=>{if(en[0].isIntersecting){o.disconnect();const add=hits.slice(shown,shown+24);$('#grid').insertAdjacentHTML('beforeend',add.map((h,i)=>cardHTML(h,i)).join(''));shown+=add.length;moreObs()}},{rootMargin:'600px'}).observe(sentinel);
}
function countTo(el,n){const from=+el.textContent||0;if(from===n||RM){el.textContent=n;return}const t0=performance.now();const step=t=>{const k=Math.min(1,(t-t0)/450);el.textContent=Math.round(from+(n-from)*(1-(1-k)**3));if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)}
function reset(){F={...defaultFilters,currency:F.currency,sort:F.sort};persist();renderAll()}

// card media: hover scrub on desktop, swipe dots on touch
const grid=$('#grid');
grid.addEventListener('mousemove',e=>{const m=e.target.closest('.media');if(!m)return;const s=m.querySelector('.slides'),n=s.children.length;if(n<2)return;const r=m.getBoundingClientRect();const k=Math.min(n-1,Math.floor((e.clientX-r.left)/r.width*n));if(m._k!==k){m._k=k;s.scrollTo({left:k*s.clientWidth,behavior:'instant'});m.querySelectorAll('.dots i').forEach((d,i)=>d.classList.toggle('on',i===k))}});
grid.addEventListener('scroll',e=>{const s=e.target;if(!s.classList?.contains('slides'))return;const k=Math.round(s.scrollLeft/s.clientWidth);s.parentElement.querySelectorAll('.dots i').forEach((d,i)=>d.classList.toggle('on',i===k))},true);
grid.addEventListener('error',e=>{if(e.target.tagName==='IMG'){const s=e.target.parentElement;if(s.children.length>1)e.target.remove()}},true);
document.addEventListener('click',e=>{
  const sv=e.target.closest('[data-save]');if(sv){e.stopPropagation();toggleSave(sv.dataset.save,sv);return}
  const card=e.target.closest('[data-open]');if(card){openCountry(card.dataset.open,card.dataset.city,card.querySelector('img'))}
});
grid.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset.open)openCountry(e.target.dataset.open,e.target.dataset.city)});
function toggleSave(id,el){
  saved=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];store.set('gd-saved',saved);
  document.querySelectorAll(`[data-save="${id}"]`).forEach(b=>{b.setAttribute('aria-pressed',saved.includes(id));b.classList.remove('burst');void b.offsetWidth;b.classList.add('burst')});
  updSaved();toast(saved.includes(id)?`${byId[id].name} — в избранном`:'Убрано из избранного');
  if(F.saved)renderGrid();
}
const updSaved=()=>{const b=$('#savedCount');b.textContent=saved.length;b.toggleAttribute('data-zero',!saved.length)};
$('#savedBtn').onclick=()=>{if(!saved.length&&!F.saved){toast('Нажмите ♥ на карточке страны, чтобы сохранить её');return}set({saved:!F.saved});$('#catalog').scrollIntoView({behavior:RM?'auto':'smooth'})};
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2200)}

/* ---------- hero ---------- */
const HERO=['georgia-0','montenegro-0','thailand-1','portugal-0','turkey-0','vietnam-1','serbia-0','indonesia-0'];
function buildHero(){
  const cards=HERO.map(cid=>{const c=byId[cid.replace(/-\d+$/,'')],ci=c.cities.find(x=>x.id===cid),p=photosOf(cid)[0];return{c,ci,p}}).filter(x=>x.p);
  $('#deck').innerHTML=cards.map((x,i)=>`<div class="dcard" data-k="${i}" data-open="${x.c.id}" data-city="${x.ci.id}"><img src="${esc(small(x.p.src))}" alt="${esc(x.ci.name)}" ${i>2?'loading="lazy"':''}><span class="price" data-usd="${monthly(x.ci).total}">${money(monthly(x.ci).total)}/мес</span><div class="cap"><small>${x.c.flag} ${esc(x.c.name.toUpperCase())}</small><h3>${esc(x.ci.name)}</h3></div></div>`).join('');
  let front=0;const els=[...$('#deck').children];
  const lay=()=>els.forEach((el,i)=>{const p=(i-front+els.length)%els.length;el.classList.toggle('front',p===0);
    el.style.zIndex=10-p;el.style.opacity=p>3?0:1;el.style.pointerEvents=p?'none':'auto';
    el.style.transform=p===0?'':`translateX(${p*7}%) translateY(${p*-2}%) rotate(${p*4.5}deg) scale(${1-p*.06})`;el.style.filter=p?`brightness(${1-p*.12})`:''});
  lay();if(!RM)setInterval(()=>{if(document.hidden||!$('#country').hidden)return;front=(front+1)%els.length;lay()},3800);
  const wrap=$('.deck-wrap');
  wrap.addEventListener('mousemove',e=>{const r=wrap.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;$('#deck').style.transform=`rotateY(${x*10}deg) rotateX(${-y*8}deg)`});
  wrap.addEventListener('mouseleave',()=>$('#deck').style.transform='');
  $('#deck').style.transition='transform .6s var(--ease)';
  const names=data.flatMap(c=>c.cities.map(ci=>ci.name));const half=names.map(n=>`<span>${esc(n)}</span>`).join('');
  $('#marquee').innerHTML=half+half;
  // headline word rise
  document.querySelectorAll('.hero-title .line').forEach((l,li)=>{l.innerHTML=l.innerHTML.split(/(<em>.*?<\/em>|\s+)/).filter(Boolean).map((w,wi)=>/^\s+$/.test(w)?' ':`<span class="w" style="animation-delay:${.1+li*.12+wi*.05}s">${w}</span>`).join('')});
  $('#qTags').innerHTML=['sea','beach','mountains','metro','work','malls'].map(t=>`<button type="button" class="chip" data-tag="${t}"><span class="st" ${tint(TAGS[t])}>${I(TAGS[t][1])}</span>${TAGS[t][0]}</button>`).join('');
  $('#qIncome').oninput=e=>{const v=e.target.value.replace(/\D/g,'');e.target.value=v;set({income:v,funding:'income'})};
  $('#qDur').oninput=e=>{const v=e.target.value.replace(/\D/g,'');e.target.value=v;set({durationAmount:v})};
  $('#qUnit').onclick=e=>{const b=e.target.closest('[data-u]');if(b)set({durationUnit:b.dataset.u})};
  $('#quick').onsubmit=e=>{e.preventDefault();$('#catalog').scrollIntoView({behavior:RM?'auto':'smooth'})};
}

/* ---------- collections ---------- */
const COLL=[
  {t:'Год без визы',d:'Можно въехать и спокойно осмотреться',p:{visaFree:true,durationAmount:'12',durationUnit:'months'},img:'georgia-0'},
  {t:'У моря до $1500',d:'Море рядом и бюджет на одного',p:{tags:['sea'],income:'1500usd'},img:'montenegro-1'},
  {t:'Виза цифрового кочевника',d:'Для удалённой работы',p:{routeType:'nomad'},img:'indonesia-0'},
  {t:'Говорят по-русски',d:'Проще с бытом в первые месяцы',p:{russian:true},img:'armenia-0'},
  {t:'Метро и большие ТЦ',d:'Удобно жить в большом городе',p:{tags:['metro','malls']},img:'thailand-0'},
  {t:'Тропики круглый год',d:'Жаркий климат весь год',p:{climate:'tropical'},img:'vietnam-2'},
];
const collPatch=p=>{const o={...p};if(o.income==='1500usd')o.income=String(Math.round(1500*rate()/(F.currency==='RUB'?1000:10))*(F.currency==='RUB'?1000:10));return o};
function renderCollections(){
  $('#collectionList').innerHTML=COLL.map((c,i)=>{const n=compute({...defaultFilters,currency:F.currency,...collPatch(c.p)}).length;const ph=photosOf(c.img)[0];
    return`<button class="coll reveal" style="--d:${i*.06}s" data-coll="${i}"><img src="${esc(small(ph?.src||''))}" alt="" loading="lazy"><span class="cnt">${n} ${plural(n,'страна','страны','стран')}</span><span class="go">${svg('arrow')}</span><span class="c-in"><h3>${c.t.replace('$1500',F.currency==='USD'?'$1500':money(1500))}</h3><p>${c.d}</p></span></button>`}).join('');
  $('#collectionList').querySelectorAll('.coll').forEach(el=>{el.onclick=()=>{F={...defaultFilters,currency:F.currency,people:F.people,...collPatch(COLL[+el.dataset.coll].p)};persist();renderAll();$('#catalog').scrollIntoView({behavior:RM?'auto':'smooth'})}});
  observeReveal();
}

/* ---------- country page ---------- */
const cp=$('#country');let map,galTimer,curC,curCity,lbList=[];
function openCountry(id,cityId,img){
  const c=byId[id];if(!c)return;
  const go=()=>{renderCountry(c,cityId);history.pushState(null,'',`#/${id}${cityId?'/'+cityId:''}`)};
  if(document.startViewTransition&&img&&!RM){img.style.viewTransitionName='hero';const v=document.startViewTransition(()=>{img.style.viewTransitionName='';go();cp.classList.add('on')});v.finished.finally(()=>{})}else go();
}
function closeCountry(push=true){
  if(cp.hidden)return;clearInterval(galTimer);cp.classList.remove('on');$('#backdrop').classList.remove('on');document.body.classList.remove('lock');
  setTimeout(()=>{cp.hidden=true;$('#backdrop').hidden=true;cp.innerHTML='';if(map){map.stop();map.off();map.remove();map=null}},RM?0:450);
  if(push&&location.hash.startsWith('#/'))history.pushState(null,'',location.pathname+location.search);
}
function renderCountry(c,cityId){
  curC=c;curCity=c.cities.find(x=>x.id===cityId)||c.cities[0];
  const wasHidden=cp.hidden;
  cp.hidden=false;$('#backdrop').hidden=false;document.body.classList.add('lock');
  cp.innerHTML=`<div class="cp-bar"><button class="btn btn-ghost" data-close>${I('back')}<span class="lbl">Все страны</span></button><span class="t">${c.flag} ${esc(c.name)}</span>
    <button class="btn btn-ghost" data-share>${I('share')}<span class="lbl">Поделиться</span></button>
    <button class="btn btn-ghost save-inline" data-save="${c.id}" aria-pressed="${saved.includes(c.id)}">${svg('heart')}<span class="lbl">В избранное</span></button></div>
    <div class="cp" id="cpIn"></div>
    <div class="cp-dock"><button class="btn" data-close>${I('back')}Назад</button><button class="btn" data-jump="cpVisa">${I('passport')}Визы</button><button class="btn btn-accent" data-jump="cpMap">${I('map')}Карта</button></div>`;
  hydrate(cp);renderCity();
  void cp.offsetWidth;cp.classList.add('on');$('#backdrop').classList.add('on');
  cp.scrollTop=0;
  cp.onscroll=()=>cp.querySelector('.cp-bar')?.classList.toggle('stuck',cp.scrollTop>140);
  cp.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeCountry());
  cp.querySelector('[data-share]').onclick=async()=>{const url=location.href;try{if(navigator.share)await navigator.share({title:`${c.name} — Где дальше`,url});else{await navigator.clipboard.writeText(url);toast('Ссылка скопирована')}}catch{}};
  cp.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>cp.querySelector('#'+b.dataset.jump)?.scrollIntoView({behavior:'smooth'}));
}
function renderCity(){
  const fk=document.activeElement?.closest?.('#cpIn')&&document.activeElement.dataset.in,pos=fk&&document.activeElement.selectionStart;
  if(map){map.stop();map.off();map.remove();map=null}
  const c=curC,city=curCity,cid=city.id,ph=photosOf(cid),m=months(),b=monthly(city,+F.people,F.housing,F.reserve);
  const s=visaStamp(c);
  const evals=c.routes.map(r=>({r,e:evaluateRoute(r,m,F.allowRenewal)}));
  const ok=m?evals.filter(x=>x.e.fits):[];
  const best=ok.sort((a,b)=>a.e.conditional-b.e.conditional)[0];
  const verdict=!m?{cls:'',ic:'calendar',t:'Укажите срок',s:'Введите, сколько планируете жить, и мы проверим каждый маршрут.'}
    :!c.verified?{cls:'warn',ic:'info',t:'Правила ещё не проверены',s:'По этой стране нет проверенных маршрутов. Начните с официального сайта.'}
    :best?{cls:best.e.conditional?'warn':'',ic:'check',t:`${durLabel(m)}: ${best.e.conditional?'возможно с продлением':'подходит'}`,s:`Маршрут: ${best.r.title}`}
    :{cls:'no',ic:'close',t:`${durLabel(m)}: подходящего маршрута нет`,s:F.allowRenewal?'Ни один известный маршрут не покрывает этот срок.':'Включите «Готов продлевать статус». Возможно, срок покроет продление.'};
  const maxM=Math.min(72,Math.max(24,m||0,...c.routes.map(r=>Math.min(72,r.maxWithExtensionsMonths||r.durationMonths||(r.maxContinuousDays||r.durationDays||0)/30.4||0))));
  const tl=c.routes.map(r=>{const base=r.durationMonths||(r.maxContinuousDays||r.durationDays||0)/30.4;const ext=r.maxWithExtensionsMonths||(r.renewable?Math.min(maxM,(base||12)*2):0);const meta=ROUTE[r.type]||ROUTE.residence;
    return`<div class="tl-row"><span class="lbl" title="${esc(r.title)}">${esc(meta[0])}</span><div class="tl-bar">${ext>base?`<i class="ext" style="--c:${meta[3]};width:${Math.min(100,ext/maxM*100)}%"></i>`:''}${base?`<i style="--c:${meta[3]};width:${Math.max(4,Math.min(100,base/maxM*100))}%">${base>=1?durLabel(Math.round(base)):daysLabel(r)}</i>`:`<i style="--c:${meta[3]};width:100%;opacity:.25">срок по решению</i>`}${m?`<span class="tl-mark" style="left:${Math.min(99.5,m/maxM*100)}%" data-l="${durLabel(m)}"></span>`:''}</div></div>`}).join('');
  const pl=placesOf(cid);const kinds=[...new Set(pl.map(p=>p.type))].filter(k=>PLACE[k]);
  const obs=observed[cid];const notes=cityNotes[cid]||[];
  const loc=c.currency,lr=rates[loc];
  $('#cpIn').innerHTML=`
  <div class="cp-head"><div><h1><span>${c.flag}</span>${esc(c.name)}</h1><p>${esc(c.region)} · ${esc(c.language)} · ${esc(c.currency)}</p></div>
    ${c.cities.length>1?`<div class="city-tabs">${c.cities.map(ci=>`<button data-city-tab="${ci.id}" aria-pressed="${ci.id===cid}">${esc(ci.name)}</button>`).join('')}</div>`:''}</div>
  <div class="gal"><div class="gal-main"><div class="gal-track">${ph.map((p,i)=>`<figure data-lb="${i}"><img src="${esc(p.src)}" alt="${esc(city.name)}" ${i?'loading="lazy"':'style="view-transition-name:hero"'} decoding="async"><figcaption>${esc(p.author||'')} · <a href="${esc(p.source)}" target="_blank" rel="noopener">${esc(p.license||'')}</a></figcaption></figure>`).join('')}</div>
    ${ph.length>1?`<div class="gal-progress">${ph.map(()=>'<i></i>').join('')}</div><button class="gal-nav prev" aria-label="Назад">${I('arrow')}</button><button class="gal-nav next" aria-label="Дальше">${I('arrow')}</button>`:''}<span class="gal-count"><b>1</b> / ${ph.length}</span></div>
    ${ph.length>1?`<div class="gal-thumbs">${ph.map((p,i)=>`<button data-th="${i}" aria-current="${!i}"><img src="${esc(small(p.src))}" alt="" loading="lazy"></button>`).join('')}</div>`:''}</div>
  <div class="kpis">
    <div class="kpi"><span>${I('wallet')}Бюджет</span><b>${money(b.total)}</b><small>в месяц · ${F.people} чел.</small></div>
    <div class="kpi"><span>${I('home')}Аренда</span><b>${money(b.rent)}</b><small>${F.housing==='house'?'дом':'квартира'}</small></div>
    <div class="kpi"><span>${I('passport')}Въезд</span><b>${s.top==='БЕЗ ВИЗЫ'?`${s.big} ${s.bot}`:s.top==='НУЖНА'?'Нужна виза':'Уточняется'}</b><small>${s.top==='БЕЗ ВИЗЫ'?'без визы':'для паспорта РФ'}</small></div>
    <div class="kpi"><span>${I('shield')}Гражданство</span><b>${c.citizenYears?`${c.citizenYears} ${plural(c.citizenYears,'год','года','лет')}`:'—'}</b><small>${c.citizenYears?'обычный путь':'срок не исследован'}</small></div>
    <div class="kpi"><span>${I(CLIMATE[c.climate]?.[1]||'sun')}Климат</span><b>${CLIMATE[c.climate]?.[0]||'—'}</b><small>${c.english?'английский распространён':c.russian?'понимают по-русски':esc(c.language)}</small></div></div>

  <section class="cp-sec" id="cpVisa"><h2>Визы и <em>сроки</em></h2><p class="sub">Укажите, сколько хотите прожить. Ниже видно, какие маршруты покрывают этот срок и что для них нужно.</p>
    <div class="stay"><div class="stay-calc"><h3>Планирую жить</h3><p>Срок сохранится и для фильтров каталога.</p>
      <div class="dur-box"><label class="field"><input data-in="durationAmount" inputmode="numeric" placeholder="например, 8" value="${esc(F.durationAmount)}"></label>
      <div class="seg"><button type="button" data-f="durationUnit" data-v="months" aria-pressed="${F.durationUnit==='months'}">мес.</button><button type="button" data-f="durationUnit" data-v="years" aria-pressed="${F.durationUnit==='years'}">лет</button></div></div>
      <div class="presets">${[[1,'months','1 мес.'],[3,'months','3 мес.'],[6,'months','полгода'],[1,'years','год'],[3,'years','3 года'],[5,'years','5 лет']].map(([a,u,l])=>`<button type="button" data-preset="${a}|${u}">${l}</button>`).join('')}</div>
      <label class="switch" style="color:var(--paper)"><span>Готов продлевать статус</span><input type="checkbox" data-sw="allowRenewal" ${F.allowRenewal?'checked':''}></label>
      <div class="verdict ${verdict.cls}"><span class="vi">${I(verdict.ic)}</span><div><b>${esc(verdict.t)}</b><small>${esc(verdict.s)}</small></div></div></div>
    <div class="timeline"><h4>Сколько даёт каждый маршрут</h4>${tl||'<p class="muted">Маршруты не исследованы.</p>'}${tl?`<div class="tl-scale"><span>0</span><span>${durLabel(Math.round(maxM/2))}</span><span>${durLabel(maxM)}</span></div>`:''}</div></div>
    <div class="routes-list">${evals.map(({r,e},i)=>{const meta=ROUTE[r.type]||ROUTE.residence;const st=!m?'':e.fits?(e.conditional?'<span class="pill warn">с продлением</span>':'<span class="pill ok">подходит</span>'):`<span class="pill no">${esc(e.label.toLowerCase())}</span>`;
      return`<details class="route" ${i===0&&!m||best?.r===r?'open':''}><summary><span class="ri" ${tint(meta)}>${I(meta[1])}</span><div><h3>${esc(r.title)}</h3><p>${esc(meta[0])} · ${esc(daysLabel(r))}${r.upfrontVisa?' · подача заранее':''}</p></div>${st||'<span></span>'}<span class="chev">${I('chev')}</span></summary>
      <div class="route-body"><div><h5>Условия</h5><ul>${(r.conditions||[]).map(x=>`<li>${esc(x)}</li>`).join('')}${r.incomeUSD?`<li>Доход от ${money(r.incomeUSD)}/мес</li>`:''}${r.savingsUSD?`<li>Накопления от ${money(r.savingsUSD)}</li>`:''}</ul></div>
      <div><h5>Документы</h5><ul>${(r.documents||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
      <div><h5>Шаги</h5><ol>${(r.steps||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div>
      <div class="route-notes"><div><b>Работа</b>${esc(r.workRights||'—')}</div><div><b>Сборы</b>${esc(r.fees||'—')}</div><div><b>Продление</b>${esc(r.renewalNote||(r.renewable?'Продлевается':'Не продлевается'))}</div></div>
      <div style="grid-column:1/-1"><a class="src" href="${esc(r.source?.url)}" target="_blank" rel="noopener">${esc(r.source?.title||'Источник')} ↗</a> <span class="muted" style="font-size:.78rem">· проверено ${esc(r.checkedAt||'')}</span></div></div></details>`}).join('')}</div>
    <div class="legal-grid"><div><h4>Въезд</h4>${esc(c.entry)}</div><div><h4>Долгое пребывание</h4>${esc(c.longStay)}</div><div><h4>Гражданство</h4>${esc(c.citizenship)}</div></div>
    ${c.verified?'':`<p class="disclaimer">Правила этой страны ещё не проверены по официальным источникам. Прежде чем планировать, откройте <a href="${esc(c.official)}" target="_blank" rel="noopener">официальный сайт</a>.</p>`}
  </section>

  <section class="cp-sec" id="cpMap"><h2>Что <em>рядом</em></h2><p class="sub">ТЦ, аквапарки, парки аттракционов и главные достопримечательности города «${esc(city.name)}». Нажмите на место в списке, и карта покажет его.</p>
    <div class="places"><div class="map" id="map"></div><div class="place-side">
      <div class="place-filter"><button class="chip plain" data-pk="" aria-pressed="true">Все · ${pl.length}</button>${kinds.map(k=>`<button class="chip" data-pk="${k}" aria-pressed="false"><span class="st" ${tint(PLACE[k])}>${I(PLACE[k][1])}</span>${PLACE[k][0]} · ${pl.filter(p=>p.type===k).length}</button>`).join('')}</div>
      <div class="place-list">${pl.length?pl.map((p,i)=>{const meta=PLACE[p.type]||PLACE.landmark;return`<div class="place" data-pi="${i}" data-type="${p.type}" role="button" tabindex="0"><span class="st" ${tint(meta)}>${I(meta[1])}</span><div><h4>${esc(p.name)}</h4><p>${esc(p.description||meta[0])}</p><div class="links">${p.website?`<a href="${esc(p.website)}" target="_blank" rel="noopener">Сайт ↗</a>`:''}<a href="https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}" target="_blank" rel="noopener">Маршрут ↗</a></div></div></div>`}).join(''):`<p class="muted">Для этого города места пока не собраны. Карта показывает центр города.</p>`}</div></div></div>
  </section>

  <section class="cp-sec"><h2>Бюджет <em>жизни</em></h2><p class="sub">Это редакционный сценарий для сравнения городов, а не замер рынка.</p>
    <div class="budget"><div class="bud-card"><div class="row between"><div class="bud-total">${money(b.total)} <small>/ месяц</small></div><div class="stepper" data-stepper="people"><button type="button" data-d="-1">−</button><output data-out="people">${F.people}</output><button type="button" data-d="1">+</button></div></div>
      <div class="bud-bar"><i style="width:${b.rent/b.total*100}%;background:var(--ink)"></i><i style="width:${b.daily/b.total*100}%;background:var(--accent);animation-delay:.15s"></i>${b.reserve?`<i style="width:${b.reserve/b.total*100}%;background:var(--gold);animation-delay:.3s"></i>`:''}</div>
      <div class="bud-legend"><div><i style="background:var(--ink)"></i>Аренда<b>${money(b.rent)}</b></div><div><i style="background:var(--accent)"></i>Еда, транспорт, быт<b>${money(b.daily)}</b></div>${b.reserve?`<div><i style="background:var(--gold)"></i>Запас 20%<b>${money(b.reserve)}</b></div>`:''}</div>
      <div class="srcs" style="margin-top:18px"><a href="${esc(c.portalUrl)}" target="_blank" rel="noopener">${I('home')}Аренда: ${esc(c.portal)}</a>${(c.rentalChecks||[]).filter(r=>r.url).slice(0,2).map(r=>`<a href="${esc(r.url)}" target="_blank" rel="noopener">${I('ext')}${esc(r.portal)}</a>`).join('')}</div></div>
    <div class="bud-card"><h4 style="margin:0 0 8px;font-size:.78rem;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Цены на месте</h4>${obs?`<div class="prices">${obs.items.map(([n,v])=>`<div><span>${esc(n)}</span><b>${v} ${esc(obs.currency)}${lr?` <span class="muted">≈ ${money(v/lr)}</span>`:''}</b></div>`).join('')}</div><p class="hint" style="font-size:.78rem;color:var(--muted)">Источник: <a href="${esc(obs.url)}" target="_blank" rel="noopener">Numbeo</a></p>`:`<p class="muted" style="font-size:.92rem">Подробных цен по этому городу нет. Мы не выдумываем их: сверьтесь с порталами аренды и местными магазинами.</p><p style="font-size:.9rem">${esc(city.costSource)}</p>`}</div></div>
  </section>

  ${notes.length||city.features?`<section class="cp-sec"><h2>Жизнь в <em>городе</em></h2><p class="sub">${esc(city.features)}</p><div class="notes">${notes.map((n,i)=>{const meta=[['Транспорт','bus','#D6E6EE','#3D6E8F'],['Досуг','sparkle','#F8DCCF','#B83E26'],['Важно знать','info','#F3E4BF','#8A6412']][i]||['','info','#eee','#333'];return`<div class="note"><span class="st" ${tint(meta)}>${I(meta[1])}</span><h4>${meta[0]}</h4><p>${esc(n)}</p></div>`}).join('')}</div></section>`:''}

  <section class="cp-sec"><h2>Источники</h2><p class="sub">${esc(c.social||'')}</p><div class="srcs">${(c.sources||[]).map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener">${I('ext')}${esc(s.title)}</a>`).join('')}<a href="${esc(c.official)}" target="_blank" rel="noopener">${I('shield')}Официальный сайт</a></div>
    ${c.confidence?`<p class="disclaimer">${esc(c.confidence)}</p>`:''}</section>`;
  hydrate($('#cpIn'));
  $('#cpIn').querySelectorAll('[data-city-tab]').forEach(b=>b.onclick=()=>{curCity=c.cities.find(x=>x.id===b.dataset.cityTab);history.replaceState(null,'',`#/${c.id}/${curCity.id}`);renderCity()});
  setupGallery(ph);setupMap(pl,cid);
  if(fk){const el=$('#cpIn').querySelector(`[data-in="${fk}"]`);el.focus({preventScroll:true});try{el.setSelectionRange(pos,pos)}catch{}}
}
function setupGallery(ph){
  clearInterval(galTimer);const tr=cp.querySelector('.gal-track');if(!tr)return;
  const figs=[...tr.children],prog=[...cp.querySelectorAll('.gal-progress i')],th=[...cp.querySelectorAll('[data-th]')];let k=0,paused=false;
  const mark=i=>{k=i;cp.querySelector('.gal-count b').textContent=i+1;th.forEach((t,j)=>t.setAttribute('aria-current',j===i));prog.forEach((p,j)=>{p.className=j<i?'done':j===i?'on':'';});th[i]?.scrollIntoView({block:'nearest',inline:'nearest'})};
  const go=i=>{i=(i+figs.length)%figs.length;tr.scrollTo({left:i*tr.clientWidth,behavior:RM?'auto':'smooth'});mark(i)};
  let st;tr.addEventListener('scroll',()=>{clearTimeout(st);st=setTimeout(()=>{const i=Math.round(tr.scrollLeft/tr.clientWidth);if(i!==k)mark(i)},60)});
  cp.querySelector('.gal-nav.prev')?.addEventListener('click',()=>{paused=true;go(k-1)});
  cp.querySelector('.gal-nav.next')?.addEventListener('click',()=>{paused=true;go(k+1)});
  th.forEach(t=>t.onclick=()=>{paused=true;go(+t.dataset.th)});
  tr.addEventListener('pointerdown',()=>paused=true);
  figs.forEach(f=>{f.onclick=e=>{if(e.target.closest('a'))return;openLightbox(ph,+f.dataset.lb)};f.querySelector('img').onerror=()=>{f.remove()}});
  mark(0);
  if(figs.length>1&&!RM)galTimer=setInterval(()=>{if(!paused&&!document.hidden&&$('#lightbox').hidden)go(k+1)},5000);
}
function setupMap(pl,cid){
  const el=$('#map');if(!el||!window.L)return;
  const center=coords[cid]||(pl[0]&&{lat:pl[0].lat,lng:pl[0].lng});if(!center){el.innerHTML='<p class="muted" style="padding:20px">Координаты недоступны</p>';return}
  map=L.map(el,{scrollWheelZoom:false,zoomControl:true,zoomAnimation:false,markerZoomAnimation:false}).setView([center.lat,center.lng],12);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:19}).addTo(map);
  const mk=pl.map((p,i)=>{const meta=PLACE[p.type]||PLACE.landmark;const icon=L.divIcon({className:'',html:`<div class="pin" style="--tone:${meta[3]}">${I(meta[1])}</div>`,iconSize:[38,38],iconAnchor:[19,38],popupAnchor:[0,-36]});
    return L.marker([p.lat,p.lng],{icon}).addTo(map).bindPopup(`<b>${esc(p.name)}</b><br><span style="color:#7A7466">${esc(meta[0])}</span>${p.website?`<br><a href="${esc(p.website)}" target="_blank" rel="noopener">Сайт ↗</a>`:''}`).on('click',()=>hl(i,false))});
  if(pl.length>1)map.fitBounds(L.latLngBounds(pl.map(p=>[p.lat,p.lng])).pad(.15),{maxZoom:13,animate:false});
  const list=[...cp.querySelectorAll('.place')];
  function hl(i,fly=true){list.forEach((l,j)=>l.classList.toggle('on',j===i));mk.forEach((m,j)=>m.getElement()?.firstChild?.classList.toggle('on',j===i));if(fly){map.flyTo(mk[i].getLatLng(),15,{duration:RM?0:.9});mk[i].openPopup();if(innerWidth<900)$('#map').scrollIntoView({behavior:'smooth',block:'center'})}else list[i]?.scrollIntoView({block:'nearest',behavior:'smooth'})}
  list.forEach((l,i)=>{l.onclick=e=>{if(!e.target.closest('a'))hl(i)};l.onkeydown=e=>{if(e.key==='Enter')hl(i)}});
  cp.querySelectorAll('[data-pk]').forEach(b=>b.onclick=()=>{const k=b.dataset.pk;cp.querySelectorAll('[data-pk]').forEach(x=>x.setAttribute('aria-pressed',x===b));const vis=[];
    list.forEach((l,i)=>{const on=!k||l.dataset.type===k;l.hidden=!on;on?(mk[i].addTo(map),vis.push(pl[i])):mk[i].remove()});
    if(vis.length>1)map.flyToBounds(L.latLngBounds(vis.map(p=>[p.lat,p.lng])).pad(.2),{maxZoom:14,duration:RM?0:.8});else if(vis[0])map.flyTo([vis[0].lat,vis[0].lng],14)});
  setTimeout(()=>map?.invalidateSize(),500);
}
function openLightbox(ph,start){
  const lb=$('#lightbox');lb.hidden=false;
  lb.innerHTML=`<button class="icon-btn lb-close" aria-label="Закрыть">${svg('close')}</button><div class="lb-track">${ph.map(p=>`<figure><img src="${esc(p.src)}" alt=""></figure>`).join('')}</div><div class="lb-cap"></div>`;
  const tr=lb.querySelector('.lb-track'),cap=lb.querySelector('.lb-cap');
  const upd=()=>{const i=Math.round(tr.scrollLeft/tr.clientWidth),p=ph[i];if(p)cap.innerHTML=`${i+1} / ${ph.length} · ${esc(p.title||'')} · ${esc(p.author||'')} · <a href="${esc(p.source)}" target="_blank" rel="noopener">${esc(p.license||'')}</a>`};
  void lb.offsetWidth;tr.scrollLeft=start*tr.clientWidth;upd();lb.classList.add('on');
  tr.onscroll=upd;
  const close=()=>{lb.classList.remove('on');setTimeout(()=>{lb.hidden=true;lb.innerHTML=''},300);document.removeEventListener('keydown',key)};
  const key=e=>{if(e.key==='Escape')close();if(e.key==='ArrowRight')tr.scrollBy({left:tr.clientWidth,behavior:'smooth'});if(e.key==='ArrowLeft')tr.scrollBy({left:-tr.clientWidth,behavior:'smooth'})};
  document.addEventListener('keydown',key);lb.querySelector('.lb-close').onclick=close;
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#lightbox').hidden){if($('#filters').classList.contains('on'))closeFilters();else closeCountry()}});
$('#backdrop').onclick=()=>{if($('#filters').classList.contains('on'))closeFilters()};
function route(){const m=location.hash.match(/^#\/([\w-]+)(?:\/([\w-]+))?/);if(m&&byId[m[1]])renderCountry(byId[m[1]],m[2]);else closeCountry(false)}
addEventListener('popstate',route);

/* ---------- filter sheet (mobile) ---------- */
const openFilters=()=>{$('#filters').classList.add('on');$('#backdrop').hidden=false;void document.body.offsetWidth;$('#backdrop').classList.add('on');document.body.classList.add('lock')};
const closeFilters=()=>{$('#filters').classList.remove('on');if(cp.hidden){$('#backdrop').classList.remove('on');setTimeout(()=>{if(cp.hidden)$('#backdrop').hidden=true},400);document.body.classList.remove('lock')}};
$('#fOpen').onclick=openFilters;$('#fClose').onclick=closeFilters;
$('#fApply').onclick=()=>{closeFilters();$('#found').scrollIntoView({behavior:'smooth',block:'center'})};
$('#fReset').onclick=reset;$('#emptyReset').onclick=reset;$('#toAny').onclick=()=>set({matchMode:'any'});
$('#search').oninput=e=>{F.search=e.target.value;renderGrid()};
$('#sort').onchange=e=>set({sort:e.target.value});
$('#currency').onclick=e=>{const b=e.target.closest('[data-cur]');if(!b||b.dataset.cur===F.currency)return;const k=(rates[b.dataset.cur]||1)/rate();const conv=v=>v===''?'':String(Math.round(+v*k/(b.dataset.cur==='RUB'?1000:10))*(b.dataset.cur==='RUB'?1000:10));set({currency:b.dataset.cur,income:conv(F.income),savings:conv(F.savings),maxRent:conv(F.maxRent)})};

/* ---------- motion ---------- */
let ro;function observeReveal(){ro??=new IntersectionObserver(en=>en.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');ro.unobserve(x.target)}}),{threshold:.12});document.querySelectorAll('.reveal:not(.in)').forEach(e=>ro.observe(e))}
addEventListener('scroll',()=>$('#top').classList.toggle('scrolled',scrollY>10),{passive:true});
if(matchMedia('(hover:hover)').matches&&!RM)document.addEventListener('mousemove',e=>{const b=e.target.closest('.magnet');document.querySelectorAll('.magnet').forEach(m=>{if(m!==b)m.style.transform=''});if(!b)return;const r=b.getBoundingClientRect();b.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.08}px,${(e.clientY-r.top-r.height/2)*.25}px)`});

function renderAll(){
  syncControls();renderGrid();
  document.querySelectorAll('.dcard .price').forEach(p=>p.textContent=money(+p.dataset.usd)+'/мес');
  if(!cp.hidden&&curC)renderCity();
  if(collCur!==F.currency){collCur=F.currency;renderCollections()}
}
let collCur;
buildFilters();buildHero();hydrate();updSaved();renderAll();observeReveal();route();
