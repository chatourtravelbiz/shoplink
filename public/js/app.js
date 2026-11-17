// Router path bersih (History API) + event delegation global. Tidak ada data
// user di inline handler: semua aksi lewat data-action / data-id, dan semua
// output di-escape (esc()).
import { loadSession, logout } from './api.js';
import { go, togglePasswordVisibility } from './utils.js';
import { isInternalPath, parsePath } from './router.js';
import { errorBox, topbar } from './ui.js';
import { bindAuth, viewLogin, viewSignup } from './pages/auth.js';
import { bindDashboard, viewDashboard } from './pages/dashboard.js';
import { bindProducts, bindShowcase, cancelProductForm, cancelShowcaseForm, deleteProductById, deleteShowcaseById, openProductForm, openShowcaseForm, viewProducts } from './pages/products.js';
import { bindSettings, pickTheme, viewSettings } from './pages/settings.js';
import { adminCheckDomain, adminDelete, adminRemoveDomain, adminSaveDomain, adminToggleStore, bindAdmin, cancelPostForm, deletePostById, openPostForm, showDomainDns, viewAdmin } from './pages/admin.js';
import { clearStoreCache, shareStore, storeFilter, trackClick, viewStore } from './pages/storefront.js';
import { bindProduct, viewProduct } from './pages/product.js';

const $app = document.getElementById('app');
let searchTimer = null;

async function render() {
  // Di host custom domain agen, / dan /p/:id adalah toko itu sendiri
  // (username disuntik server sebagai window.__CUSTOM_STORE__).
  const bootStore = window.__CUSTOM_STORE__;
  let route = parsePath(location.pathname);
  if (bootStore && location.pathname === '/') route = { kind: 'store', username: bootStore };
  else if (bootStore && /^\/p\/[^/]+$/.test(location.pathname)) {
    route = { kind: 'product', username: bootStore, productId: location.pathname.split('/')[2] };
  }
  let html = '';
  try {
    // / adalah company profile (dirender server, bukan SPA) — SPA hanya
    // menanganinya bila ini host custom domain agen (lihat bootStore di atas).
    if (route.kind === 'signup') html = viewSignup();
    else if (route.kind === 'login') html = viewLogin();
    else if (route.kind === 'dashboard') html = await viewDashboard();
    else if (route.kind === 'products') html = await viewProducts();
    else if (route.kind === 'settings') html = viewSettings();
    else if (route.kind === 'admin') html = await viewAdmin();
    else if (route.kind === 'product') html = await viewProduct(route.username, route.productId);
    else if (route.kind === 'store') html = await viewStore(route.username);
    else html = `${topbar()}<main class="max-w-3xl mx-auto px-4 py-10 text-center"><h1 class="text-xl font-bold">Halaman tidak ditemukan</h1><a href="https://chatourtravel.com/" class="text-red-700 underline">Kunjungi Company Profile Chatour Travel</a></main>`;
  } catch (e) {
    html = `${topbar()}<main class="max-w-3xl mx-auto px-4 py-10">${errorBox(e.message || 'Terjadi kesalahan.')}</main>`;
  }
  $app.innerHTML = html;
  window.scrollTo(0, 0);
  bindAuth();
  bindDashboard(render);
  bindProducts(render);
  bindShowcase(render);
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
  } else if (action === 'theme-pick') {
    pickTheme(el.dataset.theme);
  } else if (action === 'new-showcase') {
    openShowcaseForm(null);
  } else if (action === 'edit-showcase') {
    openShowcaseForm(el.dataset.id);
  } else if (action === 'delete-showcase') {
    await deleteShowcaseById(el.dataset.id, render);
  } else if (action === 'cancel-showcase-form') {
    cancelShowcaseForm();
  } else if (action === 'admin-new-post') {
    openPostForm(null, render);
  } else if (action === 'admin-edit-post') {
    openPostForm(el.dataset.id, render);
  } else if (action === 'admin-delete-post') {
    await deletePostById(el.dataset.id, render);
  } else if (action === 'admin-cancel-post') {
    cancelPostForm();
  } else if (action === 'admin-tab') {
    go(`/admin?tab=${encodeURIComponent(el.dataset.tab)}`);
  } else if (action === 'admin-toggle-store') {
    await adminToggleStore(el.dataset.id, el.dataset.status, render);
  } else if (action === 'admin-domain-save') {
    await adminSaveDomain(el.dataset.id, render);
  } else if (action === 'admin-domain-remove') {
    await adminRemoveDomain(el.dataset.id, render);
  } else if (action === 'admin-domain-check') {
    await adminCheckDomain(el.dataset.id);
  } else if (action === 'admin-domain-dns') {
    showDomainDns(el.dataset.id, el.dataset.domain);
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
