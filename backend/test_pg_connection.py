import os
import subprocess
from django.conf import settings

db = settings.DATABASES["default"]
env = os.environ.copy()
env["PGPASSWORD"] = db["PASSWORD"]
env["PGSSLMODE"] = "require"

print("Host:", db["HOST"])
print("Port:", db.get("PORT") or 5432)
print("Database:", db["NAME"])
print("Username:", db["USER"])
print("Password terisi:", bool(env["PGPASSWORD"]))

psql = r"C:\Program Files\PostgreSQL\15\bin\psql.exe"

if not os.path.isfile(psql):
    print("psql.exe tidak ditemukan.")
    raise SystemExit(1)

cmd = [
    psql,
    "--host", db["HOST"],
    "--port", str(db.get("PORT") or 5432),
    "--username", db["USER"],
    "--dbname", db["NAME"],
    "--no-password",
    "--command", "SELECT current_user, current_database();",
]

result = subprocess.run(cmd, env=env, text=True)
print("Exit code:", result.returncode)
