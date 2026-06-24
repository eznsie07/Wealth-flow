/**
 * WealthFlow — Premium Personal Finance Engine
 * Application State Architecture & Lifecycle Controller
 */

// Global Application State Scope
let state = {
    currentUser: null,
    ledger: [],
    monthlyBudget: 0,
    theme: 'dark'
};

// Allocation Form Auxiliary Variables
let activeType = 'EXPENSE';
let activeAllocation = 'NEED';

// Chart Core Reference Instances
let trendChartInstance = null;
let categoryChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    initAppLifecycle();
    registerDOMEventHooks();
});

function initAppLifecycle() {
    // Synchronize Client Interface Dark/Light Theme Settings
    const savedTheme = localStorage.getItem('wf_theme') || 'dark';
    setTheme(savedTheme);

    // Verify Active User Sessions
    const sessionUser = localStorage.getItem('wf_session_user');
    if (sessionUser) {
        bootstrapUserSession(sessionUser);
    } else {
        document.getElementById('auth-screen').classList.remove('hidden');
    }
    setupPWAInstallationEngine();
}

function registerDOMEventHooks() {
    // Auth Submission Hook
    document.getElementById('auth-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username-input').value.trim().toLowerCase();
        if (username) bootstrapUserSession(username);
    });

    // Logout Hook
    document.getElementById('logout-btn').addEventListener('click', terminateUserSession);

    // Theme Toggle Hook
    document.getElementById('theme-toggle').addEventListener('click', () => {
        const targetTheme = state.theme === 'dark' ? 'light' : 'dark';
        setTheme(targetTheme);
    });

    // Transaction Formulation Selector Hooks
    document.getElementById('type-expense').addEventListener('click', () => toggleTxType('EXPENSE'));
    document.getElementById('type-income').addEventListener('click', () => toggleTxType('INCOME'));
    document.getElementById('alloc-need').addEventListener('click', () => toggleAllocation('NEED'));
    document.getElementById('alloc-want').addEventListener('click', () => toggleAllocation('WANT'));

    // Transaction Master Ledger Core Submission Form Hook
    document.getElementById('tx-form').addEventListener('submit', (e) => {
        e.preventDefault();
        commitLedgerEntry();
    });

    // Budget Rule Management Configuration Hook
    document.getElementById('save-budget-btn').addEventListener('click', () => {
        const budgetVal = parseFloat(document.getElementById('budget-input').value) || 0;
        state.monthlyBudget = budgetVal;
        saveStateToPersistentStorage();
        calculateFinancialMatrix();
    });

    // Export Mechanism Event Hooks
    document.getElementById('export-pdf').addEventListener('click', renderClientPDFReport);
    document.getElementById('backup-json').addEventListener('click', exportJSONVaultBackup);
}

function setTheme(theme) {
    state.theme = theme;
    localStorage.setItem('wf_theme', theme);
    const html = document.documentElement;
    const icon = document.getElementById('theme-icon');
    
    if (theme === 'light') {
        html.classList.remove('dark');
        html.classList.add('light');
        icon.textContent = 'dark_mode';
    } else {
        html.classList.remove('light');
        html.classList.add('dark');
        icon.textContent = 'light_mode';
    }
}

function bootstrapUserSession(username) {
    state.currentUser = username;
    localStorage.setItem('wf_session_user', username);
    
    // De-serialize user data models
    const storedData = localStorage.getItem(`wf_vault_${username}`);
    if (storedData) {
        try {
            const parsed = JSON.parse(storedData);
            state.ledger = parsed.ledger || [];
            state.monthlyBudget = parsed.monthlyBudget || 0;
        } catch (err) {
            console.error("Critical error parsing storage payload", err);
            state.ledger = [];
            state.monthlyBudget = 0;
        }
    } else {
        state.ledger = [];
        state.monthlyBudget = 0;
    }

    // Adjust Dashboard Inputs
    document.getElementById('budget-input').value = state.monthlyBudget || '';
    document.getElementById('user-display').textContent = username;
    document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];

    // Transition Application Screen Viewports
    document.getElementById('auth-screen').classList.add('hidden');
    const shell = document.getElementById('app-shell');
    shell.classList.remove('hidden');
    setTimeout(() => shell.classList.add('opacity-100'), 50);

    // Run Analytical Computations
    calculateFinancialMatrix();
}

function terminateUserSession() {
    localStorage.removeItem('wf_session_user');
    state.currentUser = null;
    state.ledger = [];
    state.monthlyBudget = 0;
    
    const shell = document.getElementById('app-shell');
    shell.classList.add('opacity-0');
    setTimeout(() => {
        shell.classList.add('hidden');
        document.getElementById('auth-screen').classList.remove('hidden');
    }, 500);
}

function saveStateToPersistentStorage() {
    if (!state.currentUser) return;
    const dataPayload = {
        ledger: state.ledger,
        monthlyBudget: state.monthlyBudget
    };
    localStorage.setItem(`wf_vault_${state.currentUser}`, JSON.stringify(dataPayload));
}

function toggleTxType(type) {
    activeType = type;
    const expBtn = document.getElementById('type-expense');
    const incBtn = document.getElementById('type-income');
    const catContainer = document.getElementById('category-container');
    const allocContainer = document.getElementById('allocation-container');

    if (type === 'EXPENSE') {
        expBtn.className = "w-full py-2 text-xs font-semibold rounded-lg bg-emerald-500 text-slate-950 transition-all cursor-pointer";
        incBtn.className = "w-full py-2 text-xs font-semibold rounded-lg text-slate-400 transition-all cursor-pointer";
        catContainer.classList.remove('hidden');
        allocContainer.classList.remove('hidden');
    } else {
        incBtn.className = "w-full py-2 text-xs font-semibold rounded-lg bg-emerald-500 text-slate-950 transition-all cursor-pointer";
        expBtn.className = "w-full py-2 text-xs font-semibold rounded-lg text-slate-400 transition-all cursor-pointer";
        catContainer.classList.add('hidden');
        allocContainer.classList.add('hidden');
    }
}

function toggleAllocation(alloc) {
    activeAllocation = alloc;
    const needBtn = document.getElementById('alloc-need');
    const wantBtn = document.getElementById('alloc-want');

    if (alloc === 'NEED') {
        needBtn.className = "py-2 text-xs font-medium rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 transition-all cursor-pointer flex items-center justify-center gap-1";
        wantBtn.className = "py-2 text-xs font-medium rounded-xl border border-slate-800 text-slate-400 transition-all cursor-pointer flex items-center justify-center gap-1";
    } else {
        wantBtn.className = "py-2 text-xs font-medium rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 transition-all cursor-pointer flex items-center justify-center gap-1";
        needBtn.className = "py-2 text-xs font-medium rounded-xl border border-slate-800 text-slate-400 transition-all cursor-pointer flex items-center justify-center gap-1";
    }
}

function commitLedgerEntry() {
    const amountVal = parseFloat(document.getElementById('tx-amount').value);
    const dateVal = document.getElementById('tx-date').value;
    const descVal = document.getElementById('tx-desc').value.trim();
    const catVal = document.getElementById('tx-category').value;

    if (!amountVal || !dateVal || !descVal) return;

    const entry = {
        id: 'tx_uuid_' + Date.now() + Math.random().toString(36).substr(2, 4),
        type: activeType,
        amount: amountVal,
        category: activeType === 'INCOME' ? 'Revenue' : catVal,
        allocation: activeType === 'INCOME' ? null : activeAllocation,
        date: dateVal,
        description: descVal
    };

    state.ledger.unshift(entry);
    saveStateToPersistentStorage();
    calculateFinancialMatrix();

    // Clear Fields
    document.getElementById('tx-amount').value = '';
    document.getElementById('tx-desc').value = '';
}

function removeLedgerEntry(id) {
    state.ledger = state.ledger.filter(item => item.id !== id);
    saveStateToPersistentStorage();
    calculateFinancialMatrix();
}

function calculateFinancialMatrix() {
    let totalIncome = 0;
    let totalExpense = 0;
    
    let burnToday = 0;
    let burnWeek = 0;
    let burnMonth = 0;

    let needsCost = 0;
    let wantsCost = 0;

    let categoryMap = {
        Food: 0, Travel: 0, Shopping: 0, Bills: 0,
        Education: 0, Health: 0, Entertainment: 0, Other: 0
    };

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Compute current week start date range threshold parameters
    const currentDayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - currentDayOfWeek);
    startOfWeek.setHours(0,0,0,0);

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    state.ledger.forEach(tx => {
        const txAmt = tx.amount;
        const txDate = new Date(tx.date);

        if (tx.type === 'INCOME') {
            totalIncome += txAmt;
        } else {
            totalExpense += txAmt;
            
            // Build Categorical Outflow Mapping Profiles
            if (categoryMap[tx.category] !== undefined) {
                categoryMap[tx.category] += txAmt;
            }

            // Calculate Essential vs Non-essential Allocations
            if (tx.allocation === 'NEED') needsCost += txAmt;
            if (tx.allocation === 'WANT') wantsCost += txAmt;

            // Compute Segmented Burn Velocities
            if (tx.date === todayStr) burnToday += txAmt;
            if (txDate >= startOfWeek) burnWeek += txAmt;
            if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
                burnMonth += txAmt;
            }
        }
    });

    const netOperationalBalance = totalIncome - totalExpense;
    const savingsRatePct = totalIncome > 0 ? Math.max(0, Math.round((netOperationalBalance / totalIncome) * 100)) : 0;

    // Push Derived Calculations to DOM
    document.getElementById('val-income').textContent = `₹${totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('val-expense').textContent = `₹${totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    
    const balNode = document.getElementById('val-balance');
    balNode.textContent = `₹${netOperationalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    balNode.className = netOperationalBalance >= 0 ? "text-xl md:text-2xl font-bold text-emerald-400 mt-2" : "text-xl md:text-2xl font-bold text-rose-400 mt-2";
    
    document.getElementById('val-savings-rate').textContent = `Savings Rate: ${savingsRatePct}%`;

    document.getElementById('burn-today').textContent = `₹${burnToday.toLocaleString('en-IN')}`;
    document.getElementById('burn-week').textContent = `₹${burnWeek.toLocaleString('en-IN')}`;
    document.getElementById('burn-month').textContent = `₹${burnMonth.toLocaleString('en-IN')}`;

    // Update Needs vs Wants percentages
    const totalAllocated = needsCost + wantsCost;
    const needsPct = totalAllocated > 0 ? Math.round((needsCost / totalAllocated) * 100) : 0;
    const wantsPct = totalAllocated > 0 ? Math.round((wantsCost / totalAllocated) * 100) : 0;
    
    document.getElementById('needs-pct').textContent = `${needsPct}%`;
    document.getElementById('wants-pct').textContent = `${wantsPct}%`;

    evaluateBudgetBreachAlerts(burnMonth);
    compileAIEngineHeuristics(totalIncome, totalExpense, categoryMap, needsPct, wantsPct);
    renderLedgerLogsDOM();
    renderAnalyticalCharts(categoryMap);
}

function evaluateBudgetBreachAlerts(currentMonthSpend) {
    const alertBox = document.getElementById('budget-alert');
    if (!state.monthlyBudget || state.monthlyBudget <= 0) {
        alertBox.className = "hidden";
        return;
    }

    alertBox.classList.remove('hidden');
    const utilizationPct = (currentMonthSpend / state.monthlyBudget) * 100;

    if (utilizationPct > 100) {
        alertBox.className = "p-3.5 rounded-xl text-xs flex items-start gap-2 border border-rose-500/30 bg-rose-500/10 text-rose-400";
        alertBox.innerHTML = `<span class="material-symbols-rounded text-sm mt-0.5">warning</span> <span><strong>Budget Breached!</strong> Month-to-date spending exceeds limits by ₹${(currentMonthSpend - state.monthlyBudget).toLocaleString('en-IN')}.</span>`;
    } else if (utilizationPct >= 80) {
        alertBox.className = "p-3.5 rounded-xl text-xs flex items-start gap-2 border border-amber-500/30 bg-amber-500/10 text-amber-400";
        alertBox.innerHTML = `<span class="material-symbols-rounded text-sm mt-0.5">info</span> <span><strong>Critical Warning!</strong> Utilized ${utilizationPct.toFixed(1)}% of your monthly threshold limit.</span>`;
    } else {
        alertBox.className = "p-3.5 rounded-xl text-xs flex items-start gap-2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
        alertBox.innerHTML = `<span class="material-symbols-rounded text-sm mt-0.5">check_circle</span> <span>Optimal tracking configuration. Balance safe zone: ₹${(state.monthlyBudget - currentMonthSpend).toLocaleString('en-IN')} remaining.</span>`;
    }
}

function compileAIEngineHeuristics(income, expense, catMap, needsPct, wantsPct) {
    const aiNode = document.getElementById('ai-insight');
    if (state.ledger.length === 0) {
        aiNode.textContent = "Welcome to WealthFlow. Initialize data streams by adding a transaction matrix item to trigger AI suggestions.";
        return;
    }

    let insights = [];
    
    // Find Highest Expense Category
    let highestCat = 'None';
    let highestVal = 0;
    for (let cat in catMap) {
        if (catMap[cat] > highestVal) {
            highestVal = catMap[cat];
            highestCat = cat;
        }
    }

    if (highestVal > 0) {
        insights.push(`Your highest cash outflow is concentrated in <strong>${highestCat}</strong> (₹${highestVal.toLocaleString()}).`);
    }

    // Evaluate Needs/Wants Ratio Heuristics
    if (wantsPct > 30) {
        insights.push(`Non-essential spending parameters (${wantsPct}%) deviate from standard 50/30/20 metrics. Limit luxury expenses.`);
    }

    if (expense > income && income > 0) {
        insights.push("Critical Deficit Risk: Outflows outpace total revenue generation metrics. Liquidate variable expense dependencies.");
    } else if (income > 0 && (expense / income) < 0.5) {
        insights.push("High-Performance fiscal setup verified. Savings velocity qualifies for capital allocation maneuvers.");
    }

    if (insights.length === 0) insights.push("Financial parameters optimized. Maintain structural discipline to scale compound reserves.");
    aiNode.innerHTML = insights.join(' <br class="mb-1"> ');
}

function renderLedgerLogsDOM() {
    const logContainer = document.getElementById('tx-log-container');
    document.getElementById('tx-count').textContent = `${state.ledger.length} Entries`;
    logContainer.innerHTML = '';

    if (state.ledger.length === 0) {
        logContainer.innerHTML = `<div class="text-center py-8 text-xs text-slate-500">No transactions recorded in local store memory vaults.</div>`;
        return;
    }

    state.ledger.forEach(tx => {
        const row = document.createElement('div');
        row.className = "p-3 bg-slate-900/30 light:bg-white border border-slate-900 light:border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs group transition-all hover:border-slate-800";
        
        const isInc = tx.type === 'INCOME';
        const colorClass = isInc ? 'text-emerald-400' : 'text-rose-400';
        const allocationBadge = tx.allocation ? `<span class="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 light:bg-slate-200 text-slate-400 font-mono tracking-wide uppercase">${tx.allocation}</span>` : '';

        row.innerHTML = `
            <div class="flex items-center gap-2.5 min-w-0">
                <div class="p-2 rounded-lg bg-slate-900 light:bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400">
                    <span class="material-symbols-rounded text-base">${isInc ? 'download' : 'upload'}</span>
                </div>
                <div class="min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="font-semibold text-slate-200 light:text-slate-800 truncate">${tx.description}</span>
                        ${allocationBadge}
                    </div>
                    <div class="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span class="font-medium text-slate-400">${tx.category}</span>
                        <span>•</span>
                        <span>${tx.date}</span>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
                <span class="font-bold font-mono ${colorClass}">${isInc ? '+' : '-'}₹${tx.amount.toLocaleString('en-IN')}</span>
                <button onclick="removeLedgerEntry('${tx.id}')" class="p-1 text-slate-600 hover:text-rose-400 rounded-md transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100">
                    <span class="material-symbols-rounded text-sm">delete</span>
                </button>
            </div>
        `;
        logContainer.appendChild(row);
    });
}

function renderAnalyticalCharts(catMap) {
    const isDark = state.theme === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const textColor = isDark ? '#94a3b8' : '#475569';

    // 1. Compute Historical Trend Data (Last 5 chronological entries)
    const reversedSlice = [...state.ledger].reverse().slice(-5);
    const trendLabels = reversedSlice.map(t => t.date.substring(5));
    let runningBal = 0;
    const trendData = reversedSlice.map(t => {
        runningBal += (t.type === 'INCOME' ? t.amount : -t.amount);
        return runningBal;
    });

    if (trendChartInstance) trendChartInstance.destroy();
    const ctxTrend = document.getElementById('trendChart').getContext('2d');
    trendChartInstance = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: trendLabels.length ? trendLabels : ['Start'],
            datasets: [{
                label: 'Liquidity Velocity (₹)',
                data: trendData.length ? trendData : [0],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 9 } } },
                y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 9 } } }
            }
        }
    });

    // 2. Generate Categorical Outflow Distribution Data Models
    const catLabels = Object.keys(catMap).filter(k => catMap[k] > 0);
    const catData = catLabels.map(k => catMap[k]);

    if (categoryChartInstance) categoryChartInstance.destroy();
    const ctxCat = document.getElementById('categoryChart').getContext('2d');
    categoryChartInstance = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
  
