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
    const iso = (dt) => dt.toISOString().slice(0, 10);

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
    const ready = () => {
      clearDayLayers();
      const segs = (which === 'all') ? trackSegs : [trackSegs[Number(which) - 1]].filter(Boolean);
      if (!segs.length) return;

      if (which === 'all') {
        // 全程：每段独立 source+layer，避免互相覆盖
        segs.forEach((s, idx) => {
          const color = DAY_COLORS[idx % DAY_COLORS.length];
          const sourceId = 'day-all-' + idx;
          const coords = s.pts.map(p => [p[0], p[1], p[2] || 0]);
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
        // 飞到全程起点
        const first = segs[0].pts[0];
        if (first) map.flyTo({ center: [first[0], first[1]], zoom: 11.5, pitch: 50, duration: 1500 });
      } else {
        // 单日：用 day-N 源
        const s = segs[0];
        const realIdx = Number(which) - 1;
        const color = DAY_COLORS[realIdx % DAY_COLORS.length];
        const sourceId = 'day-' + realIdx;
        const coords = s.pts.map(p => [p[0], p[1], p[2] || 0]);
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
        if (first) map.flyTo({ center: [first[0], first[1]], zoom: 11.5, pitch: 50, duration: 1500 });
      }
    };
    if (map.loaded()) ready();
    else map.once('load', ready);
  };

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

      plan.schedule.forEach((d, i) => {
        const item = el('div', 'sched-item');
        const top = el('div', 'sched-top');
        top.appendChild(el('span', 'sched-day', d.day));
        top.appendChild(el('div', 'sched-route', d.route || ''));
        item.appendChild(top);
        const metaRow = el('div', 'sched-meta');
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
        P.shots.forEach(s => {
          sb.appendChild(el('div', 'g-item', `<span class="dot">📷</span><div><b>${s.day} ${s.camp}</b> · 拍 ${s.peak}（${s.best}）<br><span style="color:#94a3b8;font-size:12px">${s.tip}</span></div>`));
        });
        box.appendChild(section('📷', '拍摄机位 · 在哪个位置拍哪边的山', sb, '机位 × 每日行程 × 天气联动'));
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
      box.appendChild(section('🎒', '装备清单', gb, '重装自备 · 深秋/垭口增补'));
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
