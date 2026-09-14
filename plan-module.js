/* 亚丁大转山 · 攻略生成器前端模块（方案A：纯前端，挂 window）
   依赖：yading-engine.js（YadingEngine）、yd-track-data.js（YD_TRACK）、主平台 map/addRouteLayers
   与 plan-tool/public/app.js 同源演进；方案B 保留于 plan-tool/ */
'use strict';

(function (global) {

  /* ---------- 表单状态 ---------- */
  const state = { days: '7', month: '10', exp: 'medium', load: 'heavy', group: '2', amr: 'no', knee: 'good', family: 'no', arrive: 'train', leave: 'van', pref: 'time' };

  /* ---------- 车次选择状态（酒店改为预算驱动推荐，不再让用户选择） ---------- */
  const pick = { train: null };

  /* 渲染车次选择列表（按出发城市 key 取真实车次；酒店改为预算驱动推荐，不再选择） */
  function renderTrainPicks() {
    const box = document.getElementById('trainPickOptions');
    if (!box) return;
    const from = (document.getElementById('planFromCity')?.value || '').trim() || '郑州';
    const eng = global.YadingEngine;
    const trains = eng && eng.KB && eng.KB.costs && eng.KB.costs.trains;
    // 城市 key 匹配：优先完整中文城市 key，其次模糊匹配
    let key = null;
    if (trains) {
      if (trains[from]) key = from;
      else if (trains[from.replace(/市$/, '')]) key = from.replace(/市$/, '');
      else if (from.includes('北京')) key = 'beijing';
      else if (from.includes('上海')) key = 'shanghai';
      else if (from.includes('西安')) key = 'xian';
      else if (from.includes('广州')) key = 'guangzhou';
      else if (from.includes('重庆')) key = 'chongqing';
      else if (from.includes('武汉')) key = 'wuhan';
      else if (from.includes('郑州')) key = 'zhengzhou';
      else if (from.includes('天津')) key = 'tianjin';
      else if (from.includes('石家庄')) key = 'shijiazhuang';
      else if (from.includes('太原')) key = 'taiyuan';
      else if (from.includes('呼和浩特')) key = 'hohhot';
      else if (from.includes('沈阳')) key = 'shenyang';
      else if (from.includes('长春')) key = 'changchun';
      else if (from.includes('哈尔滨')) key = 'harbin';
      else if (from.includes('南京')) key = 'nanjing';
      else if (from.includes('杭州')) key = 'hangzhou';
      else if (from.includes('合肥')) key = 'hefei';
      else if (from.includes('福州')) key = 'fuzhou';
      else if (from.includes('南昌')) key = 'nanchang';
      else if (from.includes('济南')) key = 'jinan';
      else if (from.includes('长沙')) key = 'changsha';
      else if (from.includes('南宁')) key = 'nanning';
      else if (from.includes('海口')) key = 'haikou';
      else if (from.includes('贵阳')) key = 'guiyang';
      else if (from.includes('昆明')) key = 'kunming';
      else if (from.includes('拉萨')) key = 'lhasa';
      else if (from.includes('兰州')) key = 'lanzhou';
      else if (from.includes('西宁')) key = 'xining';
      else if (from.includes('银川')) key = 'yinchuan';
      else if (from.includes('乌鲁木齐')) key = 'wulumuqi';
    }
    const list = (trains && key && trains[key]) || (trains && trains.other) || [];
    box.innerHTML = '';
    if (!list.length) return;
    list.forEach(t => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pick-item' + (pick.train && pick.train.no === t.no ? ' sel' : '');
      btn.innerHTML = `<span class="p-title">🚆 ${t.no}</span> <span class="p-sub">${t.from || ''} ${t.dep} → ${t.to} ${t.arr}（${t.dur}）</span>
        <div class="p-meta">${t.cls}</div>
        <div class="p-note">💡 ${t.note}</div>`;
      btn.onclick = () => {
        pick.train = t;
        box.querySelectorAll('.pick-item').forEach(b => b.classList.remove('sel'));
        btn.classList.add('sel');
      };
      box.appendChild(btn);
    });
    // 默认选中第一班，与知识库默认一致；切换城市后重置选择
    if (!pick.train && list.length) {
      pick.train = list[0];
      box.firstChild.classList.add('sel');
    }
  }

  /* 初始渲染车次选择列表（DOM 就绪后；酒店改为预算驱动推荐，无选择列表） */
  function initPicks() {
    renderTrainPicks();
    // 出发城市变化时联动车次列表（按城市 key 取真实车次）
    const fromEl = document.getElementById('planFromCity');
    if (fromEl) {
      fromEl.addEventListener('input', () => {
        pick.train = null;
        renderTrainPicks();
      });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPicks);
  } else {
    initPicks();
  }

  global.setSeg = function (key, btn) {
    state[key] = btn.dataset.v;
    const row = btn.parentElement;
    row.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    // 月份按钮点击 → 联动具体日期（保留用户已选日，无则取 4 号）
    if (key === 'month') syncDateFromMonth(btn.dataset.v);
  };

  /* 月份 → 具体日期联动：把 #planDate 设为该月对应日 */
  function syncDateFromMonth(mStr) {
    const el = document.getElementById('planDate');
    if (!el) return;
    const m = Number(mStr);
    if (!m) return;
    const pad = (n) => String(n).padStart(2, '0');
    const hasValue = !!el.value && /^\d{4}-\d{2}-\d{2}$/.test(el.value);
    const y = hasValue ? Number(el.value.slice(0, 4)) : new Date().getFullYear();
    const day = hasValue ? Number(el.value.slice(8, 10)) : 4; // 无选择默认该月 4 号（对齐 10/4 进山习惯）
    // 该月不存在该日则退到 28（如 2/30、9/31 之类）
    const check = new Date(y, m - 1, day);
    if (check.getMonth() !== m - 1) {
      el.value = y + '-' + pad(m) + '-28';
    } else {
      el.value = y + '-' + pad(m) + '-' + pad(day);
    }
  }

  /* 读取 #planDate 具体日期；为空返回 null */
  function readPlanDate() {
    const el = document.getElementById('planDate');
    const v = el && el.value;
    if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const p = v.split('-').map(Number);
      return new Date(p[0], p[1] - 1, p[2]);
    }
    return null;
  }

  /* 页面加载时：若无默认日期，初始化为今年 10 月 4 号（对齐默认高亮） */
  function initPlanDate() {
    const el = document.getElementById('planDate');
    if (!el || el.value) return;
    el.value = new Date().getFullYear() + '-10-04';
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlanDate);
  } else {
    initPlanDate();
  }

  global.togglePlanForm = function () {
    const f = document.getElementById('planForm');
    const b = document.getElementById('planToggleBtn');
    const open = f.classList.toggle('open');
    b.textContent = open ? '收起 ▴' : '展开 ▾';
  };

  /* ---------- 生成 ---------- */
  global.generatePlan = function () {
    const picked = readPlanDate();
    // 日期精确到日：若用户选了具体日期，其月份覆盖月份按钮（知识库天气口径与逐日数据保持一致）
    const effMonth = picked ? String(picked.getMonth() + 1) : state.month;
    const input = {
      days: state.days,
      month: effMonth,
      experience: state.exp,
      load: state.load,
      groupSize: state.group,
      fromCity: document.getElementById('planFromCity').value.trim() || '郑州',
      budget: document.getElementById('planBudget').value.trim(),
      specialNeed: document.getElementById('planSpecial').value.trim(),
      health: { amr: state.amr, knee: state.knee, family: state.family },
      arrive: state.arrive,
      leave: state.leave,
      pref: state.pref,
      pickTrain: pick.train ? pick.train.no : null,
    };

    const btn = document.getElementById('planGenBtn');
    btn.disabled = true;
    btn.textContent = '⏳ 生成中…';

    setTimeout(async () => {
      try {
        const plan = global.YadingEngine.buildPlan(input);
        // 注入用户在表单选择的列车（供结果页展示；酒店改为预算驱动推荐）
        plan.userPick = {
          trainSel: pick.train ? `${pick.train.no} ${pick.train.from || ''} ${pick.train.dep} → ${pick.train.to} ${pick.train.arr}（${pick.train.dur} · ${pick.train.cls}）` : '',
        };
        // 出发日期：优先 #planDate 具体日期，否则所选月份默认 4 号
        const year = new Date().getFullYear();
        const startDate = buildStartDate(input.month, year);
        // 逐日天气（实时预报 or 去年同期参考）
        const weather = await fetchDailyWeather(plan.schedule, startDate);
        // 按天轨迹分段
        const trackSegs = buildTrackSegs(input.days);
        renderResult(plan, weather, trackSegs, startDate);
        // 地图按天高亮（默认全段）
        highlightDays('all', trackSegs);
      } catch (e) {
        console.error(e);
        alert('生成失败：' + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = '🚀 生成我的专属攻略';
      }
    }, 30);
  };

  /* 出发日期：优先用户选择的 #planDate 具体日期；未选择则回退到所选月份取 4 日（对齐 10/4 进山习惯） */
  function buildStartDate(month, year) {
    const picked = readPlanDate();
    if (picked) return picked;
    const m = Number(month) || 10;
    return new Date(year, m - 1, 4);
  }

  /* 每天行程 → 具体日期 */
  function dailyDates(schedule, startDate) {
    return schedule.map((d, i) => {
      const dt = new Date(startDate);
      dt.setDate(dt.getDate() + i);
      return {
        day: d.day,
        dateISO: dt.toISOString().slice(0, 10),
        dateLabel: (dt.getMonth() + 1) + '/' + dt.getDate(),
        camp: d.camp || '',
      };
    });
  }

  /* ---------- 逐日天气 ---------- */
  async function fetchDailyWeather(schedule, startDate) {
    const dates = dailyDates(schedule, startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const first = new Date(startDate);
    first.setHours(0, 0, 0, 0);
    const diffDays = Math.round((first - today) / 86400000);

    const campCoord = getCampCoord(); // 波拥措附近代表坐标（进山主区域）
    const out = [];

    if (diffDays <= 16 && diffDays >= 0) {
      // 实时预报
      try {
        const r = await fetch('https://api.open-meteo.com/v1/forecast?' + new URLSearchParams({
          latitude: campCoord.lat, longitude: campCoord.lon,
          daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
          timezone: 'Asia/Shanghai', forecast_days: 16,
        }));
        const j = await r.json();
        const byDate = {};
        j.daily.time.forEach((t, i) => {
          byDate[t] = {
            code: j.daily.weather_code[i],
            tmax: j.daily.temperature_2m_max[i],
            tmin: j.daily.temperature_2m_min[i],
            pop: j.daily.precipitation_probability_max[i],
          };
        });
        dates.forEach(d => {
          const w = byDate[d.dateISO];
          out.push(w
            ? { ...d, type: '实时预报', ...w }
            : { ...d, type: '气候参考', code: null, tmax: null, tmin: null, pop: null });
        });
        return out;
      } catch (e) { /* 回退 archive */ }
    }

    // 去年同期参考预报（archive）
    try {
      const yearAgo = startDate.getFullYear() - 1;
      const end = new Date(startDate);
      end.setDate(end.getDate() + schedule.length - 1);
      const fmt = (x) => x.toISOString().slice(0, 10);
      const r = await fetch('https://archive-api.open-meteo.com/v1/archive?' + new URLSearchParams({
        latitude: campCoord.lat, longitude: campCoord.lon,
        start_date: fmt(new Date(yearAgo, startDate.getMonth(), startDate.getDate())),
        end_date: fmt(new Date(yearAgo, end.getMonth(), end.getDate())),
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
        timezone: 'Asia/Shanghai',
      }));
      const j = await r.json();
      const byDate = {};
      j.daily.time.forEach((t, i) => {
        byDate[t] = {
          code: j.daily.weather_code[i],
          tmax: j.daily.temperature_2m_max[i],
          tmin: j.daily.temperature_2m_min[i],
          pop: j.daily.precipitation_sum[i] > 0 ? Math.min(100, Math.round(j.daily.precipitation_sum[i] * 18)) : 0,
        };
      });
      dates.forEach(d => {
        // 去年日期映射：同月同日
        const refDate = fmt(new Date(yearAgo, startDate.getMonth(), startDate.getDate() + dates.indexOf(d)));
        const w = byDate[refDate];
        out.push({ ...d, type: '去年参考', ...(w || { code: null, tmax: null, tmin: null, pop: null }) });
      });
      return out;
    } catch (e) {
      // 全部失败：知识库兜底
      return dates.map(d => ({ ...d, type: '知识库', code: null, tmax: null, tmin: null, pop: null }));
    }
  }

  /* WMO 天气码 → 图标 + 文字 */
  const WMO = {
    0: ['☀️', '晴'], 1: ['🌤️', '晴间多云'], 2: ['⛅', '多云'], 3: ['☁️', '阴'],
    45: ['🌫️', '雾'], 48: ['🌫️', '雾凇'], 51: ['🌦️', '毛毛雨'], 53: ['🌦️', '小雨'],
    55: ['🌧️', '中雨'], 56: ['🌧️', '冻雨'], 57: ['🌧️', '冻雨'], 61: ['🌧️', '小雨'],
    63: ['🌧️', '中雨'], 65: ['🌧️', '大雨'], 66: ['🌧️', '冻雨'], 67: ['🌧️', '冻雨'],
    71: ['🌨️', '小雪'], 73: ['🌨️', '中雪'], 75: ['❄️', '大雪'], 77: ['🌨️', '雪粒'],
    80: ['🌦️', '阵雨'], 81: ['🌧️', '强阵雨'], 82: ['⛈️', '暴雨'], 85: ['🌨️', '阵雪'],
    86: ['❄️', '强阵雪'], 95: ['⛈️', '雷暴'], 96: ['⛈️', '雷暴冰雹'], 99: ['⛈️', '雷暴冰雹'],
  };
  function wmoInfo(code) { return WMO[code] || ['🌡️', '—']; }

  /* ---------- 区间天气数据分析 ---------- */
  /* 对所选出发区间做统计：晴好/降水/雪天、温度区间、关键窗口覆盖 + 出行建议 */
  function analyzePeriod(weather, startDate, days) {
    const n = weather.length || Number(days) || 7;
    const dateAt = (i) => {
      const dt = new Date(startDate);
      dt.setDate(dt.getDate() + i);
      return dt;
    };
    const iso = (dt) => fmtLocal(dt);

    let sunny = 0, rain = 0, snow = 0, unknown = 0;
    let tMin = Infinity, tMax = -Infinity, haveTemp = false;
    let popSum = 0, popCount = 0;

    weather.forEach(w => {
      if (w.code == null) { unknown++; return; }
      const c = w.code;
      if (c === 0 || c === 1 || c === 2 || c === 3) sunny++;
      if ([51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(c)) rain++;
      if ([71,73,75,77,85,86].includes(c)) snow++;
      if (w.tmax != null && w.tmin != null) {
        haveTemp = true;
        tMin = Math.min(tMin, w.tmin);
        tMax = Math.max(tMax, w.tmax);
      }
      if (w.pop != null) { popSum += w.pop; popCount++; }
    });

    // 关键窗口日期串（当年）
    const y = startDate.getFullYear();
    const fmt = (m, d) => y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const windows = {
      colorTrick: ['9/25 - 10/15', fmt(9, 25), fmt(10, 15)],   // 彩林窗口
      drySeason: ['10/5 起', fmt(10, 5), fmt(12, 31)],         // 干季
      bestData: ['10/12-13', fmt(10, 12), fmt(10, 13)],        // 历史最佳窗口
    };
    const startIso = iso(startDate);
    const endIso = iso(dateAt(n - 1));
    const covers = {};
    Object.entries(windows).forEach(([k, v]) => {
      const [label, wStart, wEnd] = v;
      // 区间与窗口是否有重叠
      const overlap = startIso <= wEnd && endIso >= wStart;
      const fully = startIso >= wStart && endIso <= wEnd;
      covers[k] = { label, overlap, fully };
    });

    // 统计条
    const stats = [];
    stats.push({ icon: '☀️', label: '晴/多云', val: sunny + (unknown ? '+' + unknown : '') + ' 天', cls: 'green' });
    stats.push({ icon: '🌧️', label: '降水日', val: rain + ' 天', cls: 'blue' });
    stats.push({ icon: '❄️', label: '降雪日', val: snow + ' 天', cls: 'violet' });
    stats.push({ icon: '🌡️', label: '温度', val: haveTemp ? tMin + '~' + tMax + '℃' : '—', cls: 'orange' });
    stats.push({ icon: '💧', label: '均降水概率', val: popCount ? Math.round(popSum / popCount) + '%' : '—', cls: 'cyan' });

    // 建议
    const tips = [];
    if (rain === 0 && snow === 0 && unknown < n) tips.push('区间降水概率低，天气窗口优质，建议按计划执行');
    if (rain > 0 && rain <= n / 3) tips.push('有 ' + rain + ' 天降水可能，雨衣+防水袋必带，垭口安排优先晴好日');
    if (rain > n / 3) tips.push('降水日偏多，建议备选行程：营地对调 或 压缩出山日，垭口严禁雨天强过');
    if (snow > 0) tips.push(snow + ' 天有降雪可能，冰爪雪套必带，垭口暗冰风险高，「白天过垭口、午后不上山」');
    if (haveTemp && tMin < -5) tips.push('夜间低温可达 ' + tMin + '℃，睡袋按 -15℃ 级，注意防失温');
    if (covers.colorTrick.overlap) tips.push('🎨 覆盖彩林窗口（' + covers.colorTrick.label + '），秋色+雪山颜值高');
    if (covers.drySeason.overlap) tips.push('🌞 覆盖干季（' + covers.drySeason.label + '），晴空率高，日照金山概率大');
    if (covers.bestData.overlap) tips.push('⭐ 覆盖历史最佳窗口（' + covers.bestData.label + '，Open-Meteo 7 年验证）');
    if (tips.length === 0) tips.push('区间内天气以知识库气候参考为准，出行前 3 天再看实时预报复核');

    return {
      n,
      startLabel: (startDate.getMonth() + 1) + '/' + startDate.getDate(),
      endLabel: (dateAt(n - 1).getMonth() + 1) + '/' + dateAt(n - 1).getDate(),
      stats,
      covers,
      tips,
      unknown,
    };
  }

  /* ---------- 轨迹分段 ---------- */
  function buildTrackSegs(days) {
    const T = global.YD_TRACK;
    if (!T) return null;
    const n = Number(days) || 7;
    if (n === 5) return T.seg5_pts.map((pts, i) => ({ name: 'D' + (i + 1), pts, stats: T.seg5_stats[i] }));
    if (n === 7) return T.segments.map((pts, i) => ({ name: 'D' + (i + 1), pts, stats: T.seg_stats[i] }));
    if (n === 8) return buildSeg8(T);
    return T.segments.map((pts, i) => ({ name: 'D' + (i + 1), pts, stats: T.seg_stats[i] }));
  }

  /* 8 天版：把 7 段中最后一段拆成两段（蛇湖→卡斯牛棚→终点） */
  function buildSeg8(T) {
    const segs = T.segments.map((pts, i) => ({ name: 'D' + (i + 1), pts, stats: T.seg_stats[i] }));
    const last = segs[6]; // D7 蛇湖→终点
    const split = Math.round(last.pts.length * 0.45); // 前45% 蛇湖→卡斯牛棚
    const s1 = last.pts.slice(0, split);
    const s2 = last.pts.slice(split);
    const stat7 = T.seg_stats[6];
    const d7 = { ...stat7, day: 7, start: '蛇湖营地', end: '卡斯牛棚', d_km: +(stat7.d_km * 0.45).toFixed(1) };
    const d8 = { ...stat7, day: 8, start: '卡斯牛棚', end: '终点·乘车区', d_km: +(stat7.d_km * 0.55).toFixed(1) };
    return [
      ...segs.slice(0, 6),
      { name: 'D7', pts: s1, stats: d7 },
      { name: 'D8', pts: s2, stats: d8 },
    ];
  }

  /* 营地代表坐标（亚丁景区入口） */
  function getCampCoord() {
    return { lat: 28.456, lon: 100.339 };
  }

  /* ---------- 地图按天高亮 ---------- */
  const DAY_COLORS = ['#667eea', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

  function clearDayLayers() {
    try {
      // 全部轨迹段（每次生成后最多 8 段）
      for (let i = 0; i < 8; i++) {
        ['day-all-' + i + '-glow', 'day-all-' + i + '-line'].forEach(id => {
          if (map.getLayer(id)) map.removeLayer(id);
        });
        if (map.getSource('day-all-' + i)) map.removeSource('day-all-' + i);
      }
      // 单日高亮
      for (let i = 0; i < 8; i++) {
        ['day-' + i + '-glow', 'day-' + i + '-line'].forEach(id => {
          if (map.getLayer(id)) map.removeLayer(id);
        });
        if (map.getSource('day-' + i)) map.removeSource('day-' + i);
      }
    } catch (e) { console.warn(e); }
  }

  global.highlightDays = function (which, trackSegs) {
    if (!trackSegs) return;
    // ★ GCJ-02：底图（高德）为 GCJ-02，轨迹须转 GCJ 后入图；引擎缺失时降级原样
    const toGcj = (lon, lat) => {
      const f = global.YadingEngine && global.YadingEngine.wgs84ToGcj02;
      return f ? f(lon, lat) : { lon: lon, lat: lat };
    };
    const ready = () => {
      clearDayLayers();
      const segs = (which === 'all') ? trackSegs : [trackSegs[Number(which) - 1]].filter(Boolean);
      if (!segs.length) return;

      if (which === 'all') {
        // 全程：每段独立 source+layer，避免互相覆盖
        segs.forEach((s, idx) => {
          const color = DAY_COLORS[idx % DAY_COLORS.length];
          const sourceId = 'day-all-' + idx;
          const coords = s.pts.map(p => { const g = toGcj(p[0], p[1]); return [g.lon, g.lat, p[2] || 0]; });
          map.addSource(sourceId, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} } });
          map.addLayer({
            id: sourceId + '-glow', type: 'line', source: sourceId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': color, 'line-width': 12, 'line-opacity': 0.3, 'line-blur': 4 }
          });
          map.addLayer({
            id: sourceId + '-line', type: 'line', source: sourceId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': color, 'line-width': 5, 'line-opacity': 0.95 }
          });
        });
        // 飞到全程起点（GCJ）
        const first = segs[0].pts[0];
        if (first) { const g = toGcj(first[0], first[1]); map.flyTo({ center: [g.lon, g.lat], zoom: 11.5, pitch: 50, duration: 1500 }); }
      } else {
        // 单日：用 day-N 源
        const s = segs[0];
        const realIdx = Number(which) - 1;
        const color = DAY_COLORS[realIdx % DAY_COLORS.length];
        const sourceId = 'day-' + realIdx;
        const coords = s.pts.map(p => { const g = toGcj(p[0], p[1]); return [g.lon, g.lat, p[2] || 0]; });
        map.addSource(sourceId, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} } });
        map.addLayer({
          id: sourceId + '-glow', type: 'line', source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': color, 'line-width': 12, 'line-opacity': 0.3, 'line-blur': 4 }
        });
        map.addLayer({
          id: sourceId + '-line', type: 'line', source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': color, 'line-width': 5, 'line-opacity': 0.95 }
        });
        const first = s.pts[0];
        if (first) { const g = toGcj(first[0], first[1]); map.flyTo({ center: [g.lon, g.lat], zoom: 11.5, pitch: 50, duration: 1500 }); }
      }
    };
    if (map.loaded()) ready();
    else map.once('load', ready);
  };

  /* ---------- 微型高程剖面（单日行程卡片） ---------- */
  /* 部分轨迹段(5 天版 seg5_pts)的点只有 [lon,lat] 无海拔，用主轨迹(7 天版 segments，全部带海拔)
     做最近邻匹配补齐；匹配不到的点按相邻已匹配点线性插值 */
  function ensureAlt(pts) {
    if (!pts || !pts.length) return pts;
    // 已有海拔的点直接返回
    if (pts.every(p => Array.isArray(p) && typeof p[2] === 'number' && !isNaN(p[2]))) return pts;
    // 构建主轨迹海拔查找表（经纬度 → 海拔）
    const T = global.YD_TRACK;
    const altPool = [];
    if (T) {
      (T.segments || []).forEach(seg => seg.forEach(p => { if (p.length >= 3 && typeof p[2] === 'number') altPool.push(p); }));
    }
    if (!altPool.length) return pts.filter(p => Array.isArray(p) && typeof p[2] === 'number');
    const findAlt = (lon, lat) => {
      let best = null, bestD = 1e9;
      for (const p of altPool) {
        const dl = p[0] - lon, dt = p[1] - lat;
        const d = dl * dl + dt * dt;
        if (d < bestD) { bestD = d; best = p[2]; }
      }
      return bestD < 1e-9 ? best : null;   // 只接受几乎同一点
    };
    const out = pts.map(p => {
      if (!Array.isArray(p)) return null;
      const lon = p[0], lat = p[1];
      let alt = (typeof p[2] === 'number' && !isNaN(p[2])) ? p[2] : findAlt(lon, lat);
      if (alt === null) alt = NaN;   // 待插值标记
      return [lon, lat, alt];
    });
    // 线性插值填补 NaN 点：用左右最近有效点插值
    for (let i = 0; i < out.length; i++) {
      if (!out[i] || !isNaN(out[i][2])) continue;
      let pv = null, pvi = -1, nx = null, nxi = -1;
      for (let j = i - 1; j >= 0; j--) { if (out[j] && !isNaN(out[j][2])) { pv = out[j][2]; pvi = j; break; } }
      for (let j = i + 1; j < out.length; j++) { if (out[j] && !isNaN(out[j][2])) { nx = out[j][2]; nxi = j; break; } }
      if (pv !== null && nx !== null && nxi > pvi) {
        out[i][2] = pv + (nx - pv) * ((i - pvi) / (nxi - pvi));
      } else if (pv !== null) out[i][2] = pv;
      else if (nx !== null) out[i][2] = nx;
      else out[i][2] = 0;
    }
    return out.filter(Boolean);
  }

  function drawMiniElevation(canvas, rawPts) {
    if (!canvas || !rawPts || rawPts.length < 2) return;
    const pts = ensureAlt(rawPts);
    if (!pts || pts.length < 2) return;
    if (pts.some(p => typeof p[2] !== 'number' || isNaN(p[2]))) return;
    // P1: 4m residual 海拔平滑（抗 GPS 抖动，TrailScope 算法）—— 平滑曲线后再绘制
    let drawPts = pts;
    try {
      const sm = global.YadingEngine && global.YadingEngine.smoothElevation
        ? global.YadingEngine.smoothElevation(pts.map(p => p[2]))
        : null;
      if (sm && sm.alt && sm.alt.length === pts.length) {
        drawPts = pts.map((p, i) => [p[0], p[1], sm.alt[i]]);
      }
    } catch (e) { /* 平滑失败退回原始绘制 */ }
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.offsetWidth * 2 || 600;
    const h = canvas.height = canvas.offsetHeight * 2 || 96;
    ctx.clearRect(0, 0, w, h);

    const minE = Math.min(...drawPts.map(p => p[2]));
    const maxE = Math.max(...drawPts.map(p => p[2]));
    const range = maxE - minE || 1;
    const plotW = w - 8, plotH = h - 8;   // 上下各留 4px
    const X = i => 4 + (i / (drawPts.length - 1)) * plotW;
    const Y = e => 4 + (1 - (e - minE) / range) * plotH;

    // 填充色带
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(102, 126, 234, 0.35)');
    grad.addColorStop(1, 'rgba(102, 126, 234, 0.05)');
    ctx.beginPath();
    ctx.moveTo(X(0), h);
    drawPts.forEach((p, i) => { ctx.lineTo(X(i), Y(p[2])); });
    ctx.lineTo(X(drawPts.length - 1), h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // 剖面线
    ctx.beginPath();
    drawPts.forEach((p, i) => { i === 0 ? ctx.moveTo(X(i), Y(p[2])) : ctx.lineTo(X(i), Y(p[2])); });
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 起点/终点海拔标签（小字，端点不重叠时显示）
    ctx.font = '9px -apple-system, "PingFang SC", sans-serif';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(100, 116, 139, 0.9)';
    ctx.textAlign = 'left';
    ctx.fillText(Math.round(minE) + 'm', 4, Y(drawPts[0][2]) - 2);
    ctx.textAlign = 'right';
    const lastX = X(drawPts.length - 1);
    ctx.fillText(Math.round(drawPts[drawPts.length - 1][2]) + 'm', Math.min(lastX + 2, w - 2), Y(drawPts[drawPts.length - 1][2]) - 2);
  }

  /* ---------- 渲染 ---------- */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function section(icon, title, bodyNode, sub) {
    const sec = el('div');
    const t = el('div', 'r-title');
    t.innerHTML = `<span class="ico">${icon}</span>${title}`;
    sec.appendChild(t);
    if (sub) sec.appendChild(el('div', 'r-sub', sub));
    sec.appendChild(bodyNode);
    return sec;
  }

  /* ========== ★ 2026-09-14 四项出行前刚需改进 ========== */

  /* ---------- 通用小工具 ---------- */
  function fmtKg(g) { return g >= 1000 ? (g / 1000).toFixed(1) + 'kg' : g + 'g'; }
  const pad2 = (n) => String(n).padStart(2, '0');
  /* 本地日期 → YYYY-MM-DD（勿用 toISOString，UTC+8 会偏一天） */
  const fmtLocal = (dt) => dt.getFullYear() + '-' + pad2(dt.getMonth() + 1) + '-' + pad2(dt.getDate());

  /* ---------- 🛠 #125 日出日落计算（离线 NOAA 简化算法，精度 ±2 分钟内） ---------- */
  const _RAD = Math.PI / 180;
  function calcSunTimes(lat, lon, date) {
    // 依 NOAA 简化赤纬/均时差公式，返回 { sunrise:{h,m}, sunset:{h,m} }（UTC+8 墙钟）
    const dayOfYear = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86400000) + 1;
    const gamma = (2 * Math.PI / 365) * (dayOfYear - 1);
    const eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
    const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
    let hourAngle = 0;
    const cosH = (Math.cos(90.833 * _RAD) - Math.sin(lat * _RAD) * Math.sin(decl)) / (Math.cos(lat * _RAD) * Math.cos(decl));
    if (cosH >= -1 && cosH <= 1) hourAngle = Math.acos(cosH) / _RAD; // 无极昼极夜
    // 太阳正午 UTC（天）+ 日照半长 → 日出/日落 UTC（天）
    const noonUTC = (720 - 4 * lon - eqtime) / 1440;
    const halfDay = hourAngle * 4 / 1440; // 4 分钟/度
    const toLocal = (t) => {
      const ms = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) + (t + 8 / 24) * 86400000; // UTC+8
      const d = new Date(ms);
      return { h: d.getUTCHours(), m: d.getUTCMinutes() };
    };
    return { sunrise: toLocal(noonUTC - halfDay), sunset: toLocal(noonUTC + halfDay) };
  }

  /* Open-Meteo 优先（未来16天 forecast/过去 archive），失败或更远期 → 离线天文计算 */
  async function fetchSunTimes(lat, lon, dateISO) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(dateISO + 'T00:00:00');
    const diff = Math.round((d - today) / 86400000);
    if (diff >= -370 && diff <= 16) {
      try {
        if (diff >= 0) {
          const r = await fetch('https://api.open-meteo.com/v1/forecast?' + new URLSearchParams({ latitude: lat, longitude: lon, daily: 'sunrise,sunset', timezone: 'Asia/Shanghai', forecast_days: 16 }));
          const j = await r.json();
          if (j.daily && j.daily.sunrise && j.daily.sunrise[diff]) return { sunrise: String(j.daily.sunrise[diff]).slice(11, 16), sunset: String(j.daily.sunset[diff]).slice(11, 16), src: '实时' };
        } else {
          const r = await fetch('https://archive-api.open-meteo.com/v1/archive?' + new URLSearchParams({ latitude: lat, longitude: lon, start_date: dateISO, end_date: dateISO, daily: 'sunrise,sunset', timezone: 'Asia/Shanghai' }));
          const j = await r.json();
          const i = (j.daily && j.daily.time) ? j.daily.time.indexOf(dateISO) : -1;
          if (i >= 0 && j.daily.sunrise[i]) return { sunrise: String(j.daily.sunrise[i]).slice(11, 16), sunset: String(j.daily.sunset[i]).slice(11, 16), src: '去年相当' };
        }
      } catch (e) { /* 离线兜底 */ }
    }
    const t = calcSunTimes(Number(lat), Number(lon), new Date(dateISO + 'T00:00:00'));
    return { sunrise: pad2(t.sunrise.h) + ':' + pad2(t.sunrise.m), sunset: pad2(t.sunset.h) + ':' + pad2(t.sunset.m), src: '天文计算' };
  }

  /* 营地名归一化：schedule 用「波用措」(措) 与 shots「波拥措」(拥) 字不同，统一匹配 */
  const CAMP_ALIAS = { '波拥措': ['波拥措', '波用措', '波佣措', '波用'], '波用措': ['波拥措', '波用措', '波佣措', '波用'] };
  function campNorm(name) {
    const n = String(name || '');
    const hit = Object.keys(CAMP_ALIAS).find(k => CAMP_ALIAS[k].some(a => n.includes(a)));
    return hit || n;
  }

  /* ---------- 🧗 #122 装备清单生成器（可勾选 + 重量合计 + localStorage 持久化） ---------- */
  function renderGearChecklist(g, key) {
    const items = (g && g.items) || [];
    const catNames = (g && g.catNames) || {};
    const box = el('div', 'gear-ck');
    if (!items.length) return box;
    const catOrder = ['core', 'oct', 'med', 'kit', 'com', 'food'];
    const groups = {};
    items.forEach(it => { (groups[it.cat] = groups[it.cat] || []).push(it); });

    // 基础包重（入包数字项合计，不含食品/水）
    let baseW = 0;
    items.forEach(it => { if (it.w !== '-' && it.cat !== 'med' && it.cat !== 'food') baseW += Number(it.w); });
    const baseKg = (baseW / 1000).toFixed(1);

    // 进度条
    const prog = el('div', 'gear-progress');
    const bar = el('div', 'gp-bar');
    const fill = el('div', 'gp-fill');
    bar.appendChild(fill);
    const progTxt = el('div', 'gp-txt', '');
    prog.appendChild(bar);
    prog.appendChild(progTxt);
    box.appendChild(prog);

    // 工具栏
    const tools = el('div', 'gear-tools');
    const allBtn = el('button', 'gear-tool-btn', '✅ 全选');
    const noneBtn = el('button', 'gear-tool-btn', '🗑️ 清空');
    tools.appendChild(allBtn);
    tools.appendChild(noneBtn);
    tools.appendChild(el('span', 'gear-saved', '勾选进度自动保存到本机'));
    box.appendChild(tools);

    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (e) { saved = {}; }

    const checkedNames = new Set();
    const updateProgress = () => {
      let n = 0, w = 0;
      items.forEach(it => { if (checkedNames.has(it.name)) { n++; if (it.w !== '-') w += Number(it.w); } });
      const pct = items.length ? Math.round(n / items.length * 100) : 0;
      fill.style.width = pct + '%';
      fill.style.background = pct === 100 ? 'linear-gradient(90deg,#22c55e,#4ade80)' : '';
      progTxt.innerHTML = `已打包 <b>${n}</b>/${items.length} 件 · 已勾重量约 <b>${fmtKg(w)}</b> · 基础包重约 <b>${baseKg} kg</b>（不含食品/水/穿着）`;
    };

    catOrder.forEach(cat => {
      const list = groups[cat];
      if (!list || !list.length) return;
      const catDiv = el('div', 'gear-cat');
      catDiv.appendChild(el('div', 'gc-title', (catNames[cat] || cat) + ` <span class="gc-n">${list.length} 件</span>`));
      const wrap = el('div', 'gc-items');
      list.forEach(it => {
        const lab = el('label', 'gi');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'gi-cb';
        if (saved[it.name]) { cb.checked = true; checkedNames.add(it.name); }
        cb.addEventListener('change', () => {
          if (cb.checked) checkedNames.add(it.name); else checkedNames.delete(it.name);
          const save = {};
          items.forEach(x => { if (checkedNames.has(x.name)) save[x.name] = true; });
          try { localStorage.setItem(key, JSON.stringify(save)); } catch (e) { /* 隐私模式 */ }
          updateProgress();
        });
        const nm = el('span', 'gi-name', it.name);
        const br = el('span', 'gi-brand', it.brand || '');
        const right = el('span', 'gi-right');
        right.appendChild(el('span', 'gi-w', it.w === '-' ? '不称重' : fmtKg(Number(it.w))));
        lab.appendChild(cb);
        lab.appendChild(nm);
        lab.appendChild(br);
        lab.appendChild(right);
        wrap.appendChild(lab);
      });
      catDiv.appendChild(wrap);
      box.appendChild(catDiv);
    });
    updateProgress();

    allBtn.onclick = () => {
      items.forEach(it => checkedNames.add(it.name));
      box.querySelectorAll('.gi-cb').forEach(c => c.checked = true);
      const save = {};
      items.forEach(x => save[x.name] = true);
      try { localStorage.setItem(key, JSON.stringify(save)); } catch (e) { /* */ }
      updateProgress();
    };
    noneBtn.onclick = () => {
      checkedNames.clear();
      box.querySelectorAll('.gi-cb').forEach(c => c.checked = false);
      try { localStorage.setItem(key, '{}'); } catch (e) { /* */ }
      updateProgress();
    };

    box.appendChild(el('div', 'gear-note', '💡 食品与水另计（约 +6~8kg）：主食约 1kg/天、随身水 1.5-2L/天，新果牛场无水源需提前备足。重量为常见品牌估算值，实际以你的装备为准。'));
    return box;
  }

  /* ---------- 🆘 #124 应急与现金面板 ---------- */
  function buildEmergencySection(plan) {
    const E = plan.emergency || (global.YadingEngine && global.YadingEngine.KB && global.YadingEngine.KB.emergency) || {};
    const body = el('div');

    // 现金估算：按徒步露营晚数
    const sched = (plan && plan.schedule) || [];
    const campNights = sched.filter(d => d.camp && d.camp !== '出山' && !String(d.camp).includes('香格里拉镇')).length;
    const n = Math.max(1, campNights);
    const people = plan.groupSize || 1;
    const low = n * 30 + 50 + 300;
    const high = n * 50 + 80 + 500 + 300;
    const cash = el('div', 'emer-cash');
    cash.appendChild(el('div', 'ec-head', '💵 现金携带建议（全程无信号、无移动支付）'));
    cash.appendChild(el('div', 'ec-big', `人均 <b>${low}~${high}</b> 元` + (people > 1 ? ` · <b>${people}</b> 人合计 <b>${low * people}~${high * people}</b> 元` : '') + `<span class="ec-sub">（${people} 人 × 露营 ${n} 晚）</span>`));
    const rows = el('div', 'g-list');
    [
      ['⛺ 营地费', `${n} 晚 × 30~50 元/人 = ${n * 30}~${n * 50} 元（波拥措免费 / 贡嘎扎则 30 / 新果·蛇湖 50）`],
      ['⛽ 气罐', '230g 高原罐 50~80 元/罐，7 天约 1 大 + 1 小'],
      ['🐴 骑马（可选）', '300~500 元/天（洛绒牛场—牛奶海约 300 单程），先谈价再上马'],
      ['🚑 应急备用', '200~300 元（临时补给 / 救援联系 / 下撤打车）'],
    ].forEach(([k, v]) => rows.appendChild(el('div', 'g-item', `<span class="dot">💵</span><div><b>${k}</b>：${v}</div>`)));
    cash.appendChild(rows);
    if (E.cash && E.cash.totalHint) cash.appendChild(el('div', 'callout warn', '💰 ' + E.cash.totalHint + '：实测有人用半包茶叶抵了贡嘎扎则的 30 元营地费 → 备 50/20/10 元零钞'));
    body.appendChild(cash);

    // 一键呼出电话
    const ph = el('div', 'emer-phones');
    ph.appendChild(el('div', 'r-sub', '📞 一键呼出（手机触碰号码即拨）'));
    (E.phones || []).forEach(p => {
      const row = el('div', 'g-item');
      row.appendChild(el('span', 'dot', p.k.slice(0, 1)));
      const inner = el('div');
      inner.innerHTML = `<b>${p.k}</b>：<a class="tel-link" href="tel:${String(p.v).replace(/[^0-9+]/g, '')}">${p.v}</a>${p.note ? ` <span class="g-note">— ${p.note}</span>` : ''}`;
      row.appendChild(inner);
      ph.appendChild(row);
    });
    body.appendChild(ph);

    // 卫星通讯 + 下撤
    if (E.satellite) body.appendChild(el('div', 'callout gold', '🛰️ ' + E.satellite));
    if (E.retreat) body.appendChild(el('div', 'callout warn', '⚠️ ' + E.retreat));
    // 合规提示一行
    const legal = (plan.pending || []).find(x => x.includes('穿越合规')) || '出发前致电亚管局 0836-6966022 确认穿越报备通道（2026-09-01 新规）';
    body.appendChild(el('div', 'callout hot', '⚖️ ' + legal));
    return body;
  }

  /* ---------- 🖨️ #123 打印版每日路书 ---------- */
  function buildPrintBook(plan, weather, startDate) {
    const sched = (plan && plan.schedule) || [];
    const meta = (plan && plan.meta) || {};
    const E = (plan && plan.emergency) || {};
    const dateFmt = (dt) => (dt.getMonth() + 1) + '/' + dt.getDate();

    const pb = el('div', 'pb-doc');
    const head = el('div', 'pb-head');
    head.appendChild(el('h1', 'pb-title', meta.name || '稻城亚丁大转山 · 每日路书'));
    const nPeople = plan.groupSize || 1;
    head.appendChild(el('div', 'pb-sub', `出发 ${dateFmt(startDate)} · ${sched.length} 天 · ${nPeople} 人 · ${meta.distance || ''} · ${meta.elevation || ''} · ${meta.bestWindow || ''}`));
    pb.appendChild(head);

    // 每日表
    const tbl = el('table', 'pb-table');
    tbl.innerHTML = '<tr><th>日期</th><th>天</th><th>行程</th><th>里程</th><th>爬升</th><th>垭口</th><th>营地</th><th>天气</th></tr>';
    sched.forEach((d, i) => {
      const dt = new Date(startDate);
      dt.setDate(dt.getDate() + i);
      const w = weather && weather[i];
      let wstr = '';
      if (w && w.code !== null && w.code !== undefined) wstr = `${w.tmin}~${w.tmax}℃${w.pop !== null && w.pop !== undefined ? ' 降水' + w.pop + '%' : ''}`;
      else if (w) wstr = w.type || '';
      const tr = el('tr');
      tr.innerHTML = `<td>${dateFmt(dt)}</td><td>${d.day || ''}</td><td>${escapeHtml(d.route || '')}</td><td>${d.dist || '—'}</td><td>${d.climb || '—'}</td><td>${d.pass || '—'}</td><td>${escapeHtml(d.camp || '')}</td><td>${wstr}</td>`;
      tbl.appendChild(tr);
    });
    pb.appendChild(tbl);

    // 关键节点
    const key = el('div', 'pb-sec');
    key.appendChild(el('h2', 'pb-sec-t', '📌 关键节点'));
    key.appendChild(el('div', 'pb-line', '· 垭口：措该达 5036m / 杂巴拉 4750m / 黑湖 4720-4750m / 松多 4670-4710m / 松洛 4650m — 白天过垭口、午后不上山'));
    key.appendChild(el('div', 'pb-line', '· 水源：新果牛场无水源需提前备足；营地水源多受牦牛污染必须过滤/煮沸'));
    key.appendChild(el('div', 'pb-line', '· 现金：全程无信号无移动支付，营地费/骑马均现金，备 500-1000 元零钞'));
    key.appendChild(el('div', 'pb-line', '· 时间：最高营地可不过夜翻垭口防高反；垭口 10 月可能暗冰，冰爪雪套必带'));
    pb.appendChild(key);

    // 应急电话
    const em = el('div', 'pb-sec');
    em.appendChild(el('h2', 'pb-sec-t', '☎️ 应急电话与下撤'));
    (E.phones || []).forEach(p => em.appendChild(el('div', 'pb-line', `· ${p.k}：${p.v}${p.note ? '（' + p.note + '）' : ''}`)));
    if (E.retreat) em.appendChild(el('div', 'pb-line warn', '· 下撤：' + E.retreat));
    pb.appendChild(em);

    // 风险摘要（前 4 条）
    const rk = el('div', 'pb-sec');
    rk.appendChild(el('h2', 'pb-sec-t', '⚠️ 核心风险提醒'));
    ((plan && plan.risks) || []).slice(0, 4).forEach(r => rk.appendChild(el('div', 'pb-line warn', '· ' + r)));
    pb.appendChild(rk);

    pb.appendChild(el('div', 'pb-foot', '平台生成于 ' + new Date().toLocaleString('zh-CN') + ' · 信息核实基准 2026-09-10，出行前请以官方公告为准'));
    return pb;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function openPrintBook(plan, weather, startDate) {
    const old = document.getElementById('printBookOverlay');
    if (old) old.remove();
    const wrap = el('div', 'print-book-overlay');
    wrap.id = 'printBookOverlay';
    const toolbar = el('div', 'pb-toolbar');
    toolbar.appendChild(el('span', 'pb-ttl', '🖨️ A4 打印版路书预览（关闭打印用）'));
    const prBtn = el('button', 'pb-btn', '🖨️ 打印 / 另存 PDF');
    const closeBtn = el('button', 'pb-btn', '✕ 关闭');
    toolbar.appendChild(prBtn);
    toolbar.appendChild(closeBtn);
    wrap.appendChild(toolbar);
    wrap.appendChild(buildPrintBook(plan, weather, startDate));
    document.body.appendChild(wrap);
    prBtn.onclick = () => { try { window.print(); } catch (e) { alert('请使用浏览器菜单打印'); } };
    closeBtn.onclick = () => wrap.remove();
    wrap.scrollIntoView();
  }

  /* ---------- 新增样式注入 ---------- */
  function injectPlanXtendCSS() {
    if (document.getElementById('planx-css')) return;
    const st = document.createElement('style');
    st.id = 'planx-css';
    st.textContent = `
      /* 装备清单 */
      .gear-ck{margin-top:4px}
      .gear-progress{margin-bottom:8px}
      .gp-bar{height:8px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden}
      .gp-fill{height:100%;width:0%;border-radius:99px;background:linear-gradient(90deg,#667eea,#a78bfa);transition:width .3s}
      .gp-txt{font-size:12px;color:var(--txt-mid,#94a3b8);margin-top:6px;line-height:1.5}
      .gp-txt b{color:var(--txt,#e2e8f0)}
      .gear-tools{display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap}
      .gear-tool-btn{flex:0 0 auto;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);color:var(--txt,#e2e8f0);border-radius:8px;padding:5px 12px;font-size:12px;cursor:pointer}
      .gear-tool-btn:hover{background:rgba(255,255,255,.16)}
      .gear-saved{font-size:11px;color:var(--txt-mid,#94a3b8);margin-left:auto}
      .gear-cat{margin-bottom:10px}
      .gc-title{font-size:13px;font-weight:600;color:var(--txt,#e2e8f0);margin-bottom:6px}
      .gc-n{font-weight:400;color:var(--txt-mid,#94a3b8);font-size:11px}
      .gc-items{display:flex;flex-direction:column;gap:4px}
      .gi{display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:8px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07);cursor:pointer;flex-wrap:wrap}
      .gi:hover{background:rgba(255,255,255,.09)}
      .gi-cb{accent-color:#667eea;width:15px;height:15px;flex:0 0 auto;cursor:pointer}
      .gi-name{font-size:13px;font-weight:500;color:var(--txt,#e2e8f0)}
      .gi-brand{font-size:11px;color:var(--txt-mid,#94a3b8);flex:1 1 40%;min-width:120px}
      .gi-right{margin-left:auto;flex:0 0 auto}
      .gi-w{font-size:11px;color:var(--txt-mid,#94a3b8);white-space:nowrap}
      .gear-note{font-size:11px;color:var(--txt-mid,#94a3b8);line-height:1.6;margin-top:8px;padding:8px 10px;background:rgba(255,255,255,.04);border-radius:8px}
      /* 应急现金 */
      .emer-cash{margin-bottom:10px}
      .ec-head{font-size:13px;font-weight:600;color:var(--txt,#e2e8f0);margin-bottom:6px}
      .ec-big{font-size:15px;color:var(--txt,#e2e8f0);background:linear-gradient(90deg,rgba(251,191,36,.14),rgba(251,191,36,.05));border:1px solid rgba(251,191,36,.25);border-radius:10px;padding:10px 12px;margin-bottom:8px}
      .ec-big b{color:#fbbf24}
      .ec-sub{font-size:11px;color:var(--txt-mid,#94a3b8);margin-left:6px}
      .tel-link{color:#60a5fa;font-weight:600;text-decoration:underline dotted}
      .g-note{color:#94a3b8;font-size:11px}
      .callout.hot{background:rgba(244,63,94,.12);border-color:rgba(244,63,94,.35);color:#fecdd3}
      /* 日出日落 chip */
      .sun-chip{display:inline-flex;gap:10px;flex-wrap:wrap;margin-top:6px;font-size:12px;color:var(--txt-mid,#94a3b8)}
      .sun-chip .sc{border-radius:8px;padding:3px 8px;background:rgba(102,126,234,.14);border:1px solid rgba(102,126,234,.3)}
      .sun-chip .sc.on{background:rgba(251,191,36,.16);border-color:rgba(251,191,36,.4);color:#fcd34d}
      /* 打印路书 overlay */
      .print-book-overlay{position:fixed;inset:0;z-index:99999;background:#eef2f7;overflow:auto;padding:16px}
      .pb-toolbar{position:sticky;top:0;z-index:2;display:flex;gap:10px;align-items:center;background:#eef2f7;padding:8px 2px 10px;flex-wrap:wrap}
      .pb-ttl{font-size:14px;font-weight:600;color:#334155;margin-right:auto}
      .pb-btn{background:#2563eb;color:#fff;border:none;border-radius:8px;padding:7px 16px;font-size:13px;cursor:pointer}
      .pb-btn:hover{background:#1d4ed8}
      .pb-doc{max-width:820px;margin:0 auto;background:#fff;color:#0f172a;padding:34px 40px;border-radius:12px;box-shadow:0 10px 30px rgba(15,23,42,.18)}
      .pb-title{font-size:22px;margin:0 0 4px;color:#0f172a}
      .pb-sub{font-size:13px;color:#475569;margin-bottom:14px;line-height:1.6}
      .pb-table{width:100%;border-collapse:collapse;font-size:12px;margin:12px 0 18px}
      .pb-table th{background:#475569;color:#fff;padding:5px 6px;text-align:left;font-weight:600}
      .pb-table td{border:1px solid #cbd5e1;padding:5px 6px;color:#0f172a}
      .pb-table tr:nth-child(even) td{background:#f8fafc}
      .pb-sec{margin-bottom:14px}
      .pb-sec-t{font-size:15px;color:#0f172a;margin:0 0 6px;border-bottom:2px solid #e2e8f0;padding-bottom:4px}
      .pb-line{font-size:12px;color:#334155;line-height:1.9}
      .pb-line.warn{color:#b91c1c}
      .pb-foot{font-size:11px;color:#94a3b8;margin-top:16px;border-top:1px solid #e2e8f0;padding-top:8px}
      @media print {
        body > *:not(.print-book-overlay){display:none !important}
        .print-book-overlay{position:static;background:#fff;padding:0;overflow:visible}
        .pb-toolbar{display:none !important}
        .pb-doc{box-shadow:none;border-radius:0;max-width:none;padding:0}
        .pb-table{page-break-inside:auto}
        .pb-sec,.pb-head{page-break-inside:avoid}
      }
    `;
    document.head.appendChild(st);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectPlanXtendCSS);
  else injectPlanXtendCSS();

  function renderResult(plan, weather, trackSegs, startDate) {
    const box = document.getElementById('planResult');
    box.innerHTML = '';
    box.classList.add('open');

    // 已选车次（从 generatePlan 注入 plan.userPick；酒店改为预算驱动推荐）
    const PICK_TRAIN_SEL = plan.userPick?.trainSel || '';

    const modeTag = el('div', 'r-sub', '🤖 规则引擎生成 · 出发日 ' + (startDate.getMonth() + 1) + '/' + startDate.getDate());
    box.appendChild(modeTag);

    /* 1. 摘要 */
    const sum = plan.summary || {}, meta = plan.meta || {};
    const sumCard = el('div', 'summary-card');
    sumCard.appendChild(el('h2', '', sum.title || meta.name || '徒步攻略'));
    if (sum.route || meta.route) sumCard.appendChild(el('div', 'route', '📍 ' + (sum.route || meta.route)));
    const kv = el('div', 'kv');
    [sum.distance || meta.distance, sum.days, meta.elevation, meta.bestWindow, meta.difficulty]
      .filter(Boolean).forEach(t => kv.appendChild(el('span', '', t)));
    sumCard.appendChild(kv);
    if (sum.weather) sumCard.appendChild(el('div', 'weather-box', '🌤️ ' + sum.weather.replace(/\n/g, '<br>')));
    if (sum.weatherAlert) sumCard.appendChild(el('div', 'alert-box', '⚠️ ' + sum.weatherAlert));
    box.appendChild(sumCard);

    /* 1.5 所选区间天气数据分析 */
    if (weather && weather.length) {
      const a = analyzePeriod(weather, startDate);
      const ab = el('div');
      const statRow = el('div', 'period-stats');
      a.stats.forEach(s => {
        statRow.appendChild(el('div', 'p-stat', `<div class="p-ico">${s.icon}</div><div class="p-val">${s.val}</div><div class="p-label">${s.label}</div>`));
      });
      ab.appendChild(statRow);
      if (a.tips.length) {
        const tips = el('div', 'g-list');
        a.tips.forEach(t => tips.appendChild(el('div', 'g-item gold', `<span class="dot">💡</span><div>${t}</div>`)));
        ab.appendChild(tips);
      }
      box.appendChild(section('📊', `区间天气分析 · ${a.startLabel} — ${a.endLabel}（${a.n} 天）`, ab, '基于所选出发日期精确到日 · 实时预报 / 去年同期 / 知识库'));
    }

    /* 2. 每日行程（含 路上交通/徒步 拆分 + 逐日天气 + 地图高亮） */
    if (plan.schedule && plan.schedule.length) {
      const schedBody = el('div');
      // 日期选择条
      const picker = el('div', 'day-picker');
      const chipAll = el('button', 'day-chip all on', '🗺️ 全程');
      chipAll.onclick = () => {
        picker.querySelectorAll('.day-chip').forEach(c => c.classList.remove('on'));
        chipAll.classList.add('on');
        highlightDays('all', trackSegs);
      };
      picker.appendChild(chipAll);
      plan.schedule.forEach((d, i) => {
        const chip = el('button', 'day-chip', (i + 1) + '日');
        chip.onclick = () => {
          picker.querySelectorAll('.day-chip').forEach(c => c.classList.remove('on'));
          chip.classList.add('on');
          highlightDays(String(i + 1), trackSegs);
        };
        picker.appendChild(chip);
      });
      const pickerBox = el('div', 'r-sub', '📌 3D 地图按天高亮：');
      pickerBox.appendChild(picker);
      schedBody.appendChild(pickerBox);

      // 徒步日计数器：schedule 中的交通/适应日(如 7/8 天版 D1)不消耗轨迹段，
      // 5 天版 D1 即徒步日，因此必须按「是否为徒步日」对齐而非固定索引
      let segCursor = 0;
      plan.schedule.forEach((d, i) => {
        const item = el('div', 'sched-item');
        const top = el('div', 'sched-top');
        top.appendChild(el('span', 'sched-day', d.day));
        top.appendChild(el('div', 'sched-route', d.route || ''));
        item.appendChild(top);
        const metaRow = el('div', 'sched-meta');
        // P1: 每日 Naismith 耗时（timing.days 与 schedule 一一对应；适应日/无里程为 null 自动跳过）
        const tmDay = (plan.personalize && plan.personalize.timing && plan.personalize.timing.days) ? plan.personalize.timing.days[i] : null;
        if (tmDay && tmDay.display) metaRow.appendChild(el('span', 'p1-time', `⏱️ 约 ${tmDay.display}`));
        if (d.dist) metaRow.appendChild(el('span', '', `📏 ${d.dist}`));
        if (d.climb) metaRow.appendChild(el('span', '', `⛰️ <b>${d.climb}</b>`));
        if (d.pass) metaRow.appendChild(el('span', '', `🚩 ${d.pass}`));
        if (d.camp) metaRow.appendChild(el('span', '', `⛺ ${d.camp}`));
        item.appendChild(metaRow);

        /* 路上交通 + 徒步 拆分 */
        const w = weather[i];
        const split = el('div', 'day-split');
        if (i === 0) {
          // D1：交通日（出发→香格里拉镇）
          split.appendChild(el('span', 'tag2 travel', '🚗 交通：郑州→成都(夜车)→专线→香格里拉镇'));
        } else {
          split.appendChild(el('span', 'tag2 travel', '🚗 交通：无（营地连续）'));
        }
        if (d.dist && d.dist !== '—') {
          split.appendChild(el('span', 'tag2 trail', '🥾 徒步：' + d.dist + (d.climb && d.climb !== '—' ? ' ' + d.climb : '')));
        }
        item.appendChild(split);

        /* 逐日天气 */
        if (w) {
          const [icon, txt] = wmoInfo(w.code);
          const wx = el('div', 'sched-wx');
          const t = w.tmax !== null && w.tmin !== null ? `${icon} ${txt} ${w.tmin}~${w.tmax}℃` : `${icon} ${txt}（${w.type}）`;
          const tag = el('span', 'wx-tag', `${w.dateLabel} ${t}`);
          const note = el('span', 'wx-note', w.pop !== null ? `降水 ${w.pop}%` : (w.type || ''));
          wx.appendChild(tag);
          wx.appendChild(note);
          item.appendChild(wx);
        }

        /* 该日高程剖面：按「徒步日」与 trackSegs 对齐（交通/适应日跳过，不消耗轨迹段） */
        const isHikeDay = d.dist && d.dist !== '—';
        const seg = (isHikeDay && trackSegs) ? trackSegs[segCursor] : null;
        if (isHikeDay) segCursor++;
        if (seg && seg.pts && seg.pts.length >= 2) {
          const ep = el('div', 'sched-elev');
          // cap 用补齐海拔后的数据（5 天版 seg5_pts 无海拔，须 ensureAlt）
          const epts = ensureAlt(seg.pts);
          const emin = epts && epts.length ? Math.round(Math.min(...epts.map(p => p[2]))) : null;
          const emax = epts && epts.length ? Math.round(Math.max(...epts.map(p => p[2]))) : null;
          const cap = el('div', 'sched-elev-cap', `⛰️ 当日剖面 ${emin}m — ${emax}m · ${seg.stats?.d_km ?? ''}km`);
          const cv = el('canvas', 'sched-elev-canvas');
          ep.appendChild(cap);
          ep.appendChild(cv);
          item.appendChild(ep);
          requestAnimationFrame(() => drawMiniElevation(cv, seg.pts));
        }

        if (d.note) item.appendChild(el('div', 'sched-note', '💡 ' + d.note));
        schedBody.appendChild(item);
      });
      (plan.scheduleNotes || []).forEach(n => schedBody.appendChild(el('div', 'g-item gold', `<span class="dot">📌</span><div>${n}</div>`)));
      box.appendChild(section('🗓️', '每日行程安排 · 交通+徒步+天气', schedBody));
    }

    /* 3. 交通 */
    if (plan.transport) {
      const t = plan.transport;
      const tb = el('div', 'g-list');
      const add = (k, v) => { if (v) tb.appendChild(el('div', 'g-item', `<span class="dot">•</span><div>${k}：${v}</div>`)); };
      add('🚄 到达', t.train);
      add('🚐 专线拼车', (t.van?.contact || '') + ' ' + (t.van?.desc || ''));
      if (t.van?.price) add('💰 参考价', t.van.price);
      add('🗺️ 路线', t.route);
      add('⚠️ G227 提醒', t.g227);
      add('🔙 离开', t.return);
      if (t.planB) add('🅱️ 备选', t.planB);
      box.appendChild(section('🚗', '进出交通', tb, '从「' + (t.defaultFrom || '出发地') + '」出发'));
      // ★ 已选车次（需求：直接显示车次供选择）
      if (PICK_TRAIN_SEL) {
        const pb = el('div', 'g-list');
        pb.appendChild(el('div', 'g-item gold', `<span class="dot">🚆</span><div><b>已选车次</b>：${PICK_TRAIN_SEL}</div>`));
        box.appendChild(section('🚆', '你的车次', pb, '价格以 12306 实际为准'));
      }
      // 到达方式/偏好差异化建议
      if (t.arrive?.advice?.length) {
        const av = el('div', 'g-list');
        t.arrive.advice.forEach(a => av.appendChild(el('div', 'g-item gold', `<span class="dot">✈️</span><div>${a}</div>`)));
        box.appendChild(section('🧭', '到达方式建议 · ' + ({ train: '火车', flight: '飞机', van: '拼车' }[t.arrive.mode] || t.arrive.mode), av));
      }
      if (t.pref) box.appendChild(el('div', 'callout', t.pref));
      if (plan.groupAdvice) box.appendChild(section('🤝', '结伴建议', el('div', 'callout', '👥 ' + plan.groupAdvice)));
    }

    /* 3.5 个性化：经验×健康 差异 + 预算评估 + 拍摄机位 + 三套方案 */
    if (plan.personalize) {
      const P = plan.personalize;

      /* ★★★ 难度 × 风险评估（09-11 新增：TrailScope 思路 + 确定性加权模型） */
      if (P.difficulty && P.risk) {
        const scoreBox = el('div', 'score-box');

        /* —— 难度卡片 —— */
        const D = P.difficulty;
        const dCard = el('div', 'score-card diff');
        dCard.appendChild(el('div', 'sc-head', `<span class="sc-ico">🧗</span><b>路线难度</b><span class="sc-num" style="color:var(${D.score >= 85 ? '--brand-red' : D.score >= 62 ? '--brand-orange' : '--brand-blue'})">${D.score}<i>/100</i></span>`));
        const dBand = el('div', 'sc-band');
        const dFill = el('div', 'sc-fill', '');
        dFill.style.width = D.score + '%';
        dFill.style.background = D.score >= 85 ? 'linear-gradient(90deg,#f43f5e,#fb7185)' : D.score >= 62 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#3b82f6,#60a5fa)';
        dBand.appendChild(dFill);
        dCard.appendChild(dBand);
        const dTag = el('div', 'sc-tag' + (D.score >= 85 ? ' hot' : D.score >= 62 ? ' warm' : ' cool'), `${D.levelLabel} · ${D.levelKey}`);
        dCard.appendChild(dTag);
        D.dims.forEach(dm => {
          const row = el('div', 'sc-row');
          row.appendChild(el('div', 'sc-row-k', dm.k));
          const rb = el('div', 'sc-row-bar');
          const rf = el('div', 'sc-row-fill', '');
          rf.style.width = Math.max(4, dm.pct) + '%';
          rf.style.background = 'var(--brand-blue)';
          rb.appendChild(rf);
          row.appendChild(rb);
          row.appendChild(el('div', 'sc-row-v', `<b>${dm.v}/${dm.max}</b><span>${dm.note}</span>`));
          dCard.appendChild(row);
        });
        if (D.compact) dCard.appendChild(el('div', 'sc-note', `⚡ 天数紧凑度修正 +${D.compact}：徒步日越少，连续高强度日越多`));
        dCard.appendChild(el('div', 'sc-sum', '💡 ' + D.summary));
        scoreBox.appendChild(dCard);

        /* —— 风险卡片 —— */
        const R = P.risk;
        const rColor = R.score >= 75 ? 'var(--brand-red)' : R.score >= 60 ? 'var(--brand-orange)' : R.score >= 40 ? 'var(--brand-amber)' : 'var(--brand-green)';
        const rFillBg = R.score >= 75 ? 'linear-gradient(90deg,#e11d48,#f43f5e)' : R.score >= 60 ? 'linear-gradient(90deg,#d97706,#f59e0b)' : R.score >= 40 ? 'linear-gradient(90deg,#ca8a04,#eab308)' : 'linear-gradient(90deg,#16a34a,#4ade80)';
        const rCard = el('div', 'score-card risk');
        rCard.appendChild(el('div', 'sc-head', `<span class="sc-ico">⚠️</span><b>出行风险</b><span class="sc-num" style="color:${rColor}">${R.score}<i>/100</i></span>`));
        const rBand = el('div', 'sc-band');
        const rFill = el('div', 'sc-fill', '');
        rFill.style.width = R.score + '%';
        rFill.style.background = rFillBg;
        rBand.appendChild(rFill);
        rCard.appendChild(rBand);
        rCard.appendChild(el('div', 'sc-tag' + (R.score >= 75 ? ' hot' : R.score >= 60 ? ' warm' : R.score >= 40 ? ' amber' : ' cool'), `${R.levelLabel} · ${R.levelKey}`));
        R.dims.forEach(dm => {
          const row = el('div', 'sc-row');
          row.appendChild(el('div', 'sc-row-k', dm.k));
          const rb = el('div', 'sc-row-bar');
          const rf = el('div', 'sc-row-fill', '');
          rf.style.width = Math.max(4, dm.pct) + '%';
          rf.style.background = dm.v / dm.max >= 0.75 ? '#f43f5e' : dm.v / dm.max >= 0.5 ? '#f59e0b' : '#eab308';
          rb.appendChild(rf);
          row.appendChild(rb);
          row.appendChild(el('div', 'sc-row-v', `<b>${dm.v}/${dm.max}</b><span>${dm.note}</span>`));
          rCard.appendChild(row);
        });
        if (R.expPts !== 0) rCard.appendChild(el('div', 'sc-note', `${R.expPts > 0 ? '🔺' : '🔻'} 经验修正 ${R.expPts > 0 ? '+' : ''}${R.expPts}（${R.expPts > 0 ? '新手：高原经验不足，风险上调' : '老手：经验下调风险'}` + (R.loadPts ? ` · 重装 +${R.loadPts}` : '') + '）'));
        rCard.appendChild(el('div', 'sc-sum' + (R.score >= 60 ? ' warn' : ''), '🛡️ ' + R.advice));
        scoreBox.appendChild(rCard);

        box.appendChild(section('🎯', '难度 × 风险评估', scoreBox, '基于路线特征 × 你的画像 × 月份气候自动计算'));
      }

      /* 个性化理由（"因为你是X，所以Y"） */
      if (P.why && P.why.length) {
        const wb = el('div', 'g-list');
        P.why.forEach(w => wb.appendChild(el('div', 'g-item gold', `<span class="dot">🧬</span><div>${w}</div>`)));
        box.appendChild(section('🧬', '为什么这样推荐你', wb, '基于你填写的画像 · 可解释'));
      }

      /* 经验水平差异化 */
      if (P.experience) {
        const e = P.experience;
        const eb = el('div', 'g-list');
        const add = (k, v) => { if (v) eb.appendChild(el('div', 'g-item', `<span class="dot">•</span><div><b>${k}</b>：${v}</div>`)); };
        add('水平', e.label + '（' + e.level + '）');
        add('天数', e.days);
        add('节奏', e.pace);
        add('垭口', e.pass);
        add('装备', e.gear);
        add('风险', e.risk);
        add('提醒', e.note);
        box.appendChild(section('🎯', '按你的经验水平定制', eb));
      }

      /* 健康建议 */
      if (P.healthTips && P.healthTips.length) {
        const hb = el('div', 'g-list');
        P.healthTips.forEach(h => hb.appendChild(el('div', 'g-item warn', `<span class="dot">🩺</span><div>${h}</div>`)));
        box.appendChild(section('🩺', '健康提醒', hb, '高反/膝盖/老人小孩 已纳入评估'));
      }

      /* 预算评估 */
      if (P.budget) {
        const b = P.budget;
        const bb = el('div');
        const head = el('div', 'budget-head', '💰 预估总花费 <b>' + b.total + '</b> 元/人' + (b.holiday ? '（国庆档）' : '（平日档）'));
        bb.appendChild(head);
        const tbl = el('div', 'g-list');
        b.rows.forEach(r => {
          tbl.appendChild(el('div', 'g-item', `<span class="dot">${r.k[0]}</span><div>${r.k}：<b>${r.per}</b> 元 ${r.note ? '<span style="color:#94a3b8">' + r.note + '</span>' : ''}　<span style="color:#94a3b8;font-size:12px">${r.v}</span></div>`));
        });
        bb.appendChild(tbl);
        if (b.tips && b.tips.length) {
          const tips = el('div', 'g-list');
          b.tips.forEach(tp => tips.appendChild(el('div', 'g-item ' + (tp.includes('⚠️') || tp.includes('→') ? 'warn' : (tp.includes('✅') ? 'good' : 'gold')), `<span class="dot">${tp.includes('⚠️') ? '⚠️' : (tp.includes('→') ? '➡️' : (tp.includes('✅') ? '✅' : '💡'))}</span><div>${tp}</div>`)));
          bb.appendChild(tips);
        }
        if (b.hotelRec) {
          // ★ 预算驱动酒店推荐（需求：先确认预算，再按预算反推推荐酒店，不再让用户选择）
          const rec = b.hotelRec;
          const recBox = el('div', 'hotel-rec-box');
          const headLine = el('div', 'hr-head');
          headLine.innerHTML = `🏨 按预算 ${b.budget} 元，为你匹配住宿：<b>${rec.primary.name}</b>`;
          recBox.appendChild(headLine);
          if (rec.primary.ref) recBox.appendChild(el('div', 'hr-ref', '参考价：' + rec.primary.ref + (rec.primary.per ? `（人均约 ${rec.primary.per} 元/晚）` : '')));
          if (rec.primary.dist) recBox.appendChild(el('div', 'hr-dist', '📍 ' + rec.primary.dist));
          if (rec.primary.note) recBox.appendChild(el('div', 'hr-note', '💡 ' + rec.primary.note));
          if (rec.primary.tel) recBox.appendChild(el('div', 'hr-tel', '📞 <b style="color:var(--brand-blue)">' + rec.primary.tel + '</b>'));
          if (rec.tight) recBox.appendChild(el('div', 'hr-warn', '⚠️ 预算偏紧：住宿可支配约 ' + rec.disposable + ' 元，已退而推荐最便宜的档位，建议压缩其他花费或追加预算'));
          if (rec.alternates && rec.alternates.length) {
            const alt = el('div', 'hr-alt');
            alt.appendChild(el('div', 'hr-alt-title', '🔄 备选（预算内可换）：'));
            rec.alternates.forEach(a => {
              alt.appendChild(el('div', 'hr-alt-item', `${a.name}（${a.ref}${a.tel ? ' · 📞 ' + a.tel : ''}）`));
            });
            recBox.appendChild(alt);
          }
          bb.appendChild(recBox);
        }
        box.appendChild(section('💰', '预算评估（帮你算清楚花多少）', bb, b.hasBudget ? '基于你的预算 ' + b.budget + ' 元' : '未填预算按默认档估算'));
      }

      /* 拍摄机位 */
      if (P.shots && P.shots.length) {
        const sb = el('div', 'g-list');
        // #125 机位日期推算：按 schedule 中 day 标签匹配索引 → 出发日顺推
        const dateOf = (dayTag) => {
          const idx = (plan.schedule || []).findIndex(d => d.day === dayTag);
          if (idx < 0) return '';
          const dts = new Date(startDate);
          dts.setDate(dts.getDate() + idx);
          // 用本地日期（勿用 toISOString——UTC+8 会偏一天）
          return dts.getFullYear() + '-' + pad2(dts.getMonth() + 1) + '-' + pad2(dts.getDate());
        };
        P.shots.forEach(s => {
          const item = el('div', 'g-item');
          const ih = el('div');
          ih.innerHTML = `<b>${s.day} ${s.camp}</b> · 拍 ${s.peak}（${s.best}）<br><span style="color:#94a3b8;font-size:12px">${s.tip}</span>`;
          // 日出日落联动 chip（异步填充，Open-Meteo → 离线天文兜底）
          const chips = el('div', 'sun-chip');
          chips.appendChild(el('span', 'sc', '🌅 计算中…'));
          ih.appendChild(chips);
          item.appendChild(el('span', 'dot', '📷'));
          item.appendChild(ih);
          sb.appendChild(item);
          const dateISO = dateOf(s.day);
          if (dateISO && s.lat != null) {
            fetchSunTimes(s.lat, s.lon, dateISO).then(st => {
              chips.innerHTML = `<span class="sc on">🌅 日出 ${st.sunrise}</span><span class="sc on">🌇 日落 ${st.sunset}</span><span class="g-note" style="color:#94a3b8">${s.best} · ${st.src}</span>`;
            }).catch(() => { chips.innerHTML = ''; });
          } else {
            chips.innerHTML = '';
          }
        });
        box.appendChild(section('📷', '拍摄机位 · 在哪个位置拍哪边的山', sb, '机位 × 出发日期 × 日出日落联动'));
      }

      /* 三套方案对比 */
      if (P.variants && P.variants.length) {
        const vb = el('div');
        const row = el('div', 'variant-row');
        P.variants.forEach(v => {
          const card = el('div', 'variant-card' + (v.key === 'standard' ? ' rec' : ''));
          card.appendChild(el('div', 'v-label', v.label));
          card.appendChild(el('div', 'v-days', v.days + ' 天'));
          card.appendChild(el('div', 'v-desc', v.desc));
          card.appendChild(el('div', 'v-why', v.why));
          row.appendChild(card);
        });
        vb.appendChild(row);
        vb.appendChild(el('div', 'r-sub', '💡 同一画像生成 3 套方案，保守/标准/激进在里程、天数、适应日上错开，可按需切换'));
        box.appendChild(section('🎛️', '三套方案任你选', vb, '对比后挑最适合你的节奏'));
      }
    }

    /* 4. 门票 */
    if (plan.ticket) {
      const tk = plan.ticket;
      const tb = el('div', 'g-list');
      const add = (k, v) => tb.appendChild(el('div', 'g-item', `<span class="dot">•</span><div><b>${k}</b>：${v}</div>`));
      add('🎫 免票政策', tk.freePeriod);
      add('🕖 放票时间', tk.releaseTime);
      add('📅 预约窗口', tk.window);
      add('📱 预约渠道', tk.channel);
      add('🪪 入园方式', tk.entry);
      add('⏰ 开放时间', tk.hours);
      add('🔥 防火期', tk.fireSeason);
      add('🚫 禁带', tk.banned);
      add('↩️ 退改规则', tk.refund);
      if (tk.shuttleFree) add('🚌 观光车', tk.shuttleFree);
      box.appendChild(section('🎫', '门票与预约', tb, '重要！提前 15 天抢'));
    }

    /* 5. 住宿 */
    if (plan.hotels) {
      const hb = el('div', 'g-list');
      // ★ 预算驱动推荐（优先展示预算反推的首推酒店；未填预算则默认档）
      const bRec = plan.personalize?.budget?.hotelRec;
      if (bRec && bRec.primary) {
        const p = bRec.primary;
        const tag = bRec.tight ? '（预算紧·已退而求次）' : '';
        hb.appendChild(el('div', 'g-item good', `<span class="dot">✅</span><div><b>预算匹配首推：${p.name}</b> ${tag}<br><span style="color:#94a3b8;font-size:12px">${p.ref}${p.per ? ' ｜ 人均约 ' + p.per + ' 元/晚' : ''}${p.dist ? ' ｜ ' + p.dist : ''}${p.tel ? ' ｜ 📞 <b style="color:var(--brand-blue)">' + p.tel + '</b>' : ''}</span>${p.note ? '<br><span style="color:#94a3b8;font-size:11px">' + p.note + '</span>' : ''}</div>`));
        if (bRec.alternates && bRec.alternates.length) {
          bRec.alternates.forEach(a => {
            hb.appendChild(el('div', 'g-item', `<span class="dot">🔄</span><div><b>${a.name}</b><br><span style="color:#94a3b8;font-size:12px">${a.ref}${a.per ? ' ｜ 人均约 ' + a.per + ' 元/晚' : ''}${a.tel ? ' ｜ 📞 <b style="color:var(--brand-blue)">' + a.tel + '</b>' : ''}</span></div>`));
          });
        }
      }
      Object.entries(plan.hotels).forEach(([name, h]) => {
        hb.appendChild(el('div', 'g-item', `<span class="dot">🏨</span><div><b>${name}</b> ${h.alt} · ${h.rec}<br><span style="color:#94a3b8;font-size:12px">淡季：${h.low} ｜ 国庆：${h.holiday} ｜ ${h.dist}</span></div>`));
      });
      // 备查：全部可订酒店（含联系电话，供预算外升档/比价参考）
      const hotelsWithTel = (global.YadingEngine.KB?.costs?.hotels) || [];
      if (hotelsWithTel.length) {
        const pickList = el('div', 'g-list');
        hotelsWithTel.forEach(h => {
          pickList.appendChild(el('div', 'g-item', `<span class="dot">🏨</span><div><b>${h.name}</b> · ${h.area}（${h.dist}）<br><span style="color:#94a3b8;font-size:12px">平日：${h.low} ｜ 国庆：${h.holiday} ｜ 📞 <b style="color:var(--brand-blue)">${h.tel}</b></span><br><span style="color:#94a3b8;font-size:11px">${h.note}</span></div>`));
        });
        hb.appendChild(el('div', 'r-sub', '🏨 全部可订酒店（含联系电话，按预算自动匹配，也可自行比价升档）'));
        hb.appendChild(pickList);
      }
      box.appendChild(section('🏨', '住宿建议', hb, '香格里拉镇 2900m 首选（低海拔适应）'));
    }

    /* 6. 装备 */
    if (plan.gear) {
      const g = plan.gear;
      const gb = el('div');
      if (g.core && g.core.length) {
        gb.appendChild(el('div', 'r-sub', '🧗 核心装备'));
        const list = el('div', 'tag-row');
        g.core.forEach(x => list.appendChild(el('span', 'tag', x)));
        gb.appendChild(list);
      }
      if (g.octAdd && g.octAdd.length) {
        gb.appendChild(el('div', 'r-sub', '❄️ 10月/垭口增补'));
        const list = el('div', 'tag-row');
        g.octAdd.forEach(x => list.appendChild(el('span', 'tag', x)));
        gb.appendChild(list);
      }
      if (g.medicine && g.medicine.length) {
        gb.appendChild(el('div', 'r-sub', '💊 药品与高反'));
        const list = el('div', 'tag-row');
        g.medicine.forEach(x => list.appendChild(el('span', 'tag', x)));
        gb.appendChild(list);
      }
      if (g.stove) gb.appendChild(el('div', 'callout', '🔥 ' + g.stove));
      // ★ 网上经验增补（需求：装备结合网上经验）
      if (g.proTips && g.proTips.length) {
        gb.appendChild(el('div', 'r-sub', '📚 网上经验增补（驴友/攻略实测）'));
        const tips = el('div', 'g-list');
        g.proTips.forEach(tp => tips.appendChild(el('div', 'g-item', `<span class="dot">🟢</span><div>${tp}</div>`)));
        gb.appendChild(tips);
      }
      // ★ 2026-09-14 装备勾选清单（#122）：可打包进度跟踪 + localStorage 持久化
      const gearCk = renderGearChecklist(plan.gear, 'ydgear-' + fmtLocal(new Date(startDate)) + '-' + (plan.groupSize || 1) + '人');
      if (gearCk.children.length) gb.appendChild(gearCk);
      box.appendChild(section('🎒', '装备清单', gb, '重装自备 · 深秋/垭口增补 · 勾选即打包 🧗'));
    }

    /* 6.5 应急与现金（#124）：无信号 · 现金为王 · 一键呼出 */
    if (plan.emergency || (typeof YadingEngine !== 'undefined' && YadingEngine.KB && YadingEngine.KB.emergency)) {
      box.appendChild(section('🆘', '应急与现金', buildEmergencySection(plan), '全程无信号 · 现金为王 · 一键呼出'));
    }

    /* 7. 风险 */
    if (plan.risks && plan.risks.length) {
      const rb = el('div', 'g-list');
      plan.risks.forEach(r => rb.appendChild(el('div', 'g-item warn', `<span class="dot">⚠️</span><div>${r}</div>`)));
      box.appendChild(section('🧯', '风险与应对', rb, '高海拔 · 认真对待'));
    }

    /* 8. 商业队 / 特别需求 / 待核 */
    const extra = el('div');
    if (plan.specials && plan.specials.length) {
      const sp = el('div', 'g-list');
      plan.specials.forEach(s => sp.appendChild(el('div', 'g-item gold', `<span class="dot">✨</span><div>${s}</div>`)));
      extra.appendChild(section('✨', '你的特别需求', sp));
    }
    if (plan.teams && plan.teams.length) {
      const tb = el('div', 'g-list');
      plan.teams.forEach(t => tb.appendChild(el('div', 'g-item', `<span class="dot">👥</span><div><b>${t.name}</b> · ${t.contact}<br><span style="color:#94a3b8;font-size:12px">${t.price}</span></div>`)));
      extra.appendChild(section('🤝', '商业队参考', tb, '不想自己做攻略可直接报团'));
    }
    if (plan.pending && plan.pending.length) {
      extra.appendChild(el('div', 'pending', '📋 出行前待核实：' + plan.pending.join('；')));
    }
    if (extra.children.length) box.appendChild(extra);

    /* 复制按钮 */
    const copyBtn = el('button', 'copy-btn', '📋 复制完整攻略到剪贴板');
    copyBtn.onclick = () => {
      const text = buildPlainText(plan, weather, startDate);
      const done = () => { copyBtn.textContent = '✅ 已复制！'; setTimeout(() => copyBtn.textContent = '📋 复制完整攻略到剪贴板', 2000); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => prompt('手动复制：', text));
      } else prompt('手动复制：', text);
    };
    box.appendChild(copyBtn);

    /* 🖨️ 打印版每日路书（#123） */
    const pbBtn = el('button', 'copy-btn', '🖨️ 打印每日路书');
    pbBtn.onclick = () => openPrintBook(plan, weather, startDate);
    box.appendChild(pbBtn);

    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* 纯文本导出 */
  function buildPlainText(plan, weather, startDate) {
    const L = [];
    const meta = plan.meta || {}, sum = plan.summary || {};
    L.push('═══════════════════');
    L.push('  ' + (sum.title || meta.name || '徒步攻略'));
    L.push('═══════════════════');
    if (sum.route || meta.route) L.push('路线：' + (sum.route || meta.route));
    if (sum.distance) L.push('里程：' + sum.distance);
    if (meta.elevation) L.push('海拔：' + meta.elevation);
    if (sum.days) L.push('行程：' + sum.days);
    if (sum.weather) L.push('\n【天气】' + sum.weather);
    if (sum.weatherAlert) L.push('【提醒】' + sum.weatherAlert);
    if (weather && weather.length) {
      const a = analyzePeriod(weather, startDate);
      L.push('\n【区间天气分析 ' + a.startLabel + '—' + a.endLabel + '】');
      a.stats.forEach(s => L.push('  ' + s.icon + ' ' + s.label + '：' + s.val));
      a.tips.forEach(t => L.push('  💡 ' + t));
    }
    if (plan.schedule) {
      L.push('\n【每日行程】');
      plan.schedule.forEach((d, i) => {
        L.push(`${d.day} ${d.route || ''} | ${d.dist || ''} ${d.climb ? '爬升' + d.climb : ''}${d.pass ? ' | 垭口' + d.pass : ''}${d.camp ? ' | 营地' + d.camp : ''}`);
        const w = weather && weather[i];
        if (w) {
          const [icon, txt] = wmoInfo(w.code);
          const t = w.tmax !== null ? `${w.tmin}~${w.tmax}℃` : '';
          L.push(`     [天气 ${w.dateLabel} ${icon}${txt} ${t}${w.pop !== null ? ' 降水' + w.pop + '%' : ''}]`);
        }
        if (d.note) L.push('     ' + d.note);
      });
    }
    if (plan.transport) {
      const t = plan.transport;
      L.push('\n【交通】');
      if (plan.userPick?.trainSel) L.push('已选车次：' + plan.userPick.trainSel);
      if (t.train) L.push('到达：' + t.train);
      if (t.van) L.push('专线：' + (t.van.contact || '') + (t.van.desc ? ' ' + t.van.desc : ''));
      if (t.van?.price) L.push('参考价：' + t.van.price);
      if (t.return) L.push('离开：' + t.return);
      if (t.pref) L.push(t.pref);
    }
    if (plan.personalize) {
      const P = plan.personalize;
      if (P.why?.length) L.push('\n【为什么这样推荐你】\n' + P.why.map(w => '  • ' + w).join('\n'));
      if (P.experience) {
        const e = P.experience;
        L.push('\n【经验定制 ' + e.label + ' ' + e.level + '】');
        L.push('  天数：' + e.days);
        L.push('  节奏：' + e.pace);
        L.push('  垭口：' + e.pass);
        L.push('  装备：' + e.gear);
        L.push('  风险：' + e.risk);
      }
      if (P.healthTips?.length) L.push('\n【健康提醒】\n' + P.healthTips.map(h => '  🩺 ' + h).join('\n'));
      if (P.budget) {
        const b = P.budget;
        L.push('\n【预算评估】预估总花费 ' + b.total + ' 元/人' + (b.holiday ? '（国庆档）' : '（平日档）'));
        b.rows.forEach(r => L.push('  ' + r.k + '：' + r.per + ' 元 ' + (r.note || '')));
        b.tips.forEach(tp => L.push('  ' + tp));
        if (b.hotelRec?.primary) {
          const rec = b.hotelRec;
          L.push('  住宿推荐：' + rec.primary.name + '（' + rec.primary.ref + (rec.primary.per ? '，人均约 ' + rec.primary.per + ' 元/晚' : '') + (rec.primary.tel ? '，电话 ' + rec.primary.tel : '') + '）');
          if (rec.alternates?.length) L.push('  备选：' + rec.alternates.map(a => a.name + (a.tel ? '（' + a.tel + '）' : '')).join('、'));
        }
      }
      if (P.shots?.length) {
        L.push('\n【拍摄机位】');
        P.shots.forEach(s => L.push('  ' + s.day + ' ' + s.camp + ' 拍 ' + s.peak + '（' + s.best + '）：' + s.tip));
      }
      if (P.variants?.length) {
        L.push('\n【三套方案】');
        P.variants.forEach(v => L.push('  ' + v.label + '（' + v.days + '天）：' + v.desc + ' —— ' + v.why));
      }
    }
    if (plan.ticket) {
      L.push('\n【门票】');
      L.push('免票：' + plan.ticket.freePeriod);
      L.push('放票：' + plan.ticket.releaseTime);
      L.push('预约：' + plan.ticket.window);
    }
    if (plan.personalize?.budget?.hotelRec?.primary) {
      const p = plan.personalize.budget.hotelRec.primary;
      L.push('\n【住宿】预算匹配首推：' + p.name + '（' + p.ref + (p.tel ? '，电话 ' + p.tel : '') + '）');
    }
    if (plan.gear) {
      L.push('\n【装备】');
      L.push('核心：' + (plan.gear.core || []).join('、'));
      if (plan.gear.octAdd?.length) L.push('增补：' + plan.gear.octAdd.join('、'));
      if (plan.gear.medicine?.length) L.push('药品：' + plan.gear.medicine.join('、'));
      if (plan.gear.stove) L.push('气罐：' + plan.gear.stove);
      if (plan.gear.proTips?.length) {
        L.push('网上经验增补：');
        plan.gear.proTips.forEach(tp => L.push('  🟢 ' + tp));
      }
    }
    if (plan.risks) {
      L.push('\n【风险】');
      plan.risks.forEach(r => L.push('⚠️ ' + r));
    }
    if (plan.pending?.length) L.push('\n【待核实】' + plan.pending.join('；'));
    L.push('\n🥾 认真对待每一次进山');
    return L.join('\n');
  }

})(window);
