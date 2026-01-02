const DEFAULT_COSTS = {
    'Oil': 50, 'Flour': 30, 'Laundry Detergent': 40, 'Soy Sauce': 30,
    'Fish Sauce': 30, 'Cooking Oil': 50, 'Milk': 50, 'Whipped Cream': 50,
    'Confetti': 30, 'Ketchup': 50, 'Mayo': 50, 'Mustard': 50
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

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderMaterials();
    renderHistory();
    calculateLiveTotal();
});

function showIOSAlert(title, message, isConfirmation = false, onConfirm = null) {
    const overlay = document.getElementById('ios-modal-overlay');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;

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

function closeModal() {
    document.getElementById('ios-modal-overlay').classList.add('hidden');
}

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
    if (tabId === 'reminders') btns[2].classList.add('active');
}

function calculateLiveTotal() {
    let packageTotal = 0;
    document.querySelectorAll('.pkg-check:checked').forEach(chk => {
        packageTotal += parseInt(chk.dataset.price || 0);
    });

    let addonsTotal = 0;
    document.querySelectorAll('.ingredient-check:checked').forEach(chk => {
        addonsTotal += parseInt(chk.dataset.price || 0);
    });

    let garlicTotal = 0;
    const garlicCheck = document.getElementById('garlic-checkbox');
    const garlicDisplay = document.getElementById('garlic-price-display');

    if (garlicCheck.checked) {
        garlicTotal = packageTotal + 20;
        garlicDisplay.textContent = `₱${garlicTotal} (Package + ₱20)`;
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
    renderHistory();
    cancelEdit();
}

function loadTransactionForEdit(id) {
    const t = state.transactions.find(trans => trans.id === id);
    if (!t) return;

    document.getElementById('transaction-id').value = t.id;
    document.getElementById('client').value = t.client;
    document.getElementById('nominee').value = t.nominee;
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
        const valCheck = document.querySelector(`.pkg-check[value="${pkgName}"]`);
        if (valCheck) valCheck.checked = true;
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

function searchTransactions() {
    const query = document.getElementById('search-input').value.toLowerCase();

    if (!query) {
        renderHistory();
        return;
    }

    const filtered = state.transactions.filter(t =>
        t.client.toLowerCase().includes(query) ||
        t.nominee.toLowerCase().includes(query)
    );

    renderHistory(filtered);
}

function renderHistory(dataOverride = null) {
    const container = document.getElementById('transaction-list');
    container.innerHTML = '';

    const dataToRender = dataOverride || state.transactions;

    if (dataToRender.length === 0) {
        container.innerHTML = '<div class="empty-state" style="text-align:center; color:#8E8E93; padding:20px;">No transactions found.</div>';
        return;
    }

    dataToRender.forEach(t => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.onclick = () => loadTransactionForEdit(t.id);

        let pkgDisplay = "";
        if (Array.isArray(t.packages) && t.packages.length > 0) {
            pkgDisplay = t.packages.join(", ");
        } else {
            pkgDisplay = t.packageLabel || t.package || "Custom";
        }

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start;">
                <div>
                    <div style="font-weight:600; font-size:16px;">${t.nominee} <span style="color:#8E8E93; font-weight:400;">(${t.batch})</span></div>
                    <div style="font-size:14px; color:#8E8E93; margin-top:2px;">${t.client}</div>
                    <div style="font-size:13px; color:#333; margin-top:4px;">${pkgDisplay}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:700; color:#1C1C1E;">₱${t.cost.toLocaleString()}</div>
                    <div style="font-size:12px; margin-top:4px; font-weight:600; color:${getStatusColor(t.status)};">${t.status}</div>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
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
            renderHistory();
            renderMaterials();
            showIOSAlert('Success', 'Database restored.');
        } catch (err) { showIOSAlert('Error', 'Invalid file.'); }
    };
    reader.readAsText(file);
    input.value = '';
}