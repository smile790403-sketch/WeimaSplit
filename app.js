function normalizeDateValue(x){
  if (!x) return '';
  const d = (x instanceof Date) ? x : new Date(x);
  if (isNaN(d)) return '';
  return d.toISOString().slice(0,10); // YYYY-MM-DD
}
function pick(obj, ...keys){
  for (const k of keys) if (obj && obj[k]!=null && obj[k]!=='') return obj[k];
  return '';
}

const state = {
  trips: [],
  currentTripId: null,
  fx: [],
  expenses: [],
  payerAllocMode: 'equal', // equal | custom
};

function setActiveTab(tab){
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab===tab));
  document.querySelectorAll('.tab').forEach(s => s.classList.toggle('active', s.id === 'tab-'+tab));
}

function loadTrips(){
  return Api.listTrips().then(trips=>{
    state.trips = trips;
    const sel = document.getElementById('currentTrip');
    sel.innerHTML = '';
   trips.slice().reverse().forEach(t=>{
  const opt = document.createElement('option');
  const sd = normalizeDateValue(pick(t,'startDate','startdate','start date'));
  const ed = normalizeDateValue(pick(t,'endDate','enddate','end date'));
  opt.value = t.id;
  opt.textContent = `${t.name} (${sd||'—'}~${ed||'—'})`;
  sel.appendChild(opt);
});
    if (trips.length) {
      state.currentTripId = trips[trips.length - 1].id;
      sel.value = state.currentTripId;
    }
    renderTripTable();
    refreshTripScoped();
  });
}

function renderTripTable(){
  const tb = document.querySelector('#trip-table tbody');
  tb.innerHTML = '';
  state.trips.slice().reverse().forEach(t=>{
    const sd = normalizeDateValue(pick(t,'startDate','startdate','start date'));
    const ed = normalizeDateValue(pick(t,'endDate','enddate','end date'));
    const members = Array.isArray(t.participants)? t.participants.join(', ') : (t.participants||'');
    const baseShow = (t.baseCurrency||'').toUpperCase();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.name||''}</td>
      <td>${sd||''} ~ ${ed||''}</td>
      <td><span class="badge">${baseShow||'TWD'}</span></td>
      <td>${members}</td>
    `;
    tb.appendChild(tr);
  });
}

function refreshTripScoped(){
  const tripId = state.currentTripId;
  if (!tripId) return;
  Promise.all([
    Api.listFx(tripId).then(d => state.fx = d),
    Api.listExpenses(tripId).then(d => state.expenses = d),
  ]).then(()=>{
    renderFxList();
    renderExpenseList();
    renderAnalytics();
    renderSettlementList();
    renderDynamicSelectors();
    refreshPayerAllocCard(); // 初始化顯示
  }).catch(err=>alert(err.message));
}

function renderDynamicSelectors(){
  const trip = state.trips.find(t=>t.id===state.currentTripId);
  const people = (trip && Array.isArray(trip.participants)) ? trip.participants : [];
  const payerSel = document.getElementById('exp-payers');
  const partSel = document.getElementById('exp-participants');
  [payerSel, partSel].forEach(sel=>{
    sel.innerHTML='';
    people.forEach(p=>{
      const opt = document.createElement('option'); opt.value=p; opt.textContent=p;
      sel.appendChild(opt);
    });
  });

  // 幣別：TWD + 旅程常用幣別（可多個）+ 換匯表的幣別
  const currSel = document.getElementById('exp-currency');
  currSel.innerHTML='';
  const baseCs = (trip && Array.isArray(trip.baseCurrencies)) 
    ? trip.baseCurrencies 
    : ((trip?.baseCurrency||'').split(',').map(s=>s.trim().toUpperCase()));
  const set = new Set(['TWD', ...baseCs, ...state.fx.map(x=> (x.currency||'').toUpperCase())]);
  Array.from(set).filter(Boolean).forEach(c=>{
    const opt=document.createElement('option'); opt.value=c; opt.textContent=c;
    currSel.appendChild(opt);
  });
}


function renderFxList(){
  const tb = document.querySelector('#fx-table tbody');
  if (!tb) return;
  tb.innerHTML = '';
  const trip = state.trips.find(t=>t.id===state.currentTripId);
  const base = trip ? trip.baseCurrency : 'TWD';
  state.fx.slice().reverse().forEach(f=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${f.date}</td>
      <td>${f.currency}</td>
      <td>${Number(f.rateBasePerUnit).toFixed(4)}</td>
      <td>${Number(f.foreignAmount||0).toLocaleString()}</td>
      <td>${fmt.money(f.baseCost, base)}</td>
      <td>${f.vendor||''}</td>
      <td>${f.from||''}</td>
      <td>${f.note||''}</td>
    `;
    tb.appendChild(tr);
  });
}

// ========== 動態小表格：付款者分配 ==========
function getSelectedPayers(){
  const sel = document.getElementById('exp-payers');
  return Array.from(sel.selectedOptions).map(o=>o.value);
}
function buildPayerAllocTable(payers){
  const container = document.getElementById('payer-alloc-table');
  container.innerHTML = '';
  if (payers.length === 0) return;

  const grid = document.createElement('div');
  grid.className = 'payer-alloc-grid';
  payers.forEach(name=>{
    const labelCell = document.createElement('div');
    labelCell.className = 'cell';
    labelCell.textContent = name;

    const inputCell = document.createElement('div');
    inputCell.className = 'cell';
    const input = document.createElement('input');
    input.type = 'number'; input.step = '0.01'; input.min = '0';
    input.placeholder = (state.payerAllocMode === 'equal') ? '（均分中，無需輸入）' : '輸入金額或權重';
    input.disabled = (state.payerAllocMode === 'equal');
    input.dataset.payer = name;
    inputCell.appendChild(input);

    grid.appendChild(labelCell);
    grid.appendChild(inputCell);
  });
  container.appendChild(grid);
}

function refreshPayerAllocCard(){
  const card = document.getElementById('payers-alloc-card');
  const payers = getSelectedPayers();
  if (payers.length === 0) { card.style.display = 'none'; return; }
  card.style.display = 'block';
  buildPayerAllocTable(payers);
  updateBaseAmountPreview();
}

function setPayerAllocMode(mode){
  state.payerAllocMode = mode; // 'equal' | 'custom'
  document.querySelectorAll('.segmented .seg').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  // 重新建表（切換 disabled & placeholder）
  buildPayerAllocTable(getSelectedPayers());
}

function collectPayerAllocations(){
  const payers = getSelectedPayers();
  if (state.payerAllocMode === 'equal') return []; // 交由後端均分
  const inputs = Array.from(document.querySelectorAll('#payer-alloc-table input'));
  const vals = payers.map(name=>{
    const el = inputs.find(i=>i.dataset.payer === name);
    const v = el && el.value ? Number(el.value) : 0;
    return v;
  });
  return vals;
}

function estimateBaseAmount(){
  const amount = Number(document.getElementById('exp-amount').value||0);
  const currency = document.getElementById('exp-currency').value;
  const date = document.getElementById('exp-date').value;
  if (!amount || !currency || !date) return { base:'TWD', baseAmount: null, msg:'' };

  if (currency === 'TWD') return { base:'TWD', baseAmount: amount, msg:'' };
  const list = state.fx
    .filter(f=> (f.currency||'').toUpperCase()===currency)
    .sort((a,b)=> new Date(b.date)-new Date(a.date));
  const target = list.find(f=> new Date(f.date) <= new Date(date));
  if (!target) return { base:'TWD', baseAmount: null, msg:`缺 ${currency} 匯率（${date} 當日或之前）` };
  const rate = Number(target.rateBasePerUnit||0);
  if (!rate) return { base:'TWD', baseAmount: null, msg:`${currency} 匯率格式錯誤` };
  return { base:'TWD', baseAmount: +(amount*rate).toFixed(2), msg:'' };
}

function updateBaseAmountPreview(){
  const est = estimateBaseAmount();
  const twdInput = document.getElementById('exp-amount-twd');
  const helper = document.getElementById('base-amount-preview'); // 有就顯示；沒有也可忽略
  if (est.baseAmount==null) {
    if (twdInput) twdInput.value = '';
    if (helper) helper.textContent = est.msg ? `⚠️ ${est.msg}` : '';
  } else {
    if (twdInput) twdInput.value = Number(est.baseAmount)
      .toLocaleString('zh-TW',{minimumFractionDigits:2, maximumFractionDigits:2});
    if (helper) helper.textContent = `≈ TWD 估算：${fmt.money(est.baseAmount,'TWD')}`;
  }
}

// ========== 事件綁定 ==========
document.addEventListener('DOMContentLoaded', ()=>{
  // 切換分頁
  document.querySelectorAll('.tabs button').forEach(btn=>{
    btn.addEventListener('click', ()=> setActiveTab(btn.dataset.tab));
  });

  // 當前旅程切換
  document.getElementById('currentTrip').addEventListener('change', (e)=>{
    state.currentTripId = e.target.value;
    refreshTripScoped();
  });

  // 新增旅程
  document.getElementById('btn-add-trip').addEventListener('click', ()=>{
    const name = document.getElementById('trip-name').value.trim();
    const startDate = document.getElementById('trip-start').value;
    const endDate = document.getElementById('trip-end').value;
    const baseCurrency = document.getElementById('trip-base').value.trim().toUpperCase() || 'TWD';
    const participants = document.getElementById('trip-members').value.split(',').map(s=>s.trim()).filter(Boolean);
    if (!name || !startDate || !endDate) return alert('請填寫旅程名稱與日期');
    Api.addTrip({
      name, startDate, endDate, baseCurrency,
      participants: JSON.stringify(participants)
    }).then(()=>{
      document.getElementById('trip-name').value='';
      document.getElementById('trip-members').value='';
      loadTrips();
    }).catch(err=>alert(err.message));
  });

  // 換匯新增
  document.getElementById('btn-add-fx').addEventListener('click', ()=>{
    const tripId = state.currentTripId;
    const date = document.getElementById('fx-date').value;
    const vendor = document.getElementById('fx-vendor').value.trim();
    const currency = document.getElementById('fx-currency').value.trim().toUpperCase();
    const rateBasePerUnit = document.getElementById('fx-rate').value;
    const foreignAmount = document.getElementById('fx-amt').value || '0';
    const from = document.getElementById('fx-from').value.trim();
    const note = document.getElementById('fx-note').value.trim();
    if (!tripId) return alert('請先建立旅程');
    if (!date || !currency || !rateBasePerUnit) return alert('請填日期、幣別、匯率');
    Api.addFx({ tripId, date, vendor, currency, rateBasePerUnit, foreignAmount, from, note })
      .then(()=> {
        ['fx-date','fx-vendor','fx-currency','fx-rate','fx-amt','fx-from','fx-note'].forEach(id=>document.getElementById(id).value='');
        return Api.listFx(tripId);
      })
      .then(d=>{ state.fx = d; renderFxList(); renderDynamicSelectors(); })
      .catch(err=>alert(err.message));
  });

  // 記帳：付款者選擇變動 → 顯示/更新小表
  document.getElementById('exp-payers').addEventListener('change', refreshPayerAllocCard);
  // 切換均分/自訂
  document.querySelectorAll('.segmented .seg').forEach(btn=>{
    btn.addEventListener('click', ()=> setPayerAllocMode(btn.dataset.mode));
  });
  // 當日期/金額/幣別變更 → 更新 base 估算
  ['exp-date','exp-amount','exp-currency'].forEach(id=>{
    document.getElementById(id).addEventListener('input', updateBaseAmountPreview);
    document.getElementById(id).addEventListener('change', updateBaseAmountPreview);
  });

  // 參與者全選/全不選
  document.getElementById('btn-part-all').addEventListener('click', ()=>{
    const sel = document.getElementById('exp-participants');
    Array.from(sel.options).forEach(o=>o.selected=true);
  });
  document.getElementById('btn-part-none').addEventListener('click', ()=>{
    const sel = document.getElementById('exp-participants');
    Array.from(sel.options).forEach(o=>o.selected=false);
  });

  // 新增支出
  document.getElementById('btn-add-expense').addEventListener('click', ()=>{
  const tripId = state.currentTripId;
  if (!tripId) return alert('請先選擇旅程');

  const date = document.getElementById('exp-date').value;
  const category = document.getElementById('exp-category').value;
  const amount = document.getElementById('exp-amount').value;
  const currency = document.getElementById('exp-currency').value;
  const paymentMethod = document.getElementById('exp-paymethod').value;

  const payers = Array.from(document.getElementById('exp-payers').selectedOptions).map(o=>o.value);
  const participants = Array.from(document.getElementById('exp-participants').selectedOptions).map(o=>o.value);

  const splitMethod = document.getElementById('exp-splitmethod').value;
  const splitValuesStr = document.getElementById('exp-splitvalues').value.trim();
  const splitValues = splitValuesStr ? splitValuesStr.split(',').map(x=>Number(x.trim())) : [];

  const note = document.getElementById('exp-note').value.trim();

  if (!date || !amount || !currency) return alert('請填日期、金額、幣別');
  if (participants.length===0) return alert('請選擇費用參與者');
  if (payers.length===0) return alert('請選擇付款者');

  const payerAllocations = collectPayerAllocations();

  const payload = {
    tripId, date, category, amount, currency, paymentMethod, note,
    payers: JSON.stringify(payers),
    payerAllocations: JSON.stringify(payerAllocations), // [] 表示均分
    participants: JSON.stringify(participants),
    splitMethod,
    splitValues: JSON.stringify(splitValues)
  };

  const action = editingExpenseId ? Api.updateExpense : Api.addExpense;
  if (editingExpenseId) payload.id = editingExpenseId;

  action(payload).then(()=>{
    // reset
    ['exp-date','exp-amount','exp-splitvalues','exp-note','exp-amount-twd'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    document.getElementById('exp-category').selectedIndex=0;
    document.getElementById('exp-paymethod').selectedIndex=0;
    document.getElementById('exp-payers').selectedIndex=-1;
    document.getElementById('exp-participants').selectedIndex=-1;
    setPayerAllocMode('equal');
    refreshPayerAllocCard();
    document.getElementById('btn-add-expense').textContent = '新增支出';
    editingExpenseId = null;

    // reload
    return Api.listExpenses(tripId);
  }).then(d=>{
    state.expenses = d;
    renderExpenseList();
    renderAnalytics();
    renderSettlementList();
  }).catch(err=>alert(err.message));
});
  
    Api.addExpense({
      tripId, date, category, amount, currency, paymentMethod, note,
      payers: JSON.stringify(payers),
      payerAllocations: JSON.stringify(payerAllocations), // 若為[] → 後端均分付款額
      participants: JSON.stringify(participants),
      splitMethod,
      splitValues: JSON.stringify(splitValues)
    }).then(()=>{
      // reset
      ['exp-date','exp-amount','exp-splitvalues','exp-note'].forEach(id=>document.getElementById(id).value='');
      document.getElementById('exp-category').selectedIndex=0;
      document.getElementById('exp-paymethod').selectedIndex=0;
      document.getElementById('exp-payers').selectedIndex=-1;
      document.getElementById('exp-participants').selectedIndex=-1;
      setPayerAllocMode('equal');
      refreshPayerAllocCard();
      // reload
      return Api.listExpenses(tripId);
    }).then(d=>{
      state.expenses = d;
      renderExpenseList();
      renderAnalytics();
      renderSettlementList();
    }).catch(err=>alert(err.message));
  });

  // 篩選事件
  ['flt-start','flt-end','flt-cat','flt-paymethod'].forEach(id=>{
    document.getElementById(id).addEventListener('change', renderExpenseList);
  });

  // 初始化
  loadTrips();
});

function renderExpenseList(){
  const tb = document.querySelector('#exp-table tbody'); if(!tb) return;
  const s = document.getElementById('flt-start').value;
  const e = document.getElementById('flt-end').value;
  const cat = document.getElementById('flt-cat').value;
  const pm = document.getElementById('flt-paymethod').value;

  let rows = state.expenses.slice().sort((a,b)=> new Date(a.date)-new Date(b.date));
  if (s) rows = rows.filter(r=> new Date(r.date) >= new Date(s));
  if (e) rows = rows.filter(r=> new Date(r.date) <= new Date(e));
  if (cat) rows = rows.filter(r=> r.category === cat);
  if (pm) rows = rows.filter(r=> r.paymentMethod === pm);

  tb.innerHTML='';
  rows.forEach(x=>{
    const d = normalizeDateValue(x.date);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d}</td>
      <td>${x.category}</td>
      <td>${Number(x.amount).toLocaleString()}</td>
      <td>${x.currency}</td>
      <td>${fmt.money(x.baseAmount, 'TWD')}</td>
      <td>${Array.isArray(x.payers)? x.payers.join(', '):x.payers||''}</td>
      <td>${Array.isArray(x.participants)? x.participants.join(', '):x.participants||''}</td>
      <td>${x.splitMethod}</td>
      <td>${x.note||''}</td>
      <td><button class="ghost small btn-edit-exp" data-id="${x.id}">📝 編輯</button></td>
    `;
    tb.appendChild(tr);
  });
}
let editingExpenseId = null;

document.getElementById('exp-table').addEventListener('click', (e)=>{
  const btn = e.target.closest('.btn-edit-exp');
  if (!btn) return;
  const id = btn.dataset.id;
  const x = state.expenses.find(it=>it.id===id);
  if (!x) return;

  // 基本欄位
  document.getElementById('exp-date').value = normalizeDateValue(x.date);
  document.getElementById('exp-category').value = x.category;
  document.getElementById('exp-amount').value = x.amount;
  document.getElementById('exp-currency').value = x.currency;
  document.getElementById('exp-paymethod').value = x.paymentMethod || '';
  document.getElementById('exp-note').value = x.note || '';

  // 付款者 / 參與者
  const setSelect = (sel, values=[])=>{
    Array.from(sel.options).forEach(o => o.selected = values.includes(o.value));
  };
  setSelect(document.getElementById('exp-payers'), x.payers||[]);
  setSelect(document.getElementById('exp-participants'), x.participants||[]);

  // 分攤方式
  document.getElementById('exp-splitmethod').value = x.splitMethod || 'equal';
  document.getElementById('exp-splitvalues').value = Array.isArray(x.splitValues) ? x.splitValues.join(',') : '';

  // 付款者分配（若有）
  if (x.payers && x.payers.length) {
    setPayerAllocMode((x.payerAllocations && x.payerAllocations.length) ? 'custom' : 'equal');
    refreshPayerAllocCard();
    if (x.payerAllocations && x.payerAllocations.length) {
      // 將數值填入動態表格
      x.payers.forEach((name, idx)=>{
        const el = document.querySelector(`#payer-alloc-table input[data-payer="${name}"]`);
        if (el) el.value = x.payerAllocations[idx] || 0;
      });
    }
  }

  // 切換按鈕狀態
  editingExpenseId = id;
  document.getElementById('btn-add-expense').textContent = '更新支出';
  updateBaseAmountPreview();
});
