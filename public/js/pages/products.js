// Manajemen produk merchant: daftar, tambah/edit (URL gambar atau upload R2), hapus.
// Aksi memakai data-action + data-id (event delegation di app.js) —
// TIDAK ada data produk di dalam inline handler, jadi tidak ada risiko quote-breaking.
import { api, apiForm, state } from '../api.js';
import { esc, go, priceLabel } from '../utils.js';
import { errorBox, field, inputCls, setErr, showToast, topbar } from '../ui.js';

let currentProducts = [];
let editingProduct = null;
let currentShowcase = [];
let editingShowcase = null;

export async function viewProducts() {
  if (!state.session) {
    go('/login');
    return '';
  }
  try {
    currentProducts = (await api('/api/products')).products;
  } catch (e) {
    return `${topbar('products')}<main class="max-w-5xl mx-auto px-4 py-10">${errorBox(e.message)}</main>`;
  }
  try {
    currentShowcase = (await api('/api/showcase')).items || [];
  } catch {
    currentShowcase = [];
  }
  const rows = currentProducts.length
    ? currentProducts
        .map((p) => `<tr class="border-t border-stone-100">
      <td class="py-2 pr-2"><div class="flex items-center gap-3">${p.image_url ? `<img src="${esc(p.image_url)}" class="w-12 h-12 rounded-lg object-cover border" alt="" />` : `<div class="w-12 h-12 rounded-lg border bg-stone-100 flex items-center justify-center text-xl shrink-0">📦</div>`}<div><div class="font-medium">${esc(p.name)}</div><div class="text-xs text-stone-500">${esc(p.category)} · stok ${p.stock}</div></div></div></td>
      <td class="py-2 pr-2 font-medium">${priceLabel(p.price)}</td>
      <td class="py-2 pr-2"><span class="text-xs px-2 py-1 rounded-full ${p.status === 'active' ? 'bg-red-100 text-red-800' : 'bg-stone-100 text-stone-600'}">${p.status === 'active' ? 'Aktif' : p.status}</span></td>
      <td class="py-2"><div class="flex gap-2"><button data-action="edit-product" data-id="${esc(p.id)}" class="px-3 py-1.5 rounded-lg border text-sm">Edit</button><button data-action="delete-product" data-id="${esc(p.id)}" class="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-sm">Hapus</button></div></td>
    </tr>`)
        .join('')
    : `<tr><td colspan="4" class="py-6 text-center text-stone-500 text-sm">Belum ada produk. Tambah produk pertamamu di bawah.</td></tr>`;
  const showcaseRows = currentShowcase.length
    ? currentShowcase
        .map((s) => `<tr class="border-t border-stone-100">
      <td class="py-2 pr-2"><div class="flex items-center gap-3">${s.image_url ? `<img src="${esc(s.image_url)}" class="w-12 h-12 rounded-lg object-cover border" alt="" />` : ''}<div><div class="font-medium">${esc(s.title)}</div><div class="text-xs text-stone-500">${esc(s.description || '')}</div></div></div></td>
      <td class="py-2 pr-2 text-xs">${s.file_url ? `<a href="${esc(s.file_url)}" target="_blank" rel="noopener" class="text-red-700 underline">PDF ↗</a>` : ''}${s.link_url ? ` <a href="${esc(s.link_url)}" target="_blank" rel="noopener" class="text-red-700 underline">Link ↗</a>` : ''}${!s.file_url && !s.link_url ? '<span class="text-stone-400">—</span>' : ''}</td>
      <td class="py-2 pr-2">${s.sort_order}</td>
      <td class="py-2"><div class="flex gap-2"><button data-action="edit-showcase" data-id="${esc(s.id)}" class="px-3 py-1.5 rounded-lg border text-sm">Edit</button><button data-action="delete-showcase" data-id="${esc(s.id)}" class="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-sm">Hapus</button></div></td>
    </tr>`)
        .join('')
    : `<tr><td colspan="4" class="py-6 text-center text-stone-500 text-sm">Belum ada showcase. Tambah brosur pertamamu di bawah.</td></tr>`;
  return `${topbar('products')}
  <main class="max-w-5xl mx-auto px-4 py-8">
    <div class="flex items-end justify-between gap-3"><div><h1 class="text-2xl font-bold">Produk</h1><p class="text-sm text-stone-600">${currentProducts.length} produk · klik Edit untuk mengubah, atau isi form di bawah untuk menambah.</p></div>
    <button data-action="new-product" class="px-4 py-2 rounded-xl bg-red-700 text-white text-sm font-semibold">+ Produk Baru</button></div>
    <div id="form-wrap" class="mt-4"></div>
    <div class="bg-white border border-stone-200 rounded-2xl p-4 mt-4 overflow-x-auto">
      <table class="w-full text-sm min-w-[640px]"><thead><tr class="text-left text-stone-500 text-xs uppercase"><th class="py-1 pr-2">Produk</th><th class="py-1 pr-2">Harga</th><th class="py-1 pr-2">Status</th><th class="py-1">Aksi</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
    <div class="flex items-end justify-between gap-3 mt-10"><div><h2 class="text-xl font-bold">Showcase / Brosur</h2><p class="text-sm text-stone-600">Tampil di toko publikmu di bawah/sesuai urutan seksi — untuk display brosur (gambar atau PDF).</p></div>
    <button data-action="new-showcase" class="px-4 py-2 rounded-xl bg-red-700 text-white text-sm font-semibold">+ Showcase Baru</button></div>
    <div id="showcase-form-wrap" class="mt-4"></div>
    <div class="bg-white border border-stone-200 rounded-2xl p-4 mt-4 overflow-x-auto">
      <table class="w-full text-sm min-w-[640px]"><thead><tr class="text-left text-stone-500 text-xs uppercase"><th class="py-1 pr-2">Item</th><th class="py-1 pr-2">Tautan / File</th><th class="py-1 pr-2">Urutan</th><th class="py-1">Aksi</th></tr></thead><tbody>${showcaseRows}</tbody></table>
    </div>
  </main>`;
}

function showcaseForm(s) {
  const v = s || { title: '', description: '', image_url: '', link_url: '', file_url: '', sort_order: 0 };
  return `<form id="f-showcase" class="bg-white border border-red-200 rounded-2xl p-5 space-y-4">
    <h2 class="font-bold">${s ? 'Edit showcase' : 'Tambah showcase'}</h2><div id="showcase-err"></div>
    <div class="grid sm:grid-cols-2 gap-4">
      ${field('Judul *', `<input required name="title" value="${esc(v.title)}" class="${inputCls}" />`)}
      ${field('Urutan', `<input type="number" min="0" max="9999" name="sort_order" value="${v.sort_order}" class="${inputCls}" />`, 'Angka kecil tampil lebih dulu.')}
      ${field('Gambar sampul (URL)', `<input name="image_url" value="${esc(v.image_url)}" class="${inputCls}" placeholder="https://..." />`)}
      ${field('Tautan (opsional)', `<input name="link_url" value="${esc(v.link_url)}" class="${inputCls}" placeholder="https://..." />`)}
    </div>
    ${field('Deskripsi', `<textarea name="description" rows="2" class="${inputCls}">${esc(v.description)}</textarea>`)}
    ${field('File brosur (PDF)', `<input name="file_url" value="${esc(v.file_url)}" class="${inputCls}" placeholder="https://... atau upload di bawah" />`, 'Tempel URL PDF, atau upload file PDF di bawah.')}
    <div>
      <span class="text-sm font-medium text-stone-700">Upload brosur PDF (opsional)</span>
      <input type="file" id="showcase-file" accept="application/pdf" class="mt-1 block text-sm" />
      <span class="block text-xs text-stone-500 mt-1">Maks. 10 MB, hanya PDF.</span>
    </div>
    <div>
      <span class="text-sm font-medium text-stone-700">Upload gambar sampul (opsional)</span>
      <input type="file" id="showcase-image" accept="image/*" class="mt-1 block text-sm" />
      <span class="block text-xs text-stone-500 mt-1">Maks. 5 MB, hanya gambar.</span>
    </div>
    <div class="flex gap-2">
      <button class="px-4 py-2 rounded-xl bg-red-700 text-white font-semibold">${s ? 'Simpan Perubahan' : 'Tambah Showcase'}</button>
      <button type="button" data-action="cancel-showcase-form" class="px-4 py-2 rounded-xl border">Batal</button>
    </div>
  </form>`;
}

export function openShowcaseForm(id, onRerender) {
  editingShowcase = id ? currentShowcase.find((x) => x.id === id) || null : null;
  const wrap = document.getElementById('showcase-form-wrap');
  if (wrap) {
    wrap.innerHTML = showcaseForm(editingShowcase);
    wrap.scrollIntoView({ behavior: 'smooth' });
  }
  if (onRerender) bindShowcase(onRerender);
}

export function cancelShowcaseForm() {
  editingShowcase = null;
  const wrap = document.getElementById('showcase-form-wrap');
  if (wrap) wrap.innerHTML = '';
}

export async function deleteShowcaseById(id, onRerender) {
  const s = currentShowcase.find((x) => x.id === id);
  if (!s) return;
  if (!confirm(`Hapus showcase "${s.title}"?`)) return;
  try {
    await api(`/api/showcase/${id}`, { method: 'DELETE' });
    onRerender();
  } catch (e) {
    alert(e.message);
  }
}

export function bindShowcase(onRerender) {
  const form = document.getElementById('f-showcase');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]') || form.querySelector('button');
    const btnLabel = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan…'; }
    const fd = new FormData(form);
    let fileUrl = String(fd.get('file_url') || '').trim();
    let imageUrl = String(fd.get('image_url') || '').trim();
    const pdf = document.getElementById('showcase-file')?.files?.[0];
    if (pdf) {
      const up = new FormData();
      up.append('file', pdf);
      try {
        fileUrl = (await apiForm('/api/uploads?kind=showcase', up)).url;
      } catch (err) {
        if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
        setErr('showcase-err', `Upload PDF gagal: ${err.message}`);
        return;
      }
    }
    const img = document.getElementById('showcase-image')?.files?.[0];
    if (img) {
      const up = new FormData();
      up.append('file', img);
      try {
        imageUrl = (await apiForm('/api/uploads', up)).url;
      } catch (err) {
        if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
        setErr('showcase-err', `Upload gambar gagal: ${err.message}`);
        return;
      }
    }
    const payload = {
      title: fd.get('title'),
      description: fd.get('description'),
      image_url: imageUrl,
      link_url: fd.get('link_url'),
      file_url: fileUrl,
      sort_order: Number(fd.get('sort_order') || 0),
    };
    try {
      if (editingShowcase) await api(`/api/showcase/${editingShowcase.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      else await api('/api/showcase', { method: 'POST', body: JSON.stringify(payload) });
      editingShowcase = null;
      showToast('Showcase tersimpan.');
      onRerender();
    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
      setErr('showcase-err', err.message);
    }
  });
}

function productForm(p) {
  const v = p || { name: '', price: '', description: '', category: 'Umum', stock: 0, status: 'active', image_url: '' };
  const statusLabel = { active: 'Aktif', draft: 'Draft', archived: 'Diarsipkan' };
  const statusOptions = ['active', 'draft', 'archived']
    .map((s) => `<option value="${s}"${s === v.status ? ' selected' : ''}>${statusLabel[s]}</option>`)
    .join('');
  return `<form id="f-product" class="bg-white border border-red-200 rounded-2xl p-5 space-y-4">
    <h2 class="font-bold">${p ? 'Edit produk' : 'Tambah produk'}</h2><div id="err"></div>
    <div class="grid sm:grid-cols-2 gap-4">
      ${field('Nama produk *', `<input required name="name" value="${esc(v.name)}" class="${inputCls}" />`)}
      ${field('Harga (Rp) *', `<input required type="number" min="0" max="1000000000" name="price" value="${v.price}" class="${inputCls}" />`, 'Isi 0 bila harga tanya via WhatsApp (Tanya Harga).')}
      ${field('Kategori', `<input name="category" value="${esc(v.category)}" class="${inputCls}" />`)}
      ${field('Stok', `<input type="number" min="0" max="1000000" name="stock" value="${v.stock}" class="${inputCls}" />`, 'Isi 0 bila stok tidak dibatasi (pre-order).')}
      ${field('Status', `<select name="status" class="${inputCls}">${statusOptions}</select>`)}
      ${field('Gambar (URL)', `<input name="image_url" value="${esc(v.image_url)}" class="${inputCls}" placeholder="https://images.unsplash.com/..." />`, 'Tempel link gambar (mis. Unsplash). Atau upload file di bawah — upload memakai R2 bila sudah diset.')}
    </div>
    ${field('Deskripsi', `<textarea name="description" rows="3" class="${inputCls}">${esc(v.description)}</textarea>`)}
    <div>
      <span class="text-sm font-medium text-stone-700">Upload foto (opsional)</span>
      <input type="file" id="upload-file" accept="image/*" class="mt-1 block text-sm" />
      <span class="block text-xs text-stone-500 mt-1">Maks. 5 MB, hanya gambar. Bila R2 belum diset, upload akan gagal — pakai URL gambar saja.</span>
    </div>
    <div class="flex gap-2">
      <button class="px-4 py-2 rounded-xl bg-red-700 text-white font-semibold">${p ? 'Simpan Perubahan' : 'Tambah Produk'}</button>
      <button type="button" data-action="cancel-product-form" class="px-4 py-2 rounded-xl border">Batal</button>
    </div>
  </form>`;
}

export function openProductForm(id, onRerender) {
  editingProduct = id ? currentProducts.find((p) => p.id === id) || null : null;
  const wrap = document.getElementById('form-wrap');
  if (wrap) {
    wrap.innerHTML = productForm(editingProduct);
    wrap.scrollIntoView({ behavior: 'smooth' });
  }
  if (onRerender) bindProducts(onRerender);
}

export function cancelProductForm() {
  editingProduct = null;
  const wrap = document.getElementById('form-wrap');
  if (wrap) wrap.innerHTML = '';
}

export async function deleteProductById(id, onRerender) {
  const p = currentProducts.find((x) => x.id === id);
  if (!p) return;
  if (!confirm(`Hapus produk "${p.name}"?`)) return;
  try {
    await api(`/api/products/${id}`, { method: 'DELETE' });
    onRerender();
  } catch (e) {
    alert(e.message);
  }
}

export function bindProducts(onRerender) {
  const form = document.getElementById('f-product');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]') || form.querySelector('button');
    const btnLabel = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan…'; }
    const fd = new FormData(form);
    let imageUrl = String(fd.get('image_url') || '').trim();
    const file = document.getElementById('upload-file')?.files?.[0];
    if (file) {
      const up = new FormData();
      up.append('file', file);
      try {
        imageUrl = (await apiForm('/api/uploads', up)).url;
      } catch (err) {
        if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
        setErr('err', `Upload gagal: ${err.message} — produk tetap bisa disimpan dengan URL gambar di atas.`);
        return;
      }
    }
    const payload = {
      name: fd.get('name'),
      price: Number(fd.get('price')),
      description: fd.get('description'),
      category: fd.get('category'),
      stock: Number(fd.get('stock') || 0),
      status: fd.get('status'),
      image_url: imageUrl,
    };
    try {
      if (editingProduct) await api(`/api/products/${editingProduct.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      else await api('/api/products', { method: 'POST', body: JSON.stringify(payload) });
      editingProduct = null;
      showToast('Produk tersimpan.');
      onRerender();
    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
      setErr('err', err.message);
    }
  });
}
