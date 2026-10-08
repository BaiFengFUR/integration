// 校园信息中心（迷你版）交互逻辑
// 数据来源：localStorage（CRUD 持久化） → 默认数组
// 课堂演示：CRUD 改 STUDYROOMS → save() → renderAll() 三件套

// ── 默认数据（首次访问或清空 localStorage 时使用） ──
const DEFAULT_STUDYROOMS = [
  { name: '楠苑一楼自习室', building: '楠苑', floor: 1, seats: 120, occupied: 86, status: '开放', hours: '08:00-22:30' },
  { name: '楠苑二楼自习室', building: '楠苑', floor: 2, seats: 96, occupied: 61, status: '开放', hours: '08:00-22:30' },
  { name: '楠苑三楼研讨自习室', building: '楠苑', floor: 3, seats: 48, occupied: 33, status: '开放', hours: '09:00-21:00' },
  { name: '梓苑一楼自习室', building: '梓苑', floor: 1, seats: 140, occupied: 92, status: '开放', hours: '08:00-22:30' },
  { name: '梓苑二楼自习室', building: '梓苑', floor: 2, seats: 88, occupied: 0, status: '维修', hours: '暂停开放' },
  { name: '图书馆一楼自习区', building: '图书馆', floor: 1, seats: 160, occupied: 118, status: '开放', hours: '07:30-23:00' },
  { name: '图书馆二楼自习区', building: '图书馆', floor: 2, seats: 130, occupied: 95, status: '开放', hours: '07:30-23:00' },
  { name: '图书馆三楼静音自习室', building: '图书馆', floor: 3, seats: 60, occupied: 58, status: '开放', hours: '08:00-22:00' },
  { name: '理科楼一层通宵自习室', building: '理科楼', floor: 1, seats: 80, occupied: 41, status: '开放', hours: '全天开放' },
  { name: '理科楼三层自习室', building: '理科楼', floor: 3, seats: 72, occupied: 0, status: '闭馆', hours: '08:00-22:00' },
  { name: '文科楼二层自习室', building: '文科楼', floor: 2, seats: 66, occupied: 52, status: '开放', hours: '08:00-22:00' },
  { name: '文科楼四层考研自习室', building: '文科楼', floor: 4, seats: 110, occupied: 103, status: '开放', hours: '07:00-23:30' }
];

// ── 唯一状态：STUDYROOMS 数组 ──
// 启动时优先从 localStorage 恢复，否则用默认数组并立即存一份
// try/catch 兜底：手动改 Local Storage 注入非法 JSON 时不崩，回落默认数据
let STUDYROOMS;
let loadSource = 'default';  // 'storage' / 'default' / 'corrupt-fallback'
try {
  const raw = localStorage.getItem('studyrooms');
  if (raw === null) {
    STUDYROOMS = DEFAULT_STUDYROOMS;
  } else {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      STUDYROOMS = parsed;
      loadSource = 'storage';
    } else if (Array.isArray(parsed) && parsed.length === 0) {
      // 用户故意清空数据，保留空数组让"数据为空"分支生效
      STUDYROOMS = parsed;
      loadSource = 'storage-empty';
    } else {
      STUDYROOMS = DEFAULT_STUDYROOMS;
      loadSource = 'corrupt-fallback';
    }
  }
} catch (e) {
  console.warn('localStorage 数据损坏，已回落默认数据：', e.message);
  STUDYROOMS = DEFAULT_STUDYROOMS;
  loadSource = 'corrupt-fallback';
}

// ── 持久化 ──
const save = () => localStorage.setItem('studyrooms', JSON.stringify(STUDYROOMS));

// ── DOM 引用 ──
const statusEl = document.querySelector('#status');
const roomListEl = document.querySelector('#room-list');
const summaryBoxEl = document.querySelector('#summary-cards');
const formEl = document.querySelector('#room-form');
const formTipEl = document.querySelector('#r-tip');

// ── 当前选中高亮的房间名（点击列表项联动图表） ──
let selectedRoom = null;

// ── 状态徽章颜色映射 ──
const badgeClass = { '开放': 'text-bg-success', '闭馆': 'text-bg-secondary', '维修': 'text-bg-warning' };

// ── 图表实例 ──
let chart = null;       // 空余座位柱状图
let rateChart = null;   // 使用率折线图

// ============================================================
// 渲染函数：所有 render 都从 STUDYROOMS 读，CRUD 后调 renderAll()
// ============================================================

// 首页概览：4 张卡片（自习室总数/当前开放/总座位/空余座位）
const renderSummary = () => {
  const open = STUDYROOMS.filter(r => r.status === '开放').length;
  const seats = STUDYROOMS.reduce((sum, r) => sum + r.seats, 0);
  const free = STUDYROOMS.reduce((sum, r) => sum + (r.seats - r.occupied), 0);
  const cards = [
    { label: '自习室总数', value: STUDYROOMS.length },
    { label: '当前开放', value: open },
    { label: '总座位数', value: seats },
    { label: '空余座位', value: free }
  ];
  summaryBoxEl.innerHTML = '';
  cards.forEach(c => {
    summaryBoxEl.insertAdjacentHTML('beforeend', `
      <div class="col-6 col-md-3">
        <div class="card">
          <div class="card-body">
            <h3 class="card-title h6">${c.label}</h3>
            <p class="card-text fs-4">${c.value}</p>
          </div>
        </div>
      </div>
    `);
  });
};

// 自习室列表：按楼层/状态/名称三重筛选后渲染，含编辑/删除按钮
const renderRooms = () => {
  const floor = document.querySelector('#floor-filter').value;
  const status = document.querySelector('#status-filter').value;
  const keyword = document.querySelector('#name-search').value.trim();
  const shown = STUDYROOMS.filter(r =>
    (floor === 'all' || r.floor === Number(floor)) &&
    (status === 'all' || r.status === status) &&
    (keyword === '' || r.name.includes(keyword))
  );
  roomListEl.innerHTML = '';
  if (shown.length === 0) {
    roomListEl.innerHTML = '<li class="list-group-item text-muted">没有符合条件的自习室</li>';
    return;
  }
  shown.forEach(r => {
    roomListEl.insertAdjacentHTML('beforeend', `
      <li class="list-group-item">
        <span class="room-name" data-name="${r.name}">${r.name}</span> · ${r.building}${r.floor}层 · 空余${r.seats - r.occupied}座
        <span class="badge ${badgeClass[r.status]}">${r.status} · ${r.hours}</span>
        <button class="btn btn-sm btn-outline-primary ms-2 js-edit" data-name="${r.name}">编辑</button>
        <button class="btn btn-sm btn-outline-danger js-del" data-name="${r.name}">删除</button>
      </li>
    `);
  });
};

// 空余座位柱状图（bar）+ 使用率折线图（line）
const renderCharts = () => {
  // 柱状图：空余座位
  if (chart === null) chart = echarts.init(document.querySelector('#usage-chart'));
  chart.setOption({
    title: { text: '各自习室空余座位', left: 'center' },
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0 },
    grid: { left: 56, right: 24, bottom: 90 },
    xAxis: {
      type: 'category',
      data: STUDYROOMS.map(r => r.name),
      axisLabel: { rotate: 38, interval: 0, fontSize: 11 }
    },
    yAxis: { type: 'value', name: '座' },
    series: [{
      name: '空余座位',
      type: 'bar',
      data: STUDYROOMS.map(r => ({
        value: r.seats - r.occupied,
        itemStyle: { color: r.name === selectedRoom ? '#f59e0b' : '#0d6efd' }
      }))
    }]
  });

  // 折线图：使用率（已用/总座位×100%）
  if (rateChart === null) rateChart = echarts.init(document.querySelector('#rate-chart'));
  rateChart.setOption({
    title: { text: '自习室使用率（已用/总座位）', left: 'center' },
    tooltip: { trigger: 'axis', formatter: '{b}: {c}%' },
    legend: { bottom: 0 },
    grid: { left: 56, right: 24, bottom: 90 },
    xAxis: {
      type: 'category',
      data: STUDYROOMS.map(r => r.name),
      axisLabel: { rotate: 38, interval: 0, fontSize: 11 }
    },
    yAxis: { type: 'value', name: '%', max: 100 },
    series: [{
      name: '使用率',
      type: 'line',                          // 改为折线图，与柱状图形成两类
      smooth: true,
      data: STUDYROOMS.map(r => ({
        value: Math.round(r.occupied / r.seats * 100),
        itemStyle: { color: r.name === selectedRoom ? '#f59e0b' : '#198754' }
      })),
      label: { show: true, formatter: '{c}%', fontSize: 10 }
    }]
  });
};

// 点击列表项联动高亮：两图对应柱/点变橙色
const applyHighlight = () => {
  if (chart === null || rateChart === null) return;
  chart.setOption({
    series: [{
      data: STUDYROOMS.map(r => ({
        value: r.seats - r.occupied,
        itemStyle: { color: r.name === selectedRoom ? '#f59e0b' : '#0d6efd' }
      }))
    }]
  });
  rateChart.setOption({
    series: [{
      data: STUDYROOMS.map(r => ({
        value: Math.round(r.occupied / r.seats * 100),
        itemStyle: { color: r.name === selectedRoom ? '#f59e0b' : '#198754' }
      }))
    }]
  });
};

const renderAll = () => {
  renderSummary();
  renderRooms();
  renderCharts();
};

// ============================================================
// CRUD：addRoom / updateRoom / deleteRoom
// 改数组 → save() → renderAll() 三件套
// ============================================================

// 添加（如果名称已存在则改为更新，复用同一表单做"添加或修改"）
const addOrUpdateRoom = (room) => {
  const idx = STUDYROOMS.findIndex(r => r.name === room.name);
  if (idx === -1) {
    STUDYROOMS.push(room);
    return 'add';
  }
  STUDYROOMS[idx] = room;
  return 'update';
};

// 删除
const deleteRoom = (name) => {
  STUDYROOMS = STUDYROOMS.filter(r => r.name !== name);
  if (selectedRoom === name) selectedRoom = null;
};

// ============================================================
// 事件绑定
// ============================================================

// 筛选区：change/input 触发 renderRooms
document.querySelector('#floor-filter').addEventListener('change', renderRooms);
document.querySelector('#status-filter').addEventListener('change', renderRooms);
document.querySelector('#name-search').addEventListener('input', renderRooms);

// 列表区事件委托：点 .room-name 高亮 / 点 .js-edit 填充表单 / 点 .js-del 删除
roomListEl.addEventListener('click', (e) => {
  const editBtn = e.target.closest('.js-edit');
  const delBtn = e.target.closest('.js-del');
  const nameEl = e.target.closest('.room-name');

  if (editBtn) {
    const room = STUDYROOMS.find(r => r.name === editBtn.dataset.name);
    if (room) fillForm(room);
    return;
  }
  if (delBtn) {
    if (!confirm(`确定删除「${delBtn.dataset.name}」？`)) return;
    deleteRoom(delBtn.dataset.name);
    save();
    renderAll();
    formTipEl.textContent = '已删除';
    return;
  }
  if (nameEl) {
    const name = nameEl.dataset.name;
    selectedRoom = (selectedRoom === name) ? null : name; // 再点同一个 = 取消
    applyHighlight();
  }
});

// 表单提交：添加或修改
const fillForm = (room) => {
  document.querySelector('#r-name').value = room.name;
  document.querySelector('#r-building').value = room.building;
  document.querySelector('#r-floor').value = room.floor;
  document.querySelector('#r-seats').value = room.seats;
  document.querySelector('#r-occupied').value = room.occupied;
  document.querySelector('#r-status').value = room.status;
  formTipEl.textContent = `正在编辑：${room.name}（提交后覆盖原记录）`;
};

formEl.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.querySelector('#r-name').value.trim();
  const building = document.querySelector('#r-building').value.trim();
  const floor = Number(document.querySelector('#r-floor').value);
  const seats = Number(document.querySelector('#r-seats').value);
  const occupied = Number(document.querySelector('#r-occupied').value || 0);
  const status = document.querySelector('#r-status').value;

  // 校验三件套：读值 trim、判空给提示、失败 return
  if (name === '') { formTipEl.textContent = '名称不能为空'; return; }
  if (building === '') { formTipEl.textContent = '楼栋不能为空'; return; }
  if (!(Number.isInteger(floor) && floor >= 1 && floor <= 10)) { formTipEl.textContent = '楼层必须是 1-10 的整数'; return; }
  if (!(seats >= 0 && seats <= 500)) { formTipEl.textContent = '座位数必须是 0-500'; return; }
  if (!(occupied >= 0 && occupied <= seats)) { formTipEl.textContent = `已占用必须是 0-${seats}`; return; }

  const room = { name, building, floor, seats, occupied, status, hours: status === '开放' ? '08:00-22:30' : (status === '闭馆' ? '08:00-22:00' : '暂停开放') };
  const action = addOrUpdateRoom(room);
  save();
  renderAll();
  formTipEl.textContent = action === 'add' ? `已添加：${name}` : `已更新：${name}`;
  formEl.reset();
});

document.querySelector('#r-reset').addEventListener('click', () => {
  formEl.reset();
  formTipEl.textContent = '';
});

// 窗口 resize：图表自适应
window.addEventListener('resize', () => {
  [chart, rateChart].forEach(c => { if (c) c.resize(); });
});

// ── 初始化 ──
save(); // 首次访问把默认数据写进 localStorage
renderAll();

// 启动来源提示（仅 Console，演示用）
if (loadSource === 'storage') console.info('数据来源：localStorage（已加载用户数据）');
else if (loadSource === 'storage-empty') console.info('数据来源：localStorage（空数组，进入"数据为空"分支）');
else if (loadSource === 'corrupt-fallback') console.warn('localStorage 数据损坏或格式非法，已回落默认数据');
else console.info('数据来源：DEFAULT_STUDYROOMS 默认数组（首次访问）');
