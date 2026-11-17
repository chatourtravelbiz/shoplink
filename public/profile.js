// Chatour Travel — company profile.
// Semua teks & data dari content.json, jadi cukup edit satu file itu.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));

const waHref = (c, text) => {
  const base = c.waLink || "#";
  return text ? `${base}${base.includes("?") ? "&" : "?"}text=${encodeURIComponent(text)}` : base;
};

function paketCard(p, c) {
  return `<article class="card">
    <h3>${esc(p.nama)}</h3>
    <p class="price">${esc(p.harga)}</p>
    <p class="meta">${esc(p.durasi)} &middot; ${esc(p.berangkat)}</p>
    <ul>${(p.fasilitas || []).map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
    <a class="btn btn-wa" href="${esc(waHref(c, `Assalamu'alaikum, saya ingin bertanya tentang ${p.nama}.`))}" target="_blank" rel="noopener">Tanya Paket Ini</a>
  </article>`;
}

async function init() {
  document.getElementById("year").textContent = new Date().getFullYear();
  let c;
  try {
    c = await (await fetch("/content.json")).json();
  } catch {
    return; // HTML statis tetap tampil walau JSON gagal dimuat
  }
  document.title = `${c.biro} — Biro Umroh & Haji`;
  document.getElementById("hero-title").textContent = c.heroTitle;
  document.getElementById("hero-sub").textContent = c.heroSub;
  document.getElementById("hero-izin").textContent = c.izin;
  document.getElementById("tentang-text").textContent = c.tentang;
  document.getElementById("footer-izin").textContent = c.izin;

  for (const id of ["nav-wa", "hero-wa", "kontak-wa-btn"]) {
    document.getElementById(id).href = waHref(c, "Assalamu'alaikum, saya ingin bertanya tentang paket Umroh & Haji Chatour Travel.");
  }
  const waEl = document.getElementById("kontak-wa");
  waEl.href = waHref(c);
  waEl.textContent = c.waNumber;
  const emEl = document.getElementById("kontak-email");
  emEl.href = `mailto:${c.email}`;
  emEl.textContent = c.email;
  document.getElementById("kontak-alamat").textContent = c.alamat;
  document.getElementById("kontak-jam").textContent = c.jam;
  // Toko agen kini di root chatourtravel.com/:username (shopUrl di content.json).
  document.getElementById("footer-shop").href = c.shopUrl;

  document.getElementById("keunggulan").innerHTML = (c.keunggulan || []).map((k) =>
    `<article class="card feature"><h3>${esc(k.judul)}</h3><p>${esc(k.isi)}</p></article>`).join("");
  document.getElementById("paket-umroh").innerHTML = (c.paketUmroh || []).map((p) => paketCard(p, c)).join("");
  document.getElementById("paket-haji").innerHTML = (c.paketHaji || []).map((p) => paketCard(p, c)).join("");
  document.getElementById("cara-daftar").innerHTML = (c.caraDaftar || []).map((s) =>
    `<article class="card"><span class="step-num">${esc(s.langkah)}</span><h3>${esc(s.judul)}</h3><p>${esc(s.isi)}</p></article>`).join("");
  document.getElementById("testimoni").innerHTML = (c.testimoni || []).map((t) =>
    `<article class="card"><p class="quote">&ldquo;${esc(t.isi)}&rdquo;</p><p class="quote-name">${esc(t.nama)}</p></article>`).join("");
  document.getElementById("faq-list").innerHTML = (c.faq || []).map((f, i) =>
    `<div class="faq-item">
      <button class="faq-q" type="button" aria-expanded="${i === 0}" data-faq="${i}">${esc(f.q)}<span aria-hidden="true">${i === 0 ? "−" : "+"}</span></button>
      <div class="faq-a" ${i === 0 ? "" : "hidden"}>${esc(f.a)}</div>
    </div>`).join("");
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-faq]");
  if (!btn) return;
  const item = btn.closest(".faq-item");
  const ans = item.querySelector(".faq-a");
  const open = ans.hasAttribute("hidden");
  ans.toggleAttribute("hidden", !open);
  btn.setAttribute("aria-expanded", String(open));
  btn.querySelector("span").textContent = open ? "−" : "+";
});

init();
