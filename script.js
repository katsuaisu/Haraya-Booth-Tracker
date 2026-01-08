const DEFAULT_COSTS = {
    'Oil': 60, 'Flour': 35, 'Laundry Detergent': 35, 'Soy Sauce': 60,
    'Fish Sauce': 60, 'Cooking Oil': 60, 'Milk': 60, 'Whipped Cream': 60,
    'Confetti': 35, 'Ketchup': 60, 'Mayo': 60, 'Mustard': 60,
    'Vinegar': 35
};

const DEFAULT_MATERIALS = Object.keys(DEFAULT_COSTS).reduce((acc, name) => {
    acc[name] = { bought: 0, finished: 0, buyMore: 0 };
    return acc;
}, {});

let state = {
    transactions: [],
    materials: JSON.parse(JSON.stringify(DEFAULT_MATERIALS)),
    materialCosts: JSON.parse(JSON.stringify(DEFAULT_COSTS))
};

let currentSearchMode = 'name';
let currentPage = 1;
const itemsPerPage = 7;
const DEBT_GOAL = 32300;

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderMaterials();
    renderHistory();
    calculateLiveTotal();
    showWelcomeMessage();
    startUrgentTimer();
});

function showIOSAlert(title, message, isConfirmation = false, onConfirm = null) {
    const overlay = document.getElementById('ios-modal-overlay');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').innerHTML = message;
    const actions = document.getElementById('modal-actions');
    actions.innerHTML = '';
    if (isConfirmation) {
        const cancel = document.createElement('button');
        cancel.textContent = 'Cancel';
        cancel.style.fontWeight = '400';
        cancel.onclick = closeModal;
        const confirm = document.createElement('button');
        confirm.textContent = 'Delete';
        confirm.className = 'destructive';
        confirm.onclick = () => { onConfirm(); closeModal(); };
        actions.appendChild(cancel);
        actions.appendChild(confirm);
    } else {
        const ok = document.createElement('button');
        ok.textContent = 'OK';
        ok.onclick = closeModal;
        actions.appendChild(ok);
    }
    overlay.classList.remove('hidden');
}

function showWelcomeMessage() {
    const msg = `This is an automated message sent by the creator of this website. If you are reading this, please make sure to do the following:<br><br>
    1. Update the roles every 10 minutes to avoid continuity errors.<br>
    2. Give the correct amount of change every time.<br>
    3. Give the correct information to your fellow record-keeper.`;
    showIOSAlert("Welcome, Cashier!", msg);
}

function startUrgentTimer() {
    setInterval(() => {
        showUrgentAlert();
    }, 600000);
}

function showUrgentAlert() {
    const overlay = document.getElementById('ios-modal-overlay');
    document.getElementById('modal-title').textContent = "URGENT REMINDER";
    document.getElementById('modal-message').innerHTML = '<span class="urgent-alert-text">UPDATE STATUSES & BAILS NOW!</span>';
    const actions = document.getElementById('modal-actions');
    actions.innerHTML = '<button onclick="closeModal()">✕ Dismiss</button>';
    overlay.classList.remove('hidden');
}

function closeModal() { document.getElementById('ios-modal-overlay').classList.add('hidden'); }

function loadData() {
    const stored = localStorage.getItem('assassination_booth_data');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            state.transactions = parsed.transactions || [];
            state.materials = { ...DEFAULT_MATERIALS, ...parsed.materials };
            state.materialCosts = { ...DEFAULT_COSTS, ...(parsed.materialCosts || {}) };
        } catch (e) { console.error("Data corruption"); }
    }
    updateGlobalTotal();
}

function saveData() {
    localStorage.setItem('assassination_booth_data', JSON.stringify(state));
    updateGlobalTotal();
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    const btns = document.querySelectorAll('.nav-btn');
    if (tabId === 'cashier') btns[0].classList.add('active');
    if (tabId === 'materials') btns[1].classList.add('active');
    if (tabId === 'debt') btns[2].classList.add('active');
    if (tabId === 'reminders') btns[3].classList.add('active');
}

function calculateLiveTotal() {
    let packageTotal = 0;
    document.querySelectorAll('.pkg-check:checked').forEach(chk => {
        packageTotal += parseInt(chk.dataset.price || 0);
    });
    let mixTotal = 0;
    document.querySelectorAll('.mix-check:checked').forEach(chk => {
        mixTotal += parseInt(chk.dataset.price || 0);
    });
    let addonsTotal = 0;
    document.querySelectorAll('.ingredient-check:checked').forEach(chk => {
        addonsTotal += parseInt(chk.dataset.price || 0);
    });
    let garlicTotal = 0;
    const garlicCheck = document.getElementById('garlic-checkbox');
    const garlicDisplay = document.getElementById('garlic-price-display');
    if (garlicCheck.checked) {
        garlicTotal = (packageTotal + mixTotal) + 20;
        garlicDisplay.textContent = `₱${garlicTotal} (Base + ₱20)`;
        garlicDisplay.style.color = 'var(--ios-blue)';
    } else {
        garlicDisplay.textContent = 'Package + ₱20';
        garlicDisplay.style.color = 'var(--ios-text-secondary)';
    }
    const total = packageTotal + addonsTotal + garlicTotal;
    document.getElementById('live-total').textContent = `₱${total.toLocaleString()}`;
    return total;
}

function handleTransactionSubmit(e) {
    e.preventDefault();
    const cost = calculateLiveTotal();
    const editingId = document.getElementById('transaction-id').value;
    const selectedPackages = [];
    document.querySelectorAll('.pkg-check:checked').forEach(chk => {
        const label = chk.closest('.ios-card-item').querySelector('.row-main').textContent;
        selectedPackages.push(label);
    });
    const ingredients = [];
    document.querySelectorAll('.ingredient-check:checked').forEach(chk => ingredients.push(chk.value));
    if (document.getElementById('garlic-checkbox').checked) ingredients.push("Garlic Clove");
    const formData = {
        client: document.getElementById('client').value,
        nominee: document.getElementById('nominee').value,
        section: document.getElementById('section').value,
        batch: document.getElementById('batch').value,
        packages: selectedPackages,
        ingredients: ingredients,
        status: document.getElementById('status').value,
        notes: document.getElementById('notes').value,
        cost: cost,
    };
    if (editingId) {
        const index = state.transactions.findIndex(t => t.id == editingId);
        if (index !== -1) {
            state.transactions[index] = { ...state.transactions[index], ...formData };
            showIOSAlert("Success", "Transaction updated.");
        }
    } else {
        const newTransaction = {
            id: Date.now(),
            date: new Date().toLocaleDateString(),
            ...formData
        };
        state.transactions.unshift(newTransaction);
    }
    saveData();
    currentPage = 1;
    renderHistory();
    cancelEdit();
}

function loadTransactionForEdit(id) {
    const t = state.transactions.find(trans => trans.id === id);
    if (!t) return;
    document.getElementById('transaction-id').value = t.id;
    document.getElementById('client').value = t.client;
    document.getElementById('nominee').value = t.nominee;
    document.getElementById('section').value = t.section || '';
    document.getElementById('batch').value = t.batch;
    document.getElementById('status').value = t.status;
    document.getElementById('notes').value = t.notes || '';
    document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
    const pkgList = Array.isArray(t.packages) ? t.packages : [t.packageLabel || t.package];
    pkgList.forEach(pkgName => {
        const rows = document.querySelectorAll('.pkg-check');
        rows.forEach(chk => {
            const label = chk.closest('.ios-card-item').querySelector('.row-main').textContent;
            if (pkgName && label.includes(pkgName)) chk.checked = true;
        });
    });
    if (t.ingredients) {
        t.ingredients.forEach(ing => {
            if (ing === "Garlic Clove") {
                document.getElementById('garlic-checkbox').checked = true;
            } else {
                const el = document.querySelector(`.ingredient-check[value="${ing}"]`);
                if (el) el.checked = true;
            }
        });
    }
    document.getElementById('submit-btn').textContent = "Update Transaction";
    document.getElementById('cancel-btn').classList.remove('hidden');
    document.getElementById('delete-section').classList.remove('hidden');
    document.querySelector('.tab-header h2').textContent = "Edit Transaction";
    calculateLiveTotal();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
    document.getElementById('transaction-form').reset();
    document.getElementById('transaction-id').value = "";
    document.getElementById('submit-btn').textContent = "Complete Transaction";
    document.getElementById('cancel-btn').classList.add('hidden');
    document.getElementById('delete-section').classList.add('hidden');
    document.querySelector('.tab-header h2').textContent = "New Transaction";
    calculateLiveTotal();
}

function confirmDelete() {
    showIOSAlert("Delete Transaction", "Are you sure? This cannot be undone.", true, () => {
        const id = document.getElementById('transaction-id').value;
        state.transactions = state.transactions.filter(t => t.id != id);
        saveData();
        renderHistory();
        cancelEdit();
    });
}

function setSearchMode(mode) {
    currentSearchMode = mode;
    document.querySelectorAll('.segment-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`search-btn-${mode}`).classList.add('active');
    currentPage = 1;
    searchTransactions();
}

function quickSearch(mode, value) {
    setSearchMode(mode);
    document.getElementById('search-input').value = value;
    searchTransactions();
}

function searchTransactions() {
    currentPage = 1;
    renderHistory();
}

function changePage(dir) {
    currentPage += dir;
    renderHistory();
}

function renderHistory() {
    const container = document.getElementById('transaction-list');
    const query = document.getElementById('search-input').value.toLowerCase();
    let dataToRender = state.transactions;
    if (query) {
        dataToRender = state.transactions.filter(t => {
            if (currentSearchMode === 'name') {
                return t.client.toLowerCase().includes(query) || t.nominee.toLowerCase().includes(query);
            } else if (currentSearchMode === 'batch') {
                return t.batch.toLowerCase().includes(query);
            } else if (currentSearchMode === 'status') {
                return t.status.toLowerCase().includes(query);
            }
            return false;
        });
    }
    const totalPages = Math.ceil(dataToRender.length / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = dataToRender.slice(start, end);
    container.innerHTML = '';
    if (pageData.length === 0) {
        container.innerHTML = '<div class="empty-state" style="text-align:center; color:#8E8E93; padding:20px;">No transactions found.</div>';
    } else {
        pageData.forEach(t => {
            const div = document.createElement('div');
            div.className = 'history-item';
            let pkgDisplay = Array.isArray(t.packages) && t.packages.length > 0 ? t.packages.join(", ") : (t.packageLabel || t.package || "Custom");
            div.innerHTML = `
                <div class="history-item-content" onclick="loadTransactionForEdit(${t.id})">
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <div>
                            <div style="font-weight:600; font-size:16px;">${t.nominee}</div>
                            <div style="font-size:14px; color:#8E8E93; margin-top:2px;">${t.client}</div>
                            <div style="font-size:12px; color:var(--ios-blue); font-weight:500; margin-top:2px;">${t.section || 'No Section'}</div>
                            <div style="font-size:13px; color:#333; margin-top:4px;">${pkgDisplay}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-weight:700; color:#1C1C1E;">₱${t.cost.toLocaleString()}</div>
                        </div>
                    </div>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:8px;">
                     <span class="clickable-tag" style="font-size:12px;" onclick="quickSearch('batch', '${t.batch}')">${t.batch}</span>
                     <span class="clickable-tag" style="font-size:12px; color:${getStatusColor(t.status)};" onclick="quickSearch('status', '${t.status}')">${t.status}</span>
                </div>
            `;
            container.appendChild(div);
        });
    }
    document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages;
}

function getStatusColor(status) {
    switch (status) {
        case 'Chase': return '#FFD60A';
        case 'Assassinated': return '#FF3B30';
        case 'Bailed': return '#34C759';
        default: return '#8E8E93';
    }
}

function updateGlobalTotal() {
    const total = state.transactions.reduce((sum, t) => sum + t.cost, 0);
    document.getElementById('global-total').textContent = `₱${total.toLocaleString()}`;
    renderDebt(total);
}

function renderDebt(revenue) {
    const remaining = DEBT_GOAL - revenue;
    const paidDisplay = document.getElementById('debt-paid');
    const amountDisplay = document.getElementById('debt-amount');
    const progressBar = document.getElementById('debt-progress');
    const profitMsg = document.getElementById('profit-message');
    paidDisplay.textContent = `₱${revenue.toLocaleString()}`;
    const percentage = Math.min(100, Math.max(0, (revenue / DEBT_GOAL) * 100));
    progressBar.style.width = `${percentage}%`;
    if (remaining <= 0) {
        amountDisplay.textContent = "Paid!";
        amountDisplay.style.color = "var(--ios-green)";
        profitMsg.classList.remove('hidden');
        profitMsg.textContent = `🎉 In Profit: ₱${Math.abs(remaining).toLocaleString()}`;
        progressBar.style.background = "var(--ios-green)";
    } else {
        amountDisplay.textContent = `₱${remaining.toLocaleString()}`;
        amountDisplay.style.color = "var(--ios-text-primary)";
        profitMsg.classList.add('hidden');
        progressBar.style.background = "linear-gradient(90deg, var(--ios-blue), #5AC8FA)";
    }
}

function renderMaterials() {
    const tbody = document.getElementById('materials-body');
    tbody.innerHTML = '';
    Object.keys(state.materials).forEach(key => {
        const mat = state.materials[key];
        const costPerUnit = state.materialCosts[key] || 0;
        const baseNeed = Math.max(0, mat.finished - mat.bought);
        const toBuy = baseNeed + (mat.buyMore || 0);
        const estCost = toBuy * costPerUnit;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${key}</strong></td>
            <td class="text-right"><input type="number" min="0" value="${costPerUnit}" onchange="updateMaterialCost('${key}', this.value)" style="width:70px"></td>
            <td class="text-right"><input type="number" min="0" value="${mat.bought}" onchange="updateMaterial('${key}', 'bought', this.value)"></td>
            <td class="text-right"><input type="number" min="0" value="${mat.finished}" onchange="updateMaterial('${key}', 'finished', this.value)"></td>
            <td class="text-right"><input type="number" min="0" value="${mat.buyMore}" onchange="updateMaterial('${key}', 'buyMore', this.value)"></td>
            <td class="text-right" style="color:var(--ios-blue); font-weight:700;">${toBuy}</td>
            <td class="text-right">₱${estCost.toLocaleString()}</td>
        `;
        tbody.appendChild(row);
    });
}

function updateMaterial(name, field, value) {
    state.materials[name][field] = parseInt(value) || 0;
    saveData();
    renderMaterials();
}

function updateMaterialCost(name, value) {
    state.materialCosts[name] = parseInt(value) || 0;
    saveData();
    renderMaterials();
}

function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const a = document.createElement('a'); a.href = dataStr; a.download = "booth_data.json";
    document.body.appendChild(a); a.click(); a.remove();
}

function triggerImport() { document.getElementById('file-input').click(); }

function importData(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            state = JSON.parse(e.target.result);
            saveData();
            currentPage = 1;
            renderHistory();
            renderMaterials();
            showIOSAlert('Success', 'Database restored.');
        } catch (err) { showIOSAlert('Error', 'Invalid file.'); }
    };
    reader.readAsText(file);
    input.value = '';
}