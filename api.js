// ==== API 連線設定 ====
const API_BASE = 'https://script.google.com/macros/s/AKfycby6IFezFsPaqyWJhW3eK7PrY_c-odxUR-qpMpFv7pIb-2SGX3Af2aU1hSb882Cqj2mT3w/exec';
const APP_KEY = 'halfweimasplit2026';

function apiGet(params){
  const u = new URL(API_BASE);
  Object.entries({ key: APP_KEY, ...params }).forEach(([k,v]) => u.searchParams.set(k, v));
  return fetch(u.toString(), { method:'GET' }).then(r=>r.json()).then(j=>{
    if(!j.ok) throw new Error(j.error||'API error');
    return j.data;
  });
}

function apiPost(params){
  const body = new URLSearchParams({ key: APP_KEY, ...params });
  return fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type':'application/x-www-form-urlencoded' },
    body
  }).then(r=>r.json()).then(j=>{
    if(!j.ok) throw new Error(j.error||'API error');
    return j.data;
  });
}

const Api = {
  listTrips: () => apiGet({ action:'listtrips' }),
  addTrip:  (payload) => apiPost({ action:'addtrip', ...payload }),

  listFx:   (tripId) => apiGet({ action:'listfx', tripId }),
  addFx:    (payload) => apiPost({ action:'addfx', ...payload }),

  listExpenses: (tripId) => apiGet({ action:'listexpenses', tripId }),
  addExpense:   (payload) => apiPost({ action:'addexpense', ...payload }),

  analytics: (tripId) => apiGet({ action:'analytics', tripId }),
  settlements: (tripId) => apiGet({ action:'settlements', tripId }),
};

const fmt = {
  money:(n, c='TWD') => `${c} ${Number(n||0).toLocaleString('zh-TW',{minimumFractionDigits:2, maximumFractionDigits:2})}`
};
