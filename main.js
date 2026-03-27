// State management
let state = {
    transactions: [],
    savings: []
};

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    updateUI();
    initChart();
    
    // Form Listeners
    document.getElementById('main-tx-form').addEventListener('submit', handleNewTransaction);
    document.getElementById('daily-expense-form').addEventListener('submit', handleDailyExpense);
    document.getElementById('savings-form').addEventListener('submit', handleNewSaving);
});

// --- State persistence ---

function saveState() {
    localStorage.setItem('finance_app_state', JSON.stringify(state));
    updateUI();
    updateChart();
}

function loadState() {
    const saved = localStorage.getItem('finance_app_state');
    if (saved) {
        state = JSON.parse(saved);
    }
}

function clearAllData() {
    if (confirm('¿Estás seguro de que quieres borrar todos los datos? Esta acción no se puede deshacer.')) {
        state = { transactions: [], savings: [] };
        saveState();
        location.reload();
    }
}

// --- UI Navigation ---

function switchTab(tabId) {
    // Update active links (Desktop & Mobile)
    const links = [...document.querySelectorAll('.nav-link'), ...document.querySelectorAll('.mobile-nav-link')];
    
    links.forEach(link => {
        link.classList.remove('active');
        // Match by text or by the onclick attribute containing the tabId
        const onClickAttr = link.getAttribute('onclick') || '';
        if (onClickAttr.includes(`'${tabId}'`)) {
            link.classList.add('active');
        }
    });

    // Update section visibility
    document.querySelectorAll('.tab-content').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(`${tabId}-section`).style.display = 'block';

    // Update Header
    const titles = {
        'dashboard': { title: 'Dashboard', sub: 'Bienvenido de nuevo, acá está tu resumen.' },
        'transactions': { title: 'Transacciones', sub: 'Historial completo de tus finanzas.' },
        'daily': { title: 'Gasto Diario', sub: 'Registra tus gastos rápidos de hoy.' },
        'savings': { title: 'Ahorro', sub: 'Tus metas y planes a largo plazo.' },
        'settings': { title: 'Configuración', sub: 'Gestión de datos y personalización.' }
    };
    
    document.getElementById('page-title').innerText = titles[tabId].title;
    document.getElementById('page-subtitle').innerText = titles[tabId].sub;

    if (tabId === 'dashboard') updateChart();
}

// --- Modals ---

function openModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

// --- Logic: Transactions ---

function handleNewTransaction(e) {
    e.preventDefault();
    const type = document.getElementById('tx-type').value;
    const category = document.getElementById('tx-category').value;
    const desc = document.getElementById('tx-desc').value;
    const amount = parseFloat(document.getElementById('tx-amount').value);
    
    const newTx = {
        id: Date.now(),
        type,
        category,
        description: desc,
        amount,
        date: new Date().toISOString()
    };
    
    state.transactions.push(newTx);
    saveState();
    closeModal('tx-modal');
    document.getElementById('main-tx-form').reset();
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
        date: new Date().toISOString()
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
    const amount = parseFloat(prompt('¿Cuánto quieres añadir a este ahorro?'));
    if (isNaN(amount) || amount <= 0) return;
    
    const saving = state.savings.find(s => s.id === id);
    if (saving) {
        saving.current += amount;
        
        // Also add a transaction record
        state.transactions.push({
            id: Date.now(),
            type: 'expense',
            category: 'other',
            description: `Ahorro: ${saving.name}`,
            amount: amount,
            date: new Date().toISOString()
        });
        
        saveState();
    }
}

// --- UI Updates ---

function updateUI() {
    const totalBalance = state.transactions.reduce((acc, tx) => 
        tx.type === 'income' ? acc + tx.amount : acc - tx.amount, 0);
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const todayStr = now.toISOString().split('T')[0];
    
    const monthIncome = state.transactions
        .filter(tx => {
            const d = new Date(tx.date);
            return tx.type === 'income' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((acc, tx) => acc + tx.amount, 0);
        
    const monthExpense = state.transactions
        .filter(tx => {
            const d = new Date(tx.date);
            return tx.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((acc, tx) => acc + tx.amount, 0);

    const dailyTotal = state.transactions
        .filter(tx => tx.type === 'expense' && tx.date.split('T')[0] === todayStr)
        .reduce((acc, tx) => acc + tx.amount, 0);

    // Update Dashboard Cards
    document.getElementById('total-balance').innerText = formatCurrency(totalBalance);
    document.getElementById('month-income').innerText = formatCurrency(monthIncome);
    document.getElementById('month-expense').innerText = formatCurrency(monthExpense);
    document.getElementById('daily-total').innerText = formatCurrency(dailyTotal);

    renderTransactionLists();
    renderDailyList(todayStr);
    renderSavings();
    
    // Re-init icons
    if (window.lucide) lucide.createIcons();
}

function renderTransactionLists() {
    const recentList = document.getElementById('recent-transactions');
    const fullList = document.getElementById('full-transaction-list');
    
    const sorted = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const createItemHTML = (tx) => `
        <div class="transaction-item">
            <div class="tx-info">
                <div class="tx-icon">
                    <i data-lucide="${tx.type === 'income' ? 'arrow-down-left' : 'arrow-up-right'}" style="color: ${tx.type === 'income' ? 'var(--success)' : 'var(--danger)'}"></i>
                </div>
                <div class="tx-details">
                    <span class="name">${tx.description}</span>
                    <span class="date">${formatDate(tx.date)} • ${tx.category}</span>
                </div>
            </div>
            <div class="amount" style="color: ${tx.type === 'income' ? 'var(--success)' : 'var(--danger)'}">
                ${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}
            </div>
        </div>
    `;

    recentList.innerHTML = sorted.slice(0, 5).map(createItemHTML).join('') || '<p class="text-muted" style="text-align:center; padding: 2rem;">No hay transacciones.</p>';
    fullList.innerHTML = sorted.map(createItemHTML).join('') || '<p class="text-muted" style="text-align:center; padding: 2rem;">No hay transacciones.</p>';
}

function renderDailyList(todayStr) {
    const list = document.getElementById('daily-list');
    const todayTx = state.transactions.filter(tx => tx.type === 'expense' && tx.date.split('T')[0] === todayStr);
    
    list.innerHTML = todayTx.map(tx => `
        <div class="transaction-item">
            <span class="name">${tx.description}</span>
            <span class="amount expense">${formatCurrency(tx.amount)}</span>
        </div>
    `).join('') || '<p class="text-muted" style="text-align:center;">Sin gastos hoy.</p>';
}

function renderSavings() {
    const list = document.getElementById('savings-list');
    list.innerHTML = state.savings.map(s => {
        const progress = Math.min((s.current / s.target) * 100, 100);
        return `
            <div class="saving-card">
                <div class="saving-info">
                    <strong>${s.name}</strong>
                    <span>${formatCurrency(s.current)} / ${formatCurrency(s.target)}</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                </div>
                <button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.8rem;" onclick="addContribution(${s.id})">
                    <i data-lucide="plus"></i> Agregar Fondos
                </button>
            </div>
        `;
    }).join('') || '<p class="text-muted" style="text-align:center; padding: 1rem;">No tienes metas de ahorro.</p>';
}

// --- Utils ---

function formatCurrency(val) {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

// --- Chart.js Integration ---

let expenseChart;

function initChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#94a3b8'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { family: 'Outfit' } }
                }
            },
            cutout: '70%'
        }
    });
    updateChart();
}

function updateChart() {
    if (!expenseChart) return;
    
    // Group expenses by category
    const categories = {};
    const expenses = state.transactions.filter(tx => tx.type === 'expense');
    
    expenses.forEach(tx => {
        categories[tx.category] = (categories[tx.category] || 0) + tx.amount;
    });
    
    expenseChart.data.labels = Object.keys(categories);
    expenseChart.data.datasets[0].data = Object.values(categories);
    expenseChart.update();
}

// --- Export / Import (GitHub Persistence) ---

function exportData() {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `finanzas_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedState = JSON.parse(e.target.result);
            if (importedState.transactions && importedState.savings) {
                state = importedState;
                saveState();
                alert('Datos importados correctamente.');
                location.reload();
            } else {
                throw new Error('Formato de archivo inválido.');
            }
        } catch (err) {
            alert('Error al importar: ' + err.message);
        }
    };
    reader.readAsText(file);
}
