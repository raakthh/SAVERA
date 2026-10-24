import csv
from pathlib import Path
from collections import Counter

DATA_DIR = Path(__file__).resolve().parent / "new"

FILES = [
    "customer_master.csv",
    "external_factors.csv",
    "inventory.csv",
    "inventory_transactions.csv",
    "invoices.csv",
    "paint_materials.csv",
    "ppic_recommendations.csv",
    "purchase_orders.csv",
    "repair_cost.csv",
    "repair_orders.csv",
    "repair_queue.csv",
    "service_requests.csv",
    "suppliers.csv",
    "vehicle_demand_history_synthetic_v2.csv",
    "vehicle_master.csv",
]

ID_COLUMNS = {
    "customer_master.csv": "customer_id",
    "inventory.csv": "part_id",
    "inventory_transactions.csv": "transaction_id",
    "invoices.csv": "invoice_id",
    "paint_materials.csv": "paint_material_id",
    "ppic_recommendations.csv": "recommendation_id",
    "purchase_orders.csv": "po_id",
    "repair_cost.csv": "repair_cost_id",
    "repair_orders.csv": "repair_order_id",
    "repair_queue.csv": "queue_id",
    "service_requests.csv": "service_request_id",
    "suppliers.csv": "supplier_id",
    "vehicle_demand_history_synthetic_v2.csv": "demand_id",
    "vehicle_master.csv": "vehicle_id",
}


def main():
    if not DATA_DIR.is_dir():
        raise FileNotFoundError(
            f"Direktori tidak ditemukan: {DATA_DIR}"
        )

    print(f"Direktori dataset: {DATA_DIR}")

    for filename in FILES:
        path = DATA_DIR / filename

        print("\n" + "=" * 75)
        print(f"FILE: {filename}")

        if not path.is_file():
            print("[ERROR] File tidak ditemukan")
            continue

        with path.open(
            "r", encoding="utf-8-sig", newline=""
        ) as file:
            reader = csv.DictReader(file)

            if not reader.fieldnames:
                print("[ERROR] Header tidak ditemukan")
                continue

            headers = [h.strip() for h in reader.fieldnames]

            if len(headers) != len(set(headers)):
                print("[ERROR] Ada nama kolom duplikat")

            rows = list(reader)

        print(f"Jumlah baris data : {len(rows)}")
        print(f"Jumlah kolom      : {len(headers)}")
        print(f"Kolom             : {headers}")

        # Memeriksa baris kosong, nilai kosong, dan duplikasi.
        empty_rows = 0
        missing_by_column = Counter()
        normalized_rows = []

        for row in rows:
            normalized = {
                (key.strip() if key else ""): (
                    value.strip() if value else ""
                )
                for key, value in row.items()
                if key is not None
            }

            if not any(normalized.values()):
                empty_rows += 1

            for column in headers:
                if not normalized.get(column, ""):
                    missing_by_column[column] += 1

            normalized_rows.append(normalized)

        row_signatures = [
            tuple(row.get(column, "") for column in headers)
            for row in normalized_rows
        ]

        duplicate_rows = sum(
            count - 1
            for count in Counter(row_signatures).values()
            if count > 1
        )

        print(f"Baris kosong       : {empty_rows}")
        print(f"Baris duplikat     : {duplicate_rows}")

        if missing_by_column:
            print("Nilai kosong:")
            for column, count in missing_by_column.items():
                print(f"  - {column}: {count}")

        id_column = ID_COLUMNS.get(filename)

        if id_column:
            if id_column not in headers:
                print(f"[PERINGATAN] Kolom ID {id_column} tidak ditemukan")
            else:
                ids = [
                    row.get(id_column, "")
                    for row in normalized_rows
                    if row.get(id_column, "")
                ]

                duplicate_ids = [
                    value
                    for value, count in Counter(ids).items()
                    if count > 1
                ]

                missing_ids = len(rows) - len(ids)

                print(f"Kolom ID           : {id_column}")
                print(f"ID kosong          : {missing_ids}")
                print(f"ID duplikat        : {len(duplicate_ids)}")

                if duplicate_ids:
                    print(
                        "Contoh ID duplikat :",
                        duplicate_ids[:10]
                    )

        print("Contoh 2 baris:")
        for row in normalized_rows[:2]:
            print(row)


if __name__ == "__main__":
    main()
