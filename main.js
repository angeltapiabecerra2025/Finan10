/* ═══════════════════════════════════════════════
   Finance-Ang | main.js
   ═══════════════════════════════════════════════ */

// ─── Auth ─────────────────────────────────────────────────────────────────────
const USER_KEY  = 'financeAng_user';   // { name, pin }
const DATA_KEY  = 'financeAng_data';   // the financial state

let pinBuffer = '';

// Entry point — decides which screen to show
function initAuth() {
  const user = getSavedUser();
  if (!user) {
    showRegisterScreen();
  } else {
    showLoginScreen(user);
  }
}

function getSavedUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
function showRegisterScreen() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('register-panel').style.display = 'block';
  document.getElementById('login-panel').style.display    = 'none';
}

function submitRegister() {
  const name   = document.getElementById('reg-name').value.trim();
  const pin    = document.getElementById('reg-pin').value.trim();
  const pinCfm = document.getElementById('reg-pin-confirm').value.trim();
  const errEl  = document.getElementById('reg-error');

  errEl.textContent = '';

  if (!name) { errEl.textContent = 'Ingresa tu nombre.'; return; }
  if (!/^\d{4}$/.test(pin)) { errEl.textContent = 'El PIN debe ser 4 dígitos numéricos.'; return; }
  if (pin !== pinCfm) { errEl.textContent = 'Los PINs no coinciden.'; return; }

  localStorage.setItem(USER_KEY, JSON.stringify({ name, pin }));
  enterApp();
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function showLoginScreen(user) {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('register-panel').style.display = 'none';
  document.getElementById('login-panel').style.display    = 'block';

  const initial = user.name.trim().charAt(0).toUpperCase();
  document.getElementById('login-initial').textContent = initial;
  document.getElementById('login-name').textContent    = user.name;

  pinBuffer = '';
  updateAuthDots();
  document.getElementById('auth-pin-error').textContent = '';
}

function authPinKey(digit) {
  if (pinBuffer.length >= 4) return;
  pinBuffer += digit;
  updateAuthDots();
  if (pinBuffer.length === 4) setTimeout(checkAuthPin, 150);
}

function authPinBackspace() {
  pinBuffer = pinBuffer.slice(0, -1);
  updateAuthDots();
  document.getElementById('auth-pin-error').textContent = '';
}

function updateAuthDots() {
  for (let i = 0; i < 4; i++) {
    const d = document.getElementById(`auth-dot-${i}`);
    if (d) d.classList.toggle('filled', i < pinBuffer.length);
  }
}

function checkAuthPin() {
  const user = getSavedUser();
  if (!user) return;
  if (pinBuffer === user.pin) {
    enterApp();
  } else {
    document.getElementById('auth-pin-error').textContent = 'PIN incorrecto. Intenta de nuevo.';
    pinBuffer = '';
    updateAuthDots();
  }
}

// ── ENTER APP ──────────────────────────────────────────────────────────────────
function enterApp() {
  // Hide auth, show app
  document.getElementById('auth-screen').style.display  = 'none';
  document.getElementById('app-layout').style.display   = '';
  document.getElementById('mobile-nav').style.display   = '';

  loadState();
  setCurrentMonth();
  document.getElementById('tx-date').value = today();
  initCharts();
  renderAll();
  applyPrivacyIcons();

  // Show user name in settings
  const user = getSavedUser();
  const el = document.getElementById('settings-username');
  if (el && user) el.textContent = user.name;
}

// Reset user (for settings)
function resetUser() {
  if (!confirm('¿Restablecer usuario? Perderás el PIN guardado pero los datos financieros se conservan.')) return;
  localStorage.removeItem(USER_KEY);
  location.reload();
}

// ─── State ───────────────────────────────────────────────────────────────────
let state = {
  transactions: [],
  savings: [],
  savingsLog: [],
  privacy: { balance: false, income: false }
};

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  document.getElementById('tx-form').addEventListener('submit', onNewTransaction);
  document.getElementById('daily-form').addEventListener('submit', onDailyExpense);
  document.getElementById('savings-form').addEventListener('submit', onNewSaving);
  const logForm = document.getElementById('log-saving-form');
  if (logForm) logForm.addEventListener('submit', onLogSaving);
});




// ─── Helpers ──────────────────────────────────────────────────────────────────
const CATEGORY_ES = {
  salary: 'Salario',
  food: 'Alimentación',
  transport: 'Transporte',
  housing: 'Vivienda',
  health: 'Salud',
  entertainment: 'Entretenimiento',
  other: 'Otros'
};

function translateCategory(cat) {
  return CATEGORY_ES[cat] || cat;
}

function today() { return new Date().toISOString().split('T')[0]; }


function clp(val) {
  return new Intl.NumberFormat('es-CL', { style:'currency', currency:'CLP' }).format(val);
}

function hiddenOrClp(val, field) {
  return state.privacy[field] ? '••••••' : clp(val);
}

// SVG paths for eye icon states
const SVG_EYE_OPEN = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>`;
const SVG_EYE_OFF  = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"/></svg>`;

// ─── Persistence ──────────────────────────────────────────────────────────────
function saveState() {
  localStorage.setItem(DATA_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(DATA_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    state = { ...state, ...parsed };
    if (!state.privacy) state.privacy = { balance:false, income:false };
    if (!state.savingsLog) state.savingsLog = [];
  } else {
    state = { transactions:[], savings:[], savingsLog:[], privacy:{ balance:false, income:false } };
  }
}

function clearAllData() {
  if (!confirm('¿Borrar TODOS los datos de este perfil? Esta acción es irreversible.')) return;
  state = { transactions:[], savings:[], savingsLog:[], privacy:{ balance:false, income:false } };
  saveState();
  location.reload();
}

// ─── Navigation ───────────────────────────────────────────────────────────────
const TABS = {
  dashboard:    { title:'Dashboard',             sub:'Resumen financiero del periodo.',           section:'tab-dashboard' },
  transactions: { title:'Transacciones',         sub:'Historial completo de movimientos.',        section:'tab-transactions' },
  daily:        { title:'Gasto Diario',          sub:'Registro rápido de gastos de hoy.',         section:'tab-daily' },
  savings:      { title:'Plan de Ahorro',        sub:'Tus metas y objetivos financieros.',        section:'tab-savings' },
  reuse:        { title:'Reutilizar Periodo',    sub:'Copia gastos de un mes anterior y ajústalos.', section:'tab-reuse' },
  settings:     { title:'Configuración',         sub:'Datos, privacidad y respaldo.',             section:'tab-settings' }
};

let currentTab = 'dashboard';

function switchTab(tabId) {
  if (!TABS[tabId]) return;
  currentTab = tabId;

  // Sections
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.getElementById(TABS[tabId].section).classList.add('active');

  // Sidebar nav items
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navEl = document.getElementById('nav-' + tabId);
  if (navEl) navEl.classList.add('active');

  // Mobile nav items
  document.querySelectorAll('.mobile-nav-item').forEach(el => el.classList.remove('active'));
  const mnavEl = document.getElementById('mnav-' + tabId);
  if (mnavEl) mnavEl.classList.add('active');

  // Topbar
  document.getElementById('page-title').textContent   = TABS[tabId].title;
  document.getElementById('page-subtitle').textContent = TABS[tabId].sub;

  // Close sidebar on mobile after navigation
  closeSidebar();

  // Refresh charts when going back to dashboard
  if (tabId === 'dashboard') updateCharts();
}

// ─── Sidebar Toggle (Mobile) ──────────────────────────────────────────────────
function toggleSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('mobile-overlay');
  const isOpen   = sidebar.classList.contains('open');
  if (isOpen) {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  } else {
    sidebar.classList.add('open');
    overlay.classList.add('visible');
  }
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('mobile-overlay').classList.remove('visible');
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// Close modal clicking backdrop
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('open');
  }
});

// ─── Privacy Toggle ───────────────────────────────────────────────────────────
const EYE_OPEN  = `<path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>`;
const EYE_OFF   = `<path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"/>`;

function togglePrivacy(field) {
  state.privacy[field] = !state.privacy[field];
  saveState();
  applyPrivacyIcons();
  renderAll(); // re-renders stats and also history lists
}

function applyPrivacyIcons() {
  const btnBalance = document.getElementById('eye-btn-balance');
  const btnIncome  = document.getElementById('eye-btn-income');
  if (btnBalance) btnBalance.innerHTML = state.privacy.balance ? SVG_EYE_OFF : SVG_EYE_OPEN;
  if (btnIncome)  btnIncome.innerHTML  = state.privacy.income  ? SVG_EYE_OFF : SVG_EYE_OPEN;
}

// ─── Date Filters ─────────────────────────────────────────────────────────────
function setCurrentMonth() {
  const now    = new Date();
  const first  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const last   = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().split('T')[0];
  document.getElementById('filter-start').value = first;
  document.getElementById('filter-end').value   = last;
  if (currentTab === 'dashboard') refreshDashboard();
}

function refreshDashboard() {
  renderStats();
  updateCharts();
  renderRecentList();
}

function getFiltered(customStart, customEnd) {
  const start = customStart || document.getElementById('filter-start').value || '';
  const end   = customEnd   || document.getElementById('filter-end').value   || '';
  return state.transactions.filter(tx => {
    if (start && tx.date < start) return false;
    if (end   && tx.date > end)   return false;
    return true;
  });
}

// ─── Render All ───────────────────────────────────────────────────────────────
function renderAll() {
  renderStats();
  renderRecentList();
  renderFullList();
  renderDailyList();
  renderSavings();
  renderSavingsHistory();
  updateCharts();
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function renderStats() {
  const filtered = getFiltered();

  // Balance = ingresos - gastos del periodo filtrado
  const totalBalance  = filtered.reduce(
    (acc, tx) => tx.type === 'income' ? acc + tx.amount : acc - tx.amount, 0
  );
  const periodIncome  = filtered.filter(t => t.type === 'income').reduce((a,t) => a+t.amount, 0);
  const periodExpense = filtered.filter(t => t.type === 'expense').reduce((a,t) => a+t.amount, 0);
  const dailyTotal    = state.transactions
    .filter(t => t.type === 'expense' && t.date === today())
    .reduce((a,t) => a+t.amount, 0);

  document.getElementById('stat-balance').textContent = hiddenOrClp(totalBalance, 'balance');
  document.getElementById('stat-income').textContent  = hiddenOrClp(periodIncome, 'income');
  document.getElementById('stat-expense').textContent = clp(periodExpense);
  document.getElementById('stat-daily').textContent   = clp(dailyTotal);

  const el2 = document.getElementById('stat-daily-2');
  if (el2) el2.textContent = clp(dailyTotal);
}

// ─── Transactions ─────────────────────────────────────────────────────────────
function onNewTransaction(e) {
  e.preventDefault();
  const type     = document.getElementById('tx-type').value;
  const category = document.getElementById('tx-category').value;
  const desc     = document.getElementById('tx-desc').value.trim();
  const date     = document.getElementById('tx-date').value;
  const amount   = parseFloat(document.getElementById('tx-amount').value);

  if (!desc || !date || isNaN(amount) || amount <= 0) return;

  state.transactions.push({ id: Date.now(), type, category, description:desc, amount, date });
  saveState();
  closeModal('tx-modal');
  document.getElementById('tx-form').reset();
  document.getElementById('tx-date').value = today();
  renderAll();
}

function onDailyExpense(e) {
  e.preventDefault();
  const desc   = document.getElementById('daily-desc').value.trim();
  const amount = parseFloat(document.getElementById('daily-amount').value);

  if (!desc || isNaN(amount) || amount <= 0) return;

  state.transactions.push({ id:Date.now(), type:'expense', category:'other', description:desc, amount, date:today() });
  saveState();
  document.getElementById('daily-form').reset();
  renderAll();
}

function deleteTransaction(id) {
  if (!confirm('¿Eliminar esta transacción?')) return;
  const tx = state.transactions.find(t => t.id === id);
  if (tx && tx.savingId) {
    const saving = state.savings.find(s => s.id === tx.savingId);
    if (saving) {
      saving.current = Math.max(0, saving.current - tx.amount);
    }
  } else if (tx && tx.description.startsWith('Ahorro: ')) {
    // Fallback if they created a contribution before we added savingId
    const sName = tx.description.replace('Ahorro: ', '').trim();
    const saving = state.savings.find(s => s.name === sName);
    if (saving) {
      saving.current = Math.max(0, saving.current - tx.amount);
    }
  }

  state.transactions = state.transactions.filter(tx => tx.id !== id);
  saveState();
  renderAll();
}

function txItemHTML(tx) {
  const isIncome  = tx.type === 'income';
  const iconPath  = isIncome
    ? `<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0-5.94-2.28m5.94 2.28-2.28 5.941"/>`
    : `<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181"/>`;

  const amtDisplay = isIncome ? (state.privacy.income ? '••••••' : '+' + clp(tx.amount)) : '-' + clp(tx.amount);

  return `
    <div class="tx-item">
      <div class="tx-left">
        <div class="tx-icon ${tx.type}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">${iconPath}</svg>
        </div>
        <div>
          <div class="tx-name">${tx.description}</div>
          <div class="tx-meta">${tx.date} · ${translateCategory(tx.category)}</div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:0.75rem;">
        <div class="tx-amount ${tx.type}">${amtDisplay}</div>
        <button onclick="deleteTransaction(${tx.id})" title="Eliminar" style="background:none;border:none;cursor:pointer;color:var(--text-faint);padding:4px;border-radius:4px;display:flex;align-items:center;transition:var(--transition);" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-faint)'">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>
        </button>
      </div>
    </div>`;
}

function renderRecentList() {
  const sorted = getFiltered().sort((a,b) => b.date.localeCompare(a.date) || b.id - a.id);
  const el = document.getElementById('recent-list');
  if (el) el.innerHTML = sorted.slice(0,8).map(txItemHTML).join('') || `<div class="empty-state">Registra tu primera transacción 💰</div>`;
}

function renderFullList() {
  const sorted = [...state.transactions].sort((a,b) => b.date.localeCompare(a.date) || b.id - a.id);
  const el = document.getElementById('full-list');
  if (el) el.innerHTML = sorted.map(txItemHTML).join('') || `<div class="empty-state">Aún no hay movimientos registrados.</div>`;
}

function renderDailyList() {
  const todayTx = state.transactions.filter(t => t.type === 'expense' && t.date === today());
  const el = document.getElementById('daily-list');
  if (el) el.innerHTML = todayTx.map(txItemHTML).join('') || `<div class="empty-state">Libre de gastos hoy 🎉</div>`;
}

// ─── Savings ──────────────────────────────────────────────────────────────────
function onNewSaving(e) {
  e.preventDefault();
  const name   = document.getElementById('saving-name').value.trim();
  const target = parseFloat(document.getElementById('saving-target').value);

  if (!name || isNaN(target) || target <= 0) return;

  state.savings.push({ id:Date.now(), name, target, current:0 });
  saveState();
  document.getElementById('savings-form').reset();
  renderSavings();
}

function addContribution(id) {
  const rawAmt = prompt('¿Cuánto quieres añadir a este ahorro? (en CLP)');
  if (!rawAmt) return;
  const amount = parseFloat(rawAmt);
  if (isNaN(amount) || amount <= 0) return;

  const saving = state.savings.find(s => s.id === id);
  if (saving) {
    saving.current += amount;
    state.transactions.push({
      id: Date.now(),
      type:'expense',
      category:'other',
      description:`Ahorro: ${saving.name}`,
      amount,
      date: today(),
      savingId: saving.id
    });
    saveState();
    renderAll();
  }
}

function deleteObjective(id) {
  if (!confirm('¿Seguro que deseas eliminar esta meta de ahorro? No afectará a las transferencias hechas.')) return;
  state.savings = state.savings.filter(s => s.id !== id);
  saveState();
  renderAll();
}

function editObjective(id) {
  const saving = state.savings.find(s => s.id === id);
  if (!saving) return;
  const rawAmt = prompt(`Actualiza el total ahorrado actualmente para "${saving.name}":`, saving.current);
  if (rawAmt === null) return;
  const amount = parseFloat(rawAmt);
  if (isNaN(amount) || amount < 0) return;
  saving.current = amount;
  saveState();
  renderAll();
}

function renderSavings() {
  const el = document.getElementById('savings-list');
  if (!el) return;
  el.innerHTML = state.savings.map(s => {
    const pct = Math.min((s.current / s.target)*100, 100).toFixed(0);
    
    // Buscar los detalles (aportes) para esta meta
    const myTxs = state.transactions.filter(t => t.savingId === s.id || (t.description === `Ahorro: ${s.name}` && !t.savingId));
    let detailsHtml = '';
    if (myTxs.length > 0) {
      detailsHtml = '<div style="margin-top:0.75rem; padding:0.5rem; background:rgba(0,0,0,0.15); border-radius:6px;">' + 
        '<div style="font-size:0.7rem; color:var(--text-faint); margin-bottom:4px; text-transform:uppercase;">Detalles de Aportes</div>' +
        myTxs.map(t => 
          `<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; border-bottom:1px solid var(--border); padding:4px 0;">
             <span style="color:var(--text-muted);">${t.date}</span>
             <div style="display:flex; gap:0.5rem; align-items:center;">
               <span style="font-weight:600; color:var(--text);">${clp(t.amount)}</span>
               <button onclick="deleteTransaction(${t.id})" title="Eliminar este aporte" style="color:var(--danger); background:none; border:none; cursor:pointer;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">✖</button>
             </div>
           </div>`
        ).join('') + 
      '</div>';
    }

    return `
      <div class="saving-row">
        <div class="saving-header">
          <div>
            <div class="saving-name">${s.name}</div>
            <div class="text-muted text-sm" style="margin-top:2px;">${clp(s.current)} de ${clp(s.target)} (${pct}%)</div>
          </div>
          <div style="display:flex; gap:0.25rem;">
            <button class="btn btn-ghost btn-sm" onclick="addContribution(${s.id})" title="Añadir a la meta">+ Añadir</button>
            <button class="btn btn-ghost btn-sm" onclick="editObjective(${s.id})" title="Editar acumulado">Editar</button>
            <button class="btn btn-danger btn-sm" onclick="deleteObjective(${s.id})" title="Eliminar Objetivo" style="padding:0.45rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>
            </button>
          </div>
        </div>
        <div class="progress-bar mt-1">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        ${detailsHtml}
      </div>`;
  }).join('') || `<div class="empty-state">Crea tu primera meta de ahorro 🏦</div>`;
}

// ─── Savings Log (Historial) ──────────────────────────────────────────────────
let currentSuggestedSavings = 0;

function openLogSavingModal() {
  const currentMonth = today().substring(0, 7);
  document.getElementById('log-month').value = currentMonth;
  document.getElementById('log-suggested').value = clp(currentSuggestedSavings);
  document.getElementById('log-suggested').dataset.val = currentSuggestedSavings;
  openModal('log-saving-modal');
}

function onLogSaving(e) {
  e.preventDefault();
  const month = document.getElementById('log-month').value;
  const realAmount = parseFloat(document.getElementById('log-amount').value);
  const suggestedAmount = parseFloat(document.getElementById('log-suggested').dataset.val || 0);

  if (!month || isNaN(realAmount) || realAmount < 0) return;

  const existingIdx = state.savingsLog.findIndex(l => l.month === month);
  const logObj = {
    id: Date.now(),
    month,
    suggested: suggestedAmount,
    real: realAmount,
    percentage: suggestedAmount > 0 ? (realAmount / suggestedAmount) * 100 : (realAmount > 0 ? 100 : 0)
  };

  if (existingIdx > -1) {
    state.savingsLog[existingIdx] = logObj;
  } else {
    state.savingsLog.push(logObj);
  }

  saveState();
  closeModal('log-saving-modal');
  document.getElementById('log-saving-form').reset();
  renderAll();
}

function renderSavingsHistory() {
  const listEl = document.getElementById('savings-log-list');
  if (!listEl) return;
  
  const sorted = [...state.savingsLog].sort((a,b) => b.month.localeCompare(a.month)); // newest first
  if (!sorted.length) {
    listEl.innerHTML = `<div class="empty-state">No hay logros registrados aún. ¡Registra el de este mes!</div>`;
    return;
  }
  
  listEl.innerHTML = sorted.map(log => {
      const formatMonth = yyyymm => {
        const [y, m] = yyyymm.split('-');
        const date = new Date(y, m - 1);
        return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      };
      
      let badgeClass = 'low';
      if (log.percentage >= 90) badgeClass = 'high';
      else if (log.percentage >= 50) badgeClass = 'medium';
      
      const icon = log.percentage >= 90 ? '🏆' : (log.percentage >= 50 ? '👍' : '⚠️');
      
      return `
        <div class="log-item">
          <div>
            <div style="font-weight:600; text-transform:capitalize;">${formatMonth(log.month)}</div>
            <div class="text-sm text-muted">Sugerido: ${clp(log.suggested)}</div>
          </div>
          <div style="display:flex; align-items:flex-end; gap:1rem;">
            <div style="text-align:right;">
              <div style="font-weight:700; color:var(--text);">${clp(log.real)}</div>
              <div class="log-badge ${badgeClass} mt-1">${icon} ${log.percentage.toFixed(0)}%</div>
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <button onclick="editSavingsLog(${log.id})" title="Editar" style="background:none;border:none;cursor:pointer;color:var(--text-faint);" onmouseover="this.style.color='var(--primary-light)'" onmouseout="this.style.color='var(--text-faint)'">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.89 1.147l-2.848.711a.75.75 0 0 1-.9-.9l.71-2.85a4.5 4.5 0 0 1 1.146-1.89L16.862 4.487Zm0 0L19.5 7.125"/></svg>
              </button>
              <button onclick="deleteSavingsLog(${log.id})" title="Eliminar" style="background:none;border:none;cursor:pointer;color:var(--text-faint);" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-faint)'">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>
              </button>
            </div>
          </div>
        </div>
      `;
  }).join('');
}

function deleteSavingsLog(id) {
  if (!confirm('¿Eliminar este registro mensual de ahorro?')) return;
  state.savingsLog = state.savingsLog.filter(l => l.id !== id);
  saveState();
  renderAll();
}

function editSavingsLog(id) {
  const log = state.savingsLog.find(l => l.id === id);
  if (!log) return;
  const rawAmt = prompt(`Edita el ahorro real alcanzado en ${log.month}:`, log.real);
  if (rawAmt === null) return;
  const amount = parseFloat(rawAmt);
  if (isNaN(amount) || amount < 0) return;
  
  log.real = amount;
  log.percentage = log.suggested > 0 ? (amount / log.suggested) * 100 : (amount > 0 ? 100 : 0);
  saveState();
  renderAll();
}

// ─── Charts ───────────────────────────────────────────────────────────────────
let donutChart = null;
let barChart   = null;
let projectionChart = null;

const CHART_COLORS = ['#6366f1','#10b981','#f59e0b','#f43f5e','#8b5cf6','#ec4899','#3b82f6','#14b8a6'];

function initCharts() {
  const donutCanvas = document.getElementById('chart-donut');
  const barCanvas   = document.getElementById('chart-bar');
  const projCanvas  = document.getElementById('chart-projection');
  if (!donutCanvas || !barCanvas) return;

  donutChart = new Chart(donutCanvas, {
    type: 'doughnut',
    data: { labels:[], datasets:[{ data:[], backgroundColor:CHART_COLORS, borderWidth:0, hoverOffset:8 }] },
    options: {
      responsive:true,
      maintainAspectRatio:false,
      cutout:'70%',
      plugins: {
        legend: { position:'bottom', labels:{ color:'#94a3b8', font:{ family:'Outfit', size:11 }, padding:12 } }
      }
    }
  });

  barChart = new Chart(barCanvas, {
    type: 'bar',
    data: {
      labels: [],
      datasets:[
        { label:'Ingresos', data:[], backgroundColor:'#10b981', borderRadius:6 },
        { label:'Gastos',   data:[], backgroundColor:'#f43f5e',   borderRadius:6 }
      ]
    },
    options: {
      responsive:true,
      maintainAspectRatio:false,
      scales:{
        x:{ ticks:{ color:'#94a3b8', font:{ family:'Outfit' } }, grid:{ display:false } },
        y:{ ticks:{ color:'#94a3b8', font:{ family:'Outfit' }, callback: v => clp(v) }, grid:{ color:'rgba(255,255,255,0.04)' } }
      },
      plugins: { legend:{ labels:{ color:'#94a3b8', font:{ family:'Outfit', size:11 }, padding:12 } } }
    }
  });

  if (projCanvas) {
    projectionChart = new Chart(projCanvas, {
      type: 'line',
      data: {
        labels: ['Mes 1','Mes 2','Mes 3','Mes 4','Mes 5','Mes 6'],
        datasets:[
          { label:'Ahorro Acumulado Proyectado', data:[0,0,0,0,0,0], borderColor: '#818cf8', backgroundColor: 'rgba(129,140,248,0.2)', fill: true, tension: 0.4, borderWidth: 2 }
        ]
      },
      options: {
        responsive:true,
        maintainAspectRatio:false,
        scales:{
          x:{ ticks:{ color:'#94a3b8', font:{ family:'Outfit' } }, grid:{ display:false } },
          y:{ ticks:{ color:'#94a3b8', font:{ family:'Outfit' }, callback: v => clp(v) }, grid:{ color:'rgba(255,255,255,0.04)' } }
        },
        plugins: { legend:{ display: false }, tooltip: { bodyFont: { family: 'Outfit'}, titleFont: { family: 'Outfit'} } }
      }
    });
  }

  updateCharts();
}

function updateCharts() {
  if (!donutChart || !barChart) return;

  const filtered = getFiltered();
  const cats = {};
  filtered.filter(t => t.type === 'expense').forEach(t => {
    const catName = translateCategory(t.category);
    cats[catName] = (cats[catName] || 0) + t.amount;
  });
  donutChart.data.labels = Object.keys(cats);
  donutChart.data.datasets[0].data = Object.values(cats);
  donutChart.update();

  // Monthly bar chart logic
  const groupedByMonth = {};
  filtered.forEach(tx => {
    const month = tx.date.substring(0, 7); // YYYY-MM
    if (!groupedByMonth[month]) groupedByMonth[month] = { income: 0, expense: 0 };
    groupedByMonth[month][tx.type] += tx.amount;
  });

  const sortedMonths = Object.keys(groupedByMonth).sort();
  const formatMonth = yyyymm => {
    const [y, m] = yyyymm.split('-');
    const date = new Date(y, m - 1);
    return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
  };

  barChart.data.labels = sortedMonths.map(formatMonth);
  barChart.data.datasets[0].data = sortedMonths.map(m => groupedByMonth[m].income);
  barChart.data.datasets[1].data = sortedMonths.map(m => groupedByMonth[m].expense);
  barChart.update();

  calculateSavingsSuggestion(filtered);
}

function calculateSavingsSuggestion(filtered) {
  const incomes = filtered.filter(t => t.type === 'income').reduce((a,t) => a+t.amount, 0);
  const expenses = filtered.filter(t => t.type === 'expense').reduce((a,t) => a+t.amount, 0);
  
  const months = new Set(filtered.map(t => t.date.substring(0,7))).size || 1;
  const avgIncome = incomes / months;
  const avgExpense = expenses / months;
  const surplus = avgIncome - avgExpense;
  
  // Suggest 20% of the surplus
  currentSuggestedSavings = surplus > 0 ? surplus * 0.2 : 0;
  
  const elSurplus = document.getElementById('suggest-surplus');
  const elAmount = document.getElementById('suggest-amount');
  if (elSurplus) elSurplus.textContent = clp(surplus > 0 ? surplus : 0);
  if (elAmount) {
     elAmount.innerHTML = `${clp(currentSuggestedSavings)} <span style="font-size:0.8rem; font-weight:500; color:var(--text-faint);">/ mes</span>`;
  }
  
  if (projectionChart) {
    let accumulated = 0;
    const projectedData = [];
    for(let i=1; i<=6; i++) {
       accumulated += currentSuggestedSavings;
       projectedData.push(accumulated);
    }
    projectionChart.data.datasets[0].data = projectedData;
    projectionChart.update();
  }
}


// ─── Reutilizar Periodo ───────────────────────────────────────────────────────

// Renders the source-period selector and transaction table
function renderReusePanel() {
  const startEl = document.getElementById('reuse-src-start');
  const endEl   = document.getElementById('reuse-src-end');
  const tbody   = document.getElementById('reuse-tbody');
  const info    = document.getElementById('reuse-info');
  if (!startEl || !tbody) return;

  const start = startEl.value;
  const end   = endEl.value;

  if (!start || !end) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Selecciona un rango de fechas de origen.</td></tr>`;
    return;
  }

  const source = state.transactions.filter(tx => tx.date >= start && tx.date <= end)
                   .sort((a,b) => a.date.localeCompare(b.date));

  if (source.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Sin transacciones en ese periodo.</td></tr>`;
    if (info) info.textContent = '';
    return;
  }

  if (info) info.textContent = `${source.length} transacción(es) encontradas. Edita los montos y asigna la nueva fecha.`;

  tbody.innerHTML = source.map((tx, i) => `
    <tr style="border-bottom:1px solid var(--border);">
      <td style="padding:0.6rem 0.5rem;">
        <span class="tx-amount ${tx.type}" style="font-size:0.78rem;">${tx.type === 'income' ? '▲ Ingreso' : '▼ Gasto'}</span>
      </td>
      <td style="padding:0.6rem 0.5rem; color:var(--text); font-size:0.875rem;">${tx.description}</td>
      <td style="padding:0.6rem 0.5rem; color:var(--text-muted); font-size:0.8rem;">${translateCategory(tx.category)}</td>
      <td style="padding:0.6rem 0.5rem;">
        <input type="number" id="reuse-amt-${i}" value="${tx.amount}" min="1"
          style="width:110px; background:var(--bg-card2); border:1px solid var(--border); border-radius:6px;
                 color:var(--text); padding:4px 8px; font-size:0.85rem; font-family:Outfit,sans-serif;"
          data-idx="${i}">
      </td>
      <td style="padding:0.6rem 0.5rem;">
        <input type="date" id="reuse-date-${i}" value="${tx.date}"
          style="background:var(--bg-card2); border:1px solid var(--border); border-radius:6px;
                 color:var(--text); padding:4px 8px; font-size:0.85rem; font-family:Outfit,sans-serif;"
          data-idx="${i}">
      </td>
    </tr>
  `).join('');

  // store source snapshot so applyReuse can reference types/descs
  window._reuseSource = source;
}

function applyReuse() {
  const source = window._reuseSource;
  if (!source || source.length === 0) { alert('Primero carga un periodo origen.'); return; }

  let applied = 0;
  const errors = [];

  source.forEach((tx, i) => {
    const amtEl  = document.getElementById(`reuse-amt-${i}`);
    const dateEl = document.getElementById(`reuse-date-${i}`);
    const amount = parseFloat(amtEl?.value);
    const date   = dateEl?.value;

    if (!date) { errors.push(`Fila ${i+1}: falta fecha.`); return; }
    if (isNaN(amount) || amount <= 0) { errors.push(`Fila ${i+1}: monto inválido.`); return; }

    state.transactions.push({
      id: Date.now() + i,
      type: tx.type,
      category: tx.category,
      description: tx.description,
      amount,
      date
    });
    applied++;
  });

  if (errors.length) {
    alert('Algunas filas se omitieron:\n' + errors.join('\n'));
  }

  if (applied > 0) {
    saveState();
    renderAll();
    alert(`✅ ${applied} transacción(es) aplicadas.`);
  }
}

// ─── Backup ───────────────────────────────────────────────────────────────────
function exportData() {
  const user = getSavedUser();
  const userName = user && user.name ? user.name.replace(/\s+/g, '_').toLowerCase() : 'respaldo';
  
  const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `financeang_${userName}_${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (Array.isArray(imported.transactions)) {
        state = imported;
        if (!state.privacy) state.privacy = { balance:false, income:false };
        if (!state.savingsLog) state.savingsLog = [];
        saveState();
        location.reload();
      } else { alert('Archivo JSON inválido.'); }
    } catch { alert('Error al leer el archivo.'); }
  };
  reader.readAsText(file);
}
