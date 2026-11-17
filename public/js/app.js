// Router path bersih (History API) + event delegation global. Tidak ada data
// user di inline handler: semua aksi lewat data-action / data-id, dan semua
// output di-escape (esc()).
import { loadSession, logout } from './api.js';
import { go, togglePasswordVisibility } from './utils.js';
import { isInternalPath, parsePath } from './router.js';
import { errorBox, topbar } from './ui.js';
import { bindAuth, viewLogin, viewSignup } from './pages/auth.js';
import { bindDashboard, viewDashboard } from './pages/dashboard.js';
import { bindProducts, cancelProductForm, deleteProductById, openProductForm, viewProducts } from './pages/products.js';
import { bindSettings, viewSettings } from './pages/settings.js';
import { adminDelete, adminToggleStore, bindAdmin, viewAdmin } from './pages/admin.js';
import { clearStoreCache, shareStore, storeFilter, trackClick, viewStore } from './pages/storefront.js';
import { bindProduct, viewProduct } from './pages/product.js';

const $app = document.getElementById('app');
let searchTimer = null;

async function render() {
  const route = parsePath(location.pathname);
  let html = '';
  try {
    // Shoplink tidak punya landing page: / bukan route (parsePath mengembalikan
    // 'notfound' dan jatuh ke halaman 404 di bawah). Tanpa redirect.
    if (route.kind === 'signup') html = viewSignup();
    else if (route.kind === 'login') html = viewLogin();
    else if (route.kind === 'dashboard') html = await viewDashboard();
    else if (route.kind === 'products') html = await viewProducts();
    else if (route.kind === 'settings') html = viewSettings();
    else if (route.kind === 'admin') html = await viewAdmin();
    else if (route.kind === 'product') html = await viewProduct(route.username, route.productId);
    else if (route.kind === 'store') html = await viewStore(route.username);
    else html = `${topbar()}<main class="max-w-3xl mx-auto px-4 py-10 text-center"><h1 class="text-xl font-bold">Halaman tidak ditemukan</h1><a href="https://chatourtravel.com/" class="text-emerald-700 underline">Kunjungi Company Profile Chatour Travel</a></main>`;
  } catch (e) {
    html = `${topbar()}<main class="max-w-3xl mx-auto px-4 py-10">${errorBox(e.message || 'Terjadi kesalahan.')}</main>`;
  }
  $app.innerHTML = html;
  window.scrollTo(0, 0);
  bindAuth();
  bindDashboard(render);
  bindProducts(render);
  bindSettings();
  bindAdmin();
  bindProduct();
}

// Satu klik: navigasi internal SPA dulu, lalu aksi data-action.
document.addEventListener('click', async (e) => {
  const anchor = e.target.closest('a[href]');
  if (anchor && !anchor.target && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
    const href = anchor.getAttribute('href');
    if (href && isInternalPath(href)) {
      e.preventDefault();
      go(href);
    }
  }
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  if (action === 'logout') {
    await logout();
    go('/login');
  } else if (action === 'toggle-password') {
    togglePasswordVisibility(el);
  } else if (action === 'new-product') {
    openProductForm(null);
  } else if (action === 'edit-product') {
    openProductForm(el.dataset.id);
  } else if (action === 'delete-product') {
    await deleteProductById(el.dataset.id, render);
  } else if (action === 'cancel-product-form') {
    cancelProductForm();
  } else if (action === 'store-filter') {
    storeFilter(el.dataset.username, el.dataset.cat);
  } else if (action === 'product-click') {
    trackClick(el.dataset.username);
  } else if (action === 'share-store') {
    shareStore(el);
  } else if (action === 'admin-tab') {
    go(`/admin?tab=${encodeURIComponent(el.dataset.tab)}`);
  } else if (action === 'admin-toggle-store') {
    await adminToggleStore(el.dataset.id, el.dataset.status, render);
  } else if (action === 'admin-delete-user') {
    await adminDelete('user', el.dataset.id, render);
  } else if (action === 'admin-delete-store') {
    await adminDelete('store', el.dataset.id, render);
  }
});

// Pencarian toko (debounce 400 ms) — nilai dibaca dari input, bukan dari HTML.
document.addEventListener('input', (e) => {
  const input = e.target.closest('#store-search');
  if (!input) return;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    clearStoreCache();
    const username = input.dataset.username;
    const value = input.value.trim();
    go(`/${username}${value ? `?q=${encodeURIComponent(value)}` : ''}`);
  }, 400);
});

window.addEventListener('popstate', render);
loadSession().then(render);
