// ===== AUTH / LOGIN =====
  if (!localStorage.getItem("pos_user")) {
    window.location.replace("login.html");
  }

// ===== AUTH / LOGIN =====
function logout() {
  if (confirm("Yakin ingin logout?")) {
    localStorage.removeItem("pos_user");
    localStorage.removeItem("pos_cashier_id");
    localStorage.removeItem("pos_cashier_name");

    window.location.replace("login.html");
  }
}

/* =====================================================
   SUPABASE
===================================================== */
// ===== CONFIG =====
const sb = window.supabase.createClient(
  "https://fpjfdxpdaqtopjorqood.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwamZkeHBkYXF0b3Bqb3Jxb29kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDkwNjUsImV4cCI6MjA4MjY2OTA2NX0.x8KgYQcSm9EMAk_vDzfDIYw4HY0vQnL4Sl_dyQ2lQN0"
);

/* =====================================================
   CASHIER (Supabase-driven)
   - List kasir di welcomeScreen diambil dari Supabase (table: pos_cashiers).
   Expected columns:
     - cashier_id   (text)  contoh: "KSR-01"
     - cashier_name (text)
     - is_active    (bool)
     - sort_order   (int)
===================================================== */

const CASHIER_TABLE = "pos_cashiers";

function removeSwitchCashierUI(){
  const btn = document.getElementById("btnSwitchCashier");
  if (btn) btn.remove();
}

function parseKasirNo(cashier_id){
  const s = String(cashier_id || "");
  // ambil angka terakhir: KSR-01 -> 01
  const m = s.match(/(\d+)\s*$/) || s.match(/(\d+)/);
  return m ? String(m[1]).padStart(2, "0") : "";
}

function makeCashierButtonText(c){
  const id = c?.cashier_id || "";
  const name = c?.cashier_name || "";
  const no = parseKasirNo(id);
  const kasirLabel = no ? `Kasir ${no}` : id;
  return `${name} — ${kasirLabel}`.trim();
}

function getCachedCashiers(){
  try {
    const raw = localStorage.getItem("pos_cashiers_cache");
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return Array.isArray(obj?.data) ? obj.data : null;
  } catch {
    return null;
  }
}

async function fetchCashiersFromSupabase(){
  if (!navigator.onLine) return null;

  try {
    const { data, error } = await sb
      .from(CASHIER_TABLE)
      .select("cashier_id,cashier_name,is_active,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    if (Array.isArray(data)) {
      localStorage.setItem("pos_cashiers_cache", JSON.stringify({ ts: Date.now(), data }));
    }

    return data || null;
  } catch (e) {
    console.warn("fetchCashiersFromSupabase gagal:", e);
    return null;
  }
}

function renderCashierButtons(cashiers){
  const wrap = document.getElementById("welcomeScreen");
  if (!wrap) return;

  // cari container yang paling cocok untuk taruh tombol
  let listBox =
    wrap.querySelector(".cashier-list") ||
    wrap.querySelector(".cashier-buttons") ||
    wrap;

  let btns = Array.from(listBox.querySelectorAll(".btn-cashier"));

  // kalau belum ada tombol sama sekali, buat container sederhana
  if (btns.length === 0) {
    const box = document.createElement("div");
    box.className = "cashier-list";
    box.style.display = "flex";
    box.style.flexDirection = "column";
    box.style.gap = "16px";
    listBox.appendChild(box);
    listBox = box;
    btns = [];
  }

  // pastikan jumlah tombol cukup
  while (btns.length < cashiers.length) {
    const b = document.createElement("button");
    b.className = "btn-cashier";
    listBox.appendChild(b);
    btns.push(b);
  }

  // isi tombol sesuai data kasir
  btns.forEach((b, i) => {
    const c = cashiers[i];
    if (!c) {
      b.style.display = "none";
      b.onclick = null;
      return;
    }
    b.style.display = "";
    b.textContent = makeCashierButtonText(c);
    b.onclick = () => selectCashier(c.cashier_id, c.cashier_name);
  });
}

async function loadAndRenderCashiers(){
  let cashiers = await fetchCashiersFromSupabase();
  if (!cashiers || !cashiers.length) cashiers = getCachedCashiers() || [];

  // jangan fallback hardcode lagi (biar benar-benar fokus Supabase)
  if (!cashiers.length) {
    console.warn("Cashier list kosong. Pastikan table pos_cashiers terisi (minimal 1 kasir aktif).");
    return;
  }

  renderCashierButtons(cashiers);
}

	
// ===============================
// CANCEL CACHE (READ FROM DB)
// ===============================


function toISOStart(dateStr) {
  return new Date(dateStr + "T00:00:00").toISOString();
}

function toISOEnd(dateStr) {
  return new Date(dateStr + "T23:59:59").toISOString();
}

async function fetchCanceledOrdersByISO(startISO, endISO) {
  try {
    let q = sb
      .from("pos_canceled_orders")
      .select("salesorder_no");

    if (startISO && endISO) {
      q = q.gte("created_at", startISO).lte("created_at", endISO);
    }

    const { data, error } = await q;
    if (error) throw error;

    canceledOrdersSet = new Set((data || []).map(r => r.salesorder_no));
    console.log("✅ canceledOrders loaded:", canceledOrdersSet.size);

  } catch (err) {
    console.error("❌ fetchCanceledOrdersByISO error:", err);
    canceledOrdersSet = new Set();
  }
}



/* =====================================================
   DOM REFS
===================================================== */
const panelReport = document.getElementById("panel-report");
const panelPiutang = document.getElementById("panel-piutang");

// PIUTANG MONITOR DOM
// PIUTANG MONITOR DOM
const piutangList = document.getElementById("piutangList");
const piutangCountInfo = document.getElementById("piutangCountInfo");
const piutangTotalInfo = document.getElementById("piutangTotalInfo");
const piutangSearch = document.getElementById("piutangSearch");
const piutangSort = document.getElementById("piutangSort");
const btnPiutangRefresh = document.getElementById("btnPiutangRefresh");


const productGrid = document.getElementById("productGrid");
const pageInfo = document.getElementById("pageInfo");
const prevPage = document.getElementById("prevPage");
const nextPage = document.getElementById("nextPage");

const searchInput = document.getElementById("searchInput");
const btnCari = document.getElementById("btnCari");

const cartItems = document.getElementById("cartItems");
const itemCount = document.getElementById("itemCount");
const cartSubtotal = document.getElementById("cartSubtotal");
const cartTotal = document.getElementById("cartTotal");
const cartPanel = document.querySelector(".cart-panel");


const panelProduct = document.getElementById("panel-product");
const panelPayment = document.getElementById("panel-payment");
const panelTransactions = document.getElementById("panel-transactions");
const panelSettings = document.getElementById("panel-settings");

const quickCash = document.getElementById("quickCash");

const payItemCount = document.getElementById("payItemCount");
const payTotal = document.getElementById("payTotal");
const cashInput = document.getElementById("cashInput");
const changeOutput = document.getElementById("changeOutput");
const btnNext = document.getElementById("btnNext");

const payLinesList = document.getElementById("payLinesList");
const payRemaining = document.getElementById("payRemaining");
const btnFinishPayment = document.getElementById("btnFinishPayment");
// === WA PHONE INPUT DOM (TAHAP 5) ===
const waPhoneBox = document.getElementById("waPhoneBox");
const waPhoneInput = document.getElementById("waPhoneInput");
// simpan no WA terakhir untuk mempercepat input berikutnya
if (waPhoneInput && !waPhoneInput.dataset.boundWa) {
  waPhoneInput.dataset.boundWa = "1";

  waPhoneInput.addEventListener("input", () => {
    const n = normalizeWaPhone(waPhoneInput.value);
    if (n) localStorage.setItem("pos_last_wa_phone", n);
  });

  waPhoneInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      console.log("[WA_PHONE_UI] enter ->", normalizeWaPhone(waPhoneInput.value));
      if (btnFinishPayment) btnFinishPayment.focus();
    }
  });
}

const txnSearchInput = document.getElementById("txnSearchInput");
const txnList = document.getElementById("txnList");
const txnPayFilter = document.getElementById("txnPayFilter");

const txnDetailTitle = document.getElementById("txnDetailTitle");
const txnDetailSub = document.getElementById("txnDetailSub");
const txnDetailBody = document.getElementById("txnDetailBody");
const txnDetailActions = document.getElementById("txnDetailActions");
const txnDetailBadge = document.getElementById("txnDetailBadge");
const customerInput = document.getElementById("customerInput");
const customerDropdown = document.getElementById("customerDropdown");

/* settings dom */
const setHideEmpty = document.getElementById("setHideEmpty");
const setHideKtn = document.getElementById("setHideKtn");
const setReceiptPaper = document.getElementById("setReceiptPaper");
const setStoreName = document.getElementById("setStoreName");
const setStoreSub = document.getElementById("setStoreSub");
const setShiftX = document.getElementById("setShiftX");
const setRequireStock = document.getElementById("setRequireStock");
const setNote1 = document.getElementById("setNote1");
const setNote2 = document.getElementById("setNote2");
const setAutoSyncHours = document.getElementById("setAutoSyncHours");



// customer autocomplete
if (customerInput) {
  customerInput.addEventListener("input", searchCustomer);

  customerInput.addEventListener("focus", () => {
    // kalau ada isi, tampilkan lagi hasil
    if (customerInput.value.trim()) searchCustomer();
  });
}
// ✅ bind input cash agar ketik angka langsung jadi payment line
if (cashInput && !cashInput.dataset.boundInput) {
  cashInput.dataset.boundInput = "1";
  cashInput.addEventListener("input", onCashInputChange);
  cashInput.addEventListener("change", onCashInputChange);
}

/* =====================================================
   STATE
===================================================== */
// ===== STATE =====
let PRODUCT_SORT_MODE =
  localStorage.getItem("product_sort_mode") || "best"; // best | latest | az

let PRODUCT_VIEW_MODE =
  localStorage.getItem("setting_product_view") || "normal";

let BEST_SELLER_PERIOD = "90d"; // default 90 hari
// =====================================================
// BEST SELLER OFFLINE SUPPORT
// =====================================================
const BESTSELLER_RANK_CACHE_PREFIX = "pos_best_seller_rankmap_v1_"; // + period
const BESTSELLER_OFFLINE_COUNTER_KEY = "pos_best_seller_offline_counter_v1"; // {item_code: qty}

function readJsonLS(key, fallback){
  try { return JSON.parse(localStorage.getItem(key) || ""); }
  catch(e){ return fallback; }
}
function writeJsonLS(key, obj){
  localStorage.setItem(key, JSON.stringify(obj || {}));
}

function loadBestSellerRankCache(period){
  const key = BESTSELLER_RANK_CACHE_PREFIX + String(period || "90d");
  return readJsonLS(key, {});
}
function saveBestSellerRankCache(period, rankMap){
  const key = BESTSELLER_RANK_CACHE_PREFIX + String(period || "90d");
  writeJsonLS(key, rankMap || {});
  localStorage.setItem(key + "_ts", String(Date.now()));
}

function loadOfflineBestCounter(){
  return readJsonLS(BESTSELLER_OFFLINE_COUNTER_KEY, {});
}

function bumpOfflineBestCounter(cartItems){
  // cartItems: [{ code/itemCode, qty, ... }]
  const counter = loadOfflineBestCounter();
  (cartItems || []).forEach(it => {
    const code = String(it.code || it.itemCode || "").trim();
    const qty  = Number(it.qty || 0);
    if(!code || qty <= 0) return;
    counter[code] = Number(counter[code] || 0) + qty;
  });
  writeJsonLS(BESTSELLER_OFFLINE_COUNTER_KEY, counter);
}

let page = 1;
const pageSize = 25;
let currentQuery = "";
let filters = {
  hideEmpty: false,
  hideKtn: false,
  requireStock: true   // default: WAJIB ADA STOK
};

let cart = [];
// ================================
// RESEND WA (TAHAP 9) - TXN CACHE
// ================================
let CURRENT_TXN_DETAIL = null; // { header, items, payments, isOffline }

let selectedPaymentMethod = null;
let PAYMENT_LINES = []; // [{ method:'cash', label:'Kas', amount:20000 }]

let CUSTOMER_LIST = [];
let ACTIVE_CUSTOMER = null;
// ===== STEP 3: Price history (P prev) =====
let LAST_PRICE_HISTORY = {}; // { [item_id]: { pPrev:number, dateIso:string } }
// ✅ COST HISTORY (baru)
let COST_HISTORY_MAP = {}; // { [itemId]: { now:{c,dt}, prev:{c,dt} } }

let _histTimer = null;
let _histLastKey = null;
// ===== MODAL STEP1A: cost_now dari PO terbaru =====
let COST_NOW_MAP = {};     // { [itemId]: { cNow, dateIso } }
let _costLastKey = "";
let _costTimer = null;

function formatDateDDMMYYYY(iso){
  if(!iso) return "-";
  const d = new Date(iso);
  if(Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

let PRICE_MAP = {};
let PACKING_MAP = {};
/* =====================================================
   HARGA TOOLTIP (BUKU HARGA) — STEP 2
   Hover di harga => tooltip kiri-bawah berisi semua buku harga.
   ===================================================== */

let PRICE_TOOLTIP_EL = null;
let PRICE_TOOLTIP_HIDE_TIMER = null;
let PRICE_TOOLTIP_ACTIVE_TARGET = null;

const PRICE_BOOK_ORDER = ["umum", "member", "reseller", "agen", "lv1_pcs"];
const PRICE_BOOK_LABEL = {
  umum: "Harga Umum",
  member: "Harga Member",
  reseller: "Harga Reseller",
  agen: "Harga Agen",
  lv1_pcs: "Harga Kartonan",
};

function ensurePriceTooltipEl() {
  if (PRICE_TOOLTIP_EL) return PRICE_TOOLTIP_EL;

  const el = document.createElement("div");
  el.id = "priceTooltip";
  el.className = "price-tooltip";
  el.style.display = "none";
  el.innerHTML = `
    <div class="price-tooltip__title">Harga Bertingkat</div>
    <div class="price-tooltip__body">
      <div class="price-tooltip__loading">Memuat...</div>
    </div>
  `;
  document.body.appendChild(el);

  // Hover di tooltip jangan langsung hilang
  el.addEventListener("mouseenter", () => cancelHidePriceTooltip());
  el.addEventListener("mouseleave", () => scheduleHidePriceTooltip());

  PRICE_TOOLTIP_EL = el;
  return el;
}

function cancelHidePriceTooltip() {
  if (PRICE_TOOLTIP_HIDE_TIMER) {
    clearTimeout(PRICE_TOOLTIP_HIDE_TIMER);
    PRICE_TOOLTIP_HIDE_TIMER = null;
  }
}

function scheduleHidePriceTooltip(delay = 120) {
  cancelHidePriceTooltip();
  PRICE_TOOLTIP_HIDE_TIMER = setTimeout(() => {
    hidePriceTooltip();
  }, delay);
}

async function ensurePriceDataForTooltip() {
  try {
    if (!PRICE_MAP || Object.keys(PRICE_MAP).length === 0) {
      await loadPriceMap();
    }
  } catch (_) {}

  try {
    if (!PACKING_MAP || Object.keys(PACKING_MAP).length === 0) {
      await loadPackingMap();
    }
  } catch (_) {}
}

function buildPriceTooltipHTML(itemCode) {
  const prices = (PRICE_MAP && PRICE_MAP[itemCode]) ? PRICE_MAP[itemCode] : {};
  const pcsPerKarton = (PACKING_MAP && PACKING_MAP[itemCode]) ? PACKING_MAP[itemCode] : 0;

  const rows = PRICE_BOOK_ORDER.map((cat) => {
    const labelBase = PRICE_BOOK_LABEL[cat] || cat;
    const priceVal = prices ? prices[cat] : undefined;
    const priceText = (priceVal !== undefined && priceVal !== null) ? formatRupiah(priceVal) : "-";

    if (cat === "lv1_pcs") {
      const label = pcsPerKarton ? `${labelBase} (isi ${pcsPerKarton})` : labelBase;
      return `<div class="price-tooltip__row"><span>${label}</span><b>${priceText}</b></div>`;
    }

    return `<div class="price-tooltip__row"><span>${labelBase}</span><b>${priceText}</b></div>`;
  }).join("");

  return `
    <div class="price-tooltip__rowhead">${itemCode}</div>
    <div class="price-tooltip__divider"></div>
    ${rows}
  `;
}

function positionPriceTooltip(targetEl, tooltipEl) {
  const rect = targetEl.getBoundingClientRect();
  const gap = 8;

  tooltipEl.style.display = "block";
  tooltipEl.style.visibility = "hidden";
  tooltipEl.style.left = "0px";
  tooltipEl.style.top = "0px";

  const w = tooltipEl.offsetWidth;
  const h = tooltipEl.offsetHeight;

  // WAJIB: kiri-bawah
  let left = rect.left - w - gap;
  let top = rect.bottom + gap;

  // Anti hilang (clamp). TIDAK flip ke kanan/atas.
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
  top = Math.max(8, Math.min(top, window.innerHeight - h - 8));

  tooltipEl.style.left = `${Math.round(left)}px`;
  tooltipEl.style.top = `${Math.round(top)}px`;
  tooltipEl.style.visibility = "visible";
}

async function showPriceTooltip(targetEl) {
  if (!targetEl) return;

  // Jika sedang edit price manual (ada input), jangan ganggu
  if (targetEl.querySelector && targetEl.querySelector("input")) return;

  const itemCode = targetEl.getAttribute("data-item-code");
  if (!itemCode) return;

  const tooltipEl = ensurePriceTooltipEl();
  PRICE_TOOLTIP_ACTIVE_TARGET = targetEl;

  tooltipEl.querySelector(".price-tooltip__title").textContent = "Harga Bertingkat";
  tooltipEl.querySelector(".price-tooltip__body").innerHTML = `<div class="price-tooltip__loading">Memuat...</div>`;
  positionPriceTooltip(targetEl, tooltipEl);

  await ensurePriceDataForTooltip();

  // Kalau user sudah pindah hover sebelum load selesai
  if (PRICE_TOOLTIP_ACTIVE_TARGET !== targetEl) return;

  tooltipEl.querySelector(".price-tooltip__body").innerHTML = buildPriceTooltipHTML(itemCode);

  // Re-position setelah konten berubah (tinggi/lebar bisa berubah)
  positionPriceTooltip(targetEl, tooltipEl);
}

function hidePriceTooltip() {
  cancelHidePriceTooltip();
  if (!PRICE_TOOLTIP_EL) return;
  PRICE_TOOLTIP_EL.style.display = "none";
  PRICE_TOOLTIP_ACTIVE_TARGET = null;
}

function bindPriceTooltipEvents() {
  // Hanya 1x bind
  if (window.__PRICE_TOOLTIP_BINDED__) return;
  window.__PRICE_TOOLTIP_BINDED__ = true;

  document.addEventListener("mouseover", (e) => {
    const target = e.target.closest(".js-price-hover");
    if (!target) return;
    cancelHidePriceTooltip();
    showPriceTooltip(target);
  });

  document.addEventListener("mouseout", (e) => {
    const from = e.target.closest(".js-price-hover");
    if (!from) return;

    const toEl = e.relatedTarget;
    if (PRICE_TOOLTIP_EL && toEl && PRICE_TOOLTIP_EL.contains(toEl)) return;

    scheduleHidePriceTooltip();
  });

  // Kalau scroll/resize saat tooltip tampil, tetap nempel kiri-bawah target (clamp)
  window.addEventListener("scroll", () => {
    if (!PRICE_TOOLTIP_EL) return;
    if (PRICE_TOOLTIP_EL.style.display === "none") return;
    if (!PRICE_TOOLTIP_ACTIVE_TARGET) return;
    positionPriceTooltip(PRICE_TOOLTIP_ACTIVE_TARGET, PRICE_TOOLTIP_EL);
  }, true);

  window.addEventListener("resize", () => {
    if (!PRICE_TOOLTIP_EL) return;
    if (PRICE_TOOLTIP_EL.style.display === "none") return;
    if (!PRICE_TOOLTIP_ACTIVE_TARGET) return;
    positionPriceTooltip(PRICE_TOOLTIP_ACTIVE_TARGET, PRICE_TOOLTIP_EL);
  });
}

let CURRENT_SALESORDER_NO = null;
let CURRENT_LOCAL_ORDER_NO = null;     // ✅ nomor offline (local)
let CURRENT_ORDER_MODE = "online";     // "online" | "offline"

let CURRENT_HOLD_ID = null; // ✅ id transaksi tersimpan yang sedang aktif

let RECEIPT_PAPER = "80";
let STORE_NAME = "TASAJI FOOD";
let STORE_SUB = "Jalan Mandor Demong";
let STORE_NOTE_1 = "Terima kasih 🙏";
let STORE_NOTE_2 = ""; // misal: "Pengaduan: 0812xxxxxxx"
let REPORT_UI_BOUND = false;
// kasir/terminal (tanpa login)
let CASHIER_ID = null;
let CASHIER_NAME = null;
let AUTO_SYNC_HOURS = 3; // default
let canceledOrdersSet = new Set();



function loadCashier(){
  CASHIER_ID = localStorage.getItem("pos_cashier_id") || null;
  CASHIER_NAME = localStorage.getItem("pos_cashier_name") || null;
}


/* transaksi */
let TXN_PAGE = 1;
const TXN_PAGE_SIZE = 20;
let TXN_SELECTED = null; // { salesorder_no, header, items, payments }
// ===============================
// BANK ACCOUNTS (TRANSFER)
// ===============================
const BANK_ACCOUNTS = {
  bca: [
    { id:"bca_1", label:"BCA - Umi",   acc_name:"MARYAM MOH. IBRAHIM",     acc_no:"8416019083" },
    { id:"bca_2", label:"BCA - Ahmad",   acc_name:"AHMAD MUJAHID",            acc_no:"8415132227" },
    { id:"bca_3", label:"BCA - Maulida",     acc_name:"MAULIDATUL HASANAH",       acc_no:"8960709498" },
    { id:"bca_4", label:"BCA - Bilqis",  acc_name:"PUTRI BILQIS AL BANNA",    acc_no:"8416081960" },
  ],
  mandiri: [
    { id:"mdr_1", label:"Mandiri - Ahmad", acc_name:"AHMAD MUJAHID", acc_no:"1400016969744" },
  ],
};


function accLast4(accNo){
  const s = String(accNo || "").replace(/\D/g, "");
  return s.slice(-4);
}

function formatAccLine(a){
  // contoh: "BCA 1 (a/n Tasaji Food ••••1234)"
  return `${a.label} (a/n ${a.acc_name} ••••${accLast4(a.acc_no)})`;
}

function pickAccountPrompt(bankKey){
  const list = BANK_ACCOUNTS[bankKey] || [];
  if (!list.length) return null;

  const menu = list
    .map((a, i) => `${i+1}. ${formatAccLine(a)}`)
    .join("\n");

  const input = prompt(
    `Pilih rekening ${bankKey.toUpperCase()}:\n\n${menu}\n\nKetik angka 1-${list.length}`
  );

  const idx = Number(input) - 1;
  if (Number.isNaN(idx) || idx < 0 || idx >= list.length) return null;
  return list[idx];
}

/* =====================================================
   UTIL
===================================================== */
function updateTxnCount(count){
  const el = document.getElementById("txnCountInfo");
  if (!el) return;

  el.textContent = `Total: ${count} transaksi`;
}

async function manualSyncProducts(){
  if (!isOnline()) {
    alert("Tidak bisa sync saat offline.");
    return;
  }

  updateSyncStatus("⏳ Sync produk...");
  await syncAllProductsToCache();
  updateSyncStatus("✅ Sync selesai");
}
function updateSyncStatus(text){
  const el = document.getElementById("syncStatus");
  if (el) el.textContent = text;
}

// ==============================
// PRODUCT CACHE (OFFLINE SUPPORT)
// ==============================
// ==============================
// PRICE / PACKING / CUSTOMER CACHE
// ==============================
function saveJsonCache(key, obj){
  try{ localStorage.setItem(key, JSON.stringify(obj || null)); }catch{}
}
function loadJsonCache(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return fallback;
    return JSON.parse(raw);
  }catch{
    return fallback;
  }
}

function savePriceMapCache(map){
  saveJsonCache("pos_price_map_v1", map);
  localStorage.setItem("pos_price_map_ts", String(Date.now()));
}
function loadPriceMapCache(){
  return loadJsonCache("pos_price_map_v1", {}) || {};
}

function savePackingMapCache(map){
  saveJsonCache("pos_packing_map_v1", map);
  localStorage.setItem("pos_packing_map_ts", String(Date.now()));
}
function loadPackingMapCache(){
  return loadJsonCache("pos_packing_map_v1", {}) || {};
}

function saveCustomerCache(list){
  saveJsonCache("pos_customers_cache_v1", Array.isArray(list) ? list : []);
  localStorage.setItem("pos_customers_cache_ts", String(Date.now()));
}
function loadCustomerCache(){
  const list = loadJsonCache("pos_customers_cache_v1", []);
  return Array.isArray(list) ? list : [];
}

function saveProductsCache(list){
  if (!Array.isArray(list)) return;
  localStorage.setItem("pos_products_cache_v1", JSON.stringify(list));
}

function loadProductsCache(){
  try{
    return JSON.parse(localStorage.getItem("pos_products_cache_v1") || "[]");
  }catch{
    return [];
  }
}
/* =====================================================
   IMAGE OFFLINE CACHE (THUMBNAILS)
   Tujuan: semua gambar produk bisa tampil saat OFFLINE
===================================================== */
const IMG_CACHE_NAME = "pos_images_cache_v1";
const IMG_OBJURL_MAP = new Map(); // url -> objectURL (biar tidak fetch ulang)

function normalizeImgUrl(u){
  return String(u || "").trim();
}

async function cacheImageUrl(url){
  const u = normalizeImgUrl(url);
  if(!u) return false;

  // sudah pernah dibuat objectURL (berarti sudah ada cache), skip
  if (IMG_OBJURL_MAP.has(u)) return true;

  const cache = await caches.open(IMG_CACHE_NAME);
  const hit = await cache.match(u);
  if (hit) return true;

  // kalau offline, tidak bisa fetch
  if (!isOnline()) return false;

  const res = await fetch(u, { cache: "no-store" });
  if (!res.ok) return false;

  await cache.put(u, res.clone());
  return true;
}

async function getImageObjectUrl(url){
  const u = normalizeImgUrl(url);
  if(!u) return "";

  if (IMG_OBJURL_MAP.has(u)) return IMG_OBJURL_MAP.get(u);

  const cache = await caches.open(IMG_CACHE_NAME);
  let hit = await cache.match(u);

  // kalau belum ada di cache, coba download (kalau online)
  if (!hit) {
    const ok = await cacheImageUrl(u);
    if (ok) hit = await cache.match(u);
  }

  if (!hit) return ""; // belum ada cache & tidak bisa fetch

  const blob = await hit.blob();
  const objUrl = URL.createObjectURL(blob);
  IMG_OBJURL_MAP.set(u, objUrl);
  return objUrl;
}

async function setProductImage(imgEl, url){
  if(!imgEl) return;
  const u = normalizeImgUrl(url);
  if(!u){
    imgEl.removeAttribute("src");
    return;
  }

  // tampilkan cepat: kalau online, boleh pasang url dulu
  // tapi kalau offline, akan blank → nanti kita ganti ke objectURL
  if (isOnline()) imgEl.src = u;

  try{
    const objUrl = await getImageObjectUrl(u);
    if (objUrl) imgEl.src = objUrl;
    else if (!isOnline()) imgEl.removeAttribute("src");
  }catch{
    // fallback: biarkan src yang sudah ada
  }
}

async function prefetchAllProductImages(){
  // Ambil dari cache produk (paling stabil)
  const list = loadProductsCache() || [];
  const urls = [...new Set(list.map(p => normalizeImgUrl(p.thumbnail)).filter(Boolean))];

  if(!urls.length){
    updateSyncStatus("ℹ️ Tidak ada thumbnail untuk diunduh");
    return;
  }

  if(!isOnline()){
    updateSyncStatus("🔴 Offline: tidak bisa download gambar. Online dulu untuk caching.");
    return;
  }

  updateSyncStatus(`⬇️ Download gambar 0/${urls.length}`);

  let done = 0;
  const concurrency = 8;
  let idx = 0;

  async function worker(){
    while(idx < urls.length){
      const my = idx++;
      const u = urls[my];
      try { await cacheImageUrl(u); } catch {}
      done++;
      if (done % 10 === 0 || done === urls.length){
        updateSyncStatus(`⬇️ Download gambar ${done}/${urls.length}`);
      }
    }
  }

  const workers = Array.from({length: concurrency}, () => worker());
  await Promise.all(workers);

  localStorage.setItem("pos_images_cache_ts", String(Date.now()));
  updateSyncStatus(`✅ Download gambar selesai (${done}/${urls.length})`);
}

/// ==============================
// CACHE STALENESS (PRODUCTS)
// ==============================
function getProductsCacheAgeMs(){
  const ts = Number(localStorage.getItem("pos_products_cache_ts") || 0);
  if (!ts) return Infinity;
  return Date.now() - ts;
}


async function syncAllProductsToCacheIfNeeded(){
  if (!isOnline()) return;

  const cached = loadProductsCache();
  const ageMs = getProductsCacheAgeMs();
  const maxAgeMs = (AUTO_SYNC_HOURS || 3) * 60 * 60 * 1000;

  if (!cached.length || ageMs > maxAgeMs) {
    await syncAllProductsToCache();
    updateSyncStatus("✅ Auto sync selesai");
  } else {
    updateSyncStatus("ℹ️ Cache masih fresh");
  }
}


// ==============================
// SYNC ALL PRODUCTS TO CACHE (ONLINE ONLY)
// ==============================
async function syncAllProductsToCache(){
  if(!isOnline()) return;

  try{
    let all = [];
    let from = 0;
    const size = 1000;

    while(true){
      const { data, error } = await sb
        .from("master_items")
        .select("item_id,item_code,item_name,thumbnail,sell_price,barcode")
        .order("item_name", { ascending:true })
        .range(from, from + size - 1);

      if(error) throw error;

      all.push(...(data || []));
      if(!data || data.length < size) break;

      from += size;
    }

    // ✅ merge stok SSOT sebelum disimpan ke cache (offline akan pakai available_qty ini)
    all = await mergeSSOTStockIntoProducts(all);

    saveProductsCache(all);
    localStorage.setItem("pos_products_cache_ts", String(Date.now()));
    console.log("✅ Cached products:", all.length);
	// ✅ setelah produk cache terisi, download semua thumbnail
prefetchAllProductImages().catch(err => console.warn("prefetch images err", err));

  }catch(err){
    console.error("❌ syncAllProductsToCache error:", err);
  }
}
let ONLINE_OK = true;
let ONLINE_CHECKING = false;

// ==============================
// ONLINE / OFFLINE DETECTOR
// ==============================
function isOnline(){
  // ✅ jangan gampang-gampang menganggap offline hanya karena ONLINE_OK belum terisi
  const nav = (typeof navigator !== "undefined") ? !!navigator.onLine : true;
  const ok  = (typeof ONLINE_OK !== "undefined") ? (ONLINE_OK !== false) : true; 
  return nav && ok;
}



async function canReachSupabase(){
  if (!navigator.onLine) return false;

  try {
    const { error } = await sb
      .from("master_items")
      .select("item_id")
      .limit(1);

    return !error;
  } catch {
    return false;
  }
}
async function refreshOnlineStatus(){
  if (ONLINE_CHECKING) return;
  ONLINE_CHECKING = true;

  try{
    const ok = await canReachSupabase(); // ini yang benar-benar ngetes koneksi
    ONLINE_OK = !!ok;
  }catch{
    ONLINE_OK = false;
  }finally{
    ONLINE_CHECKING = false;
  }

  // kecil tapi penting: kasih tanda di UI
  const el = document.getElementById("syncStatus");
  if (el){
    el.textContent = ONLINE_OK ? "🟢 Online" : "🔴 Offline";
  }
}


// ==============================
// OFFLINE ORDER NO GENERATOR
// Format: L-TSJ-YYYYMMDD-KSR01-0001
// ==============================
function pad(n, len){
  return String(n || 0).padStart(len, "0");
}

function getLocalDateYMD(){
  const d = new Date();
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1, 2);
  const day = pad(d.getDate(), 2);
  return `${y}${m}${day}`;
}

function normalizeCashierIdForLocal(){
  // KSR-01 -> KSR01 (biar rapih)
  const raw = (CASHIER_ID || localStorage.getItem("pos_cashier_id") || "KSR00");
  return String(raw).replace(/[^A-Za-z0-9]/g, "");
}

function getLocalCounterKey(){
  // counter per kasir per tanggal
  const ymd = getLocalDateYMD();
  const kid = normalizeCashierIdForLocal();
  return `pos_local_counter_${kid}_${ymd}`;
}

function generateLocalOrderNo(){
  const ymd = getLocalDateYMD();
  const kid = normalizeCashierIdForLocal();
  const key = getLocalCounterKey();

  const last = Number(localStorage.getItem(key) || 0);
  const next = last + 1;

  localStorage.setItem(key, String(next));

  return `L-TSJ-${ymd}-${kid}-${pad(next, 4)}`;
}

function isOrderActive(){
  return (cart && cart.length > 0) ||
         (panelPayment && panelPayment.offsetParent !== null);
}



// ===== UTILITIES =====
const formatRupiah = n => "Rp " + Number(n || 0).toLocaleString("id-ID");
// ==============================
// MANUAL PRICE EDIT (INLINE)
// ==============================
function formatNumberInput(n){
  return String(Number(n||0));
}

function setManualPrice(code, newPrice){
  const item = cart.find(i => (i.code || i.itemCode) === code);
  if(!item) return;

  const v = Number(newPrice || 0);

  // kalau kosong / 0 → balik ke auto
  if(!v || v <= 0){
    item.price_manual = false;
    item.price = item.price_auto ?? getFinalPrice(item.code || item.itemCode, item.qty);
  } else {
    item.price_manual = true;
    item.price = v;
  }

  renderCart();
  saveOrderState();
}

// ==============================
// QUICK CASH (DINAMIS) - START 500
// ==============================
function roundUp(n, step){
  const v = Number(n || 0);
  const s = Number(step || 500);
  return Math.ceil(v / s) * s;
}

function getQuickCashStep(total){
  const t = Number(total || 0);

  // start 500 (abaikan 100/200)
  if (t < 10000) return 500;        // 0 - 9.999
  if (t < 50000) return 5000;       // 10.000 - 49.999
  return 10000;                     // >= 50.000 selalu step 10.000 (lebih kasir banget)
}


function buildQuickCashOptions(total){
  const t = Number(total || 0);
  if (t <= 0) return [];

  const step = getQuickCashStep(t);

  const A = roundUp(t, step);        // pembulatan terdekat di atas total
  const B = A + step;                // +10k
  const C = A + (2 * step);          // +20k

  // Pecahan besar untuk "bayar gampang"
  const bigChoices = [50000, 100000, 200000, 500000, 1000000, 2000000];
  let D = bigChoices.find(x => x >= t) || (C + step);

  // kalau D terlalu dekat (misalnya t=180k, D=200k, sama dgn C), naikkan 1 level lagi
  if ([A, B, C].includes(D)) {
    const idx = bigChoices.indexOf(D);
    if (idx >= 0 && idx < bigChoices.length - 1) D = bigChoices[idx + 1];
  }

  return Array.from(new Set([A, B, C, D]));
}

function renderQuickCashButtons(){
  const box = document.getElementById("quickCash");
  if (!box) return;

  const total = calcTotal();
  const opts = buildQuickCashOptions(total);

  // tombol selalu: Sama
  let html = `
    <button class="btn" type="button" onclick="setCash(calcTotal())">Sama</button>
  `;

  // tombol dinamis
  opts.forEach(v => {
    html += `
      <button class="btn" type="button" onclick="setCash(${v})">
        ${formatRupiah(v).replace("Rp ", "")}
      </button>
    `;
  });

  box.innerHTML = html;
}


function applyShiftX(mm){
  const v = Number(mm || 0);
  document.documentElement.style.setProperty("--shiftX", `${v}mm`);
}
function openPriceCheck(){
  // buka tab baru ke halaman cek-harga
  // path relatif: karena file cek-harga.html satu folder dengan pos.html
   window.open("cek-harga.html", "_blank"); //offline
   window.open("/cek-harga.html", "_blank"); //online
}

function formatDateID(iso){
  try{
    return new Date(iso).toLocaleString("id-ID");
  } catch {
    return iso || "-";
  }
}
function normalizePhone(phone) {
  if (!phone) return "";
  let p = String(phone).replace(/\D/g, "");
  if (p.startsWith("0")) p = "62" + p.slice(1);
  if (!p.startsWith("62")) p = "62" + p;
  return Number(p);
}
/* =====================================================
/* =====================================================
   HOLD / PARKED ORDERS (HYBRID: online+offline)
   - Offline: localStorage (per device)
   - Online : Supabase table `pos_holds` (shared antar kasir)
   Catatan:
   - Saat "dibuka" (Resume), hold langsung dihapus dari list (consume).
===================================================== */
const HOLD_LOCAL_KEY = "pos_holds_v1";
const HOLD_DELETE_QUEUE_KEY = "pos_holds_delete_queue_v1";

// cache list gabungan (buat aksi rename/delete dengan source)
let __HOLD_LIST_CACHE = [];

function loadHolds(){
  try{
    const arr = JSON.parse(localStorage.getItem(HOLD_LOCAL_KEY) || "[]") || [];

    // localStorage hanya untuk HOLD OFFLINE (pending sync).
    // hold yang sudah "online" tidak boleh jadi shadow copy.
    const filtered = (arr || []).filter(h => String(h?.source || "local").toLowerCase() !== "online");

    // auto-cleanup data lama (shadow online) dari localStorage
    if(filtered.length !== (arr || []).length){
      try{ localStorage.setItem(HOLD_LOCAL_KEY, JSON.stringify(filtered)); }catch(e){}
    }

    return filtered;
  }catch{
    return [];
  }
}

function saveHolds(list){
  localStorage.setItem(HOLD_LOCAL_KEY, JSON.stringify(list || []));
}

async function openHoldModal(){
  await refreshHoldList();
  const m = document.getElementById("holdModal");
  if(m) m.style.display = "flex";
}

function closeHoldModal(){
  const m = document.getElementById("holdModal");
  if(!m) return;
  m.style.display = "none";
}

/* =========================
   ONLINE: Supabase pos_holds
========================= */
// struktur row yang diharapkan (ideal):
// id(text pk), status(text), label(text), customer_name(text), customer_phone(text), customer_category(text),
// total(numeric), item_count(int), payload(jsonb), cashier_id(text), cashier_name(text), created_at(timestamptz), updated_at(timestamptz)
//
// ✅ NOTE: Kode di bawah dibuat "tahan banting":
// - Kalau kolom extra (label/customer_name/...) BELUM ADA di tabel, tetap jalan pakai payload (fallback).
// - Kalau sudah ada kolom extra, otomatis dipakai supaya list lebih rapi & cepat.

function buildHoldFromRow(r){
  const payload = r?.payload || {};
  const custFromPayload = payload.customer || null;
  const cart = payload.cart || [];

  // 1) ambil nama pelanggan seprioritas mungkin
  const custName =
    (r?.customer_name) ||
    payload.customer_name ||
    custFromPayload?.name ||
    custFromPayload?.contact_name ||
    "";

  const custPhone =
    (r?.customer_phone) ||
    payload.customer_phone ||
    custFromPayload?.phone ||
    "";

  const custCategory =
    (r?.customer_category) ||
    payload.customer_category ||
    custFromPayload?.category ||
    "";
  // 2) label: nama pelanggan harus menang (yang user mau tampil)
  const label =
    (custName && String(custName).trim()) ||
    (r?.label && String(r.label).trim()) ||
    (payload?.label && String(payload.label).trim()) ||
    (payload?.salesorder_no && String(payload.salesorder_no).trim()) ||
    (r?.id || "");



  // 3) total & item_count
  const total =
    Number(r?.total ?? payload.total ?? 0);

  const itemCount =
    Number(
      r?.item_count ??
      payload.item_count ??
      (Array.isArray(cart) ? cart.length : 0) ??
      0
    );

  const createdAt =
    r?.created_at || payload.created_at || null;

  return {
    id: r?.id,
    label,
    customer_name: custName || "",
    customer_phone: custPhone || "",
    customer_category: custCategory || "",
    total,
    item_count: itemCount,
    created_at: createdAt,
    payload,
    source: "online",
    cashier_id: r?.cashier_id || payload.cashier_id || "",
    cashier_name: r?.cashier_name || payload.cashier_name || ""
  };
}

async function fetchOnlineHolds(){
  // ✅ coba SELECT lengkap dulu (kalau kolom sudah ada)
  try{
    const { data, error } = await sb
      .from("pos_holds")
      .select("id,status,label,customer_name,customer_phone,customer_category,total,item_count,payload,cashier_id,cashier_name,created_at,updated_at")
      .eq("status", "OPEN")
      .order("updated_at", { ascending:false })
      .limit(200);

    if(error) throw error;
    return (data || []).map(buildHoldFromRow);
  }catch(e){
    // ✅ fallback: tabel minimal (id,status,payload,created_at,updated_at)
    const { data, error } = await sb
      .from("pos_holds")
      .select("id,status,payload,created_at,updated_at")
      .eq("status", "OPEN")
      .order("updated_at", { ascending:false })
      .limit(200);

    if(error) throw error;
    return (data || []).map(buildHoldFromRow);
  }
}

async function upsertOnlineHold(holdObj){
  const nowIso = new Date().toISOString();

  const payload = holdObj?.payload || {};
  const custFromPayload = payload.customer || null;

  const custName =
    holdObj?.customer_name ||
    payload.customer_name ||
    custFromPayload?.name ||
    custFromPayload?.contact_name ||
    "";

  const custPhone =
    holdObj?.customer_phone ||
    payload.customer_phone ||
    custFromPayload?.phone ||
    "";

  const custCategory =
    holdObj?.customer_category ||
    payload.customer_category ||
    custFromPayload?.category ||
    "";

  const label =
  (custName && String(custName).trim()) ||
  (holdObj?.label && String(holdObj.label).trim()) ||
  (payload?.label && String(payload.label).trim()) ||
  (payload?.salesorder_no && String(payload.salesorder_no).trim()) ||
  (holdObj?.id || "");


  const createdAt = holdObj?.created_at || payload?.created_at || nowIso;

  // ✅ row lengkap (kalau kolom extra sudah ada)
  const rowFull = {
    id: holdObj.id,
    status: "OPEN",
    label,
    customer_name: custName || "",
    customer_phone: custPhone || "",
    customer_category: custCategory || "",
    total: Number(holdObj?.total ?? payload?.total ?? 0),
    item_count: Number(holdObj?.item_count ?? payload?.item_count ?? 0),
    cashier_id: holdObj?.cashier_id || payload?.cashier_id || "",
    cashier_name: holdObj?.cashier_name || payload?.cashier_name || "",
    payload: payload,
    updated_at: nowIso,
    created_at: createdAt
  };

  // ✅ fallback kalau tabel minimal
  const rowMinimal = {
    id: holdObj.id,
    status: "OPEN",
    payload: payload,
    updated_at: nowIso,
    created_at: createdAt
  };

  try{
    const { error } = await sb
      .from("pos_holds")
      .upsert(rowFull, { onConflict: "id" });
    if(error) throw error;
  }catch(e){
    // kolom extra belum ada → pakai minimal
    const { error } = await sb
      .from("pos_holds")
      .upsert(rowMinimal, { onConflict: "id" });
    if(error) throw error;
  }
}

async function closeOnlineHold(id){
  const nowIso = new Date().toISOString();

  // prefer soft-close (status=CLOSED). Kalau gagal (misal kolom status tidak ada), fallback delete.
  const upd = await sb
    .from("pos_holds")
    .update({ status:"CLOSED", updated_at: nowIso })
    .eq("id", id);

  if(upd?.error){
    const del = await sb.from("pos_holds").delete().eq("id", id);
    if(del?.error) throw del.error;
  }
}

/* =========================
   OFFLINE QUEUE (delete)
========================= */
function loadHoldDeleteQueue(){
  try{ return JSON.parse(localStorage.getItem(HOLD_DELETE_QUEUE_KEY) || "[]") || []; }
  catch{ return []; }
}
function saveHoldDeleteQueue(list){
  localStorage.setItem(HOLD_DELETE_QUEUE_KEY, JSON.stringify(list || []));
}
function queueHoldDeletion(id){
  const q = loadHoldDeleteQueue();
  if(!q.includes(id)){
    q.push(id);
    saveHoldDeleteQueue(q);
  }
}
async function flushHoldDeleteQueue(){
  if(!isOnline()) return;
  const q = loadHoldDeleteQueue();
  if(!q.length) return;

  const remaining = [];
  for(const id of q){
    try{
      await closeOnlineHold(id);
    }catch(e){
      remaining.push(id);
    }
  }
  saveHoldDeleteQueue(remaining);
}

/* =========================
   SYNC local holds → online
========================= */
async function syncLocalHoldsToOnline(){
  if(!isOnline()) return;

  const local = loadHolds(); // local hanya offline pending
  if(!local.length) return;

  const syncedIds = [];

  for(const h of local){
    try{
      await upsertOnlineHold({ ...h, source:"online" });
      syncedIds.push(h.id);
    }catch(e){
      // biarkan, nanti sync lagi
    }
  }

  if(syncedIds.length){
    const remaining = local.filter(h => !syncedIds.includes(h.id));
    saveHolds(remaining);
  }
}

/* =========================
   HOLD LIST FILTER (CLEAN)
   - Skip data sampah (***)
   - Jika pelanggan bukan "Pelanggan Umum", wajib punya no tlp valid
========================= */
function holdHasTrashText(v){
  if(v == null) return false;
  return String(v).includes("***");
}
function isValidPhone62(p){
  if(!p) return false;
  const d = String(p).replace(/[^\d]/g,"");
  // minimal 10 digit setelah diawali 62 (contoh 62812xxxxxxx)
  return d.startsWith("62") && d.length >= 10;
}
function normalizeHoldForDisplay(h){
  const out = { ...(h||{}) };
  const rawPhone = out.customer_phone || (out.payload && out.payload.customer_phone) || "";
  const phone62 = normalizePhoneTo62(rawPhone);
  if(phone62) out.customer_phone = phone62;
  return out;
}
function shouldShowHold(h){
  if(!h) return false;

  const label = h.label || "";
  const name  = h.customer_name || "";
  const phone = h.customer_phone || "";
  const cat   = h.customer_category || "";

  // tahan data sampah
  if(holdHasTrashText(label) || holdHasTrashText(name) || holdHasTrashText(phone) || holdHasTrashText(cat)){
    return false;
  }

  // kalau pelanggan bukan umum, wajib ada no tlp valid
  const isUmum = String(name||"").trim().toLowerCase() === "pelanggan umum";
  if(!isUmum && String(name||"").trim()){
    if(!isValidPhone62(phone)) return false;
  }

  return true;
}

/* =========================
   UI LIST RENDER
========================= */
function renderHoldList(list){
  const box = document.getElementById("holdList");
  if(!box) return;

  const holds = (list || []).map(normalizeHoldForDisplay).filter(shouldShowHold);
  if(!holds.length){
    box.innerHTML = `<div style="padding:14px;color:#777;">Belum ada transaksi tersimpan.</div>`;
    return;
  }

  box.innerHTML = holds.map(h => {
    const cust = [h.customer_name, h.customer_phone, h.customer_category].filter(Boolean).join(" • ");
    const dt = h.created_at ? new Date(h.created_at).toLocaleString() : "";

    const srcBadge = (h.source === "online")
      ? `<span style="font-size:11px;padding:2px 8px;border-radius:999px;background:#ecfeff;color:#155e75;border:1px solid #a5f3fc;">Online</span>`
      : `<span style="font-size:11px;padding:2px 8px;border-radius:999px;background:#f1f5f9;color:#334155;border:1px solid #e2e8f0;">Offline</span>`;

    return `
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;padding:12px 12px;border-bottom:1px solid #eee;">
      <div style="min-width:0;">
        <div style="font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${h.label || h.id} ${srcBadge}</div>
        ${cust ? `<div style="color:#666;font-size:12px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${cust}</div>` : ``}
        <div style="color:#999;font-size:11px;margin-top:2px;">${dt} • ${Number(h.item_count||0)} item • Rp${Number(h.total||0).toLocaleString("id-ID")}</div>
      </div>

      <div class="hold-actions">
  <button class="btn-small btn-continue"
    onclick="resumeHold('${h.id}', '${h.source||"local"}')">
    ▶ Lanjutkan
  </button>

  <button class="btn-small btn-rename"
    onclick="renameHold('${h.id}', '${h.source||"local"}')">
    ✏ Rename
  </button>

  <button class="btn-small btn-delete"
    onclick="deleteHold('${h.id}', '${h.source||"local"}')">
    🗑 Hapus
  </button>
</div>

    </div>`;
  }).join("");
}

/* =========================
   REFRESH LIST (HYBRID)
========================= */
async function refreshHoldList(){
  // 1) render local dulu biar responsif
  const local = loadHolds().map(h => ({ ...h, source: (h.source || "local") }));

  __HOLD_LIST_CACHE = [...local];
  renderHoldList(__HOLD_LIST_CACHE);

  // 2) kalau online → tarik online + merge
  if(isOnline()){
    try{
      await flushHoldDeleteQueue();
      await syncLocalHoldsToOnline();
      const online = await fetchOnlineHolds();

      // merge by id: ONLINE menang
      const map = new Map();
      for(const l of local) map.set(l.id, l);
      for(const o of online) map.set(o.id, o);

      const merged = Array.from(map.values()).sort((a,b)=>{
        const ta = new Date(a.created_at || 0).getTime();
        const tb = new Date(b.created_at || 0).getTime();
        return tb - ta;
      });

      __HOLD_LIST_CACHE = merged;
      renderHoldList(__HOLD_LIST_CACHE);
    }catch(err){
      console.warn("refreshHoldList: gagal ambil online holds", err);
      // tetap tampil local
    }
  }
}

/* =========================
   CREATE / RESUME / CONSUME
========================= */
async function parkCurrentOrder(){
  if(!cart || cart.length === 0){
    alert("Keranjang masih kosong.");
    return;
  }

  const cust = (typeof ACTIVE_CUSTOMER !== "undefined") ? (ACTIVE_CUSTOMER || null) : null;
  const autoLabel = (cust?.name || cust?.contact_name || "Pelanggan Umum");
  const label = autoLabel;

  const holdId = "HOLD-" + Date.now();

  const holdObj = {
    id: holdId,
    label: label || holdId,

    customer_id: cust?.id || null,
    customer_name: cust?.name || cust?.contact_name || "",
    customer_phone: cust?.phone || "",
    customer_category: cust?.category || "",
	customer_category_id: (cust?.category_id != null ? Number(cust.category_id) : null),

    payload: {
      label: label || holdId,
      customer: cust || null,
      customer_name: cust?.name || cust?.contact_name || "",
      customer_phone: cust?.phone || "",
      customer_category: cust?.category || "",
      cart: cart || [],
      salesorder_no: (typeof CURRENT_SALESORDER_NO !== "undefined") ? (CURRENT_SALESORDER_NO || null) : null,
	  customer_category_id: (cust?.category_id != null ? Number(cust.category_id) : null),
      total: calcTotal(),
      item_count: calcItemCount(),
      created_at: new Date().toISOString()
    },

    total: calcTotal(),
    item_count: calcItemCount(),
    created_at: new Date().toISOString()
  };

  // ONLINE = simpan ke Supabase saja (shared antar kasir)
  // OFFLINE = simpan local (pending sync)
  let savedOnline = false;

  if(isOnline()){
    try{
      await upsertOnlineHold({ ...holdObj, source:"online" });
      savedOnline = true;
    }catch(err){
      console.warn("parkCurrentOrder: gagal simpan online hold, fallback ke offline", err);
    }
  }

  if(!savedOnline){
    const holds = loadHolds();
    holds.push({ ...holdObj, source:"local" });
    saveHolds(holds);
  }

  try{ refreshHoldList(); }catch(e){}

  try{
    if (typeof resetAll === "function") resetAll();
    else {
      cart = [];
      if(typeof ACTIVE_CUSTOMER !== "undefined") ACTIVE_CUSTOMER = null;
      renderCart();
      updateSummary();
    }
  }catch(e){}

  try{ closeHoldModal(); }catch(e){}
}


function removeHoldByIdLocal(id){
  const next = loadHolds().filter(x => x.id !== id);
  saveHolds(next);
}

async function consumeHoldNow(id, source){
  // hilangkan dari local list
  removeHoldByIdLocal(id);

  // kalau sumbernya online → close online (atau queue)
  if(String(source).toLowerCase() === "online"){
    if(isOnline()){
      try{ await closeOnlineHold(id); }
      catch(e){ queueHoldDeletion(id); }
    }else{
      queueHoldDeletion(id);
    }
  }
}

async function resumeHold(id, source){
  // ambil data dari cache gabungan (online/offline)
  const cached = (__HOLD_LIST_CACHE || []).find(x => x.id === id) || null;

  // fallback: coba local
  const local = loadHolds();
  const hLocal = local.find(x => x.id === id) || null;

  const h = cached || hLocal;
  if(!h){
    alert("Data transaksi tersimpan tidak ditemukan.");
    return;
  }

  // kalau ada transaksi aktif, jangan tindih
  if (cart && cart.length > 0){
    alert("Masih ada transaksi aktif. Simpan dulu atau Reset dulu sebelum membuka transaksi tersimpan.");
    return;
  }

  // ✅ konfirmasi dulu (jangan restore cart kalau user batal)
  const ok = confirm("Lanjutkan transaksi ini? (Setelah dibuka, transaksi akan hilang dari daftar tersimpan)");
  if(!ok) return;

  try{
    // ✅ begitu lanjutkan, langsung consume (hapus dari daftar)
    await consumeHoldNow(id, source || h.source || "local");

    const payload = h.payload || {};
const restoredCart = payload.cart || [];

// ✅ customer: pakai payload.customer kalau ada,
// kalau kosong → bangun dari field yang tersimpan
let restoredCustomer = payload.customer || null;

if(!restoredCustomer){
  const name =
    payload.customer_name ||
    h.customer_name ||
    "";

  const phone =
    payload.customer_phone ||
    h.customer_phone ||
    "";

  const category =
    payload.customer_category ||
    h.customer_category ||
    "";

  // kalau ada minimal nama/phone → jadikan object customer
  if(String(name || "").trim() || String(phone || "").trim()){
    restoredCustomer = {
      id: h.customer_id || payload.customer_id || null,
      name: String(name || "").trim(),
      phone: String(phone || "").trim(),
      category: String(category || "").trim()
    };
  }
}


    // restore state
// ✅ normalisasi bentuk ACTIVE_CUSTOMER agar sesuai struktur CUSTOMER_LIST (contact_id/contact_name/phone/category_display)
let uiCust = null;
if(restoredCustomer){
  const cName = (restoredCustomer.contact_name || restoredCustomer.name || restoredCustomer.customer_name || "").trim();
  const cPhoneRaw = (restoredCustomer.phone || restoredCustomer.customer_phone || "").trim();
  const cPhone62 = normalizePhoneTo62(cPhoneRaw) || cPhoneRaw;
  const cCat = (restoredCustomer.category_display || restoredCustomer.category || restoredCustomer.customer_category || "").trim();

// coba ambil category_id dari payload dulu
const cCatIdRaw =
  restoredCustomer.category_id ??
  restoredCustomer.customer_category_id ??
  payload.customer_category_id ??
  h.customer_category_id ??
  null;

// fallback: kalau ada CUSTOMER_LIST, cari by contact_id untuk dapat category_id yang valid
let resolvedCatId = (cCatIdRaw != null ? Number(cCatIdRaw) : null);
if ((resolvedCatId == null || Number.isNaN(resolvedCatId)) && Array.isArray(CUSTOMER_LIST)) {
  const found = CUSTOMER_LIST.find(x =>
    String(x.contact_id) === String(restoredCustomer.contact_id || restoredCustomer.id || restoredCustomer.customer_id || "")
  );
  if (found?.category_id != null) resolvedCatId = Number(found.category_id);
}

uiCust = {
  contact_id: restoredCustomer.contact_id || restoredCustomer.id || restoredCustomer.customer_id || null,
  contact_name: cName,
  phone: cPhone62,
  category_display: cCat || "-",
  category: cCat || "",
  category_id: (resolvedCatId != null && !Number.isNaN(resolvedCatId)) ? resolvedCatId : -1
};

}

if(typeof ACTIVE_CUSTOMER !== "undefined") ACTIVE_CUSTOMER = uiCust;
cart = restoredCart;

// ✅ isi kembali kolom input customer TANPA memicu searchCustomer yang bisa me-reset ACTIVE_CUSTOMER
try{
  const input = document.getElementById("customerInput");
  const dd = document.getElementById("customerDropdown");

  if(input){
    if(uiCust && uiCust.contact_name){
      input.value = uiCust.contact_name + (uiCust.category_display ? " (" + uiCust.category_display + ")" : "");
    }else{
      input.value = "";
    }
  }
  if(dd) dd.style.display = "none";
}catch(_){}

// ✅ hitung ulang harga (jika harga bertingkat berdasarkan customer)
try{ recalcCartPrices(); }catch(_){}

// re-render UI
renderCart();
updateSummary();


    // arahkan ke step penjualan (bungkus aman)
    try{
      switchLeftTab("sales");
      if (typeof panelPayment !== "undefined" && panelPayment) panelPayment.style.display = "none";
      if (typeof panelProduct !== "undefined" && panelProduct) panelProduct.style.display = "flex";
      if (typeof btnNext !== "undefined" && btnNext) btnNext.style.display = "block";
    }catch(e){
      console.warn("resumeHold: gagal switch tab", e);
    }

    // refresh cache list biar gak “muncul lagi”
    try{ await refreshHoldList(); }catch(e){}
  }catch(e){
    console.warn("resumeHold: gagal", e);
  }finally{
    // ✅ apapun yang terjadi modal harus tertutup
    try{ closeHoldModal(); }catch(e){}
  }
}

async function deleteHold(id, source){
  if(!confirm("Hapus transaksi tersimpan ini?")) return;

  try{
    await consumeHoldNow(id, source || "local");
  }catch(e){
    // minimal local sudah kita coba hapus
    removeHoldByIdLocal(id);
  }
  refreshHoldList();
}

async function renameHold(id, source){
  const h = (__HOLD_LIST_CACHE || []).find(x => x.id === id) || loadHolds().find(x => x.id === id);
  if(!h){
    alert("Data transaksi tersimpan tidak ditemukan.");
    return;
  }

  const newName = prompt("Ganti nama transaksi:", h.label || "") || "";
  if(!newName.trim()) return;

  // update local jika ada
  const local = loadHolds();
  const idx = local.findIndex(x => x.id === id);
  if(idx >= 0){
    local[idx].label = newName.trim();
    // ✅ selaraskan juga payload.label biar konsisten
    local[idx].payload = local[idx].payload || {};
    local[idx].payload.label = newName.trim();
    saveHolds(local);
  }

  // update online jika online hold
  if(String(source).toLowerCase() === "online" && isOnline()){
    try{
      await upsertOnlineHold({ ...h, label: newName.trim() });
    }catch(err){
      console.warn("renameHold: gagal update online hold", err);
    }
  }

  refreshHoldList();
}

// CARI PRODUK BERDASARKAN BARCODE (SCAN)
// ==============================
function normalizeBarcode(raw){
  return String(raw || "")
    .trim()
    .replace(/[^0-9A-Za-z]/g, "");
}

async function findProductByBarcode(barcode) {
  const code = normalizeBarcode(barcode);
  if (!code) return null;

  const findInCache = () => {
    const cached = loadProductsCache() || [];
    const found = cached.find(p => normalizeBarcode(p.barcode) === code);
    if (!found) return null;
    if (filters?.requireStock && Number(found.available_qty || 0) <= 0) return null;
    return found;
  };

  if (!isOnline()) {
    return findInCache();
  }

  try {
    const { data, error } = await sb
      .from("master_items")
      .select("item_id,item_code,item_name,thumbnail,sell_price,barcode")
      .eq("barcode", code)
      .limit(1)
      .single();

    if (!error && data) {
      if (filters?.requireStock && Number(data.available_qty || 0) <= 0) return null;
      return data;
    }

    return findInCache();
  } catch (e) {
    return findInCache();
  }
}



// simpan cart + customer ke localStorage
function saveOrderState() {
  const cartToSave = (cart || []).map(i => ({
  ...i,

  // ✅ paksa harga manual hilang setelah refresh
  price_manual: false,
  price: i.price_auto ?? i.price
}));

localStorage.setItem("pos_cart", JSON.stringify(cartToSave));

  localStorage.setItem("pos_customer", JSON.stringify(ACTIVE_CUSTOMER));
  localStorage.setItem("pos_salesorder_no", CURRENT_SALESORDER_NO || "");
  localStorage.setItem("pos_local_order_no", CURRENT_LOCAL_ORDER_NO || "");
  localStorage.setItem("pos_order_mode", CURRENT_ORDER_MODE || "online");

}

// ambil cart + customer dari localStorage
function loadOrderState() {
    const savedOrderNo = localStorage.getItem("pos_salesorder_no");
  const savedLocalNo = localStorage.getItem("pos_local_order_no");
  const savedMode = localStorage.getItem("pos_order_mode");

  const savedCart = localStorage.getItem("pos_cart");
  const savedCustomer = localStorage.getItem("pos_customer");


  if (savedCart) {
    try { cart = JSON.parse(savedCart) || []; } catch { cart = []; }
  }
  if (savedCustomer) {
    try { ACTIVE_CUSTOMER = JSON.parse(savedCustomer); } catch { ACTIVE_CUSTOMER = null; }
  }
  if (savedOrderNo) CURRENT_SALESORDER_NO = savedOrderNo;
    if (savedLocalNo) CURRENT_LOCAL_ORDER_NO = savedLocalNo;
  if (savedMode) CURRENT_ORDER_MODE = savedMode;

}

function updateOrderNumberUI() {
  const el = document.getElementById("orderNo");
  if (!el) return;
    el.textContent = CURRENT_SALESORDER_NO || CURRENT_LOCAL_ORDER_NO || "-";
}
// ===============================
// CANCELED ORDERS CACHE (ONLINE)
// ===============================


async function fetchCanceledOrders(startISO, endISO) {
  try {
    let q = sb
      .from("pos_canceled_orders")
      .select("salesorder_no");

    // filter by created_at kalau ada range
    if (startISO && endISO) {
      q = q.gte("created_at", startISO).lte("created_at", endISO);
    }

    const { data, error } = await q;
    if (error) throw error;

    canceledOrdersSet = new Set((data || []).map(r => r.salesorder_no));
    console.log("✅ canceledOrders loaded:", canceledOrdersSet.size);

  } catch (err) {
    console.error("❌ fetchCanceledOrders error:", err);
    canceledOrdersSet = new Set();
  }
}

function isCanceledOrder(orderNo) {
  return canceledOrdersSet.has(orderNo);
}

/* =====================================================
   SETTINGS: LOAD/SAVE/APPLY
===================================================== */
function loadSettings(){
  const sPaper = localStorage.getItem("setting_receiptPaper");
  const sName  = localStorage.getItem("setting_storeName");
  const sSub   = localStorage.getItem("setting_storeSub");
  const sShift = localStorage.getItem("setting_shiftX");
const sNote1 = localStorage.getItem("setting_storeNote1");
const sNote2 = localStorage.getItem("setting_storeNote2");

  if (sPaper) RECEIPT_PAPER = sPaper;
  if (sName) STORE_NAME = sName;
  if (sSub) STORE_SUB = sSub;
  if (sNote1 !== null) STORE_NOTE_1 = sNote1;
if (sNote2 !== null) STORE_NOTE_2 = sNote2;

  if (sShift !== null) applyShiftX(sShift);

  // sync UI settings panel
  setReceiptPaper.value = RECEIPT_PAPER;
  setStoreName.value = STORE_NAME;
  setStoreSub.value = STORE_SUB;
  setShiftX.value = (sShift !== null) ? sShift : 0;
  if (setNote1) setNote1.value = STORE_NOTE_1 || "";
if (setNote2) setNote2.value = STORE_NOTE_2 || "";
const sAutoSync = localStorage.getItem("setting_autoSyncHours");
if (sAutoSync) AUTO_SYNC_HOURS = Number(sAutoSync) || 3;


if (setAutoSyncHours) setAutoSyncHours.value = AUTO_SYNC_HOURS;

}

function bindSettingsEvents(){

  setHideEmpty.addEventListener("change", () => {
    filters.hideEmpty = setHideEmpty.checked;
    localStorage.setItem("filterHideEmpty", filters.hideEmpty ? "1" : "0");
    page = 1;
    loadProducts();
  });

  setHideKtn.addEventListener("change", () => {
    filters.hideKtn = setHideKtn.checked;
    localStorage.setItem("filterHideKtn", filters.hideKtn ? "1" : "0");
    page = 1;
    loadProducts();
  });

  setReceiptPaper.addEventListener("change", () => {
    RECEIPT_PAPER = setReceiptPaper.value;
    localStorage.setItem("setting_receiptPaper", RECEIPT_PAPER);
  });

  setStoreName.addEventListener("input", () => {
    STORE_NAME = setStoreName.value || "TASAJI FOOD";
    localStorage.setItem("setting_storeName", STORE_NAME);
  });

  setStoreSub.addEventListener("input", () => {
    STORE_SUB = setStoreSub.value || "Jalan Mandor Demong";
    localStorage.setItem("setting_storeSub", STORE_SUB);
  });
if (setNote1) {
  setNote1.addEventListener("input", () => {
    STORE_NOTE_1 = setNote1.value || "";
    localStorage.setItem("setting_storeNote1", STORE_NOTE_1);
  });
}

if (setNote2) {
  setNote2.addEventListener("input", () => {
    STORE_NOTE_2 = setNote2.value || "";
    localStorage.setItem("setting_storeNote2", STORE_NOTE_2);
  });
}
const setAuto = document.getElementById("setAutoSyncHours");
if (setAutoSyncHours) {
  setAutoSyncHours.addEventListener("input", () => {
    const v = Math.max(1, Number(setAutoSyncHours.value || 1));
    AUTO_SYNC_HOURS = v;
    localStorage.setItem("setting_autoSyncHours", String(v));
  });
}


  setShiftX.addEventListener("input", () => {
    const v = Number(setShiftX.value || 0);
    localStorage.setItem("setting_shiftX", String(v));
    applyShiftX(v);
  });

  setRequireStock.addEventListener("change", () => {
    filters.requireStock = setRequireStock.checked;
    localStorage.setItem("filterRequireStock", filters.requireStock ? "1" : "0");
    page = 1;
    loadProducts();
  });

}

function loadFilterSettings(){
  const savedHideEmpty = localStorage.getItem("filterHideEmpty");
  const savedHideKtn   = localStorage.getItem("filterHideKtn");
  const savedRequireStock = localStorage.getItem("filterRequireStock");

  filters.hideEmpty = (savedHideEmpty === "1");
  filters.hideKtn   = (savedHideKtn === "1");
  filters.requireStock = savedRequireStock !== "0"; // default true

  if (setHideEmpty) setHideEmpty.checked = filters.hideEmpty;
  if (setHideKtn)   setHideKtn.checked   = filters.hideKtn;
  if (setRequireStock) setRequireStock.checked = filters.requireStock;
}


function syncFilterSettingsUI(){
  if (setHideEmpty) setHideEmpty.checked = !!filters.hideEmpty;
  if (setHideKtn)   setHideKtn.checked   = !!filters.hideKtn;
  if (setRequireStock) setRequireStock.checked = filters.requireStock;

}


/* =====================================================
   TABS SWITCHER (LEFT)
===================================================== */
function setActiveTabBtn(key){
  document.getElementById("tabSales").classList.toggle("active", key==="sales");
  document.getElementById("tabTxn").classList.toggle("active", key==="txn");
  document.getElementById("tabSet").classList.toggle("active", key==="set");
  document.getElementById("tabReport").classList.toggle("active", key==="report");
  const tP = document.getElementById("tabPiutang");
  if (tP) tP.classList.toggle("active", key==="piutang");
}


function showLeftPanel(panelKey){
  // sembunyikan semua panel kiri
  panelProduct.style.display = "none";
  panelPayment.style.display = "none";
  panelTransactions.style.display = "none";
  panelSettings.style.display = "none";

  if(panelKey === "sales"){
    // kalau lagi payment, tetap payment (biar gak bingung)
   if(panelKey === "sales"){
  const isPaying = (document.getElementById("panel-payment")?.dataset?.active === "1");
  if (isPaying) panelPayment.style.display = "flex";
  else panelProduct.style.display = "flex";
}

  }
  if(panelKey === "txn"){
    panelTransactions.style.display = "flex";
  }
  if(panelKey === "set"){
    panelSettings.style.display = "flex";
  }
}

function switchLeftTab(key){
  setActiveTabBtn(key);

  // SEMBUNYIKAN SEMUA PANEL KIRI (WAJIB)
  panelProduct.style.display = "none";
  panelPayment.style.display = "none";
  panelTransactions.style.display = "none";
  panelSettings.style.display = "none";
  panelReport.style.display = "none";
  if (panelPiutang) panelPiutang.style.display = "none";

  

if (key === "sales") {
  const isPaying = (panelPayment?.dataset?.active === "1");

  // kalau sedang payment, jangan paksain balik ke produk
  if (isPaying) {
    panelPayment.style.display = "flex";
    panelProduct.style.display = "none";
    if (btnNext) btnNext.style.display = "none";
  } else {
    panelProduct.style.display = "flex";
    panelPayment.style.display = "none";
    if (btnNext) btnNext.style.display = "block";
  }

  if (cartPanel) cartPanel.style.display = "flex";
}

if (key === "txn") {
  panelTransactions.style.display = "flex";
  if (cartPanel) cartPanel.style.display = "none";
  initTxnFilterUI();
  loadTransactions(true);
}


  if (key === "set") {
  panelSettings.style.display = "flex";
  if (cartPanel) cartPanel.style.display = "none";
}
if (key === "report") {
  panelReport.style.display = "flex";
  if (cartPanel) cartPanel.style.display = "none";
  initReportUI();
  loadReport();
}

if (key === "piutang") {
  if (panelPiutang) panelPiutang.style.display = "flex";
  if (cartPanel) cartPanel.style.display = "none";
  initPiutangUI();
  loadPiutangMonitor(true);
}

}



// =====================================================
// STOCK SSOT (v_stock_unified_ui) HELPERS
// =====================================================
// NOTE: DO NOT move product meta source from master_items.
// We only replace stock source (available_qty) using SSOT view.
async function fetchStockMapFromSSOT(itemCodes){
  try{
    const codes = (itemCodes || [])
      .map(x => String(x || "").trim())
      .filter(Boolean);

    if(!codes.length) return {};

    // Supabase IN has practical limits; chunk to be safe.
    const CHUNK = 500;
    const map = {};

    for(let i=0;i<codes.length;i+=CHUNK){
      const part = codes.slice(i, i+CHUNK);

      const { data, error } = await sb
        .from("v_stock_unified_ui")
        .select("item_code,stock_final")
        .in("item_code", part);

      if(error){
        console.error("fetchStockMapFromSSOT error", error);
        continue;
      }

      (data || []).forEach(r=>{
        const code = String(r.item_code || "").trim();
        if(!code) return;
        map[code] = Number(r.stock_final ?? 0);
      });
    }

    return map;
  }catch(err){
    console.error("fetchStockMapFromSSOT unexpected error", err);
    return {};
  }
}

// merge SSOT stock into master_items rows
async function mergeSSOTStockIntoProducts(rows){
  const list = (rows || []).slice();
  if(!list.length) return list;

  const codes = list.map(x => x.item_code);
  const stockMap = await fetchStockMapFromSSOT(codes);

  list.forEach(p=>{
    const code = String(p.item_code || "").trim();
    const stockFinal = Number(stockMap[code] ?? 0);

    // ✅ backward compatible field
    p.available_qty = stockFinal;

    // optional: keep for debugging (won't break old code)
    p.stock_final = stockFinal;
  });

  return list;
}
/* =====================================================
   LOAD PRODUCTS
===================================================== */
async function loadProducts() {
  // default sort
  let sortMode = PRODUCT_SORT_MODE || localStorage.getItem("product_sort_mode") || "az";

  // ==========================
  // OFFLINE MODE → LOAD CACHE
  // ==========================
  if (!isOnline()) {
    const cached = loadProductsCache();

    if (!cached.length) {
      productGrid.innerHTML = `
        <div style="padding:16px;color:#999;">
          ⚠️ Produk belum tersedia offline.<br>
          Hubungkan internet minimal sekali untuk sinkron produk.
        </div>
      `;
      return;
    }

    // filter manual (search, stok, ktn)
    let list = cached.slice();

    if (currentQuery) {
      const q = currentQuery.toLowerCase();
      list = list.filter(p =>
        (p.item_name || "").toLowerCase().includes(q) ||
        (p.item_code || "").toLowerCase().includes(q) ||
        (p.barcode || "").includes(q)
      );
    }

    if (filters.hideEmpty) list = list.filter(p => p.available_qty > 0);
    if (filters.hideKtn) list = list.filter(p => !/ktn/i.test(p.item_name || ""));
// ==========================
// APPLY SORT (OFFLINE)
// ==========================
if (sortMode === "az") {
  list.sort((a,b)=> String(a.item_name||"").localeCompare(String(b.item_name||""), "id"));
} else if (sortMode === "latest") {
  list.sort((a,b)=> Number(b.item_id||0) - Number(a.item_id||0));
} else if (sortMode === "best") {
  const rankMap = loadBestSellerRankCache(BEST_SELLER_PERIOD || "90d");   // cache server
  const offCnt  = loadOfflineBestCounter();                               // counter offline

  list.sort((a,b)=>{
    const ca = Number(offCnt[String(a.item_code||"").trim()] || 0);
    const cb = Number(offCnt[String(b.item_code||"").trim()] || 0);
    if (cb !== ca) return cb - ca; // 1) qty offline desc

    const ra = Number(rankMap[String(a.item_code||"").trim()] || 999999);
    const rb = Number(rankMap[String(b.item_code||"").trim()] || 999999);
    if (ra !== rb) return ra - rb; // 2) rank cache (lebih kecil = lebih laris)

    return String(a.item_name||"").localeCompare(String(b.item_name||""), "id"); // 3) A-Z
  });
}


    // hitung pagination lokal (offline)
const total = list.length;
const pages = Math.max(1, Math.ceil(total / pageSize));
if (page > pages) page = pages;

const start = (page - 1) * pageSize;
const slice = mergedList.slice(start, start + pageSize);

renderProducts(slice);
updatePagination(total);
pageInfo.textContent = `OFFLINE • Hal ${page}/${pages}`;
return;

  }

  // ==========================
  // ONLINE MODE → SUPABASE
  // ==========================
  let q = sb
  .from("master_items")
  .select("item_id,item_code,item_name,thumbnail,sell_price,barcode,available_qty",{ count:"exact" });

  if (currentQuery) {
    q = q.or(`item_name.ilike.%${currentQuery}%,item_code.ilike.%${currentQuery}%,barcode.ilike.%${currentQuery}%`);
  }
  // NOTE: hideEmpty is applied after SSOT merge (available_qty is from SSOT)
  if (filters.hideKtn) q = q.not("item_name","ilike","%ktn%");
  // ==========================
  // APPLY SORT (ONLINE)
  // ==========================
  if (sortMode === "az") {
    q = q.order("item_name", { ascending: true });
  } else if (sortMode === "latest") {
    // kalau tidak punya kolom updated_at, pakai item_id sebagai pendekatan "terbaru"
    q = q.order("item_id", { ascending: false });
  } else {
    // "best" ditangani setelah data diambil (sort manual pakai rankMap)
    // agar aman tanpa FK join
    q = q.order("item_name", { ascending: true }); // fallback biar stabil
  }

  const from = (page-1)*pageSize;
  const to = from + pageSize - 1;

   // ==========================
  // BEST SELLER: sort manual
  // ==========================
  if (sortMode === "best") {
    const rankMap = await loadBestSellerMap();

    // Ambil "lebih banyak" dulu, baru sort, lalu slice untuk page
    // (Karena kalau kita range dulu, sorting rank-nya jadi salah)
    const { data: allData, error: e1 } = await q;


    if (e1) { console.error("loadProducts error", e1); return; }

    const list = (allData || []).slice();

    list.sort((a,b)=>{
  const ra = rankMap[a.item_code];
  const rb = rankMap[b.item_code];

  if (ra == null && rb == null) return 0;
  if (ra == null) return 1;   // yang bukan best seller selalu di bawah
  if (rb == null) return -1;

  return ra - rb;
});


    // ✅ merge SSOT stock (bundling/karton/promo) into available_qty
    let mergedList = await mergeSSOTStockIntoProducts(list);
    if (filters.hideEmpty) mergedList = mergedList.filter(p => Number(p.available_qty || 0) > 0);

    const total = mergedList.length;

    const pages = Math.max(1, Math.ceil(total / pageSize));
    if (page > pages) page = pages;

    const start = (page - 1) * pageSize;
    const slice = mergedList.slice(start, start + pageSize);

    renderProducts(slice);
    updatePagination(total);
    return;
  }

  
// ==========================
// NON-BEST: normal range
// ==========================

// ✅ IMPORTANT: SSOT stock merge happens client-side.
// If hideEmpty aktif, kita harus merge dulu baru bisa filter stok,
// jadi kita ambil allData lalu paginate manual (mirip best seller).
if (filters.hideEmpty) {
  const { data: allData, error: eAll } = await q;
  if (eAll) { console.error("loadProducts error", eAll); return; }

  let list = await mergeSSOTStockIntoProducts(allData || []);
  list = list.filter(p => Number(p.available_qty || 0) > 0);

  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (page > pages) page = pages;

  const start = (page - 1) * pageSize;
  const slice = mergedList.slice(start, start + pageSize);

  renderProducts(slice);
  updatePagination(total);
  return;
}

const { data, count, error } = await q.range(from,to);
if (error) { console.error("loadProducts error", error); return; }

// merge stok SSOT untuk item yang tampil di page ini
const merged = await mergeSSOTStockIntoProducts(data || []);

renderProducts(merged || []);
updatePagination(count || 0);
}



async function loadPriceMap() {
  // OFFLINE → pakai cache
  if(!isOnline()){
    PRICE_MAP = loadPriceMapCache();
    return;
  }

  const { data, error } = await sb
    .from("product_prices")
    .select("item_code, kategori_harga, harga");

  if (error) {
    console.error("Gagal load price map", error);
    // fallback ke cache kalau online tapi error
    PRICE_MAP = loadPriceMapCache();
    return;
  }

  PRICE_MAP = {};
  (data || []).forEach(r => {
    if (!PRICE_MAP[r.item_code]) PRICE_MAP[r.item_code] = {};
    PRICE_MAP[r.item_code][r.kategori_harga] = r.harga;
  });

  // ONLINE → simpan cache
  savePriceMapCache(PRICE_MAP);
}

function getSellPriceFromCache(itemCode){
  const cached = loadProductsCache();
  const p = cached.find(x => x.item_code === itemCode);
  return Number(p?.sell_price || 0);
}

async function loadPackingMap() {
  // OFFLINE → pakai cache
  if(!isOnline()){
    PACKING_MAP = loadPackingMapCache();
    return;
  }

  const { data, error } = await sb
    .from("product_packing")
    .select("item_code, pcs_per_karton");

  if (error) {
    console.error("Gagal load packing map", error);
    PACKING_MAP = loadPackingMapCache();
    return;
  }

  PACKING_MAP = {};
  (data || []).forEach(r => { PACKING_MAP[r.item_code] = r.pcs_per_karton; });

  // ONLINE → simpan cache
  savePackingMapCache(PACKING_MAP);
}


function resolvePriceCategory(itemCode, qty) {
  const cid = ACTIVE_CUSTOMER?.category_id ?? -1;
  const pcsPerKarton = PACKING_MAP[itemCode] || Infinity;

  if (cid === -1) return "umum";
  if (cid === 3) return "member";

  if (cid === 2) {
    if (qty >= pcsPerKarton) return "lv1_pcs";
    if (qty >= 2) return "reseller";
    return "member";
  }

  const isAgenBase = [1,17,18].includes(cid);
  if (isAgenBase) {
    if (qty >= pcsPerKarton) return "lv1_pcs";
    if (qty >= 3) return "agen";
    if (qty >= 2) return "reseller";
    return "member";
  }

  if ([22,14].includes(cid)) {
    if (qty >= pcsPerKarton) return "lv1_pcs";
    return "reseller";
  }

  if (cid === 15) {
    if (qty >= pcsPerKarton) return "lv2_pcs";
    if (qty >= 3) return "agen";
    if (qty >= 2) return "reseller";
    return "member";
  }

  if (cid === 16) {
    if (qty >= pcsPerKarton) return "lv3_pcs";
    if (qty >= 3) return "agen";
    if (qty >= 2) return "reseller";
    return "member";
  }

  if (cid === 19) return "agen";

  if (cid === 21) {
    if (qty >= 3) return "lv1_pcs";
    if (qty === 2) return "reseller";
    return "member";
  }

  return "umum";
}

function getFinalPrice(itemCode, qty) {
  // pastikan PRICE_MAP terisi dari cache kalau belum ada
  const priceMapReady = PRICE_MAP && Object.keys(PRICE_MAP).length > 0;
  if (!priceMapReady) {
    PRICE_MAP = loadPriceMapCache();
  }

  const readyNow = PRICE_MAP && Object.keys(PRICE_MAP).length > 0;

  // kalau tetap belum ada (cache kosong), fallback ke sell_price
  if (!readyNow) {
    return getSellPriceFromCache(itemCode);
  }

  // normal: ONLINE maupun OFFLINE tetap pakai kategori
  const kategori = resolvePriceCategory(itemCode, qty);
  const harga = PRICE_MAP[itemCode]?.[kategori];

  if (!harga) return PRICE_MAP[itemCode]?.["umum"] || getSellPriceFromCache(itemCode);
  return harga;
}



function recalcCartPrices() {
  cart.forEach(i => {
    const code = i.code || i.itemCode;

    // ✅ hitung harga buku
    const auto = getFinalPrice(code, i.qty);
    i.price_auto = auto;

    // ✅ kalau tidak manual → update price
    if (!i.price_manual) {
      i.price = auto;
    }
  });
}


/* =====================================================
   LOAD CUSTOMERS
===================================================== */
async function loadCustomers() {
  // OFFLINE → pakai cache
  const supabaseOK = await canReachSupabase();
if(!isOnline() || !supabaseOK){
  CUSTOMER_LIST = loadCustomerCache();
  return;
}


  try {
    let all = [];
    let from = 0;
    const size = 1000;

    while (true) {
      const { data, error } = await sb
        .from("customers")
        .select("contact_id,contact_name,phone,category_id,category_display")
        .range(from, from + size - 1);

      if (error) throw error;

      all.push(...(data || []));
      if (!data || data.length < size) break;
      from += size;
    }

    CUSTOMER_LIST = all;

    // ONLINE → simpan cache
    saveCustomerCache(CUSTOMER_LIST);

  } catch (err) {
    console.error("❌ Gagal load customer:", err);
    // fallback cache kalau error
    CUSTOMER_LIST = loadCustomerCache();
  }
}
// ==========================
// BEST SELLER MAP (90 HARI)
// ==========================
async function loadBestSellerMap() {
  // OFFLINE: pakai cache terakhir yang tersimpan
  if (!isOnline()) {
    return loadBestSellerRankCache(BEST_SELLER_PERIOD || "90d");
  }


  const { data, error } = await sb
  .from("product_best_sellers")       // ✅ BENAR
  .select("item_code, rank_no")
  .eq("period_key", BEST_SELLER_PERIOD || "90d");


  if (error) {
  console.error("loadBestSellerMap error", error);
  // fallback: pakai cache terakhir
  return loadBestSellerRankCache(BEST_SELLER_PERIOD || "90d");
}


  const map = {};
  (data || []).forEach(r => {
    map[r.item_code] = r.rank_no;
  });
  // ONLINE: simpan cache supaya bisa dipakai OFFLINE
  saveBestSellerRankCache(BEST_SELLER_PERIOD || "90d", map);

  return map;
}


function renderProducts(list){
  productGrid.innerHTML="";
  if(!list.length){
    productGrid.innerHTML="<div>Tidak ada produk</div>";
    return;
  }

  list.forEach(p=>{
    const card = document.createElement("div");

    const outOfStock   = Number(p.available_qty || 0) <= 0;
    const requireStock = !!filters.requireStock;

    let extraClass = "";
    if (outOfStock && requireStock) extraClass = " locked";
    else if (outOfStock && !requireStock) extraClass = " oos";

    card.className = "product-card" + extraClass;

    if (!outOfStock || !requireStock) {
      card.onclick = () => addToCart(p);
    }

    card.innerHTML = `
      <img class="product-image js-prod-img" data-src="${p.thumbnail||""}" src="">
      <div class="product-body">
        <div class="product-name">${p.item_name}</div>
      </div>
      <div class="product-footer">
        <div class="product-price js-price-hover" data-item-code="${p.item_code}">
          ${formatRupiah(getFinalPrice(p.item_code, 1))}
        </div>
        <div class="product-stock">Stok ${p.available_qty}</div>
      </div>
    `;

    // ✅ set image dari cache (offline friendly) — HARUS DI DALAM forEach
    const img = card.querySelector(".js-prod-img");
    if (img) {
      const u = img.getAttribute("data-src") || "";
      setProductImage(img, u);
    }

    productGrid.appendChild(card);
  });

  applyProductViewMode();
}


/* =====================================================
   CART LOGIC
===================================================== */
// ===== CART =====
  async function addToCart(p){

  // ✅ nomor order: online pakai server, offline pakai local
  if (!CURRENT_SALESORDER_NO && !CURRENT_LOCAL_ORDER_NO) {
    if (isOnline()) {
      CURRENT_ORDER_MODE = "online";
      CURRENT_SALESORDER_NO = await generateSalesOrderNo();
    } else {
      CURRENT_ORDER_MODE = "offline";
      CURRENT_LOCAL_ORDER_NO = generateLocalOrderNo();
    }
    updateOrderNumberUI();
    saveOrderState();
  }

  const exist = cart.find(i => (i.code || i.itemCode) === p.item_code);
 if (exist) {
  exist.qty++;

  // ✅ hitung ulang harga buku
  const auto = getFinalPrice(exist.code || exist.itemCode, exist.qty);
  exist.price_auto = auto;

  // ✅ kalau tidak manual, price ikut auto
  if (!exist.price_manual) {
    exist.price = auto;
  }
}
 else {
   const price = getFinalPrice(p.item_code, 1);
cart.push({
  itemId: p.item_id,
  jubelioItemId: null,
  code: p.item_code,
  itemCode: p.item_code,
  name: p.item_name,

  // ✅ harga aktif yang dipakai total
  price: price,

  // ✅ harga buku (auto)
  price_auto: price,

  // ✅ lock manual?
  price_manual: false,

  qty: 1
});
  }

  renderCart();
  saveOrderState();
}


function changeQty(code,delta){
  const item = cart.find(i => (i.code || i.itemCode) === code);
  if(!item) return;

  item.qty += delta;

// ✅ hitung ulang harga buku
const auto = getFinalPrice(item.code || item.itemCode, item.qty);
item.price_auto = auto;

// ✅ hanya update price kalau belum manual
if (!item.price_manual) {
  item.price = auto;
}


  if(item.qty<=0) cart=cart.filter(i=>i.code!==code);

  renderCart();
  saveOrderState();
}

function resetAll() {
CURRENT_HOLD_ID = null;
  cart = [];
  renderCart();

  ACTIVE_CUSTOMER = null;
  const input = document.getElementById("customerInput");
  if (input) input.value = "";

const dropdown = customerDropdown || document.getElementById("customerDropdown");

  if (dropdown) dropdown.style.display = "none";

  selectedPaymentMethod = null;
  resetPaymentLines();

  localStorage.removeItem("pos_cart");
  localStorage.removeItem("pos_customer");

  CURRENT_SALESORDER_NO = null;
  localStorage.removeItem("pos_salesorder_no");
  updateOrderNumberUI();
    CURRENT_LOCAL_ORDER_NO = null;
  CURRENT_ORDER_MODE = "online";
  localStorage.removeItem("pos_local_order_no");
  localStorage.removeItem("pos_order_mode");


  document.querySelectorAll(".pay-method-btn").forEach(b => b.classList.remove("active"));

  if (cashInput) {
    cashInput.disabled = false;
    cashInput.readOnly = false;
    cashInput.value = "";
  }
  if (changeOutput) changeOutput.textContent = formatRupiah(0);

  if (payTotal) payTotal.textContent = formatRupiah(0);
  if (payItemCount) payItemCount.textContent = "0";
  if (payRemaining) payRemaining.textContent = formatRupiah(0);

  if (quickCash) quickCash.style.display = "none";

  recalcPaymentStatus();

  panelPayment.style.display = "none";
  panelProduct.style.display = "flex";
  btnNext.style.display = "block";
  panelPayment.dataset.active = "0";

}

function resetCart(){ resetAll(); }

function calcTotal(){
  return cart.reduce((s,i)=>s+i.qty*i.price,0);
}
function calcItemCount(){
  return cart.reduce((s,i)=>s+i.qty,0);
}

/* ✅ TARUH DI SINI (LUAR renderCart) */
function enablePriceEdit(code){
  const item = cart.find(i => (i.code || i.itemCode) === code);
  if(!item) return;

  const priceEl = Array.from(document.querySelectorAll(".cart-item"))
    .find(x => x.querySelector(".cart-item-code")?.textContent?.trim() === code)
    ?.querySelector(".cart-item-price");

  if(!priceEl) return;

  const currentValue = Number(item.price || 0);

  priceEl.innerHTML = `
    <input type="number"
      style="width:110px;font-size:13px;padding:4px;"
      value="${currentValue}"
      onkeydown="onPriceInputKey(event,'${code}')"
      onblur="savePriceInput(this,'${code}')"
      autofocus
    />
  `;

  const inp = priceEl.querySelector("input");
  if(inp){
    inp.focus();
    inp.select();
  }
}
function ensurePriceEditModal(){
  if(document.getElementById("priceEditModal")) return;

  const m = document.createElement("div");
  m.id = "priceEditModal";
  m.innerHTML = `
  <div class="pem-backdrop" onclick="closePriceEditModal()"></div>

  <div class="pem-card" role="dialog" aria-modal="true">
    <div class="pem-head">
      <div class="pem-title">Harga & Modal</div>
      <button class="pem-close" type="button" onclick="closePriceEditModal()">×</button>
    </div>

    <div class="pem-row"><b>Item:</b> <span id="pemItemName">-</span></div>
    <div class="pem-row"><b>Code:</b> <span id="pemItemCode">-</span></div>

    <hr style="border:none;border-top:1px solid #eee;margin:10px 0;" />

    <div class="pem-row"><b>P now:</b> <span id="pemPNow">-</span></div>
    <div class="pem-row"><b>P prev:</b> <span id="pemPPrev">-</span></div>

    <div class="pem-row"><b>C now:</b> <span id="pemCNow">-</span></div>
    <div class="pem-row"><b>C prev:</b> <span id="pemCPrev">-</span></div>

    <hr style="border:none;border-top:1px solid #eee;margin:10px 0;" />

    <div class="pem-row"><b>Edit Harga Jual</b></div>
    <div class="pem-row pem-muted" style="margin-top:-2px;">
      Isi harga untuk override (manual). Kosong/0 = balik ke harga auto.
    </div>

    <div class="pem-row" style="display:flex; gap:8px; align-items:center; margin-top:8px;">
      <input
        id="pemInputPrice"
        type="number"
        inputmode="numeric"
        style="flex:1; padding:8px 10px; border:1px solid #eee; border-radius:10px;"
        placeholder="mis. 25000"
      />
      <button
        type="button"
        style="padding:8px 12px; border:1px solid #eee; border-radius:10px; background:#fff; cursor:pointer;"
        onclick="pemSaveManualPrice()"
      >Simpan</button>
      <button
        type="button"
        style="padding:8px 12px; border:1px solid #eee; border-radius:10px; background:#fff; cursor:pointer;"
        onclick="pemResetAutoPrice()"
      >Reset</button>
    </div>

    <div class="pem-row pem-muted" style="margin-top:10px;">
      Tip: P prev = riwayat harga jual terakhir. C now/C prev = modal PO terbaru & sebelumnya.
    </div>
  </div>
`;

  document.body.appendChild(m);

  // ESC untuk tutup
  document.addEventListener("keydown", (e)=>{
    if(e.key === "Escape") closePriceEditModal();
  });
}

// kalau history/cost belum ready, refresh biar modal langsung kebaca
try { scheduleRefreshHistoryIndicators(); } catch(_) {}
try { scheduleRefreshCostIndicators(); } catch(_) {}

function openPriceEditModal(itemCode){
  ensurePriceEditModal();

  const m = document.getElementById("priceEditModal");
  if(!m) return;

  // tampilkan modal
  m.style.display = "block";
m.dataset.itemCode = itemCode || "";

  // cari item di cart
  const it = (cart || []).find(x => x.code === itemCode);
  if(!it){
    document.getElementById("pemItemName").textContent = "-";
    document.getElementById("pemItemCode").textContent = itemCode || "-";
    document.getElementById("pemPNow").textContent = "-";
    document.getElementById("pemPPrev").textContent = "-";
    document.getElementById("pemCNow").textContent = "-";
    document.getElementById("pemCPrev").textContent = "-";
    return;
  }

  const itemId = Number(it.itemId);

  // isi header modal
  document.getElementById("pemItemName").textContent = it.name || "-";
  document.getElementById("pemItemCode").textContent = it.code || "-";

  // P now
  const pNow = Number(it.price || 0);
  document.getElementById("pemPNow").textContent = formatRupiah(pNow);
// isi input edit: kalau manual pakai price sekarang, kalau auto kosongkan biar jelas
const inp = document.getElementById("pemInputPrice");
if(inp){
  inp.value = it.price_manual ? String(Number(it.price || 0)) : "";
}

  // P prev (dari STEP3 map)
  const pRec = (LAST_PRICE_HISTORY || {})[itemId];
  if(pRec && Number(pRec.pPrev || 0) > 0){
    document.getElementById("pemPPrev").textContent =
      `${formatRupiah(Number(pRec.pPrev||0))} (${formatDateDDMMYYYY(pRec.dateIso)})`;
  }else{
    document.getElementById("pemPPrev").textContent = "-";
  }

  // C now / C prev (dari PO map — nanti kita isi map-nya)
  const cRec = (COST_HISTORY_MAP || {})[itemId];
  if(cRec?.now){
    document.getElementById("pemCNow").textContent =
      `${formatRupiah(Number(cRec.now.c || 0))} (${formatDateDDMMYYYY(cRec.now.dt)})`;
  }else{
    document.getElementById("pemCNow").textContent = "-";
  }

  if(cRec?.prev){
    document.getElementById("pemCPrev").textContent =
      `${formatRupiah(Number(cRec.prev.c || 0))} (${formatDateDDMMYYYY(cRec.prev.dt)})`;
  }else{
    document.getElementById("pemCPrev").textContent = "-";
  }
}


function closePriceEditModal(){
  const m = document.getElementById("priceEditModal");
  if(!m) return;
  m.style.display = "none";
}
function pemSaveManualPrice(){
  const m = document.getElementById("priceEditModal");
  if(!m) return;

  const code = m.dataset.itemCode || "";
  if(!code) return;

  const v = Number(document.getElementById("pemInputPrice")?.value || 0);
  setManualPrice(code, v);

  // opsional: tetap update cepat (sebelum ditutup)
  const it = (cart || []).find(x => x.code === code);
  if(it){
    document.getElementById("pemPNow").textContent = formatRupiah(Number(it.price || 0));
  }

  closePriceEditModal(); // ✅ tambah ini
}


function pemResetAutoPrice(){
  const m = document.getElementById("priceEditModal");
  if(!m) return;

  const code = m.dataset.itemCode || "";
  if(!code) return;

  setManualPrice(code, 0);
  const it = (cart || []).find(x => x.code === code);
  if(it){
    document.getElementById("pemInputPrice").value = "";
    document.getElementById("pemPNow").textContent = formatRupiah(Number(it.price || 0));
  }

  closePriceEditModal(); // ✅ tambah ini
}



function onPriceInputKey(e, code){
  if(e.key === "Enter"){
    e.preventDefault();
    savePriceInput(e.target, code);
  }
  if(e.key === "Escape"){
    e.preventDefault();
    renderCart();
  }
}

function savePriceInput(inputEl, code){
  const v = Number(inputEl?.value || 0);
  setManualPrice(code, v);
}
function enableQtyEdit(code){
  const item = cart.find(i => (i.code || i.itemCode) === code);
  if(!item) return;

  // cari elemen qty-value untuk item ini
  const qtyEl = Array.from(document.querySelectorAll(".cart-item"))
    .find(x => x.querySelector(".cart-item-code")?.textContent?.trim() === code)
    ?.querySelector(".qty-value");

  if(!qtyEl) return;

  const currentQty = Number(item.qty || 0);

  // ganti jadi input
  qtyEl.innerHTML = `
    <input type="number" min="1"
      style="width:55px;font-size:13px;padding:4px;text-align:center;"
      value="${currentQty}"
      onkeydown="onQtyInputKey(event,'${code}')"
      onblur="saveQtyInput(this,'${code}')"
      autofocus
    />
  `;

  // fokuskan input
  const inp = qtyEl.querySelector("input");
  if(inp){
    inp.focus();
    inp.select();
  }
}

function onQtyInputKey(e, code){
  if(e.key === "Enter"){
    e.preventDefault();
    saveQtyInput(e.target, code);
  }
  if(e.key === "Escape"){
    e.preventDefault();
    renderCart(); // batal
  }
}

function saveQtyInput(inputEl, code){
  const item = cart.find(i => (i.code || i.itemCode) === code);
  if(!item) return;

  let v = Number(inputEl?.value || 0);

  // validasi minimal qty 1
  if(!v || v < 1) v = 1;

  // update qty
  item.qty = v;

  // ✅ hitung ulang harga buku
  const auto = getFinalPrice(item.code || item.itemCode, item.qty);
  item.price_auto = auto;

  // ✅ kalau belum manual, price ikut auto
  if(!item.price_manual){
    item.price = auto;
  }

  renderCart();
  saveOrderState();
}

/* ✅ BARU function renderCart() */
/* ✅ BARU function renderCart() */
function renderCart(){
  cartItems.innerHTML = "";
  const total = calcTotal();
  const count = calcItemCount();

  // =========================
  // (A) CART KOSONG
  // =========================
  if(!cart || cart.length === 0){
    cartItems.innerHTML = `
      <div style="padding:12px;color:#999;font-size:13px;text-align:center;">
        Belum ada item di transaksi
      </div>
    `;

    itemCount.textContent = count;
    cartSubtotal.textContent = formatRupiah(total);
    cartTotal.textContent = formatRupiah(total);

    // ✅ tetap jalan meski kosong (biar reset indikator/tooltip)
    if(typeof scheduleRefreshCostIndicators === "function") scheduleRefreshCostIndicators();
    if(typeof scheduleRefreshHistoryIndicators === "function") scheduleRefreshHistoryIndicators();

    return; // ✅ PENTING: stop di sini
  }

  // =========================
  // (B) CART ADA ITEM
  // =========================
  cart.forEach(i=>{
    const el = document.createElement("div");
    el.className = "cart-item";

    el.innerHTML = `
      <div class="cart-item-price js-price-hover"
           data-item-code="${i.code}"
           style="cursor:help; text-decoration:underline dotted;">
        ${formatRupiah(i.price)}
      </div>

      <div class="cart-item-name">${i.name}</div>
      <div class="cart-item-code">${i.code}</div>

      <div class="cart-item-actions">
        <button class="qty-btn" onclick="changeQty('${i.code}',-1)">−</button>

        <div class="qty-value"
             onclick="enableQtyEdit('${i.code}')"
             style="cursor:pointer;"
             title="Klik untuk input qty manual">
          ${i.qty}
        </div>

        <button class="qty-btn" onclick="changeQty('${i.code}',1)">+</button>

        <!-- status dot -->
        <span class="risk-dot is-neutral"
      data-risk-for="${i.code}"
      title="OK"></span>


        <!-- indikator perbandingan harga -->
        <span class="mini-ico ico-move"
              data-move-for="${i.code}"
              title="Prev: - | Now: -">↕</span>

        <!-- indikator cost -->
        <span class="mini-ico ico-cost"
              data-cost-indicator-for="${i.code}"
              title="Prev: - | Now: -">🪙</span>

        <!-- edit -->
        <button class="cart-icon-btn btn-edit-price"
                type="button"
                title="Edit"
                onclick="openPriceEditModal('${i.code}')">✏️</button>

        <button class="btn-delete" onclick="changeQty('${i.code}',-999)">🗑</button>
      </div>
    `;
    cartItems.appendChild(el);
  });

  itemCount.textContent = count;
  cartSubtotal.textContent = formatRupiah(total);
  cartTotal.textContent = formatRupiah(total);

  // ✅ WAJIB dipanggil SETELAH DOM cart selesai dibuat
  if(typeof scheduleRefreshCostIndicators === "function") scheduleRefreshCostIndicators();
  if(typeof scheduleRefreshHistoryIndicators === "function") scheduleRefreshHistoryIndicators();
}



/* =====================================================
   CUSTOMER AUTOCOMPLETE
===================================================== */
function searchCustomer() {
  const keyword = document.getElementById("customerInput").value.toLowerCase().trim();
  const dropdown = document.getElementById("customerDropdown");

  if (!keyword) {
    dropdown.style.display = "none";
    return;
  }

  const results = CUSTOMER_LIST
    .filter(c =>
      (c.contact_name || "").toLowerCase().includes(keyword) ||
      (c.phone || "").includes(keyword)
    )
    .slice(0, 20);

  if (!results.length) {
    dropdown.innerHTML = "<div style='padding:8px;color:#999'>Tidak ditemukan</div>";
    dropdown.style.display = "block";
    return;
  }

 dropdown.innerHTML = results.map(c => `
  <div class="customer-item"
       onclick="selectCustomer('${c.contact_id}')">
    <div class="customer-name">${c.contact_name}</div>
    <div class="customer-meta">
      ${c.phone || "-"} • ${c.category_display}
    </div>
  </div>
`).join("");


  dropdown.style.display = "block";
}
function scheduleRefreshHistoryIndicators(){
  if(_histTimer) clearTimeout(_histTimer);
  _histTimer = setTimeout(()=> refreshHistoryIndicators(), 250);
}

async function refreshHistoryIndicators(){
	console.log("[STEP3] VERSION = 2025-12-30-A");

  console.log("[STEP3] refreshHistoryIndicators CALLED");
  console.log("[STEP3] cart snapshot:", cart);

  try{
    // 0) cart empty => stop
    if(!cart || cart.length === 0){
      console.log("[STEP3] STOP because cart empty");
      return;
    }

    // 1) contactId
    const contactId = (ACTIVE_CUSTOMER?.contact_id ?? -1);
    console.log("[STEP3] contactId:", contactId);

    // 2) itemIds from cart
    const itemIds = [...new Set(
      cart.map(i => Number(i.itemId)).filter(v => v && !Number.isNaN(v))
    )];

    console.log("[STEP3] itemIds:", itemIds);
    console.log("[STEP3] first cart item sample:", cart[0]);

    if(itemIds.length === 0){
      console.log("[STEP3] STOP because itemIds empty. Possible cart field is not itemId.");
      return;
    }

    // 3) key cache
    const key = `${contactId}|${itemIds.join(",")}`;
    console.log("[STEP3] key:", key);

    if(key === _histLastKey){
      console.log("[STEP3] cache hit -> applyPriceHistoryToDOM()");
      applyPriceHistoryToDOM();
      return;
    }
    _histLastKey = key;

    // 4) Query orders
    console.log("[STEP3] query orders...");
    const { data: orders, error: errOrders } = await sb
      .from("pos_sales_orders")
      .select("salesorder_no, transaction_date")
      .eq("contact_id", contactId)
      .order("transaction_date", { ascending: false })
      .limit(500);

    if(errOrders){
      console.error("[STEP3] orders error:", errOrders);
      return;
    }

    console.log("[STEP3] orders count:", (orders || []).length);
    console.log("[STEP3] orders sample:", (orders || [])[0]);

    const orderNos = (orders || []).map(o => o.salesorder_no).filter(Boolean);

    if(orderNos.length === 0){
      console.log("[STEP3] no orders found for contactId", contactId);
      LAST_PRICE_HISTORY = {};
      applyPriceHistoryToDOM();
      return;
    }

    const orderDateMap = new Map((orders || []).map(o => [String(o.salesorder_no), o.transaction_date]));

    // 5) Query order items
    console.log("[STEP3] query order items...");
    const { data: rows, error: errItems } = await sb
      .from("pos_sales_order_items")
      .select("salesorder_no, item_id, price")
      .in("salesorder_no", orderNos)
      .in("item_id", itemIds);

    if(errItems){
      console.error("[STEP3] items error:", errItems);
      return;
    }

    console.log("[STEP3] rows count:", (rows || []).length);
    console.log("[STEP3] rows sample:", (rows || [])[0]);

    // 6) Pick latest per item_id
    const best = {};
    for(const r of (rows || [])){
      const itemId = Number(r.item_id);
      const so = String(r.salesorder_no);
      const dt = orderDateMap.get(so);
      if(!dt) continue;

      if(!best[itemId] || new Date(dt) > new Date(best[itemId].dateIso)){
        best[itemId] = { pPrev: Number(r.price || 0), dateIso: dt };
      }
    }

    LAST_PRICE_HISTORY = best;
    console.log("[STEP3] LAST_PRICE_HISTORY:", LAST_PRICE_HISTORY);

    // 7) Apply to DOM
    applyPriceHistoryToDOM();
    console.log("[STEP3] applyPriceHistoryToDOM DONE");

  }catch(e){
    console.error("[STEP3] refreshHistoryIndicators crash:", e);
  }
}
function applyPriceHistoryToDOM(){
  if(!cart) return;

  for(const i of cart){
    const itemId = Number(i.itemId);
    const rec = LAST_PRICE_HISTORY[itemId];

    const moveEl = document.querySelector(`[data-move-for="${i.code}"]`);
    const dotEl  = document.querySelector(`[data-risk-for="${i.code}"]`);
    if(!moveEl) continue;

    const pNow = Number(i.price || 0);

    // helper: set dot class aman
    const setDot = (cls, titleText) => {
      if(!dotEl) return;
      dotEl.classList.remove("is-neutral","is-ok","is-warn","is-risk");
      dotEl.classList.add(cls);
      if(titleText) dotEl.title = titleText;
    };

    // kalau belum ada histori
    if(!rec){
      moveEl.textContent = "↕";
      moveEl.title = `Prev: - | Now: ${formatRupiah(pNow)}`;
      setDot("is-neutral", "OK");
      continue;
    }

    const pPrev = Number(rec.pPrev || 0);
    const dStr  = formatDateDDMMYYYY(rec.dateIso);

    // ikon arah
    let ico = "→";
    if(pNow > pPrev) ico = "↑";
    else if(pNow < pPrev) ico = "↓";

    moveEl.textContent = ico;
    moveEl.title = `Prev: ${formatRupiah(pPrev)} | Now: ${formatRupiah(pNow)} | ${dStr}`;

    // status dot (Step 3: pakai rule sederhana dulu)
    // status dot (Rule baru: hijau = sama, kuning = beda kecil, merah = beda besar)
// ambang batas bisa diubah sesuai kebutuhan kasir
const SMALL_DIFF_MAX = 2;  // <= 2% => kuning (beda dikit)
const BIG_DIFF_MIN   = 5;  // >= 5% => merah (beda besar)

// hitung selisih persen (hindari pembagian 0)
let diffPct = 0;
if(pPrev > 0){
  diffPct = Math.abs(pNow - pPrev) / pPrev * 100;
}else{
  diffPct = (pNow === 0) ? 0 : 999; // kalau prev 0 tapi now ada, anggap beda sangat besar
}

// rapikan title biar kasir langsung ngeh
const pctText = (diffPct >= 999) ? "∞" : `${diffPct.toFixed(1)}%`;

if(pNow === pPrev){
  // HIJAU: sama persis
  setDot("is-ok", "OK (0%)");
}else if(diffPct <= SMALL_DIFF_MAX){
  // KUNING: beda dikit
  setDot("is-warn", `Cek (${pctText})`);
}else if(diffPct >= BIG_DIFF_MIN){
  // MERAH: beda besar
  setDot("is-risk", `Cek (${pctText})`);
}else{
  // area tengah (2% - 5%) tetap kuning
  setDot("is-warn", `Cek (${pctText})`);
}

  }
}
function scheduleRefreshCostIndicators(){
  console.log("[MODAL1A] scheduleRefreshCostIndicators CALLED"); // ✅ TAMBAH INI
  if(_costTimer) clearTimeout(_costTimer);
  _costTimer = setTimeout(()=> {
    refreshCostIndicators();
  }, 120);
}


async function refreshCostIndicators(){
  try{
    if(!cart || cart.length === 0) return;

    const itemIds = [...new Set(
      cart.map(i => Number(i.itemId)).filter(v => v && !Number.isNaN(v))
    )];

    if(itemIds.length === 0) return;

    const key = itemIds.join(",");
    if(key === _costLastKey){
      applyCostNowToDOM();
      return;
    }
    _costLastKey = key;

    console.log("[MODAL1A] itemIds:", itemIds);

    // 1) ambil PO terbaru
    const { data: poHeads, error: errPO } = await sb
      .from("po_header")
      .select("purchaseorder_id, transaction_date")
      .order("transaction_date", { ascending: false })
      .limit(500);

    if(errPO){
      console.error("[MODAL1A] po_header error:", errPO);
      return;
    }

    const poIds = (poHeads || []).map(x => x.purchaseorder_id).filter(v => v != null);
    if(poIds.length === 0){
      COST_NOW_MAP = {};
      applyCostNowToDOM();
      return;
    }

    const poDateMap = new Map((poHeads || []).map(h => [Number(h.purchaseorder_id), h.transaction_date]));

    // 2) ambil item PO untuk item di cart
    const { data: rows, error: errItems } = await sb
      .from("po_item")
      .select("purchaseorder_id, item_id, buy_price, last_price_receive")
      .in("purchaseorder_id", poIds)
      .in("item_id", itemIds);

    if(errItems){
      console.error("[MODAL1A] po_item error:", errItems);
      return;
    }

    console.log("[MODAL1A] po_item rows:", (rows || []).length);
// 3) ambil 2 PO terbaru per item_id (now & prev) berdasar tanggal PO
const best = {}; // itemId => { now:{c,dt}, prev:{c,dt} }

for(const r of (rows || [])){
  const itemId = Number(r.item_id);
  const poId = Number(r.purchaseorder_id);
  const dt = poDateMap.get(poId);
  if(!dt) continue;

  const c = Number(r.last_price_receive ?? r.buy_price ?? 0);

  if(!best[itemId]){
    best[itemId] = { now: null, prev: null };
  }

  const now = best[itemId].now;
  const prev = best[itemId].prev;

  // case 1: belum ada now
  if(!now){
    best[itemId].now = { c, dt };
    continue;
  }

  // case 2: dt lebih baru dari now => shift now -> prev
  if(new Date(dt) > new Date(now.dt)){
    best[itemId].prev = now;
    best[itemId].now = { c, dt };
    continue;
  }

  // case 3: dt lebih lama dari now, kandidat prev (ambil yang paling baru setelah prev)
  if(new Date(dt) < new Date(now.dt)){
    if(!prev || new Date(dt) > new Date(prev.dt)){
      best[itemId].prev = { c, dt };
    }
  }
}
COST_HISTORY_MAP = best;

// tetap isi COST_NOW_MAP agar tooltip coin tetap jalan
const nowMap = {};
for(const itemId in best){
  if(best[itemId]?.now){
    nowMap[itemId] = { cNow: best[itemId].now.c, dateIso: best[itemId].now.dt };
  }
}
COST_NOW_MAP = nowMap;



    console.log("[MODAL1A] COST_NOW_MAP:", COST_NOW_MAP);

    applyCostNowToDOM();
  }catch(e){
    console.error("[MODAL1A] refreshCostIndicators crash:", e);
  }
}

function applyCostNowToDOM(){
  if(!cart) return;

  for(const i of cart){
    const el = document.querySelector(`[data-cost-indicator-for="${i.code}"]`);
    if(!el) continue;

    const itemId = Number(i.itemId);

    // ambil history (now & prev)
    const h = COST_HISTORY_MAP?.[itemId];

    // fallback: kalau history belum kebentuk, pakai COST_NOW_MAP lama
    if(!h || !h.now){
      const rec = COST_NOW_MAP?.[itemId];
      if(!rec){
        el.title = "Prev: - | Now: -";
        continue;
      }
      const dStr = formatDateDDMMYYYY(rec.dateIso);
      el.title = `Prev: - | Now: ${formatRupiah(rec.cNow)} | ${dStr}`;
      continue;
    }

    const now = h.now; // {c, dt}
    const prev = h.prev; // {c, dt} atau null

    const nowStr = `${formatRupiah(now.c)} | ${formatDateDDMMYYYY(now.dt)}`;
    const prevStr = prev ? `${formatRupiah(prev.c)} | ${formatDateDDMMYYYY(prev.dt)}` : "-";

    el.title = `Prev: ${prevStr} | Now: ${nowStr}`;
  }
}



function selectCustomer(contactId) {
  const cust = CUSTOMER_LIST.find(c => c.contact_id == contactId);
  if (!cust) return;

  ACTIVE_CUSTOMER = cust;

  document.getElementById("customerInput").value =
    cust.contact_name + " (" + cust.category_display + ")";

  document.getElementById("customerDropdown").style.display = "none";

  recalcCartPrices();
  renderCart();
  saveOrderState();
  try { refreshWaPhoneUI(); } catch(_) {}

}

/* =====================================================
   PAGINATION & EVENT
===================================================== */

function updatePagination(total){
  const pages=Math.max(1,Math.ceil(total/pageSize));
  pageInfo.textContent=`Hal ${page}/${pages}`;
  prevPage.disabled=page<=1;
  nextPage.disabled=page>=pages;
}

prevPage.onclick = () => {
  if (page <= 1) return;
  page--;
  loadProducts();
};

nextPage.onclick = () => {
  page++;
  loadProducts();
};

searchInput.oninput=()=>{ currentQuery=searchInput.value.trim(); page=1; loadProducts(); };
btnCari.onclick=()=>{ page=1; loadProducts(); };

searchInput.addEventListener("keydown", async (e) => {
  if (e.key !== "Enter") return;

  const barcode = searchInput.value.trim();
  if (!barcode) return;

  e.preventDefault();

  const product = await findProductByBarcode(barcode);

  if (product) {
    await addToCart(product);

    searchInput.value = "";
    currentQuery = "";
    page = 1;

    loadProducts();
  } else {
    alert("Produk dengan barcode tersebut tidak ditemukan / stok habis");
  }
});


/* =====================================================
   PAGE SWITCH: CASHIER <-> PAYMENT
===================================================== */
// ✅ TAMBAHKAN INI (WAJIB ADA SEBELUM DIPAKAI)
function resetPaymentLines(){
  PAYMENT_LINES = [];
}

// ===== PAYMENT =====
async function goToPayment() {
  if (!cart.length) {
    alert("Belum ada item di keranjang");
    return;
  }

    // ✅ nomor order: online pakai server, offline pakai local
  if (!CURRENT_SALESORDER_NO && !CURRENT_LOCAL_ORDER_NO) {
    if (isOnline()) {
      CURRENT_ORDER_MODE = "online";
      CURRENT_SALESORDER_NO = await generateSalesOrderNo();
    } else {
      CURRENT_ORDER_MODE = "offline";
      CURRENT_LOCAL_ORDER_NO = generateLocalOrderNo();
    }
    updateOrderNumberUI();
    saveOrderState();
  }


  // pastikan tab kiri tetap "sales"
  setActiveTabBtn("sales");

  panelProduct.style.display = "none";
  panelPayment.style.display = "flex";
  panelPayment.dataset.active = "1";
  panelTransactions.style.display = "none";
  panelSettings.style.display = "none";
  btnNext.style.display = "none";

  payTotal.textContent = formatRupiah(calcTotal());
  payItemCount.textContent = calcItemCount();

  selectedPaymentMethod = null;
  document.querySelectorAll(".pay-method-btn").forEach(b => b.classList.remove("active"));

  cashInput.disabled = false;
  cashInput.readOnly = false;
  cashInput.value = "";
  changeOutput.textContent = formatRupiah(0);

 if (quickCash) quickCash.style.display = "none";
resetPaymentLines();

// ✅ siapkan tombol quick cash sesuai total
renderQuickCashButtons();


  cashInput.value = "";
  changeOutput.textContent = formatRupiah(0);

  recalcPaymentStatus();
}
function methodLabel(method){
  const map = {
    cash: "Tunai", // ✅ dari "Kas" -> "Cash"
    debit_bca: "Debit BCA",
    debit_mandiri: "Debit Mandiri",
    qris_gopay: "QRIS GoPay",
    transfer_bca: "Transfer BCA",
    transfer_mandiri: "Transfer Mandiri", // ✅ tambah
    piutang: "Piutang"
  };
  return map[method] || method;
}




function formatLineAmount(n){
  return "Rp" + Number(n||0).toLocaleString("id-ID") + ",00";
}


function upsertPayLine(method, amount, labelOverride, meta){
  amount = Number(amount || 0);

  // kalau amount <=0 -> hapus line method tsb
  if (amount <= 0) {
    PAYMENT_LINES = PAYMENT_LINES.filter(x => x.method !== method);
    return;
  }

  const idx = PAYMENT_LINES.findIndex(x => x.method === method);

  // kalau belum ada line dan sudah 3 -> stop
  if (idx === -1 && PAYMENT_LINES.length >= 3) {
    alert("Maksimal 3 metode pembayaran.");
    return;
  }

  const finalLabel = labelOverride || methodLabel(method);

  if (idx >= 0) {
    PAYMENT_LINES[idx].amount = amount;
    PAYMENT_LINES[idx].label = finalLabel;      // ✅ update label juga
    PAYMENT_LINES[idx].meta = meta || null;     // ✅ simpan meta (optional)
  } else {
    PAYMENT_LINES.push({
      method,
      label: finalLabel,
      amount,
      meta: meta || null
    });
  }
}


/* =========================
   PAYMENT HELPERS (FINAL)
========================= */

// total yang benar-benar dibayar (cash + noncash), piutang TIDAK dihitung bayar
function totalPaidOnly(){
  return PAYMENT_LINES
    .filter(x => x.method !== "piutang")
    .reduce((s,x)=> s + (Number(x.amount)||0), 0);
}

// sisa yang masih harus dibayar (tanpa memperhitungkan piutang)
function remainingToPay(){
  const rem = calcTotal() - totalPaidOnly();
  return rem > 0 ? rem : 0;
}

// kompatibilitas jika ada kode lama yg manggil remainingAmount()
function remainingAmount(){
  return remainingToPay();
}

function renderPaymentLines(){
  if(!payLinesList) return;

  if(PAYMENT_LINES.length === 0){
    payLinesList.innerHTML = `
      <div style="padding:12px;color:#999;font-size:13px">
        Belum ada pembayaran
      </div>
    `;
  } else {
    payLinesList.innerHTML = PAYMENT_LINES.map((x, idx) => `
      <div style="
        display:flex;
        align-items:center;
        justify-content:space-between;
        padding:12px;
        border-bottom:1px solid #eee;
      ">
        <div style="font-size:13px;color:#333">${x.label}</div>

        <div style="display:flex;align-items:center;gap:10px">
          <div style="font-weight:700;color:#111">
            ${formatLineAmount(x.amount)}
          </div>
          <button type="button" onclick="removePayLine(${idx})"
            style="border:none;background:transparent;cursor:pointer;color:#e53935;font-size:16px;"
            title="Hapus">🗑</button>
        </div>
      </div>
    `).join("");
  }

  if(payRemaining){
    const rem = remainingAmount();
    payRemaining.textContent = formatRupiah(rem > 0 ? rem : 0);
  }
}

function recalcPaymentStatus(){
  // ✅ kalau piutang ada, nilainya harus selalu = sisa yang belum dibayar
  const idxP = PAYMENT_LINES.findIndex(x => x.method === "piutang");
  if (idxP >= 0) {
    const unpaid = remainingToPay();
    if (unpaid <= 0) {
      // kalau sudah lunas, piutang tidak relevan -> hapus
      PAYMENT_LINES.splice(idxP, 1);
    } else {
      PAYMENT_LINES[idxP].amount = unpaid;
      PAYMENT_LINES[idxP].label = methodLabel("piutang");
    }
  }

  renderPaymentLines();

  const total = calcTotal();
  const paid = totalPaidOnly();

  // change hanya jika ada CASH dan paid > total (tanpa piutang)
  const hasCash = PAYMENT_LINES.some(x => x.method === "cash");
  const change = (hasCash && paid > total) ? (paid - total) : 0;
  changeOutput.textContent = formatRupiah(change);

  const hasAnyLine = PAYMENT_LINES.length > 0;
  const hasPiutang = PAYMENT_LINES.some(x => x.method === "piutang");

  // ✅ boleh selesai jika:
  // - sudah lunas (paid >= total), ATAU
  // - ada piutang (artinya sisa dicatat piutang)
  const isOk = hasAnyLine && (paid >= total || hasPiutang);

  if(isOk){
    btnFinishPayment.classList.remove("disabled");
    btnFinishPayment.classList.add("active");
    btnFinishPayment.disabled = false;
  } else {
    btnFinishPayment.classList.remove("active");
    btnFinishPayment.classList.add("disabled");
    btnFinishPayment.disabled = true;
  }
}


function upsertCashLine(amount){
  amount = Number(amount || 0);

  // kalau mau tambah cash line baru tapi sudah 3 line -> stop
  const hasCash = PAYMENT_LINES.some(x => x.method === "cash");
  if (!hasCash && PAYMENT_LINES.length >= 3 && amount > 0) {
    alert("Maksimal 3 metode pembayaran.");
    return;
  }

  upsertPayLine("cash", amount);
  recalcPaymentStatus();
}


function setCash(amount) {
  selectedPaymentMethod = "cash";

  cashInput.disabled = false;
  cashInput.readOnly = false;
  cashInput.value = amount;

  upsertCashLine(Number(amount));

  if (quickCash) quickCash.style.display = "flex";
}

function onCashInputChange(){
  if(selectedPaymentMethod !== "cash") return;
  const v = Number(cashInput.value || 0);
  upsertCashLine(v);
}

function addNonCashLine(method){
  const total = calcTotal();
  if (total <= 0) {
    alert("Total masih Rp0. Cek data harga (PRICE_MAP).");
    return;
  }

  const rem = remainingToPay();
  if (rem <= 0) {
    alert("Sudah lunas. Tidak perlu tambah metode lagi.");
    return;
  }

  // kalau method belum ada dan sudah 3 line -> stop
  const exists = PAYMENT_LINES.some(x => x.method === method);
  if (!exists && PAYMENT_LINES.length >= 3) {
    alert("Maksimal 3 metode pembayaran.");
    return;
  }

  // ✅ biar bisa partial, kita tanya nominal (default = sisa)
  let acc = null;
let label = methodLabel(method);

// ✅ kalau transfer, pilih rekening dulu
if (method === "transfer_bca" || method === "transfer_mandiri") {
  acc = pickTransferAccount(method);
  if (!acc) return; // batal
  label = transferLabel(method, acc);
}

const raw = prompt(`Nominal untuk ${label}:`, String(rem));
if (raw === null) return;

const amt = Number(String(raw).replace(/[^\d]/g, "")) || 0;
// ...validasi tetap sama...

upsertPayLine(method, amt, label, acc ? { account_id: acc.id, bank: acc.bank, no: acc.no, an: acc.an } : null);

  recalcPaymentStatus();
}

function removePayLine(idx){
  if (idx < 0 || idx >= PAYMENT_LINES.length) return;

  const removed = PAYMENT_LINES[idx];
  PAYMENT_LINES.splice(idx, 1);

  // kalau yang dihapus cash, reset input cash
  if (removed?.method === "cash" && cashInput) {
    cashInput.value = "";
    cashInput.disabled = false;
    cashInput.readOnly = false;
  }

  // kalau sudah tidak ada line cash, sembunyikan quick cash kecuali mode cash dipilih
  const hasCash = PAYMENT_LINES.some(x => x.method === "cash");
  if (!hasCash && selectedPaymentMethod !== "cash") {
    if (quickCash) quickCash.style.display = "none";
  }

  recalcPaymentStatus();
}

// =========================
// BANK ACCOUNTS (TRANSFER)
// =========================
const TRANSFER_ACCOUNTS = {
  transfer_bca: [
    { id:"bca_1", bank:"BCA", no:"8960709498", an:"MAULIDATUL HASANAH" },
    { id:"bca_2", bank:"BCA", no:"8416019083", an:"MARYAM MOH. IBRAHIM" },
    { id:"bca_3", bank:"BCA", no:"8415132227", an:"AHMAD MUJAHID" },
    { id:"bca_4", bank:"BCA", no:"8416081960", an:"PUTRI BILQIS AL BANNA" },
  ],
  transfer_mandiri: [
    { id:"mandiri_1", bank:"Mandiri", no:"1400016969744", an:"AHMAD MUJAHID" },
  ]
};

function pickTransferAccount(method){
  const list = TRANSFER_ACCOUNTS[method] || [];
  if (!list.length) return null;

  // kalau cuma 1 rekening, langsung pilih
  if (list.length === 1) return list[0];

  // kalau banyak, suruh pilih
  const menu = list
    .map((x,i)=> `${i+1}. ${x.bank} ${x.no} (A.N ${x.an})`)
    .join("\n");

  const raw = prompt(
    `Pilih rekening untuk ${methodLabel(method)}:\n\n${menu}\n\nKetik angka 1-${list.length}`,
    "1"
  );
  if (raw === null) return null;

  const idx = Number(String(raw).trim()) - 1;
  if (Number.isNaN(idx) || idx < 0 || idx >= list.length) {
    alert("Pilihan rekening tidak valid.");
    return null;
  }
  return list[idx];
}

function transferLabel(method, acc){
  if (!acc) return methodLabel(method);
  return `${methodLabel(method)} - ${acc.no} (A.N ${acc.an})`;
}

function bindPaymentMethodButtons(){
  document.querySelectorAll(".pay-method-btn").forEach(btn => {
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";

    btn.addEventListener("click", () => {

      // aktifkan tombol UI (active)
      document.querySelectorAll(".pay-method-btn")
        .forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      selectedPaymentMethod = btn.dataset.method;
	  // ===============================



      if (selectedPaymentMethod === "cash") {

        // CASH: jangan hapus line lain, hanya aktifkan input cash
        const cashLine = PAYMENT_LINES.find(x => x.method === "cash");

        if (cashInput) {
          cashInput.disabled = false;
          cashInput.readOnly = false;
          cashInput.value = cashLine ? String(cashLine.amount || "") : "";
          cashInput.focus();
        }

        renderQuickCashButtons();
        if (quickCash) quickCash.style.display = "flex";

        // kalau belum ada line cash, biarkan belum ada sampai user input / quickcash
        recalcPaymentStatus();
        return;

      }

      if (selectedPaymentMethod === "piutang") {

        // PIUTANG: tambah/ubah piutang = sisa yang belum dibayar
        if (cashInput) {
          cashInput.value = "";
          cashInput.disabled = true;
          cashInput.readOnly = true;
        }
        if (quickCash) quickCash.style.display = "none";

        const rem = remainingToPay();
        if (rem <= 0) {
          alert("Sudah lunas, piutang tidak diperlukan.");
          recalcPaymentStatus();
          return;
        }

        // enforce max 3 line kalau piutang belum ada
        const exists = PAYMENT_LINES.some(x => x.method === "piutang");
        if (!exists && PAYMENT_LINES.length >= 3) {
          alert("Maksimal 3 metode pembayaran.");
          return;
        }

        upsertPayLine("piutang", rem);
        recalcPaymentStatus();
        return;
      }

      // NON-CASH: tambah line dengan nominal (prompt, default sisa)
      if (cashInput) {
        cashInput.disabled = true;
        cashInput.readOnly = true;
        cashInput.value = "";
      }
      if (quickCash) quickCash.style.display = "none";

      addNonCashLine(selectedPaymentMethod);
    });
  });
}

/* =====================================================
   WA RECEIPT - PHONE INPUT UI (TAHAP 5)
===================================================== */

function normalizeWaPhone(raw){
  let s = String(raw || "").trim();
  s = s.replace(/[^\d]/g, ""); // digits only
  if (!s) return "";

  // 0812xxxx -> 62812xxxx
  if (s.startsWith("0")) s = "62" + s.slice(1);

  // 812xxxx -> 62812xxxx
  if (s.startsWith("8")) s = "62" + s;

  return s;
}
// ================================
// RESEND WA (TAHAP 9) - HELPERS
// ================================
function getTxnPhoneCandidate(header, isOffline) {
  if (!header) return "";

  // ONLINE: biasanya pakai shipping_phone / customer_name
  // OFFLINE: biasanya struktur beda (dari localStorage)
  if (isOffline) {
    const p = header.customer?.phone || header.shipping_phone || header.phone || "";
    return String(p || "").trim();
  }

  const p = header.shipping_phone || header.phone || "";
  return String(p || "").trim();
}

function buildReceiptDataFromTxn(header, items, payments, isOffline) {
  // header minimal yang kita butuhkan
  const orderNo =
    (isOffline ? (header.local_order_no || header.salesorder_no || "") : (header.salesorder_no || header.local_order_no || "")) || "";

  const trxDate =
    header.transaction_date ||
    header.created_at ||
    header.date ||
    null;

  const cashierName = header.cashier_name || header.cashierName || "Kasir";
  const customerName =
    header.customer_name ||
    header.customer?.contact_name ||
    header.customer?.name ||
    header.customer_name_display ||
    "Pelanggan Umum";

  const safeItems = (items || []).map(it => {
    const qty = Number(it.qty ?? it.qty_in_base ?? it.quantity ?? 1) || 1;
    const price = Number(it.price ?? it.unit_price ?? 0) || 0;
    const subtotal = (it.subtotal != null) ? Number(it.subtotal) : (qty * price);

    return {
      name: it.name || it.description || it.product_name || it.product || it.sku || "Item",
      qty,
      price,
      subtotal
    };
  });

  const total =
    Number(header.grand_total ?? header.total ?? header.sub_total ?? 0) ||
    safeItems.reduce((s, i) => s + Number(i.subtotal || 0), 0);

  const paid = (payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);

  // change sederhana: kalau ada cash dan bayar > total
  const hasCash = (payments || []).some(p => String(p.payment_method || p.method || "").toLowerCase() === "cash");
  const change = (hasCash && paid > total) ? (paid - total) : 0;

  return {
    receipt_no: orderNo,
    date_str: trxDate ? formatDateID(trxDate) : new Date().toLocaleString("id-ID"),
    cashier_name: cashierName,
    customer_name: customerName,
    items: safeItems,
    total,
    paid,
    change
  };
}

function openTxnReceiptToWA(header, items, payments, isOffline) {
  // 1) ambil nomor kandidat dari transaksi
  const phoneCandidateRaw = getTxnPhoneCandidate(header, isOffline);
  const phoneCandidate = normalizeWaPhone(phoneCandidateRaw);

  // 2) kalau kosong -> minta input manual (simple & aman, tidak ganggu layout mobile)
  let finalPhone = phoneCandidate;
  if (!finalPhone) {
    const manual = prompt("Masukkan No WhatsApp tujuan (format 62xxxxxxxxxxx, tanpa +):", "");
    finalPhone = normalizeWaPhone(manual || "");
  }

  // 3) validasi final
  if (!finalPhone) {
    alert("No WhatsApp belum diisi. Batal kirim ulang.");
    return;
  }
  if (finalPhone.length < 10 || finalPhone.length > 15 || !finalPhone.startsWith("62")) {
    alert(" reminds: No WhatsApp tidak valid. Gunakan format 62xxxxxxxxxxx (tanpa + dan tanpa spasi).");
    return;
  }

  // 4) build text nota & buka WA
  const receiptData = buildReceiptDataFromTxn(header, items, payments, isOffline);
  const text = buildWaReceiptText(receiptData);

  console.log("[WA_RESEND] target ->", finalPhone, "| order ->", receiptData.receipt_no);
  openWhatsAppWithText(finalPhone, text);
}

function buildWaReceiptText(receiptData) {
  // receiptData: kita coba pakai variabel struk yang sudah ada di project
  // fallback aman kalau beberapa field tidak ada
  const lines = [];

  lines.push("TASAJI FOOD");
  if (receiptData?.receipt_no) lines.push("No: " + receiptData.receipt_no);
  if (receiptData?.date_str) lines.push("Tanggal: " + receiptData.date_str);
  if (receiptData?.cashier_name) lines.push("Kasir: " + receiptData.cashier_name);
  if (receiptData?.customer_name) lines.push("Customer: " + receiptData.customer_name);

  lines.push("------------------------------");

  const items = receiptData?.items || [];
  for (const it of items) {
    // format: Nama xQty @Harga = Subtotal (simple)
    const name = it.name ?? it.product_name ?? "Item";
    const qty = it.qty ?? it.quantity ?? 1;
    const price = it.price ?? it.unit_price ?? 0;
    const sub = it.subtotal ?? (qty * price);

    lines.push(`${name}`);
    lines.push(`x${qty}  @${formatRupiah(price)}   = ${formatRupiah(sub)}`);
  }

  lines.push("------------------------------");

  if (receiptData?.total != null) lines.push("TOTAL: " + formatRupiah(receiptData.total));
  if (receiptData?.paid != null) lines.push("BAYAR: " + formatRupiah(receiptData.paid));
  if (receiptData?.change != null) lines.push("KEMBALI: " + formatRupiah(receiptData.change));

  lines.push("");
  lines.push("Terima kasih 🙏");

  return lines.join("\n");
}

function copyToClipboardFallback(text) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  } catch (_) {
    return false;
  }
}

function openWhatsAppWithText(phone62, text) {
  const msg = encodeURIComponent(text);
  const url = `https://wa.me/${phone62}?text=${msg}`;
  console.log("[WA_OPEN] url ->", url);

  const w = window.open(url, "_blank");

  // fallback kalau popup diblok browser
  if (!w) {
    console.warn("[WA_OPEN] popup blocked");
    const copied = copyToClipboardFallback(url);

    const msgInfo =
      "Browser memblokir popup WhatsApp.\n" +
      (copied ? "Link WA sudah dicopy.\n" : "") +
      "Klik OK untuk buka WhatsApp di tab ini (aplikasi POS akan pindah).";

    if (confirm(msgInfo)) {
      window.location.href = url;
    }
  }
}


function getActiveCustomerWa(){
  const p = (ACTIVE_CUSTOMER && ACTIVE_CUSTOMER.phone != null)
    ? String(ACTIVE_CUSTOMER.phone).trim()
    : "";
  return normalizeWaPhone(p);
}

function refreshWaPhoneUI(){
  const chk = document.getElementById("chkSendWaReceipt");
  const isWaMode = chk ? chk.checked : false;

  // ambil ulang DOM setiap kali dipanggil (biar pasti ketemu)
  const waPhoneBoxEl = document.getElementById("waPhoneBox");
  const waPhoneInputEl = document.getElementById("waPhoneInput");

  if (!waPhoneBoxEl || !waPhoneInputEl) {
    console.warn("[WA_PHONE_UI] DOM not found", { waPhoneBoxEl, waPhoneInputEl });
    return;
  }

  // kalau WA mode mati -> sembunyikan
  if (!isWaMode){
    waPhoneBoxEl.style.display = "none";
    waPhoneInputEl.required = false;
    return;
  }

  const custPhone = getActiveCustomerWa();

  if (custPhone){
    // MEMBER (auto)
    waPhoneBoxEl.style.display = "none";
    waPhoneInputEl.required = false;
    waPhoneInputEl.value = custPhone;
    console.log("[WA_PHONE_UI] member auto ->", custPhone);
  } else {
    // GUEST (manual)
    waPhoneBoxEl.style.display = "block";
    waPhoneInputEl.required = true;

    const last = localStorage.getItem("pos_last_wa_phone") || "";
    if (!waPhoneInputEl.value && last) waPhoneInputEl.value = last;

    console.log("[WA_PHONE_UI] guest -> show input");
  }
}


async function processPayment() {
  if (window.__POS_PAY_LOCK) {
    console.warn("[PAY] blocked: double click");
    return;
  }
  window.__POS_PAY_LOCK = true;

  try {
    // === INTERCEPT FINISH PAYMENT (TAHAP 2) ===
    const chkSendWaReceipt = document.getElementById("chkSendWaReceipt");
    const isWaMode = chkSendWaReceipt ? chkSendWaReceipt.checked : false;

    if (isWaMode) {
      console.log("[FINISH_PAYMENT] MODE = WA");
    } else {
      console.log("[FINISH_PAYMENT] MODE = PRINT");
    }
// === VALIDASI PIUTANG: WAJIB PILIH PELANGGAN (NON-UMUM) + WAJIB ADA NO TELP ===
const hasPiutang = (PAYMENT_LINES || []).some(p => p.method === "piutang");
if (hasPiutang) {
  const cid = (ACTIVE_CUSTOMER && ACTIVE_CUSTOMER.contact_id != null) ? ACTIVE_CUSTOMER.contact_id : -1;
  const cname = String(ACTIVE_CUSTOMER?.contact_name || "Pelanggan Umum").trim();

  const isUmum =
    (cid === -1) ||
    /^umum$/i.test(cname) ||
    /^pelanggan\s*umum$/i.test(cname);

  if (isUmum) {
    alert("Pembayaran PIUTANG hanya untuk pelanggan selain Pelanggan Umum.\nPilih pelanggan dulu.");
    console.warn("[PIUTANG_VALIDATION] blocked: customer umum");
    return; // STOP
  }

  const phone62 = normalizePhoneTo62(ACTIVE_CUSTOMER?.phone || "");
  if (!phone62) {
    alert("Pembayaran PIUTANG wajib ada No. Telp/WA pelanggan.\nIsi nomor di data pelanggan (Master) atau pilih pelanggan yang sudah ada nomornya.");
    console.warn("[PIUTANG_VALIDATION] blocked: missing phone");
    return; // STOP
  }

  // simpan balik dalam format 62 biar konsisten ke DB + WA reminder
  ACTIVE_CUSTOMER.phone = phone62;
}

    // === WA TARGET DETECTION (TAHAP 4) ===
    if (isWaMode) {
      const waPhoneRaw = (ACTIVE_CUSTOMER?.phone != null)
        ? String(ACTIVE_CUSTOMER.phone).trim()
        : "";

      if (ACTIVE_CUSTOMER && waPhoneRaw) {
        console.log("[WA_TARGET] CUSTOMER = MEMBER (auto) ->", waPhoneRaw);
      } else {
        console.log("[WA_TARGET] CUSTOMER = GUEST (input required)");
      }
    }

    // === WA FINAL PHONE + VALIDATION (TAHAP 6) ===
    if (isWaMode) {
      const memberPhone = normalizeWaPhone(ACTIVE_CUSTOMER?.phone ?? "");

      const waPhoneInputEl = document.getElementById("waPhoneInput");
      const guestPhoneRaw = waPhoneInputEl ? waPhoneInputEl.value : "";
      const guestPhone = normalizeWaPhone(guestPhoneRaw);

      const finalWaPhone = memberPhone || guestPhone;

      // WAJIB ADA NOMOR (kalau user centang WA)
      if (!finalWaPhone) {
        alert("No WhatsApp belum diisi.\nIsi dulu nomor untuk kirim nota via WhatsApp.");
        console.warn("[WA_FINAL] missing phone -> STOP");

        if (waPhoneInputEl) {
          waPhoneInputEl.focus();
          try {
            waPhoneInputEl.scrollIntoView({ behavior: "smooth", block: "center" });
          } catch (_) {}
        }
        return; // STOP proses pembayaran supaya tidak lanjut
      }

      // Validasi E.164 (tanpa +): max 15 digit, minimal masuk akal
      if (
        finalWaPhone.length < 10 ||
        finalWaPhone.length > 15 ||
        !finalWaPhone.startsWith("62")
      ) {
        alert("No WhatsApp tidak valid.\nGunakan format 62xxxxxxxxxxx (tanpa + dan tanpa spasi).");
        console.warn("[WA_FINAL] invalid phone -> STOP:", finalWaPhone);

        if (waPhoneInputEl) {
          waPhoneInputEl.focus();
          try {
            waPhoneInputEl.scrollIntoView({ behavior: "smooth", block: "center" });
          } catch (_) {}
        }
        return; // STOP proses pembayaran
      }

      // simpan untuk mempercepat input berikutnya
      localStorage.setItem("pos_last_wa_phone", finalWaPhone);

      // simpan target untuk Tahap 7 (buka WA)
      window.__POS_WA_TARGET_PHONE = finalWaPhone;

      console.log("[WA_FINAL] target phone ->", finalWaPhone);

      // === WA OPEN (TAHAP 7) ===
      // sementara: pakai data minimal dari state saat ini
      try {
        const receiptData = {
          receipt_no: (typeof CURRENT_ORDER_NO !== "undefined" ? CURRENT_ORDER_NO : "") || "",
          date_str: new Date().toLocaleString("id-ID"),
          cashier_name: (typeof CASHIER_NAME !== "undefined" ? CASHIER_NAME : "") || "",
          customer_name: (ACTIVE_CUSTOMER?.contact_name || "Pelanggan Umum"),
          items: (cart || []).map(it => ({
            name: it.name || it.product_name || it.product || it.sku || "Item",
            qty: it.qty ?? it.quantity ?? 1,
            price: it.price ?? it.unit_price ?? 0,
            subtotal: (it.subtotal != null)
              ? it.subtotal
              : ((it.qty ?? it.quantity ?? 1) * (it.price ?? it.unit_price ?? 0))
          })),
          total: (typeof calcTotal === "function") ? calcTotal() : null,
          paid: (() => {
            const cashEl = document.getElementById("cashInput");
            const v = cashEl ? Number(cashEl.value || 0) : null;
            return isNaN(v) ? null : v;
          })(),
          change: (() => {
            // changeOutput format "Rp 0" -> kita skip parse rumit dulu
            return null;
          })()
        };

        const text = buildWaReceiptText(receiptData);
        openWhatsAppWithText(finalWaPhone, text);
      } catch (e) {
        console.error("[WA_OPEN] failed:", e);
      }
    }

    // ==============================
    // OFFLINE MODE: SIMPAN LOKAL SAJA
    // ==============================
    if (!isOnline()) {
      const offlineOrder = {
        local_order_no: CURRENT_LOCAL_ORDER_NO || generateLocalOrderNo(),
        cashier_id: CASHIER_ID,
        cashier_name: CASHIER_NAME,
        created_at: new Date().toISOString(),
        customer: ACTIVE_CUSTOMER,
        cart: cart,
        payments: PAYMENT_LINES,
        total: calcTotal(),
        status: "OFFLINE_DRAFT"
      };

      const key = "pos_offline_orders_v1";
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      list.push(offlineOrder);
      localStorage.setItem(key, JSON.stringify(list));
	  // ✅ update terlaris lokal (offline)
bumpOfflineBestCounter(offlineOrder.cart);


      // cetak struk pakai nomor LOCAL
      generateReceiptData(
  t.local_order_no,
  t.cart,
  t.payments,
  {
    customer_name: t.customer?.contact_name || "UMUM",
    cashier_name: t.cashier_name,
    transaction_date: t.created_at,
    grand_total: t.total
  },
  { fromReprint: true, forcePrint: true }
);


      resetAll();
      alert("⚠️ Transaksi disimpan OFFLINE.\nAkan disinkronkan saat online.");
      return;
    }

// ======================
// ONLINE MODE (Supabase)
// ======================

// ✅ Pisahkan SAVE vs POST-SAVE (print/reset) supaya error print tidak dianggap gagal simpan
let order = null;
let __saveStep = "START";

// (A) SAVE KE SUPABASE
try {
  __saveStep = "HYDRATE_ITEM_IDS";
  await hydrateCartItemIds();

  __saveStep = "SAVE_HEADER";
  order = await saveSalesOrderHeader();

  __saveStep = "SAVE_ITEMS";
  await saveSalesOrderItems(order.salesorder_no);

  __saveStep = "SAVE_PAYMENTS";
  await saveSalesOrderPayments(order.salesorder_no);

} catch (err) {
  console.error("❌ SAVE error step =", __saveStep, err);

  // ✅ Kalau header sudah sempat tersimpan, jangan reset nomor order & jangan bilang gagal simpan total
  if (order && order.salesorder_no) {
    alert(
      "Transaksi kemungkinan sudah terbentuk: " + order.salesorder_no + "\n" +
      "Namun terjadi kendala saat menyimpan detail/pembayaran.\n" +
      "Silakan cek menu Transaksi untuk memastikan.\n" +
      "Jika belum lengkap, ulangi pembayaran / perbaiki data."
    );
    return;
  }

  // ❌ Kalau header belum tersimpan, baru reset seperti sebelumnya
  CURRENT_SALESORDER_NO = null;
  localStorage.removeItem("pos_salesorder_no");
  updateOrderNumberUI();

  alert("Gagal menyimpan transaksi.\nNomor order di-reset.\nSilakan coba lagi.");
  return;
}

// (B) POST-SAVE: PRINT / CLEANUP / RESET
// (B) POST-SAVE: PRINT / CLEANUP / RESET
try {
  // hapus dari transaksi tersimpan (jika ada)
  try { removeCurrentHoldIfAny(); } catch (e) {
    console.warn("removeCurrentHoldIfAny gagal:", e);
  }

  // khusus PIUTANG: paksa tetap print (biar struk muncul walau ada mode WA/setting lain)
  const forcePrintPiutang = (PAYMENT_LINES || []).some(x => x.method === "piutang");

  // cetak struk (BEST EFFORT)
  let printOk = false;
  try {
    generateReceiptData(
      order?.salesorder_no || "-",
      cart,
      PAYMENT_LINES,
      order,
      { fromPayment: true, forcePrint: forcePrintPiutang }
    );
    printOk = true;
  } catch (printErr) {
    console.error("⚠️ PRINT error:", printErr);
  }

  // reset transaksi SETELAH print dipanggil
  try { resetAll(); } catch (e) {
    console.warn("resetAll gagal:", e);
  }

  // kalau print gagal → info saja (transaksi tetap sukses)
  if(!printOk){
    alert(
      "Transaksi sudah tersimpan: " + (order?.salesorder_no || "-") + "\n" +
      "Namun struk belum berhasil diprint.\n" +
      "Silakan buka menu Transaksi untuk reprint."
    );
  }

} catch (postErr) {
  console.error("⚠️ POST-SAVE error (cleanup/reset):", postErr);

  alert(
    "Transaksi sudah tersimpan: " + (order?.salesorder_no || "-") + "\n" +
    "Namun terjadi kendala setelah penyimpanan.\n" +
    "Silakan buka menu Transaksi untuk reprint."
  );

  // tetap reset biar bisa lanjut transaksi berikutnya
  try { resetAll(); } catch (_e) {}
}


  } finally {
    // ✅ WAJIB: biar gak nyangkut kalau ada return di tengah
    window.__POS_PAY_LOCK = false;
  }
}

function backToEdit() {
  resetPaymentLines();
  selectedPaymentMethod = null;

  document.querySelectorAll(".pay-method-btn")
    .forEach(b => b.classList.remove("active"));

  setActiveTabBtn("sales");
  panelPayment.style.display = "none";
  panelProduct.style.display = "flex";

  // ✅ INI PENTING
  btnNext.style.display = "block";

  panelPayment.dataset.active = "0";
}


/* =====================================================
   SALES ORDER NUMBER
===================================================== */
async function generateSalesOrderNo() {
  const today = new Date();
  const dateForDb = today.toISOString().slice(0, 10);
  const ymd = dateForDb.replace(/-/g, "");
  const hhmm =
    String(today.getHours()).padStart(2, "0") +
    String(today.getMinutes()).padStart(2, "0");

  const { data, error } = await sb
    .rpc("get_next_daily_order_number", { p_date: dateForDb });

  if (error) {
    console.error("Gagal generate nomor order", error);
    throw error;
  }

  const seq = String(data).padStart(4, "0");
  return `TSJP-${ymd}-${hhmm}-${seq}`;
}


/* =====================================================
   SAVE SALES ORDER (HEADER/ITEMS/PAYMENTS)
===================================================== */
// ✅ pastikan setiap item di cart punya itemId (anti NaN -> null)
async function hydrateCartItemIds(){
  for (const item of cart) {
    // kalau sudah valid, skip
    if (item.itemId !== undefined && item.itemId !== null && !Number.isNaN(Number(item.itemId))) continue;

    const code = item.itemCode || item.code;
    if (!code) continue;

    const { data, error } = await sb
      .from("master_items")
      .select("item_id")
      .eq("item_code", code)
      .limit(1)
      .single();

    if (!error && data?.item_id) {
      item.itemId = data.item_id;
      item.itemCode = code;
      item.code = code;
    }
  }

  // simpan kembali ke localStorage biar permanen
  saveOrderState();
}

async function saveSalesOrderHeader() {
  // ✅ kalau belum ada nomor, buat sekarang (anti error, anti reuse sisa localStorage)
  if (!CURRENT_SALESORDER_NO) {
    CURRENT_SALESORDER_NO = await generateSalesOrderNo();
    updateOrderNumberUI();
    saveOrderState();
  }

  const payload = {

    salesorder_no: CURRENT_SALESORDER_NO,
	cashier_id: CASHIER_ID || "UNKNOWN",
	cashier_name: CASHIER_NAME || "UNKNOWN",
    contact_id: ACTIVE_CUSTOMER?.contact_id ?? -1,
    customer_name: ACTIVE_CUSTOMER?.contact_name ?? "Pelanggan Umum",
    shipping_phone: normalizePhoneTo62(ACTIVE_CUSTOMER?.phone ?? "") || null,
    transaction_date: new Date().toISOString(),
    sub_total: calcTotal(),
    grand_total: calcTotal(),
    payment_method: PAYMENT_LINES.map(p => p.label).join(", "),
    location_id: -1,
    store_id: -100,
    is_paid: !PAYMENT_LINES.some(p => p.method === "piutang"),
  };

  const { data, error } = await sb
    .from("pos_sales_orders")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("❌ Gagal simpan sales order", error);
    console.error("PAYLOAD:", payload);
    throw error;
  }

  return data;
}


async function saveSalesOrderItems(salesorderNo) {
  if (!cart.length) return;

  const itemsPayload = cart.map(item => {
  const itemIdNum = Number(item.itemId);

  if (!itemIdNum || Number.isNaN(itemIdNum)) {
    throw new Error("item_id kosong untuk item_code: " + (item.itemCode || item.code));
  }

  return {
    salesorder_no: salesorderNo,

    item_id: itemIdNum,
    item_code: item.itemCode || item.code,

    description: item.name,
    qty_in_base: item.qty,
    price: item.price,
    amount: item.qty * item.price,
    location_id: -1
  };
});



  const { error } = await sb
    .from("pos_sales_order_items")
    .insert(itemsPayload);

  if (error) {
    console.error("❌ Gagal simpan item order", error);
    throw error;
  }
}

async function saveSalesOrderPayments(salesorderNo) {
  if (!PAYMENT_LINES || PAYMENT_LINES.length === 0) return;

  // ✅ PIUTANG bukan pembayaran -> jangan disimpan ke pos_sales_order_payments
  const realPays = PAYMENT_LINES.filter(p => p.method !== "piutang");

  // kalau tidak ada pembayaran nyata (misal full piutang), tidak perlu insert payments
  if (realPays.length === 0) return;

  const paymentsPayload = realPays.map(p => ({
    salesorder_no: salesorderNo,
    payment_method: p.label,
    amount: Number(p.amount || 0)
  }));

  const { error } = await sb
    .from("pos_sales_order_payments")
    .insert(paymentsPayload);

  if (error) {
    console.error("❌ Gagal simpan pembayaran", JSON.stringify(error, null, 2));

    throw error;
  }
}


/* =====================================================
   STRUK: GENERATE DARI DATA (reprint / selesai bayar)
===================================================== */
function normalizePaymentsForReceipt(payments){
  // payments bisa dari PAYMENT_LINES (punya method) atau dari DB (payment_method)
  return (payments || []).map(p => {
    const label = p.label || p.payment_method || "-";
    const amount = Number(p.amount || 0);
    const low = String(label).toLowerCase();
    const method = p.method || (
  low.includes("kas") ||
  low.includes("cash") ||
  low.includes("tunai")
    ? "cash"
    : "noncash"
);

    return { label, amount, method };
  });
}

function generateReceiptData(orderNo, items, payments, header, opts = {}){
	  // ===== SKIP POPUP STRUK kalau WA mode (khusus dari pembayaran) =====
 

  const paperClass = RECEIPT_PAPER === "80" ? "receipt-80" : "receipt-58";
const custNameRaw  = header?.customer_name || "";
const custPhoneRaw = header?.shipping_phone || "";

// customer line
const customerLine = custNameRaw
  ? `<div>Customer: ${custNameRaw}</div>`
  : `<div>Customer: UMUM</div>`;

// phone line (muncul hanya kalau ada)
const phoneLine = custPhoneRaw
  ? `<div>Telp: ${custPhoneRaw}</div>`
  : ``;

const cashierName =
  header?.cashier_name ||
  CASHIER_NAME ||
  "Kasir";

  const itemsHtml = (items || []).map(i => {
    const name = i.name || i.description || "-";
    const qty = Number(i.qty || i.qty_in_base || 0);
    const price = Number(i.price || 0);
    return `
      <div style="margin-bottom:2px;">
        <div class="r-left">${RECEIPT_PAPER==="80" ? `<strong>${name}</strong>` : name}</div>
        <div class="r-cols">
          <div class="r-qty">x${qty}</div>
          <div class="r-unit">@${formatRupiah(price)}</div>
          <div class="r-sub">${formatRupiah(qty * price)}</div>
        </div>
      </div>
    `;
  }).join("");
const chk = document.getElementById("chkSendWaReceipt");
const isWaMode = chk ? chk.checked : false;

// ✅ kalau dari REPRINT / force print → abaikan WA mode
const forcePrint = !!(opts && (opts.fromReprint || opts.forcePrint));

if (isWaMode && !forcePrint) {
  console.log("[RECEIPT_UI] skip popup because WA mode");
  return;
}


  const payNorm = normalizePaymentsForReceipt(payments);
  const paymentHtml = payNorm.map(p => `
    <div class="r-row">
      <div class="r-left">${p.label}</div>
      <div class="r-right">${formatRupiah(p.amount)}</div>
    </div>
  `).join("");

  const total = Number(header?.grand_total ?? 0) || (items || []).reduce((s,i)=>s+Number(i.price||0)*Number(i.qty||i.qty_in_base||0),0);
  const paid = payNorm.reduce((s,p)=>s + p.amount, 0);

const cashPaid = payNorm
  .filter(p => p.method === "cash")
  .reduce((s,p)=>s + p.amount, 0);

const nonCashPaid = payNorm
  .filter(p => p.method !== "cash")
  .reduce((s,p)=>s + p.amount, 0);

// kembalian = uang tunai - sisa yang harus dibayar setelah non-cash
const remainingAfterNonCash = Math.max(0, total - nonCashPaid);
const change = Math.max(0, cashPaid - remainingAfterNonCash);


  const tanggal = header?.transaction_date ? formatDateID(header.transaction_date) : new Date().toLocaleString("id-ID");

    const html = `
    <div class="receipt ${paperClass}">
      <div class="r-center" style="font-size:11px;font-weight:700;">${STORE_NAME}</div>
      <div class="r-center">${STORE_SUB}</div>

      <div class="r-sep"></div>

      <div>No: ${orderNo}</div>
<div>${tanggal}</div>
${customerLine}
${phoneLine}
<div>Kasir: ${cashierName}</div>


      <div class="r-sep"></div>


      ${itemsHtml}

      <div class="r-sep"></div>

      <div class="r-row" style="font-size:11px;">
        <strong class="r-left">TOTAL</strong>
        <strong class="r-right">${formatRupiah(total)}</strong>
      </div>

      <div class="r-sep"></div>

      ${paymentHtml}

      ${change > 0 ? `
        <div class="r-row">
          <div class="r-left">Kembalian</div>
          <div class="r-right">${formatRupiah(change)}</div>
        </div>
      ` : ""}

     <div class="r-sep"></div>

${(STORE_NOTE_1 || "").trim() ? `<div class="r-center" style="font-size:9px;">${STORE_NOTE_1}</div>` : ""}
${(STORE_NOTE_2 || "").trim() ? `<div class="r-center" style="font-size:9px;">${STORE_NOTE_2}</div>` : ""}

</div>


  `;

  document.getElementById("receiptContent").innerHTML = html;
  document.getElementById("receiptModal").style.display = "flex";

 setTimeout(() => { window.print(); }, 300);


}

/* CLOSE STRUK */
document.getElementById("receiptModal").onclick = () => {
  document.getElementById("receiptModal").style.display = "none";
};
window.addEventListener("afterprint", () => {
  const m = document.getElementById("receiptModal");
  if (m) m.style.display = "none";
});

function printHtmlByIframe(html){
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.setAttribute("aria-hidden", "true");

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  // tunggu benar-benar siap
  iframe.onload = () => {
    try{
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }catch(e){
      console.warn("printHtmlByIframe gagal:", e);
    }finally{
      setTimeout(()=> iframe.remove(), 1200);
    }
  };
}


function txnSetToday(){
  const fromEl = document.getElementById("txnDateFrom");
  const toEl   = document.getElementById("txnDateTo");
  if(!fromEl || !toEl) return;

  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  fromEl.value = todayStr;
  toEl.value   = todayStr;

  fromEl.dispatchEvent(new Event("change", { bubbles:true }));
}

function txnSetYesterday(){
  const fromEl = document.getElementById("txnDateFrom");
  const toEl   = document.getElementById("txnDateTo");
  if(!fromEl || !toEl) return;

  const d = new Date();
  d.setDate(d.getDate() - 1);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  const yStr = `${yyyy}-${mm}-${dd}`;

  fromEl.value = yStr;
  toEl.value   = yStr;

  fromEl.dispatchEvent(new Event("change", { bubbles:true }));
}

let TXN_FILTER_BOUND = false;

function initTxnFilterUI(){
  const fromEl   = document.getElementById("txnDateFrom");
  const toEl     = document.getElementById("txnDateTo");
  const filterEl = document.getElementById("txnCashierFilter");
  const payEl    = document.getElementById("txnPayFilter");

  if(!fromEl || !toEl || !filterEl) return;


  // default: hari ini
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth()+1).padStart(2,"0");
  const dd = String(today.getDate()).padStart(2,"0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  if (!fromEl.value) fromEl.value = todayStr;
  if (!toEl.value)   toEl.value   = todayStr;

  // default: kasir aktif saja (ingat pilihan)
const saved = localStorage.getItem("txn_cashier_filter"); // "ALL" | "ACTIVE"
filterEl.value = saved || "ACTIVE";
if (!saved) localStorage.setItem("txn_cashier_filter", filterEl.value);
// default: metode pembayaran (ingat pilihan)
const savedPay = localStorage.getItem("txn_pay_filter"); // "ALL" | "Cash" | "QRIS" | ...
if (payEl) {
  payEl.value = savedPay || "ALL";
  if (!savedPay) localStorage.setItem("txn_pay_filter", payEl.value);
}



 if(!TXN_FILTER_BOUND){
  TXN_FILTER_BOUND = true;

  fromEl.addEventListener("change", () => loadTransactions(true));
  toEl.addEventListener("change", () => loadTransactions(true));

  filterEl.addEventListener("change", () => {
    localStorage.setItem("txn_cashier_filter", filterEl.value);
    loadTransactions(true);
  });

  if (payEl) {
    payEl.addEventListener("change", () => {
      localStorage.setItem("txn_pay_filter", payEl.value);
      loadTransactions(true);
    });
  }
}
}

/* =====================================================
   TRANSAKSI: LIST + DETAIL + REPRINT + REORDER
===================================================== */
async function syncOfflineOrdersToServer(){
  const key = "pos_offline_orders_v1";
  const list = JSON.parse(localStorage.getItem(key) || "[]");

  if (!list.length) return;

  const supabaseOK = await canReachSupabase();
  if (!supabaseOK) return;

  console.log("🔄 Sync OFFLINE orders:", list.length);

  const remaining = [];

  for (const off of list){
    try{
      // 1️⃣ generate nomor server
      const salesorderNo = await generateSalesOrderNo();

      // 2️⃣ simpan HEADER
      const headerPayload = {
        salesorder_no: salesorderNo,
        cashier_id: off.cashier_id || "OFFLINE",
        cashier_name: off.cashier_name || "OFFLINE",
        contact_id: off.customer?.contact_id ?? -1,
        customer_name: off.customer?.contact_name || "Pelanggan Umum",
        shipping_phone: normalizePhoneTo62(off.customer?.phone || "") || null,
        transaction_date: off.created_at,
        sub_total: off.total,
        grand_total: off.total,
        payment_method: off.payments.map(p => p.label).join(", "),
        location_id: -1,
        store_id: -100,
        is_paid: true,
        jubelio_synced: false
      };

      const { error: hErr } = await sb
        .from("pos_sales_orders")
        .insert([headerPayload]);

      if (hErr) throw hErr;

      // 3️⃣ ITEMS
      const itemsPayload = off.cart.map(i => ({
        salesorder_no: salesorderNo,
        item_id: i.itemId,
        item_code: i.code,
        description: i.name,
        qty_in_base: i.qty,
        price: i.price,
        amount: i.qty * i.price,
        location_id: -1
      }));

      const { error: iErr } = await sb
        .from("pos_sales_order_items")
        .insert(itemsPayload);

      if (iErr) throw iErr;

      // 4️⃣ PAYMENTS
      const payPayload = off.payments.map(p => ({
        salesorder_no: salesorderNo,
        payment_method: p.label,
        amount: p.amount
      }));

      const { error: pErr } = await sb
        .from("pos_sales_order_payments")
        .insert(payPayload);

      if (pErr) throw pErr;

      console.log("✅ OFFLINE synced:", off.local_order_no, "→", salesorderNo);

    }catch(err){
      console.error("❌ Gagal sync offline:", off.local_order_no, err);
      remaining.push(off); // simpan yg gagal
    }
  }

  localStorage.setItem(key, JSON.stringify(remaining));
}

function loadOfflineTransactions(){
  try{
    return JSON.parse(localStorage.getItem("pos_offline_orders_v1") || "[]") || [];
  }catch{
    return [];
  }
}

// ==============================
// ==============================
function resetTransactionUI(){
  // reset state
  TXN_PAGE = 1;
  TXN_SELECTED = null;

  // reset list transaksi
  if (txnList) {
    txnList.innerHTML = `<div style="padding:12px;color:#999;">
      Tidak ada transaksi.
    </div>`;
  }

  // reset detail transaksi
  if (txnDetailTitle) txnDetailTitle.textContent = "Pilih transaksi";
  if (txnDetailSub) txnDetailSub.textContent = "Klik salah satu transaksi di kiri";
  if (txnDetailBody) txnDetailBody.innerHTML = `<div style="color:#999;">Belum ada data.</div>`;
  if (txnDetailActions) txnDetailActions.style.display = "none";
  if (txnDetailBadge) txnDetailBadge.innerHTML = "";
}

function txnPrevPage(){
  if (TXN_PAGE <= 1) return;
  TXN_PAGE--;
  loadTransactions(false);
}

function txnNextPage(){
  TXN_PAGE++;
  loadTransactions(false);
}


// ==========================
// OFFLINE MODE → LOCAL ONLY
// ==========================
async function loadTransactions(resetPage){
// ===== FILTER TANGGAL TRANSAKSI =====
const fromVal = document.getElementById("txnDateFrom")?.value || "";
const toVal   = document.getElementById("txnDateTo")?.value || "";

let startISO = null;
let endISO   = null;

if (fromVal && toVal) {
  const start = new Date(fromVal + "T00:00:00");
  const end   = new Date(toVal   + "T23:59:59");
  startISO = start.toISOString();
  endISO   = end.toISOString();
  
}
// ===== FILTER KASIR TRANSAKSI =====
const cashierFilter =
  document.getElementById("txnCashierFilter")?.value
  || localStorage.getItem("txn_cashier_filter")
  || "ACTIVE";
const payFilter =
  document.getElementById("txnPayFilter")?.value
  || localStorage.getItem("txn_pay_filter")
  || "ALL";

const activeCashierId =
  CASHIER_ID || localStorage.getItem("pos_cashier_id") || null;
  if (resetPage) TXN_PAGE = 1;
  // ✅ kalau terlihat online tapi server nggak bisa dijangkau → anggap OFFLINE
  const supabaseOK = await canReachSupabase();
  if (!supabaseOK) {
    const kw = ((txnSearchInput?.value || "").trim()).toLowerCase();

    let list = loadOfflineTransactions()
      .filter(x => !CASHIER_ID || x.cashier_id === CASHIER_ID);

    if (kw) {
      list = list.filter(x => {
        const no = String(x.local_order_no || "").toLowerCase();
        const nm = String(x.customer?.contact_name || "UMUM").toLowerCase();
        const ph = String(x.customer?.phone || "").toLowerCase();
        return no.includes(kw) || nm.includes(kw) || ph.includes(kw);
      });
    }

    list.sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));
    renderOfflineTransactionList(list);
    return;
  }

  // ==========================
  // OFFLINE MODE → LOCAL ONLY
  // ==========================
  if (!isOnline()) {
    const kw = ((txnSearchInput?.value || "").trim()).toLowerCase();

   let list = loadOfflineTransactions()
  .filter(x => {
    // filter tanggal
    if (startISO && endISO) {
      const t = new Date(x.created_at || 0).getTime();
      if (
        t < new Date(startISO).getTime() ||
        t > new Date(endISO).getTime()
      ) return false;
    }

    // filter kasir
    if (cashierFilter === "ACTIVE" && activeCashierId) {
      if (x.cashier_id !== activeCashierId) return false;
    }

    // ✅ filter metode pembayaran (OFFLINE)
    if (!txnPayFilterMatchOffline(x.payments, payFilter)) return false;

    return true; // ALL kasir
  });




    if (kw) {
      list = list.filter(x => {
        const no = String(x.local_order_no || "").toLowerCase();
        const nm = String(x.customer?.contact_name || "UMUM").toLowerCase();
        const ph = String(x.customer?.phone || "").toLowerCase();
        return no.includes(kw) || nm.includes(kw) || ph.includes(kw);
      });
    }

    list.sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));
    renderOfflineTransactionList(list);
    return;
  }

 // ==========================
// ONLINE MODE → SUPABASE
// ==========================
const keyword = (txnSearchInput?.value || "").trim();
const from = (TXN_PAGE-1) * TXN_PAGE_SIZE;
const to = from + TXN_PAGE_SIZE - 1;


let q = sb
  .from("pos_sales_orders")
  .select("salesorder_no,transaction_date,customer_name,shipping_phone,grand_total,is_paid,payment_method,status", { count:"exact" })

  .order("transaction_date", { ascending:false });


	// filter tanggal (from - to)
if (startISO && endISO) {
  q = q.gte("transaction_date", startISO)
       .lte("transaction_date", endISO);
}
// filter kasir
if (cashierFilter === "ACTIVE" && activeCashierId) {
  q = q.eq("cashier_id", activeCashierId);
}
// ✅ filter metode pembayaran (ONLINE)
const like = txnPayFilterToIlike(payFilter);

if (like) {
  if (Array.isArray(like)) {
    // Cash: kas OR tunai
    q = q.or(`payment_method.ilike.${like[0]},payment_method.ilike.${like[1]}`);
  } else {
    q = q.ilike("payment_method", like);
  }
}


  // search
  if (keyword) {
    q = q.or(
      `salesorder_no.ilike.%${keyword}%,customer_name.ilike.%${keyword}%,shipping_phone.ilike.%${keyword}%`
    );
  }

  const { data, count, error } = await q.range(from, to);


  if (error) {
    console.error("❌ loadTransactions error", error);
    txnList.innerHTML = `<div style="padding:12px;color:#e53935;">Gagal load transaksi.</div>`;
    return;
  }

  renderTransactionList(data || []);
  updateTxnCount(count || (data || []).length);

}

function renderOfflineTransactionList(list){
updateTxnCount(list.length);

  if(!list.length){
    txnList.innerHTML = `<div style="padding:12px;color:#999;">
      Tidak ada transaksi OFFLINE.
    </div>`;
    return;
  }

  txnList.innerHTML = list.map(x => `
    <div class="txn-item one-line" onclick="selectOfflineTransaction('${x.local_order_no}')">
      <div class="txn-col order">
        ${x.local_order_no}
      </div>

      <div class="txn-col datetime">
        ${formatDateID(x.created_at)}
      </div>

      <div class="txn-col customer">
        ${x.customer?.contact_name || "UMUM"}
      </div>

      <div class="txn-col total">
        ${formatRupiah(x.total)}
      </div>

      <div class="txn-col status">
        <span class="badge unpaid">OFFLINE</span>
      </div>
    </div>
  `).join("");

  txnDetailTitle.textContent = "Transaksi Offline";
  txnDetailSub.textContent = "Belum tersinkron ke server";
  txnDetailBody.innerHTML = `
    <div style="color:#777;">
      Transaksi ini dibuat saat OFFLINE.<br>
      Akan disinkronkan otomatis saat online.
    </div>
  `;
  txnDetailActions.style.display = "none";
}

function renderTransactionList(list){
  if(!list.length){
    txnList.innerHTML = `<div style="padding:12px;color:#999;">Tidak ada transaksi.</div>`;
    txnDetailTitle.textContent = "Pilih transaksi";
    txnDetailSub.textContent = "Klik salah satu transaksi di kiri";
    txnDetailBody.innerHTML = `<div style="color:#999;">Belum ada data.</div>`;
    txnDetailActions.style.display = "none";
    txnDetailBadge.innerHTML = "";
    TXN_SELECTED = null;
    return;
  }

  txnList.innerHTML = list.map(x => {
  const paid = x.is_paid === true;
 const canceled =
  String(x.status || "").toLowerCase() === "canceled" ||
  isCanceledOrder(x.salesorder_no);



const badge = canceled
  ? `<span class="badge unpaid">Dibatalkan</span>`
  : (paid
      ? `<span class="badge paid">Lunas</span>`
      : `<span class="badge unpaid">Belum</span>`
    );


  return `
    <div class="txn-item one-line"
         id="txn-${x.salesorder_no}"
         onclick="selectTransaction('${x.salesorder_no}')">

      <div class="txn-col order">
        ${x.salesorder_no}
      </div>

      <div class="txn-col datetime">
        ${formatDateID(x.transaction_date)}
      </div>

      <div class="txn-col customer">
        ${x.customer_name || "UMUM"}
      </div>

      <div class="txn-col total">
        ${formatRupiah(x.grand_total)}
      </div>

      <div class="txn-col status">
        ${badge}
      </div>

    </div>
  `;
}).join("");

}
function selectOfflineTransaction(localNo){
  const list = loadOfflineTransactions();
  const t = list.find(x => x.local_order_no === localNo);
  if (!t) return;

  // highlight
  document.querySelectorAll(".txn-item").forEach(el => el.classList.remove("active"));

  txnDetailTitle.textContent = t.local_order_no;
  txnDetailSub.textContent = "Transaksi OFFLINE";
  txnDetailBadge.innerHTML = `<span class="badge unpaid">OFFLINE</span>`;

  const itemRows = (t.cart || []).map(i => `
    <div class="row">
      <div class="name">
        <div style="font-weight:700">${i.name}</div>
        <div style="font-size:11px;color:#777">${i.code}</div>
      </div>
      <div class="meta">x${i.qty}</div>
      <div class="meta">${formatRupiah(i.qty * i.price)}</div>
    </div>
  `).join("");

  const payRows = (t.payments || []).map(p => `
    <div class="row">
      <div class="name">${p.label}</div>
      <div class="meta">${formatRupiah(p.amount)}</div>
    </div>
  `).join("");

  txnDetailBody.innerHTML = `
    <div class="txn-section-title">Item</div>
    <div class="txn-items">${itemRows}</div>

    <div class="txn-totalbox">
      <div>Total</div>
      <div>${formatRupiah(t.total)}</div>
    </div>

    <div class="txn-section-title">Pembayaran</div>
    <div class="txn-items">${payRows}</div>
  `;

  txnDetailActions.style.display = "flex";
  txnDetailActions.innerHTML = `
  <button class="btn-outline" onclick="txnReprintOffline('${t.local_order_no}')">🖨️ Cetak Ulang</button>

  <button class="btn-outline" onclick="txnResendWaOffline('${t.local_order_no}')">📩 Kirim Ulang WA</button>
`;

}
function txnReprintOffline(localNo){
  const list = loadOfflineTransactions();
  const t = list.find(x => x.local_order_no === localNo);
  if (!t) return;

  generateReceiptData(
    t.local_order_no,
    t.cart,
    t.payments,
    {
      customer_name: t.customer?.contact_name || "UMUM",
      cashier_name: t.cashier_name,
      transaction_date: t.created_at,
      grand_total: t.total
    },
    // ✅ FIX: force print walau WA mode ON
    { fromReprint: true, forcePrint: true }
  );
}

function txnResendWaOffline(localNo){
  const list = loadOfflineTransactions(); // atau loadOfflineTransactions() sesuai yg kamu pakai
  const t = list.find(x => x.local_order_no === localNo);
  if(!t) return;

  // ambil target WA: prioritas customer.phone, kalau kosong pakai last input
  const memberPhone = normalizeWaPhone(t.customer?.phone || "");
  const lastPhone = normalizeWaPhone(localStorage.getItem("pos_last_wa_phone") || "");
  const finalWaPhone = memberPhone || lastPhone;

  if(!finalWaPhone){
    alert("No WhatsApp tidak ada.\nIsi dulu nomor WA di transaksi baru (guest) supaya tersimpan.");
    return;
  }

  // bentuk receiptData sederhana
  const receiptData = {
    receipt_no: t.local_order_no,
    date_str: t.created_at ? new Date(t.created_at).toLocaleString("id-ID") : new Date().toLocaleString("id-ID"),
    cashier_name: t.cashier_name || "",
    customer_name: t.customer?.contact_name || "Pelanggan Umum",
    items: (t.cart || []).map(it => ({
      name: it.name || it.product_name || it.product || it.sku || "Item",
      qty: it.qty ?? it.quantity ?? 1,
      price: it.price ?? it.unit_price ?? 0,
      subtotal: (it.subtotal != null) ? it.subtotal : ((it.qty ?? it.quantity ?? 1) * (it.price ?? it.unit_price ?? 0))
    })),
    total: Number(t.total || 0),
    paid: null,
    change: null
  };

  try{
    const text = buildWaReceiptText(receiptData);
    openWhatsAppWithText(finalWaPhone, text);
  }catch(e){
    console.error("[WA_RESEND_OFFLINE] failed:", e);
    alert("Gagal bikin text WA. Cek console.");
  }
}

async function selectTransaction(orderNo){
  document.querySelectorAll(".txn-item").forEach(el => el.classList.remove("active"));
  const el = document.getElementById(`txn-${orderNo}`);
  if (el) el.classList.add("active");

  txnDetailTitle.textContent = orderNo;
  txnDetailSub.textContent = "Memuat detail...";
  txnDetailBody.innerHTML = `<div style="color:#999;">Loading...</div>`;
  txnDetailActions.style.display = "none";
  txnDetailBadge.innerHTML = "";

  // header
  const { data: header, error: e1 } = await sb
    .from("pos_sales_orders")
    .select("*")
    .eq("salesorder_no", orderNo)
    .single();

  if (e1 || !header) {
    console.error("❌ load header", e1);
    txnDetailSub.textContent = "Gagal memuat header.";
    txnDetailBody.innerHTML = `<div style="color:#e53935;">Gagal memuat data.</div>`;
    return;
  }

  // items
  const { data: items, error: e2 } = await sb
    .from("pos_sales_order_items")
    .select("item_id,item_code,description,qty_in_base,price,amount")
    .eq("salesorder_no", orderNo)
    .order("description", { ascending:true });

  if (e2) console.error("❌ load items", e2);

  // payments
  const { data: pays, error: e3 } = await sb
    .from("pos_sales_order_payments")
    .select("payment_method,amount")
    .eq("salesorder_no", orderNo);

  if (e3) console.error("❌ load payments", e3);

  TXN_SELECTED = {
    salesorder_no: orderNo,
    header,
    items: items || [],
    payments: pays || []
  };

  renderTransactionDetail(TXN_SELECTED);
}

function renderTransactionDetail(txn){
  const h = txn.header || {};
  const paid = Number(h.is_paid) === 1;

  txnDetailSub.textContent = `${formatDateID(h.transaction_date)} • ${h.customer_name || "UMUM"}`;
  const canceled = String(h.status || "").toLowerCase() === "canceled";

txnDetailBadge.innerHTML = canceled
  ? `<span class="badge unpaid">Dibatalkan</span>`
  : (paid
      ? `<span class="badge paid">Lunas</span>`
      : `<span class="badge unpaid">Belum Lunas</span>`
    );


  const phone = h.shipping_phone || "-";
  const total = Number(h.grand_total || 0);

  const itemRows = (txn.items || []).map(i => {
    const qty = Number(i.qty_in_base || 0);
    const price = Number(i.price || 0);
    return `
      <div class="row">
        <div class="name">
          <div style="font-weight:700;">${i.description || "-"}</div>
          <div style="font-size:11px;color:#777;">${i.item_code || ""}</div>
        </div>
        <div class="meta">x${qty}</div>
        <div class="meta">${formatRupiah(qty * price)}</div>
      </div>
    `;
  }).join("");

  const payRows = (txn.payments || []).map(p => `
    <div class="row">
      <div class="name">${p.payment_method || "-"}</div>
      <div class="meta">${formatRupiah(p.amount)}</div>
    </div>
  `).join("");

  txnDetailBody.innerHTML = `
    <div class="txn-kv">
      <div class="key">Customer</div><div>${h.customer_name || "UMUM"}</div>
      <div class="key">Telepon</div><div>${phone}</div>
      <div class="key">Tanggal</div><div>${formatDateID(h.transaction_date)}</div>
      <div class="key">No Order</div><div style="font-weight:800;">${txn.salesorder_no}</div>
    </div>

    <div class="txn-section-title">Item</div>
    <div class="txn-items">
      ${itemRows || `<div class="row"><div class="name" style="color:#999;">Tidak ada item</div></div>`}
    </div>

    <div class="txn-totalbox">
      <div>Total</div>
      <div>${formatRupiah(total)}</div>
    </div>

    <div class="txn-section-title">Pembayaran</div>
    <div class="txn-items">
      ${payRows || `<div class="row"><div class="name" style="color:#999;">Tidak ada pembayaran</div></div>`}
    </div>
  `;

  txnDetailActions.style.display = "flex";
}
// ==============================
// ✅ CANCEL TRANSACTION (TAHAP 1: UI TEST ONLY)
// ==============================
// ==============================
// ✅ CANCEL TRANSACTION (FINAL)
// - insert log ke pos_canceled_orders
// - update status di pos_sales_orders
// ==============================
async function txnCancelTransaction(){
  if(!TXN_SELECTED || !TXN_SELECTED.salesorder_no){
    alert("Pilih transaksi dulu.");
    return;
  }

  const orderNo = TXN_SELECTED.salesorder_no;

  // ✅ kalau sudah tercatat canceled, jangan ulang
  if(typeof isCanceledOrder === "function" && isCanceledOrder(orderNo)){
    alert("Transaksi ini sudah dibatalkan.");
    return;
  }

  // ✅ KONFIRMASI: user wajib ketik ulang nomor pesanan
  const typed = prompt(
    "Konfirmasi pembatalan transaksi\n\nKetik NOMOR PESANAN ini persis untuk lanjut:\n" + orderNo,
    ""
  );

  if(typed === null) return; // user batal
  if(String(typed).trim() !== orderNo){
    alert("Nomor pesanan tidak cocok. Pembatalan dibatalkan.");
    return;
  }

  // (optional) konfirmasi ekstra
  if(!confirm("Yakin batalkan transaksi ini?\n\n" + orderNo)) return;
// ✅ WAJIB: isi alasan pembatalan
const reasonInput = prompt(
  "Wajib isi alasan pembatalan sebelum transaksi dibatalkan.\n\nNo Pesanan: " + orderNo + "\n\nTulis alasan singkat:",
  ""
);
if (reasonInput === null) return; // user batal
const cancelReason = String(reasonInput || "").trim();
if (!cancelReason) {
  alert("Alasan pembatalan wajib diisi. Pembatalan dibatalkan.");
  return;
}


  const btnCancel = document.querySelector("#btn-cancel-transaction");
  const badgeStatus = document.querySelector("#txn-status-badge");

  const prevText = btnCancel ? btnCancel.textContent : "";
  let cancelSuccess = false;

  try{
    if(btnCancel){
      btnCancel.disabled = true;
      btnCancel.textContent = "Membatalkan...";
    }

    if(badgeStatus) badgeStatus.textContent = "Membatalkan...";

    const supabaseOK = await canReachSupabase();
    if(!isOnline() || !supabaseOK){
      throw new Error("Offline / Supabase tidak bisa diakses.");
    }

    // ✅ NOTE: jangan pakai variabel 'note' yang belum didefinisikan
    const cancelNote = cancelReason; // note = alasan murni
    const canceledAtISO = new Date().toISOString();
    const canceledBy = (typeof getCurrentCashierEmail === "function"
      ? getCurrentCashierEmail()
      : (TXN_SELECTED.cashier_id || null)
    );

    // =========================
    // A) UPDATE HEADER (WAJIB)
    // =========================
    let { error: eUp } = await sb
      .from("pos_sales_orders")
.update({ status: "canceled" })
.eq("salesorder_no", orderNo);


    // ✅ fallback kalau schema cache PostgREST belum kenal kolom canceled_*
    if(eUp && String(eUp.message || "").includes("schema cache")){
      console.warn("⚠️ schema cache belum update, fallback update status saja:", eUp);
      const fb = await sb
        .from("pos_sales_orders")
        .update({ status: "canceled" })
        .eq("salesorder_no", orderNo);
      eUp = fb.error;
    }

    if(eUp){
      throw eUp;
    }

    // =========================
    // B) LOG CANCEL (BEST EFFORT)
    // =========================
    try{
      // kalau tabel punya unique index salesorder_no, ini aman
      const up = await sb
        .from("pos_canceled_orders")
        .upsert(
          [{
            salesorder_no: orderNo,
            created_by: canceledBy,
            note: cancelNote
          }],
          { onConflict: "salesorder_no" }
        );

      if(up.error){
        // kalau upsert gagal karena tidak ada unique constraint, coba insert biasa
        console.warn("⚠️ upsert cancel log gagal, coba insert biasa:", up.error);
        const ins = await sb
          .from("pos_canceled_orders")
          .insert([{ salesorder_no: orderNo, created_by: canceledBy, note: cancelNote }]);
        if(ins.error){
          console.warn("⚠️ insert cancel log gagal (diabaikan):", ins.error);
        }
      }
    } catch(logErr){
      console.warn("⚠️ cancel log error (diabaikan):", logErr);
    }

    // =========================
    // C) UPDATE CACHE + UI
    // =========================
    try{
      if(typeof canceledOrdersSet !== "undefined" && canceledOrdersSet && canceledOrdersSet.add){
        canceledOrdersSet.add(orderNo);
      }
    } catch(_) {}

    // update state lokal biar UI konsisten tanpa refresh pun
    try{
  if(TXN_SELECTED){
    TXN_SELECTED.status = "canceled";
    // NOTE: kolom canceled_at / canceled_by tidak ada di pos_sales_orders (Supabase)
    // jadi jangan simpan ke TXN_SELECTED biar tidak bikin state palsu.
  }
} catch(_) {}


    if(badgeStatus) badgeStatus.textContent = "Dibatalkan";
    if(btnCancel){
      btnCancel.textContent = "Dibatalkan";
      btnCancel.disabled = true;
    }

    cancelSuccess = true;

    // =========================
    // D) REFRESH LIST/DETAIL (TIDAK BOLEH BIKIN ALERT GAGAL)
    // =========================
    try{
      await loadTransactions(false);
      if(typeof renderTransactionDetail === "function"){
        renderTransactionDetail(TXN_SELECTED);
      }
    } catch(refreshErr){
      console.warn("⚠️ Cancel sukses tapi refresh UI gagal:", refreshErr);
    }

    alert("✅ Berhasil membatalkan transaksi: " + orderNo);

  } catch(err){
    console.error("❌ Cancel error:", err);

    if(badgeStatus) badgeStatus.textContent = "Gagal batal";
    if(btnCancel){
      btnCancel.disabled = false;           // biar bisa coba lagi
      btnCancel.textContent = prevText || "Batalkan";
    }

    alert("Gagal membatalkan transaksi.\n\n" + (err?.message || err));
  } finally{
    // kalau sukses, tombol sudah disabled + teks "Dibatalkan"
    if(!cancelSuccess && btnCancel && btnCancel.textContent === "Membatalkan..."){
      btnCancel.textContent = prevText || "Batalkan";
      btnCancel.disabled = false;
    }
  }
}


function txnReprint(){
  if (!TXN_SELECTED) return;
  const t = TXN_SELECTED;
  const items = (t.items || []).map(i => ({
    code: i.item_code,
    name: i.description,
    qty: i.qty_in_base,
    price: i.price
  }));

  // ✅ FIX: force print walau WA mode ON
  generateReceiptData(t.salesorder_no, items, t.payments, t.header, {
    fromReprint: true,
    forcePrint: true
  });
}

// alias supaya tombol HTML lama tetap jalan
function txnReprintReceipt(){
  return txnReprint();
}

// Kirim ulang struk via WhatsApp untuk transaksi ONLINE (yang sedang dibuka di detail)
function txnResendWaReceipt(){
  if(!TXN_SELECTED || !TXN_SELECTED.header){
    alert("Pilih transaksi dulu.");
    return;
  }
  try{
    openTxnReceiptToWA(
      TXN_SELECTED.header,
      TXN_SELECTED.items || [],
      TXN_SELECTED.payments || [],
      false
    );
  }catch(e){
    console.error("[WA_RESEND] failed:", e);
    alert("Gagal menyiapkan struk WA. Cek console.");
  }
}

async function txnReorder(){
  if (!TXN_SELECTED) return;

  const h = TXN_SELECTED.header || {};
  const items = TXN_SELECTED.items || [];

  // set customer (kalau contact_id ada)
  ACTIVE_CUSTOMER = null;
  if (h.contact_id) {
    const found = CUSTOMER_LIST.find(c => String(c.contact_id) === String(h.contact_id));
    if (found) ACTIVE_CUSTOMER = found;
  }

  // isi input customer
  const input = document.getElementById("customerInput");
  if (input) {
    if (ACTIVE_CUSTOMER) {
      input.value = ACTIVE_CUSTOMER.contact_name + " (" + ACTIVE_CUSTOMER.category_display + ")";
    } else {
      input.value = (h.customer_name || "UMUM");
    }
  }

  // buat cart baru dari item lama
cart = items.map(i => ({
  itemId: i.item_id,
  itemCode: i.item_code,
  code: i.item_code,
  name: i.description,
  qty: Number(i.qty_in_base || 0),
  price: 0
}));


  // reset order no (biar transaksi baru)
  CURRENT_SALESORDER_NO = null;
  localStorage.removeItem("pos_salesorder_no");

  // hitung ulang harga by rules customer sekarang
  recalcCartPrices();

  // render + simpan
  renderCart();
  saveOrderState();
  updateOrderNumberUI();

  // balik ke penjualan
  switchLeftTab("sales");
  panelPayment.style.display = "none";
  panelProduct.style.display = "flex";
  btnNext.style.display = "block";
}
function applyProductViewMode(){
  const grid = document.getElementById("productGrid");
  const btn  = document.getElementById("btnShort");
  if(!grid || !btn) return;

  const isShort = PRODUCT_VIEW_MODE === "short";
  grid.classList.toggle("short", isShort);
  btn.classList.toggle("active", isShort);
}

function toggleProductShortMode(){
  PRODUCT_VIEW_MODE =
    (PRODUCT_VIEW_MODE === "short") ? "normal" : "short";

  localStorage.setItem(
    "setting_product_view",
    PRODUCT_VIEW_MODE
  );

  applyProductViewMode();
}
function applySortUI(){
  document.querySelectorAll(".sort-btn").forEach(btn => {
    btn.classList.toggle(
      "active",
      btn.dataset.sort === PRODUCT_SORT_MODE
    );
  });
}
function applyBestPeriodUI(){
  const box = document.getElementById("bestPeriodBox");
  if (!box) return;

  // tampil hanya saat mode "best"
  box.style.display = (PRODUCT_SORT_MODE === "best") ? "flex" : "none";

  // aktifkan tombol period yang sesuai
  box.querySelectorAll(".period-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.period === BEST_SELLER_PERIOD);
  });
}

function bindSortButtons(){
  const btns = document.querySelectorAll(".sort-btn");
  if (!btns.length) return;

  btns.forEach(btn => {
    btn.addEventListener("click", () => {

      // set active UI
      btns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // simpan mode
      PRODUCT_SORT_MODE = btn.dataset.sort;
      localStorage.setItem("product_sort_mode", PRODUCT_SORT_MODE);
applySortUI();
applyBestPeriodUI();

      // reset halaman & reload
      page = 1;
      loadProducts();
    });
  });
}
function bindBestPeriodButtons(){
  const box = document.getElementById("bestPeriodBox");
  if (!box) return;

  const btns = box.querySelectorAll(".period-btn");
  if (!btns.length) return;

  btns.forEach(btn => {
    btn.addEventListener("click", () => {
      // set aktif UI
      btns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // simpan period
      BEST_SELLER_PERIOD = btn.dataset.period || "90d";

      // (opsional) simpan ke localStorage biar inget
      localStorage.setItem("best_seller_period", BEST_SELLER_PERIOD);

      // reset halaman & reload
      page = 1;
      loadProducts();
    });
  });
}

/* =====================================================
   INIT
===================================================== */

(async () => {

  // 1️⃣ load kasir dulu
  loadCashier();
  updateCashierInfo();
  updateTxnHead();

  // 2️⃣ cek apakah perlu tampil welcome
  checkCashier();

  // 3️⃣ settings
  loadSettings();
  loadFilterSettings();
  bindSettingsEvents();
  const savedPeriod = localStorage.getItem("best_seller_period");
if (savedPeriod) BEST_SELLER_PERIOD = savedPeriod;

bindSortButtons();
applySortUI();

bindBestPeriodButtons();
applyBestPeriodUI();


    // ✅ SHORT MODE
  const btnShort = document.getElementById("btnShort");
  if (btnShort) {
    btnShort.addEventListener("click", toggleProductShortMode);
  }

  // apply saat load
  applyProductViewMode();
bindPriceTooltipEvents();

  updateSyncStatus(`Auto sync: tiap ${AUTO_SYNC_HOURS} jam`);
  initReportUI();
bindPaymentMethodButtons();
	
  // 4️⃣ master data
 await refreshOnlineStatus();

await loadPriceMap();
await loadPackingMap();
await loadCustomers();

if (isOnline()) {
  await syncAllProductsToCacheIfNeeded();
}
window.addEventListener("online",  ()=> { refreshOnlineStatus(); try{ flushHoldDeleteQueue(); syncLocalHoldsToOnline(); }catch(e){} });
window.addEventListener("offline", ()=> { ONLINE_OK = false; refreshOnlineStatus(); });

// optional tapi bagus:
setInterval(refreshOnlineStatus, 15000);




  // 5️⃣ restore transaksi
  loadOrderState();

  // ✅ TAMBAH INI
  recalcCartPrices();


  // 6️⃣ render UI
  syncFilterSettingsUI();
  page = 1;
  await loadProducts();
  renderCart();
  updateOrderNumberUI();
if (ACTIVE_CUSTOMER) {
    const input = document.getElementById("customerInput");
    if (input) {
      input.value = ACTIVE_CUSTOMER.contact_name + " (" + ACTIVE_CUSTOMER.category_display + ")";
    }
  }

  // 🔄 auto sync offline orders jika online
if (isOnline()) {
  syncOfflineOrdersToServer();
}

})();


// ==============================
// WELCOME SCREEN LOGIC
// ==============================
function selectCashier(id, name){
  localStorage.setItem("pos_cashier_id", id);
  localStorage.setItem("pos_cashier_name", name);

  CASHIER_ID = id;
  CASHIER_NAME = name;

  updateCashierInfo();
  updateTxnHead();

  // ✅ PENTING: bersihkan transaksi kasir sebelumnya
  resetTransactionUI();

  // ✅ kalau tab Trans sedang aktif, load transaksi kasir baru
  if (document.getElementById("tabTxn")?.classList.contains("active")) {
    loadTransactions(true);
  }

  document.getElementById("welcomeScreen").style.display = "none";
// ✅ tambah ini
	  // ⬇️ PAKSA TAMPILKAN POS
  panelProduct.style.display = "flex";
  panelPayment.style.display = "none";
  panelTransactions.style.display = "none";
  panelSettings.style.display = "none";

  if (cartPanel) cartPanel.style.display = "flex";

  setActiveTabBtn("sales");
  // ✅ paksa render produk setelah pilih kasir
  page = 1;
  loadProducts();


}



function checkCashier(){
  const id = localStorage.getItem("pos_cashier_id");

  if (!id) {
    document.getElementById("welcomeScreen").style.display = "flex";
    return;
  }

  // kalau sudah ada kasir → pastikan POS tampil
  document.getElementById("welcomeScreen").style.display = "none";

  panelProduct.style.display = "flex";
  if (cartPanel) cartPanel.style.display = "flex";

  setActiveTabBtn("sales");
    // ✅ paksa render produk (biar pas refresh/offline nggak kosong)
  page = 1;
  loadProducts();

}


function updateTxnHead(){
  const el = document.getElementById("txnListHead");
  if (!el) return;

  const name = CASHIER_NAME || localStorage.getItem("pos_cashier_name") || "";
  const id   = CASHIER_ID || localStorage.getItem("pos_cashier_id") || "";

  const titleEl = document.getElementById("txnHeadTitle");

  if (titleEl) {
    titleEl.textContent = (name && id)
      ? `Daftar Transaksi — ${name} (${id})`
      : "Daftar Transaksi";
  }
} // ✅ INI YANG KURANG


function updateCashierInfo(){
  const el = document.getElementById("cashierInfo");
  if (!el) return;

  const name = localStorage.getItem("pos_cashier_name");
  const id   = localStorage.getItem("pos_cashier_id");

  if (name && id) {
    el.textContent = `Kasir: ${name} (${id})`;
  } else {
    el.textContent = "";
  }
}
window.addEventListener("online", () => {
  console.log("🌐 Online kembali → sync offline orders");
  syncOfflineOrdersToServer();
});

/* =====================================================
   REPORT (LAPORAN SINGKAT)
===================================================== */

function reportSetToday(){
  const fromEl = document.getElementById("reportDateFrom");
  const toEl   = document.getElementById("reportDateTo");
  if(!fromEl || !toEl) return;

  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  fromEl.value = todayStr;
  toEl.value   = todayStr;

  // biar auto refresh jalan
  fromEl.dispatchEvent(new Event("change", { bubbles:true }));
}

function reportSetYesterday(){
  const fromEl = document.getElementById("reportDateFrom");
  const toEl   = document.getElementById("reportDateTo");
  if(!fromEl || !toEl) return;

  const d = new Date();
  d.setDate(d.getDate() - 1);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  const yStr = `${yyyy}-${mm}-${dd}`;

  fromEl.value = yStr;
  toEl.value   = yStr;

  // biar auto refresh jalan
  fromEl.dispatchEvent(new Event("change", { bubbles:true }));
}

function initReportUI(){
  const fromEl   = document.getElementById("reportDateFrom");
  const toEl     = document.getElementById("reportDateTo");
  const filterEl = document.getElementById("reportCashierFilter");

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth()+1).padStart(2,"0");
  const dd = String(today.getDate()).padStart(2,"0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  if (fromEl && !fromEl.value) fromEl.value = todayStr;
  if (toEl && !toEl.value)   toEl.value   = todayStr;

  if (filterEl) filterEl.value = "ACTIVE";

  if (!REPORT_UI_BOUND) {
    REPORT_UI_BOUND = true;

    fromEl?.addEventListener("change", () => loadReport(true));
    toEl?.addEventListener("change", () => loadReport(true));
    filterEl?.addEventListener("change", () => loadReport(true));
  }

  // VISI ABI: langsung hidup
  loadReport(true);
}

/* =====================================================
   PIUTANG MONITOR (VERSI 1 - LIST BELUM LUNAS)
===================================================== */
let PIUTANG_UI_BOUND = false;

function initPiutangUI(){
  if (PIUTANG_UI_BOUND) return;
  PIUTANG_UI_BOUND = true;

  // default: terlama
  if (piutangSort && !piutangSort.value) piutangSort.value = "oldest";

  // SORT: reload
  piutangSort?.addEventListener("change", () => {
    loadPiutangMonitor(true);
  });

  // REFRESH: reload
  btnPiutangRefresh?.addEventListener("click", () => {
    loadPiutangMonitor(true);
  });

  // SEARCH: debounce 250ms
  let _piutangSearchTimer = null;
  piutangSearch?.addEventListener("input", () => {
    clearTimeout(_piutangSearchTimer);
    _piutangSearchTimer = setTimeout(() => {
      loadPiutangMonitor(true);
    }, 250);
  });

  // ENTER biar langsung search (tanpa tunggu debounce)
  piutangSearch?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      clearTimeout(_piutangSearchTimer);
      loadPiutangMonitor(true);
    }
  });
}


function getPiutangSortOrder(){
  const v = String(piutangSort?.value || "oldest");
  if (v === "newest") return { by: "transaction_date", ascending: false };
  if (v === "largest") return { by: "grand_total", ascending: false };
  if (v === "smallest") return { by: "grand_total", ascending: true };
  // oldest
  return { by: "transaction_date", ascending: true };
}

async function loadPiutangMonitor(force){
  if (!piutangList) return;

  // OFFLINE: sementara tampil pesan (piutang monitor butuh data server)
  if (!isOnline()) {
    piutangList.innerHTML = `
      <div style="padding:16px;color:#999;">
        ⚠️ Piutang Monitor butuh koneksi internet (data dari server).
      </div>
    `;
    if (piutangCountInfo) piutangCountInfo.textContent = "Total: 0 piutang";
	if (piutangTotalInfo) piutangTotalInfo.textContent = "Total Piutang: Rp 0";

    return;
  }

  try {
    piutangList.innerHTML = `<div style="padding:12px;color:#999;">Memuat...</div>`;

    const ord = getPiutangSortOrder();

    // Versi 1 (AMAN): pakai kolom existing dulu
    // - is_paid = false
    // - payment_method mengandung "piutang"
    let q = sb
      .from("pos_sales_orders")
      .select("salesorder_no,transaction_date,customer_name,shipping_phone,grand_total,payment_method,is_paid")
      .eq("is_paid", false)
      .ilike("payment_method", "%piutang%")
      .order(ord.by, { ascending: ord.ascending })
      .limit(500);

    const { data, error } = await q;
    if (error) throw error;

   const rows = data || [];
CURRENT_PIUTANG_ROWS = rows;

// kalau tidak ada data piutang sama sekali
if (!rows.length) {
  if (piutangCountInfo) piutangCountInfo.textContent = `Total: 0 piutang`;
  if (piutangTotalInfo) piutangTotalInfo.textContent = "Total Piutang: Rp 0";

  piutangList.innerHTML = `
    <div style="padding:16px;color:#666;">
      ✅ Tidak ada piutang yang belum lunas.
    </div>
  `;
  return;
}

// ===== FILTER KEYWORD (nama / no / hp) =====
const kw = String(piutangSearch?.value || "").trim().toLowerCase();

let filteredRows = rows;
if (kw) {
  filteredRows = rows.filter(r => {
    const no = String(r.salesorder_no || "").toLowerCase();
    const nm = String(r.customer_name || "").toLowerCase();
    const ph = String(r.shipping_phone || "").toLowerCase();
    return no.includes(kw) || nm.includes(kw) || ph.includes(kw);
  });
}

// tampilkan count sesuai hasil filter
if (piutangCountInfo) piutangCountInfo.textContent = `Total: ${filteredRows.length} piutang`;

// kalau keyword ada tapi hasil kosong
if (kw && !filteredRows.length) {
  if (piutangTotalInfo) piutangTotalInfo.textContent = "Total Piutang: Rp 0";

  piutangList.innerHTML = `
    <div style="padding:16px;color:#666;">
      🔎 Tidak ada hasil untuk pencarian: <b>${kw}</b>
    </div>
  `;
  return;
}


    
    // Ambil total pembayaran per salesorder_no (untuk hitung sisa piutang)
    const orderNos = rows.map(r => r.salesorder_no).filter(Boolean);
    let paidMap = {};
    if (orderNos.length > 0){
      const { data: payRows, error: payErr } = await sb
        .from("pos_sales_order_payments")
        .select("salesorder_no, amount")
        .in("salesorder_no", orderNos);

      if (payErr){
        console.warn("⚠️ Gagal ambil payment piutang, fallback sisa=grand_total", payErr);
      } else {
        (payRows || []).forEach(p => {
          const k = p.salesorder_no;
          paidMap[k] = (paidMap[k] || 0) + Number(p.amount || 0);
        });
      }
    }

// tempel paid_total & outstanding_amount ke setiap row (WAJIB untuk UI)
rows.forEach(r => {
  const paid = Number(paidMap[r.salesorder_no] || 0);
  const total = Number(r.grand_total || 0);

  r.paid_total = paid;
  r.outstanding_amount = Math.max(0, total - paid);
});
// hitung total piutang (akumulasi Sisa) => pakai filteredRows
const totalPiutang = filteredRows.reduce((sum, r) => sum + Number(r.outstanding_amount || 0), 0);

// tampilkan di header
if (window.piutangTotalInfo) {
  window.piutangTotalInfo.textContent = `Total Piutang: ${formatRupiah(totalPiutang)}`;
} else if (piutangTotalInfo) {
  piutangTotalInfo.textContent = `Total Piutang: ${formatRupiah(totalPiutang)}`;
}

// dipakai oleh tombol 'Bayar/Cicil' => pakai filteredRows
window.PIUTANG_ROWS = filteredRows;

// render list => pakai filteredRows
piutangList.innerHTML = filteredRows.map((r,i) => {
      const no = r.salesorder_no || "-";
      const dt = r.transaction_date ? formatDateID(r.transaction_date) : "-";
      const cust = r.customer_name || "Pelanggan Umum";
      const phone = r.shipping_phone || "";
      const total = Number(r.grand_total || 0);
      const phoneHtml = phone ? `<div style="font-size:12px;color:#666;margin-top:2px;">${escapeHtml(phone)}</div>` : "";

      return `
        <div class="piutang-item">
          <div class="piutang-row">
            <div>
              <div class="piutang-no">${escapeHtml(no)}</div>
              <div class="piutang-dt">${escapeHtml(dt)}</div>
            </div>

            <div>
              <div class="piutang-cust">${escapeHtml(cust)}</div>
              ${phone ? `<div class="piutang-phone">${escapeHtml(phone)}</div>` : `<div class="piutang-phone">-</div>`}
            </div>

            <div class="piutang-amt">
              <div class="piutang-total">${formatRupiah(total)}</div>
              <div class="piutang-sisa">Sisa: <b>${formatRupiah(Number(r.outstanding_amount||0))}</b></div>
            </div>

            <div class="piutang-right">
              <span class="badge unpaid">${(Number(r.paid_total||0)>0 ? "CICIL" : "BELUM BAYAR")}</span>
              <div class="piutang-actions">
                <button class="btn-primary-sm" onclick="openPiutangModalByIdx(${i})">Bayar/Cicil</button>
                ${phone
  ? `<button class="btn-outline" type="button" onclick="remindPiutangWAByIdx(${i})">Ingatkan WA</button>`
  : `<button class="btn-outline" type="button" disabled>Ingatkan WA</button>`
}

              </div>
            </div>
          </div>
        </div>`;
    }).join("");

  } catch (err) {
    console.error("❌ loadPiutangMonitor error:", err);
    piutangList.innerHTML = `
      <div style="padding:16px;color:#c00;">
        Gagal memuat Piutang Monitor. Cek Console (F12).
      </div>
    `;
    if (piutangCountInfo) piutangCountInfo.textContent = "Total: 0 piutang";
	if (typeof piutangTotalInfo !== "undefined" && piutangTotalInfo) {
  piutangTotalInfo.textContent = "Total Piutang: Rp 0";
}

  }
}

// VISI ABI: Metode Pembayaran bukan card terpisah
const paymentCard = document.getElementById("reportPaymentCard");
if (paymentCard) paymentCard.style.display = "none";


function normPayKey(label){
  const t = String(label || "").toLowerCase();

  // CASH
  if (t === "kas" || t === "tunai" || t === "cash" || t.includes("kas") || t.includes("tunai")) return "Cash";

  // QRIS / E-WALLET
  if (t.includes("qris") || t.includes("gopay")) return "QRIS";

  // DEBIT
  if (t.includes("debit bca")) return "Debit BCA";
  if (t.includes("debit mandiri")) return "Debit Mandiri";

  // TRANSFER
  if (t.includes("transfer bca")) return "Transfer BCA";
  // PIUTANG
  if (t.includes("transfer mandiri")) return "Transfer Mandiri";
  if (t.includes("piutang")) return "Piutang";

  return "Lainnya";
}
function txnPayFilterMatchOffline(payments, selectedKey){
  if (!selectedKey || selectedKey === "ALL") return true;
  const list = payments || [];
  return list.some(p => normPayKey(p.label || p.payment_method) === selectedKey);
}

// untuk ONLINE: payment_method di header adalah gabungan label, contoh: "Kas, QRIS GoPay"
function txnPayFilterToIlike(selectedKey){
  const k = String(selectedKey || "").toLowerCase();
  if (!k || k === "all") return null;

  // pola yang paling aman sesuai label yang kamu simpan
  if (k === "cash") return ["%tunai%", "%kas%"];                 // "Kas"
  if (k === "qris") return "%qris%";               // "QRIS GoPay"
  if (k === "debit bca") return "%debit bca%";
  if (k === "debit mandiri") return "%debit mandiri%";
  if (k === "transfer bca") return "%transfer bca%";
  if (k === "transfer mandiri") return "%transfer mandiri%";
  if (k === "piutang") return "%piutang%";

  return `%${selectedKey}%`;
}

function makeSummaryCards({ trxCount, omzet, payMap }) {
  const box = document.getElementById("reportSummary");
  if (!box) return;

  const methods = [
    { key: "Cash", label: "Cash" },
    { key: "QRIS", label: "QRIS" },
    { key: "Debit BCA", label: "Debit BCA" },
    { key: "Debit Mandiri", label: "Debit Mandiri" },
    { key: "Transfer BCA", label: "Transfer BCA" },
    { key: "Transfer Mandiri", label: "Transfer Mandiri" },
	{ key: "Piutang", label: "Piutang" },

  ];

  // susun kartu
  const cards = [
    // Total Transaksi → ANGKA SAJA, TANPA Rp
    {
      title: "Total Transaksi",
      value: Number(trxCount || 0),
      type: "count",
      big: true
    },

    // Metode pembayaran → HANYA YANG > 0
    ...methods
      .map(m => ({
        title: m.label,
        value: Number(payMap?.[m.key] || 0),
        type: "money",
        big: false
      }))
      .filter(c => c.value > 0),

    // Total Omzet
    {
      title: "Total Omzet",
      value: Number(omzet || 0),
      type: "money",
      big: true
    }
  ];

  box.innerHTML = `
    <div class="rpt-cards">
      ${cards.map(c => `
        <div class="rpt-card rpt-card-small">
          <div class="rpt-card-title">${c.title}</div>
          <div class="rpt-card-value ${c.big ? "big" : ""}">
            ${
              c.type === "count"
                ? c.value
                : formatRupiah(c.value)
            }
          </div>
        </div>
      `).join("")}
    </div>
  `;
}




function renderByCashier(rows){
  const filterEl = document.getElementById("reportCashierFilter");
  const box = document.getElementById("reportByCashier");
  if(!box) return;

  if (filterEl && filterEl.value === "ACTIVE") {
    box.innerHTML = "";
    return;
  }

  const list = (rows || []).slice().sort((a,b)=> (b.omzet||0) - (a.omzet||0));

  if(!list.length){
    box.innerHTML = `<div style="color:#999;">Tidak ada data kasir.</div>`;
    return;
  }

  const fmt = v => v > 0 ? formatRupiah(v) : "";

  box.innerHTML = `
    <div class="rpt-table">
      <div class="rpt-row head">
        <div>Kasir</div>
        <div class="rpt-center">Transaksi</div>
        <div class="rpt-right">Cash</div>
        <div class="rpt-right">QRIS</div>
        <div class="rpt-right">Debit BCA</div>
        <div class="rpt-right">Debit Mandiri</div>
        <div class="rpt-right">Transfer BCA</div>
        <div class="rpt-right">Transfer Mandiri</div>
		<div class="rpt-right">Piutang</div>

        <div class="rpt-right">Total Omzet</div>
      </div>

      ${list.map(r => `
        <div class="rpt-row">
          <div>
            <b>${r.cashier_name}</b>
            <span class="rpt-muted"> (${r.cashier_id})</span>
          </div>

          <div class="rpt-center">${r.trxCount || 0}</div>

          <div class="rpt-right">${fmt(r.cash)}</div>
          <div class="rpt-right">${fmt(r.qris)}</div>
          <div class="rpt-right">${fmt(r.debit_bca)}</div>
          <div class="rpt-right">${fmt(r.debit_mandiri)}</div>
          <div class="rpt-right">${fmt(r.transfer_bca)}</div>
          <div class="rpt-right">${fmt(r.transfer_mandiri)}</div>
		  <div class="rpt-right">${fmt(r.piutang)}</div>


          <div class="rpt-right"><b>${formatRupiah(r.omzet || 0)}</b></div>
        </div>
      `).join("")}
    </div>
  `;
}

function computeAppliedPayment(total, payList){
  const lines = (payList || []).map(p => ({
    label: p.label || p.payment_method || "",
    amount: Number(p.amount || 0)
  }));

  const sumByKey = {};
  let sumNonCash = 0;
  let sumCash = 0;

  for (const x of lines){
    const k = normPayKey(x.label);
    sumByKey[k] = (sumByKey[k] || 0) + x.amount;

        if (k === "Cash") {
      sumCash += x.amount;
    } else if (k === "Piutang") {
      // ✅ piutang bukan pembayaran, jangan masuk sumNonCash
    } else {
      sumNonCash += x.amount;
    }

  }
  const remainingForCash = Math.max(0, Number(total || 0) - sumNonCash);
const cashApplied = Math.min(sumCash, remainingForCash);

// ✅ Piutang = sisa yang belum dibayar
const paidTotal = cashApplied + sumNonCash;
const piutangAmt = Math.max(0, Number(total || 0) - paidTotal);

/* ===== AUDIT WARNING (DEV) ===== */
const checkSum = paidTotal + piutangAmt;
const t = Number(total || 0);
if (Math.abs(checkSum - t) > 0.5) {
  console.warn("[AUDIT] mismatch computeAppliedPayment", {
    total: t,
    sumCash,
    sumNonCash,
    cashApplied,
    paidTotal,
    piutangAmt,
    checkSum,
    payList
  });
}
/* ============================== */

// hasil final yang “benar” untuk laporan
return {
  applied: {
    ...sumByKey,
    Cash: cashApplied,
    Piutang: piutangAmt
  }
};

  }
async function loadReport(forceRefresh){
  console.log("LOAD REPORT DIPANGGIL");

  const info = document.getElementById("reportInfo");
  const filterEl = document.getElementById("reportCashierFilter");

  try {
    const from = document.getElementById("reportDateFrom")?.value || "";
    const to   = document.getElementById("reportDateTo")?.value || "";

    if(!from || !to){
      if (info) info.textContent = "Pilih tanggal dulu.";
      return;
    }

    // range local -> ISO (UTC) untuk query timestamp
    const start = new Date(from + "T00:00:00");
    const end   = new Date(to   + "T23:59:59");
    const startISO = start.toISOString();
    const endISO   = end.toISOString();

    // load canceled set (best-effort)
    try {
      await fetchCanceledOrdersByISO(startISO, endISO);
    } catch (e) {
      console.warn("fetchCanceledOrdersByISO gagal (diabaikan):", e);
    }

    const filterMode = filterEl?.value || "ALL";

    // tampil/sembunyi rincian kasir
    const cashierCard = document.getElementById("reportByCashierCard");
    const cashierBox  = document.getElementById("reportByCashier");
    if (filterMode === "ALL") {
      if (cashierCard) cashierCard.style.display = "";
    } else {
      if (cashierCard) cashierCard.style.display = "none";
      if (cashierBox) cashierBox.innerHTML = "";
    }

    let cashierFilterId = null;
    if(filterMode === "ACTIVE"){
      cashierFilterId = CASHIER_ID || localStorage.getItem("pos_cashier_id") || null;
    }

    // ====== AGGREGATOR ======
    let trxCount = 0;
    let omzet = 0;
    const payMap = {};
    const byCashier = {};

    function bumpCashier(cashier_id, cashier_name, add){
      const id = cashier_id || "UNKNOWN";

      if (!byCashier[id]) {
        byCashier[id] = {
          cashier_id: id,
          cashier_name: cashier_name || "UNKNOWN",
          trxCount: 0,
          omzet: 0,
          cash: 0,
          qris: 0,
          debit_bca: 0,
          debit_mandiri: 0,
          transfer_bca: 0,
          transfer_mandiri: 0,
          piutang: 0
        };
      }

      const x = byCashier[id];
      x.trxCount += (add.trxCount || 0);
      x.omzet += (add.omzet || 0);
      x.cash += (add.cash || 0);
      x.qris += (add.qris || 0);
      x.debit_bca += (add.debit_bca || 0);
      x.debit_mandiri += (add.debit_mandiri || 0);
      x.transfer_bca += (add.transfer_bca || 0);
      x.transfer_mandiri += (add.transfer_mandiri || 0);
      x.piutang += (add.piutang || 0);
    }

    // ======================
    // A) OFFLINE (localStorage)
    // ======================
    const offlineList = loadOfflineTransactions();
    const offlineOnDate = (offlineList || []).filter(o => {
      const t = new Date(o.created_at || 0).getTime();
      const inRange = t >= new Date(startISO).getTime() && t <= new Date(endISO).getTime();
      const matchCashier = cashierFilterId ? (o.cashier_id === cashierFilterId) : true;
      return inRange && matchCashier;
    });

    for(const o of offlineOnDate){
      trxCount += 1;
      omzet += Number(o.total || 0);

      const appliedObj = computeAppliedPayment(o.total, o.payments).applied;

      Object.entries(appliedObj).forEach(([k, amt]) => {
        payMap[k] = (payMap[k] || 0) + Number(amt || 0);
      });

      bumpCashier(o.cashier_id, o.cashier_name, {
        trxCount: 1,
        omzet: Number(o.total || 0),
        cash: Number(appliedObj["Cash"] || 0),
        qris: Number(appliedObj["QRIS"] || 0),
        debit_bca: Number(appliedObj["Debit BCA"] || 0),
        debit_mandiri: Number(appliedObj["Debit Mandiri"] || 0),
        transfer_bca: Number(appliedObj["Transfer BCA"] || 0),
        transfer_mandiri: Number(appliedObj["Transfer Mandiri"] || 0),
        piutang: Number(appliedObj["Piutang"] || 0)
      });
    }


    // ======================
    // B) ONLINE (Supabase)
    // ======================
    const supabaseOK = await canReachSupabase();
    if(isOnline() && supabaseOK){

      let q = sb
        .from("pos_sales_orders")
        .select("salesorder_no,grand_total,cashier_id,cashier_name,transaction_date,status")
        .gte("transaction_date", startISO)
        .lte("transaction_date", endISO)
        .order("transaction_date", { ascending:false });

      if(cashierFilterId){
        q = q.eq("cashier_id", cashierFilterId);
      }

      const { data: orders, error: e1 } = await q;
      if(e1){
        console.error("❌ Report load orders error:", e1);
      } else {
        // buang canceled (3 lapis)
        const activeOrders = (orders || []).filter(o =>
          !o.canceled_at &&
          String(o.status || "").toLowerCase() !== "canceled" &&
          !isCanceledOrder(o.salesorder_no)
        );

        trxCount += activeOrders.length;
        omzet += activeOrders.reduce((s,o)=> s + Number(o.grand_total || 0), 0);

        const orderNos = activeOrders.map(o => o.salesorder_no);

        // ambil payments sekaligus
        let pays = [];
        if(orderNos.length){
          const resPay = await sb
            .from("pos_sales_order_payments")
            .select("salesorder_no,payment_method,amount")
            .in("salesorder_no", orderNos);

          if(resPay.error){
            console.error("❌ Report load payments error:", resPay.error);
          } else {
            pays = resPay.data || [];
          }
        }

        // group payments per order
        const payByOrder = {};
        (pays || []).forEach(p => {
          const no = p.salesorder_no;
          if(!payByOrder[no]) payByOrder[no] = [];
          payByOrder[no].push(p);
        });

        // apply payment logic per order (cash applied, piutang tidak dihitung bayar)
        for(const o of activeOrders){
          const plist = payByOrder[o.salesorder_no] || [];
          const appliedObj = computeAppliedPayment(o.grand_total, plist).applied;

          Object.entries(appliedObj).forEach(([k, amt]) => {
            payMap[k] = (payMap[k] || 0) + Number(amt || 0);
          });

          bumpCashier(o.cashier_id, o.cashier_name, {
            trxCount: 1,
            omzet: Number(o.grand_total || 0),
            cash: Number(appliedObj["Cash"] || 0),
            qris: Number(appliedObj["QRIS"] || 0),
            debit_bca: Number(appliedObj["Debit BCA"] || 0),
            debit_mandiri: Number(appliedObj["Debit Mandiri"] || 0),
            transfer_bca: Number(appliedObj["Transfer BCA"] || 0),
            transfer_mandiri: Number(appliedObj["Transfer Mandiri"] || 0),
            piutang: Number(appliedObj["Piutang"] || 0)
          });
        }
      }
    }

    // ======================
    // C) RENDER UI (WAJIB DI AKHIR)
    // ======================
    makeSummaryCards({ trxCount, omzet, payMap });

    // render by cashier hanya kalau filter ALL
    if ((filterEl?.value || "ALL") === "ALL") {
      renderByCashier(Object.values(byCashier));
    } else {
      // kalau ACTIVE, biar gak ada sisa tabel
      const box = document.getElementById("reportByCashier");
      if (box) box.innerHTML = "";
    }

    if (info) {
      const who = cashierFilterId ? `Kasir: ${CASHIER_NAME || ""} (${cashierFilterId})` : "Semua Kasir";
      info.textContent = `${from} s/d ${to} • ${who}`;
    }

  } catch (err) {
    console.error("❌ loadReport error:", err);
    if (info) info.textContent = "Gagal memuat laporan. Cek Console (F12).";

    // tetap render kosong biar user lihat “0”
    makeSummaryCards({ trxCount: 0, omzet: 0, payMap: {} });

    const box = document.getElementById("reportByCashier");
    if (box) box.innerHTML = "";
  }
}


  
  // ✅ Cashier buttons akan dirender dari Supabase (lihat loadAndRenderCashiers)

const tabSales = document.getElementById("tabSales");
  if (tabSales) tabSales.setAttribute("onclick", "switchLeftTab(\'sales\')");
  const tabTxn = document.getElementById("tabTxn");
  if (tabTxn) tabTxn.setAttribute("onclick", "switchLeftTab(\'txn\')");
  const tabSet = document.getElementById("tabSet");
  if (tabSet) tabSet.setAttribute("onclick", "switchLeftTab(\'set\')");
  const tabPrice = document.getElementById("tabPrice");
  if (tabPrice) tabPrice.setAttribute("onclick", "openPriceCheck()");
  const tabReport = document.getElementById("tabReport");
  if (tabReport) tabReport.setAttribute("onclick", "switchLeftTab(\'report\')");

  const tabPiutang = document.getElementById("tabPiutang");
  if (tabPiutang) tabPiutang.setAttribute("onclick", "switchLeftTab(\'piutang\')");

  const logoutBtn = document.querySelector(".logout-btn");
  if (logoutBtn) logoutBtn.setAttribute("onclick", "logout()");

  const quickCashButtons = document.querySelectorAll("#quickCash .btn");
  const quickCashHandlers = [
    "setCash(calcTotal())",
    "setCash(50000)",
    "setCash(100000)"
  ];
  quickCashButtons.forEach((btn, idx) => {
    const handler = quickCashHandlers[idx];
    if (handler) btn.setAttribute("onclick", handler);
  });
	
  if (btnFinishPayment) btnFinishPayment.setAttribute("onclick", "processPayment()");

  const txnFilterButtons = document.querySelectorAll("#panel-transactions .txn-filter .btn-outline");
  if (txnFilterButtons[0]) txnFilterButtons[0].setAttribute("onclick", "txnSetToday()");
  if (txnFilterButtons[1]) txnFilterButtons[1].setAttribute("onclick", "txnSetYesterday()");

  const txnSearchButtons = document.querySelectorAll("#panel-transactions .txn-toolbar button.btn");
  txnSearchButtons.forEach(btn => btn.setAttribute("onclick", "loadTransactions(true)"));

  const txnPagingButtons = document.querySelectorAll("#panel-transactions .txn-list button.btn");
  if (txnPagingButtons[0]) txnPagingButtons[0].setAttribute("onclick", "txnPrevPage()");
  if (txnPagingButtons[1]) txnPagingButtons[1].setAttribute("onclick", "txnNextPage()");

const txnActions = document.querySelectorAll("#txnDetailActions button");
if (txnActions[0]) txnActions[0].setAttribute("onclick", "txnReprint()");
if (txnActions[1]) txnActions[1].setAttribute("onclick", "txnCancelTransaction()");
if (txnActions[2]) txnActions[2].setAttribute("onclick", "txnReorder()");



  const manualSyncButton = document.querySelector("#panel-settings .btn-primary");
  if (manualSyncButton) manualSyncButton.setAttribute("onclick", "manualSyncProducts()");

  const reportFilterButtons = document.querySelectorAll("#panel-report .btn-outline");
  if (reportFilterButtons[0]) reportFilterButtons[0].setAttribute("onclick", "reportSetToday()");
  if (reportFilterButtons[1]) reportFilterButtons[1].setAttribute("onclick", "reportSetYesterday()");

  const holdButtons = document.querySelectorAll(".cart-header .btn-outline");
  if (holdButtons[0]) holdButtons[0].setAttribute("onclick", "openHoldModal()");
  if (holdButtons[1]) holdButtons[1].setAttribute("onclick", "parkCurrentOrder()");

  const cartReset = document.querySelector(".cart-reset");
  if (cartReset) cartReset.setAttribute("onclick", "resetCart()");

  const backToEditBtn = document.querySelector(".cart-panel .btn-back");
  if (backToEditBtn) backToEditBtn.setAttribute("onclick", "backToEdit()");

  if (btnNext) btnNext.setAttribute("onclick", "goToPayment()");

  const holdToolbarButtons = document.querySelectorAll("#holdModal .btn-outline");
if (holdToolbarButtons[0]) holdToolbarButtons[0].setAttribute("onclick", "refreshHoldList()");
if (holdToolbarButtons[1]) holdToolbarButtons[1].setAttribute("onclick", "closeHoldModal()");

// ===== BOOT =====
document.addEventListener("DOMContentLoaded", () => {
  removeSwitchCashierUI();
  loadAndRenderCashiers();

  // === WA RECEIPT CHECKBOX LISTENER (TAHAP 1) ===
  const chkSendWaReceipt = document.getElementById("chkSendWaReceipt");

  if (chkSendWaReceipt) {
    const savedWa = localStorage.getItem("pos_send_wa_receipt");
    if (savedWa !== null) chkSendWaReceipt.checked = (savedWa === "1");

    chkSendWaReceipt.addEventListener("change", function () {
      console.log("[WA_CHECKBOX] changed ->", chkSendWaReceipt.checked);
      localStorage.setItem("pos_send_wa_receipt", chkSendWaReceipt.checked ? "1" : "0");
      refreshWaPhoneUI();
    });

    // opsional tapi bagus: sekali refresh saat awal
    refreshWaPhoneUI();
  } else {
    console.warn("[WA_CHECKBOX] element not found");
  }

  // === PIUTANG MODAL INIT ===
  setupPiutangModalUI();
});
// ===============================
// DRAFT CART (SEBELUM BAYAR)
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnDraftCart");
  if(btn){
    btn.addEventListener("click", openDraftModal);
  }

  const btnClose = document.getElementById("btnDraftClose");
  if(btnClose) btnClose.addEventListener("click", closeDraftModal);

  const btnCopy = document.getElementById("btnDraftCopy");
  if(btnCopy) btnCopy.addEventListener("click", copyDraftText);

  const btnPrint = document.getElementById("btnDraftPrint");
  if(btnPrint) btnPrint.addEventListener("click", printDraft);
});
function openDraftModal(){
  // kalau keranjang kosong
  if(!Array.isArray(cart) || cart.length === 0){
    alert("Keranjang masih kosong.");
    return;
  }

  const modal = document.getElementById("draftModal");
  const content = document.getElementById("draftContent");
  if(!modal || !content) return;

  content.innerHTML = buildDraftHTML();
  modal.style.display = "flex";
}

function closeDraftModal(){
  const modal = document.getElementById("draftModal");
  if(modal) modal.style.display = "none";
}

function buildDraftHTML(){
  // Ambil info cashier kalau ada
  const cashierText = (document.getElementById("cashierInfo")?.textContent || "").trim();

  // Header
  let html = `
    <div style="text-align:center; font-weight:900; font-size:14px;">TASAJI FOOD</div>
    <div style="text-align:center; font-size:12px; margin-top:2px;">DRAFT (BELUM DIBAYAR)</div>
    <div style="text-align:center; font-size:11px; color:#666; margin-top:6px;">${escapeHtml(cashierText)}</div>
    <div style="text-align:center; font-size:11px; color:#666; margin-top:4px;">Pelanggan: ${escapeHtml(getActiveCustomerLabel())}</div>
    <div style="border-top:1px dashed #bbb; margin:10px 0;"></div>
  `;

  // Lines
  html += `<div style="font-size:12px;">`;
  cart.forEach(it => {
    const name = escapeHtml(it.name || "-");
    const qty = Number(it.qty || 0);
    const price = Number(it.price || 0);
    const lineTotal = qty * price;

    html += `
      <div style="display:flex; justify-content:space-between; gap:10px;">
        <div style="flex:1; font-weight:700;">${name}</div>
        <div style="white-space:nowrap;">${formatRupiah(lineTotal)}</div>
      </div>
      <div style="display:flex; justify-content:space-between; gap:10px; color:#666; margin-bottom:8px;">
        <div style="flex:1;">${qty} x ${formatRupiah(price)}</div>
        <div style="white-space:nowrap;">${escapeHtml(it.code || "")}</div>
      </div>
    `;
  });
  html += `</div>`;

  // Total
  const total = cart.reduce((a, it) => a + (Number(it.qty||0) * Number(it.price||0)), 0);
  const itemCount = cart.reduce((a, it) => a + Number(it.qty||0), 0);

  html += `
    <div style="border-top:1px dashed #bbb; margin:10px 0;"></div>
    <div style="display:flex; justify-content:space-between; font-size:12px;">
      <div>Total Item</div>
      <div><b>${itemCount}</b></div>
    </div>
    <div style="display:flex; justify-content:space-between; font-size:14px; margin-top:6px;">
      <div><b>TOTAL</b></div>
      <div><b>${formatRupiah(total)}</b></div>
    </div>

    <div style="margin-top:10px; font-size:11px; color:#666; text-align:center;">
      Draft ini hanya untuk konfirmasi (belum tersimpan & belum dibayar)
    </div>
  `;

  return html;
}

function copyDraftText(){
  if(!Array.isArray(cart) || cart.length === 0){
    alert("Keranjang kosong.");
    return;
  }

  const text = buildDraftText();
  navigator.clipboard.writeText(text).then(() => {
    alert("Draft berhasil di-copy. Tinggal paste ke WhatsApp.");
  }).catch(() => {
    alert("Gagal copy. Coba manual screenshot/print.");
  });
}

function buildDraftText(){
  const cashierText = (document.getElementById("cashierInfo")?.textContent || "").trim();
  const lines = [];
  lines.push("TASAJI FOOD");
  lines.push("DRAFT (BELUM DIBAYAR)");
  if(cashierText) lines.push(cashierText);
  lines.push(`Pelanggan: ${getActiveCustomerLabel()}`);
  lines.push("------------------------------");

  cart.forEach(it => {
    const name = it.name || "-";
    const code = it.code || "";
    const qty = Number(it.qty || 0);
    const price = Number(it.price || 0);
    const lineTotal = qty * price;
    lines.push(`${name}`);
    lines.push(`  ${qty} x ${formatRupiah(price)} = ${formatRupiah(lineTotal)}  (${code})`);
  });

  const total = cart.reduce((a, it) => a + (Number(it.qty||0) * Number(it.price||0)), 0);
  const itemCount = cart.reduce((a, it) => a + Number(it.qty||0), 0);

  lines.push("------------------------------");
  lines.push(`Total Item: ${itemCount}`);
  lines.push(`TOTAL: ${formatRupiah(total)}`);
  lines.push("");
  lines.push("Catatan: Draft ini hanya untuk konfirmasi (belum tersimpan & belum dibayar).");

  return lines.join("\n");
}

function printDraft(){
  const html = buildDraftHTML();
  const w = window.open("", "_blank");
  if(!w) {
    alert("Pop-up terblokir. Izinkan pop-up untuk print.");
    return;
  }

  w.document.open();
  w.document.write(`
    <html>
      <head>
        <title>Draft</title>
        <meta charset="utf-8" />
        <style>
          body{ font-family: monospace; padding: 12px; }
        </style>
      </head>
      <body>
        ${html}
        <script>
          window.onload = function(){
            window.print();
          };
        <\/script>
      </body>
    </html>
  `);
  w.document.close();
}

// util kecil
function escapeHtml(s){
  return String(s || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}


function getActiveCustomerLabel(){
  // Format untuk Draft & Picking List:
  // - Kalau tidak ada pelanggan aktif => "UMUM"
  // - Kalau ada => "Nama (Kategori) • 08xxxx" (phone opsional)
  const name = (ACTIVE_CUSTOMER?.contact_name != null) ? String(ACTIVE_CUSTOMER.contact_name).trim() : "";
  const cat  = (ACTIVE_CUSTOMER?.category_display != null) ? String(ACTIVE_CUSTOMER.category_display).trim() : "";
  const phone = (ACTIVE_CUSTOMER?.phone != null) ? String(ACTIVE_CUSTOMER.phone).trim() : "";

  if(!name) return "UMUM";

  let out = name;
  if(cat) out += ` (${cat})`;
  if(phone) out += ` • ${phone}`;
  return out;
}

  const btnGudang = document.getElementById("btnGudangList");
  if(btnGudang){
    btnGudang.addEventListener("click", openGudangModal);
  }

  const btnGudangClose = document.getElementById("btnGudangClose");
  if(btnGudangClose) btnGudangClose.addEventListener("click", closeGudangModal);

  const btnGudangCopy = document.getElementById("btnGudangCopy");
  if(btnGudangCopy) btnGudangCopy.addEventListener("click", copyGudangText);

  const btnGudangPrint = document.getElementById("btnGudangPrint");
  if(btnGudangPrint) btnGudangPrint.addEventListener("click", printGudang);
function openGudangModal(){
  if(!Array.isArray(cart) || cart.length === 0){
    alert("Keranjang masih kosong.");
    return;
  }

  const modal = document.getElementById("gudangModal");
  const content = document.getElementById("gudangContent");
  if(!modal || !content) return;

  content.innerHTML = buildGudangHTML();
  modal.style.display = "flex";
}

function closeGudangModal(){
  const modal = document.getElementById("gudangModal");
  if(modal) modal.style.display = "none";
}

function buildGudangHTML(){
  const cashierText = (document.getElementById("cashierInfo")?.textContent || "").trim();

  // Header
  let html = `
    <div style="text-align:center; font-weight:900; font-size:14px;">TASAJI FOOD</div>
    <div style="text-align:center; font-size:12px; margin-top:2px;">PICKING LIST (INTERNAL)</div>
    <div style="text-align:center; font-size:11px; color:#666; margin-top:6px;">${escapeHtml(cashierText)}</div>
	<div style="text-align:center; font-size:11px; color:#666; margin-top:4px;">
  Pelanggan: ${escapeHtml(getActiveCustomerLabel())}
</div>

    <div style="border-top:1px dashed #bbb; margin:10px 0;"></div>
  `;

  // Lines (tanpa harga)
  html += `<div style="font-size:12px;">`;
  cart.forEach(it => {
    const name = escapeHtml(it.name || "-");
    const code = escapeHtml(it.code || "");
    const qty = Number(it.qty || 0);

    html += `
      <div style="display:flex; justify-content:space-between; gap:10px; margin-bottom:8px;">
        <div style="flex:1; font-weight:700;">${name}</div>
        <div style="white-space:nowrap; font-weight:900;">x${qty}</div>
      </div>
      <div style="margin-top:-6px; margin-bottom:10px; color:#666; font-size:11px;">
        ${code}
      </div>
    `;
  });
  html += `</div>`;

  // Footer info
  const itemCount = cart.reduce((a, it) => a + Number(it.qty||0), 0);

  html += `
    <div style="border-top:1px dashed #bbb; margin:10px 0;"></div>
    <div style="display:flex; justify-content:space-between; font-size:12px;">
      <div>Total Qty</div>
      <div><b>${itemCount}</b></div>
    </div>

    <div style="margin-top:10px; font-size:11px; color:#666; text-align:center;">
      Catatan: Ini hanya picking list untuk persiapan barang (tanpa harga).
    </div>
  `;

  return html;
}

function buildGudangText(){
  const cashierText = (document.getElementById("cashierInfo")?.textContent || "").trim();
  const lines = [];
  lines.push("TASAJI FOOD");
  lines.push("PICKING LIST (INTERNAL)");
  if(cashierText) lines.push(cashierText);
  lines.push(`Pelanggan: ${getActiveCustomerLabel()}`);
  lines.push("------------------------------");

  cart.forEach(it => {
    const name = it.name || "-";
    const code = it.code || "";
    const qty = Number(it.qty || 0);
    lines.push(`x${qty}  ${name}  (${code})`);
  });

  const itemCount = cart.reduce((a, it) => a + Number(it.qty||0), 0);
  lines.push("------------------------------");
  lines.push(`Total Qty: ${itemCount}`);
  lines.push("Catatan: Picking list untuk persiapan barang (tanpa harga).");

  return lines.join("\n");
}

function copyGudangText(){
  if(!Array.isArray(cart) || cart.length === 0){
    alert("Keranjang kosong.");
    return;
  }

  const text = buildGudangText();
  navigator.clipboard.writeText(text).then(() => {
    alert("List Gudang berhasil di-copy.");
  }).catch(() => {
    alert("Gagal copy. Coba print / screenshot.");
  });
}
function normalizePhoneTo62(raw) {
  if (!raw) return "";
  let p = String(raw).replace(/[^\d]/g, ""); // buang spasi, +, -, dll
  if (!p) return "";

  // contoh: 0812xxxx -> 62812xxxx
  if (p.startsWith("0")) p = "62" + p.slice(1);

  // kalau sudah 62 biarkan
  if (p.startsWith("62")) return p;

  // kalau user masukin tanpa 0/62 (misal 812xxx), kita paksa 62
  if (p.startsWith("8")) return "62" + p;

  return p;
}

function formatRupiahPlain(num) {
  const n = Number(num || 0);
  return "Rp " + n.toLocaleString("id-ID");
}

function remindPiutangWAByIdx(i) {
  try {
    const r = (window.PIUTANG_ROWS || CURRENT_PIUTANG_ROWS || [])?.[i];
    if (!r) return alert("Data piutang tidak ditemukan.");

   const phone62 = normalizePhoneTo62(
  r.shipping_phone || r.customer_phone || r.phone || r.customer?.phone || ""
);

    if (!phone62) return alert("Nomor WA pelanggan kosong.");

    const orderNo = r.salesorder_no || "-";
    const cust = r.customer_name || r.customer || "Pelanggan";
    const sisa = Number(r.outstanding_amount || 0);

const msg = `Assalamu'alaikum Kak ${cust}.
Kami dari Tasaji.

Menginfokan untuk transaksi *${orderNo}* masih ada sisa tagihan sebesar *${formatRupiahPlain(sisa)}*.

Mohon dibantu pelunasannya ya Kak. Terima kasih.`;



    const url = `https://wa.me/${phone62}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  } catch (e) {
    console.error("remindPiutangWAByIdx error:", e);
    alert("Gagal membuka WhatsApp. Cek Console.");
  }
}

function printGudang(){
  const html = buildGudangHTML();
  const w = window.open("", "_blank");
  if(!w) {
    alert("Pop-up terblokir. Izinkan pop-up untuk print.");
    return;
  }

  w.document.open();
  w.document.write(`
    <html>
      <head>
        <title>List Gudang</title>
        <meta charset="utf-8" />
        <style>
          body{ font-family: monospace; padding: 12px; }
        </style>
      </head>
      <body>
        ${html}
        <script>
          window.onload = function(){ window.print(); };
        <\/script>
      </body>
    </html>
  `);
  w.document.close();
}
let CURRENT_PIUTANG_ORDER = null;


function setupPiutangModalUI(){
  const selMethod = document.getElementById("piutangMethod");
  const bankRow = document.getElementById("piutangBankRow");
  const bankSel = document.getElementById("piutangBankAccount");
  if (!selMethod || !bankRow || !bankSel) return;

 function fillAccounts(bankKey){
  bankSel.innerHTML = `<option value="">Pilih rekening</option>`;
  const list = BANK_ACCOUNTS?.[bankKey] || [];

  list.forEach(acc => {
    const label = `${acc.acc_no} — AN. ${acc.acc_name}`;
    const opt = document.createElement("option");
    opt.value = acc.id;
    opt.textContent = label;
    bankSel.appendChild(opt);
  });
}


  function onChange(){
    const v = String(selMethod.value || "");
    const be = document.getElementById("piutangBankError");
    if (be) be.classList.add("hidden");
    bankSel.value = "";

    if (v === "Transfer BCA"){
      fillAccounts("bca");
      bankRow.classList.remove("hidden");
    } else if (v === "Transfer Mandiri"){
      fillAccounts("mandiri");
      bankRow.classList.remove("hidden");
    } else {
      bankRow.classList.add("hidden");
    }
  }

  selMethod.addEventListener("change", onChange);
  onChange();
}

function openPiutangModal(order){
  CURRENT_PIUTANG_ORDER = order;

  // 🔒 hitung sisa piutang dengan fallback aman
  const sisa = Number(
    order.outstanding_amount ??
    order.grand_total ??
    0
  );

  // ⚠️ JANGAN pakai toLocaleString di input angka
  document.getElementById('piutangSisa').value = sisa;
  document.getElementById('piutangBayar').value = sisa;

  // reset metode & rekening
  const selMethod = document.getElementById('piutangMethod');
  const bankSel  = document.getElementById('piutangBankAccount');

  if (selMethod) selMethod.value = '';
  if (bankSel) {
    bankSel.innerHTML = '<option value="">Pilih rekening</option>';
    bankSel.value = '';
  }

  hidePiutangErrors();

  // setup ulang UI setelah reset
  setupPiutangModalUI();

  document.getElementById('piutangPayModal').classList.remove('hidden');
}



function showPiutangError(msg){
  const el = document.getElementById('piutangError');
  if (!el) return;
  el.textContent = msg || "Terjadi kesalahan.";
  el.classList.remove('hidden');
}

function hidePiutangErrors(){
  const e1 = document.getElementById('piutangError');
  const e2 = document.getElementById('piutangBankError');
  if (e1) e1.classList.add('hidden');
  if (e2) e2.classList.add('hidden');
}

/**
 * Bayar / Cicil Piutang:
 * - Insert 1 baris payment ke pos_sales_order_payments
 * - Jika total pembayaran >= grand_total -> pos_sales_orders.is_paid=true dan payment_method jadi metode final
 * - Jika belum lunas -> pos_sales_orders tetap is_paid=false dan payment_method tetap mengandung 'Piutang'
 */
async function submitPiutangPayment(){
  try{
    if (!CURRENT_PIUTANG_ORDER) return;

    hidePiutangErrors();

    const orderNo = CURRENT_PIUTANG_ORDER.salesorder_no;
    const grandTotal = Number(CURRENT_PIUTANG_ORDER.grand_total || 0);
  const sisa = Number(
  CURRENT_PIUTANG_ORDER.outstanding_amount ?? (grandTotal - Number(CURRENT_PIUTANG_ORDER.paid_total || 0)) ?? 0
);



    let bayar = Number(document.getElementById('piutangBayar')?.value || 0);
    const method = String(document.getElementById('piutangMethod')?.value || "").trim();

    if (!bayar || bayar <= 0){
      return showPiutangError("Nominal bayar harus lebih dari 0.");
    }
    if (bayar > sisa){
      return showPiutangError("Nominal melebihi sisa piutang.");
    }
    if (!method){
      return showPiutangError("Pilih metode pembayaran.");
    }

    // rekening (khusus transfer)
    let accountKey = "";
    let accountInfo = "";
    if (method === "Transfer BCA" || method === "Transfer Mandiri"){
  accountKey = String(document.getElementById('piutangBankAccount')?.value || "").trim();
  if (!accountKey){
    const be = document.getElementById('piutangBankError');
    if (be) be.classList.remove('hidden');
    return;
  }

  const bank = (method === "Transfer BCA") ? "bca" : "mandiri";
  const acc = (BANK_ACCOUNTS?.[bank] || []).find(a => a.id === accountKey);
  if (acc){
    accountInfo = ` | ${acc.acc_name} | ${acc.acc_no}`;
  }
}


    const paymentLabel = `${method}${accountKey ? ` | ${accountKey}` : ""}${accountInfo}`;


    // Insert payment row
    const { error: insErr } = await sb
      .from("pos_sales_order_payments")
      .insert([{
        salesorder_no: orderNo,
        payment_method: paymentLabel,
        amount: bayar
      }]);

    if (insErr){
      console.error("❌ Gagal simpan cicilan piutang", insErr);
      return showPiutangError("Gagal menyimpan pembayaran. Cek koneksi / Supabase.");
    }

    // Hitung total pembayaran untuk order ini
    const { data: payRows, error: payErr } = await sb
      .from("pos_sales_order_payments")
      .select("amount")
      .eq("salesorder_no", orderNo);

    if (payErr){
      console.error("❌ Gagal ambil riwayat payment", payErr);
      return showPiutangError("Pembayaran tersimpan, tapi gagal refresh data. Coba refresh halaman.");
    }

    const paidTotal = (payRows || []).reduce((s, r) => s + Number(r.amount || 0), 0);
    const isLunas = paidTotal >= grandTotal - 0.0001;
	
 // Update header order
if (isLunas){
  const { error: upErr } = await sb
    .from("pos_sales_orders")
    .update({
      is_paid: true,
      payment_method: paymentLabel
    })
    .eq("salesorder_no", orderNo);

  if (upErr){
    console.error("❌ Gagal update order lunas", upErr);
    showPiutangError("Pembayaran tersimpan, tapi gagal menandai lunas. Coba refresh lalu cek lagi.");
    return;
  }
} else {
  const { error: upErr2 } = await sb
    .from("pos_sales_orders")
    .update({
      is_paid: false,
      payment_method: "Piutang"
    })
    .eq("salesorder_no", orderNo);

  if (upErr2){
    console.error("❌ Gagal update order cicil", upErr2);
    showPiutangError("Pembayaran tersimpan, tapi gagal update status piutang. Coba refresh lalu cek lagi.");
    return;
  }
}

closePiutangModal();
await loadPiutangMonitor(true);


  } catch(err){
    console.error("❌ submitPiutangPayment error", err);
    showPiutangError("Terjadi error saat simpan pembayaran. Cek console (F12).");
  }
}

function closePiutangModal(){
  const modal = document.getElementById('piutangPayModal');
  if (modal) modal.classList.add('hidden');
  CURRENT_PIUTANG_ORDER = null;
}


window.PIUTANG_ROWS = [];

window.openPiutangModalByIdx = function(idx){
  const order = window.PIUTANG_ROWS[idx];
  if (!order) return alert("Data piutang tidak ditemukan.");
  openPiutangModal(order);
};

/* =========================
   ADMIN: CLEANUP CANCELED ORDERS
========================= */
function openCleanupCanceledModal(){
  const m = document.getElementById("cleanupCanceledModal");
  const box = document.getElementById("cleanupResultBox");
  if(box){
    box.style.display = "none";
    box.textContent = "";
  }
  if(m){
    m.classList.remove("hidden");
  }
}

function closeCleanupCanceledModal(){
  const m = document.getElementById("cleanupCanceledModal");
  if(m){
    m.classList.add("hidden");
  }
}

function normalizeOrderNoText(s){
  let x = String(s || "").trim();

  // ganti berbagai jenis dash unicode → hyphen biasa
  x = x.replace(/[‐-‒–—―]/g, "-");

  // hapus zero-width + bidi marks (LRM/RLM/LRE/RLE/PDF/LRO/RLO/FSI/LRI/RLI/PDI)
  x = x.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "");

  // uppercase
  x = x.toUpperCase();

  // 🔥 terakhir: buang semua karakter selain A-Z 0-9 dan "-"
  x = x.replace(/[^A-Z0-9\-]/g, "");

  return x;
}


function parseOrderNosFromTextarea(raw){
  const s = String(raw || "");
  const parts = s.split(/\n|,/g).map(x => normalizeOrderNoText(x)).filter(Boolean);

  const seen = new Set();
  const out = [];
  for(const p of parts){
    if(!seen.has(p)){
      seen.add(p);
      out.push(p);
    }
  }
  return out;
}


async function runCleanupCanceledOrders(){
  try{
    const pin = (document.getElementById("cleanupPinInput")?.value || "").trim();
    const raw = (document.getElementById("cleanupOrdersTextarea")?.value || "");
    const orderNos = parseOrderNosFromTextarea(raw);

    if(!pin) return alert("PIN Admin wajib diisi.");
    if(!orderNos.length) return alert("Daftar no pesanan masih kosong.");

    const box = document.getElementById("cleanupResultBox");
    if(box){
      box.style.display = "block";
      box.textContent = "Memproses...\nTotal: " + orderNos.length;
    }

if(typeof sb === "undefined" || !sb?.rpc){
  throw new Error("Supabase client belum siap (variabel `sb` tidak ditemukan).");
}

const { data, error } = await sb.rpc("pos_cleanup_canceled_orders", {
  p_salesorder_nos: orderNos,
  p_pin: pin
});


    if(error) throw error;

    let ok = 0, skip = 0;
    const lines = (data || []).map(r => {
      const st = r.status || "-";
      if(st === "DELETED") ok++;
      else skip++;
      return `${r.salesorder_no} | ${st} | ${r.note || ""}`;
    });

    if(box){
      box.textContent =
        "Selesai.\n" +
        "DELETED: " + ok + "\n" +
        "SKIP: " + skip + "\n\n" +
        lines.join("\n");
    }

  }catch(e){
    console.error("runCleanupCanceledOrders error:", e);
    const msg = (e?.message || String(e));

    const box = document.getElementById("cleanupResultBox");
    if(box){
      box.style.display = "block";
      box.textContent = "ERROR: " + msg;
    }else{
      alert("ERROR: " + msg);
    }
  }
}

/* =========================
   ADMIN: VIEW CANCELED LOG
========================= */
window.CANCELED_LOG_ROWS = [];

function openCanceledLogModal(){
  const m = document.getElementById("canceledLogModal");
  const box = document.getElementById("canceledLogBox");
  const info = document.getElementById("canceledLogInfo");
  const q = document.getElementById("canceledLogSearch");

  if(box) box.textContent = "";
  if(info) info.textContent = "";
  if(q) q.value = "";

  if(m) m.classList.remove("hidden");

  // bind filter sekali (filter client-side, tidak panggil supabase per ketik)
  const searchEl = document.getElementById("canceledLogSearch");
  if(searchEl && !searchEl.__bound){
    searchEl.__bound = true;
    searchEl.addEventListener("input", () => renderCanceledLogFromCache());
  }

  // auto-load sekali biar langsung muncul
  loadCanceledLog();
}

function closeCanceledLogModal(){
  const m = document.getElementById("canceledLogModal");
  if(m) m.classList.add("hidden");
}

async function loadCanceledLog(){
  try{
    if(typeof sb === "undefined" || !sb?.from){
      throw new Error("Supabase client belum siap (variabel `sb` tidak ditemukan).");
    }

    const limitEl = document.getElementById("canceledLogLimit");
    const box = document.getElementById("canceledLogBox");
    const info = document.getElementById("canceledLogInfo");

    const limit = Math.min(1000, Math.max(10, Number(limitEl?.value || 200)));

    if(box) box.textContent = "Memuat cancel log...";

    const { data, error } = await sb
      .from("pos_canceled_orders")
      .select("created_at, salesorder_no, created_by, note")
      .order("created_at", { ascending: false })
      .limit(limit);

    if(error) throw error;

    window.CANCELED_LOG_ROWS = Array.isArray(data) ? data : [];
    if(info) info.textContent = `Total loaded: ${window.CANCELED_LOG_ROWS.length}`;

    renderCanceledLogFromCache();
  }catch(e){
    console.error("loadCanceledLog error:", e);
    const box = document.getElementById("canceledLogBox");
    const info = document.getElementById("canceledLogInfo");
    if(info) info.textContent = "";
    if(box) box.textContent = "ERROR: " + (e?.message || String(e));
  }
}

function renderCanceledLogFromCache(){
  const searchEl = document.getElementById("canceledLogSearch");
  const box = document.getElementById("canceledLogBox");
  const info = document.getElementById("canceledLogInfo");

  const q = String(searchEl?.value || "").trim().toLowerCase();
  const rows = Array.isArray(window.CANCELED_LOG_ROWS) ? window.CANCELED_LOG_ROWS : [];

  const filtered = q
    ? rows.filter(r => {
        const a = String(r.salesorder_no || "").toLowerCase();
        const b = String(r.note || "").toLowerCase();
        const c = String(r.created_by || "").toLowerCase();
        return a.includes(q) || b.includes(q) || c.includes(q);
      })
    : rows;

  // Format output (rapi untuk audit + copy)
  const lines = filtered.map(r => {
    const dt = r.created_at ? String(r.created_at).replace("T"," ").replace("Z","") : "-";
    const no = r.salesorder_no || "-";
    const by = r.created_by || "-";
    const note = (r.note || "").trim();
    return `${dt} | ${no} | ${by} | ${note}`;
  });

  if(info){
    const total = rows.length;
    const show = filtered.length;
    info.textContent = `Total: ${total} log • Tampil: ${show}`;
  }
  if(box) box.textContent = lines.length ? lines.join("\n") : "(Tidak ada data)";
}

function copyCanceledLog(){
  const searchEl = document.getElementById("canceledLogSearch");
  const q = String(searchEl?.value || "").trim().toLowerCase();

  const rows = Array.isArray(window.CANCELED_LOG_ROWS) ? window.CANCELED_LOG_ROWS : [];
  const filtered = q
    ? rows.filter(r => {
        const a = String(r.salesorder_no || "").toLowerCase();
        const b = String(r.note || "").toLowerCase();
        const c = String(r.created_by || "").toLowerCase();
        return a.includes(q) || b.includes(q) || c.includes(q);
      })
    : rows;

  // ✅ ambil NO PESANAN saja, unik
  const seen = new Set();
  const nos = [];
  for(const r of filtered){
    const no = String(r.salesorder_no || "").trim();
    if(!no) continue;
    if(seen.has(no)) continue;
    seen.add(no);
    nos.push(no);
  }

  const text = nos.join("\n").trim();
  if(!text) return alert("Tidak ada nomor pesanan untuk di-copy.");

  if(navigator?.clipboard?.writeText){
    navigator.clipboard.writeText(text)
      .then(() => alert("✅ Nomor pesanan berhasil di-copy."))
      .catch(() => fallbackCopyText(text));
  }else{
    fallbackCopyText(text);
  }
}

function fallbackCopyText(text){
  try{
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    alert("✅ Cancel log berhasil di-copy.");
  }catch(err){
    alert("Gagal copy. Coba blok manual lalu Ctrl+C.");
  }
}
