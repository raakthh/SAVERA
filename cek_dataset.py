
from pathlib import Path
import pandas as pd

# Lokasi folder dataset baru.
BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR / "datasets_v2"

if not DATASET_DIR.exists():
    raise FileNotFoundError(
        f"Folder dataset tidak ditemukan: {DATASET_DIR}"
    )

csv_files = sorted(DATASET_DIR.glob("*.csv"))

if not csv_files:
    raise FileNotFoundError(
        f"Tidak ada file CSV di: {DATASET_DIR}"
    )

print("=" * 70)
print("PEMERIKSAAN DATASET BARU")
print("=" * 70)

for file_path in csv_files:
    print(f"\nFile: {file_path.name}")

    try:
        df = pd.read_csv(file_path)

        print(f"Jumlah baris       : {len(df)}")
        print(f"Jumlah kolom       : {len(df.columns)}")
        print(f"Nama kolom         : {list(df.columns)}")
        print(f"Baris duplikat     : {df.duplicated().sum()}")
        print(f"Kolom kosong       : {df.isna().sum().to_dict()}")

        print("\nContoh 5 baris pertama:")
        print(df.head().to_string(index=False))

    except Exception as exc:
        print(f"Gagal membaca file: {exc}")