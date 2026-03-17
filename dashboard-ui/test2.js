    img.src = e.target.result;
    img.style.display = 'block';
    document.getElementById('rc-add-voucher-clear').style.display = '';
  };
  reader.readAsDataURL(file);
}
function rcAddVoucherClear() {
  document.getElementById('rc-add-voucher-input').value = '';
  document.getElementById('rc-add-voucher-img').src = '';
  document.getElementById('rc-add-voucher-img').style.display = 'none';
  document.getElementById('rc-add-voucher-hint').style.display = '';
  document.getElementById('rc-add-voucher-clear').style.display = 'none';
}
function rcAddVoucherDrop(e) {
  e.preventDefault();
  e.currentTarget.style.borderColor = 'rgba(99,102,241,.3)';
  const file = e.dataTransfer.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  const dt = new DataTransfer();
  dt.items.add(file);
  const input = document.getElementById('rc-add-voucher-input');
  input.files = dt.files;
  rcAddVoucherPreview(input);
}

// 提交充值申请
async function rcApplySave() {
  const agentSel = document.getElementById('rc-add-agent');
  const agent_id = agentSel.value;
  const agent_name = agentSel.options[agentSel.selectedIndex]?.dataset.name || '';
  const amount   = document.getElementById('rc-add-amount').value;
  const pay_type = document.getElementById('rc-add-paytype').value;
  const remark   = document.getElementById('rc-add-remark').value;
  const imgSrc   = document.getElementById('rc-add-voucher-img').src;
  const voucher  = imgSrc && imgSrc.startsWith('data:') ? imgSrc : '';

  if (!agent_id) return rcApplyShowMsg('rc-add-msg', '请选择代理', 'error');
  if (!amount || parseFloat(amount) <= 0) return rcApplyShowMsg('rc-add-msg', '请输入有效金额', 'error');

  const body = { agent_id, agent_name, amount: parseFloat(amount), pay_type, remark, voucher };
  const d = await apiRequest('POST', '/api/recharge-applies', body);
  if (!d) return;
  if (d.code !== 0) return rcApplyShowMsg('rc-add-msg', d.msg || '提交失败', 'error');
  showToast('充值申请已提交', 'success');
  hideModal('modal-rc-add');
  rcApplyLoadList();
}

// 审核弹窗
function rcApplyReview(id, action) {
  const r = _rcApply.list.find(x => x.id === id);
  if (!r) return;
  document.getElementById('rc-review-id').value = id;
  document.getElementById('rc-review-action').value = action;
  document.getElementById('rc-review-title').textContent = action === 'approve' ? '✅ 通过充值申请' : '❌ 拒绝充值申请';
  document.getElementById('rc-review-info').innerHTML = `
    <div style="display:grid;grid-template-columns:auto 1fr;gap:6px 16px;font-size:13px;">
      <span style="color:var(--text-3);">代理：</span><span>${escHtml(r.agent_name)}</span>
      <span style="color:var(--text-3);">金额：</span><span style="font-weight:700;color:#6366f1;">¥${Number(r.amount).toLocaleString()}</span>
      <span style="color:var(--text-3);">方式：</span><span>${escHtml(r.pay_type)}</span>
    </div>`;
  const btn = document.getElementById('rc-review-confirm-btn');
  if (btn) {
    btn.className = 'btn ' + (action === 'approve' ? 'btn-success' : 'btn-danger');
    btn.textContent = action === 'approve' ? '✅ 确认通过' : '❌ 确认拒绝';
  }
  document.getElementById('rc-review-note').value = '';
  showModal('modal-rc-review');
}

async function rcApplyReviewConfirm() {
  const id     = parseInt(document.getElementById('rc-review-id').value);
  const action = document.getElementById('rc-review-action').value;
  const note   = document.getElementById('rc-review-note').value;
  const d = await apiRequest('PUT', `/api/recharge-applies/${id}/review`, { action, note });
  if (!d) return;
  if (d.code !== 0) return showToast(d.msg || '操作失败', 'error');
  showToast(d.msg || '操作成功', 'success');
  hideModal('modal-rc-review');
  rcApplyLoadList();
}

// 凭证查看
let _voucherCurrentId = null;
function voucherView(id, voucherData) {
  _voucherCurrentId = id;
  const container = document.getElementById('voucher-view-content');
  if (!container) return;
  if (voucherData && voucherData.startsWith('data:image')) {
    container.innerHTML = `<img src="${voucherData}" alt="凭证" style="max-width:100%;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1);">`;
  } else if (voucherData) {
    container.innerHTML = `<div style="padding:20px;color:var(--text-3);">凭证格式不支持预览<br><small>${escHtml(voucherData.slice(0,60))}</small></div>`;
  } else {
    container.innerHTML = `<div style="padding:40px;color:var(--text-3);">暂无凭证</div>`;
  }
  document.getElementById('voucher-reupload-input').value = '';
  showModal('modal-voucher-view');
}

function voucherUpload(id) {
  _voucherCurrentId = id;
  document.getElementById('voucher-view-content').innerHTML = `<div style="padding:20px;color:var(--text-3);">请在下方选择图片上传凭证</div>`;
  document.getElementById('voucher-reupload-input').value = '';
  showModal('modal-voucher-view');
}

async function voucherReupload(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    const voucher = e.target.result;
    document.getElementById('voucher-view-content').innerHTML =
      `<img src="${voucher}" alt="凭证预览" style="max-width:100%;border-radius:12px;">`;
    if (!_voucherCurrentId) return;
    const d = await apiRequest('PUT', `/api/recharge-applies/${_voucherCurrentId}/voucher`, { voucher });
    if (!d) return;
    if (d.code !== 0) return showToast(d.msg || '上传失败', 'error');
    showToast('凭证已上传', 'success');
    rcApplyLoadList();
    // 更新列表中的凭证
    const item = _rcApply.list.find(r => r.id === _voucherCurrentId);
    if (item) item.voucher = voucher;
  };
  reader.readAsDataURL(file);
}

function rcApplyShowMsg(elId, msg, type) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.style.display = 'block';
  el.style.background = type === 'error' ? 'rgba(244,63,94,.1)' : 'rgba(16,185,129,.1)';
  el.style.color      = type === 'error' ? '#e11d48' : '#059669';
  el.textContent = msg;
}

/* ═══════════════════════════════════════════════════════════════
   提现申请模块
   ═══════════════════════════════════════════════════════════════ */
const _wdApply = { list: [], filtered: [], statusFilter: '' };

async function wdApplyLoadList() {
  const kw = (document.getElementById('wd-keyword')?.value || '').trim();
  const d  = await apiRequest('GET', '/api/withdraw-applies' + (kw ? '?keyword=' + encodeURIComponent(kw) : ''));
  if (!d) return;
  const data = d.data || {};
  _wdApply.list = data.items || [];
  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setText('wd-stat-all',      data.total    || 0);
  setText('wd-stat-pending',  data.pending  || 0);
  setText('wd-stat-approved', data.approved || 0);
  setText('wd-stat-rejected', data.rejected || 0);
  wdApplyFilter(null, _wdApply.statusFilter);
}

function wdApplyFilter(el, status) {
  _wdApply.statusFilter = status;
  if (el) {
    document.querySelectorAll('#page-withdraw-apply .ostat-item').forEach(e => e.classList.remove('active'));
    el.classList.add('active');
  }
  const kw = (document.getElementById('wd-keyword')?.value || '').trim().toLowerCase();
  _wdApply.filtered = _wdApply.list.filter(r => {
    if (status && r.status !== status) return false;
    if (kw && !(r.sn.toLowerCase().includes(kw) || (r.agent_name||'').toLowerCase().includes(kw))) return false;
    return true;
  });
  wdApplyRenderTable();
}

function wdApplySearch() { wdApplyLoadList(); }
function wdApplyReset() {
  document.getElementById('wd-keyword').value = '';
  _wdApply.statusFilter = '';
  document.querySelectorAll('#page-withdraw-apply .ostat-item').forEach((e, i) => e.classList.toggle('active', i === 0));
  wdApplyLoadList();
}

function wdApplyRenderTable() {
  const tbody = document.getElementById('wd-tbody');
  const total = document.getElementById('wd-total');
  if (!tbody) return;
  if (total) total.textContent = '共 ' + _wdApply.filtered.length + ' 条';
  if (!_wdApply.filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-3);">暂无数据</td></tr>`;
    return;
  }
  const statusMap = { pending: ['待处理','badge-warning'], approved: ['已打款','badge-success'], rejected: ['已拒绝','badge-danger'] };
  const typeIcon = { 支付宝:'🔵', 微信:'🟢', 银行卡:'🏦' };
  tbody.innerHTML = _wdApply.filtered.map(r => {
    const [sLabel, sBadge] = statusMap[r.status] || [r.status, 'badge-ghost'];
    // 收款账号中间隐藏
    const maskedAccount = maskAccount(r.account);
    const accountCell = `
      <div style="display:flex;align-items:center;gap:6px;">
        <span id="wd-acc-${r.id}" style="font-family:monospace;font-size:12.5px;">${maskedAccount.masked}</span>
        <button onclick="wdToggleAccount(${r.id},'${escHtml(r.account)}')" title="显示/隐藏" style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--text-3);">👁</button>
        <button onclick="wdCopyAccount('${escHtml(r.account)}')" title="复制账号" style="background:none;border:none;cursor:pointer;font-size:13px;color:var(--text-3);">📋</button>
      </div>
      <div style="font-size:11.5px;color:var(--text-3);">${escHtml(r.account_name||'')} ${typeIcon[r.pay_type]||''} ${escHtml(r.pay_type)}</div>`;
    let actionBtns = '';
    if (r.status === 'pending') {
      actionBtns = `<button class="btn btn-success btn-sm" onclick="wdApplyHandle(${r.id},'approve')">打款</button>
                    <button class="btn btn-danger btn-sm" onclick="wdApplyHandle(${r.id},'reject')">拒绝</button>`;
    } else {
      actionBtns = `<span style="color:var(--text-3);font-size:12.5px;">${r.handled_at || '—'}</span>`;
    }
    return `<tr>
      <td class="mono" style="font-size:12.5px;">${escHtml(r.sn)}</td>
      <td>${escHtml(r.agent_name)}</td>
      <td class="num">¥${Number(r.amount).toLocaleString()}</td>
      <td style="font-size:12.5px;">${typeIcon[r.pay_type]||''} ${escHtml(r.pay_type)}</td>
      <td>${accountCell}</td>
      <td style="font-size:12.5px;color:var(--text-3);">${r.created_at}</td>
      <td><span class="badge ${sBadge}">${sLabel}</span></td>
      <td style="display:flex;gap:6px;align-items:center;">${actionBtns}</td>
    </tr>`;
  }).join('');
}

/** 账号打码工具 */
function maskAccount(account) {
  if (!account) return { masked: '—', full: '' };
  const s = String(account);
  if (s.length <= 6) return { masked: s, full: s };
  const show = Math.ceil(s.length / 4);
  const masked = s.slice(0, show) + '****' + s.slice(-show);
  return { masked, full: s };
}

const _wdAccShown = new Set();
function wdToggleAccount(id, full) {
  const el = document.getElementById('wd-acc-' + id);
  if (!el) return;
  if (_wdAccShown.has(id)) {
    el.textContent = maskAccount(full).masked;
    _wdAccShown.delete(id);
  } else {
    el.textContent = full;
    _wdAccShown.add(id);
  }
}
function wdCopyAccount(account) {
  navigator.clipboard.writeText(account).then(() => showToast('账号已复制', 'success')).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = account; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    showToast('账号已复制', 'success');
  });
}

async function wdApplyOpenAdd() {
  const d = await apiRequest('GET', '/api/agents');
  const sel = document.getElementById('wd-add-agent');
  if (sel && d) {
    sel.innerHTML = '<option value="">— 选择代理 —</option>' +
      (d.data || []).map(a => `<option value="${a.id}" data-name="${escHtml(a.name)}" data-balance="${a.balance}">${escHtml(a.name)}（余额:¥${Number(a.balance).toLocaleString()}）</option>`).join('');
  }
  ['wd-add-amount','wd-add-account','wd-add-accname','wd-add-remark'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  document.getElementById('wd-add-paytype').value = '支付宝';
  document.getElementById('wd-add-msg').style.display = 'none';
  showModal('modal-wd-add');
}

async function wdApplySave() {
  const agentSel   = document.getElementById('wd-add-agent');
  const agent_id   = agentSel.value;
  const agent_name = agentSel.options[agentSel.selectedIndex]?.dataset.name || '';
  const amount     = document.getElementById('wd-add-amount').value;
  const pay_type   = document.getElementById('wd-add-paytype').value;
  const account    = document.getElementById('wd-add-account').value.trim();
  const account_name = document.getElementById('wd-add-accname').value.trim();
  const remark     = document.getElementById('wd-add-remark').value;

  if (!agent_id)  return rcApplyShowMsg('wd-add-msg', '请选择代理', 'error');
  if (!amount || parseFloat(amount) <= 0) return rcApplyShowMsg('wd-add-msg', '请输入有效金额', 'error');
  if (!account)   return rcApplyShowMsg('wd-add-msg', '请输入收款账号', 'error');

  const d = await apiRequest('POST', '/api/withdraw-applies', { agent_id, agent_name, amount: parseFloat(amount), pay_type, account, account_name, remark });
  if (!d) return;
  if (d.code !== 0) return rcApplyShowMsg('wd-add-msg', d.msg || '提交失败', 'error');
  showToast('提现申请已提交', 'success');
  hideModal('modal-wd-add');
  wdApplyLoadList();
}

function wdApplyHandle(id, action) {
  const r = _wdApply.list.find(x => x.id === id);
  if (!r) return;
  document.getElementById('wd-handle-id').value = id;
  document.getElementById('wd-handle-action').value = action;
  document.getElementById('wd-handle-title').textContent = action === 'approve' ? '💸 确认打款' : '❌ 拒绝提现';
  document.getElementById('wd-handle-info').innerHTML = `
    <div style="display:grid;grid-template-columns:auto 1fr;gap:6px 16px;font-size:13px;">
      <span style="color:var(--text-3);">代理：</span><span>${escHtml(r.agent_name)}</span>
      <span style="color:var(--text-3);">金额：</span><span style="font-weight:700;color:#6366f1;">¥${Number(r.amount).toLocaleString()}</span>
      <span style="color:var(--text-3);">账号：</span><span style="font-family:monospace;">${escHtml(r.account)}</span>
      <span style="color:var(--text-3);">姓名：</span><span>${escHtml(r.account_name||'—')}</span>
    </div>`;
  const btn = document.getElementById('wd-handle-confirm-btn');
  if (btn) { btn.className = 'btn ' + (action === 'approve' ? 'btn-success' : 'btn-danger'); btn.textContent = action === 'approve' ? '💸 确认打款' : '❌ 确认拒绝'; }
  document.getElementById('wd-handle-note').value = '';
  showModal('modal-wd-handle');
}

async function wdApplyHandleConfirm() {
  const id     = parseInt(document.getElementById('wd-handle-id').value);
  const action = document.getElementById('wd-handle-action').value;
  const note   = document.getElementById('wd-handle-note').value;
  const d = await apiRequest('PUT', `/api/withdraw-applies/${id}/handle`, { action, note });
  if (!d) return;
  if (d.code !== 0) return showToast(d.msg || '操作失败', 'error');
  showToast(d.msg || '操作成功', 'success');
  hideModal('modal-wd-handle');
  wdApplyLoadList();
}

/* ═══════════════════════════════════════════════════════════════
   收款方式模块
   ═══════════════════════════════════════════════════════════════ */
const _pm = { list: [] };
const PM_TYPE_MAP = {
  wechat:  { icon: '💚', label: '微信',   color: '#07c160', glow: 'rgba(7,193,96,.15)' },
  alipay:  { icon: '🔵', label: '支付宝', color: '#1677ff', glow: 'rgba(22,119,255,.15)' },
  bank:    { icon: '🏦', label: '银行卡', color: '#6366f1', glow: 'rgba(99,102,241,.15)' },
};

async function pmLoadList() {
  const d = await apiRequest('GET', '/api/payment-methods');
  if (!d) return;
  _pm.list = d.data || [];
  pmRenderCards();
}

function pmRenderCards() {
  const grid  = document.getElementById('pm-card-grid');
  const empty = document.getElementById('pm-empty');
  if (!grid) return;
  if (!_pm.list.length) {
    grid.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';
  grid.innerHTML = _pm.list.map(pm => {
    const meta = PM_TYPE_MAP[pm.type] || { icon: '💳', label: pm.name, color: '#6b7280', glow: 'rgba(107,114,128,.1)' };
    const masked = maskAccount(pm.account);
    const statusBadge = pm.status === 1
      ? `<span class="badge badge-success" style="font-size:11px;">启用</span>`
      : `<span class="badge badge-danger"  style="font-size:11px;">禁用</span>`;
    return `
    <div class="glass-card" style="position:relative;overflow:hidden;padding:20px 22px 18px;box-shadow:0 4px 24px ${meta.glow};">
      <!-- 背景装饰 -->
      <div style="position:absolute;width:80px;height:80px;border-radius:50%;background:${meta.glow};top:-20px;right:-20px;filter:blur(20px);pointer-events:none;"></div>
      <!-- 头部 -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,${meta.color},${meta.color}aa);display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 4px 16px ${meta.glow};">
          ${meta.icon}
        </div>
        <div>
          <div style="font-weight:700;font-size:15px;">${escHtml(pm.name || meta.label)}</div>
          <div style="font-size:12px;color:var(--text-3);">${escHtml(pm.account_name || '—')}</div>
        </div>
        <div style="margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
          ${statusBadge}
          ${pm.remark ? `<span style="font-size:11px;color:var(--text-3);">${escHtml(pm.remark)}</span>` : ''}
        </div>
      </div>
      <!-- 账号 -->
      <div style="background:rgba(99,102,241,.04);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:8px;">
        <span id="pm-acc-${pm.id}" style="font-family:monospace;font-size:13.5px;flex:1;letter-spacing:1px;">${masked.masked}</span>
        <button onclick="pmToggleAccount(${pm.id},'${escHtml(pm.account)}')" title="显示/隐藏账号"
          style="background:none;border:none;cursor:pointer;font-size:16px;color:var(--text-3);padding:2px 4px;">👁</button>
        <button onclick="pmCopyAccount('${escHtml(pm.account)}')" title="复制账号"
          style="background:none;border:none;cursor:pointer;font-size:14px;color:var(--text-3);padding:2px 4px;">📋</button>
      </div>
      ${pm.qrcode ? `<div style="margin-top:12px;text-align:center;"><img src="${pm.qrcode}" style="max-width:120px;max-height:120px;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.1);" alt="二维码"></div>` : ''}
      <!-- 操作 -->
      <div style="margin-top:14px;display:flex;gap:8px;">
        <button class="btn btn-ghost" style="flex:1;font-size:13px;" onclick="pmOpenEdit(${pm.id})">✏️ 编辑</button>
        <button class="btn btn-ghost" style="color:#e11d48;font-size:13px;" onclick="pmDelete(${pm.id},'${escHtml(pm.name || meta.label)}')">🗑 删除</button>
      </div>
    </div>`;
  }).join('');
}

const _pmAccShown = new Set();
function pmToggleAccount(id, full) {
  const el = document.getElementById('pm-acc-' + id);
  if (!el) return;
  if (_pmAccShown.has(id)) { el.textContent = maskAccount(full).masked; _pmAccShown.delete(id); }
  else { el.textContent = full; _pmAccShown.add(id); }
}
function pmCopyAccount(account) {
  navigator.clipboard.writeText(account).then(() => showToast('账号已复制', 'success')).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = account; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    showToast('账号已复制', 'success');
  });
}

function pmOpenAdd() {
  document.getElementById('pm-modal-title').textContent = '新增收款方式';
  document.getElementById('pm-edit-id').value = '';
  ['pm-edit-name','pm-edit-account','pm-edit-accname','pm-edit-remark'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  document.getElementById('pm-edit-type').value   = 'wechat';
  document.getElementById('pm-edit-sort').value   = '99';
  document.getElementById('pm-edit-status').value = '1';
  document.getElementById('pm-qr-hint').style.display = '';
  document.getElementById('pm-qr-img').style.display = 'none';
  document.getElementById('pm-qr-img').src = '';
  document.getElementById('pm-edit-msg').style.display = 'none';
  showModal('modal-pm-edit');
}

function pmOpenEdit(id) {
  const pm = _pm.list.find(x => x.id === id);
  if (!pm) return;
  document.getElementById('pm-modal-title').textContent = '编辑收款方式';
  document.getElementById('pm-edit-id').value       = pm.id;
  document.getElementById('pm-edit-type').value     = pm.type || 'wechat';
  document.getElementById('pm-edit-name').value     = pm.name || '';
  document.getElementById('pm-edit-account').value  = pm.account || '';
  document.getElementById('pm-edit-accname').value  = pm.account_name || '';
  document.getElementById('pm-edit-remark').value   = pm.remark || '';
  document.getElementById('pm-edit-sort').value     = pm.sort ?? 99;
  document.getElementById('pm-edit-status').value   = String(pm.status ?? 1);
  if (pm.qrcode) {
    document.getElementById('pm-qr-hint').style.display = 'none';
    const img = document.getElementById('pm-qr-img');
    img.src = pm.qrcode; img.style.display = 'block';
  } else {
    document.getElementById('pm-qr-hint').style.display = '';
    document.getElementById('pm-qr-img').style.display = 'none';
    document.getElementById('pm-qr-img').src = '';
  }
  document.getElementById('pm-edit-msg').style.display = 'none';
  showModal('modal-pm-edit');
}

function pmTypeChange(type) {
  const meta = PM_TYPE_MAP[type] || {};
  const nameEl = document.getElementById('pm-edit-name');
  if (nameEl && !nameEl.value) nameEl.value = meta.label || '';
}

function pmQrPreview(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('pm-qr-hint').style.display = 'none';
    const img = document.getElementById('pm-qr-img');
    img.src = e.target.result; img.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

async function pmSave() {
  const id       = document.getElementById('pm-edit-id').value;
  const type     = document.getElementById('pm-edit-type').value;
  const name     = document.getElementById('pm-edit-name').value.trim();
  const account  = document.getElementById('pm-edit-account').value.trim();
  const accname  = document.getElementById('pm-edit-accname').value.trim();
  const remark   = document.getElementById('pm-edit-remark').value.trim();
  const sort     = parseInt(document.getElementById('pm-edit-sort').value) || 99;
  const status   = parseInt(document.getElementById('pm-edit-status').value);
  const qrSrc    = document.getElementById('pm-qr-img').src;
  const qrcode   = qrSrc && qrSrc.startsWith('data:') ? qrSrc : (id ? undefined : '');

  if (!account) return rcApplyShowMsg('pm-edit-msg', '账号不能为空', 'error');
  const body = { type, name, account, account_name: accname, remark, sort, status };
  if (qrcode !== undefined) body.qrcode = qrcode;

  const d = id
    ? await apiRequest('PUT',  `/api/payment-methods/${id}`, body)
    : await apiRequest('POST', '/api/payment-methods',       body);
  if (!d) return;
  if (d.code !== 0) return rcApplyShowMsg('pm-edit-msg', d.msg || '保存失败', 'error');
  showToast(id ? '已更新' : '已添加', 'success');
  hideModal('modal-pm-edit');
  pmLoadList();
}

async function pmDelete(id, name) {
  if (!confirm(`确认删除收款方式「${name}」？`)) return;
  const d = await apiRequest('DELETE', `/api/payment-methods/${id}`);
  if (!d) return;
  if (d.code !== 0) return showToast(d.msg || '删除失败', 'error');
  showToast('已删除', 'success');
  pmLoadList();
}

/** HTML 转义工具（防 XSS） */
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ═══════════════════════════════════════════════════════════════
   余额管理页面模块
   ═══════════════════════════════════════════════════════════════ */

let _balPage = { page: 1, kw: '', type: '', sort: 'desc', _top10: null, _pie: null };

/** 进入余额管理页时调用 */
async function balancePageLoad() {
  const qs = new URLSearchParams({
    page: _balPage.page,
    kw:   _balPage.kw,
    type: _balPage.type,
    sort: _balPage.sort,
  });
  const d = await apiRequest('GET', '/api/balance/overview?' + qs);
  if (!d || d.code !== 0) return;
  const { stats, top10, list, total, page, pageSize } = d.data;

  // 更新统计卡片
  const fmt = v => '¥' + Number(v||0).toLocaleString('zh-CN', { minimumFractionDigits: 2 });
  const setEl = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  setEl('bal-total',        fmt(stats.totalBalance));
  setEl('bal-agent-total',  fmt(stats.agentBalance));
  setEl('bal-user-total',   fmt(stats.userBalance));
  setEl('bal-member-count', stats.withBalanceCount + ' 人');

  // 渲染表格
  balanceRenderTable(list);
  balanceRenderPagination(total, pageSize, page);

  // 渲染图表（延迟确保容器已显示）
  setTimeout(() => {
    initChartBalTop10(top10);
    initChartBalPie(stats.agentBalance, stats.userBalance);
  }, 80);
}

function balanceSearch() {
  _balPage.kw   = document.getElementById('bal-kw')?.value.trim() || '';
  _balPage.type = document.getElementById('bal-type')?.value || '';
  _balPage.sort = document.getElementById('bal-sort')?.value || 'desc';
  _balPage.page = 1;
  balancePageLoad();
}

function balanceReset() {
  document.getElementById('bal-kw').value   = '';
  document.getElementById('bal-type').value = '';
  document.getElementById('bal-sort').value = 'desc';
  _balPage.kw = _balPage.type = '';
  _balPage.sort = 'desc';
  _balPage.page = 1;
  balancePageLoad();
}

function balanceRenderTable(list) {
  const tbody = document.getElementById('bal-tbody');
  if (!tbody) return;
  if (!list || !list.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-3);">暂无数据</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(m => {
    const isAgent = m.user_type === '代理';
    const typeBadge = isAgent
      ? '<span class="badge badge-indigo">代理</span>'
      : '<span class="badge" style="background:rgba(6,182,212,0.12);color:#06b6d4;">普通</span>';
    const agentNo = m.agent_no
      ? `<span class="mono" style="font-size:12px;color:#6366f1;">${esc(m.agent_no)}</span>`
      : '<span style="color:var(--text-3);">—</span>';
    const balVal = parseFloat(m.balance) || 0;
    const balColor = balVal <= 0 ? 'color:#9ca3af;' : balVal < 100 ? 'color:#f59e0b;' : 'color:#10b981;';
    const statusBadge = m.status === 1
      ? '<span class="badge badge-success">正常</span>'
      : '<span class="badge badge-danger">停用</span>';
    const updAt = (m.updated_at||'').slice(0,16).replace('T',' ') || '—';
    return `<tr>
      <td><span style="font-weight:500;">${esc(m.username)}</span>${m.realname ? `<span style="margin-left:6px;font-size:12px;color:var(--text-3);">${esc(m.realname)}</span>` : ''}</td>
      <td>${typeBadge}</td>
      <td>${agentNo}</td>
      <td><span class="num" style="font-size:16px;font-weight:700;${balColor}">¥${balVal.toLocaleString('zh-CN',{minimumFractionDigits:2})}</span></td>
      <td>${statusBadge}</td>
      <td style="font-size:12px;color:var(--text-3);">${updAt}</td>
      <td>
        <button class="btn-link" onclick="balanceOpenModal(${m.id},'${esc(m.username)}',${m.balance||0})">调整余额</button>
        <button class="btn-link text-muted" onclick="navigateTo('agents')">查看用户</button>
      </td>
    </tr>`;
  }).join('');
}

function balanceRenderPagination(total, pageSize, cur) {
  const wrap  = document.getElementById('bal-pagination');
  const count = document.getElementById('bal-total-count');
  if (count) count.textContent = `共 ${total} 条`;
  if (!wrap) return;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  let html = '';
  for (let i = 1; i <= Math.min(pages, 8); i++) {
    html += `<button class="page-btn${i===cur?' active':''}" onclick="_balPage.page=${i};balancePageLoad()">${i}</button>`;
  }
  if (pages > 8) html += `<button class="page-btn" disabled>…</button>`;
  wrap.innerHTML = html;
}

/** 余额 Top10 横柱图 */
function initChartBalTop10(top10) {
  const dom = document.getElementById('chart-bal-top10');
  if (!dom) return;
  let chart = echarts.getInstanceByDom(dom);
  if (!chart) chart = echarts.init(dom);
  const names  = (top10||[]).map(t => t.username);
  const vals   = (top10||[]).map(t => t.balance);
  const colors = (top10||[]).map(t => t.user_type === '代理' ? '#6366f1' : '#06b6d4');
  chart.setOption({
    tooltip: { trigger: 'axis', formatter: p => `${p[0].name}<br/>¥${Number(p[0].value).toLocaleString('zh-CN',{minimumFractionDigits:2})}` },
    grid: { left: 100, right: 20, top: 8, bottom: 8, containLabel: false },
    xAxis: { type: 'value', axisLabel: { formatter: v => v >= 10000 ? (v/10000).toFixed(0)+'万' : v, fontSize: 11 }, splitLine: { lineStyle: { color: 'rgba(0,0,0,.06)' } } },
    yAxis: { type: 'category', data: names, axisLabel: { fontSize: 12, color: '#374151', width: 90, overflow: 'truncate' }, axisTick: { show: false } },
    series: [{
      type: 'bar', data: vals, barMaxWidth: 18, barMinWidth: 6,
      itemStyle: {
        borderRadius: [0,8,8,0],
        color: p => ({ type: 'linear', x:0,y:0,x2:1,y2:0, colorStops:[{offset:0,color:colors[p.dataIndex]+'cc'},{offset:1,color:colors[p.dataIndex]}] }),
      },
      label: { show: true, position: 'right', formatter: p => '¥'+Number(p.value).toLocaleString('zh-CN',{minimumFractionDigits:0}), fontSize: 11, color: '#6b7280' },
    }],
  });
}

/** 代理 vs 普通用户余额占比饼图 */
function initChartBalPie(agentBal, userBal) {
  const dom = document.getElementById('chart-bal-pie');
  if (!dom) return;
  let chart = echarts.getInstanceByDom(dom);
  if (!chart) chart = echarts.init(dom);
  chart.setOption({
    tooltip: { trigger: 'item', formatter: p => `${p.name}<br/>¥${Number(p.value).toLocaleString('zh-CN',{minimumFractionDigits:2})}<br/>${p.percent}%` },
    legend: { bottom: 4, itemWidth: 12, itemHeight: 12, textStyle: { fontSize: 12, color: '#6b7280' } },
    series: [{
      type: 'pie', radius: ['48%','72%'], center: ['50%','46%'],
      data: [
        { value: agentBal, name: '代理余额', itemStyle: { color: { type:'linear',x:0,y:0,x2:1,y2:1, colorStops:[{offset:0,color:'#6366f1'},{offset:1,color:'#8b5cf6'}] } } },
        { value: userBal,  name: '用户余额', itemStyle: { color: { type:'linear',x:0,y:0,x2:1,y2:1, colorStops:[{offset:0,color:'#06b6d4'},{offset:1,color:'#0ea5e9'}] } } },
      ],
      label: { show: false },
      emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0,0,0,.15)' } },
    }],
  });
}

/* ═══════════════════════════════════════════════════════════════
   产品列表模块
   ═══════════════════════════════════════════════════════════════ */
let _prod = { page:1, kw:'', cat_id:'', sup_id:'', status:'' };
let _prodCats = [];   // 缓存分类列表
let _prodSups = [];   // 缓存供应商列表

async function prodLoad() {
  const qs = new URLSearchParams({ page: _prod.page, kw: _prod.kw, cat_id: _prod.cat_id, sup_id: _prod.sup_id, status: _prod.status });
  const d  = await apiRequest('GET', '/api/products?' + qs);
  if (!d || d.code !== 0) return;
  const { list, total, page, pageSize } = d.data;
  prodRenderTable(list);
  prodRenderPagination(total, pageSize, page);
}

function prodSearch() {
  _prod.kw     = document.getElementById('prod-kw')?.value.trim() || '';
  _prod.cat_id = document.getElementById('prod-cat')?.value || '';
  _prod.sup_id = document.getElementById('prod-sup')?.value || '';
  _prod.status = document.getElementById('prod-status')?.value || '';
  _prod.page = 1;
  prodLoad();
}

function prodReset() {
  ['prod-kw','prod-cat','prod-sup','prod-status'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  Object.assign(_prod, { kw:'', cat_id:'', sup_id:'', status:'', page:1 });
  prodLoad();
}

function prodRenderTable(list) {
  const tbody = document.getElementById('prod-tbody');
  if (!tbody) return;
  if (!list || !list.length) {
    tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:40px;color:var(--text-3);">暂无产品数据</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(p => {
    const statusBadge = p.status === 1
      ? '<span class="badge badge-success">上架</span>'
      : '<span class="badge badge-warning">下架</span>';
    const toggleBtn = p.status === 1
      ? `<button class="btn-link text-danger" onclick="prodToggleStatus(${p.id})">下架</button>`
      : `<button class="btn-link text-success" onclick="prodToggleStatus(${p.id})">上架</button>`;
    const directBadge = p.is_direct === 1
      ? '<span class="badge" style="background:rgba(99,102,241,.12);color:#6366f1;font-size:11px;">直冲</span>'
      : '<span style="color:var(--text-3);font-size:13px;">—</span>';
    const directBtn = p.is_direct === 1
      ? `<button class="btn-link text-muted" onclick="prodToggleDirect(${p.id})">取消直冲</button>`
      : `<button class="btn-link" onclick="prodToggleDirect(${p.id})">设为直冲</button>`;
    // 运营商显示
    const opMap = { '中国移动': { label: '移动', color: '#f59e0b' }, '中国电信': { label: '电信', color: '#3b82f6' }, '中国联通': { label: '联通', color: '#e11d48' } };
    const ops = Array.isArray(p.operators) && p.operators.length
      ? p.operators.map(op => {
          const m = opMap[op] || { label: op, color: '#6b7280' };
          return `<span style="display:inline-block;padding:1px 6px;border-radius:8px;font-size:11px;font-weight:600;background:${m.color}22;color:${m.color};margin:1px;">${m.label}</span>`;
        }).join('')
      : '<span style="color:var(--text-3);font-size:13px;">—</span>';
    return `<tr>
      <td style="color:var(--text-3);font-size:12px;">#${p.id}</td>
      <td style="font-weight:500;">${esc(p.name)}</td>
      <td><span class="badge" style="background:rgba(6,182,212,.1);color:#06b6d4;">${esc(p.category||'—')}</span></td>
      <td style="font-size:13px;color:var(--text-2);">${esc(p.supplier||'—')}</td>
      <td class="num" style="font-weight:600;">¥${(+p.face_value).toFixed(2)}</td>
      <td class="num" style="color:var(--text-3);">¥${(+p.cost_price).toFixed(2)}</td>
      <td class="num" style="color:#6366f1;">¥${(+p.agent_price).toFixed(2)}</td>
      <td class="num" style="color:#10b981;">¥${(+p.retail_price).toFixed(2)}</td>
      <td style="white-space:nowrap;">${ops}</td>
      <td>${directBadge}</td>
      <td>${statusBadge}</td>
      <td>
        <button class="btn-link" onclick="prodOpenEdit(${p.id})">编辑</button>
        ${toggleBtn}
        ${directBtn}
        <button class="btn-link text-danger" onclick="prodDelete(${p.id},'${esc(p.name)}')">删除</button>
      </td>
    </tr>`;
  }).join('');
}

function prodRenderPagination(total, pageSize, cur) {
  const wrap  = document.getElementById('prod-pagination');
  const count = document.getElementById('prod-total-count');
  if (count) count.textContent = `共 ${total} 个产品`;
  if (!wrap) return;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  let html = '';
  for (let i = 1; i <= Math.min(pages, 8); i++) {
    html += `<button class="page-btn${i===cur?' active':''}" onclick="_prod.page=${i};prodLoad()">${i}</button>`;
  }
  if (pages > 8) html += `<button class="page-btn" disabled>…</button>`;
  wrap.innerHTML = html;
}

/** 填充分类/供应商下拉（产品弹窗 + 搜索栏） */
async function prodFillSelects() {
  // 分类
  if (!_prodCats.length) {
    const d = await apiRequest('GET', '/api/categories');
    if (d && d.code === 0) _prodCats = d.data;
  }
  // 供应商
  if (!_prodSups.length) {
    const d = await apiRequest('GET', '/api/suppliers');
    if (d && d.code === 0) _prodSups = d.data;
  }
  // 搜索栏
  const catSel = document.getElementById('prod-cat');
  const supSel = document.getElementById('prod-sup');
  if (catSel && catSel.options.length <= 1) {
    _prodCats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id; opt.textContent = (c.parent_id ? '  └ ' : '') + c.name;
      catSel.appendChild(opt);
    });
  }
  if (supSel && supSel.options.length <= 1) {
    _prodSups.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id; opt.textContent = s.name;
      supSel.appendChild(opt);
    });
  }
  // 弹窗内下拉
  const fcat = document.getElementById('prod-f-cat');
  const fsup = document.getElementById('prod-f-sup');
  if (fcat) {
    fcat.innerHTML = '<option value="">请选择分类</option>';
    _prodCats.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id; o.textContent = (c.parent_id ? '  └ ' : '') + c.name;
      fcat.appendChild(o);
    });
  }
  if (fsup) {
    fsup.innerHTML = '<option value="">请选择</option><option value="-1">直冲商品（无供应商）</option>';
    _prodSups.forEach(s => {
      const o = document.createElement('option');
      o.value = s.id; o.textContent = s.name;
      fsup.appendChild(o);
    });
  }
}

/** 供应商切换联动显隐 */
function prodSupChange() {
  const supVal = document.getElementById('prod-f-sup').value;
  const hasSup = supVal && supVal !== '' && supVal !== '-1'; // 选了真实供应商
  // 供应商商品ID、同步价格、同步上下架 — 仅有供应商时显示
  ['prod-row-sup-item-id','prod-row-sync-price','prod-row-sync-status'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = hasSup ? '' : 'none';
  });
}

async function prodOpenAdd() {
  await prodFillSelects();
  document.getElementById('prod-edit-id').value = '';
  document.getElementById('modal-prod-title').textContent = '新增产品';
  // 清空文本/数值输入
  ['prod-f-name','prod-f-face','prod-f-cost','prod-f-agent','prod-f-retail',
   'prod-f-sup-item-id','prod-f-sort','prod-f-daily-limit','prod-f-monthly-limit','prod-f-delay'
  ].forEach(id => { const el = document.getElementById(id); if (el) el.value = id==='prod-f-sort'?'99':''; });
  // 重置下拉
  document.getElementById('prod-f-cat').value            = '';
  document.getElementById('prod-f-sup').value            = '';
  document.getElementById('prod-f-status').value         = '1';
  document.getElementById('prod-f-charge-mode').value    = 'supplier';
  document.getElementById('prod-f-allow-progress').value = '1';
  document.getElementById('prod-f-sync-price').value     = '0';
  document.getElementById('prod-f-sync-status').value    = '0';
  // 取消运营商勾选
  ['op-mobile','op-telecom','op-unicom'].forEach(id => { document.getElementById(id).checked = false; });
  // 初始联动
  prodSupChange();
  showModal('modal-prod');
}

async function prodOpenEdit(id) {
  await prodFillSelects();
  // 取全量列表找到当前产品（pageSize=9999）
  const d = await apiRequest('GET', `/api/products?page=1&size=9999`);
  const all = d?.data?.list || [];
  const p = all.find(x => x.id === id);
  if (!p) return showToast('未找到产品数据', 'error');
  document.getElementById('prod-edit-id').value = id;
  document.getElementById('modal-prod-title').textContent = '编辑产品';
  // 基础字段
  document.getElementById('prod-f-name').value         = p.name;
  document.getElementById('prod-f-cat').value          = p.category_id;
  document.getElementById('prod-f-face').value         = p.face_value;
  document.getElementById('prod-f-cost').value         = p.cost_price;
  document.getElementById('prod-f-agent').value        = p.agent_price;
  document.getElementById('prod-f-retail').value       = p.retail_price;
  document.getElementById('prod-f-sort').value         = p.sort ?? 99;
  document.getElementById('prod-f-status').value       = String(p.status ?? 1);
  // 供应商
  document.getElementById('prod-f-sup').value          = p.supplier_id ?? '';
  document.getElementById('prod-f-sup-item-id').value  = p.supplier_item_id ?? '';
  document.getElementById('prod-f-charge-mode').value  = p.charge_mode ?? 'supplier';
  document.getElementById('prod-f-sync-price').value   = String(p.sync_price  ?? 0);
  document.getElementById('prod-f-sync-status').value  = String(p.sync_status ?? 0);
  // 运营商
  const ops = Array.isArray(p.operators) ? p.operators : [];
  document.getElementById('op-mobile').checked  = ops.includes('中国移动');
  document.getElementById('op-telecom').checked = ops.includes('中国电信');
  document.getElementById('op-unicom').checked  = ops.includes('中国联通');
  // 下单限制
  document.getElementById('prod-f-daily-limit').value    = p.daily_limit   ?? 0;
  document.getElementById('prod-f-monthly-limit').value  = p.monthly_limit ?? 0;
  document.getElementById('prod-f-allow-progress').value = String(p.allow_order_in_progress ?? 1);
  document.getElementById('prod-f-delay').value          = p.delay_submit  ?? 0;
  // 联动
  prodSupChange();
  showModal('modal-prod');
}

async function prodSubmit() {
  const id = document.getElementById('prod-edit-id').value;
  // 收集运营商
  const operators = ['op-mobile','op-telecom','op-unicom']
    .filter(cid => document.getElementById(cid).checked)
    .map(cid => document.getElementById(cid).value);
  const body = {
    name:                   document.getElementById('prod-f-name').value.trim(),
    category_id:            document.getElementById('prod-f-cat').value,
    supplier_id:            document.getElementById('prod-f-sup').value,
    supplier_item_id:       document.getElementById('prod-f-sup-item-id').value.trim(),
    face_value:             document.getElementById('prod-f-face').value,
    cost_price:             document.getElementById('prod-f-cost').value,
    agent_price:            document.getElementById('prod-f-agent').value,
    retail_price:           document.getElementById('prod-f-retail').value,
    operators,
    status:                 document.getElementById('prod-f-status').value,
    sort:                   document.getElementById('prod-f-sort').value,
    daily_limit:            document.getElementById('prod-f-daily-limit').value,
    monthly_limit:          document.getElementById('prod-f-monthly-limit').value,
    allow_order_in_progress: document.getElementById('prod-f-allow-progress').value,
    charge_mode:            document.getElementById('prod-f-charge-mode').value,
    delay_submit:           document.getElementById('prod-f-delay').value,
    sync_price:             document.getElementById('prod-f-sync-price').value,
    sync_status:            document.getElementById('prod-f-sync-status').value,
  };
  if (!body.name)        return showToast('请输入产品名称', 'error');
  if (!body.category_id) return showToast('请选择分类', 'error');
  if (!body.face_value)  return showToast('请输入面值', 'error');
  const method = id ? 'PUT' : 'POST';
  const url    = id ? `/api/products/${id}` : '/api/products';
  const d = await apiRequest(method, url, body);
  if (!d || d.code !== 0) return showToast(d?.msg || '操作失败', 'error');
  showToast(d.msg || '保存成功', 'success');
  setTimeout(() => { hideModal('modal-prod'); _prodCats = []; _prodSups = []; prodLoad(); }, 800);
}

async function prodToggleStatus(id) {
  const d = await apiRequest('PATCH', `/api/products/${id}/status`);
  if (!d || d.code !== 0) return showToast(d?.msg || '操作失败', 'error');
  showToast(d.msg, 'success');
  prodLoad();
}

async function prodToggleDirect(id) {
  const d = await apiRequest('PATCH', `/api/products/${id}/direct`);
  if (!d || d.code !== 0) return showToast(d?.msg || '操作失败', 'error');
  showToast(d.msg, 'success');
  prodLoad();
}

async function prodDelete(id, name) {
  if (!confirm(`确定删除产品「${name}」？`)) return;
  const d = await apiRequest('DELETE', `/api/products/${id}`);
  if (!d || d.code !== 0) return showToast(d?.msg || '删除失败', 'error');
  showToast('已删除', 'success');
  prodLoad();
}

/* ═══════════════════════════════════════════════════════════════
   产品分类模块
   ═══════════════════════════════════════════════════════════════ */
let _catState = { allCats: [], selectedId: 0 };

async function catLoad() {
  const d = await apiRequest('GET', '/api/categories');
  if (!d || d.code !== 0) return;
  _catState.allCats = d.data;
  _prodCats = d.data; // 同步缓存
  catRenderTree();
  if (_catState.selectedId) {
    catRenderSub(_catState.selectedId);
  }
}

function catRenderTree() {
  const tree = document.getElementById('cat-tree');
  if (!tree) return;
  const roots = _catState.allCats.filter(c => !c.parent_id || c.parent_id === 0);
  if (!roots.length) {
    tree.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-3);font-size:13px;">暂无分类</div>';
    return;
  }
  tree.innerHTML = roots.map(c => {
    const subCount = _catState.allCats.filter(x => x.parent_id === c.id).length;
    const isActive = _catState.selectedId === c.id;
    const tipIcon  = c.order_tip ? `<span title="${esc(c.order_tip)}" style="font-size:13px;cursor:default;" onclick="event.stopPropagation()">💬</span>` : '';
    return `<div class="tree-node${isActive ? ' active' : ''}" onclick="catSelectRoot(${c.id})" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:10px 16px;transition:all .2s;">
      <span style="display:flex;align-items:center;gap:6px;font-weight:${isActive?700:500};font-size:14px;">${esc(c.name)}${tipIcon}</span>
      <span style="display:flex;gap:6px;align-items:center;">
        <span class="tree-count">${subCount}</span>
        <button class="btn-link" style="font-size:12px;" onclick="event.stopPropagation();catOpenEdit(${c.id})">编辑</button>
        <button class="btn-link text-danger" style="font-size:12px;" onclick="event.stopPropagation();catDelete(${c.id},'${esc(c.name)}')">删除</button>
      </span>
    </div>`;
  }).join('');
}

function catSelectRoot(id) {
  _catState.selectedId = id;
  catRenderTree();
  catRenderSub(id);
}

function catRenderSub(parentId) {
  const parent = _catState.allCats.find(c => c.id === parentId);
  const title  = document.getElementById('cat-sub-title');
  const addBtn = document.getElementById('cat-add-sub-btn');
  const body   = document.getElementById('cat-sub-body');
  if (title) title.textContent = parent ? `${parent.name} · 子类目` : '子类目';
  if (addBtn) addBtn.style.display = 'inline-flex';
  const subs = _catState.allCats.filter(c => c.parent_id === parentId);
  if (!subs.length) {
    body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-3);font-size:13px;">该主类目暂无子类目</div>';
    return;
  }
  body.innerHTML = `<table class="data-table"><thead><tr><th>子类目名</th><th>排序</th><th>下单提示</th><th>状态</th><th>操作</th></tr></thead><tbody>${
    subs.map(c => `<tr>
      <td style="font-weight:500;">${esc(c.name)}</td>
      <td style="color:var(--text-3);">${c.sort}</td>
      <td style="max-width:240px;">${c.order_tip ? `<span style="color:var(--text-2);font-size:12px;" title="${esc(c.order_tip)}">💬 ${esc(c.order_tip.length>30 ? c.order_tip.slice(0,30)+'…' : c.order_tip)}</span>` : '<span style="color:var(--text-3);font-size:12px;">—</span>'}</td>
      <td>${c.status===1 ? '<span class="badge badge-success">启用</span>' : '<span class="badge badge-warning">禁用</span>'}</td>
      <td>
        <button class="btn-link" onclick="catOpenEdit(${c.id})">编辑</button>
        <button class="btn-link text-danger" onclick="catDelete(${c.id},'${esc(c.name)}')">删除</button>
      </td>
    </tr>`).join('')
  }</tbody></table>`;
}

/** 新增类目（统一入口） */
function catOpenAdd() {
  document.getElementById('cat-edit-id').value = '';
  document.getElementById('modal-cat-title').textContent = '新增类目';
  document.getElementById('cat-f-name').value = '';
  document.getElementById('cat-f-sort').value = '99';
  document.getElementById('cat-f-order-tip').value = '';
  // 填充上级下拉（默认选"无，即主类目"）
  const psel = document.getElementById('cat-f-parent');
  psel.innerHTML = '<option value="0">无（主类目）</option>';
  _catState.allCats.filter(c => !c.parent_id || c.parent_id === 0).forEach(c => {
    const o = document.createElement('option');
    o.value = c.id; o.textContent = c.name;
    psel.appendChild(o);
  });
  showModal('modal-cat');
}

function catOpenEdit(id) {
  const cat = _catState.allCats.find(c => c.id === id);
  if (!cat) return;
  document.getElementById('cat-edit-id').value = id;
  document.getElementById('modal-cat-title').textContent = '编辑分类';
  document.getElementById('cat-f-name').value = cat.name;
  document.getElementById('cat-f-sort').value = cat.sort || 99;
  document.getElementById('cat-f-order-tip').value = cat.order_tip || '';
  const psel = document.getElementById('cat-f-parent');
  psel.innerHTML = '<option value="0">无（主类目）</option>';
  _catState.allCats.filter(c => (!c.parent_id || c.parent_id === 0) && c.id !== id).forEach(c => {
    const o = document.createElement('option');
    o.value = c.id; o.textContent = c.name;
    if (c.id === cat.parent_id) o.selected = true;
    psel.appendChild(o);
  });
  showModal('modal-cat');
}

async function catSubmit() {
  const id   = document.getElementById('cat-edit-id').value;
  const body = {
    name:      document.getElementById('cat-f-name').value.trim(),
    parent_id: parseInt(document.getElementById('cat-f-parent').value) || 0,
    sort:      parseInt(document.getElementById('cat-f-sort').value) || 99,
    order_tip: document.getElementById('cat-f-order-tip').value.trim(),
  };
  if (!body.name) return showToast('请输入分类名称', 'error');
  const method = id ? 'PUT' : 'POST';
  const url    = id ? `/api/categories/${id}` : '/api/categories';
  const d = await apiRequest(method, url, body);
  if (!d || d.code !== 0) return showToast(d?.msg || '操作失败', 'error');
  showToast(d.msg || '保存成功', 'success');
  setTimeout(() => { hideModal('modal-cat'); _prodCats = []; catLoad(); }, 800);
}

async function catDelete(id, name) {
  if (!confirm(`确定删除分类「${name}」？`)) return;
  const d = await apiRequest('DELETE', `/api/categories/${id}`);
  if (!d || d.code !== 0) return showToast(d?.msg || '删除失败', 'error');
  showToast('已删除', 'success');
  if (_catState.selectedId === id) _catState.selectedId = 0;
  _prodCats = [];
  catLoad();
}

/* ═══════════════════════════════════════════════════════════════
   供应商模块
   ═══════════════════════════════════════════════════════════════ */
const SUP_COLORS = ['indigo','cyan','emerald','amber','violet','teal'];

async function supplierLoad() {
  const d = await apiRequest('GET', '/api/suppliers');
  if (!d || d.code !== 0) return;
  const list = d.data || [];
  _prodSups = list;
  supplierRenderGrid(list);
}

function supplierRenderGrid(list) {
  const grid = document.getElementById('supplier-grid');
  if (!grid) return;
  if (!list.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;padding:60px;text-align:center;color:var(--text-3);">暂无供应商，点击右上角新增</div>';
    return;
  }
  grid.innerHTML = list.map((s, i) => {
    const color = SUP_COLORS[i % SUP_COLORS.length];
    const abbr  = s.name.slice(0, 2);
    const bal   = (parseFloat(s.balance)||0).toLocaleString('zh-CN',{minimumFractionDigits:2});
    const isConfigured = s.api_configured === 1;
    const testStatus   = s.test_status || '';
    const testBadge    = testStatus === 'ok'
      ? '<span class="badge badge-success" style="font-size:11px;">✓ 连接正常</span>'
      : testStatus === 'fail' || testStatus === 'timeout'
        ? '<span class="badge badge-danger" style="font-size:11px;">✗ 连接失败</span>'
        : isConfigured
          ? '<span class="badge" style="background:rgba(99,102,241,.12);color:#6366f1;font-size:11px;">已配置</span>'
          : '<span class="badge" style="background:rgba(107,114,128,.12);color:#6b7280;font-size:11px;">未配置</span>';
    const lastTest = s.last_test ? `<span style="font-size:11px;color:var(--text-3);">上次测试：${s.last_test}</span>` : '';
    return `<div class="glass-card supplier-card">
      <div class="supplier-header">
        <div class="supplier-logo ${color}">${esc(abbr)}</div>
        <div style="flex:1;min-width:0;">
          <div class="supplier-name">${esc(s.name)}</div>
          <div class="supplier-type">${s.contact ? esc(s.contact) : '—'} ${s.phone ? '· ' + esc(s.phone) : ''}</div>
        </div>
        ${testBadge}
      </div>
      <div class="supplier-stats">
        <div class="sup-stat"><div class="sup-stat-val">—</div><div class="sup-stat-label">成功率</div></div>
        <div class="sup-stat"><div class="sup-stat-val">—</div><div class="sup-stat-label">响应时间</div></div>
        <div class="sup-stat"><div class="sup-stat-val">¥${bal}</div><div class="sup-stat-label">账户余额</div></div>
      </div>
      ${lastTest ? `<div style="padding:0 0 8px;text-align:right;">${lastTest}</div>` : ''}
      <div class="supplier-actions">
        <button class="btn btn-primary btn-sm" onclick="supApiOpen(${s.id},'${esc(s.name)}')">⚙️ 配置接口</button>
        <button class="btn btn-danger-ghost btn-sm" onclick="supplierDelete(${s.id},'${esc(s.name)}')">删除</button>
      </div>
    </div>`;
  }).join('');
}

/* ─── 接口配置弹窗 ──────────────────────────────────────── */
let _supApiType = 'dayuanren';

function supApiTypeSelect(el, type) {
  document.querySelectorAll('.api-type-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  _supApiType = type;
}

function supApiToggleKey() {
  const inp = document.getElementById('sup-api-key');
  if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
}

async function supApiOpen(id, name) {
  document.getElementById('sup-api-id').value    = id;
  document.getElementById('sup-api-title').textContent = `接口配置 — ${name}`;
  document.getElementById('sup-api-sub').textContent   = '大猿人充值平台对接';
  // 重置测试/同步状态
  document.getElementById('sup-api-test-result').textContent  = '点击测试按钮验证接口配置是否正确';
  document.getElementById('sup-api-test-result').style.color  = 'var(--text-3)';
  document.getElementById('sup-sync-result').textContent      = '保存配置并测试连接通过后，可同步供应商产品列表';
  document.getElementById('sup-sync-table-wrap').style.display = 'none';
  // 加载已有配置
  const d = await apiRequest('GET', `/api/suppliers/${id}/api-config`);
  if (d && d.code === 0 && d.data && d.data.supplier_id) {
    const cfg = d.data;
    document.getElementById('sup-api-domain').value  = cfg.api_domain || '';
    document.getElementById('sup-api-userid').value  = cfg.userid     || '';
    document.getElementById('sup-api-key').value     = cfg.api_key    || '';
    document.getElementById('sup-api-notify').value  = cfg.notify_url || '';
    document.getElementById('sup-api-enabled').checked = cfg.enabled !== 0;
    _supApiType = cfg.api_type || 'dayuanren';
    // 同步接口类型按钮高亮
    document.querySelectorAll('.api-type-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.type === _supApiType);
    });
  } else {
    // 清空
    ['sup-api-domain','sup-api-userid','sup-api-key','sup-api-notify'].forEach(id => {
      const el = document.getElementById(id); if(el) el.value = '';
    });
    document.getElementById('sup-api-enabled').checked = true;
    _supApiType = 'dayuanren';
    document.querySelectorAll('.api-type-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.type === 'dayuanren');
    });
  }
  showModal('modal-sup-api');
}

async function supApiSave() {
  const id = document.getElementById('sup-api-id').value;
  const body = {
    api_type:   _supApiType,
    api_domain: document.getElementById('sup-api-domain').value.trim(),
    userid:     document.getElementById('sup-api-userid').value.trim(),
    api_key:    document.getElementById('sup-api-key').value.trim(),
    notify_url: document.getElementById('sup-api-notify').value.trim(),
    enabled:    document.getElementById('sup-api-enabled').checked ? 1 : 0,
  };
  if (!body.api_domain) return showToast('请填写 API 域名', 'error');
  if (!body.userid)     return showToast('请填写商户 ID', 'error');
  if (!body.api_key)    return showToast('请填写 API 密钥', 'error');
  const d = await apiRequest('POST', `/api/suppliers/${id}/api-config`, body);
  if (!d || d.code !== 0) return showToast(d?.msg || '保存失败', 'error');
  showToast('接口配置已保存', 'success');
  supplierLoad();
}

async function supApiTestConnect() {
  const id  = document.getElementById('sup-api-id').value;
  const btn = document.getElementById('sup-api-test-btn');
  const res = document.getElementById('sup-api-test-result');
  btn.disabled = true;
  btn.textContent = '⏳ 测试中…';
  res.textContent = '正在连接，请稍候…';
  res.style.color = 'var(--text-3)';
  const d = await apiRequest('POST', `/api/suppliers/${id}/test-connect`);
  btn.disabled = false;
  btn.textContent = '🔌 测试连接';
  if (d && d.code === 0) {
    const info = d.data;
    res.textContent = `✅ 连接成功！${info.username ? '账号：' + info.username : ''}${info.balance !== undefined ? '  余额：¥' + info.balance : ''}`;
    res.style.color = '#10b981';
    supplierLoad();
  } else {
    res.textContent = `❌ ${d?.msg || '连接失败'}`;
    res.style.color = '#ef4444';
    supplierLoad();
  }
}

async function supApiSyncProducts() {
  const id   = document.getElementById('sup-api-id').value;
  const btn  = document.getElementById('sup-sync-btn');
  const res  = document.getElementById('sup-sync-result');
  const wrap = document.getElementById('sup-sync-table-wrap');
  const typeVal  = (document.getElementById('sup-sync-type')  || {}).value || '';
  const cateVal  = (document.getElementById('sup-sync-cate')  || {}).value || '';

  btn.disabled = true;
  btn.textContent = '⏳ 同步中…';
  res.textContent = '正在拉取产品列表…';
  res.style.color = 'var(--text-3)';
  wrap.style.display = 'none';

  const d = await apiRequest('POST', `/api/suppliers/${id}/sync-products`, {
    type:    typeVal,
    cate_id: cateVal,
  });
  btn.disabled = false;
  btn.textContent = '📦 同步产品';

  if (!d || d.code !== 0) {
    res.textContent = `❌ ${d?.msg || '同步失败'}`;
    res.style.color = '#ef4444';
    return;
  }
  const { total, list } = d.data;
  if (!total) {
    res.textContent = '未获取到产品，请检查参数或确认账号已有授权产品';
    res.style.color = '#f59e0b';
    return;
  }
  res.textContent = `✅ 获取到 ${total} 个产品（最多显示 200 条），可预览后按需导入`;
  res.style.color = '#10b981';

  // ISP 运营商映射
  const ispMap = { '1': '移动', '2': '电信', '3': '联通', '4': '虚拟' };
  function ispBadge(ispStr) {
    if (!ispStr) return '—';
    return ispStr.split(',').map(v => {
      const label = ispMap[v.trim()] || v;
      const color = v==='1'?'#f97316':v==='2'?'#3b82f6':v==='3'?'#ef4444':'#8b5cf6';
      return `<span class="badge" style="background:${color}22;color:${color};font-size:10px;margin:1px;">${label}</span>`;
    }).join('');
  }

  // 渲染产品预览表格
  const tbody = document.getElementById('sup-sync-tbody');
  tbody.innerHTML = list.slice(0, 200).map(p => `<tr>
    <td style="color:var(--text-3);white-space:nowrap;">${esc(String(p.id || '—'))}</td>
    <td style="font-weight:500;">${esc(p.name || '—')}</td>
    <td style="color:var(--text-3);font-size:12px;">${esc(p.cate_name || p.type_name || '—')}</td>
    <td>${ispBadge(p.isp)}</td>
    <td class="num" style="color:#6366f1;font-weight:600;">¥${parseFloat(p.price || 0).toFixed(4)}</td>
    <td class="num" style="color:var(--text-3);">¥${parseFloat(p.y_price || 0).toFixed(2)}</td>
    <td><span class="badge" style="background:${p.api_open=='1'?'rgba(16,185,129,.12)':'rgba(239,68,68,.1)'};color:${p.api_open=='1'?'#10b981':'#ef4444'};font-size:11px;">${p.api_open=='1'?'自动':'手动'}</span></td>
    <td style="color:var(--text-3);font-size:11px;">${esc(p.ys_tag || '—')}</td>
  </tr>`).join('');
  wrap.style.display = '';
}

function supplierOpenAdd() {
  ['sup-f-name','sup-f-contact','sup-f-phone'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value='';
  });
  showModal('modal-supplier');
}

async function supplierSubmit() {
  const body = {
    name:    document.getElementById('sup-f-name').value.trim(),
    contact: document.getElementById('sup-f-contact').value.trim(),
    phone:   document.getElementById('sup-f-phone').value.trim(),
  };
  if (!body.name) return showToast('请输入供应商名称', 'error');
  const d = await apiRequest('POST', '/api/suppliers', body);
  if (!d || d.code !== 0) return showToast(d?.msg || '操作失败', 'error');
  showToast(d.msg || '已添加', 'success');
  setTimeout(() => { hideModal('modal-supplier'); _prodSups = []; supplierLoad(); }, 800);
}

async function supplierDelete(id, name) {
  if (!confirm(`确定删除供应商「${name}」？\n该供应商下有产品时无法删除。`)) return;
  const d = await apiRequest('DELETE', `/api/suppliers/${id}`);
  if (!d || d.code !== 0) return showToast(d?.msg || '删除失败', 'error');
  showToast('已删除', 'success');
  _prodSups = [];
  supplierLoad();
}

/* ═══════════════════════════════════════════════════════════════
   直冲产品模块
   ═══════════════════════════════════════════════════════════════ */
let _dp = { page:1, kw:'', on_sale:'' };

async function dpLoad() {
  const qs = new URLSearchParams({ page: _dp.page, kw: _dp.kw, on_sale: _dp.on_sale });
  const d  = await apiRequest('GET', '/api/direct-products?' + qs);
  if (!d || d.code !== 0) return;
  const { list, total, page, pageSize } = d.data;
  dpRenderTable(list);
  dpRenderPagination(total, pageSize, page);
}

function dpSearch() {
  _dp.kw      = document.getElementById('dp-kw')?.value.trim() || '';
  _dp.on_sale = document.getElementById('dp-sale')?.value || '';
  _dp.page = 1;
  dpLoad();
}
function dpReset() {
  document.getElementById('dp-kw').value   = '';
  document.getElementById('dp-sale').value = '';
  Object.assign(_dp, { kw:'', on_sale:'', page:1 });
  dpLoad();
}

function dpRenderTable(list) {
  const tbody = document.getElementById('dp-tbody');
  if (!tbody) return;
  if (!list || !list.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-3);">暂无直冲产品</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(p => {
    const saleBadge = p.on_sale === 1
      ? '<span class="badge badge-success">在售</span>'
      : '<span class="badge badge-warning">停售</span>';
    const saleBtn = p.on_sale === 1
      ? `<button class="btn-link text-danger" onclick="dpToggleSale(${p.id})">停售</button>`
      : `<button class="btn-link text-success" onclick="dpToggleSale(${p.id})">上架在售</button>`;
    const createdAt = (p.created_at||'').slice(0,16).replace('T',' ');
    return `<tr>
      <td style="color:var(--text-3);font-size:12px;">#${p.id}</td>
      <td style="font-weight:500;">${esc(p.name)}</td>
      <td style="color:var(--text-2);">${esc(p.charge_type||'—')}</td>
      <td class="num" style="font-weight:600;">¥${(+p.face_value).toFixed(2)}</td>
      <td class="num" style="color:#6366f1;">¥${(+p.direct_price).toFixed(2)}</td>
      <td>${saleBadge}</td>
      <td style="font-size:12px;color:var(--text-3);">${createdAt}</td>
      <td>
        <button class="btn-link" onclick="dpOpenEdit(${p.id})">编辑</button>
        ${saleBtn}
        <button class="btn-link text-danger" onclick="dpDelete(${p.id},'${esc(p.name)}')">删除</button>
      </td>
    </tr>`;
  }).join('');
}

function dpRenderPagination(total, pageSize, cur) {
  const wrap  = document.getElementById('dp-pagination');
  const count = document.getElementById('dp-total-count');
  if (count) count.textContent = `共 ${total} 个产品`;
  if (!wrap) return;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  let html = '';
  for (let i = 1; i <= Math.min(pages, 8); i++) {
    html += `<button class="page-btn${i===cur?' active':''}" onclick="_dp.page=${i};dpLoad()">${i}</button>`;
  }
  wrap.innerHTML = html;
}

function dpOpenAdd() {
  document.getElementById('dp-edit-id').value = '';
  document.getElementById('modal-dp-title').textContent = '新增直冲产品';
  ['dp-f-name','dp-f-face','dp-f-price'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value='';
  });
  document.getElementById('dp-f-type').value = '账号直充';
  showModal('modal-dp');
}

async function dpOpenEdit(id) {
  const d = await apiRequest('GET', `/api/direct-products?page=1`);
  const all = d?.data?.list || [];
  const p = all.find(x => x.id === id);
  if (!p) return;
  document.getElementById('dp-edit-id').value = id;
  document.getElementById('modal-dp-title').textContent = '编辑直冲产品';
  document.getElementById('dp-f-name').value  = p.name;
  document.getElementById('dp-f-type').value  = p.charge_type || '账号直充';
  document.getElementById('dp-f-face').value  = p.face_value;
  document.getElementById('dp-f-price').value = p.direct_price;
  showModal('modal-dp');
}

async function dpSubmit() {
  const id   = document.getElementById('dp-edit-id').value;
  const body = {
    name:         document.getElementById('dp-f-name').value.trim(),
    charge_type:  document.getElementById('dp-f-type').value.trim(),
    face_value:   document.getElementById('dp-f-face').value,
    direct_price: document.getElementById('dp-f-price').value,
  };
  if (!body.name) return showToast('请输入产品名称', 'error');
  if (!body.face_value) return showToast('请输入面值', 'error');
  const method = id ? 'PUT' : 'POST';
  const url    = id ? `/api/direct-products/${id}` : '/api/direct-products';
  const d = await apiRequest(method, url, body);
  if (!d || d.code !== 0) return showToast(d?.msg || '操作失败', 'error');
  showToast(d.msg || '保存成功', 'success');
  setTimeout(() => { hideModal('modal-dp'); dpLoad(); }, 800);
}

async function dpToggleSale(id) {
  const d = await apiRequest('PATCH', `/api/direct-products/${id}/sale`);
  if (!d || d.code !== 0) return showToast(d?.msg || '操作失败', 'error');
  showToast(d.msg, 'success');
  dpLoad();
}

async function dpDelete(id, name) {
  if (!confirm(`确定删除「${name}」？`)) return;
  const d = await apiRequest('DELETE', `/api/direct-products/${id}`);
  if (!d || d.code !== 0) return showToast(d?.msg || '删除失败', 'error');
  showToast('已删除', 'success');
  dpLoad();
}

/* ═══════════════════════════════════════════════════════════════
   操作日志模块
   ═══════════════════════════════════════════════════════════════ */

async function operationLogsLoad() {
  const search = document.getElementById('oplog-search').value.trim();
  const action = document.getElementById('oplog-action').value;
  const date = document.getElementById('oplog-date').value;

  const tbody = document.getElementById('oplog-tbody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-3);">加载中…</td></tr>';

  const data = await apiRequest('GET', `/api/operation-logs?search=${encodeURIComponent(search)}&action=${action}&date=${date}`);
  if (!data || data.code !== 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-3);">加载失败</td></tr>';
    return;
  }

  const logs = data.data.items || [];
  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-3);">暂无操作日志</td></tr>';
    return;
  }

  tbody.innerHTML = logs.map(log => `
    <tr>
      <td class="mono">${log.id}</td>
      <td>${log.username || '—'}</td>
      <td><span class="badge badge-indigo">${log.action}</span></td>
      <td>${log.target_type || '—'} ${log.target_id ? '#' + log.target_id : ''}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;">${log.detail || '—'}</td>
      <td class="mono" style="font-size:12px;">${log.ip || '—'}</td>
      <td class="mono" style="font-size:12px;">${log.created_at || '—'}</td>
    </tr>
  `).join('');
}

/* ═══════════════════════════════════════════════════════════════
   测试下单模块
   ═══════════════════════════════════════════════════════════════ */

async function initTestOrder() {
  // 加载产品列表
  const products = await apiRequest('GET', '/api/products');
  if (products && products.code === 0) {
    const productSelect = document.getElementById('test-product');
    productSelect.innerHTML = '<option value="">— 请选择产品 —</option>' +
      (products.data.list || []).map(p => `<option value="${p.id}" data-price="${p.cost_price}">${p.name} (¥${p.cost_price})</option>`).join('');
  }
}

async function submitTestOrder() {
  const productId = document.getElementById('test-product').value;
  const account = document.getElementById('test-account').value.trim();
  const remark = document.getElementById('test-remark').value.trim();
  const resultDiv = document.getElementById('test-result');

  if (!productId) return showToast('请选择产品', 'error');
  if (!account) return showToast('请输入充值账号', 'error');

  resultDiv.style.display = 'block';
  resultDiv.innerHTML = '<div style="padding:20px;text-align:center;">创建中…</div>';

  // 获取产品的成本价作为订单金额
  const productSelect = document.getElementById('test-product');
  const selectedOption = productSelect.options[productSelect.selectedIndex];
  const costPrice = parseFloat(selectedOption?.getAttribute('data-price') || 0);
  
  if (!costPrice || costPrice <= 0) {
    resultDiv.innerHTML = `<div style="padding:20px;background:rgba(244,63,94,.1);border-radius:8px;color:#e11d48;">
      ❌ 无法获取产品价格
    </div>`;
    return;
  }

  // 使用测试用户ID (ID=6)
  const testUserId = 6;

  const orderData = await apiRequest('POST', '/api/orders', {
    member_id: testUserId,
    product_id: parseInt(productId),
    order_type: 'consume',
    amount: costPrice,
    account,
    remark: remark || '测试订单'
  });

  if (!orderData || orderData.code !== 0) {
    resultDiv.innerHTML = `<div style="padding:20px;background:rgba(244,63,94,.1);border-radius:8px;color:#e11d48;">
      ❌ ${orderData?.msg || '订单创建失败'}
    </div>`;
    return;
  }

  resultDiv.innerHTML = `
    <div class="glass-card" style="background:rgba(16,185,129,.1);border:1px solid #10b981;">
      <div style="padding:20px;">
        <h3 style="color:#059669;margin:0 0 10px 0;">✅ 测试订单创建成功</h3>
        <p><strong>订单号：</strong>${orderData.data.order_no}</p>
        <p><strong>产品：</strong>${orderData.data.product_name || '—'}</p>
        <p><strong>账号：</strong>${account}</p>
        <p><strong>金额：</strong>¥${orderData.data.amount}</p>
        <p><strong>状态：</strong>${orderData.data.status === 0 ? '待处理' : orderData.data.status === 2 ? '成功' : '失败'}</p>
      </div>
    </div>
  `;

  showToast('测试订单创建成功', 'success');
}

/* ═══════════════════════════════════════════════════════════════
   订单管理模块
   ═══════════════════════════════════════════════════════════════ */
const _orders = { list: [], filtered: [], statusFilter: null, typeFilter: '', page: 1, limit: 20 };

async function ordersLoad() {
  const kw = (document.getElementById('order-keyword')?.value || '').trim();
  const status = document.getElementById('order-status')?.value || '';
  const type = document.getElementById('order-type')?.value || '';
  const page = _orders.page;
  const limit = _orders.limit;

  // 构建查询参数
  let params = `?page=${page}&limit=${limit}`;
  if (kw) params += `&keyword=${encodeURIComponent(kw)}`;
  if (status) params += `&status=${status}`;
  if (type) params += `&type=${type}`;

  const d = await apiRequest('GET', '/api/orders' + params);
  if (!d) return;
  const data = d.data || {};

  _orders.list = data.items || [];
  _orders.filtered = _orders.list;

  // 更新统计数
  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setText('order-stat-all', data.total || 0);
  setText('order-stat-success', data.success || 0);
  setText('order-stat-pending', data.pending || 0);
  setText('order-stat-failed', data.failed || 0);

  // 更新底部统计
  const totalEl = document.querySelector('#page-orders .table-total');
  if (totalEl) {
    const totalPages = Math.ceil((data.total || 0) / limit);
    totalEl.textContent = `共 ${data.total || 0} 条记录，当前第 ${page}/${totalPages || 1} 页`;
  }

  ordersRenderTable();
  ordersAddBatchActions();
}

function ordersFilter(el, status) {
  _orders.statusFilter = status;
  _orders.page = 1;

  if (el) {
    document.querySelectorAll('#page-orders .ostat-item').forEach(e => e.classList.remove('active'));
    el.classList.add('active');
  }

  // 同时更新下拉框
  const statusSelect = document.getElementById('order-status');
  if (statusSelect) statusSelect.value = status !== null ? String(status) : '';

  ordersLoad();
}

function ordersSearch() {
  _orders.page = 1;
  ordersLoad();
}

function ordersReset() {
  document.getElementById('order-keyword').value = '';
  document.getElementById('order-status').value = '';
  document.getElementById('order-type').value = '';
  document.getElementById('order-date-start').value = '';
  document.getElementById('order-date-end').value = '';
  _orders.statusFilter = null;
  _orders.page = 1;

  document.querySelectorAll('#page-orders .ostat-item').forEach((e, i) => {
    e.classList.toggle('active', i === 0);
  });

  ordersLoad();
}

function ordersExport() {
  showToast('导出功能开发中', 'info');
}

/* ═══════════════════════════════════════════════════════════════
   订单快速操作
   ═══════════════════════════════════════════════════════════════ */

async function orderQuickUpdate(orderId, newStatus) {
  const statusNames = { 0: '待处理', 1: '处理中', 2: '成功', 3: '失败', 4: '已退款' };
  const newStatusName = statusNames[newStatus];

  if (!confirm(`确定要将订单状态改为"${newStatusName}"吗？`)) {
    return;
  }

  const d = await apiRequest('PUT', `/api/orders/${orderId}/status`, {
    status: newStatus,
    auto_refund: false  // 管理员手动操作
  });

  if (!d) return;

  showToast('订单状态更新成功', 'success');
  ordersLoad(); // 重新加载订单列表
}

/* ═══════════════════════════════════════════════════════════════
   批量操作
   ═══════════════════════════════════════════════════════════════ */

async function orderBatchUpdate(newStatus) {
  // 获取选中的订单ID
  const checkedBoxes = document.querySelectorAll('.order-checkbox:checked');
  const orderIds = Array.from(checkedBoxes).map(cb => parseInt(cb.getAttribute('data-id')));

  if (orderIds.length === 0) {
    showToast('请先选择要操作的订单', 'warning');
    return;
  }

  const statusNames = { 0: '待处理', 1: '处理中', 2: '成功', 3: '失败', 4: '已退款' };
  const newStatusName = statusNames[newStatus];

  if (!confirm(`确定要将选中的 ${orderIds.length} 个订单状态改为"${newStatusName}"吗？`)) {
    return;
  }

  // 逐个更新订单
  let successCount = 0;
  let failCount = 0;

  for (const orderId of orderIds) {
    const d = await apiRequest('PUT', `/api/orders/${orderId}/status`, {
      status: newStatus,
      auto_refund: false
    });

    if (d) {
      successCount++;
    } else {
      failCount++;
    }
  }

  // 显示结果
  if (failCount === 0) {
    showToast(`成功更新 ${successCount} 个订单`, 'success');
  } else {
    showToast(`成功更新 ${successCount} 个订单，失败 ${failCount} 个`, 'warning');
  }

  // 清空选择并重新加载
  checkedBoxes.forEach(cb => cb.checked = false);
  ordersLoad();
}

// 在HTML中添加批量操作按钮
function ordersAddBatchActions() {
  const filterBar = document.querySelector('#page-orders .filter-bar');
  if (!filterBar) return;

  // 检查是否已经添加过
  if (document.getElementById('batch-actions-container')) return;

  const batchActions = document.createElement('div');
  batchActions.id = 'batch-actions-container';
  batchActions.style.cssText = 'display:none;gap:8px;margin-left:16px;';
  batchActions.innerHTML = `
    <span style="font-size:13px;color:var(--text-2);">批量操作：</span>
    <button class="btn btn-sm btn-warning" onclick="orderBatchUpdate(1)">标记为处理中</button>
    <button class="btn btn-sm btn-success" onclick="orderBatchUpdate(2)">标记为成功</button>
    <button class="btn btn-sm btn-danger" onclick="orderBatchUpdate(3)">标记为失败</button>
    <button class="btn btn-sm btn-info" onclick="orderBatchUpdate(4)">退款</button>
  `;

  filterBar.appendChild(batchActions);

  // 监听复选框变化
  const tbody = document.getElementById('orders-tbody');
  if (tbody) {
    tbody.addEventListener('change', (e) => {
      if (e.target.classList.contains('order-checkbox')) {
        const checkedCount = document.querySelectorAll('.order-checkbox:checked').length;
        const container = document.getElementById('batch-actions-container');
        if (container) {
          container.style.display = checkedCount > 0 ? 'flex' : 'none';
        }
      }
    });
  }
}

function ordersRenderTable() {
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;

  if (!_orders.filtered.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text-3);">暂无数据</td></tr>`;
    return;
  }

  const statusMap = {
    0: ['待处理', 'badge-warning'],
    1: ['处理中', 'badge-info'],
    2: ['成功', 'badge-success'],
    3: ['失败', 'badge-danger'],
    4: ['已退款', 'badge-info']
  };

  tbody.innerHTML = _orders.filtered.map(o => {
    const [sLabel, sBadge] = statusMap[o.status] || [o.status, 'badge-ghost'];
    const created = o.created_at ? o.created_at.replace(' ', ' ').slice(0, 16) : '';
    const account = o.remark ? o.remark.replace(/^充值账号:\s*/, '') : '—';

    // 根据订单状态生成操作按钮
    let actionButtons = '';
    switch (o.status) {
      case 0: // 待处理
        actionButtons = `
          <button class="btn btn-sm btn-warning" onclick="orderQuickUpdate(${o.id}, 1)">处理中</button>
          <button class="btn btn-sm btn-success" onclick="orderQuickUpdate(${o.id}, 2)">成功</button>
          <button class="btn btn-sm btn-danger" onclick="orderQuickUpdate(${o.id}, 3)">失败</button>
        `;
        break;
      case 1: // 处理中
        actionButtons = `
          <button class="btn btn-sm btn-success" onclick="orderQuickUpdate(${o.id}, 2)">成功</button>
          <button class="btn btn-sm btn-danger" onclick="orderQuickUpdate(${o.id}, 3)">失败</button>
        `;
        break;
      case 2: // 成功
        actionButtons = `<button class="btn btn-sm btn-info" onclick="orderQuickUpdate(${o.id}, 4)">退款</button>`;
        break;
      case 3: // 失败
        actionButtons = `
          <button class="btn btn-sm btn-warning" onclick="orderQuickUpdate(${o.id}, 0)">重试</button>
          <button class="btn btn-sm btn-info" onclick="orderQuickUpdate(${o.id}, 4)">退款</button>
        `;
        break;
      case 4: // 已退款
        actionButtons = `<span style="color:var(--text-3);font-size:12px;">已退款</span>`;
        break;
    }

    return `<tr>
      <td><input type="checkbox" class="order-checkbox" data-id="${o.id}"></td>
      <td class="mono">${escHtml(o.order_no || '')}</td>
      <td>${escHtml(o.member_name || '—')}</td>
      <td>${escHtml(o.product_name || o.order_type)}</td>
      <td class="mono">${escHtml(account)}</td>
      <td class="num">¥${Number(o.amount || 0).toFixed(2)}</td>
      <td>—</td>
      <td><span class="badge ${sBadge}">${sLabel}</span></td>
      <td>${created}</td>
      <td>${actionButtons} <button class="btn-link" onclick="orderDetailOpen(${o.id})" style="margin-left:5px;">详情</button></td>
    </tr>`;
  }).join('');

/* ═══════════════════════════════════════════════════════════════
   订单详情功能
   ═══════════════════════════════════════════════════════════════ */
let _currentOrderDetail = null;

async function orderDetailOpen(orderId) {
  const d = await apiRequest('GET', `/api/orders/${orderId}`);
  if (!d || !d.data) {
    showToast('加载订单详情失败', 'error');
    return;
  }

  _currentOrderDetail = d.data;

  // 填充基本信息
  document.getElementById('order-detail-id').value = orderId;
  document.getElementById('order-detail-no').textContent = d.data.order_no || '—';
  document.getElementById('order-detail-amount').textContent = `¥${Number(d.data.amount || 0).toFixed(2)}`;

  // 用户信息
  const memberEl = document.getElementById('order-detail-member');
  if (d.data.member_info) {
    memberEl.textContent = `${d.data.member_info.username} (余额: ¥${d.data.member_info.balance})`;
  } else {
    memberEl.textContent = d.data.member_name || '—';
  }

  // 产品信息
  const productEl = document.getElementById('order-detail-product');
  if (d.data.product_info) {
    productEl.textContent = `${d.data.product_info.name} (成本价: ¥${d.data.product_info.cost_price})`;
  } else {
    productEl.textContent = d.data.product_name || '—';
  }

  // 充值账号
  const account = d.data.remark ? d.data.remark.replace(/^充值账号:\s*/, '') : '—';
  document.getElementById('order-detail-account').textContent = account;

  // 订单类型
  const typeEl = document.getElementById('order-detail-type');
  typeEl.textContent = d.data.order_type === 'consume' ? '消费' : d.data.order_type === 'recharge' ? '充值' : '—';

  // 状态
  const statusMap = {
    0: ['待处理', 'badge-warning'],
    1: ['处理中', 'badge-info'],
    2: ['成功', 'badge-success'],
    3: ['失败', 'badge-danger'],
    4: ['已退款', 'badge-info']
  };
  const [sLabel, sBadge] = statusMap[d.data.status] || [d.data.status, 'badge-ghost'];
  const statusEl = document.getElementById('order-detail-status');
  statusEl.innerHTML = `<span class="badge ${sBadge}">${sLabel}</span>`;

  // 创建时间
  document.getElementById('order-detail-created').textContent = d.data.created_at || '—';

  // 备注
  document.getElementById('order-detail-remark').value = d.data.remark || '';

  // 生成操作按钮
  orderDetailGenerateActions(d.data.status);

  showModal('modal-order-detail');
}

function orderDetailGenerateActions(status) {
  const actionsEl = document.getElementById('order-detail-actions');
  let buttons = [];

  switch (status) {
    case 0: // 待处理
      buttons = [
        { label: '标记为处理中', status: 1, btnClass: 'btn-warning' },
        { label: '标记为成功', status: 2, btnClass: 'btn-success' },
        { label: '标记为失败', status: 3, btnClass: 'btn-danger' }
      ];
      break;
    case 1: // 处理中
      buttons = [
        { label: '标记为成功', status: 2, btnClass: 'btn-success' },
        { label: '标记为失败', status: 3, btnClass: 'btn-danger' }
      ];
      break;
    case 3: // 失败
      buttons = [
        { label: '重试', status: 0, btnClass: 'btn-warning' },
        { label: '退款', status: 4, btnClass: 'btn-info' }
      ];
      break;
    case 2: // 成功
      buttons = [
        { label: '退款', status: 4, btnClass: 'btn-info' }
      ];
      break;
    case 4: // 已退款
      buttons = [];
      break;
  }

  if (buttons.length === 0) {
    actionsEl.innerHTML = '<div style="text-align:center;color:var(--text-3);font-size:13px;">暂无可执行操作</div>';
    return;
  }

  actionsEl.innerHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      ${buttons.map(b => `<button class="btn ${b.btnClass}" onclick="orderUpdateStatus(${b.status})">${b.label}</button>`).join('')}
    </div>
  `;
}

async function orderUpdateStatus(newStatus) {
  if (!_currentOrderDetail) return;

  const statusNames = { 0: '待处理', 1: '处理中', 2: '成功', 3: '失败', 4: '已退款' };
  const currentStatusName = statusNames[_currentOrderDetail.status];
  const newStatusName = statusNames[newStatus];

  if (!confirm(`确定要将订单状态从"${currentStatusName}"改为"${newStatusName}"吗？`)) {
    return;
  }

  // 管理员手动操作：不自动退款
  const d = await apiRequest('PUT', `/api/orders/${_currentOrderDetail.id}/status`, {
    status: newStatus,
    remark: document.getElementById('order-detail-remark').value,
    auto_refund: false  // 管理员手动操作，失败时不自动退款
  });

  if (!d) return;

  showToast('订单状态更新成功', 'success');
  hideModal('modal-order-detail');
  ordersLoad(); // 重新加载订单列表
}

async function orderDetailSaveRemark() {
  if (!_currentOrderDetail) return;

  const newRemark = document.getElementById('order-detail-remark').value;
  const d = await apiRequest('PUT', `/api/orders/${_currentOrderDetail.id}/status`, {
    status: _currentOrderDetail.status,
    remark: newRemark
  });

  if (!d) return;

  _currentOrderDetail.remark = newRemark;
  showToast('备注保存成功', 'success');
}
