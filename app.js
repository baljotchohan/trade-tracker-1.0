document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let trades = JSON.parse(localStorage.getItem('trades')) || [];
    let expenses = JSON.parse(localStorage.getItem('expenses')) || [];

    // --- DOM ELEMENTS ---
    // Navigation
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.view-section');

    // Forms
    const tradeFormContainer = document.getElementById('trade-form-container');
    const tradeForm = document.getElementById('trade-form');
    const addTradeBtn = document.getElementById('add-trade-btn');
    const cancelTradeBtn = document.getElementById('cancel-trade-btn');

    const expenseFormContainer = document.getElementById('expense-form-container');
    const expenseForm = document.getElementById('expense-form');
    const addExpenseBtn = document.getElementById('add-expense-btn');
    const cancelExpenseBtn = document.getElementById('cancel-expense-btn');

    // Lists & Stats
    const tradeList = document.getElementById('trade-list');
    const expenseList = document.getElementById('expense-list');
    
    // Stats Elements
    const netPnlEl = document.getElementById('net-pnl');
    const winRateEl = document.getElementById('win-rate');
    const totalExpensesEl = document.getElementById('total-expenses');

    // Reports
    const reportPeriodEl = document.getElementById('report-period');
    const reportNetProfitEl = document.getElementById('report-net-profit');
    const reportExpensesEl = document.getElementById('report-expenses');
    const reportCountEl = document.getElementById('report-count');

    // --- INITIALIZATION ---
    renderTrades();
    renderExpenses();
    updateGlobalStats();
    updateReports();

    // --- NAVIGATION LOGIC ---
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update buttons
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update sections
            const tabId = btn.getAttribute('data-tab');
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === tabId) section.classList.add('active');
            });
            
            // Refresh reports if entering report tab
            if(tabId === 'reports') updateReports();
        });
    });

    // --- TRADE LOGIC ---
    addTradeBtn.addEventListener('click', () => {
        tradeFormContainer.classList.remove('hidden');
        document.getElementById('t-date').valueAsDate = new Date();
    });

    cancelTradeBtn.addEventListener('click', () => {
        tradeFormContainer.classList.add('hidden');
        tradeForm.reset();
    });

    tradeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const entry = parseFloat(document.getElementById('t-entry').value);
        const exit = document.getElementById('t-exit').value ? parseFloat(document.getElementById('t-exit').value) : null;
        const qty = parseFloat(document.getElementById('t-qty').value);
        const type = document.getElementById('t-type').value; // LONG, SHORT, SPOT

        let pnl = 0;
        let status = 'OPEN'; // Open if no exit price

        if (exit !== null) {
            status = 'CLOSED';
            // Simple PnL calc
            if (type === 'LONG' || type === 'SPOT') {
                pnl = (exit - entry) * qty;
            } else if (type === 'SHORT') {
                pnl = (entry - exit) * qty;
            }
        }

        const newTrade = {
            id: Date.now(),
            symbol: document.getElementById('t-symbol').value.toUpperCase(),
            type,
            entry,
            exit,
            qty,
            date: document.getElementById('t-date').value,
            notes: document.getElementById('t-notes').value,
            pnl,
            status
        };

        trades.unshift(newTrade); // Add to top
        saveData();
        renderTrades();
        updateGlobalStats();
        
        tradeFormContainer.classList.add('hidden');
        tradeForm.reset();
    });

    function renderTrades() {
        tradeList.innerHTML = '';
        if (trades.length === 0) {
            tradeList.innerHTML = '<div class="empty-state">No trades logged yet.</div>';
            return;
        }

        trades.forEach(trade => {
            const el = document.createElement('div');
            // Determine class for styling
            let resultClass = '';
            if (trade.status === 'CLOSED') {
                resultClass = trade.pnl >= 0 ? 'win' : 'loss';
            }

            el.className = `list-item ${resultClass}`;
            el.innerHTML = `
                <div class="item-main">
                    <div class="item-header">
                        <span class="symbol">${trade.symbol}</span>
                        <span class="type">${trade.type}</span>
                        <span style="font-size:0.7em; color:#666">${trade.date}</span>
                    </div>
                    <div class="item-details">
                        Entry: ${trade.entry} | Exit: ${trade.exit || '-'} | Qty: ${trade.qty}
                    </div>
                </div>
                <div style="display:flex; align-items:center;">
                    <div class="item-pnl ${trade.pnl >= 0 ? 'pnl-green' : 'pnl-red'}">
                        ${trade.status === 'CLOSED' ? formatMoney(trade.pnl) : 'OPEN'}
                    </div>
                    <button class="delete-btn" onclick="deleteTrade(${trade.id})">×</button>
                </div>
            `;
            // Bind delete event specifically (avoiding inline onclick global scope issues if possible, but localized here for simplicity in vanilla js)
            // For simple vanilla app, we can attach listener dynamically closer or expose global. 
            // Let's use event delegation on the list container instead.
            tradeList.appendChild(el);
        });
    }

    // --- EXPENSE LOGIC ---
    addExpenseBtn.addEventListener('click', () => {
        expenseFormContainer.classList.remove('hidden');
        document.getElementById('e-date').valueAsDate = new Date();
    });

    cancelExpenseBtn.addEventListener('click', () => {
        expenseFormContainer.classList.add('hidden');
        expenseForm.reset();
    });

    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newExpense = {
            id: Date.now(),
            category: document.getElementById('e-category').value,
            amount: parseFloat(document.getElementById('e-amount').value),
            date: document.getElementById('e-date').value,
            description: document.getElementById('e-desc').value
        };

        expenses.unshift(newExpense);
        saveData();
        renderExpenses();
        updateGlobalStats();
        
        expenseFormContainer.classList.add('hidden');
        expenseForm.reset();
    });

    function renderExpenses() {
        expenseList.innerHTML = '';
        if (expenses.length === 0) {
            expenseList.innerHTML = '<div class="empty-state">No expenses recorded.</div>';
            return;
        }

        expenses.forEach(exp => {
            const el = document.createElement('div');
            el.className = 'list-item';
            el.innerHTML = `
                 <div class="item-main">
                     <div class="item-header">
                        <span class="symbol">${exp.category}</span>
                        <span style="font-size:0.7em; color:#666">${exp.date}</span>
                    </div>
                    <div class="item-details">${exp.description}</div>
                 </div>
                 <div style="display:flex; align-items:center;">
                    <div class="item-pnl pnl-red">-${formatMoney(exp.amount)}</div>
                    <button class="delete-btn" data-id="${exp.id}">×</button>
                 </div>
            `;
            expenseList.appendChild(el);
        });
    }

    // --- GLOBAL ACTIONS ---
    // Event delegation for deletes
    tradeList.addEventListener('click', (e) => {
        if(e.target.classList.contains('delete-btn')) {
            // Find index - in this structure, we might need a surer way than onclick attr if we use delegation
            // I used onclick in trade HTML but data-id in expense. Consolidating logic.
            // Wait, I put onclick="deleteTrade" in HTML string. That needs a global function.
            // Let's assume standard event delegation is cleaner.
        }
    });

    // We need to expose delete functions or handle via delegation completely.
    // Let's rewrite delegation for both.
    window.deleteTrade = (id) => {
        if(confirm('Delete this trade?')) {
            trades = trades.filter(t => t.id !== id);
            saveData();
            renderTrades();
            updateGlobalStats();
        }
    };

    // For expenses, I used data-id in the render function above
    expenseList.addEventListener('click', (e) => {
        if(e.target.classList.contains('delete-btn')) {
            const id = parseInt(e.target.getAttribute('data-id'));
            if(confirm('Delete this expense?')) {
                expenses = expenses.filter(e => e.id !== id);
                saveData();
                renderExpenses();
                updateGlobalStats();
            }
        }
    });


    // --- HELPERS ---
    function saveData() {
        localStorage.setItem('trades', JSON.stringify(trades));
        localStorage.setItem('expenses', JSON.stringify(expenses));
    }

    function formatMoney(num) {
        return '$' + num.toFixed(2);
    }

    function updateGlobalStats() {
        // Net PnL (Closed trades only)
        const totalPnl = trades.reduce((sum, t) => sum + (t.status === 'CLOSED' ? t.pnl : 0), 0);
        netPnlEl.textContent = formatMoney(totalPnl);
        netPnlEl.className = 'value ' + (totalPnl >= 0 ? 'pnl-green' : 'pnl-red');

        // Win Rate
        const closedTrades = trades.filter(t => t.status === 'CLOSED');
        if (closedTrades.length > 0) {
            const wins = closedTrades.filter(t => t.pnl > 0).length;
            const rate = Math.round((wins / closedTrades.length) * 100);
            winRateEl.textContent = rate + '%';
        } else {
            winRateEl.textContent = '0%';
        }

        // Total Expenses
        const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);
        totalExpensesEl.textContent = formatMoney(totalExp);
    }

    // --- REPORTING LOGIC ---
    reportPeriodEl.addEventListener('change', updateReports);

    function updateReports() {
        const period = reportPeriodEl.value; // weekly, monthly, yearly
        const now = new Date();
        
        // Filter Dates
        let startTime;
        if (period === 'weekly') {
            startTime = new Date(now.setDate(now.getDate() - 7));
        } else if (period === 'monthly') {
            startTime = new Date(now.setMonth(now.getMonth() - 1));
        } else if (period === 'yearly') {
            startTime = new Date(now.setFullYear(now.getFullYear() - 1));
        }

        // Filter Data
        const filteredTrades = trades.filter(t => new Date(t.date) >= startTime);
        const filteredExpenses = expenses.filter(e => new Date(e.date) >= startTime);

        // Calc
        const reportPnl = filteredTrades.reduce((sum, t) => sum + (t.status === 'CLOSED' ? t.pnl : 0), 0);
        const reportExp = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
        
        // Update UI
        reportNetProfitEl.textContent = formatMoney(reportPnl);
        reportNetProfitEl.className = 'big-number ' + (reportPnl >= 0 ? 'pnl-green' : 'pnl-red');
        
        reportExpensesEl.textContent = formatMoney(reportExp);
        reportCountEl.textContent = filteredTrades.length;
    }
});
