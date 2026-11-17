// Chatour Travel — company profile.
// Semua teks & data dari content.json, jadi cukup edit satu file itu.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));

// Path ikon sosial 24x24 (sama seperti public/js/icons.js) — tanpa library.
const SOCIAL_PATHS = {
  facebook: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  youtube: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  instagram: "M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.859 0-3.211.016-3.586.061-4.859.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z",
  tiktok: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  linkedin: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  pinterest: "M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z",
};

const socialIcon = (key) => {
  const d = SOCIAL_PATHS[key];
  if (!d) return "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
};

const socialLinks = (c) => (c.sosial || []).map((s) =>
  `<a href="${esc(s.url)}" target="_blank" rel="noopener">${socialIcon(s.icon)} ${esc(s.nama)}</a>`).join("");


const waHref = (c, text) => {
  // Tombol WA utama mengarah ke agen Kediri (Sifa), bukan ke pusat.
  const base = (c.agen && c.agen.waLink) || c.waLink || "#";
  return text ? `${base}${base.includes("?") ? "&" : "?"}text=${encodeURIComponent(text)}` : base;
};

// Khusus kartu kantor pusat: tetap nomor pusat.
const waHrefPusat = (c, text) => {
  const base = c.waLink || "#";
  return text ? `${base}${base.includes("?") ? "&" : "?"}text=${encodeURIComponent(text)}` : base;
};

// Harga & jadwal ditulis SEKALI di catatan seksi paket, bukan di tiap kartu.
function paketCard(p, c) {
  return `<article class="card">
    <h3>${esc(p.nama)}</h3>
    <p class="meta">${esc(p.durasi)}</p>
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
  document.title = c.seoTitle || `${c.biro} — Biro Umroh & Haji`;
  document.getElementById("hero-title").textContent = c.heroTitle;
  document.getElementById("hero-sub").textContent = c.heroSub;
  document.getElementById("tentang-text").textContent = c.tentang;
  document.getElementById("footer-izin").textContent = c.izin;

  for (const id of ["nav-wa", "hero-wa", "kontak-wa-btn", "cta-wa"]) {
    document.getElementById(id).href = waHref(c, "Assalamu'alaikum, saya ingin bertanya tentang paket Umroh & Haji Chatour Travel.");
  }
  const waEl = document.getElementById("kontak-wa");
  waEl.href = waHrefPusat(c);
  waEl.textContent = c.waNumber;
  const telEl = document.getElementById("kontak-tel");
  telEl.href = c.telLink || "#";
  telEl.textContent = c.telepon;
  const emEl = document.getElementById("kontak-email");
  emEl.href = `mailto:${c.email}`;
  emEl.textContent = c.email;
  document.getElementById("kontak-alamat").textContent = c.alamat;
  document.getElementById("kontak-jam").textContent = c.jam;
  // Kartu agen (Sifa, Badas Kediri).
  const ag = c.agen || {};
  document.getElementById("agen-nama").textContent = ag.nama || "";
  const agWa = document.getElementById("agen-wa");
  agWa.href = ag.waLink || "#";
  agWa.textContent = ag.waNumber || "";
  const agTel = document.getElementById("agen-tel");
  agTel.href = ag.telLink || "#";
  agTel.textContent = ag.telepon || "";
  document.getElementById("agen-alamat").textContent = ag.alamat || "";
  document.getElementById("agen-jam").textContent = ag.jam || "";
  document.getElementById("agen-maps").href = ag.mapsUrl || "#";
  document.getElementById("sosial-list").innerHTML = socialLinks(c);
  const appEl = document.getElementById("kontak-app");
  appEl.href = c.appUrl || "#";
  appEl.textContent = `${c.appName || "Aplikasi Jamaah"} (Play Store)`;
  document.getElementById("footer-pusat").href = c.pusatUrl || "https://chatourtravel.id/";
  document.getElementById("footer-sosial").innerHTML = socialLinks(c);
  document.getElementById("footer-app").href = c.appUrl || "#";

  document.getElementById("layanan-list").innerHTML = (c.layanan || []).map((l) =>
    `<span class="chip">${esc(l)}</span>`).join("");
  document.getElementById("trust-strip").innerHTML = (c.legalitas || []).map((l) =>
    `<li><strong>${esc(l.judul)}</strong> — ${esc(l.isi)}</li>`).join("");
  document.getElementById("statistik").innerHTML = (c.statistik || []).map((s) =>
    `<div class="stat"><div class="stat-num">${esc(s.angka)}</div><div class="stat-label">${esc(s.label)}</div></div>`).join("");

  document.getElementById("keunggulan").innerHTML = (c.keunggulanGroups || []).map((g) =>
    `<div class="group"><h3 class="group-title">${esc(g.judul)}</h3><p class="group-sub">${esc(g.sub)}</p><div class="grid">${(g.items || []).map((k) =>
      `<article class="card feature"><h3>${esc(k.judul)}</h3><p>${esc(k.isi)}</p></article>`).join("")}</div></div>`).join("");
  document.getElementById("paket-umroh").innerHTML = (c.paketUmroh || []).map((p) => paketCard(p, c)).join("");
  document.getElementById("paket-haji").innerHTML = (c.paketHaji || []).map((p) => paketCard(p, c)).join("");
  document.getElementById("cara-daftar").innerHTML = (c.caraDaftar || []).map((s) =>
    `<article class="card"><span class="step-num">${esc(s.langkah)}</span><h3>${esc(s.judul)}</h3><p>${esc(s.isi)}</p></article>`).join("");
  document.getElementById("faq-list").innerHTML = (c.faq || []).map((f, i) =>
    `<div class="faq-item">
      <button class="faq-q" type="button" aria-expanded="${i === 0}" data-faq="${i}">${esc(f.q)}<span aria-hidden="true">${i === 0 ? "−" : "+"}</span></button>
      <div class="faq-a" ${i === 0 ? "" : "hidden"}>${esc(f.a)}</div>
    </div>`).join("");
}

// Mode gelap — pilihan tersimpan di localStorage ('ct-theme'), kunci yang
// sama dipakai SPA. Script anti-kedip di <head> sudah memasang class-nya.
(function () {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const sync = () => { btn.textContent = document.documentElement.classList.contains("dark") ? "☀️" : "🌙"; };
  sync();
  btn.addEventListener("click", () => {
    const dark = document.documentElement.classList.toggle("dark");
    try { localStorage.setItem("ct-theme", dark ? "dark" : "light"); } catch { /* abaikan */ }
    sync();
  });
})();

// Tombol kembali ke atas — muncul setelah scroll > 400px.
(function () {
  const btn = document.getElementById("scroll-top");
  if (!btn) return;
  const toggle = () => { btn.classList.toggle("show", window.scrollY > 400); };
  toggle();
  window.addEventListener("scroll", toggle, { passive: true });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
})();

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
