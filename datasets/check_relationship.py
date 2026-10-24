import csv
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "new"


def load_csv(filename):
    path = DATA_DIR / filename

    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)

        rows = []
        for row in reader:
            cleaned = {}
            for key, value in row.items():
                if key is not None:
                    cleaned[key.strip()] = (
                        value.strip() if value else ""
                    )
            rows.append(cleaned)

    return rows


def check_relation(
    child_file,
    child_column,
    parent_file,
    parent_column,
    allow_values=None,
):
    allow_values = set(allow_values or [])

    child_rows = load_csv(child_file)
    parent_rows = load_csv(parent_file)

    parent_ids = {
        row[parent_column]
        for row in parent_rows
        if row.get(parent_column, "")
    }

    child_ids = [
        row.get(child_column, "")
        for row in child_rows
    ]

    missing_values = [
        value
        for value in child_ids
        if not value or value not in parent_ids | allow_values
    ]

    invalid_ids = sorted({
        value for value in missing_values if value
    })

    empty_count = sum(not value for value in missing_values)

    print(f"\n{child_file}.{child_column}")
    print(f"  Referensi induk: {parent_file}.{parent_column}")
    print(f"  Jumlah baris anak: {len(child_rows)}")
    print(f"  ID referensi tidak ditemukan: {len(invalid_ids)}")
    print(f"  Referensi kosong: {empty_count}")

    if invalid_ids:
        print(f"  Contoh ID tidak ditemukan: {invalid_ids[:10]}")


def main():
    relations = [
        (
            "vehicle_master.csv", "customer_id",
            "customer_master.csv", "customer_id", [],
        ),
        (
            "service_requests.csv", "customer_id",
            "customer_master.csv", "customer_id", [],
        ),
        (
            "service_requests.csv", "vehicle_id",
            "vehicle_master.csv", "vehicle_id", [],
        ),
        (
            "repair_orders.csv", "service_request_id",
            "service_requests.csv", "service_request_id", [],
        ),
        (
            "repair_orders.csv", "vehicle_id",
            "vehicle_master.csv", "vehicle_id", [],
        ),
        (
            "repair_orders.csv", "part_id",
            "inventory.csv", "part_id", ["NOT_REQUIRED"],
        ),
        (
            "repair_queue.csv", "repair_order_id",
            "repair_orders.csv", "repair_order_id", [],
        ),
        (
            "repair_queue.csv", "service_request_id",
            "service_requests.csv", "service_request_id", [],
        ),
        (
            "repair_queue.csv", "vehicle_id",
            "vehicle_master.csv", "vehicle_id", [],
        ),
        (
            "repair_cost.csv", "vehicle_id",
            "vehicle_master.csv", "vehicle_id", [],
        ),
        (
            "paint_materials.csv", "vehicle_id",
            "vehicle_master.csv", "vehicle_id", [],
        ),
        (
            "paint_materials.csv", "repair_order_id",
            "repair_orders.csv", "repair_order_id", [],
        ),
        (
            "purchase_orders.csv", "supplier_id",
            "suppliers.csv", "supplier_id", [],
        ),
        (
            "purchase_orders.csv", "part_id",
            "inventory.csv", "part_id", [],
        ),
        (
            "inventory_transactions.csv", "part_id",
            "inventory.csv", "part_id", [],
        ),
        (
            "ppic_recommendations.csv", "part_id",
            "inventory.csv", "part_id", [],
        ),
        (
            "vehicle_demand_history_synthetic_v2.csv", "part_id",
            "inventory.csv", "part_id", [],
        ),
    ]

    print("=" * 75)
    print("AUDIT RELASI DATASET SAVERA")
    print("=" * 75)

    for relation in relations:
        check_relation(*relation)

    # Periksa relasi invoice ke data operasional.
    invoice_relations = [
        (
            "invoices.csv", "repair_order_id",
            "repair_orders.csv", "repair_order_id",
        ),
        (
            "invoices.csv", "service_request_id",
            "service_requests.csv", "service_request_id",
        ),
        (
            "invoices.csv", "customer_id",
            "customer_master.csv", "customer_id",
        ),
        (
            "invoices.csv", "vehicle_id",
            "vehicle_master.csv", "vehicle_id",
        ),
    ]

    print("\n" + "=" * 75)
    print("AUDIT RELASI INVOICE")
    print("=" * 75)

    for relation in invoice_relations:
        check_relation(*relation)


if __name__ == "__main__":
    main()
