// Manajemen produk merchant: daftar, tambah/edit (URL gambar atau upload R2), hapus.
// Aksi memakai data-action + data-id (event delegation di app.js) —
// TIDAK ada data produk di dalam inline handler, jadi tidak ada risiko quote-breaking.
import { api, apiForm, state } from '../api.js';
import { esc, go, rupiah } from '../utils.js';
import { errorBox, field, inputCls, setErr, topbar } from '../ui.js';

let currentProducts = [];
let editingProduct = null;

export async function viewProducts() {
  if (!state.session) {
    go('#/login');
    return '';
  }
  try {
    currentProducts = (await api('/api/products')).products;
  } catch (e) {
    return `${topbar('products')}<main class="max-w-5xl mx-auto px-4 py-10">${errorBox(e.message)}</main>`;
  }
  const rows = currentProducts.length
    ? currentProducts
        .map((p) => `<tr class="border-t border-stone-100">
      <td class="py-2 pr-2"><div class="flex items-center gap-3"><img src="${esc(p.image_url)}" class="w-12 h-12 rounded-lg object-cover border" alt="" /><div><div class="font-medium">${esc(p.name)}</div><div class="text-xs text-stone-500">${esc(p.category)} · stok ${p.stock}</div></div></div></td>
      <td class="py-2 pr-2 font-medium">${rupiah(p.price)}</td>
      <td class="py-2 pr-2"><span class="text-xs px-2 py-1 rounded-full ${p.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'}">${p.status === 'active' ? 'Aktif' : p.status}</span></td>
      <td class="py-2"><div class="flex gap-2"><button data-action="edit-product" data-id="${esc(p.id)}" class="px-3 py-1.5 rounded-lg border text-sm">Edit</button><button data-action="delete-product" data-id="${esc(p.id)}" class="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-sm">Hapus</button></div></td>
    </tr>`)
        .join('')
    : `<tr><td colspan="4" class="py-6 text-center text-stone-500 text-sm">Belum ada produk. Tambah produk pertamamu di bawah.</td></tr>`;
  return `${topbar('products')}
  <main class="max-w-5xl mx-auto px-4 py-8">
    <div class="flex items-end justify-between gap-3"><div><h1 class="text-2xl font-bold">Produk</h1><p class="text-sm text-stone-600">${currentProducts.length} produk · klik Edit untuk mengubah, atau isi form di bawah untuk menambah.</p></div>
    <button data-action="new-product" class="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold">+ Produk Baru</button></div>
    <div id="form-wrap" class="mt-4"></div>
    <div class="bg-white border border-stone-200 rounded-2xl p-4 mt-4 overflow-x-auto">
      <table class="w-full text-sm min-w-[640px]"><thead><tr class="text-left text-stone-500 text-xs uppercase"><th class="py-1 pr-2">Produk</th><th class="py-1 pr-2">Harga</th><th class="py-1 pr-2">Status</th><th class="py-1">Aksi</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
  </main>`;
}

function productForm(p) {
  const v = p || { name: '', price: '', description: '', category: 'Umum', stock: 0, status: 'active', image_url: '' };
  const statusLabel = { active: 'Aktif', draft: 'Draft', archived: 'Diarsipkan' };
  const statusOptions = ['active', 'draft', 'archived']
    .map((s) => `<option value="${s}"${s === v.status ? ' selected' : ''}>${statusLabel[s]}</option>`)
    .join('');
  return `<form id="f-product" class="bg-white border border-emerald-200 rounded-2xl p-5 space-y-4">
    <h2 class="font-bold">${p ? 'Edit produk' : 'Tambah produk'}</h2><div id="err"></div>
    <div class="grid sm:grid-cols-2 gap-4">
      ${field('Nama produk *', `<input required name="name" value="${esc(v.name)}" class="${inputCls}" />`)}
      ${field('Harga (Rp) *', `<input required type="number" min="0" max="1000000000" name="price" value="${v.price}" class="${inputCls}" />`)}
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
      <button class="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold">${p ? 'Simpan Perubahan' : 'Tambah Produk'}</button>
      <button type="button" data-action="cancel-product-form" class="px-4 py-2 rounded-xl border">Batal</button>
    </div>
  </form>`;
}

export function openProductForm(id) {
  editingProduct = id ? currentProducts.find((p) => p.id === id) || null : null;
  const wrap = document.getElementById('form-wrap');
  if (wrap) {
    wrap.innerHTML = productForm(editingProduct);
    wrap.scrollIntoView({ behavior: 'smooth' });
  }
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
    const fd = new FormData(form);
    let imageUrl = String(fd.get('image_url') || '').trim();
    const file = document.getElementById('upload-file')?.files?.[0];
    if (file) {
      const up = new FormData();
      up.append('file', file);
      try {
        imageUrl = (await apiForm('/api/uploads', up)).url;
      } catch (err) {
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
      onRerender();
    } catch (err) {
      setErr('err', err.message);
    }
  });
}
