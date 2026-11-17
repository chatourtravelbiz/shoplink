// Daftar Isi (TOC) artikel blog — parser ringan untuk isi artikel teks polos.
// Konvensi isi: satu paragraf per blok (dipisah baris kosong); baris `## `
// di awal blok menjadi h2, `### ` menjadi h3. Heading mendapat id anchor
// stabil (slug teks, duplikat diberi sufiks -2, -3). Tanpa dependensi baru.
export type TocItem = { id: string; text: string; level: 2 | 3 };

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string);

const slugify = (text: string): string => {
  const s = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'bagian';
};

export function renderArticle(content: string): { html: string; toc: TocItem[] } {
  const used = new Map<string, number>();
  const toc: TocItem[] = [];
  const parts: string[] = [];
  for (const block of String(content || '').split(/\n\s*\n/)) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const head = lines[0].match(/^(#{2,3})\s+(.+)$/);
    if (head) {
      const level = head[1].length === 3 ? 3 : 2;
      const text = head[2].trim();
      const base = slugify(text);
      const n = (used.get(base) ?? 0) + 1;
      used.set(base, n);
      const id = n === 1 ? base : `${base}-${n}`;
      toc.push({ id, text, level });
      parts.push(`<h${level} id="${id}">${esc(text)}</h${level}>`);
      if (lines.length > 1) parts.push(`<p>${esc(lines.slice(1).join(' '))}</p>`);
    } else {
      parts.push(`<p>${esc(lines.join(' '))}</p>`);
    }
  }
  return { html: parts.join('\n'), toc };
}

export function tocHtml(toc: TocItem[]): string {
  if (toc.length < 2) return '';
  const items = toc
    .map(
      (t) =>
        `<li class="${t.level === 3 ? 'toc-sub' : ''}"><a href="#${t.id}">${esc(t.text)}</a></li>`,
    )
    .join('\n');
  return `<nav class="toc" aria-label="Daftar Isi">
    <p class="toc-title">Daftar Isi</p>
    <ol class="toc-list">${items}</ol>
  </nav>`;
}

// Sorot item TOC yang sedang dibaca (IntersectionObserver, tanpa library).
// Disisipkan hanya di halaman detail artikel.
export const TOC_SCRIPT = `<script>
(function () {
  var links = document.querySelectorAll('.toc-list a');
  if (!links.length || !('IntersectionObserver' in window)) return;
  var byId = {};
  links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      links.forEach(function (a) { a.classList.remove('active'); });
      var a = byId[e.target.id];
      if (a) a.classList.add('active');
    });
  }, { rootMargin: '-90px 0px -70% 0px' });
  Object.keys(byId).forEach(function (id) {
    var h = document.getElementById(id);
    if (h) obs.observe(h);
  });
})();
</script>`;
