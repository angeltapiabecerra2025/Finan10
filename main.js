// State management
let state = {
    transactions: [],
    savings: [],
    privacyBalance: false,
    privacyIncome: false
};

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    
    // Set default filter dates (current month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    
    document.getElementById('filter-start').value = firstDay;
    document.getElementById('filter-end').value = lastDay;
    const txDateInput = document.getElementById('tx-date');
    if (txDateInput) txDateInput.value = now.toISOString().split('T')[0];

    updateUI();
    initCharts();
    
    // Form Listeners
    document.getElementById('main-tx-form')?.addEventListener('submit', handleNewTransaction);
    document.getElementById('daily-expense-form')?.addEventListener('submit', handleDailyExpense);
    document.getElementById('savings-form')?.addEventListener('submit', handleNewSaving);
});

// --- State persistence ---

function saveState() {
    localStorage.setItem('finance_app_state_light', JSON.stringify(state));
    updateUI();
    updateCharts();
}

function loadState() {
    const saved = localStorage.getItem('finance_app_state_light');
    if (saved) {
        state = JSON.parse(saved);
        if (state.privacyBalance === undefined) state.privacyBalance = false;
        if (state.privacyIncome === undefined) state.privacyIncome = false;
    }
}

function clearAllData() {
    if (confirm('¿Borrar todos los datos? No se puede deshacer.')) {
        state = { transactions: [], savings: [], privacyBalance: false, privacyIncome: false };
        saveState();
        location.reload();
    }
}

// --- Privacy Toggles ---

function togglePrivacy(type) {
    if (type === 'balance') {
        state.privacyBalance = !state.privacyBalance;
        const icon = document.getElementById('eye-balance');
        icon?.setAttribute('data-lucide', state.privacyBalance ? 'eye-off' : 'eye');
    } else if (type === 'income') {
        state.privacyIncome = !state.privacyIncome;
        const icon = document.getElementById('eye-income');
        icon?.setAttribute('data-lucide', state.privacyIncome ? 'eye-off' : 'eye');
    }
    
    if (window.lucide) lucide.createIcons();
    saveState();
}

function formatValue(val, sensitiveType) {
    if (sensitiveType === 'balance' && state.privacyBalance) return '****';
    if (sensitiveType === 'income' && state.privacyIncome) return '****';
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);
}

// --- Navigation ---

function switchTab(tabId) {
    // Update active links (Desktop & Mobile Bottom Nav)
    const links = [...document.querySelectorAll('.nav-link'), ...document.querySelectorAll('.bottom-link')];
    
    links.forEach(link => {
        link.classList.remove('active');
        const onClickAttr = link.getAttribute('onclick') || '';
        if (onClickAttr.includes(`'${tabId}'`)) {
            link.classList.add('active');
        }
    });

    // Update section visibility
    document.querySelectorAll('.tab-content').forEach(section => {
        section.style.display = 'none';
    });
    const targetSection = document.getElementById(`${tabId}-section`);
    if (targetSection) targetSection.style.display = 'block';

    const titles = {
        'dashboard': { title: 'Dashboard', sub: 'Resumen financiero por periodo.' },
        'transactions': { title: 'Transacciones', sub: 'Historial completo de movimientos.' },
        'daily': { title: 'Gasto Diario', sub: 'Registro rápido del día.' },
        'savings': { title: 'Plan de Ahorro', sub: 'Metas y objetivos de ahorro.' },
        'settings': { title: 'Configuración', sub: 'Copia de seguridad y datos.' }
    };
    
    document.getElementById('page-title').innerText = titles[tabId].title;
    document.getElementById('page-subtitle').innerText = titles[tabId].sub;

    if (tabId === 'dashboard') updateCharts();
}

// --- Modals ---

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

// --- Logic: Transactions ---

function handleNewTransaction(e) {
    e.preventDefault();
    const type = document.getElementById('tx-type').value;
    const category = document.getElementById('tx-category').value;
    const desc = document.getElementById('tx-desc').value;
    const amount = parseFloat(document.getElementById('tx-amount').value);
    const dateInput = document.getElementById('tx-date').value;
    
    const newTx = {
        id: Date.now(),
        type,
        category,
        description: desc,
        amount,
        date: dateInput
    };
    
    state.transactions.push(newTx);
    saveState();
    closeModal('tx-modal');
    document.getElementById('main-tx-form').reset();
    document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
}

function handleDailyExpense(e) {
    e.preventDefault();
    const desc = document.getElementById('daily-desc').value;
    const amount = parseFloat(document.getElementById('daily-amount').value);
    
    const newTx = {
        id: Date.now(),
        type: 'expense',
        category: 'other',
        description: desc,
        amount,
        date: new Date().toISOString().split('T')[0]
    };
    
    state.transactions.push(newTx);
    saveState();
    document.getElementById('daily-expense-form').reset();
}

// --- Logic: Savings ---

function handleNewSaving(e) {
    e.preventDefault();
    const name = document.getElementById('saving-name').value;
    const target = parseFloat(document.getElementById('saving-target').value);
    
    state.savings.push({
        id: Date.now(),
        name,
        target,
        current: 0
    });
    
    saveState();
    document.getElementById('savings-form').reset();
}

function addContribution(id) {
    const amountStr = prompt('¿Cuánto quieres añadir a este ahorro?');
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return;
    
    const saving = state.savings.find(s => s.id === id);
    if (saving) {
        saving.current += amount;
        state.transactions.push({
            id: Date.now(),
            type: 'expense',
            category: 'other',
            description: `Depósito Ahorro: ${saving.name}`,
            amount: amount,
            date: new Date().toISOString().split('T')[0]
        });
        saveState();
    }
}

// --- UI Updates & Filtering ---

function getFilteredTransactions(customStart, customEnd) {
    const start = customStart || document.getElementById('filter-start').value;
    const end = customEnd || document.getElementById('filter-end').value;
    
    if (!start || !end) return state.transactions;
    
    return state.transactions.filter(tx => tx.date >= start && tx.date <= end);
}

function updateUI() {
    const filtered = getFilteredTransactions();
    
    const totalBalanceVal = state.transactions.reduce((acc, tx) => 
        tx.type === 'income' ? acc + tx.amount : acc - tx.amount, 0);
    
    const periodIncome = filtered
        .filter(tx => tx.type === 'income')
        .reduce((acc, tx) => acc + tx.amount, 0);
        
    const periodExpense = filtered
        .filter(tx => tx.type === 'expense')
        .reduce((acc, tx) => acc + tx.amount, 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const dailyTotalVal = state.transactions
        .filter(tx => tx.type === 'expense' && tx.date === todayStr)
        .reduce((acc, tx) => acc + tx.amount, 0);

    // Update Cards with sensitive check
    document.getElementById('total-balance').innerText = formatValue(totalBalanceVal, 'balance');
    document.getElementById('month-income').innerText = formatValue(periodIncome, 'income');
    document.getElementById('month-expense').innerText = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(periodExpense);
    document.getElementById('daily-total').innerText = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(dailyTotalVal);

    renderTransactionLists(filtered);
    renderDailyList(todayStr);
    renderSavings();
    
    if (window.lucide) lucide.createIcons();
}

function renderTransactionLists(filtered) {
    const recentList = document.getElementById('recent-transactions');
    const fullList = document.getElementById('full-transaction-list');
    
    const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    
    const createItemHTML = (tx) => `
        <div class="transaction-item">
            <div class="tx-info">
                <div class="tx-icon">
                    <i data-lucide="${tx.type === 'income' ? 'trending-up' : 'trending-down'}" style="color: ${tx.type === 'income' ? 'var(--success)' : 'var(--danger)'}"></i>
                </div>
                <div class="tx-details">
                    <span class="name">${tx.description}</span>
                    <span class="date">${tx.date} • ${tx.category}</span>
                </div>
            </div>
            <div class="amount" style="font-weight: 700; color: ${tx.type === 'income' ? 'var(--success)' : 'var(--danger)'}">
                ${tx.type === 'income' ? '+' : '-'}${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(tx.amount)}
            </div>
        </div>
    `;

    if (recentList) recentList.innerHTML = sorted.slice(0, 5).map(createItemHTML).join('') || '<p style="text-align:center; color:#94a3b8; padding:1.5rem;">Sin movimientos.</p>';
    if (fullList) fullList.innerHTML = sorted.map(createItemHTML).join('') || '<p style="text-align:center; color:#94a3b8; padding:1.5rem;">Sin movimientos.</p>';
}

function renderDailyList(todayStr) {
    const list = document.getElementById('daily-list');
    const todayTx = state.transactions.filter(tx => tx.type === 'expense' && tx.date === todayStr);
    
    if (list) list.innerHTML = todayTx.map(tx => `
        <div class="transaction-item">
            <span class="name">${tx.description}</span>
            <span class="amount expense" style="font-weight: 700;">${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(tx.amount)}</span>
        </div>
    `).join('') || '<p style="text-align:center; color:#94a3b8; padding:1.5rem;">Libre de gastos hoy.</p>';
}

function renderSavings() {
    const list = document.getElementById('savings-list');
    if (list) list.innerHTML = state.savings.map(s => {
        const progress = Math.min((s.current / s.target) * 100, 100);
        return `
            <div style="margin-bottom: 1.25rem;">
                <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-size:0.875rem;">
                    <strong style="color:var(--text-main);">${s.name}</strong>
                    <span style="color:var(--text-muted);">${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(s.current)} / ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(s.target)}</span>
                </div>
                <div style="background:#f3f4f6; height:8px; border-radius:4px; overflow:hidden; margin-bottom:0.75rem;">
                    <div style="background:var(--primary); height:100%; width:${progress}%; transition: width 0.3s ease;"></div>
                </div>
                <button class="btn btn-primary" style="padding: 0.4rem 0.75rem; font-size: 0.75rem;" onclick="addContribution(${s.id})">Añadir Fondos</button>
            </div>
        `;
    }).join('') || '<p style="text-align:center; color:#94a3b8; padding:1rem;">Crea tu primera meta.</p>';
}

// --- Charts ---

let expenseChart;
let barChart;

function initCharts() {
    const pieCanvas = document.getElementById('expenseChart');
    if (pieCanvas) {
        expenseChart = new Chart(pieCanvas.getContext('2d'), {
            type: 'doughnut',
            data: { labels: [], datasets: [{ data: [], backgroundColor: ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#94a3b8'], borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#475569', font: { family: 'Outfit' } } } }, cutout: '75%' }
        });
    }

    const barCanvas = document.getElementById('periodComparisonChart');
    if (barCanvas) {
        barChart = new Chart(barCanvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Ingresos', 'Gastos'],
                datasets: [
                    { label: 'Periodo Anterior', data: [0, 0], backgroundColor: '#e2e8f0', borderRadius: 6 },
                    { label: 'Periodo Actual', data: [0, 0], backgroundColor: '#10b981', borderRadius: 6 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: '#f1f5f9' }, ticks: { color: '#475569' } },
                    x: { ticks: { color: '#475569' } }
                },
                plugins: { legend: { labels: { color: '#475569', font: { family: 'Outfit' } } } }
            }
        });
    }
    
    updateCharts();
}

function updateCharts() {
    const currentData = getFilteredTransactions();
    
    if (expenseChart) {
        const categories = {};
        currentData.filter(tx => tx.type === 'expense').forEach(tx => {
            categories[tx.category] = (categories[tx.category] || 0) + tx.amount;
        });
        expenseChart.data.labels = Object.keys(categories);
        expenseChart.data.datasets[0].data = Object.values(categories);
        expenseChart.update();
    }

    if (barChart) {
        const start = new Date(document.getElementById('filter-start').value);
        const end = new Date(document.getElementById('filter-end').value);
        const diff = end - start;
        const prevEnd = new Date(start);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setTime(prevStart.getTime() - diff);

        const prevData = getFilteredTransactions(
            prevStart.toISOString().split('T')[0],
            prevEnd.toISOString().split('T')[0]
        );

        const incC = currentData.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
        const expC = currentData.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
        const incP = prevData.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
        const expP = prevData.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);

        barChart.data.datasets[0].data = [incP, expP];
        barChart.data.datasets[1].data = [incC, expC];
        barChart.update();
    }
}

// --- Data ---

function exportData() {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finanzas_backup.json`;
    link.click();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            state = JSON.parse(e.target.result);
            saveState();
            location.reload();
        } catch (err) { alert('Error de importación'); }
    };
    reader.readAsText(file);
}
