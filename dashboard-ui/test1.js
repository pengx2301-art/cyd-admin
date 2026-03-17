/* ============================================================
   充易达 — 管理后台 JS
   ============================================================ */

/* ── 页面配置 ──────────────────────────────────────────────── */
const PAGE_META = {
  dashboard:        { title: '仪表盘',         breadcrumb: '首页 / 仪表盘' },
  orders:           { title: '订单管理',         breadcrumb: '订单中心 / 订单管理' },
  'recharge-records': { title: '充值记录',       breadcrumb: '订单中心 / 充值记录' },
  'callback-logs':  { title: '回调日志',         breadcrumb: '订单中心 / 回调日志' },
  products:         { title: '产品列表',         breadcrumb: '产品管理 / 产品列表' },
  categories:       { title: '产品分类',         breadcrumb: '产品管理 / 产品分类' },
  suppliers:        { title: '供应商管理',        breadcrumb: '产品管理 / 供应商管理' },
  'direct-recharge':{ title: '直冲产品',         breadcrumb: '产品管理 / 直冲产品' },
  agents:           { title: '用户/代理列表',    breadcrumb: '用户/代理管理 / 用户代理列表' },
  'agent-levels':   { title: '代理级别管理',     breadcrumb: '用户/代理管理 / 代理级别管理' },
  'agent-products': { title: '代理产品价格',     breadcrumb: '用户/代理管理 / 代理产品价格' },
  'agent-balance':  { title: '余额管理',         breadcrumb: '用户/代理管理 / 余额管理' },
  'api-users':      { title: 'API 用户',         breadcrumb: 'API 管理 / API 用户' },
  'api-logs':       { title: 'API 调用日志',     breadcrumb: 'API 管理 / API 调用日志' },
  'api-docs':       { title: 'API 文档',         breadcrumb: 'API 管理 / API 文档' },
  'finance-overview':  { title: '财务概览',    breadcrumb: '财务管理 / 财务概览' },
  'recharge-apply':    { title: '充值申请',    breadcrumb: '财务管理 / 充值申请' },
  'withdraw-apply':    { title: '提现申请',    breadcrumb: '财务管理 / 提现申请' },
  'payment-methods':   { title: '收款方式',    breadcrumb: '财务管理 / 收款方式' },
  'sys-accounts':   { title: '管理员账号',       breadcrumb: '系统管理 / 管理员账号' },
  'operation-logs': { title: '操作日志',         breadcrumb: '系统管理 / 操作日志' },
  'test-order':     { title: '测试下单',         breadcrumb: '系统管理 / 测试下单' },
  users:            { title: '用户管理',         breadcrumb: '系统管理 / 用户管理' },
  roles:            { title: '角色管理',         breadcrumb: '系统管理 / 角色管理' },
  permissions:      { title: '权限管理',         breadcrumb: '系统管理 / 权限管理' },
  settings:         { title: '系统设置',         breadcrumb: '系统管理 / 系统设置' },
};

/* ── 导航切换 ──────────────────────────────────────────────── */
function navigateTo(pageId) {
  if (!document.getElementById('page-' + pageId)) return;

  // 隐藏所有 page
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + pageId).classList.add('active');

  // 更新侧边栏高亮
  document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  if (activeNav) activeNav.classList.add('active');

  // 更新面包屑
  const meta = PAGE_META[pageId] || { breadcrumb: '首页 / ' + pageId };
  document.getElementById('breadcrumb').textContent = meta.breadcrumb;

  // 图表按需渲染
  if (pageId === 'dashboard') {
    setTimeout(() => {
      initChartRevenue();
      initChartProductType();
    }, 100);
  }
  if (pageId === 'finance-overview') {
    setTimeout(() => { financeLoadOverview(); }, 100);
  }

  // 充值申请：进入时自动加载
  if (pageId === 'recharge-apply') {
    if (typeof rcApplyLoadList === 'function') rcApplyLoadList();
  }

  // 提现申请：进入时自动加载
  if (pageId === 'withdraw-apply') {
    if (typeof wdApplyLoadList === 'function') wdApplyLoadList();
  }

  // 收款方式：进入时自动加载
  if (pageId === 'payment-methods') {
    if (typeof pmLoadList === 'function') pmLoadList();
  }

  // 管理员账号：进入时自动加载
  if (pageId === 'sys-accounts') {
    if (typeof sysAccLoadList === 'function') sysAccLoadList();
  }

  // 用户/代理列表：进入时自动加载
  if (pageId === 'agents') {
    if (typeof agentLoadList === 'function') {
      _agent.page = 1;
      agentLoadList();
    }
  }

  // 代理级别管理：进入时自动加载
  if (pageId === 'agent-levels') {
    if (typeof agentLevelLoadList === 'function') agentLevelLoadList();
  }

  // 代理产品价格：进入时填充代理下拉
  if (pageId === 'agent-products') {
    if (typeof pricingInitAgentSel === 'function') pricingInitAgentSel();
  }

  // 操作日志：进入时自动加载
  if (pageId === 'operation-logs') {
    if (typeof operationLogsLoad === 'function') operationLogsLoad();
  }

  // 测试下单：进入时初始化
  if (pageId === 'test-order') {
    if (typeof initTestOrder === 'function') initTestOrder();
  }

  // 订单管理：进入时自动加载
  if (pageId === 'orders') {
    if (typeof ordersLoad === 'function') ordersLoad();
  }

  // 余额管理：进入时加载数据
  if (pageId === 'agent-balance') {
    _balPage.page = 1;
    if (typeof balancePageLoad === 'function') balancePageLoad();
  }

  // 产品列表
  if (pageId === 'products') {
    _prod.page = 1;
    prodFillSelects().then(() => prodLoad());
  }

  // 产品分类
  if (pageId === 'categories') {
    catLoad();
  }

  // 供应商管理
  if (pageId === 'suppliers') {
    supplierLoad();
  }

  // 直冲产品
  if (pageId === 'direct-recharge') {
    _dp.page = 1;
    dpLoad();
  }

  // 用户管理（旧路由兼容）
  if (pageId === 'users') {
    if (typeof memberLoadList === 'function') {
      if (typeof _member !== 'undefined') _member.page = 1;
      memberLoadList();
    }
  }

  // 角色管理：进入时自动加载
  if (pageId === 'roles') {
    if (typeof roleLoadList === 'function') roleLoadList();
  }

  // 权限管理：进入时自动加载
  if (pageId === 'permissions') {
    if (typeof permLoadList === 'function') permLoadList();
  }




  // 滚动到顶部
  document.querySelector('.main-content').scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── 事件代理：nav-item & quick-card & link-more ──────────── */
document.addEventListener('click', e => {
  const navItem = e.target.closest('[data-page]');
  if (navItem) {
    e.preventDefault();
    navigateTo(navItem.dataset.page);
    return;
  }
  const linkMore = e.target.closest('.link-more');
  if (linkMore) {
    e.preventDefault();
    navigateTo(linkMore.dataset.page);
    return;
  }
});

/* ── 侧边栏折叠 ───────────────────────────────────────────── */
document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
  document.querySelector('.app-layout').classList.toggle('sidebar-collapsed');
});

/* ── Modal ──────────────────────────────────────────────────── */
function showModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('active'); }
}
function hideModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('active'); }
}
// 点击遮罩关闭
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('active');
  });
});

/* ── Settings Tabs ───────────────────────────────────────────── */
document.querySelectorAll('.settings-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab)?.classList.add('active');
  });
});

/* ── 订单状态条点击 ──────────────────────────────────────────── */
document.querySelectorAll('.ostat-item').forEach(item => {
  item.addEventListener('click', () => {
    item.closest('.order-stats-bar').querySelectorAll('.ostat-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
  });
});

/* ── 图表：充值金额趋势 ───────────────────────────────────────── */
let chartRevenue = null;
function initChartRevenue() {
  const el = document.getElementById('chart-revenue');
  if (!el) return;
  if (!chartRevenue) chartRevenue = echarts.init(el);
  const days = ['03-09','03-10','03-11','03-12','03-13','03-14','03-15'];
  chartRevenue.setOption({
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.9)', borderColor: 'rgba(99,102,241,0.2)', textStyle: { color: '#374151' } },
    grid: { left: 60, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: days, axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { color: '#6b7280' }, splitLine: { show: false } },
    yAxis: { type: 'value', axisLabel: { color: '#6b7280', formatter: v => '¥' + (v/1000).toFixed(0) + 'k' }, splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } } },
    series: [
      {
        name: '充值金额',
        type: 'line',
        smooth: true,
        data: [98500, 112300, 105800, 118900, 108700, 121500, 128560],
        lineStyle: { color: '#6366f1', width: 3 },
        itemStyle: { color: '#6366f1' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(99,102,241,0.2)' }, { offset: 1, color: 'rgba(99,102,241,0)' }] } },
        symbol: 'circle', symbolSize: 6
      },
      {
        name: '成功金额',
        type: 'line',
        smooth: true,
        data: [96800, 110200, 104100, 117300, 107200, 119800, 126900],
        lineStyle: { color: '#06b6d4', width: 2, type: 'dashed' },
        itemStyle: { color: '#06b6d4' },
        symbol: 'circle', symbolSize: 4
      }
    ]
  });
  window.addEventListener('resize', () => chartRevenue.resize());
}

/* ── 图表：产品类型分布 ───────────────────────────────────────── */
let chartProductType = null;
function initChartProductType() {
  const el = document.getElementById('chart-product-type');
  if (!el) return;
  if (!chartProductType) chartProductType = echarts.init(el);
  chartProductType.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 10, textStyle: { color: '#6b7280' } },
    series: [{
      type: 'pie',
      radius: ['42%', '70%'],
      center: ['50%', '45%'],
      data: [
        { value: 5820, name: '话费充值', itemStyle: { color: '#6366f1' } },
        { value: 2340, name: '流量充值', itemStyle: { color: '#06b6d4' } },
        { value: 3210, name: '游戏充值', itemStyle: { color: '#10b981' } },
        { value: 1680, name: '视频会员', itemStyle: { color: '#f59e0b' } },
        { value: 890, name: '其他', itemStyle: { color: '#8b5cf6' } },
      ],
      label: { show: false },
      emphasis: { itemStyle: { shadowBlur: 20, shadowColor: 'rgba(99,102,241,0.3)' } }
    }]
  });
  window.addEventListener('resize', () => chartProductType.resize());
}

/* ── 财务概览：加载数据并渲染 ────────────────────────────────── */
async function financeLoadOverview() {
  const d = await apiRequest('GET', '/api/finance/overview');
  if (!d) return;
  const data = d.data || {};

  // KPI 卡片
  const fmt = v => '¥' + Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 });
  document.getElementById('fin-monthly')    && (document.getElementById('fin-monthly').textContent    = fmt(data.monthlyRevenue));
  document.getElementById('fin-today')      && (document.getElementById('fin-today').textContent      = fmt(data.todayRevenue));
  document.getElementById('fin-orders')     && (document.getElementById('fin-orders').textContent     = (data.todayOrders || 0) + ' 单');
  document.getElementById('fin-agent-bal')  && (document.getElementById('fin-agent-bal').textContent  = fmt(data.agentBalance));

  // 图表
  setTimeout(() => {
    initChartFinance(data.dailyRevenue || []);
    initChartSupplierCost(data.supplierBalances || []);
  }, 80);
}

/* ── 图表：当日营业走势 ───────────────────────────────────────── */
let chartFinance = null;
function initChartFinance(hours) {
  const el = document.getElementById('chart-finance');
  if (!el) return;
  if (!chartFinance) chartFinance = echarts.init(el);
  const labels = (hours || []).map(h => h.hour + ':00');
  const vals   = (hours || []).map(h => h.revenue || 0);
  chartFinance.setOption({
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.9)', textStyle: { color: '#374151' },
      formatter: p => p[0].name + '<br/>营业额：¥' + Number(p[0].value).toLocaleString() },
    grid: { left: 60, right: 20, top: 30, bottom: 40 },
    xAxis: { type: 'category', data: labels, axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#6b7280', interval: 3 }, splitLine: { show: false } },
    yAxis: { type: 'value', axisLabel: { color: '#6b7280', formatter: v => '¥' + (v >= 10000 ? (v/10000).toFixed(1)+'w' : v) },
      splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } } },
    series: [{
      name: '营业额', type: 'bar', data: vals,
      itemStyle: { color: { type: 'linear', x:0,y:0,x2:0,y2:1,
        colorStops:[{offset:0,color:'#6366f1'},{offset:1,color:'rgba(99,102,241,0.2)'}] }, borderRadius:[4,4,0,0] },
      emphasis: { itemStyle: { color: '#8b5cf6' } }
    }]
  });
  window.addEventListener('resize', () => chartFinance && chartFinance.resize());
}

/* ── 图表：供应商余额占比 ─────────────────────────────────────── */
let chartSupplierCost = null;
function initChartSupplierCost(suppliers) {
  const el = document.getElementById('chart-supplier-cost');
  if (!el) return;
  if (!chartSupplierCost) chartSupplierCost = echarts.init(el);
  const palette = ['#6366f1','#06b6d4','#10b981','#f59e0b','#8b5cf6','#f43f5e','#0ea5e9'];
  const data = (suppliers || []).map((s, i) => ({
    value: s.balance, name: s.name,
    itemStyle: { color: palette[i % palette.length] }
  }));
  chartSupplierCost.setOption({
    tooltip: { trigger: 'item', formatter: p => p.name + '<br/>余额：¥' + Number(p.value).toLocaleString() + '<br/>占比：' + p.percent + '%' },
    legend: { bottom: 10, textStyle: { color: '#6b7280' } },
    series: [{
      type: 'pie', radius: ['42%', '70%'], center: ['50%', '45%'],
      data: data.length ? data : [{ value: 1, name: '暂无数据', itemStyle: { color: '#e5e7eb' } }],
      label: { show: false },
      emphasis: { itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.1)' } }
    }]
  });
  window.addEventListener('resize', () => chartSupplierCost && chartSupplierCost.resize());
}

/* ── 分类树点击 ──────────────────────────────────────────────── */
document.querySelectorAll('.tree-node').forEach(node => {
  node.addEventListener('click', () => {
    document.querySelectorAll('.tree-node').forEach(n => n.classList.remove('active'));
    node.classList.add('active');
  });
});

/* ── 图表按钮切换 ──────────────────────────────────────────────── */
document.querySelectorAll('.card-actions .btn-tag').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.closest('.card-actions').querySelectorAll('.btn-tag').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

/* ── 初始化 ──────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  navigateTo('dashboard');

  // 入场动画
  document.querySelectorAll('.kpi-card').forEach((card, i) => {
    card.style.animationDelay = (0.08 * (i + 1)) + 's';
    card.classList.add('fade-in-up');
  });

  // 品牌配置初始化
  brandInit();

  // 鉴权 + 用户信息初始化
  authInit();
});

/* ═══════════════════════════════════════════════════════════════
   品牌外观配置模块
   - 配置存储于 localStorage key: "cyd_brand_config"
   - 登录页读取同一 key 动态渲染
   ═══════════════════════════════════════════════════════════════ */

const BRAND_KEY = 'cyd_brand_config';

const BRAND_DEFAULTS = {
  logoType:      'emoji',          // 'emoji' | 'image'
  logoEmoji:     '⚡',
  logoImage:     '',               // base64 data URL
  name:          '充易达',
  tagline:       '高效自动充值系统\n专业的代理商管理平台',
  copyright:     '© 2024 充易达 · 保留所有权利',
  termsText:     '《服务条款》',
  termsUrl:      '#',
  privacyText:   '《隐私政策》',
  privacyUrl:    '#',
  disclaimer:    '',
};

/** 读取当前品牌配置（合并默认值） */
function brandGetConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(BRAND_KEY) || '{}');
    return Object.assign({}, BRAND_DEFAULTS, saved);
  } catch { return { ...BRAND_DEFAULTS }; }
}

/** 初始化：将已保存的配置回填到表单 */
function brandInit() {
  const cfg = brandGetConfig();

  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setVal('brand-logo-emoji-input', cfg.logoEmoji);
  setVal('brand-name',             cfg.name);
  setVal('brand-tagline',          cfg.tagline);
  setVal('brand-copyright',        cfg.copyright);
  setVal('brand-terms-text',       cfg.termsText);
  setVal('brand-terms-url',        cfg.termsUrl);
  setVal('brand-privacy-text',     cfg.privacyText);
  setVal('brand-privacy-url',      cfg.privacyUrl);
  setVal('brand-disclaimer',       cfg.disclaimer);

  // Logo 预览
  _brandRenderLogoPreview(cfg);
  // 实时预览刷新
  brandPreview();
}

/** 上传图片 Logo */
function brandUploadLogo(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    alert('图片不能超过 2MB，建议使用 PNG/SVG 格式。');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    // 更新预览
    const previewEl = document.getElementById('brand-logo-preview');
    if (previewEl) {
      previewEl.style.background = 'rgba(99,102,241,0.1)';
      previewEl.style.border = '2px solid rgba(99,102,241,0.3)';
      previewEl.innerHTML = `<img src="${dataUrl}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;">`;
    }
    // 临时存一下，等保存按钮统一落盘
    window._brandPendingLogoImage = dataUrl;
    brandPreview();
    showToast('图片已上传，点击「保存品牌配置」后正式生效', 'success');
  };
  reader.readAsDataURL(file);
}

/** Emoji 实时预览 */
function brandPreviewEmoji(val) {
  const el = document.getElementById('brand-logo-emoji');
  if (el) el.textContent = val || '⚡';
  brandPreview();
}

/** 渲染 Logo 预览区 */
function _brandRenderLogoPreview(cfg) {
  const previewEl = document.getElementById('brand-logo-preview');
  if (!previewEl) return;
  if (cfg.logoType === 'image' && cfg.logoImage) {
    previewEl.style.background = 'rgba(99,102,241,0.1)';
    previewEl.style.border = '2px solid rgba(99,102,241,0.3)';
    previewEl.innerHTML = `<img src="${cfg.logoImage}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;">`;
  } else {
    previewEl.style.background = 'linear-gradient(135deg,#6366f1,#8b5cf6)';
    previewEl.style.border = 'none';
    previewEl.innerHTML = `<span id="brand-logo-emoji">${cfg.logoEmoji}</span><div style="position:absolute;top:10px;left:13px;width:28%;height:28%;background:rgba(255,255,255,0.45);border-radius:50%;filter:blur(3px);"></div>`;
  }
}

/** 实时刷新小预览卡片 */
function brandPreview() {
  const g = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };

  const name      = g('brand-name')      || BRAND_DEFAULTS.name;
  const tagline   = g('brand-tagline')   || BRAND_DEFAULTS.tagline;
  const copyright = g('brand-copyright') || BRAND_DEFAULTS.copyright;
  const termsText = g('brand-terms-text')   || BRAND_DEFAULTS.termsText;
  const privText  = g('brand-privacy-text') || BRAND_DEFAULTS.privacyText;
  const disclaimer = g('brand-disclaimer');
  const emoji     = g('brand-logo-emoji-input') || '⚡';

  const s = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  s('prev-logo',      window._brandPendingLogoImage
    ? `<img src="${window._brandPendingLogoImage}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;">`
    : emoji);
  s('prev-name',      name);
  s('prev-tagline',   tagline.split('\\n')[0]);
  s('prev-copyright', copyright);
  s('prev-footer',    `登录即代表您同意 ${termsText} 和 ${privText}${disclaimer ? '<br><span style="font-size:10px;opacity:.6;">' + disclaimer + '</span>' : ''}`);
}

/** 保存品牌配置到 localStorage */
function brandSave() {
  const g = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };

  const cfg = {
    logoType:    window._brandPendingLogoImage ? 'image' : 'emoji',
    logoEmoji:   g('brand-logo-emoji-input') || '⚡',
    logoImage:   window._brandPendingLogoImage || (brandGetConfig().logoImage || ''),
    name:        g('brand-name')        || BRAND_DEFAULTS.name,
    tagline:     g('brand-tagline')     || BRAND_DEFAULTS.tagline,
    copyright:   g('brand-copyright')  || BRAND_DEFAULTS.copyright,
    termsText:   g('brand-terms-text') || BRAND_DEFAULTS.termsText,
    termsUrl:    g('brand-terms-url')  || '#',
    privacyText: g('brand-privacy-text') || BRAND_DEFAULTS.privacyText,
    privacyUrl:  g('brand-privacy-url')  || '#',
    disclaimer:  g('brand-disclaimer'),
  };

  localStorage.setItem(BRAND_KEY, JSON.stringify(cfg));
  window._brandPendingLogoImage = null;

  showToast('✅ 品牌配置已保存，登录页将立即生效', 'success');

  // 同步更新后台侧边栏 Logo 文字（可选）
  const sidebarIcon = document.querySelector('.logo-icon');
  if (sidebarIcon && cfg.logoType === 'emoji') sidebarIcon.textContent = cfg.logoEmoji;
  const sidebarName = document.querySelector('.logo-text');
  if (sidebarName) sidebarName.textContent = cfg.name;
}

/** 恢复默认品牌配置 */
function brandReset() {
  if (!confirm('确认恢复所有品牌配置为默认值？')) return;
  localStorage.removeItem(BRAND_KEY);
  window._brandPendingLogoImage = null;
  brandInit();
  showToast('已恢复默认品牌配置', 'success');
}

/** 通用 Toast 提示 */
function showToast(msg, type = 'success') {
  // 如果已有 toast 则移除
  const old = document.getElementById('cyd-toast');
  if (old) old.remove();

  const colors = { success: '#10b981', error: '#e11d48', info: '#6366f1' };
  const toast = document.createElement('div');
  toast.id = 'cyd-toast';
  toast.style.cssText = `
    position:fixed; bottom:28px; right:28px; z-index:9999;
    background:${colors[type] || colors.info};
    color:#fff; padding:12px 22px; border-radius:14px;
    font-size:13.5px; font-weight:600;
    box-shadow:0 8px 32px rgba(0,0,0,0.18);
    animation:toastIn .3s cubic-bezier(0.4,0,0.2,1) both;
    max-width:340px; line-height:1.5;
  `;
  toast.textContent = msg;

  // 注入动画（只注入一次）
  if (!document.getElementById('toast-style')) {
    const s = document.createElement('style');
    s.id = 'toast-style';
    s.textContent = `@keyframes toastIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`;
    document.head.appendChild(s);
  }

  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3500);
}

/* ═══════════════════════════════════════════════════════════════
   全局鉴权 & 用户信息模块
   ═══════════════════════════════════════════════════════════════ */

/** 获取存储的 token */
function getToken() { return localStorage.getItem('cyd_token') || ''; }

/** 通用 API 请求（自动携带 token） */
async function apiRequest(method, url, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
  };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(url, opts);
  const data = await res.json();
  // token 过期
  if (data.code === -1 && res.status === 401) {
    localStorage.removeItem('cyd_token');
    localStorage.removeItem('cyd_user');
    window.location.href = 'login.html';
    return null;
  }
  return data;
}

/** 自动携带 token 的 fetch（返回 Response，适合直接用 .json()） */
function authFetch(url, opts = {}) {
  opts.headers = Object.assign({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() }, opts.headers || {});
  return fetch(url, opts);
}

/** HTML 转义 */
function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/** getElementById 简写 */
function el(id) { return document.getElementById(id); }

/** 在弹窗内显示消息 */
function showFormMsg(msgId, msg, type) {
  const el2 = document.getElementById(msgId);
  if (!el2) return;
  el2.textContent = msg;
  el2.style.display = 'block';
  el2.style.background = type === 'success' ? 'rgba(16,185,129,.1)' : 'rgba(244,63,94,.09)';
  el2.style.color = type === 'success' ? '#059669' : '#e11d48';
}



/** 初始化：检查登录态 + 填充用户信息 */
async function authInit() {
  const token = getToken();
  if (!token) { window.location.href = 'login.html'; return; }

  const data = await apiRequest('GET', '/api/auth/me');
  if (!data || data.code !== 0) { window.location.href = 'login.html'; return; }

  const user = data.data;
  // 存到 localStorage 便于其他地方快速读取
  localStorage.setItem('cyd_user', JSON.stringify(user));


  // 更新侧边栏
  const firstChar = (user.nickname || user.username || 'A')[0].toUpperCase();
  if (el('sidebar-avatar'))   el('sidebar-avatar').textContent   = firstChar;
  if (el('sidebar-nickname')) el('sidebar-nickname').textContent = user.nickname || user.username;
  if (el('sidebar-username')) el('sidebar-username').textContent = user.username;


  // 填充个人中心表单
  if (el('profile-username')) el('profile-username').value = user.username || '';
  if (el('profile-nickname')) el('profile-nickname').value = user.nickname || '';
  if (el('profile-email'))    el('profile-email').value    = user.email    || '';
  if (el('profile-phone'))    el('profile-phone').value    = user.phone    || '';

  // 填充只读信息
  const roleMap = { admin:'超级管理员', operator:'运营管理员', finance:'财务人员', support:'客服人员' };
  if (el('info-username'))   el('info-username').textContent   = user.username;
  if (el('info-role'))       el('info-role').textContent       = roleMap[user.role] || user.role;
  if (el('info-last-login')) el('info-last-login').textContent = user.last_login || '首次登录';
}

/* ─── 个人中心：保存账号信息 ─────────────────────────────────── */
async function profileSave() {
  const g  = id => document.getElementById(id);
  const msgEl = g('profile-msg');
  const showMsg = (msg, ok) => {
    msgEl.textContent = msg;
    msgEl.style.display = 'block';
    msgEl.style.background = ok ? 'rgba(16,185,129,.1)' : 'rgba(244,63,94,.09)';
    msgEl.style.color = ok ? '#059669' : '#e11d48';
  };

  const payload = {
    username: g('profile-username').value.trim(),
    nickname: g('profile-nickname').value.trim(),
    email:    g('profile-email').value.trim(),
    phone:    g('profile-phone').value.trim(),
  };

  if (!payload.username) return showMsg('账号不能为空', false);

  const data = await apiRequest('PUT', '/api/auth/profile', payload);
  if (!data) return;

  if (data.code === 0) {
    showMsg('✅ 账号信息已更新', true);
    // 同步侧边栏
    const firstChar = (payload.nickname || payload.username || 'A')[0].toUpperCase();
    if (g('sidebar-avatar'))   g('sidebar-avatar').textContent   = firstChar;
    if (g('sidebar-nickname')) g('sidebar-nickname').textContent = payload.nickname || payload.username;
    if (g('sidebar-username')) g('sidebar-username').textContent = payload.username;
    showToast('账号信息已更新', 'success');
  } else {
    showMsg('❌ ' + (data.msg || '保存失败'), false);
  }
}

/* ─── 个人中心：密码强度检测 ─────────────────────────────────── */
function checkPwdStrength(val) {
  const wrap = document.getElementById('pwd-strength-wrap');
  const label = document.getElementById('pwd-strength-label');
  if (!wrap) return;
  if (!val) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';

  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val) || /[a-z]/.test(val)) score++;
  if (/\d/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;

  const level = score <= 1 ? 0 : score <= 2 ? 1 : 2;
  const colors = ['#e11d48', '#f59e0b', '#10b981'];
  const labels = ['弱', '中等', '强'];

  ['ps1','ps2','ps3'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.style.background = i <= level ? colors[level] : '#e2e8f0';
  });
  label.textContent = '密码强度：' + labels[level];
  label.style.color = colors[level];
}

/* ─── 密码显示/隐藏切换 ──────────────────────────────────────── */
function togglePwd(inputId, eyeEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    eyeEl.textContent = '🙈';
  } else {
    input.type = 'password';
    eyeEl.textContent = '👁';
  }
}

/* ─── 个人中心：修改密码 ──────────────────────────────────────── */
async function passwordSave() {
  const g = id => document.getElementById(id);
  const msgEl = g('pwd-msg');
  const showMsg = (msg, ok) => {
    msgEl.textContent = msg;
    msgEl.style.display = 'block';
    msgEl.style.background = ok ? 'rgba(16,185,129,.1)' : 'rgba(244,63,94,.09)';
    msgEl.style.color = ok ? '#059669' : '#e11d48';
  };

  const oldPwd  = g('pwd-old').value;
  const newPwd  = g('pwd-new').value;
  const confirm = g('pwd-confirm').value;

  if (!oldPwd)               return showMsg('请输入当前密码', false);
  if (!newPwd)               return showMsg('请输入新密码', false);
  if (newPwd.length < 6)    return showMsg('新密码不能少于6位', false);
  if (newPwd !== confirm)    return showMsg('两次输入的新密码不一致', false);
  if (newPwd === oldPwd)     return showMsg('新密码不能与旧密码相同', false);

  const data = await apiRequest('PUT', '/api/auth/password', { oldPassword: oldPwd, newPassword: newPwd });
  if (!data) return;

  if (data.code === 0) {
    showMsg('✅ 密码已修改，即将跳转登录页…', true);
    showToast('密码修改成功，请重新登录', 'success');
    localStorage.removeItem('cyd_token');
    localStorage.removeItem('cyd_user');
    setTimeout(() => { window.location.href = 'login.html'; }, 2000);
  } else {
    showMsg('❌ ' + (data.msg || '修改失败'), false);
  }
}

/* ─── 退出登录 ────────────────────────────────────────────────── */
async function doLogout() {
  if (!confirm('确认退出登录？')) return;
  await apiRequest('POST', '/api/auth/logout');
  localStorage.removeItem('cyd_token');
  localStorage.removeItem('cyd_user');
  window.location.href = 'login.html';
}

/* ═══════════════════════════════════════════════════════════════
   用户/代理列表模块（合并 members + agents）
   ═══════════════════════════════════════════════════════════════ */

// 颜色映射
const LEVEL_COLOR_MAP = {
  indigo:  { badge: 'badge-indigo',  hex: '#6366f1' },
  cyan:    { badge: 'badge-cyan',    hex: '#06b6d4' },
  emerald: { badge: 'badge-success', hex: '#10b981' },
  amber:   { badge: 'badge-warning', hex: '#f59e0b' },
  violet:  { badge: 'badge-purple',  hex: '#8b5cf6' },
};

const _agent = {
  page:      1,
  size:      15,
  total:     0,
  status:    '',
  keyword:   '',
  user_type: '',
  level_id:  '',
};

// 当前级别缓存
let _agentLevels = [];

/** 初始化时加载级别列表到过滤下拉 */
async function agentInitLevelSel() {
  try {
    const resp = await authFetch('/api/agent-levels');
    const data = await resp.json();
    if (data.code === 0) {
      _agentLevels = data.data || [];
      const sel = document.getElementById('ag-level');
      if (!sel) return;
      // 保留第一个"全部级别"选项，清空其余
      while (sel.options.length > 1) sel.remove(1);
      _agentLevels.forEach(lv => {
        const opt = document.createElement('option');
        opt.value = lv.id;
        opt.textContent = lv.name;
        sel.appendChild(opt);
      });
    }
  } catch(e) { console.error(e); }
}

/** 统计条数据 */
async function agentLoadStats() {
  try {
    const r = await authFetch('/api/members?size=1000');
    const d = await r.json();
    if (d.code !== 0) return;
    const all   = d.data.items || [];
    const agent = all.filter(m => m.user_type === '代理').length;
    const normal= all.filter(m => m.user_type !== '代理').length;
    el('ag-stat-all').textContent    = d.data.total;
    el('ag-stat-agent').textContent  = agent;
    el('ag-stat-normal').textContent = normal;
  } catch(e) {}
}

/** 加载代理/用户列表 */
async function agentLoadList() {
  const tbody = document.getElementById('ag-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:30px;color:var(--text-3);">加载中…</td></tr>';

  const qs = new URLSearchParams({
    page:      _agent.page,
    size:      _agent.size,
    keyword:   _agent.keyword,
    status:    _agent.status,
    user_type: _agent.user_type,
    level_id:  _agent.level_id,
  });

  try {
    const resp = await authFetch('/api/members?' + qs.toString());
    const data = await resp.json();
    if (data.code !== 0) { tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:30px;color:#e11d48;">${data.msg}</td></tr>`; return; }

    _agent.total = data.data.total;
    el('ag-total').textContent = `共 ${_agent.total} 条`;

    const items = data.data.items || [];
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text-3);">暂无数据</td></tr>';
    } else {
      tbody.innerHTML = items.map(m => agentRowHTML(m)).join('');
    }

    agentRenderPagination(data.data.total, data.data.size);
    agentLoadStats();
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:30px;color:#e11d48;">加载失败：${e.message}</td></tr>`;
  }
}

/** 生成表格行 */
function agentRowHTML(m) {
  const isAgent   = m.user_type === '代理';
  const lvColor   = LEVEL_COLOR_MAP[m.level_color] || LEVEL_COLOR_MAP.indigo;
  const lvBadge   = m.level_name
    ? `<span class="badge ${lvColor.badge}">${m.level_name}</span>`
    : `<span class="badge" style="background:#f3f4f6;color:#9ca3af;">—</span>`;
  const typeBadge = isAgent
    ? `<div>${lvBadge}</div>`
    : `<span class="badge" style="background:rgba(6,182,212,0.12);color:#06b6d4;font-size:11px;">普通</span>`;
  const agentNo   = m.agent_no
    ? `<span class="mono" style="font-size:12px;color:#6366f1;">${m.agent_no}</span>`
    : '<span style="color:var(--text-3);">—</span>';
  const balance   = `<span class="num">¥${(m.balance||0).toLocaleString('zh-CN', {minimumFractionDigits:2})}</span>`;
  const statusBadge = m.status === 1
    ? '<span class="badge badge-success">正常</span>'
    : '<span class="badge badge-danger">停用</span>';
  const createdAt = (m.created_at || '').slice(0, 10);

  const pricingBtn = isAgent
    ? `<button class="btn-link text-indigo" onclick="navigateTo('agent-products');pricingSelectAgent(${m.id})">💰 定价</button>`
    : '';
  const toggleBtn = m.status === 1
    ? `<button class="btn-link text-danger" onclick="agentToggleStatus(${m.id},0)">禁用</button>`
    : `<button class="btn-link text-success" onclick="agentToggleStatus(${m.id},1)">启用</button>`;

  return `<tr>
    <td class="mono" style="font-size:12px;color:var(--text-3);">${m.id}</td>
    <td><span style="font-weight:500;">${esc(m.username)}</span></td>
    <td>${m.realname ? esc(m.realname) : '<span style="color:var(--text-3);">—</span>'}</td>
    <td style="font-size:12px;">${m.phone ? esc(m.phone) : '<span style="color:var(--text-3);">—</span>'}</td>
    <td>${typeBadge}</td>
    <td>${agentNo}</td>
    <td>${balance}</td>
    <td>${statusBadge}</td>
    <td style="font-size:12px;color:var(--text-3);">${createdAt}</td>
    <td>
      <button class="btn-link" onclick="memberOpenEdit(${m.id})">编辑</button>
      ${pricingBtn}
      <button class="btn-link" onclick="balanceOpenModal(${m.id},'${esc(m.username)}',${m.balance||0})">余额</button>
      ${toggleBtn}
    </td>
  </tr>`;
}

/** 分页渲染 */
function agentRenderPagination(total, size) {
  const pages = Math.max(1, Math.ceil(total / (size || _agent.size)));
  const wrap  = document.getElementById('ag-pagination');
  if (!wrap) return;
  let html = '';
  for (let i = 1; i <= Math.min(pages, 8); i++) {
    html += `<button class="page-btn${i===_agent.page?' active':''}" onclick="_agent.page=${i};agentLoadList()">${i}</button>`;
  }
  if (pages > 8) html += `<button class="page-btn" onclick="agentGoto()">…</button>`;
  wrap.innerHTML = html;
}

function agentGoto() {
  const p = parseInt(prompt('跳转到第几页？'));
  if (!isNaN(p) && p > 0) { _agent.page = p; agentLoadList(); }
}

function agentTypeFilter(el, type) {
  document.querySelectorAll('#agent-type-bar .ostat-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  _agent.user_type = type;
  _agent.page = 1;
  agentLoadList();
}

function agentSearch() {
  _agent.keyword  = document.getElementById('ag-keyword')?.value.trim() || '';
  _agent.level_id = document.getElementById('ag-level')?.value || '';
  _agent.status   = document.getElementById('ag-status')?.value || '';
  _agent.page = 1;
  agentLoadList();
}

function agentReset() {
  document.getElementById('ag-keyword').value = '';
  document.getElementById('ag-level').value   = '';
  document.getElementById('ag-status').value  = '';
  _agent.keyword = _agent.level_id = _agent.status = '';
  _agent.user_type = '';
  document.querySelectorAll('#agent-type-bar .ostat-item').forEach(i => i.classList.remove('active'));
  document.querySelector('#agent-type-bar .ostat-item')?.classList.add('active');
  _agent.page = 1;
  agentLoadList();
}

async function agentToggleStatus(id, newStatus) {
  const label = newStatus === 1 ? '启用' : '禁用';
  if (!confirm(`确定要${label}该用户吗？`)) return;
  try {
    const r = await authFetch(`/api/members/${id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const d = await r.json();
    if (d.code === 0) { showToast(`已${label}`, 'success'); agentLoadList(); }
    else showToast(d.msg, 'error');
  } catch(e) { showToast('操作失败', 'error'); }
}

/* ═══════════════════════════════════════════════════════════════
   代理级别管理模块
   ═══════════════════════════════════════════════════════════════ */

/** 加载级别列表 */
async function agentLevelLoadList() {
  try {
    const resp = await authFetch('/api/agent-levels');
    const data = await resp.json();
    if (data.code !== 0) return;
    const levels = data.data || [];
    const grid   = document.getElementById('level-card-grid');
    const empty  = document.getElementById('level-empty');
    if (!grid) return;

    if (!levels.length) {
      grid.innerHTML = '';
      empty && (empty.style.display = '');
      return;
    }
    empty && (empty.style.display = 'none');

    grid.innerHTML = levels.map(lv => {
      const colorInfo = LEVEL_COLOR_MAP[lv.color] || LEVEL_COLOR_MAP.indigo;
      return `<div class="glass-card" style="padding:20px 22px;position:relative;overflow:hidden;animation:fadeInUp .3s both;">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;">
          <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,${colorInfo.hex},${colorInfo.hex}cc);display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 16px ${colorInfo.hex}44;flex-shrink:0;">🏅</div>
          <div>
            <div style="font-size:15px;font-weight:600;color:var(--text);">${esc(lv.name)}</div>
            <div style="font-size:12px;color:var(--text-3);margin-top:2px;">${esc(lv.desc||'—')}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
          <span class="badge ${colorInfo.badge}">示例标签</span>
          <span style="font-size:12px;color:var(--text-3);">排序：${lv.sort}</span>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-ghost btn-sm" style="flex:1;" onclick="agentLevelOpenEdit(${lv.id})">编辑</button>
          <button class="btn btn-sm" style="flex:1;background:rgba(239,68,68,0.08);color:#e11d48;border:none;border-radius:10px;" onclick="agentLevelDelete(${lv.id})">删除</button>
        </div>
      </div>`;
    }).join('');

    // 同步更新代理列表中的级别过滤下拉
    agentInitLevelSel();
    // 同步更新会员编辑弹窗中的级别下拉
    syncLevelOptions();
  } catch(e) { console.error(e); }
}

function syncLevelOptions() {
  const sel = document.getElementById('member-edit-level');
  if (!sel) return;
  while (sel.options.length > 1) sel.remove(1);
  _agentLevels.forEach(lv => {
    const opt = document.createElement('option');
    opt.value = lv.id;
    opt.textContent = lv.name;
    sel.appendChild(opt);
  });
}

function agentLevelOpenAdd() {
  document.getElementById('level-edit-id').value   = '';
  document.getElementById('level-edit-name').value = '';
  document.getElementById('level-edit-desc').value = '';
  document.getElementById('level-edit-color').value = 'indigo';
  document.getElementById('level-edit-sort').value  = '';
  document.getElementById('level-modal-title').textContent = '新增级别';
  el('level-edit-msg').style.display = 'none';
  showModal('modal-level-edit');
}

async function agentLevelOpenEdit(id) {
  try {
    const resp  = await authFetch('/api/agent-levels');
    const data  = await resp.json();
    const level = (data.data || []).find(l => l.id === id);
    if (!level) return;
    document.getElementById('level-edit-id').value    = level.id;
    document.getElementById('level-edit-name').value  = level.name;
    document.getElementById('level-edit-desc').value  = level.desc || '';
    document.getElementById('level-edit-color').value = level.color || 'indigo';
    document.getElementById('level-edit-sort').value  = level.sort || '';
    document.getElementById('level-modal-title').textContent = '编辑级别';
    el('level-edit-msg').style.display = 'none';
    showModal('modal-level-edit');
  } catch(e) { showToast('加载失败', 'error'); }
}

async function agentLevelSave() {
  const id    = document.getElementById('level-edit-id').value;
  const name  = document.getElementById('level-edit-name').value.trim();
  const desc  = document.getElementById('level-edit-desc').value.trim();
  const color = document.getElementById('level-edit-color').value;
  const sort  = document.getElementById('level-edit-sort').value;

  if (!name) { showFormMsg('level-edit-msg', '级别名称不能为空', 'error'); return; }

  const body  = { name, desc, color, sort: parseInt(sort)||99 };
  const isEdit = !!id;
  const url    = isEdit ? `/api/agent-levels/${id}` : '/api/agent-levels';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const r = await authFetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const d = await r.json();
    if (d.code === 0) {
      showToast(isEdit ? '级别已更新' : '级别已创建', 'success');
      hideModal('modal-level-edit');
      agentLevelLoadList();
    } else {
      showFormMsg('level-edit-msg', d.msg, 'error');
    }
  } catch(e) { showFormMsg('level-edit-msg', '保存失败', 'error'); }
}

async function agentLevelDelete(id) {
  if (!confirm('确定要删除该级别吗？如果有代理正在使用此级别，将无法删除。')) return;
  try {
    const r = await authFetch(`/api/agent-levels/${id}`, { method: 'DELETE' });
    const d = await r.json();
    if (d.code === 0) { showToast('已删除', 'success'); agentLevelLoadList(); }
    else showToast(d.msg, 'error');
  } catch(e) { showToast('删除失败', 'error'); }
}

/* ═══════════════════════════════════════════════════════════════
   代理产品定价模块
   ═══════════════════════════════════════════════════════════════ */

let _pricingCurrentMemberId = null;
let _pricingItems           = [];  // 当前加载的定价列表（带本地修改）

/** 初始化代理下拉（进入页面时调用） */
async function pricingInitAgentSel() {
  const sel = document.getElementById('pricing-agent-sel');
  if (!sel) return;
  try {
    const r = await authFetch('/api/agents');
    const d = await r.json();
    if (d.code !== 0) return;
    const agents = d.data || [];
    while (sel.options.length > 1) sel.remove(1);
    agents.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = `${a.name}${a.agent_no ? ' (' + a.agent_no + ')' : ''}`;
      sel.appendChild(opt);
    });
    // 如果有预选
    if (_pricingCurrentMemberId) {
      sel.value = _pricingCurrentMemberId;
      pricingLoadList();
    }
  } catch(e) {}
}

/** 从代理列表页跳转时预选代理 */
function pricingSelectAgent(memberId) {
  _pricingCurrentMemberId = memberId;
  const sel = document.getElementById('pricing-agent-sel');
  if (sel) { sel.value = memberId; pricingLoadList(); }
}

/** 加载该代理的产品定价 */
async function pricingLoadList() {
  const sel = document.getElementById('pricing-agent-sel');
  if (!sel) return;
  const memberId = sel.value;
  if (!memberId) {
    document.getElementById('pricing-tbody').innerHTML =
      '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-3);">请先选择左侧代理</td></tr>';
    el('pricing-agent-bal').textContent = '';
    return;
  }
  _pricingCurrentMemberId = parseInt(memberId);

  try {
    const r = await authFetch(`/api/agent-pricing?member_id=${memberId}`);
    const d = await r.json();
    if (d.code !== 0) { showToast(d.msg, 'error'); return; }

    _pricingItems = (d.data || []).map(item => ({ ...item, _dirty: false }));
    pricingRenderTable();

    // 更新余额显示
    const agR = await authFetch(`/api/members?keyword=${memberId}&size=1`);
    const agD = await agR.json();
    if (agD.code === 0 && agD.data.items.length) {
      const bal = agD.data.items[0].balance || 0;
      el('pricing-agent-bal').textContent = `余额：¥${bal.toLocaleString('zh-CN', {minimumFractionDigits:2})}`;
    }

    // 填充分类过滤
    const cats = [...new Set(_pricingItems.map(i => i.category).filter(Boolean))];
    const catSel = document.getElementById('pricing-cat-sel');
    if (catSel) {
      while (catSel.options.length > 1) catSel.remove(1);
      cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c; opt.textContent = c;
        catSel.appendChild(opt);
      });
    }
  } catch(e) { showToast('加载失败', 'error'); }
}

/** 渲染定价表格 */
function pricingRenderTable(filterCat) {
  const tbody = document.getElementById('pricing-tbody');
  if (!tbody) return;
  const items = filterCat
    ? _pricingItems.filter(i => i.category === filterCat)
    : _pricingItems;

  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-3);">暂无定价配置</td></tr>';
    return;
  }

  tbody.innerHTML = items.map((item, idx) => {
    const profit = ((item.base_price||0) - (item.agent_price||0)).toFixed(2);
    const profitColor = profit >= 0 ? 'text-success' : 'text-danger';
    return `<tr id="pricing-row-${item.id}">
      <td>${esc(item.product_name)}</td>
      <td><span class="badge badge-indigo" style="font-size:11px;">${esc(item.category||'—')}</span></td>
      <td class="num">¥${(item.face_value||0).toFixed(2)}</td>
      <td class="num">¥${(item.base_price||0).toFixed(2)}</td>
      <td>
        <input type="number" class="input-inline" style="width:90px;"
          id="pricing-price-${item.id}" value="${item.agent_price||0}"
          step="0.01" min="0"
          onchange="pricingMarkDirty(${item.id})">
      </td>
      <td class="num ${profitColor}" id="pricing-profit-${item.id}">
        ${profit >= 0 ? '+' : ''}¥${profit}
      </td>
      <td>
        <button class="btn-link text-success" onclick="pricingSaveOne(${item.id})">保存</button>
      </td>
    </tr>`;
  }).join('');
}

function pricingMarkDirty(itemId) {
  const item = _pricingItems.find(i => i.id === itemId);
  if (!item) return;
  const newPrice = parseFloat(document.getElementById(`pricing-price-${itemId}`).value) || 0;
  item.agent_price = newPrice;
  item._dirty = true;
  // 实时更新利润
  const profit = (item.base_price - newPrice).toFixed(2);
  const el2 = document.getElementById(`pricing-profit-${itemId}`);
  if (el2) {
    el2.textContent = `${profit >= 0 ? '+' : ''}¥${profit}`;
    el2.className   = `num ${profit >= 0 ? 'text-success' : 'text-danger'}`;
  }
}

function pricingFilterCat() {
  const cat = document.getElementById('pricing-cat-sel')?.value || '';
  pricingRenderTable(cat || undefined);
}

/** 保存单条 */
async function pricingSaveOne(itemId) {
  const item = _pricingItems.find(i => i.id === itemId);
  if (!item || !_pricingCurrentMemberId) return;
  await pricingDoSave([item]);
}

/** 批量保存全部 */
async function pricingSaveAll() {
  if (!_pricingCurrentMemberId) { showToast('请先选择代理', 'warning'); return; }
  // 读取所有输入框最新值
  _pricingItems.forEach(item => {
    const inp = document.getElementById(`pricing-price-${item.id}`);
    if (inp) item.agent_price = parseFloat(inp.value) || 0;
  });
  await pricingDoSave(_pricingItems);
}

async function pricingDoSave(items) {
  try {
    const body = {
      member_id: _pricingCurrentMemberId,
      items: items.map(i => ({
        product_id:   i.product_id,
        product_name: i.product_name,
        category:     i.category,
        face_value:   i.face_value,
        base_price:   i.base_price,
        agent_price:  i.agent_price,
      }))
    };
    const r = await authFetch('/api/agent-pricing', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const d = await r.json();
    if (d.code === 0) showToast('价格已保存', 'success');
    else showToast(d.msg, 'error');
  } catch(e) { showToast('保存失败', 'error'); }
}

/** 打开批量加价弹窗 */
async function pricingOpenBatchMarkup() {
  el('markup-msg').style.display = 'none';
  el('markup-preview').style.display = 'none';
  document.getElementById('markup-scope').value     = 'all';
  document.getElementById('markup-direction').value = 'up';
  document.getElementById('markup-percent').value   = '';
  el('markup-agent-wrap').style.display = 'none';

  // 填充代理多选列表
  try {
    const r = await authFetch('/api/agents');
    const d = await r.json();
    if (d.code === 0) {
      const listEl = document.getElementById('markup-agent-list');
      listEl.innerHTML = (d.data || []).map(a =>
        `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;">
          <input type="checkbox" value="${a.id}" style="accent-color:#6366f1;width:14px;height:14px;">
          <span>${esc(a.name)}${a.agent_no ? ' <span style="color:var(--text-3);">'+a.agent_no+'</span>' : ''}</span>
        </label>`
      ).join('');
    }
  } catch(e) {}

  showModal('modal-batch-markup');
}

function markupScopeChange() {
  const scope = document.getElementById('markup-scope').value;
  el('markup-agent-wrap').style.display = scope === 'selected' ? '' : 'none';
}

/** 提交批量加价 */
async function markupSubmit() {
  const scope     = document.getElementById('markup-scope').value;
  const direction = document.getElementById('markup-direction').value;
  const percent   = parseFloat(document.getElementById('markup-percent').value);

  if (isNaN(percent) || percent <= 0) { showFormMsg('markup-msg', '请输入有效的百分比（>0）', 'error'); return; }

  let member_ids = 'all';
  if (scope === 'selected') {
    const checks = document.querySelectorAll('#markup-agent-list input[type=checkbox]:checked');
    if (!checks.length) { showFormMsg('markup-msg', '请至少选择一个代理', 'error'); return; }
    member_ids = Array.from(checks).map(c => parseInt(c.value));
  }

  const dir = direction === 'up' ? '上调' : '下调';
  if (!confirm(`确定要对${scope === 'all' ? '所有代理' : `${member_ids.length}个代理`}的产品价格${dir} ${percent}% 吗？`)) return;

  try {
    const r = await authFetch('/api/agent-pricing/batch-markup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_ids, percent, direction })
    });
    const d = await r.json();
    if (d.code === 0) {
      showFormMsg('markup-msg', `✅ ${d.msg}`, 'success');
      setTimeout(() => {
        hideModal('modal-batch-markup');
        if (_pricingCurrentMemberId) pricingLoadList();
      }, 1200);
    } else {
      showFormMsg('markup-msg', d.msg, 'error');
    }
  } catch(e) { showFormMsg('markup-msg', '操作失败', 'error'); }
}

/* ═══════════════════════════════════════════════════════════════
   用户管理模块（前台会员）
   ═══════════════════════════════════════════════════════════════ */



const _member = {
  page:    1,
  size:    15,
  total:   0,
  status:  '',   // '' | '0' | '1'
  keyword: '',
  typeFilter: '',
};

/** 加载用户列表 */
async function memberLoadList() {
  const keyword = _member.keyword;
  const params  = new URLSearchParams({
    page:    _member.page,
    size:    _member.size,
    keyword,
    status:  _member.status,
  });
  const data = await apiRequest('GET', '/api/members?' + params);
  if (!data || data.code !== 0) return;

  const { total, items } = data.data;
  _member.total = total;

  // 更新统计条
  document.getElementById('mstat-all').textContent = total;
  const normalCount   = items.filter(m => m.status === 1).length;
  const disabledCount = items.filter(m => m.status === 0).length;
  if (_member.status === '') {
    document.getElementById('mstat-normal').textContent   = normalCount;
    document.getElementById('mstat-disabled').textContent = disabledCount;
  }

  // 渲染表格
  const tbody = document.getElementById('member-tbody');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:40px;color:var(--text-3);">暂无数据</td></tr>`;
  } else {
    tbody.innerHTML = items.map(m => memberRowHTML(m)).join('');
  }

  // 分页
  document.getElementById('member-total').textContent = `共 ${total} 条记录`;
  memberRenderPagination(total);
}

/** 单行 HTML */
function memberRowHTML(m) {
  const statusBadge = m.status === 1
    ? `<span class="badge badge-success">正常</span>`
    : `<span class="badge badge-danger">停用</span>`;

  const typeBadgeColor = { 'VIP用户': 'badge-amber', '代理用户': 'badge-indigo', '普通用户': 'badge-ghost' };
  const typeBadge = `<span class="badge ${typeBadgeColor[m.user_type] || 'badge-ghost'}">${m.user_type || '普通用户'}</span>`;

  const anonBadge = m.is_anonymous
    ? `<span class="badge badge-ghost">匿名</span>`
    : `<span style="color:var(--text-3);font-size:12px;">—</span>`;

  // 头像
  let avatarHtml;
  if (m.avatar) {
    avatarHtml = `<img src="${m.avatar}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:2px solid rgba(99,102,241,0.2);" onerror="this.style.display='none';this.nextSibling.style.display='flex'"><div style="display:none;width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;">${(m.username||'U')[0].toUpperCase()}</div>`;
  } else {
    const letter = (m.username || 'U')[0].toUpperCase();
    avatarHtml = `<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;">${letter}</div>`;
  }

  const toggleBtn = m.status === 1
    ? `<button class="btn-link text-danger" onclick="memberToggleStatus(${m.id},0)">停用</button>`
    : `<button class="btn-link text-success" onclick="memberToggleStatus(${m.id},1)">启用</button>`;

  const balance = (parseFloat(m.balance) || 0).toFixed(2);
  const balanceColor = parseFloat(balance) > 0 ? 'color:#059669;font-weight:600;' : 'color:var(--text-3);';

  return `
    <tr>
      <td class="mono">#${m.id}</td>
      <td><div style="display:flex;align-items:center;">${avatarHtml}</div></td>
      <td style="font-weight:600;">${escHtml(m.username)}</td>
      <td class="text-muted">${escHtml(m.email) || '—'}</td>
      <td>${escHtml(m.realname) || '<span style="color:var(--text-3)">—</span>'}</td>
      <td>${typeBadge}</td>
      <td>${escHtml(m.referrer) || '<span style="color:var(--text-3)">—</span>'}</td>
      <td>${anonBadge}</td>
      <td style="${balanceColor}">¥${balance}</td>
      <td>${statusBadge}</td>
      <td style="color:var(--text-3);font-size:12.5px;">${escHtml(m.created_at)}</td>
      <td style="white-space:nowrap;">
        <button class="btn-link" onclick="memberOpenEdit(${m.id})">编辑</button>
        <button class="btn-link" style="color:#6366f1;" onclick="balanceOpenModal(${m.id},'${escHtml(m.username)}',${balance})">余额</button>
        ${toggleBtn}
      </td>
    </tr>`;
}

/** XSS 转义 */
function escHtml(s) {
  if (!s && s !== 0) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/** 渲染分页 */
function memberRenderPagination(total) {
  const totalPages = Math.ceil(total / _member.size) || 1;
  const cur = _member.page;
  let html = '';

  html += `<button class="page-btn" ${cur<=1?'disabled':''} onclick="memberGoto(${cur-1})">‹</button>`;
  const pages = [];
  if (totalPages <= 7) {
    for (let i=1;i<=totalPages;i++) pages.push(i);
  } else {
    pages.push(1);
    if (cur > 3) pages.push('...');
    for (let i=Math.max(2,cur-1);i<=Math.min(totalPages-1,cur+1);i++) pages.push(i);
    if (cur < totalPages-2) pages.push('...');
    pages.push(totalPages);
  }
  pages.forEach(p => {
    if (p === '...') html += `<span style="padding:0 4px;color:var(--text-3)">…</span>`;
    else html += `<button class="page-btn ${p===cur?'active':''}" onclick="memberGoto(${p})">${p}</button>`;
  });
  html += `<button class="page-btn" ${cur>=totalPages?'disabled':''} onclick="memberGoto(${cur+1})">›</button>`;

  document.getElementById('member-pagination').innerHTML = html;
}

function memberGoto(p) {
  _member.page = p;
  memberLoadList();
}

/** 搜索 */
function memberSearch() {
  _member.keyword    = document.getElementById('member-keyword').value.trim();
  _member.typeFilter = document.getElementById('member-type-filter').value;
  _member.page       = 1;
  memberLoadList();
}

/** 重置搜索 */
function memberReset() {
  document.getElementById('member-keyword').value = '';
  document.getElementById('member-type-filter').value = '';
  _member.keyword    = '';
  _member.typeFilter = '';
  _member.status     = '';
  _member.page       = 1;
  // 重置统计条高亮
  document.querySelectorAll('#member-stats-bar .ostat-item').forEach(i => i.classList.remove('active'));
  document.querySelector('#member-stats-bar .ostat-item[data-status=""]').classList.add('active');
  memberLoadList();
}

/** 统计条筛选状态 */
function memberFilterStatus(el, status) {
  document.querySelectorAll('#member-stats-bar .ostat-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  _member.status = status;
  _member.page   = 1;
  memberLoadList();
}

/** 切换启用/停用 */
async function memberToggleStatus(id, newStatus) {
  const label = newStatus === 1 ? '启用' : '停用';
  if (!confirm(`确认要${label}该用户吗？`)) return;
  const data = await apiRequest('PATCH', `/api/members/${id}/status`, { status: newStatus });
  if (!data) return;
  if (data.code === 0) {
    showToast(data.msg || `用户已${label}`, 'success');
    memberLoadList();
  } else {
    showToast(data.msg || '操作失败', 'error');
  }
}

/** 用户类型切换：代理时显示代理专属字段 */
function memberTypeChange(type) {
  const wrap = document.getElementById('agent-fields-wrap');
  if (wrap) wrap.style.display = type === '代理' ? '' : 'none';
}

/** 打开新增弹窗 */
function memberOpenAdd() {
  const fields = ['member-edit-id','member-edit-username','member-edit-email','member-edit-password',
                  'member-edit-realname','member-edit-referrer','member-edit-phone',
                  'member-edit-agent-no','member-edit-commission'];
  fields.forEach(fid => { const el=document.getElementById(fid); if(el) el.value=''; });
  document.getElementById('member-edit-type').value    = '普通用户';
  document.getElementById('member-edit-status').value  = '1';
  document.getElementById('member-edit-anonymous').checked = false;
  document.getElementById('member-edit-avatar').value  = '';
  document.getElementById('member-avatar-letter').textContent = 'U';
  const prev = document.getElementById('member-avatar-preview');
  prev.style.backgroundImage = '';
  prev.style.background = 'linear-gradient(135deg,#6366f1,#8b5cf6)';
  document.getElementById('member-avatar-letter').style.display = '';

  // 重置代理字段
  const levelSel = document.getElementById('member-edit-level');
  if (levelSel) levelSel.value = '';
  const parentSel = document.getElementById('member-edit-parent');
  if (parentSel) parentSel.value = '';
  memberTypeChange('普通用户');

  document.getElementById('member-modal-title').textContent = '新增用户';
  document.getElementById('member-edit-msg').style.display = 'none';
  document.getElementById('member-edit-password').placeholder = '密码（必填，≥6位）';

  // 加载级别和上级代理选项
  memberLoadLevelOptions();
  memberLoadParentOptions();

  showModal('modal-member-edit');
}

/** 打开编辑弹窗 */
async function memberOpenEdit(id) {
  const data = await apiRequest('GET', `/api/members?keyword=${id}&page=1&size=1`);
  if (!data || data.code !== 0) return;
  const member = data.data.items.find(m => m.id === id);
  if (!member) { showToast('未找到该用户', 'error'); return; }

  document.getElementById('member-edit-id').value        = member.id;
  document.getElementById('member-edit-username').value  = member.username  || '';
  document.getElementById('member-edit-email').value     = member.email     || '';
  document.getElementById('member-edit-password').value  = '';
  document.getElementById('member-edit-realname').value  = member.realname  || '';
  document.getElementById('member-edit-referrer').value  = member.referrer  || '';
  document.getElementById('member-edit-phone').value     = member.phone     || '';
  document.getElementById('member-edit-type').value      = member.user_type || '普通用户';
  document.getElementById('member-edit-status').value    = String(member.status);
  document.getElementById('member-edit-anonymous').checked = !!member.is_anonymous;
  document.getElementById('member-edit-avatar').value    = member.avatar || '';
  document.getElementById('member-edit-password').placeholder = '留空则不修改密码';

  // 代理字段
  document.getElementById('member-edit-agent-no').value   = member.agent_no || '';
  document.getElementById('member-edit-commission').value = (member.commission_rate||0) * 100;
  memberTypeChange(member.user_type);

  // 加载级别和上级代理选项
  await memberLoadLevelOptions(member.level_id);
  await memberLoadParentOptions(member.id, member.parent_id);

  // 头像预览
  memberAvatarUrlPreview(member.avatar, (member.username || 'U')[0].toUpperCase());

  document.getElementById('member-modal-title').textContent = `编辑用户 · #${member.id}`;
  document.getElementById('member-edit-msg').style.display = 'none';
  showModal('modal-member-edit');
}

/** 填充级别下拉 */
async function memberLoadLevelOptions(selectedId) {
  const sel = document.getElementById('member-edit-level');
  if (!sel) return;
  try {
    const r = await authFetch('/api/agent-levels');
    const d = await r.json();
    if (d.code === 0) {
      _agentLevels = d.data || [];
      while (sel.options.length > 1) sel.remove(1);
      _agentLevels.forEach(lv => {
        const opt = document.createElement('option');
        opt.value = lv.id;
        opt.textContent = lv.name;
        sel.appendChild(opt);
      });
      if (selectedId) sel.value = String(selectedId);
    }
  } catch(e) {}
}

/** 填充上级代理下拉 */
async function memberLoadParentOptions(excludeId, selectedId) {
  const sel = document.getElementById('member-edit-parent');
  if (!sel) return;
  try {
    const r = await authFetch('/api/agents');
    const d = await r.json();
    if (d.code === 0) {
      while (sel.options.length > 1) sel.remove(1);
      (d.data || []).forEach(a => {
        if (excludeId && a.id === excludeId) return;
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = `${a.name}${a.agent_no ? ' ('+a.agent_no+')' : ''}`;
        sel.appendChild(opt);
      });
      if (selectedId) sel.value = String(selectedId);
    }
  } catch(e) {}
}

/** 头像 URL 输入实时预览 */
function memberAvatarUrlPreview(url, fallbackLetter) {
  const prev   = document.getElementById('member-avatar-preview');
  const letter = document.getElementById('member-avatar-letter');
  if (url && url.trim()) {
    prev.style.backgroundImage = `url('${url}')`;
    prev.style.backgroundSize  = 'cover';
    prev.style.backgroundPosition = 'center';
    prev.style.background      = `url('${url}') center/cover`;
    if (letter) letter.style.display = 'none';
  } else {
    prev.style.background = 'linear-gradient(135deg,#6366f1,#8b5cf6)';
    if (letter) {
      letter.style.display = '';
      if (fallbackLetter) letter.textContent = fallbackLetter;
    }
  }
}

/** 上传头像（转 base64 或 URL） */
function memberAvatarUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showToast('图片不能超过 2MB', 'error'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('member-edit-avatar').value = e.target.result;
    memberAvatarUrlPreview(e.target.result);
  };
  reader.readAsDataURL(file);
}

/** 保存（新增 or 编辑） */
async function memberSave() {
  const g      = fid => document.getElementById(fid);
  const msgEl  = g('member-edit-msg');
  const showMsg = (msg, ok) => {
    msgEl.textContent = msg;
    msgEl.style.display = 'block';
    msgEl.style.background = ok ? 'rgba(16,185,129,.1)' : 'rgba(244,63,94,.09)';
    msgEl.style.color = ok ? '#059669' : '#e11d48';
  };

  const editId   = g('member-edit-id').value;
  const username = g('member-edit-username').value.trim();
  const password = g('member-edit-password').value;
  const userType = g('member-edit-type').value;

  if (!username) return showMsg('用户名不能为空', false);
  if (!editId && (!password || password.length < 6)) return showMsg('密码不能少于6位', false);

  const payload = {
    username,
    email:           g('member-edit-email').value.trim(),
    realname:        g('member-edit-realname').value.trim(),
    avatar:          g('member-edit-avatar').value.trim(),
    phone:           g('member-edit-phone').value.trim(),
    user_type:       userType,
    referrer:        g('member-edit-referrer').value.trim(),
    is_anonymous:    g('member-edit-anonymous').checked ? 1 : 0,
    status:          parseInt(g('member-edit-status').value),
  };

  // 代理专属字段
  if (userType === '代理') {
    const levelVal = g('member-edit-level').value;
    const parentVal = g('member-edit-parent').value;
    const commVal  = g('member-edit-commission').value;
    payload.level_id        = levelVal  ? parseInt(levelVal)  : null;
    payload.parent_id       = parentVal ? parseInt(parentVal) : null;
    payload.agent_no        = g('member-edit-agent-no').value.trim();
    payload.commission_rate = commVal ? parseFloat(commVal) / 100 : 0;
  } else {
    payload.level_id        = null;
    payload.parent_id       = null;
    payload.agent_no        = '';
    payload.commission_rate = 0;
  }

  if (password) payload.password = password;

  let data;
  if (editId) {
    data = await apiRequest('PUT', `/api/members/${editId}`, payload);
  } else {
    data = await apiRequest('POST', '/api/members', payload);
  }
  if (!data) return;

  if (data.code === 0) {
    showMsg('✅ ' + (data.msg || '保存成功'), true);
    showToast(data.msg || '保存成功', 'success');
    setTimeout(() => {
      hideModal('modal-member-edit');
      // 刷新当前页（代理列表或用户列表均可）
      if (document.getElementById('page-agents')?.classList.contains('active')) {
        agentLoadList();
      } else {
        memberLoadList();
      }
    }, 800);
  } else {
    showMsg('❌ ' + (data.msg || '保存失败'), false);
  }
}

/* ═══════════════════════════════════════════════════════════════
   余额调整模块
   ═══════════════════════════════════════════════════════════════ */

let _balanceCurrent = 0;

/** 打开余额调整弹窗 */
function balanceOpenModal(memberId, username, currentBalance) {
  _balanceCurrent = parseFloat(currentBalance) || 0;
  document.getElementById('balance-member-id').value = memberId;
  document.getElementById('balance-modal-title').textContent = `余额调整 · ${username}`;
  document.getElementById('balance-username-display').textContent = username;
  document.getElementById('balance-current-display').textContent = `¥${_balanceCurrent.toFixed(2)}`;
  document.getElementById('balance-amount').value = '';
  document.getElementById('balance-remark').value = '';
  document.getElementById('balance-result-preview').style.display = 'none';
  document.getElementById('balance-msg').style.display = 'none';
  balanceSelectType('add');
  showModal('modal-balance-adjust');
}

/** 切换增加/扣减 */
function balanceSelectType(type) {
  document.getElementById('balance-type').value = type;
  const btnAdd = document.getElementById('balance-btn-add');
  const btnSub = document.getElementById('balance-btn-sub');
  if (type === 'add') {
    btnAdd.style.background = 'linear-gradient(135deg,#6366f1,#8b5cf6)';
    btnAdd.style.color = '#fff';
    btnAdd.style.borderColor = '#6366f1';
    btnSub.style.background = '#fff';
    btnSub.style.color = 'var(--text)';
    btnSub.style.borderColor = '#e5e7eb';
  } else {
    btnSub.style.background = 'linear-gradient(135deg,#f43f5e,#e11d48)';
    btnSub.style.color = '#fff';
    btnSub.style.borderColor = '#f43f5e';
    btnAdd.style.background = '#fff';
    btnAdd.style.color = 'var(--text)';
    btnAdd.style.borderColor = '#e5e7eb';
  }
  balancePreviewResult();
}

/** 实时预览调整后余额 */
function balancePreviewResult() {
  const type   = document.getElementById('balance-type').value;
  const amount = parseFloat(document.getElementById('balance-amount').value) || 0;
  const preview = document.getElementById('balance-result-preview');
  const afterEl = document.getElementById('balance-after-val');
  if (amount > 0) {
    const after = type === 'add'
      ? +(_balanceCurrent + amount).toFixed(2)
      : +(_balanceCurrent - amount).toFixed(2);
    afterEl.textContent = `¥${after.toFixed(2)}`;
    afterEl.style.color = after >= 0 ? '#6366f1' : '#e11d48';
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
}

/** 提交余额调整 */
async function balanceSubmit() {
  const id     = document.getElementById('balance-member-id').value;
  const type   = document.getElementById('balance-type').value;
  const amount = parseFloat(document.getElementById('balance-amount').value);
  const remark = document.getElementById('balance-remark').value.trim();
  const msgEl  = document.getElementById('balance-msg');

  const showMsg = (msg, ok) => {
    msgEl.textContent = msg;
    msgEl.style.display = 'block';
    msgEl.style.background = ok ? 'rgba(16,185,129,.1)' : 'rgba(244,63,94,.09)';
    msgEl.style.color = ok ? '#059669' : '#e11d48';
  };

  if (!amount || amount <= 0) return showMsg('请输入有效金额（大于0）', false);

  const btn = document.getElementById('balance-submit-btn');
  btn.disabled = true;
  btn.textContent = '处理中…';

  const data = await apiRequest('POST', `/api/members/${id}/balance`, { type, amount, remark });
  btn.disabled = false;
  btn.textContent = '确认调整';

  if (!data) return;
  if (data.code === 0) {
    showMsg('✅ ' + data.msg, true);
    _balanceCurrent = data.data.after;
    document.getElementById('balance-current-display').textContent = `¥${_balanceCurrent.toFixed(2)}`;
    document.getElementById('balance-amount').value = '';
    document.getElementById('balance-result-preview').style.display = 'none';
    showToast(data.msg, 'success');
    hideModal('modal-balance-adjust');
    // 刷新当前激活的列表页
    if (document.getElementById('page-agents')?.classList.contains('active')) {
      agentLoadList();
    } else if (document.getElementById('page-agent-balance')?.classList.contains('active')) {
      balancePageLoad();
    } else if (typeof memberLoadList === 'function') {
      memberLoadList();
    }
  } else {
    showMsg('❌ ' + (data.msg || '操作失败'), false);
  }
}

/* ═══════════════════════════════════════════════════════════════
   角色管理模块
   ═══════════════════════════════════════════════════════════════ */

let _permsMeta = [];   // 权限节点元数据

/** 进入角色管理页时加载 */
// （已在 navigateTo 中挂钩，见下方）

/** 加载权限元数据（只需一次） */
async function rolesEnsureMeta() {
  if (_permsMeta.length) return;
  const d = await apiRequest('GET', '/api/permissions/meta');
  if (d && d.code === 0) _permsMeta = d.data;
}

/** 加载并渲染角色列表 */
async function roleLoadList() {
  await rolesEnsureMeta();
  const d = await apiRequest('GET', '/api/roles');
  if (!d || d.code !== 0) return;

  const roles = d.data;
  const grid  = document.getElementById('role-card-grid');
  if (!roles.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-3);">暂无角色，点击「新增角色」创建</div>`;
    return;
  }

  const roleIcons  = ['👑','👨‍💼','💰','🎧','🛡️','🔧','📊','🎯'];
  const roleColors = ['role-red','role-blue','role-green','role-cyan','role-indigo','role-amber'];

  grid.innerHTML = roles.map((r, i) => {
    const icon   = roleIcons[i % roleIcons.length];
    const color  = roleColors[i % roleColors.length];
    // 取权限分组标签（最多3个）
    const groups = [...new Set(
      (r.permissions || []).map(key => {
        const meta = _permsMeta.find(m => m.key === key);
        return meta ? meta.group : null;
      }).filter(Boolean)
    )].slice(0, 4);

    const permTags = r.builtin
      ? `<span class="perm-tag" style="background:rgba(99,102,241,.12);color:#6366f1;">全部权限</span>`
      : groups.map(g => `<span class="perm-tag">${g}</span>`).join('') || `<span style="color:var(--text-3);font-size:12px;">暂无权限</span>`;

    const editBtn  = `<button class="btn btn-ghost btn-sm" onclick="roleOpenEdit(${r.id})">⚙ 配置权限</button>`;
    const delBtn   = r.builtin ? '' : `<button class="btn btn-ghost btn-sm" style="color:#e11d48;border-color:#fecdd3;" onclick="roleDelete(${r.id},'${escHtml(r.name)}')">删除</button>`;

    return `
      <div class="glass-card role-card" style="animation:fadeInUp .3s ease ${i*0.06}s both;">
        <div class="role-icon ${color}">${icon}</div>
        <div class="role-name">${escHtml(r.name)}${r.builtin ? ' <span style="font-size:11px;font-weight:400;color:#6366f1;background:rgba(99,102,241,.1);border-radius:6px;padding:1px 6px;">内置</span>' : ''}</div>
        <div class="role-desc">${escHtml(r.desc) || '暂无描述'}</div>
        <div class="role-perms" style="flex-wrap:wrap;gap:4px;display:flex;">${permTags}</div>
        <div class="role-footer" style="display:flex;gap:8px;margin-top:auto;">
          ${editBtn}${delBtn}
        </div>
      </div>`;
  }).join('');
}

/** 打开新增弹窗 */
async function roleOpenAdd() {
  await rolesEnsureMeta();
  document.getElementById('role-edit-id').value    = '';
  document.getElementById('role-edit-name').value  = '';
  document.getElementById('role-edit-desc').value  = '';
  document.getElementById('role-modal-title').textContent = '新增角色';
  document.getElementById('role-edit-msg').style.display = 'none';
  roleRenderPermGroups([]);
  showModal('modal-role-edit');
}

/** 打开编辑弹窗 */
async function roleOpenEdit(id) {
  await rolesEnsureMeta();
  const d = await apiRequest('GET', '/api/roles');
  if (!d || d.code !== 0) return;
  const role = d.data.find(r => r.id === id);
  if (!role) return;

  document.getElementById('role-edit-id').value    = role.id;
  document.getElementById('role-edit-name').value  = role.name;
  document.getElementById('role-edit-desc').value  = role.desc || '';
  document.getElementById('role-modal-title').textContent = `配置权限 · ${role.name}`;
  document.getElementById('role-edit-msg').style.display = 'none';

  // 内置角色权限输入框禁用
  const nameInput = document.getElementById('role-edit-name');
  nameInput.disabled = !!role.builtin;
  nameInput.style.opacity = role.builtin ? '.6' : '1';

  roleRenderPermGroups(role.permissions || [], role.builtin);
  showModal('modal-role-edit');
}

/** 渲染权限分组勾选 */
function roleRenderPermGroups(checked, readonly) {
  // 按分组聚合
  const groups = {};
  _permsMeta.forEach(p => {
    if (!groups[p.group]) groups[p.group] = [];
    groups[p.group].push(p);
  });

  const html = Object.entries(groups).map(([groupName, perms]) => {
    const allChecked = perms.every(p => checked.includes(p.key));
    const items = perms.map(p => {
      const isChecked = checked.includes(p.key);
      const dis = readonly ? 'disabled' : '';
      return `
        <label style="display:flex;align-items:center;gap:6px;cursor:${readonly?'default':'pointer'};font-size:13px;color:var(--text-2);padding:4px 0;">
          <input type="checkbox" name="role-perm" value="${p.key}" ${isChecked?'checked':''} ${dis}
            style="width:15px;height:15px;accent-color:#6366f1;cursor:${readonly?'default':'pointer'};"
            onchange="roleGroupSyncCheck(this)">
          ${p.label}
        </label>`;
    }).join('');

    return `
      <div style="background:rgba(99,102,241,.04);border-radius:12px;padding:12px 16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <label style="font-size:13px;font-weight:600;color:var(--text);display:flex;align-items:center;gap:6px;cursor:${readonly?'default':'pointer'};">
            <input type="checkbox" class="group-check" data-group="${groupName}"
              ${allChecked?'checked':''} ${readonly?'disabled':''}
              style="width:15px;height:15px;accent-color:#6366f1;"
              onchange="roleToggleGroup(this,'${groupName}')">
            ${groupName}
          </label>
          <span style="font-size:11px;color:var(--text-3);">${perms.length} 项</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:2px;">
          ${items}
        </div>
      </div>`;
  }).join('');

  document.getElementById('role-perm-groups').innerHTML = html;
}

/** 分组全选/取消 */
function roleToggleGroup(el, groupName) {
  const checked = el.checked;
  document.querySelectorAll('input[name="role-perm"]').forEach(cb => {
    const meta = _permsMeta.find(p => p.key === cb.value);
    if (meta && meta.group === groupName) cb.checked = checked;
  });
}

/** 单项勾选同步分组 checkbox */
function roleGroupSyncCheck(el) {
  const meta = _permsMeta.find(p => p.key === el.value);
  if (!meta) return;
  const groupPerms = _permsMeta.filter(p => p.group === meta.group);
  const allChecked = groupPerms.every(p => {
    const cb = document.querySelector(`input[name="role-perm"][value="${p.key}"]`);
    return cb && cb.checked;
  });
  const groupEl = document.querySelector(`.group-check[data-group="${meta.group}"]`);
  if (groupEl) groupEl.checked = allChecked;
}

/** 全选 / 全不选 */
function roleCheckAll(state) {
  document.querySelectorAll('input[name="role-perm"]:not([disabled])').forEach(cb => cb.checked = state);
  document.querySelectorAll('.group-check:not([disabled])').forEach(cb => cb.checked = state);
}

/** 保存角色 */
async function roleSave() {
  const id   = document.getElementById('role-edit-id').value;
  const name = document.getElementById('role-edit-name').value.trim();
  const desc = document.getElementById('role-edit-desc').value.trim();
  const permissions = [...document.querySelectorAll('input[name="role-perm"]:checked')].map(cb => cb.value);

  const msgEl = document.getElementById('role-edit-msg');
  const showMsg = (msg, ok) => {
    msgEl.textContent = msg;
    msgEl.style.display = 'block';
    msgEl.style.background = ok ? 'rgba(16,185,129,.1)' : 'rgba(244,63,94,.09)';
    msgEl.style.color = ok ? '#059669' : '#e11d48';
  };

  if (!name) return showMsg('角色名不能为空', false);

  let data;
  if (id) {
    data = await apiRequest('PUT', `/api/roles/${id}`, { name, desc, permissions });
  } else {
    data = await apiRequest('POST', '/api/roles', { name, desc, permissions });
  }
  if (!data) return;

  if (data.code === 0) {
    showMsg('✅ ' + (data.msg || '保存成功'), true);
    showToast(data.msg || '保存成功', 'success');
    setTimeout(() => { hideModal('modal-role-edit'); roleLoadList(); }, 700);
  } else {
    showMsg('❌ ' + (data.msg || '保存失败'), false);
  }
}

/** 删除角色 */
async function roleDelete(id, name) {
  if (!confirm(`确认删除角色「${name}」？\n此操作不可恢复。`)) return;
  const d = await apiRequest('DELETE', `/api/roles/${id}`);
  if (!d) return;
  if (d.code === 0) {
    showToast('角色已删除', 'success');
    roleLoadList();
  } else {
    showToast(d.msg || '删除失败', 'error');
  }
}

/* ═══════════════════════════════════════════════════════════════
   权限管理模块
   ═══════════════════════════════════════════════════════════════ */

/** 加载并渲染权限节点列表（按分组展示） */
async function permLoadList() {
  // 复用角色管理的元数据加载
  await rolesEnsureMeta();

  const container = document.getElementById('perm-group-list');
  const kpiGrid   = document.getElementById('perm-kpi-grid');
  if (!container) return;

  if (!_permsMeta || !_permsMeta.length) {
    container.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-3);">暂无权限数据</div>`;
    return;
  }

  // 按分组聚合
  const groups = {};
  _permsMeta.forEach(p => {
    if (!groups[p.group]) groups[p.group] = [];
    groups[p.group].push(p);
  });

  const groupNames  = Object.keys(groups);
  const totalPerms  = _permsMeta.length;

  // 渲染 KPI 统计
  const groupColors = ['#6366f1','#06b6d4','#10b981','#f59e0b','#8b5cf6','#f43f5e','#3b82f6','#64748b','#0ea5e9'];
  if (kpiGrid) {
    const kpiItems = [
      { label: '权限总数', val: totalPerms, color: '#6366f1' },
      { label: '模块分组', val: groupNames.length, color: '#06b6d4' },
    ].concat(groupNames.map((g, i) => ({
      label: g,
      val: groups[g].length + ' 项',
      color: groupColors[(i + 2) % groupColors.length],
    })));

    kpiGrid.innerHTML = kpiItems.map(item => `
      <div class="glass-card" style="padding:16px 20px;display:flex;flex-direction:column;gap:4px;">
        <div style="font-size:22px;font-weight:800;color:${item.color};">${item.val}</div>
        <div style="font-size:12px;color:var(--text-3);">${item.label}</div>
      </div>`).join('');
  }

  // 渲染分组卡片
  container.innerHTML = groupNames.map((groupName, gi) => {
    const perms = groups[groupName];
    const color = groupColors[gi % groupColors.length];
    const rows = perms.map(p => `
      <tr>
        <td style="font-weight:600;color:var(--text);">${p.label}</td>
        <td><code style="background:rgba(99,102,241,.08);color:#6366f1;padding:2px 8px;border-radius:6px;font-size:12px;">${p.key}</code></td>
        <td><span class="badge badge-ghost">${groupName}</span></td>
      </tr>`).join('');

    return `
      <div class="glass-card" style="overflow:hidden;">
        <div style="padding:14px 20px 10px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border-2);">
          <div style="width:8px;height:24px;border-radius:4px;background:${color};flex-shrink:0;"></div>
          <span style="font-size:14px;font-weight:700;color:var(--text);">${groupName}</span>
          <span style="font-size:12px;color:var(--text-3);margin-left:4px;">${perms.length} 项权限</span>
        </div>
        <table class="data-table">
          <thead><tr><th>权限名称</th><th>权限码</th><th>所属模块</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════════════
   管理员账号管理模块
   ═══════════════════════════════════════════════════════════════ */

/** 状态缓存 */
const _sysAcc = { list: [], filtered: [] };

/** 角色配置：显示名 + 颜色 */
const SYS_ROLE_MAP = {
  admin:    { label: '超级管理员', badge: 'badge-danger'  },
  operator: { label: '运营',       badge: 'badge-indigo'  },
  finance:  { label: '财务',       badge: 'badge-amber'   },
  support:  { label: '客服',       badge: 'badge-cyan'    },
};

/** 加载管理员列表 */
async function sysAccLoadList() {
  const d = await apiRequest('GET', '/api/sys-users');
  if (!d) return;
  _sysAcc.list = d.data || [];
  sysAccSearch();
  sysAccRenderKPI();
}

/** KPI 统计 */
function sysAccRenderKPI() {
  const grid = document.getElementById('sysacc-kpi-grid');
  if (!grid) return;
  const total    = _sysAcc.list.length;
  const normal   = _sysAcc.list.filter(u => u.status === 1).length;
  const disabled = _sysAcc.list.filter(u => u.status === 0).length;
  const admins   = _sysAcc.list.filter(u => u.role === 'admin').length;
  const items = [
    { label: '管理员总数', val: total,    color: '#6366f1' },
    { label: '正常账号',   val: normal,   color: '#10b981' },
    { label: '已禁用',     val: disabled, color: '#f43f5e' },
    { label: '超级管理员', val: admins,   color: '#8b5cf6' },
  ];
  grid.innerHTML = items.map(item => `
    <div class="glass-card" style="padding:16px 20px;display:flex;flex-direction:column;gap:4px;">
      <div style="font-size:26px;font-weight:800;color:${item.color};">${item.val}</div>
      <div style="font-size:12px;color:var(--text-3);">${item.label}</div>
    </div>`).join('');
}

/** 搜索 / 过滤 */
function sysAccSearch() {
  const kw   = (document.getElementById('sysacc-keyword')?.value || '').trim().toLowerCase();
  const role = document.getElementById('sysacc-role-filter')?.value || '';
  _sysAcc.filtered = _sysAcc.list.filter(u => {
    if (role && u.role !== role) return false;
    if (kw && !(
      (u.username || '').toLowerCase().includes(kw) ||
      (u.nickname || '').toLowerCase().includes(kw) ||
      (u.email    || '').toLowerCase().includes(kw)
    )) return false;
    return true;
  });
  sysAccRenderTable();
}

/** 重置搜索 */
function sysAccReset() {
  document.getElementById('sysacc-keyword').value = '';
  document.getElementById('sysacc-role-filter').value = '';
  sysAccSearch();
}

/** 渲染表格 */
function sysAccRenderTable() {
  const tbody = document.getElementById('sysacc-tbody');
  const total = document.getElementById('sysacc-total');
  if (!tbody) return;
  if (total) total.textContent = `共 ${_sysAcc.filtered.length} 条记录`;

  if (!_sysAcc.filtered.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-3);">暂无数据</td></tr>`;
    return;
  }

  tbody.innerHTML = _sysAcc.filtered.map(u => {
    const roleMeta  = SYS_ROLE_MAP[u.role] || { label: u.role, badge: 'badge-ghost' };
    const statusBadge = u.status === 1
      ? `<span class="badge badge-success">正常</span>`
      : `<span class="badge badge-danger">禁用</span>`;
    const lastLogin = u.last_login || '从未登录';

    // 当前登录用户不显示删除按钮
    const meTag = _currentUser && _currentUser.id === u.id
      ? `<span class="badge badge-ghost" style="font-size:10.5px;margin-left:4px;">本人</span>` : '';

    const delBtn = (_currentUser && _currentUser.id !== u.id)
      ? `<button class="btn-link text-danger" onclick="sysAccDelete(${u.id},'${escHtml(u.username)}')">删除</button>`
      : '';

    return `<tr>
      <td class="mono">${u.id}</td>
      <td style="font-weight:600;">${escHtml(u.username)}${meTag}</td>
      <td>${escHtml(u.nickname || '—')}</td>
      <td><span class="badge ${roleMeta.badge}">${roleMeta.label}</span></td>
      <td style="color:var(--text-3);font-size:12.5px;">${escHtml(u.email || '—')}</td>
      <td style="color:var(--text-3);font-size:12.5px;">${escHtml(u.phone || '—')}</td>
      <td>${statusBadge}</td>
      <td style="font-size:12.5px;color:var(--text-3);">${lastLogin}</td>
      <td>
        <button class="btn-link" onclick="sysAccOpenEdit(${u.id})">编辑</button>
        ${u.status === 1
          ? `<button class="btn-link text-warning" onclick="sysAccToggleStatus(${u.id},0,'${escHtml(u.username)}')">禁用</button>`
          : `<button class="btn-link text-success" onclick="sysAccToggleStatus(${u.id},1,'${escHtml(u.username)}')">启用</button>`}
        ${delBtn}
      </td>
    </tr>`;
  }).join('');
}

/** 打开新增弹窗 */
function sysAccOpenAdd() {
  document.getElementById('sysacc-modal-title').textContent = '新增管理员';
  document.getElementById('sysacc-edit-id').value = '';
  document.getElementById('sysacc-edit-username').value = '';
  document.getElementById('sysacc-edit-nickname').value  = '';
  document.getElementById('sysacc-edit-password').value  = '';
  document.getElementById('sysacc-edit-email').value     = '';
  document.getElementById('sysacc-edit-phone').value     = '';
  document.getElementById('sysacc-edit-role').value      = 'operator';
  document.getElementById('sysacc-edit-status').value    = '1';
  sysAccHideMsg();
  showModal('modal-sysacc-edit');
}

/** 打开编辑弹窗 */
function sysAccOpenEdit(id) {
  const u = _sysAcc.list.find(x => x.id === id);
  if (!u) return;
  document.getElementById('sysacc-modal-title').textContent = `编辑管理员 · ${u.username}`;
  document.getElementById('sysacc-edit-id').value       = u.id;
  document.getElementById('sysacc-edit-username').value = u.username || '';
  document.getElementById('sysacc-edit-nickname').value = u.nickname || '';
  document.getElementById('sysacc-edit-password').value = '';
  document.getElementById('sysacc-edit-email').value    = u.email || '';
  document.getElementById('sysacc-edit-phone').value    = u.phone || '';
  document.getElementById('sysacc-edit-role').value     = u.role || 'operator';
  document.getElementById('sysacc-edit-status').value   = String(u.status ?? 1);
  sysAccHideMsg();
  showModal('modal-sysacc-edit');
}

/** 保存（新增 or 编辑） */
async function sysAccSave() {
  const id       = document.getElementById('sysacc-edit-id').value;
  const username = document.getElementById('sysacc-edit-username').value.trim();
  const nickname = document.getElementById('sysacc-edit-nickname').value.trim();
  const password = document.getElementById('sysacc-edit-password').value;
  const email    = document.getElementById('sysacc-edit-email').value.trim();
  const phone    = document.getElementById('sysacc-edit-phone').value.trim();
  const role     = document.getElementById('sysacc-edit-role').value;
  const status   = parseInt(document.getElementById('sysacc-edit-status').value);

  if (!username) return sysAccShowMsg('登录账号不能为空', 'error');
  if (!id && (!password || password.length < 6)) return sysAccShowMsg('新增时密码不能少于6位', 'error');

  const body = { username, nickname, email, phone, role, status };
  if (password) body.password = password;

  let d;
  if (id) {
    d = await apiRequest('PUT', `/api/sys-users/${id}`, body);
  } else {
    d = await apiRequest('POST', '/api/sys-users', body);
  }
  if (!d) return;
  if (d.code !== 0) return sysAccShowMsg(d.msg || '操作失败', 'error');

  showToast(id ? '管理员信息已更新' : '管理员已创建', 'success');
  hideModal('modal-sysacc-edit');
  sysAccLoadList();
}

/** 启用 / 禁用 */
async function sysAccToggleStatus(id, newStatus, username) {
  const action = newStatus === 0 ? '禁用' : '启用';
  if (!confirm(`确认${action}管理员「${username}」？`)) return;
  const d = await apiRequest('PUT', `/api/sys-users/${id}`, { status: newStatus });
  if (!d) return;
  if (d.code !== 0) return showToast(d.msg || '操作失败', 'error');
  showToast(`账号已${action}`, 'success');
  sysAccLoadList();
}

/** 删除管理员 */
async function sysAccDelete(id, username) {
  if (!confirm(`确认删除管理员「${username}」？\n此操作不可恢复。`)) return;
  const d = await apiRequest('DELETE', `/api/sys-users/${id}`);
  if (!d) return;
  if (d.code !== 0) return showToast(d.msg || '删除失败', 'error');
  showToast('管理员已删除', 'success');
  sysAccLoadList();
}

/** 弹窗消息 */
function sysAccShowMsg(msg, type) {
  const el = document.getElementById('sysacc-edit-msg');
  if (!el) return;
  el.style.display = 'block';
  el.style.background = type === 'error' ? 'rgba(244,63,94,.1)' : 'rgba(16,185,129,.1)';
  el.style.color      = type === 'error' ? '#e11d48' : '#059669';
  el.textContent = msg;
}
function sysAccHideMsg() {
  const el = document.getElementById('sysacc-edit-msg');
  if (el) el.style.display = 'none';
}

/* ═══════════════════════════════════════════════════════════════
   充值申请模块
   ═══════════════════════════════════════════════════════════════ */
const _rcApply = { list: [], filtered: [], statusFilter: '' };

async function rcApplyLoadList() {
  const kw = (document.getElementById('rc-keyword')?.value || '').trim();
  const d  = await apiRequest('GET', '/api/recharge-applies' + (kw ? '?keyword=' + encodeURIComponent(kw) : ''));
  if (!d) return;
  const data = d.data || {};
  _rcApply.list = data.items || [];
  // 更新统计数
  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setText('rc-stat-all',      data.total    || 0);
  setText('rc-stat-pending',  data.pending  || 0);
  setText('rc-stat-approved', data.approved || 0);
  setText('rc-stat-rejected', data.rejected || 0);
  // 更新侧边栏徽标
  const navBadge = document.getElementById('nav-rc-pending');
  if (navBadge) {
    navBadge.textContent = data.pending || 0;
    navBadge.style.display = (data.pending || 0) > 0 ? '' : 'none';
  }
  rcApplyFilter(null, _rcApply.statusFilter);
}

function rcApplyFilter(el, status) {
  _rcApply.statusFilter = status;
  if (el) {
    document.querySelectorAll('#page-recharge-apply .ostat-item').forEach(e => e.classList.remove('active'));
    el.classList.add('active');
  }
  const kw = (document.getElementById('rc-keyword')?.value || '').trim().toLowerCase();
  _rcApply.filtered = _rcApply.list.filter(r => {
    if (status && r.status !== status) return false;
    if (kw && !(r.sn.toLowerCase().includes(kw) || (r.agent_name||'').toLowerCase().includes(kw))) return false;
    return true;
  });
  rcApplyRenderTable();
}

function rcApplySearch() {
  rcApplyLoadList();
}

function rcApplyReset() {
  document.getElementById('rc-keyword').value = '';
  _rcApply.statusFilter = '';
  document.querySelectorAll('#page-recharge-apply .ostat-item').forEach((e, i) => {
    e.classList.toggle('active', i === 0);
  });
  rcApplyLoadList();
}

function rcApplyRenderTable() {
  const tbody = document.getElementById('rc-tbody');
  const total = document.getElementById('rc-total');
  if (!tbody) return;
  if (total) total.textContent = '共 ' + _rcApply.filtered.length + ' 条';
  if (!_rcApply.filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-3);">暂无数据</td></tr>`;
    return;
  }
  const statusMap = { pending: ['待审核','badge-warning'], approved: ['已通过','badge-success'], rejected: ['已拒绝','badge-danger'] };
  tbody.innerHTML = _rcApply.filtered.map(r => {
    const [sLabel, sBadge] = statusMap[r.status] || [r.status, 'badge-ghost'];
    const voucherBtn = r.voucher
      ? `<button class="btn-link text-indigo" onclick="voucherView(${r.id},'${escHtml(r.voucher)}')">👁 查看</button>`
      : `<button class="btn-link text-warning" onclick="voucherUpload(${r.id})">📎 上传</button>`;
    let actionBtns = '';
    if (r.status === 'pending') {
      actionBtns = `<button class="btn btn-success btn-sm" onclick="rcApplyReview(${r.id},'approve')">通过</button>
                    <button class="btn btn-danger btn-sm" onclick="rcApplyReview(${r.id},'reject')">拒绝</button>`;
    } else {
      actionBtns = `<span style="color:var(--text-3);font-size:12.5px;">${r.reviewed_at || '—'}</span>`;
    }
    return `<tr>
      <td class="mono" style="font-size:12.5px;">${escHtml(r.sn)}</td>
      <td>${escHtml(r.agent_name)}</td>
      <td class="num">¥${Number(r.amount).toLocaleString()}</td>
      <td style="font-size:12.5px;">${escHtml(r.pay_type)}</td>
      <td>${voucherBtn}</td>
      <td style="font-size:12.5px;color:var(--text-3);">${r.created_at}</td>
      <td><span class="badge ${sBadge}">${sLabel}</span></td>
      <td style="display:flex;gap:6px;align-items:center;">${actionBtns}</td>
    </tr>`;
  }).join('');
}

// 打开新建充值申请弹窗
async function rcApplyOpenAdd() {
  // 加载代理列表
  const d = await apiRequest('GET', '/api/agents');
  const sel = document.getElementById('rc-add-agent');
  if (sel && d) {
    sel.innerHTML = '<option value="">— 选择代理 —</option>' +
      (d.data || []).map(a => `<option value="${a.id}" data-name="${escHtml(a.name)}">${escHtml(a.name)}</option>`).join('');
  }
  // 重置表单
  ['rc-add-amount','rc-add-remark'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  document.getElementById('rc-add-paytype').value = '微信支付';
  rcAddVoucherClear();
  document.getElementById('rc-add-msg').style.display = 'none';
  showModal('modal-rc-add');
}

// 凭证预览
function rcAddVoucherPreview(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('rc-add-voucher-hint').style.display = 'none';
    const img = document.getElementById('rc-add-voucher-img');
