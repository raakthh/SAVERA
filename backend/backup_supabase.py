import os
import subprocess
from pathlib import Path
from django.conf import settings

dump_exe = r"C:\Program Files\PostgreSQL\15\bin\pg_dump.exe"
backup_file = Path.cwd() / "savera_backup_before_reset.dump"
db = settings.DATABASES["default"]

required = ["HOST", "NAME", "USER", "PASSWORD"]
missing = [key for key in required if not db.get(key)]

if missing:
    raise SystemExit(
        "Konfigurasi database belum lengkap: " + ", ".join(missing)
    )

if not Path(dump_exe).is_file():
    raise SystemExit("pg_dump.exe tidak ditemukan.")

env = os.environ.copy()
env["PGPASSWORD"] = db["PASSWORD"]

cmd = [
    dump_exe,
    "--host", db["HOST"],
    "--port", str(db.get("PORT") or 5432),
    "--username", db["USER"],
    "--dbname", db["NAME"],
    "--format=custom",
    "--no-owner",
    "--no-password",
    "--file", str(backup_file),
]

if db.get("OPTIONS", {}).get("sslmode"):
    env["PGSSLMODE"] = db["OPTIONS"]["sslmode"]
else:
    env["PGSSLMODE"] = "require"

result = subprocess.run(cmd, env=env)

if result.returncode != 0:
    if backup_file.exists():
        backup_file.unlink()
    raise SystemExit(
        "Backup gagal. Database belum diubah; jangan lanjutkan reset."
    )

if not backup_file.exists() or backup_file.stat().st_size == 0:
    raise SystemExit("File backup kosong atau tidak terbentuk dengan benar.")

print("Backup berhasil dibuat:", backup_file)
print("Ukuran file:", backup_file.stat().st_size, "bytes")
