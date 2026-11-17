-- Tampilan toko agen (tema Linktree): bentuk tombol, badge agen, urutan seksi.
ALTER TABLE stores ADD COLUMN button_style TEXT NOT NULL DEFAULT 'rounded';
ALTER TABLE stores ADD COLUMN show_badge INTEGER NOT NULL DEFAULT 1;
ALTER TABLE stores ADD COLUMN section_order TEXT NOT NULL DEFAULT 'products-first';
