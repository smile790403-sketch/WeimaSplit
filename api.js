// ==== API 連線設定 ====
const API_BASE = 'https://script.google.com/macros/s/AKfycbwQAeQfpN11TICFWUr7-cBcYXP8uNBwowfenucEc7CUXdNguHsITSHt1G1dC6bpnW3FTg/exec';
const APP_KEY = 'halfweimasplit2026';

// ========== 基本工具 ==========
function apiGet(params) {
  const url = new URL(API_BASE);
  Object.entries({ key: APP_KEY, ...params }).forEach(([k, v]) => {
    url.searchParams.set(k, v);
  });

  return fetch(url.toString(), {
    method: "GET",
  })
    .then((r) => r.json())
    .then((j) => {
      if (!j.ok) throw new Error(j.error);
      return j.data;
    });
}

function apiPost(params) {
  const body = new URLSearchParams({ key: APP_KEY, ...params });

  return fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
    .then((r) => r.json())
    .then((j) => {
      if (!j.ok) throw new Error(j.error);
      return j.data;
    });
}

// ========== API FUNCTIONS ==========

const Api = {
  // 旅程
  listTrips: () => apiGet({ action: "listtrips" }),
  addTrip: (payload) => apiPost({ action: "addtrip", ...payload }),
  updateTrip: (payload) => apiPost({ action: "updatetrip", ...payload }),

  // 換匯
  listFx: (tripId) => apiGet({ action: "listfx", tripId }),
  addFx: (payload) => apiPost({ action: "addfx", ...payload }),
  updateFx: (payload) => apiPost({ action: "updatefx", ...payload }),

  // 支出
  listExpenses: (tripId) => apiGet({ action: "listexpenses", tripId }),
  addExpense: (payload) => apiPost({ action: "addexpense", ...payload }),
  updateExpense: (payload) => apiPost({ action: "updateexpense", ...payload }),

  // 分析
  analytics: (tripId) => apiGet({ action: "analytics", tripId }),
  settlements: (tripId) => apiGet({ action: "settlements", tripId }),
};

// ========== 格式化 ==========
const fmt = {
  money: (v, cur = "TWD") =>
    `${cur} ${Number(v || 0).toLocaleString("zh-TW", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
};
