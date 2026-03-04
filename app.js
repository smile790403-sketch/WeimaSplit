// ======================================================
// 共用工具
// ======================================================

const state = {
  trips: [],
  currentTripId: null,
  fx: [],
  expenses: [],
  editingTripId: null,
  editingFxId: null,
  editingExpenseId: null,
};

// 只保留 YYYY-MM-DD
function normalizeDate(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d)) return "";
  return d.toISOString().slice(0, 10);
}

// ======================================================
// 分頁
// ======================================================

function setActiveTab(tab) {
  document.querySelectorAll(".tabs button").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  document.querySelectorAll(".tab").forEach((s) => {
    s.classList.toggle("active", s.id === `tab-${tab}`);
  });
}

// ======================================================
// 初始化
// ======================================================

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tabs button").forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  document.getElementById("currentTrip").addEventListener("change", (e) => {
    state.currentTripId = e.target.value;
    refreshTripScoped();
  });

  loadTrips();
});

// ======================================================
// 旅程：載入、渲染、新增、編輯
// ======================================================

function loadTrips() {
  Api.listTrips().then((trips) => {
    state.trips = trips;
    renderTripDropdown();
    renderTripTable();

    if (trips.length) {
      state.currentTripId = trips[trips.length - 1].id;
      document.getElementById("currentTrip").value = state.currentTripId;
    }

    refreshTripScoped();
  });
}

function renderTripDropdown() {
  const sel = document.getElementById("currentTrip");
  sel.innerHTML = "";
  state.trips.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.id;

    const sd = normalizeDate(t.startDate);
    const ed = normalizeDate(t.endDate);

    opt.textContent = `${t.name} (${sd}~${ed})`;
    sel.appendChild(opt);
  });
}

function renderTripTable() {
  const tb = document.querySelector("#trip-table tbody");
  tb.innerHTML = "";

  state.trips.forEach((t) => {
    const sd = normalizeDate(t.startDate);
    const ed = normalizeDate(t.endDate);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.name}</td>
      <td>${sd} ~ ${ed}</td>
      <td>${t.baseCurrency}</td>
      <td>${Array.isArray(t.participants) ? t.participants.join(", ") : t.participants}</td>
      <td><button class="ghost small" data-id="${t.id}" onclick="editTrip('${t.id}')">📝</button></td>
    `;
    tb.appendChild(tr);
  });
}

function editTrip(id) {
  const t = state.trips.find((x) => x.id === id);
  if (!t) return;

  state.editingTripId = id;

  document.getElementById("trip-name").value = t.name;
  document.getElementById("trip-base").value = t.baseCurrency;
  document.getElementById("trip-start").value = normalizeDate(t.startDate);
  document.getElementById("trip-end").value = normalizeDate(t.endDate);
  document.getElementById("trip-members").value = Array.isArray(t.participants)
    ? t.participants.join(", ")
    : t.participants;

  document.getElementById("btn-add-trip").textContent = "更新旅程";
}

document.getElementById("btn-add-trip").addEventListener("click", () => {
  const name = document.getElementById("trip-name").value.trim();
  const baseCurrency = document.getElementById("trip-base").value.trim().toUpperCase();
  const startDate = document.getElementById("trip-start").value;
  const endDate = document.getElementById("trip-end").value;
  const members = document
    .getElementById("trip-members")
    .value.split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  if (!name || !startDate || !endDate) {
    alert("請輸入旅程基本資料");
    return;
  }

  if (state.editingTripId) {
    Api.updateTrip({
      id: state.editingTripId,
      name,
      baseCurrency,
      startDate,
      endDate,
      participants: JSON.stringify(members),
    }).then(() => {
      state.editingTripId = null;
      document.getElementById("btn-add-trip").textContent = "新增旅程";
      loadTrips();
    });
  } else {
    Api.addTrip({
      name,
      baseCurrency,
      startDate,
      endDate,
      participants: JSON.stringify(members),
    }).then(() => {
      loadTrips();
    });
  }
});

// ======================================================
// 換匯：載入、渲染、新增、編輯
// ======================================================

function renderFxList() {
  const tb = document.querySelector("#fx-table tbody");
  tb.innerHTML = "";

  state.fx.forEach((f) => {
    const d = normalizeDate(f.date);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d}</td>
      <td>${f.currency}</td>
      <td>${f.rateBasePerUnit}</td>
      <td>${f.foreignAmount}</td>
      <td>${fmt.money(f.baseCost, "TWD")}</td>
      <td>${f.vendor}</td>
      <td>${f.from}</td>
      <td>${f.note}</td>
      <td><button class="ghost small" onclick="editFx('${f.id}')">📝</button></td>
    `;
    tb.appendChild(tr);
  });
}

function editFx(id) {
  const f = state.fx.find((x) => x.id === id);
  if (!f) return;

  state.editingFxId = id;

  document.getElementById("fx-date").value = normalizeDate(f.date);
  document.getElementById("fx-vendor").value = f.vendor || "";
  document.getElementById("fx-currency").value = f.currency;
  document.getElementById("fx-rate").value = f.rateBasePerUnit;
  document.getElementById("fx-amt").value = f.foreignAmount;
  document.getElementById("fx-from").value = f.from || "";
  document.getElementById("fx-note").value = f.note || "";

  document.getElementById("btn-add-fx").textContent = "更新換匯";
}

document.getElementById("btn-add-fx").addEventListener("click", () => {
  const tripId = state.currentTripId;
  const payload = {
    tripId,
    date: document.getElementById("fx-date").value,
    vendor: document.getElementById("fx-vendor").value,
    currency: document.getElementById("fx-currency").value.toUpperCase(),
    rateBasePerUnit: document.getElementById("fx-rate").value,
    foreignAmount: document.getElementById("fx-amt").value,
    from: document.getElementById("fx-from").value,
    note: document.getElementById("fx-note").value,
  };

  if (state.editingFxId) {
    payload.id = state.editingFxId;
    Api.updateFx(payload).then(() => {
      state.editingFxId = null;
      document.getElementById("btn-add-fx").textContent = "新增換匯";
      refreshTripScoped();
    });
  } else {
    Api.addFx(payload).then(() => {
      refreshTripScoped();
    });
  }
});

// ======================================================
// 記帳：載入、顯示、自動換 TWD、編輯、更新
// ======================================================

function refreshTripScoped() {
  if (!state.currentTripId) return;

  Promise.all([
    Api.listFx(state.currentTripId).then((d) => (state.fx = d)),
    Api.listExpenses(state.currentTripId).then((d) => (state.expenses = d)),
  ]).then(() => {
    renderFxList();
    renderExpenseList();
    renderDynamicSelectors();
  });
}

// 幣別來源：TWD + baseCurrency 多幣別 + 所有 FX 幣別
function renderDynamicSelectors() {
  const trip = state.trips.find((t) => t.id === state.currentTripId);
  const people = Array.isArray(trip.participants) ? trip.participants : [];

  // 付款者 + 參與者下拉
  const payerSel = document.getElementById("exp-payers");
  const partSel = document.getElementById("exp-participants");

  payerSel.innerHTML = "";
  partSel.innerHTML = "";

  people.forEach((p) => {
    const o1 = document.createElement("option");
    o1.value = p;
    o1.textContent = p;
    payerSel.appendChild(o1);

    const o2 = document.createElement("option");
    o2.value = p;
    o2.textContent = p;
    partSel.appendChild(o2);
  });

  // 幣別
  const currSel = document.getElementById("exp-currency");
  currSel.innerHTML = "";

  const baseCurrencies = trip.baseCurrency
    .split(",")
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean);

  const fs = [...state.fx.map((x) => x.currency.toUpperCase())];

  const set = new Set(["TWD", ...baseCurrencies, ...fs]);

  set.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    currSel.appendChild(opt);
  });
}

// 即時計算 TWD
function estimateTWD(amount, currency, date) {
  if (currency === "TWD") return amount;

  const list = state.fx
    .filter((f) => f.currency === currency)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const fx = list.find((f) => new Date(f.date) <= new Date(date));
  if (!fx) return null;

  return amount * fx.rateBasePerUnit;
}

document.getElementById("exp-amount").addEventListener("input", updateTWD);
document.getElementById("exp-date").addEventListener("input", updateTWD);
document.getElementById("exp-currency").addEventListener("change", updateTWD);

function updateTWD() {
  const amount = parseFloat(document.getElementById("exp-amount").value || 0);
  const currency = document.getElementById("exp-currency").value;
  const date = document.getElementById("exp-date").value;

  if (!amount || !currency || !date) {
    document.getElementById("exp-amount-twd").value = "";
    return;
  }

  const twd = estimateTWD(amount, currency, date);
  document.getElementById("exp-amount-twd").value = twd
    ? twd.toLocaleString("zh-TW", { minimumFractionDigits: 2 })
    : "";
}

// 支出列表
function renderExpenseList() {
  const tb = document.querySelector("#exp-table tbody");
  tb.innerHTML = "";

  state.expenses.forEach((e) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${normalizeDate(e.date)}</td>
      <td>${e.category}</td>
      <td>${e.amount}</td>
      <td>${e.currency}</td>
      <td>${fmt.money(e.baseAmount, "TWD")}</td>
      <td>${Array.isArray(e.payers) ? e.payers.join(", ") : ""}</td>
      <td>${Array.isArray(e.participants) ? e.participants.join(", ") : ""}</td>
      <td>${e.splitMethod}</td>
      <td>${e.note || ""}</td>
      <td><button class="ghost small" onclick="editExpense('${e.id}')">📝</button></td>
    `;
    tb.appendChild(tr);
  });
}

function editExpense(id) {
  const e = state.expenses.find((x) => x.id === id);
  if (!e) return;

  state.editingExpenseId = id;

  document.getElementById("exp-date").value = normalizeDate(e.date);
  document.getElementById("exp-category").value = e.category;
  document.getElementById("exp-amount").value = e.amount;
  document.getElementById("exp-currency").value = e.currency;
  document.getElementById("exp-paymethod").value = e.paymentMethod || "";
  document.getElementById("exp-note").value = e.note || "";
  document.getElementById("exp-splitmethod").value = e.splitMethod || "";
  document.getElementById("exp-splitvalues").value = Array.isArray(e.splitValues)
    ? e.splitValues.join(",")
    : "";

  // 付款者/參與者（多選）
  const paySel = document.getElementById("exp-payers");
  const partSel = document.getElementById("exp-participants");

  Array.from(paySel.options).forEach(
    (o) => (o.selected = e.payers.includes(o.value))
  );
  Array.from(partSel.options).forEach(
    (o) => (o.selected = e.participants.includes(o.value))
  );

  document.getElementById("btn-add-expense").textContent = "更新支出";

  updateTWD();
}

document.getElementById("btn-add-expense").addEventListener("click", () => {
  const tripId = state.currentTripId;

  const payload = {
    tripId,
    date: document.getElementById("exp-date").value,
    category: document.getElementById("exp-category").value,
    amount: document.getElementById("exp-amount").value,
    currency: document.getElementById("exp-currency").value,
    paymentMethod: document.getElementById("exp-paymethod").value,
    note: document.getElementById("exp-note").value,
    payers: JSON.stringify(
      [...document.getElementById("exp-payers").selectedOptions].map(
        (x) => x.value
      )
    ),
    participants: JSON.stringify(
      [...document.getElementById("exp-participants").selectedOptions].map(
        (x) => x.value
      )
    ),
    splitMethod: document.getElementById("exp-splitmethod").value,
    splitValues: JSON.stringify(
      document
        .getElementById("exp-splitvalues")
        .value.split(",")
        .map((x) => x.trim())
        .filter(Boolean)
    ),
  };

  if (state.editingExpenseId) {
    payload.id = state.editingExpenseId;
    Api.updateExpense(payload).then(() => {
      state.editingExpenseId = null;
      document.getElementById("btn-add-expense").textContent = "新增支出";
      refreshTripScoped();
    });
  } else {
    Api.addExpense(payload).then(() => {
      refreshTripScoped();
    });
  }
});
