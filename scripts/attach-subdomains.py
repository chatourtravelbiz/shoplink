#!/usr/bin/env python3
"""Pasang subdomain platform (nama.chatourtravel.com) untuk toko agen.

Dipakai dua arah:
  1. Sekali jalan (manual) untuk toko yang sudah ada sebelum konsep subdomain.
  2. Cron tiap 2 menit: toko baru yang daftar otomatis dapat subdomain,
     tanpa setting manual per agen.

Cara kerja per toko aktif yang custom_domain-nya masih kosong:
  - PUT /workers/domains (API Cloudflare) -> daftarkan hostname ke Worker
    (DNS + sertifikat dibuat otomatis oleh Cloudflare).
  - UPDATE stores SET custom_domain -> supaya Worker mengenali hostname itu.
Idempotent: toko yang sudah punya custom_domain dilewati; bila hostname
sudah terdaftar di Cloudflare tapi D1 belum terisi, D1 tetap diisi.
"""
import json
import os
import re
import subprocess
import sys

PROJECT_DIR = os.environ.get("CF_PROJECT_DIR", "/home/hatch/workspace/shoplink-d1")
BIN = "/home/hatch/workspace/custom-connectors/custom.cloudflare/bin"
ACCOUNT_ID = "47a92e7a1509ad597d189f9d6ef7cbb1"
LABEL_RE = re.compile(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")
# Sama dengan RESERVED_USERNAMES di src/lib/validation.ts (+ blog/demo).
RESERVED = {
    "admin", "api", "app", "www", "mail", "dashboard", "settings", "products",
    "login", "signup", "support", "help", "chatour", "shoplink", "blog", "demo",
}


def run(cmd, env_extra=None):
    env = dict(os.environ)
    env["CF_PROJECT_DIR"] = PROJECT_DIR
    if env_extra:
        env.update(env_extra)
    p = subprocess.run(cmd, capture_output=True, text=True, env=env)
    return p.returncode, p.stdout, p.stderr


def d1_json(sql):
    rc, out, err = run([
        "python3", f"{BIN}/cf-wrangler.py", "d1", "execute", "shoplink-d1",
        "--remote", "--command", sql, "--json",
    ])
    if rc != 0:
        raise RuntimeError(f"D1 gagal: {err.strip() or out.strip()}")
    data = json.loads(out)
    return data[0].get("results", [])


def d1_exec(sql):
    rc, out, err = run([
        "python3", f"{BIN}/cf-wrangler.py", "d1", "execute", "shoplink-d1",
        "--remote", "--command", sql,
    ])
    if rc != 0:
        raise RuntimeError(f"D1 gagal: {err.strip() or out.strip()}")


def attach_domain(hostname):
    body = json.dumps({"hostname": hostname, "service": "shoplink-d1"})
    with open("/tmp/attach-domain-body.json", "w") as f:
        f.write(body)
    rc, out, err = run([
        "python3", f"{BIN}/cf-api.py", "PUT",
        f"/client/v4/accounts/{ACCOUNT_ID}/workers/domains",
        "/tmp/attach-domain-body.json",
    ])
    try:
        data = json.loads(out)
    except json.JSONDecodeError:
        return False, f"respons bukan JSON: {out[:200] or err[:200]}"
    if data.get("success"):
        return True, "terpasang"
    errs = data.get("errors") or []
    msg = "; ".join(str(e.get("message", e)) for e in errs) or "gagal tanpa pesan"
    # Sudah terdaftar sebelumnya -> anggap berhasil, D1 tetap diisi.
    if "already" in msg.lower() or "exists" in msg.lower():
        return True, f"sudah terdaftar ({msg})"
    return False, msg


def main():
    rows = d1_json(
        "SELECT username FROM stores "
        "WHERE (custom_domain IS NULL OR custom_domain = '') "
        "AND status = 'active' ORDER BY username;"
    )
    if not rows:
        print("Tidak ada toko yang perlu dipasang subdomain.")
        return 0
    attached, skipped, failed = [], [], []
    for r in rows:
        u = (r.get("username") or "").lower()
        if not LABEL_RE.match(u) or len(u) > 63 or u in RESERVED:
            skipped.append(f"{u} (username tidak valid untuk subdomain)")
            continue
        host = f"{u}.chatourtravel.com"
        ok, msg = attach_domain(host)
        if ok:
            d1_exec(
                "UPDATE stores SET custom_domain = "
                f"'{host}' WHERE username = '{u}';"
            )
            attached.append(f"{host} ({msg})")
        else:
            failed.append(f"{host}: {msg}")
    print(f"Terpasang: {len(attached)}")
    for a in attached:
        print(f"  + {a}")
    print(f"Dilewati: {len(skipped)}")
    for s in skipped:
        print(f"  - {s}")
    print(f"Gagal: {len(failed)}")
    for f in failed:
        print(f"  ! {f}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
