import {defaultFilters, tagNames, monthly, findMatches, durationMonths, evaluateRoute} from './core.js';
import {icon} from './icons.js';

// DOM Utilities
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = u => {
  try {
    const url = new URL(u, location.href);
    return ['http:', 'https:'].includes(url.protocol) ? esc(u) : '#';
  } catch {
    return '#';
  }
};

const readStorage = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; }
};
const writeStorage = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
};

// Global App State
let countries = [];
let photos = {};
let galleries = {};
let places = {};
let cityCoordinates = {};
let visaRoutes = {};
let observed = {};
let rates = {USD: 1, RUB: 80.53, EUR: 0.897};
let rateDate = '';

let f = {
  ...defaultFilters,
  currency: readStorage('gd-currency', 'RUB'),
  tags: []
};
if (!['USD', 'RUB', 'EUR'].includes(f.currency)) f.currency = 'RUB';

let saved = readStorage('gd-saved', []);
if (!Array.isArray(saved)) saved = [];

let compare = [];
let visible = 9;
let selected = null;
let selectedCity = null;
let detailTab = 'overview';
let lastTrigger = null;

// Multi-photo carousel indices per country card: { [countryId]: photoIndex }
const cardPhotoIdx = {};
let detailPhotoIdx = 0;
let leafletMap = null;
let leafletMarkers = [];

const currencySymbols = {USD: '$', RUB: '₽', EUR: '€'};

function money(usd, curr = f.currency) {
  const rate = rates[curr] || 1;
  const val = Math.round(usd * rate);
  const sym = currencySymbols[curr] || curr + ' ';
  return curr === 'RUB' 
    ? new Intl.NumberFormat('ru-RU').format(val) + ' ₽'
    : (sym + new Intl.NumberFormat('ru-RU').format(val));
}

function localMoney(value, curr) {
  return new Intl.NumberFormat('ru-RU', {maximumFractionDigits: value < 100 ? 2 : 0}).format(value) + ' ' + curr;
}

function fmtNative(value, curr) {
  return money(value / (rates[curr] || 1));
}

function plural(n, forms) {
  const m = n % 100;
  return forms[m > 10 && m < 20 ? 2 : n % 10 === 1 ? 0 : n % 10 > 1 && n % 10 < 5 ? 1 : 2];
}

const toast = text => {
  const el = $('#toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('visible'), 3200);
};

// Render SVG icons into any container with [data-icon]
function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    const name = el.getAttribute('data-icon');
    if (name) {
      el.innerHTML = icon(name);
      el.removeAttribute('data-icon');
    }
  });
}

// Get photo array for a city
function getCityPhotos(city) {
  if (city && city.gallery && city.gallery.length) {
    return city.gallery;
  }
  if (city && photos[city.id]) {
    return [photos[city.id]];
  }
  if (galleries[city?.id]) {
    return galleries[city.id];
  }
  return [];
}

// Update URL parameters
function syncURL() {
  const params = new URLSearchParams();
  params.set('currency', f.currency);
  if ($('#origin') && $('#origin').value !== 'Россия') params.set('origin', $('#origin').value);
  for (const [k, v] of Object.entries(f)) {
    if (['currency', 'saved', 'income', 'savings'].includes(k)) continue;
    if (Array.isArray(v)) {
      if (v.length) params.set(k, v.join(','));
    } else if (v !== defaultFilters[k] && v !== '') {
      params.set(k, String(v));
    }
  }
  if (selected) {
    params.set('country', selected.id);
    if (selectedCity) params.set('city', selectedCity.id);
  }
  const url = location.pathname + (params.size ? '?' + params : '') + location.hash;
  history.replaceState(null, '', url);
}

// Currency switch
function updateCurrency() {
  const old = f.currency;
  f.currency = $('#currency').value;
  writeStorage('gd-currency', f.currency);

  for (const id of ['income', 'maxRent', 'savings']) {
    const el = $('#' + id);
    if (el && f[id] !== '') {
      f[id] = Math.round(Number(f[id]) / (rates[old] || 1) * (rates[f.currency] || 1));
      el.value = f[id];
    }
  }
  $$('.currency-code').forEach(el => el.textContent = f.currency);
  render();
  renderCollections();
  if (selected) renderDetail();
}

// Render the main catalog of countries
function render() {
  const matches = findMatches(countries, f, rates, saved);

  // Update counts
  if ($('#resultCount')) {
    $('#resultCount').textContent = matches.length + ' ' + plural(matches.length, ['страна', 'страны', 'стран']);
  }
  if ($('#filterResultPreview')) {
    $('#filterResultPreview').textContent = matches.length 
      ? `Подходит: ${matches.length} ${plural(matches.length, ['страна', 'страны', 'стран'])}`
      : 'Нет совпадений — попробуйте смягчить фильтры';
  }
  if ($('#savedCount')) {
    $('#savedCount').textContent = saved.length;
  }
  if ($('#compareCount')) {
    $('#compareCount').textContent = compare.length;
  }

  // Active filter chips bar
  const activeChips = [];
  if (f.search) activeChips.push(['search', 'Поиск: ' + f.search]);
  if (f.region) activeChips.push(['region', 'Регион: ' + f.region]);
  if (f.durationAmount) activeChips.push(['duration', `Срок: ${f.durationAmount} ${f.durationUnit === 'years' ? 'лет' : 'мес.'}`]);
  if (f.routeType) {
    const names = {visaFree: 'Без визы', nomad: 'Digital Nomad', residence: 'ВНЖ', work: 'Работа/Бизнес', study: 'Учёба'};
    activeChips.push(['routeType', names[f.routeType] || f.routeType]);
  }
  if (f.income !== '') activeChips.push(['income', 'Доход: ' + money(Number(f.income) / (rates[f.currency] || 1))]);
  if (f.maxRent !== '') activeChips.push(['maxRent', 'Аренда: до ' + money(Number(f.maxRent) / (rates[f.currency] || 1))]);
  if (f.housing) {
    const names = {condo: 'Кондо', house: 'Дом', apartment: 'Квартира'};
    activeChips.push(['housing', names[f.housing] || f.housing]);
  }
  for (const t of f.tags) {
    activeChips.push(['tag:' + t, tagNames[t] || t]);
  }
  if (f.matchMode === 'any' && f.tags.length > 1) {
    activeChips.push(['matchMode', 'Логика: Хотя бы одно']);
  }
  if (f.visaFree) activeChips.push(['visaFree', 'Без визы на старте']);
  if (f.allowRenewal) activeChips.push(['allowRenewal', 'С продлением']);
  if (f.verifiedOnly) activeChips.push(['verifiedOnly', 'Проверенные регламенты']);
  if (f.russian) activeChips.push(['russian', 'Русский язык']);
  if (f.english) activeChips.push(['english', 'Английский язык']);
  if (f.climate) {
    const cNames = {tropical: 'Тропики', temperate: 'Умеренный климат', cold: 'Снежная зима'};
    activeChips.push(['climate', cNames[f.climate] || f.climate]);
  }
  if (f.funding === 'savings') activeChips.push(['funding', 'Жить на накопления']);
  if (f.saved) activeChips.push(['saved', 'Только избранное']);

  if ($('#activeFilters')) {
    $('#activeFilters').innerHTML = activeChips.map(([k, label]) => 
      `<button class="active-filter-tag" data-remove="${esc(k)}">${esc(label)} ✕</button>`
    ).join('');
  }
  if ($('#filterCount')) {
    $('#filterCount').textContent = activeChips.length || '0';
  }

  // Country Grid
  const gridEl = $('#countryGrid');
  if (!gridEl) return;

  if (!matches.length) {
    gridEl.innerHTML = `
      <div class="empty-catalog-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: rgba(255,255,255,0.02); border-radius: 20px; border: 1px dashed rgba(255,255,255,0.1);">
        <span style="font-size: 42px; display: block; margin-bottom: 14px;">🌍</span>
        <h3 style="font-size: 22px; margin-bottom: 8px; color: #fff;">Ничего не найдено под этот запрос</h3>
        <p style="font-size: 14px; color: #94a3b8; max-width: 500px; margin: 0 auto 20px;">
          Попробуйте включить переключатель «Хотя бы одно совпадение», увеличить максимальный бюджет или убрать строгие визовые ограничения.
        </p>
        <button id="emptyResetBtn" class="button button-gold">Сбросить фильтры</button>
      </div>
    `;
    const btn = $('#emptyResetBtn');
    if (btn) btn.onclick = resetFilters;
  } else {
    gridEl.innerHTML = matches.slice(0, visible).map(({country: c, city, budget, cities}) => {
      const cityList = cities.length ? cities : c.cities;
      const primaryCity = city || cityList[0];
      const cityPhotosList = getCityPhotos(primaryCity);
      const photoCount = cityPhotosList.length || 1;
      const curPhotoIdx = cardPhotoIdx[c.id] || 0;
      const curSafeIdx = Math.min(curPhotoIdx, photoCount - 1);
      const isSaved = saved.includes(c.id);
      const isCompared = compare.includes(c.id);

      // Carousel slides markup
      const slidesMarkup = cityPhotosList.length 
        ? cityPhotosList.map((p, idx) => `
            <div class="card-carousel-slide ${idx === curSafeIdx ? 'active' : ''}" data-slide-index="${idx}">
              <img src="./${esc(p.src)}" alt="${esc(primaryCity.name)} — фото города" loading="lazy" decoding="async">
            </div>
          `).join('')
        : `<div class="card-carousel-slide active"><img src="./assets/cities/${esc(c.id)}-0.jpg" alt="${esc(c.name)}" loading="lazy"></div>`;

      // Carousel dots markup
      const dotsMarkup = photoCount > 1 
        ? `<div class="card-dots" data-dots-country="${c.id}">
             ${Array.from({length: photoCount}).map((_, i) => `<span class="card-dot ${i === curSafeIdx ? 'active' : ''}" data-dot="${i}"></span>`).join('')}
           </div>`
        : '';

      // Visa badge label
      let badgeHtml = '';
      if (c.longType === 'free') {
        badgeHtml = `<span class="visa-badge visa-badge-gold">Год без визы</span>`;
      } else if (c.routes && c.routes.some(r => r.type === 'nomad')) {
        badgeHtml = `<span class="visa-badge visa-badge-teal">Digital Nomad</span>`;
      } else if (c.verified) {
        badgeHtml = `<span class="visa-badge visa-badge-glass">ВНЖ проверен</span>`;
      }

      // Lifestyle tags
      const tagPills = primaryCity.tags.slice(0, 3).map(t => 
        `<span class="tag-chip ${f.tags.includes(t) ? 'tag-highlight' : ''}">${esc(tagNames[t] || t)}</span>`
      ).join('');

      return `
        <article class="country-card" data-country-id="${c.id}">
          <div class="card-media-wrap">
            ${slidesMarkup}
            <div class="card-gradient-wash"></div>

            <!-- Top Badges & Actions -->
            <div class="card-top-left">
              ${badgeHtml}
            </div>

            <button class="card-bookmark-btn ${isSaved ? 'is-saved' : ''}" data-save-id="${c.id}" aria-label="Сохранить ${esc(c.name)}" aria-pressed="${isSaved}">
              ${icon('heart')}
            </button>

            <!-- Carousel Controls if multiple photos -->
            ${photoCount > 1 ? `
              <button class="card-nav-btn card-nav-prev" data-nav-dir="prev" data-country="${c.id}" aria-label="Предыдущее фото">
                ${icon('chevron', 'rotate-180')}
              </button>
              <button class="card-nav-btn card-nav-next" data-nav-dir="next" data-country="${c.id}" aria-label="Следующее фото">
                ${icon('chevron')}
              </button>
              ${dotsMarkup}
              <span class="card-counter-tag">${curSafeIdx + 1} / ${photoCount}</span>
            ` : ''}

            <div class="card-location-tag">
              ${icon('pin')}
              <span>${esc(primaryCity.name)}, ${esc(c.name)}</span>
            </div>
          </div>

          <div class="card-content">
            <div class="card-title-row">
              <h3 class="country-title">
                <span class="country-flag">${c.flag}</span>
                <span>${esc(c.name)}</span>
              </h3>
            </div>
            <div class="card-subtitle">
              ${esc(c.region)} · ${cityList.length} ${plural(cityList.length, ['исследованный город', 'исследованных города', 'исследованных городов'])}
            </div>

            <!-- Budget Box -->
            <div class="card-budget-box">
              <div class="budget-primary">
                <span class="budget-amount">${money(budget.total)}</span>
                <span class="budget-period">в месяц · ${f.people} чел.</span>
              </div>
              <div class="budget-breakdown">
                <span>Аренда: ${money(budget.rent)}</span>
                <span>Расходы: ${money(budget.daily)}</span>
              </div>
            </div>

            <!-- Tags -->
            <div class="card-tags-row">
              ${tagPills}
              ${c.verified ? `<span class="tag-chip">${icon('shield')} Регламент 2026</span>` : ''}
            </div>

            <!-- Bottom Actions -->
            <div class="card-bottom-row">
              <button class="card-open-btn" data-open-country="${c.id}" data-open-city="${primaryCity.id}">
                <span>О стране и ВНЖ</span>
                ${icon('diagonal')}
              </button>

              <label class="compare-checkbox-label">
                <input type="checkbox" data-compare-id="${c.id}" ${isCompared ? 'checked' : ''}>
                <span>Сравнить</span>
              </label>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  // Load more button
  if ($('#loadMore')) {
    $('#loadMore').hidden = matches.length <= visible;
  }

  // Compare dock visibility
  const dock = $('#compareDock');
  if (dock) {
    dock.hidden = compare.length < 2;
    if ($('#dockCount')) $('#dockCount').textContent = compare.length;
  }

  hydrateIcons(gridEl);
  syncURL();
}

// Reset all filters
function resetFilters() {
  f = {
    ...defaultFilters,
    currency: f.currency,
    tags: []
  };
  visible = 9;
  syncInputs();
  render();
  toast('Все фильтры сброшены');
}

// Sync filter UI inputs with state f
function syncInputs() {
  if ($('#search')) $('#search').value = f.search || '';
  if ($('#income')) $('#income').value = f.income || '';
  if ($('#maxRent')) $('#maxRent').value = f.maxRent || '';
  if ($('#savings')) $('#savings').value = f.savings || '';
  if ($('#people')) $('#people').value = String(f.people || 1);
  if ($('#durationAmount')) $('#durationAmount').value = f.durationAmount || '';
  if ($('#durationUnit')) $('#durationUnit').value = f.durationUnit || 'months';
  if ($('#region')) $('#region').value = f.region || '';
  if ($('#climate')) $('#climate').value = f.climate || '';
  if ($('#bureaucracy')) $('#bureaucracy').value = f.bureaucracy || '';
  if ($('#citizenship')) $('#citizenship').value = f.citizenship || '';
  if ($('#sort')) $('#sort').value = f.sort || 'recommended';

  if ($('#reserve')) $('#reserve').checked = Boolean(f.reserve);
  if ($('#allowRenewal')) $('#allowRenewal').checked = Boolean(f.allowRenewal);
  if ($('#visaFree')) $('#visaFree').checked = Boolean(f.visaFree);
  if ($('#verifiedOnly')) $('#verifiedOnly').checked = Boolean(f.verifiedOnly);
  if ($('#russian')) $('#russian').checked = Boolean(f.russian);
  if ($('#english')) $('#english').checked = Boolean(f.english);

  // Match Mode
  $$('.match-mode-card .segment-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.match === f.matchMode);
  });

  // Housing buttons
  $$('#housingButtons .h-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.housing === f.housing);
  });

  // Visa route type pills
  $$('#visaTypeFilters .v-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.routeType === f.routeType);
  });

  // Funding buttons
  $$('[data-funding]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.funding === f.funding);
  });

  // Lifestyle cards
  $$('.preference-card').forEach(card => {
    card.classList.toggle('active', f.tags.includes(card.dataset.tag));
  });

  // Currency select
  if ($('#currency')) $('#currency').value = f.currency;
}

// Preset shortcuts
function applyPreset(name) {
  resetFilters();
  if (name === 'sea') {
    f.tags = ['sea', 'beach'];
    f.matchMode = 'any';
  } else if (name === 'nomad') {
    f.routeType = 'nomad';
    f.tags = ['work'];
  } else if (name === 'budget') {
    f.income = Math.round(1200 * (rates[f.currency] || 1));
    f.sort = 'budget';
  } else if (name === 'withoutjob') {
    f.easyStay = true;
    toast('Показаны страны с длительным безвизовым въездом для граждан РФ.');
  } else if (name === 'europe') {
    f.region = 'Европа';
  }
  syncInputs();
  render();
  $('#destinations')?.scrollIntoView({behavior: 'smooth'});
}

// Curated collections
function renderCollections() {
  const collectionData = [
    {
      preset: 'withoutjob',
      img: './assets/cities/georgia-1.jpg',
      label: '01 / ПРОСТОЙ СТАРТ',
      title: 'Уехать без рабочей визы',
      desc: 'Годовой безвиз и комфортная жизнь при наличии удалёнки или накоплений.'
    },
    {
      preset: 'nomad',
      img: './assets/cities/portugal-0.jpg',
      label: '02 / DIGITAL NOMAD',
      title: 'Официальные визы кочевников',
      desc: 'Европа, Азия и Латинская Америка с легальным статусом для удалёнщиков.'
    },
    {
      preset: 'sea',
      img: './assets/cities/thailand-2.jpg',
      label: '03 / ВМЕСТО ЗИМЫ',
      title: 'Тёплое море круглый год',
      desc: 'Пляжи, свежие фрукты, солнце и европейский уровень сервиса.'
    },
    {
      preset: 'budget',
      img: './assets/cities/vietnam-1.jpg',
      label: '04 / УМНЫЙ БЮДЖЕТ',
      title: 'Качественная жизнь до ' + money(1200),
      desc: 'Комфортные кондоминиумы с бассейном и отличной инфраструктурой.'
    }
  ];

  const container = $('#collectionGrid');
  if (!container) return;

  container.innerHTML = collectionData.map(item => `
    <button class="collection-card" data-preset="${item.preset}">
      <img src="${item.img}" alt="${esc(item.title)}" class="collection-bg-img" loading="lazy">
      <div class="collection-overlay"></div>
      <div class="collection-body">
        <span class="collection-kicker">${item.label}</span>
        <h3 class="collection-title">${item.title}</h3>
        <p class="collection-desc">${item.desc}</p>
      </div>
    </button>
  `).join('');
}

// Detail View / Country Modal
function openCountry(countryId, cityId) {
  selected = countries.find(c => c.id === countryId);
  if (!selected) return;
  selectedCity = selected.cities.find(c => c.id === cityId) || selected.cities[0];
  detailTab = 'overview';
  detailPhotoIdx = 0;
  lastTrigger = document.activeElement;

  renderDetail();
  const dialog = $('#detailDialog');
  if (dialog && !dialog.open) {
    dialog.showModal();
    dialog.scrollTop = 0;
  }
  syncURL();
}

function closeDetail() {
  const dialog = $('#detailDialog');
  if (dialog && dialog.open) dialog.close();
  selected = null;
  selectedCity = null;
  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
  }
  syncURL();
  lastTrigger?.focus?.();
}

// Render the inside of the detail modal
function renderDetail() {
  const c = selected;
  const city = selectedCity;
  if (!c || !city) return;

  const m = monthly(city, +f.people, f.housing, f.reserve);
  const cityPhotos = getCityPhotos(city);
  const totalPhotos = cityPhotos.length || 1;
  const currentPhoto = cityPhotos[detailPhotoIdx] || {src: `assets/cities/${c.id}-0.jpg`, title: city.name, attribution: ''};

  // Costs breakdown array
  const costs = [
    ['Аренда жилья', m.rent, '#2dd4bf'],
    ['Продукты и кафе', Math.round(m.daily * 0.44), '#38bdf8'],
    ['Коммунальные и интернет', Math.round(m.daily * 0.20), '#818cf8'],
    ['Транспорт и авто', Math.round(m.daily * 0.12), '#f59e0b'],
    ['Досуг и отдых', Math.round(m.daily * 0.14), '#f43f5e']
  ];
  if (m.reserve) {
    costs.push(['Резерв 20%', m.reserve, '#fbbf24']);
  }

  // City Switcher Tabs
  const cityTabsMarkup = c.cities.map(ct => `
    <button class="detail-city-pill ${ct.id === city.id ? 'active' : ''}" data-detail-city="${ct.id}">
      ${esc(ct.name)}
    </button>
  `).join('');

  // Nav Bar Tabs
  const navTabs = [
    ['overview', 'Обзор'],
    ['visa', 'Визы и ВНЖ (Маршруты)'],
    ['map', 'Карта и популярные места'],
    ['costs', 'Бюджет и расходы'],
    ['daily', 'Жизнь в городе'],
    ['sources', 'Источники и методика']
  ];
  const navTabsMarkup = navTabs.map(([id, title]) => `
    <button class="detail-nav-btn ${detailTab === id ? 'active' : ''}" data-detail-tab="${id}">
      ${title}
    </button>
  `).join('');

  // Top Hero Carousel Header
  const headerMarkup = `
    <div class="detail-gallery-header">
      <div class="detail-gallery-slide active">
        <img src="./${esc(currentPhoto.src)}" alt="${esc(city.name)}">
      </div>
      <div class="detail-gallery-overlay"></div>

      <button class="detail-close-btn" id="closeDetailBtn" aria-label="Закрыть окно">
        ${icon('close')}
      </button>

      <div class="detail-header-copy">
        <span class="detail-topline">${esc(c.region)} · ${c.flag} ${esc(c.name)}</span>
        <h2 class="detail-city-title">${esc(city.name)}</h2>
        <p class="detail-city-desc">${city.capital ? 'Столица · ' : ''}${esc(city.features)}</p>
      </div>

      ${totalPhotos > 1 ? `
        <div class="detail-gallery-controls">
          <button class="detail-arrow-btn" id="detailPhotoPrev" aria-label="Предыдущее фото">
            ${icon('chevron', 'rotate-180')}
          </button>
          <span class="detail-photo-counter">${detailPhotoIdx + 1} из ${totalPhotos}</span>
          <button class="detail-arrow-btn" id="detailPhotoNext" aria-label="Следующее фото">
            ${icon('chevron')}
          </button>
        </div>
      ` : ''}
    </div>
  `;

  // Stats Grid
  const statsMarkup = `
    <div class="detail-stat-grid">
      <div class="detail-stat-card">
        <span class="detail-stat-label">БЮДЖЕТ НА МЕСЯЦ</span>
        <div class="detail-stat-val">${money(m.total)}</div>
        <span class="detail-stat-sub">оценка на ${f.people} чел.</span>
      </div>
      <div class="detail-stat-card">
        <span class="detail-stat-label">АРЕНДА ЖИЛЬЯ</span>
        <div class="detail-stat-val">${money(m.rent)}</div>
        <span class="detail-stat-sub">сценарный расчёт</span>
      </div>
      <div class="detail-stat-card">
        <span class="detail-stat-label">СРОК ПРЕБЫВАНИЯ</span>
        <div class="detail-stat-val" style="font-size: 18px; color: var(--accent-gold);">
          ${c.longType === 'free' ? 'Год без визы' : (c.routes && c.routes.length ? 'Есть ВНЖ' : 'Уточняется')}
        </div>
        <span class="detail-stat-sub">${c.verified ? 'регламент 2026' : 'правила обновляются'}</span>
      </div>
      <div class="detail-stat-card">
        <span class="detail-stat-label">ВАЛЮТА СТРАНЫ</span>
        <div class="detail-stat-val">${esc(c.currency)}</div>
        <span class="detail-stat-sub">$1 ≈ ${new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 2}).format(rates[c.currency] || 1)} ${esc(c.currency)}</span>
      </div>
    </div>
  `;

  // Tab 1: Overview
  const overviewTabContent = `
    <div class="detail-tab-pane">
      ${statsMarkup}
      <div class="pane-grid-2col">
        <div>
          <div class="detail-card-panel mb-4" style="background: rgba(255,255,255,0.035); padding: 22px; border-radius: 16px; border: 1px solid var(--border-subtle);">
            <h3 style="font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 10px;">Как устроена жизнь в ${esc(city.name)}</h3>
            <p style="font-size: 14.5px; color: #cbd5e1; line-height: 1.6; margin-bottom: 14px;">${esc(city.features)}</p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              ${city.tags.map(t => `<span class="tag-chip tag-highlight">${esc(tagNames[t] || t)}</span>`).join('')}
            </div>
          </div>

          <div class="detail-card-panel" style="background: rgba(255,255,255,0.035); padding: 22px; border-radius: 16px; border: 1px solid var(--border-subtle);">
            <h3 style="font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 10px;">Въезд с паспортом РФ</h3>
            <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin-bottom: 12px;">${esc(c.entry)}</p>
            <button class="button button-gold-sm" data-detail-tab="visa">Смотреть все визовые маршруты →</button>
          </div>
        </div>

        <div>
          <div class="detail-card-panel mb-4" style="background: rgba(255,255,255,0.035); padding: 22px; border-radius: 16px; border: 1px solid var(--border-subtle);">
            <h3 style="font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 10px;">Структура расходов в месяц</h3>
            <div class="expense-breakdown-chart">
              ${costs.map(x => `<span style="width: ${(x[1]/m.total)*100}%; background: ${x[2]};"></span>`).join('')}
            </div>
            <div class="expense-legend-grid">
              ${costs.map(x => `
                <div class="expense-row">
                  <span style="display: flex; align-items: center; gap: 6px;">
                    <i style="width: 8px; height: 8px; border-radius: 50%; background: ${x[2]}; display: inline-block;"></i>
                    ${x[0]}
                  </span>
                  <strong>${money(x[1])}</strong>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="detail-card-panel" style="background: rgba(255,255,255,0.035); padding: 22px; border-radius: 16px; border: 1px solid var(--border-subtle);">
            <h3 style="font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 10px;">Карта популярных мест</h3>
            <p style="font-size: 13.5px; color: #cbd5e1; margin-bottom: 14px;">
              Торговые центры, парки аттракционов, аквапарки и достопримечательности города с геолокацией.
            </p>
            <button class="button button-glass" data-detail-tab="map" style="width: 100%;">
              ${icon('map')} Открыть интерактивную карту мест
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Tab 2: Visa Routes (Detailed!)
  const routesList = c.routes || [];
  const visaTabContent = `
    <div class="detail-tab-pane">
      <div class="pane-intro">
        <div>
          <h3>Визовые маршруты и легализация в ${esc(c.name)}</h3>
          <p>Официальные регламенты, основания, требования к доходу и пошаговые инструкции.</p>
        </div>
        <span class="visa-badge visa-badge-gold">Паспорт РФ</span>
      </div>

      <div class="visa-routes-grid">
        ${routesList.length ? routesList.map(r => `
          <div class="route-card">
            <div class="route-card-header">
              <div>
                <span class="visa-badge ${r.type === 'nomad' ? 'visa-badge-teal' : r.type === 'visaFree' ? 'visa-badge-gold' : 'visa-badge-glass'}">
                  ${r.type === 'nomad' ? 'Digital Nomad' : r.type === 'visaFree' ? 'Без визы' : 'ВНЖ'}
                </span>
                <h4 class="route-card-title mt-2">${esc(r.title)}</h4>
              </div>
              ${r.incomeUSD ? `<div style="text-align: right;"><span style="font-size: 11px; color: #94a3b8;">ДОХОД ОТ</span><div style="font-size: 18px; font-weight: 800; color: var(--accent-gold);">${money(r.incomeUSD)} / мес</div></div>` : ''}
            </div>

            <div class="route-params-row">
              <div class="param-item">
                <strong>Срок пребывания</strong>
                <span>${r.durationMonths ? `${r.durationMonths} мес.` : (r.maxContinuousDays ? `${r.maxContinuousDays} дней` : 'По основанию')}</span>
              </div>
              <div class="param-item">
                <strong>Продление на месте</strong>
                <span>${r.renewable ? 'Возможно' : 'Требует выезда'}</span>
              </div>
              <div class="param-item">
                <strong>Право на работу</strong>
                <span>${esc(r.workRights || 'По согласованию')}</span>
              </div>
            </div>

            <div class="pane-grid-2col mt-3">
              <div>
                <h5 class="route-section-title">Требования и условия:</h5>
                <ul class="route-checklist">
                  ${(r.conditions || []).map(cond => `<li>${icon('check')} <span>${esc(cond)}</span></li>`).join('')}
                </ul>
              </div>

              <div>
                <h5 class="route-section-title">Необходимые документы:</h5>
                <ul class="route-checklist">
                  ${(r.documents || []).map(doc => `<li>${icon('passport')} <span>${esc(doc)}</span></li>`).join('')}
                </ul>
              </div>
            </div>

            ${r.steps && r.steps.length ? `
              <div class="mt-3">
                <h5 class="route-section-title">Порядок оформления:</h5>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px;">
                  ${r.steps.map((step, idx) => `
                    <div style="background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 8px; font-size: 12.5px; color: #cbd5e1; border: 1px solid var(--border-subtle);">
                      ${esc(step)}
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            ${r.source && r.source.url ? `
              <div class="mt-4 pt-3" style="border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 11px; color: #64748b;">Проверено по официальным источникам 2026</span>
                <a href="${safeUrl(r.source.url)}" target="_blank" rel="noopener noreferrer" class="route-official-link">
                  <span>${esc(r.source.title || 'Официальный регламент')}</span>
                  ${icon('diagonal')}
                </a>
              </div>
            ` : ''}
          </div>
        `).join('') : `
          <div class="route-card">
            <h4>Стандартные правила въезда</h4>
            <p>${esc(c.entry)}</p>
            <p>${esc(c.longStay)}</p>
            <p>${esc(c.residence)}</p>
          </div>
        `}
      </div>
    </div>
  `;

  // Tab 3: Interactive Map & Popular Places (ТЦ, аквапарки, парки аттракционов, достопримечательности)
  const cityPlaces = city.places || places[city.id] || [];
  const mapTabContent = `
    <div class="detail-tab-pane">
      <div class="pane-intro">
        <div>
          <h3>Популярные места в ${esc(city.name)}</h3>
          <p>Крупные торговые центры, парки аттракционов, аквапарки, достопримечательности и коворкинги.</p>
        </div>
      </div>

      <div class="map-view-container">
        <!-- Filter chips for POI categories -->
        <div class="places-filter-chips">
          <button class="place-chip active" data-poi-filter="all">Все места (${cityPlaces.length})</button>
          <button class="place-chip" data-poi-filter="mall">${icon('malls')} ТЦ и моллы</button>
          <button class="place-chip" data-poi-filter="themepark">${icon('themepark')} Парки аттракционов</button>
          <button class="place-chip" data-poi-filter="waterpark">${icon('waterpark')} Аквапарки</button>
          <button class="place-chip" data-poi-filter="landmark">${icon('landmark')} Достопримечательности</button>
        </div>

        <div class="map-layout-grid">
          <!-- Leaflet Map Container -->
          <div id="cityLeafletMap" class="leaflet-map-box"></div>

          <!-- Places Cards List -->
          <div class="places-cards-list" id="poiCardsList">
            ${cityPlaces.length ? cityPlaces.map(p => `
              <div class="poi-card" data-poi-id="${p.id}" data-lat="${p.lat}" data-lng="${p.lng}" data-poi-type="${p.type}">
                <div class="poi-header">
                  <h5 class="poi-name">${esc(p.name)}</h5>
                  <span class="poi-type-tag">${p.type === 'mall' ? 'Торговый центр' : p.type === 'themepark' ? 'Парк аттракционов' : p.type === 'waterpark' ? 'Аквапарк' : p.type === 'landmark' ? 'Достопримечательность' : 'Локация'}</span>
                </div>
                <p class="poi-desc">${esc(p.description)}</p>
                <div class="poi-meta">
                  <button class="poi-focus-btn" data-focus-lat="${p.lat}" data-focus-lng="${p.lng}">
                    ${icon('pin')} Показать на карте
                  </button>
                  ${p.website ? `<a href="${safeUrl(p.website)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-gold); font-size: 12px; display: inline-flex; align-items: center; gap: 3px;">Сайт места ↗</a>` : ''}
                </div>
              </div>
            `).join('') : `
              <div style="padding: 30px 20px; text-align: center; color: var(--text-muted);">
                ${icon('map')}
                <p style="margin-top: 8px;">Координаты города на карте отмечены. Для поиска конкретных ТЦ и парков воспользуйтесь картой.</p>
              </div>
            `}
          </div>
        </div>
      </div>
    </div>
  `;

  // Tab 4: Costs & Numbeo
  const obs = observed[city.id];
  const costsTabContent = `
    <div class="detail-tab-pane">
      <div class="pane-intro">
        <div>
          <h3>Смета жизни в ${esc(city.name)}</h3>
          <p>Расчёт на ${f.people} чел. с учётом аренды жилья и потребительской корзины.</p>
        </div>
      </div>

      <div class="pane-grid-2col">
        <div>
          <div style="background: rgba(255,255,255,0.035); padding: 22px; border-radius: 16px; border: 1px solid var(--border-subtle); margin-bottom: 20px;">
            <h4 style="font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 12px;">Статьи бюджета</h4>
            <div class="expense-breakdown-chart">
              ${costs.map(x => `<span style="width: ${(x[1]/m.total)*100}%; background: ${x[2]};"></span>`).join('')}
            </div>
            <table class="cost-table">
              <tbody>
                ${costs.map(x => `
                  <tr>
                    <td><i style="width: 8px; height: 8px; border-radius: 50%; background: ${x[2]}; display: inline-block; margin-right: 8px;"></i>${x[0]}</td>
                    <td style="text-align: right; font-weight: 700;">${money(x[1])}</td>
                  </tr>
                `).join('')}
                <tr style="border-top: 2px solid var(--border-subtle); font-size: 15px;">
                  <td><strong>Итого в месяц:</strong></td>
                  <td style="text-align: right; font-weight: 800; color: var(--accent-gold);">${money(m.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Currency Converter -->
          <div style="background: rgba(255,255,255,0.035); padding: 22px; border-radius: 16px; border: 1px solid var(--border-subtle);">
            <h4 style="font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 12px;">Быстрый конвертер валют</h4>
            <div style="display: flex; gap: 8px; margin-bottom: 10px;">
              <input id="convertAmount" type="number" min="0" value="1000" class="modern-input" style="background: rgba(0,0,0,0.4); border: 1px solid var(--border-subtle); padding: 8px 12px; border-radius: 8px;">
              <select id="convertFrom" class="modern-select" style="max-width: 110px;">
                <option value="USD">USD</option>
                <option value="RUB">RUB</option>
                <option value="EUR">EUR</option>
                <option value="${c.currency}">${c.currency}</option>
              </select>
            </div>
            <div id="convertResult" style="font-size: 14px; font-weight: 700; color: var(--accent-teal);"></div>
          </div>
        </div>

        <div>
          <!-- Numbeo Items -->
          <div style="background: rgba(255,255,255,0.035); padding: 22px; border-radius: 16px; border: 1px solid var(--border-subtle);">
            <h4 style="font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 8px;">Реальные ориентиры цен (Numbeo)</h4>
            ${obs ? `
              <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">Цены пересчитаны из местной валюты (${obs.currency}) по текущему курсу.</p>
              <table class="cost-table">
                <tbody>
                  ${obs.items.map(([title, val]) => `
                    <tr>
                      <td>${esc(title)}</td>
                      <td style="text-align: right;">
                        <strong>${fmtNative(val, obs.currency)}</strong><br>
                        <small style="color: var(--text-muted);">${localMoney(val, obs.currency)}</small>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div style="margin-top: 14px; text-align: right;">
                <a href="${safeUrl(obs.url)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-teal); font-size: 12px;">Сверить диапазон цен на Numbeo ↗</a>
              </div>
            ` : `
              <p style="font-size: 13.5px; color: var(--text-secondary); line-height: 1.6;">
                Точечные чеки на продукты по этому городу ещё калибруются. Общие сценарные расходы рассчитаны на основе регионального индекса цен.
              </p>
            `}
          </div>
        </div>
      </div>
    </div>
  `;

  // Tab 5: Daily Life
  const dailyTabContent = `
    <div class="detail-tab-pane">
      <div class="pane-intro">
        <div>
          <h3>Повседневная жизнь и адаптация в ${esc(city.name)}</h3>
          <p>Языковая среда, транспорт, комьюнити и практические нюансы.</p>
        </div>
      </div>

      <div class="pane-grid-2col">
        <div style="background: rgba(255,255,255,0.035); padding: 22px; border-radius: 16px; border: 1px solid var(--border-subtle);">
          <h4 style="font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 10px;">Языковая среда</h4>
          <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin-bottom: 14px;">
            Основной язык: <b>${esc(c.language)}</b>. 
            ${c.russian ? 'Русский язык достаточно широко понятен в сфере услуг и повседневном общении благодаря сформированному комьюнити.' : (c.english ? 'Английский язык широко используется в быту, ресторанах и при аренде жилья.' : 'В быту полезно владеть базовым английским и онлайн-переводчиком.')}
          </p>

          <h4 style="font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 10px;">Отношение к гражданам РФ</h4>
          <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">${esc(c.social || 'Бытовое отношение доброжелательное; юридические требования и процедуры оформления открыты.')}</p>
        </div>

        <div style="background: rgba(255,255,255,0.035); padding: 22px; border-radius: 16px; border: 1px solid var(--border-subtle);">
          <h4 style="font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 10px;">Поиск жилья и аренда</h4>
          <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin-bottom: 14px;">
            Для долгосрочной аренды используйте местный проверенный портал: 
            <a href="${safeUrl(c.portalUrl)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-gold); font-weight: 700;">${esc(c.portal)} ↗</a>.
          </p>
          <div class="alert-box-info">
            ${icon('info')}
            <span>Внимательно сверяйте депозит (обычно 1–2 месяца), регистрацию иностранца и возможность заключения договора на нужный срок.</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Tab 6: Sources
  const sourcesTabContent = `
    <div class="detail-tab-pane">
      <div class="pane-intro">
        <div>
          <h3>Официальные источники и методология</h3>
          <p>Мы не выдумываем миграционные правила — все данные верифицированы по официальным ведомствам.</p>
        </div>
      </div>

      <div style="background: rgba(255,255,255,0.035); padding: 24px; border-radius: 16px; border: 1px solid var(--border-subtle);">
        <h4 style="font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 12px;">Проверенные правительственные страницы:</h4>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
          ${(c.sources && c.sources.length) ? c.sources.map(s => `
            <a href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-teal); font-size: 14px; display: inline-flex; align-items: center; gap: 6px;">
              <span>${esc(s.title)}</span>
              ${icon('diagonal')}
            </a>
          `).join('') : '<p style="color: var(--text-muted);">Официальные регламенты на стадии верификации.</p>'}
        </div>

        <h4 style="font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 10px;">Фотография и лицензия:</h4>
        <p style="font-size: 12.5px; color: var(--text-muted); line-height: 1.6;">
          ${currentPhoto.author ? `Автор: ${esc(currentPhoto.author)} · ` : ''}
          ${currentPhoto.license ? `Лицензия: ${esc(currentPhoto.license)} · ` : ''}
          ${currentPhoto.source ? `<a href="${safeUrl(currentPhoto.source)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-gold);">Оригинальный снимок на Wikimedia Commons</a>` : ''}
        </p>
      </div>
    </div>
  `;

  // Assemble Complete Detail Dialog HTML
  const contentEl = $('#detailContent');
  if (!contentEl) return;

  contentEl.innerHTML = `
    ${headerMarkup}
    <div class="detail-cities-bar">${cityTabsMarkup}</div>
    <div class="detail-nav-bar">${navTabsMarkup}</div>
    <div class="detail-body-wrap">
      ${detailTab === 'overview' ? overviewTabContent :
        detailTab === 'visa' ? visaTabContent :
        detailTab === 'map' ? mapTabContent :
        detailTab === 'costs' ? costsTabContent :
        detailTab === 'daily' ? dailyTabContent : sourcesTabContent}
    </div>
  `;

  hydrateIcons(contentEl);

  // Bind Detail Events
  const closeBtn = $('#closeDetailBtn');
  if (closeBtn) closeBtn.onclick = closeDetail;

  const prevBtn = $('#detailPhotoPrev');
  if (prevBtn) {
    prevBtn.onclick = () => {
      detailPhotoIdx = (detailPhotoIdx - 1 + totalPhotos) % totalPhotos;
      renderDetail();
    };
  }

  const nextBtn = $('#detailPhotoNext');
  if (nextBtn) {
    nextBtn.onclick = () => {
      detailPhotoIdx = (detailPhotoIdx + 1) % totalPhotos;
      renderDetail();
    };
  }

  // City Selector
  $$('.detail-city-pill').forEach(btn => {
    btn.onclick = () => {
      const targetId = btn.dataset.detailCity;
      selectedCity = c.cities.find(ct => ct.id === targetId) || selectedCity;
      detailPhotoIdx = 0;
      renderDetail();
    };
  });

  // Tab Navigation
  $$('.detail-nav-btn').forEach(btn => {
    btn.onclick = () => {
      detailTab = btn.dataset.detailTab;
      renderDetail();
      if (detailTab === 'map') {
        setTimeout(initLeafletMap, 120);
      }
    };
  });

  // Direct tab triggers
  $$('[data-detail-tab]').forEach(btn => {
    if (!btn.classList.contains('detail-nav-btn')) {
      btn.onclick = () => {
        detailTab = btn.dataset.detailTab;
        renderDetail();
        if (detailTab === 'map') {
          setTimeout(initLeafletMap, 120);
        }
      };
    }
  });

  // Currency Converter inside modal
  if ($('#convertAmount')) {
    const doConvert = () => {
      const amt = Number($('#convertAmount').value);
      const from = $('#convertFrom').value;
      if (!Number.isFinite(amt) || amt < 0) {
        $('#convertResult').textContent = 'Введите положительную сумму';
        return;
      }
      const targets = ['RUB', 'USD', 'EUR', c.currency].filter((v, i, a) => a.indexOf(v) === i && v !== from);
      $('#convertResult').textContent = targets.map(t => money(amt / (rates[from] || 1), t)).join(' · ');
    };
    $('#convertAmount').oninput = doConvert;
    $('#convertFrom').onchange = doConvert;
    doConvert();
  }

  // If map tab was active, initialize leaflet
  if (detailTab === 'map') {
    setTimeout(initLeafletMap, 120);
  }
}

// Leaflet Map Initialization with CartoDB Dark Tiles
function initLeafletMap() {
  const mapEl = $('#cityLeafletMap');
  if (!mapEl || !window.L) return;

  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
    leafletMarkers = [];
  }

  const city = selectedCity;
  const coords = cityCoordinates[city.id] || {lat: 41.7225, lng: 44.7925};
  const centerLat = coords.lat || 41.72;
  const centerLng = coords.lng || 44.79;

  leafletMap = L.map('cityLeafletMap', {
    center: [centerLat, centerLng],
    zoom: 12,
    zoomControl: true,
    scrollWheelZoom: false
  });

  // High quality dark luxury CartoDB map tiles
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CartoDB &copy; OpenStreetMap',
    maxZoom: 19
  }).addTo(leafletMap);

  // Add City Center Marker
  const cityIcon = L.divIcon({
    className: 'custom-city-marker',
    html: `<div style="background: #f59e0b; color: #0b1419; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; font-size: 15px; box-shadow: 0 0 15px rgba(245, 158, 11, 0.7); border: 2px solid #fff;">📍</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34]
  });
  L.marker([centerLat, centerLng], {icon: cityIcon})
    .addTo(leafletMap)
    .bindPopup(`<b>${esc(city.name)}</b><br><small>Центр города</small>`);

  // Add POI Markers
  const cityPlaces = city.places || places[city.id] || [];
  leafletMarkers = [];

  cityPlaces.forEach(p => {
    if (!p.lat || !p.lng) return;
    const typeEmojis = {mall: '🛍', themepark: '🎢', waterpark: '💦', landmark: '🏛', museum: '🏛', coworking: '💻'};
    const emoji = typeEmojis[p.type] || '⭐️';

    const poiIcon = L.divIcon({
      className: 'custom-poi-marker',
      html: `<div style="background: rgba(14, 25, 34, 0.9); color: #fff; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; font-size: 16px; border: 2px solid #2dd4bf; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">${emoji}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    const marker = L.marker([p.lat, p.lng], {icon: poiIcon}).addTo(leafletMap);
    marker.bindPopup(`
      <div style="font-family: 'Golos Text', sans-serif; min-width: 180px; padding: 4px;">
        <strong style="font-size: 14px; color: #0f172a; display: block; margin-bottom: 2px;">${esc(p.name)}</strong>
        <p style="font-size: 12px; color: #475569; margin: 0 0 6px;">${esc(p.description)}</p>
        ${p.website ? `<a href="${safeUrl(p.website)}" target="_blank" rel="noopener noreferrer" style="color: #0d9488; font-size: 11px; font-weight: 700;">Открыть сайт места ↗</a>` : ''}
      </div>
    `);
    leafletMarkers.push({id: p.id, marker, lat: p.lat, lng: p.lng, type: p.type});
  });

  // Fit bounds if markers exist
  if (leafletMarkers.length) {
    const group = L.featureGroup([
      L.marker([centerLat, centerLng]),
      ...leafletMarkers.map(m => m.marker)
    ]);
    leafletMap.fitBounds(group.getBounds().pad(0.15));
  }

  // Connect POI List buttons to Map
  $$('.poi-card').forEach(card => {
    card.onclick = () => {
      const lat = Number(card.dataset.lat);
      const lng = Number(card.dataset.lng);
      const id = card.dataset.poiId;
      if (lat && lng && leafletMap) {
        leafletMap.flyTo([lat, lng], 14, {duration: 0.8});
        const match = leafletMarkers.find(m => m.id === id);
        if (match) match.marker.openPopup();
        $$('.poi-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      }
    };
  });

  // POI Category Filter chips
  $$('.places-filter-chips .place-chip').forEach(chip => {
    chip.onclick = () => {
      const type = chip.dataset.poiFilter;
      $$('.places-filter-chips .place-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      $$('.poi-card').forEach(card => {
        if (type === 'all' || card.dataset.poiType === type) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });

      leafletMarkers.forEach(m => {
        if (type === 'all' || m.type === type) {
          if (!leafletMap.hasLayer(m.marker)) leafletMap.addLayer(m.marker);
        } else {
          if (leafletMap.hasLayer(m.marker)) leafletMap.removeLayer(m.marker);
        }
      });
    };
  });
}

// Info Dialog (Methodology / Credits)
function openInfo(html) {
  const container = $('#infoContent');
  const dialog = $('#infoDialog');
  if (!container || !dialog) return;
  container.innerHTML = html;
  hydrateIcons(container);
  dialog.showModal();
}

function showMethodology() {
  openInfo(`
    <span class="section-kicker">ОТКРЫТАЯ МЕТОДИКА 2026</span>
    <h2 style="font-size: 26px; font-weight: 800; color: #fff; margin: 8px 0 16px;">Как устроены расчёты и данные</h2>
    <p style="font-size: 14.5px; color: #cbd5e1; line-height: 1.6; margin-bottom: 16px;">
      Каталог охватывает <b>68 стран</b> и <b>133 города</b>. Мы не берём случайные цифры из интернета и не рекламируем агентства.
    </p>

    <h3 style="font-size: 17px; font-weight: 700; color: var(--accent-gold); margin: 18px 0 8px;">1. Оценка бюджета жизни</h3>
    <p style="font-size: 13.5px; color: #cbd5e1; line-height: 1.6; margin-bottom: 12px;">
      Бюджет состоит из двух частей: долгосрочная аренда жилья (квартира/кондо/дом) плюс потребительская корзина по Numbeo. 
      Каждый взрослый спутник добавляет 70% повседневных расходов; с 3-го человека аренда увеличивается на 20%. 
      Опциональный резерв 20% защищает от валютных колебаний и непредвиденных трат.
    </p>

    <h3 style="font-size: 17px; font-weight: 700; color: var(--accent-gold); margin: 18px 0 8px;">2. Визовые регламенты</h3>
    <p style="font-size: 13.5px; color: #cbd5e1; line-height: 1.6; margin-bottom: 12px;">
      Для 34 ключевых направлений исследованы официальные миграционные законы на 2026 год: безвизовый срок для граждан РФ, 
      визы цифровых кочевников (Digital Nomad), ВНЖ по аренде, бизнесу и недвижимости.
    </p>

    <h3 style="font-size: 17px; font-weight: 700; color: var(--accent-gold); margin: 18px 0 8px;">3. Популярные места и география</h3>
    <p style="font-size: 13.5px; color: #cbd5e1; line-height: 1.6; margin-bottom: 14px;">
      Все координаты ТЦ, парков аттракционов и аквапарков привязаны к реальной карте для планирования удобных районов проживания.
    </p>
  `);
}

function showPhotoCredits() {
  openInfo(`
    <span class="section-kicker">АВТОРЫ И ЛИЦЕНЗИИ</span>
    <h2 style="font-size: 26px; font-weight: 800; color: #fff; margin: 8px 0 16px;">Фотографии городов</h2>
    <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin-bottom: 16px;">
      Все снимки городов загружены в каталог на условиях свободных лицензий Creative Commons (CC BY, CC BY-SA, CC0) с Wikimedia Commons.
    </p>
    <div style="max-height: 380px; overflow-y: auto; padding-right: 10px;">
      ${countries.map(c => `
        <div style="margin-bottom: 14px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
          <strong style="color: #fff; font-size: 14px;">${c.flag} ${esc(c.name)}</strong>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
            ${c.cities.map(ct => esc(ct.name)).join(', ')}
          </div>
        </div>
      `).join('')}
    </div>
  `);
}

// Side-by-side comparison modal
function showCompareModal() {
  if (compare.length < 2) {
    toast('Выберите от 2 до 4 стран для сравнения');
    return;
  }
  const cs = compare.map(id => countries.find(c => c.id === id)).filter(Boolean);
  const rows = [
    ['Флаг и страна', c => `${c.flag} ${c.name}`],
    ['Регион', c => c.region],
    ['Бюджет на 1 чел / мес', c => money(monthly(c.cities[0], 1).total)],
    ['Аренда жилья (ориентир)', c => money(monthly(c.cities[0], 1).rent)],
    ['Безвизовый режим', c => c.entry],
    ['Длительное проживание', c => c.longStay],
    ['Язык', c => c.language],
    ['Сложность оформления', c => c.difficulty ? `${c.difficulty} из 5` : 'Уточняется'],
    ['Право на гражданство', c => c.citizenship || 'По стандартной процедуре']
  ];

  openInfo(`
    <span class="section-kicker">СРАВНЕНИЕ ВАРИАНТОВ</span>
    <h2 style="font-size: 26px; font-weight: 800; color: #fff; margin: 8px 0 16px;">Сравнение направлений</h2>
    <div style="overflow-x: auto; margin-top: 14px;">
      <table class="cost-table" style="min-width: 520px;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 10px; color: var(--text-muted); font-size: 12px;">Критерий</th>
            ${cs.map(c => `<th style="text-align: left; padding: 10px; color: #fff; font-size: 14px; font-weight: 700;">${c.flag} ${esc(c.name)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(([title, fn]) => `
            <tr>
              <td style="color: var(--text-secondary); font-size: 13px; font-weight: 600;">${title}</td>
              ${cs.map(c => `<td style="font-size: 13px; color: #e2e8f0;">${esc(fn(c))}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `);
}

// Exchange Rates Loader
async function loadExchangeRates() {
  try {
    const cached = await fetch('./rates.json').then(r => r.json());
    if (cached && cached.rates) {
      rates = cached.rates;
      rateDate = cached.time_last_update_utc;
      if ($('#fxStatus')) {
        $('#fxStatus').textContent = `$1 = ${new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 2}).format(rates.RUB)} ₽`;
      }
    }
  } catch (e) {
    if ($('#fxStatus')) $('#fxStatus').textContent = 'Резервные курсы 2026';
  }

  // Attempt live rate fetch with 6s timeout
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 6000);
    const live = await fetch('https://open.er-api.com/v6/latest/USD', {signal: ctrl.signal}).then(r => r.json());
    clearTimeout(timeout);
    if (live && live.rates && live.rates.RUB) {
      rates = live.rates;
      if ($('#fxStatus')) {
        $('#fxStatus').textContent = `$1 = ${new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 2}).format(rates.RUB)} ₽`;
      }
      render();
      renderCollections();
      if (selected) renderDetail();
    }
  } catch {}
}

// Initialize Entire App
async function init() {
  try {
    let rawData, rawPhotos, rawGalleries, rawPlaces, rawCoords, rawRoutes, extraObs;
    [rawData, rawPhotos, rawGalleries, rawPlaces, rawCoords, rawRoutes, extraObs] = await Promise.all([
      fetch('./data.json').then(r => r.json()),
      fetch('./photos.json').then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch('./galleries.json').then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch('./places.json').then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch('./city-coordinates.json').then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch('./visa-routes.json').then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch('./observed.json').then(r => r.ok ? r.json() : {}).catch(() => ({}))
    ]);

    countries = rawData;
    photos = rawPhotos;
    galleries = rawGalleries;
    places = rawPlaces;
    cityCoordinates = rawCoords;
    visaRoutes = rawRoutes;
    observed = extraObs;

    // Attach routes and enriched data to countries and cities
    countries.forEach(c => {
      c.routes = visaRoutes[c.id] || [];
      c.cities.forEach(ct => {
        ct.gallery = galleries[ct.id] || (photos[ct.id] ? [photos[ct.id]] : []);
        ct.places = places[ct.id] || [];
        ct.coords = cityCoordinates[ct.id] || {lat: 0, lng: 0};
      });
    });

    // Parse URL params
    const params = new URLSearchParams(location.search);
    if (['USD', 'RUB', 'EUR'].includes(params.get('currency'))) {
      f.currency = params.get('currency');
    }
    for (const k of Object.keys(defaultFilters)) {
      if (!params.has(k) || k === 'saved') continue;
      const v = params.get(k);
      if (k === 'tags') f.tags = v.split(',').filter(t => t in tagNames);
      else if (typeof defaultFilters[k] === 'boolean') f[k] = v === 'true';
      else f[k] = v;
    }

    // Populate Datalist
    if ($('#places')) {
      const suggestions = [...new Set(countries.flatMap(c => [c.name, c.region, ...c.cities.map(ct => ct.name)]))];
      $('#places').innerHTML = suggestions.map(s => `<option value="${esc(s)}"></option>`).join('');
    }

    // Populate Lifestyle Cards in Filter Workspace
    const lifestyleEl = $('#lifestyleFilters');
    if (lifestyleEl) {
      const tagIcons = {
        sea: 'sea',
        beach: 'beach',
        work: 'work',
        metro: 'metro',
        malls: 'malls',
        clubs: 'clubs',
        mountains: 'mountains'
      };
      const tagDescriptions = {
        sea: 'Близость к морскому побережью',
        beach: 'Песчаные или галечные пляжи',
        work: 'Коворкинги и кафе для ноутбука',
        metro: 'Быстрый внеуличный транспорт',
        malls: 'Крупные ТЦ, моллы и шопинг',
        clubs: 'Игровые интернет-клубы',
        mountains: 'Горы, трекинг и чистый воздух'
      };

      lifestyleEl.innerHTML = Object.entries(tagNames).map(([tagKey, tagTitle]) => `
        <div class="preference-card ${f.tags.includes(tagKey) ? 'active' : ''}" data-tag="${tagKey}">
          <div class="pref-icon-circle">
            ${icon(tagIcons[tagKey] || 'spark')}
          </div>
          <div class="pref-text">
            <span class="pref-title">${esc(tagTitle)}</span>
            <span class="pref-desc">${esc(tagDescriptions[tagKey] || '')}</span>
          </div>
        </div>
      `).join('');
    }

    hydrateIcons(document.body);
    syncInputs();
    render();
    renderCollections();
    loadExchangeRates();

    // Check if initial country requested in URL
    if (params.get('country')) {
      openCountry(params.get('country'), params.get('city'));
    }
  } catch (err) {
    console.error('Initialization error:', err);
    if ($('#countryGrid')) {
      $('#countryGrid').innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 50px;">
          <h3>Не удалось загрузить каталог</h3>
          <p>Пожалуйста, перезагрузите страницу.</p>
          <button class="button button-gold mt-3" onclick="location.reload()">Обновить</button>
        </div>
      `;
    }
  }
}

// Global Event Listeners
document.addEventListener('click', e => {
  // Card Multi-photo navigation (Prev / Next buttons on card)
  const navBtn = e.target.closest('.card-nav-btn');
  if (navBtn) {
    e.stopPropagation();
    e.preventDefault();
    const cId = navBtn.dataset.country;
    const dir = navBtn.dataset.navDir;
    const country = countries.find(c => c.id === cId);
    if (!country) return;

    const city = country.cities[0];
    const photosList = getCityPhotos(city);
    const count = photosList.length;
    if (count <= 1) return;

    const cur = cardPhotoIdx[cId] || 0;
    const nextIdx = dir === 'next' ? (cur + 1) % count : (cur - 1 + count) % count;
    cardPhotoIdx[cId] = nextIdx;

    // Update slides & dots for this card only
    const cardEl = navBtn.closest('.country-card');
    if (cardEl) {
      cardEl.querySelectorAll('.card-carousel-slide').forEach((slide, i) => {
        slide.classList.toggle('active', i === nextIdx);
      });
      cardEl.querySelectorAll('.card-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === nextIdx);
      });
      const counterTag = cardEl.querySelector('.card-counter-tag');
      if (counterTag) counterTag.textContent = `${nextIdx + 1} / ${count}`;
    }
    return;
  }

  // Card dot navigation
  const dotEl = e.target.closest('.card-dot');
  if (dotEl) {
    e.stopPropagation();
    const targetIdx = Number(dotEl.dataset.dot);
    const dotsContainer = dotEl.closest('[data-dots-country]');
    const cId = dotsContainer?.dataset.dotsCountry;
    if (cId !== undefined && !isNaN(targetIdx)) {
      cardPhotoIdx[cId] = targetIdx;
      const cardEl = dotEl.closest('.country-card');
      if (cardEl) {
        cardEl.querySelectorAll('.card-carousel-slide').forEach((slide, i) => {
          slide.classList.toggle('active', i === targetIdx);
        });
        cardEl.querySelectorAll('.card-dot').forEach((dot, i) => {
          dot.classList.toggle('active', i === targetIdx);
        });
      }
    }
    return;
  }

  // Bookmark / Save country button
  const saveBtn = e.target.closest('.card-bookmark-btn');
  if (saveBtn) {
    e.stopPropagation();
    const cId = saveBtn.dataset.saveId;
    if (saved.includes(cId)) {
      saved = saved.filter(x => x !== cId);
      toast('Удалено из избранного');
    } else {
      saved.push(cId);
      toast('Добавлено в избранное');
    }
    writeStorage('gd-saved', saved);
    render();
    return;
  }

  // Open country detail modal from card
  const openTrigger = e.target.closest('[data-open-country]');
  if (openTrigger) {
    const cId = openTrigger.dataset.openCountry;
    const ctId = openTrigger.dataset.openCity;
    openCountry(cId, ctId);
    return;
  }

  // Click directly on country card image to open
  const cardMedia = e.target.closest('.card-media-wrap');
  if (cardMedia) {
    const cardEl = cardMedia.closest('.country-card');
    if (cardEl) {
      const cId = cardEl.dataset.countryId;
      openCountry(cId);
    }
    return;
  }

  // Hero destination button (Montenegro)
  if (e.target.closest('#heroOpen')) {
    openCountry('montenegro');
    return;
  }

  // Lifestyle preference card toggle
  const prefCard = e.target.closest('.preference-card');
  if (prefCard) {
    const tag = prefCard.dataset.tag;
    if (f.tags.includes(tag)) {
      f.tags = f.tags.filter(t => t !== tag);
    } else {
      f.tags.push(tag);
    }
    prefCard.classList.toggle('active', f.tags.includes(tag));
    visible = 9;
    render();
    return;
  }

  // Quick duration chips in Lifestyle pane
  const dChip = e.target.closest('.d-chip');
  if (dChip) {
    const [amt, unit] = dChip.dataset.setDuration.split(',');
    f.durationAmount = amt;
    f.durationUnit = unit;
    if ($('#durationAmount')) $('#durationAmount').value = amt;
    if ($('#durationUnit')) $('#durationUnit').value = unit;
    $$('.d-chip').forEach(c => c.classList.remove('active'));
    dChip.classList.add('active');
    visible = 9;
    render();
    toast(`Выбран срок: ${amt} ${unit === 'years' ? 'лет' : 'мес.'}`);
    return;
  }

  // Remove active filter chip
  const removeBtn = e.target.closest('[data-remove]');
  if (removeBtn) {
    const key = removeBtn.dataset.remove;
    if (key.startsWith('tag:')) {
      const tag = key.slice(4);
      f.tags = f.tags.filter(t => t !== tag);
    } else if (key === 'duration') {
      f.durationAmount = '';
      if ($('#durationAmount')) $('#durationAmount').value = '';
    } else if (['income', 'maxRent', 'savings'].includes(key)) {
      f[key] = '';
      if ($('#' + key)) $('#' + key).value = '';
    } else if (key === 'matchMode') {
      f.matchMode = 'all';
    } else {
      f[key] = defaultFilters[key];
    }
    syncInputs();
    visible = 9;
    render();
    return;
  }

  // Match Mode toggle (ANY vs ALL)
  const matchBtn = e.target.closest('.match-mode-card .segment-btn');
  if (matchBtn) {
    f.matchMode = matchBtn.dataset.match;
    $$('.match-mode-card .segment-btn').forEach(b => b.classList.toggle('active', b === matchBtn));
    const explanationEl = $('#matchExplanation');
    if (explanationEl) {
      explanationEl.textContent = f.matchMode === 'any'
        ? 'Показываем страны, где есть хотя бы одно из выбранных условий.'
        : 'Ищем города, где есть абсолютно все выбранные удобства одновременно.';
    }
    visible = 9;
    render();
    toast(f.matchMode === 'any' ? 'Режим: совпадение ХОТЯ БЫ ОДНОГО условия' : 'Режим: совпадение ВСЕХ условий');
    return;
  }

  // Housing type pills
  const hPill = e.target.closest('.h-pill');
  if (hPill) {
    f.housing = hPill.dataset.housing;
    $$('.h-pill').forEach(b => b.classList.toggle('active', b === hPill));
    visible = 9;
    render();
    return;
  }

  // Visa route type pills
  const vPill = e.target.closest('.v-pill');
  if (vPill) {
    f.routeType = vPill.dataset.routeType;
    $$('.v-pill').forEach(b => b.classList.toggle('active', b === vPill));
    visible = 9;
    render();
    return;
  }

  // Top Mode tabs / Presets
  const modePill = e.target.closest('.mode-pill');
  if (modePill) {
    const preset = modePill.dataset.preset;
    $$('.mode-pill').forEach(b => b.classList.toggle('active', b === modePill));
    if (preset === 'all') resetFilters();
    else applyPreset(preset);
    return;
  }

  // Collection card click
  const colCard = e.target.closest('.collection-card');
  if (colCard) {
    const preset = colCard.dataset.preset;
    applyPreset(preset);
    return;
  }

  // Region chips
  const regionBtn = e.target.closest('.region-chips-scroll .chip-btn');
  if (regionBtn) {
    $$('.region-chips-scroll .chip-btn').forEach(b => b.classList.remove('active'));
    regionBtn.classList.add('active');
    if (regionBtn.dataset.region !== undefined) {
      f.region = regionBtn.dataset.region;
    } else if (regionBtn.dataset.preset) {
      applyPreset(regionBtn.dataset.preset);
      return;
    }
    visible = 9;
    render();
    return;
  }

  // Filter toggle button (Expand / Collapse)
  if (e.target.closest('#filterToggle')) {
    const panel = $('#filterWorkspace');
    const toggleBtn = $('#filterToggle');
    if (panel) {
      const isCollapsed = panel.classList.toggle('collapsed');
      toggleBtn?.setAttribute('aria-expanded', String(!isCollapsed));
    }
    return;
  }

  // Workspace tab switcher (lifestyle, housing, visa, language)
  const wTab = e.target.closest('.w-tab');
  if (wTab) {
    const targetTab = wTab.dataset.filterTab;
    $$('.w-tab').forEach(t => t.classList.toggle('active', t === wTab));
    $$('.w-pane').forEach(p => {
      p.hidden = p.id !== 'pane-' + targetTab;
      p.classList.toggle('active', p.id === 'pane-' + targetTab);
    });
    return;
  }

  // Saved bookmark toggle in header
  if (e.target.closest('#savedToggle')) {
    f.saved = !f.saved;
    $('#savedToggle')?.classList.toggle('active', f.saved);
    $('#savedToggle')?.setAttribute('aria-pressed', String(f.saved));
    visible = 9;
    render();
    $('#destinations')?.scrollIntoView({behavior: 'smooth'});
    toast(f.saved ? 'Показаны избранные направления' : 'Показаны все направления');
    return;
  }

  // Compare checkbox change
  const compBox = e.target.closest('[data-compare-id]');
  if (compBox) {
    const cId = compBox.dataset.compareId;
    if (compBox.checked) {
      if (compare.length >= 4) {
        compBox.checked = false;
        toast('Максимум 4 страны для одновременного сравнения');
        return;
      }
      if (!compare.includes(cId)) compare.push(cId);
    } else {
      compare = compare.filter(x => x !== cId);
    }
    render();
    return;
  }

  // Compare Dock buttons
  if (e.target.closest('#dockCompare') || e.target.closest('#compareOpen')) {
    showCompareModal();
    return;
  }
  if (e.target.closest('#clearCompare')) {
    compare = [];
    render();
    return;
  }

  // Reset all filters button
  if (e.target.closest('#resetFilters')) {
    resetFilters();
    return;
  }

  // Apply filters button
  if (e.target.closest('#applyFilters')) {
    $('#destinations')?.scrollIntoView({behavior: 'smooth'});
    return;
  }

  // Load more
  if (e.target.closest('#loadMore')) {
    visible += 9;
    render();
    return;
  }

  // Footer & methodology modals
  if (e.target.closest('#methodOpen')) {
    showMethodology();
    return;
  }
  if (e.target.closest('#photoCredits')) {
    showPhotoCredits();
    return;
  }
  if (e.target.closest('#closeInfo')) {
    $('#infoDialog')?.close();
    return;
  }
  if (e.target.closest('#startAgain')) {
    resetFilters();
    $('#planner')?.scrollIntoView({behavior: 'smooth'});
    return;
  }
});

// Search Form Submit
$('#searchForm')?.addEventListener('submit', e => {
  e.preventDefault();
  f.search = $('#search')?.value || '';
  f.durationAmount = $('#durationAmount')?.value || '';
  f.durationUnit = $('#durationUnit')?.value || 'months';
  f.people = Number($('#people')?.value) || 1;
  visible = 9;
  render();
  $('#destinations')?.scrollIntoView({behavior: 'smooth'});
});

// Input Changes
for (const id of ['income', 'maxRent', 'savings', 'durationAmount', 'durationUnit', 'people', 'region', 'climate', 'bureaucracy', 'citizenship', 'sort']) {
  $('#' + id)?.addEventListener('change', e => {
    f[id] = e.target.value;
    visible = 9;
    render();
  });
}

for (const id of ['reserve', 'allowRenewal', 'visaFree', 'verifiedOnly', 'russian', 'english']) {
  $('#' + id)?.addEventListener('change', e => {
    f[id] = e.target.checked;
    visible = 9;
    render();
  });
}

$('#search')?.addEventListener('input', () => {
  f.search = $('#search').value;
  visible = 9;
  render();
});

$('#currency')?.addEventListener('change', updateCurrency);

// Run initialization
init();
