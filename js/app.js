// 校园信息中心（迷你版）交互逻辑
// 数据来源：fetch data/data.json（课堂演示异步加载）

// ── 自习室数据（写死，列表与概览用） ──
const STUDYROOMS = [
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

// ── DOM 引用 ──
const statusEl = document.querySelector('#status');
const roomListEl = document.querySelector('#room-list');
const summaryBoxEl = document.querySelector('#summary-cards');

// ── 当前选中高亮的房间名（点击列表项联动图表） ──
let selectedRoom = null;
let chartData = null;  // fetch 加载的图表数据

// ── 状态徽章颜色映射 ──
const badgeClass = { '开放': 'text-bg-success', '闭馆': 'text-bg-secondary', '维修': 'text-bg-warning' };

// ── 图表实例 ──
let chart = null;       // 空余座位柱状图
let rateChart = null;   // 使用率折线图

// 概览：4 张卡片（自习室总数/当前开放/总座位/空余座位）
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

// 列表：按楼层/状态/名称三重筛选后渲染
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
      </li>
    `);
  });
};

// 双图：空余座位柱状图（bar）+ 使用率折线图（line）
const renderChart = (data) => {
  // 柱状图：空余座位
  if (chart === null) chart = echarts.init(document.querySelector('#usage-chart'));
  chart.setOption({
    title: { text: '各自习室空余座位', left: 'center' },
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0 },
    grid: { left: 56, right: 24, bottom: 90 },
    xAxis: {
      type: 'category',
      data: data.rooms.map(r => r.name),
      axisLabel: { rotate: 38, interval: 0, fontSize: 11 }
    },
    yAxis: { type: 'value', name: '座' },
    series: [{
      name: '空余座位',
      type: 'bar',
      data: data.rooms.map(r => ({
        value: r.seats - r.occupied,
        itemStyle: { color: r.name === selectedRoom ? '#f59e0b' : '#0d6efd' }
      }))
    }]
  });

  // 折线图：使用率（已用/总座位×100%）—— 把原来的柱状图改为折线图，体现两类图表
  if (rateChart === null) rateChart = echarts.init(document.querySelector('#rate-chart'));
  rateChart.setOption({
    title: { text: '自习室使用率（已用/总座位）', left: 'center' },
    tooltip: { trigger: 'axis', formatter: '{b}: {c}%' },
    legend: { bottom: 0 },
    grid: { left: 56, right: 24, bottom: 90 },
    xAxis: {
      type: 'category',
      data: data.rooms.map(r => r.name),
      axisLabel: { rotate: 38, interval: 0, fontSize: 11 }
    },
    yAxis: { type: 'value', name: '%', max: 100 },
    series: [{
      name: '使用率',
      type: 'line',                          // ← 折线图（原为 bar）
      smooth: true,
      data: data.rooms.map(r => ({
        value: Math.round(r.occupied / r.seats * 100),
        itemStyle: { color: r.name === selectedRoom ? '#f59e0b' : '#198754' }
      })),
      label: { show: true, formatter: '{c}%', fontSize: 10 }
    }]
  });
};

// 点击列表项联动高亮：两图对应柱/点变橙色
const applyHighlight = () => {
  if (chartData === null || chart === null || rateChart === null) return;
  chart.setOption({
    series: [{
      data: chartData.rooms.map(r => ({
        value: r.seats - r.occupied,
        itemStyle: { color: r.name === selectedRoom ? '#f59e0b' : '#0d6efd' }
      }))
    }]
  });
  rateChart.setOption({
    series: [{
      data: chartData.rooms.map(r => ({
        value: Math.round(r.occupied / r.seats * 100),
        itemStyle: { color: r.name === selectedRoom ? '#f59e0b' : '#198754' }
      }))
    }]
  });
};

// fetch 加载 data.json
const loadChart = async () => {
  statusEl.style.display = 'block';
  statusEl.textContent = '加载中...';
  try {
    const response = await fetch('data/data.json');
    if (!response.ok) {
      statusEl.textContent = `加载失败：HTTP ${response.status}`;
      return;
    }
    const data = await response.json();
    if (!data.rooms || data.rooms.length === 0) {
      statusEl.textContent = '暂无数据';
      return;
    }
    chartData = data;
    statusEl.style.display = 'none';
    renderChart(data);
  } catch (e) {
    statusEl.textContent = `加载失败：${e.message}`;
  }
};

// ── 事件绑定 ──
document.querySelector('#floor-filter').addEventListener('change', renderRooms);
document.querySelector('#status-filter').addEventListener('change', renderRooms);
document.querySelector('#name-search').addEventListener('input', renderRooms);

roomListEl.addEventListener('click', (e) => {
  const nameEl = e.target.closest('.room-name');
  if (nameEl) {
    const name = nameEl.dataset.name;
    selectedRoom = (selectedRoom === name) ? null : name;
    applyHighlight();
  }
});

window.addEventListener('resize', () => {
  [chart, rateChart].forEach(c => { if (c) c.resize(); });
});

// ── 初始化 ──
renderSummary();
renderRooms();
loadChart();
