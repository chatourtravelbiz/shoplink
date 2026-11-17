// Router hash + event delegation global. Tidak ada data user di inline handler:
// semua aksi lewat data-action / data-id, dan semua output di-escape (esc()).
import { loadSession, logout } from './api.js';
import { go } from './utils.js';
import { errorBox, topbar } from './ui.js';
import { bindAuth, viewLanding, viewLogin, viewSignup } from './pages/auth.js';
import { bindDashboard, viewDashboard } from './pages/dashboard.js';
import { bindProducts, cancelProductForm, deleteProductById, openProductForm, viewProducts } from './pages/products.js';
import { bindSettings, viewSettings } from './pages/settings.js';
import { clearStoreCache, storeFilter, trackClick, viewStore } from './pages/storefront.js';
import { bindProduct, viewProduct } from './pages/product.js';

const $app = document.getElementById('app');
let searchTimer = null;

async function render() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [pathPart] = raw.split('?');
  const parts = pathPart.split('/').filter(Boolean);
  let html = '';
  try {
    if (parts.length === 0) html = viewLanding();
    else if (parts[0] === 'signup') html = viewSignup();
    else if (parts[0] === 'login') html = viewLogin();
    else if (parts[0] === 'dashboard') html = await viewDashboard();
    else if (parts[0] === 'products') html = await viewProducts();
    else if (parts[0] === 'settings') html = viewSettings();
    else if (parts[0] === 's' && parts[1] && parts[2] === 'p' && parts[3]) html = await viewProduct(parts[1], parts[3]);
    else if (parts[0] === 's' && parts[1]) html = await viewStore(parts[1]);
    else html = `${topbar()}<main class="max-w-3xl mx-auto px-4 py-10 text-center"><h1 class="text-xl font-bold">Halaman tidak ditemukan</h1><a href="#/" class="text-emerald-700 underline">Kembali ke beranda</a></main>`;
  } catch (e) {
    html = `${topbar()}<main class="max-w-3xl mx-auto px-4 py-10">${errorBox(e.message || 'Terjadi kesalahan.')}</main>`;
  }
  $app.innerHTML = html;
  window.scrollTo(0, 0);
  bindAuth();
  bindDashboard(render);
  bindProducts(render);
  bindSettings();
  bindProduct();
}

// Delegasi klik: logout, produk (baru/edit/hapus/batal), filter toko, klik produk.
document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  if (action === 'logout') {
    await logout();
    go('#/');
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
    go(`#/s/${username}${value ? `?q=${encodeURIComponent(value)}` : ''}`);
  }, 400);
});

window.addEventListener('hashchange', render);
loadSession().then(render);
