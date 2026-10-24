
import csv
from pathlib import Path
from decimal import Decimal, InvalidOperation

DATA_DIR = Path(__file__).resolve().parent / "new"

# Kolom yang seharusnya berisi bilangan bulat.
INTEGER_COLUMNS = {
    "inventory.csv": [
        "current_stock",
        "reorder_point",
        "safety_stock",
        "max_stock",
        "lead_time_days",
    ],
    "inventory_transactions.csv": [
        "quantity",
        "balance_after",
    ],
    "purchase_orders.csv": [
        "quantity_ordered",
        "received_quantity",
    ],
    "repair_orders.csv": [
        "year",
        "quantity_required",
        "estimated_repair_days",
    ],
    "repair_queue.csv": [
        "queue_number",
        "estimated_repair_days",
        "estimated_waiting_days",
    ],
    "service_requests.csv": [
        "year",
        "photo_count",
    ],
    "vehicle_master.csv": [
        "year",
    ],
    "repair_cost.csv": [
        "year",
        "damage_percentage",
    ],
    "vehicle_demand_history_synthetic_v2.csv": [
        "quantity_demanded",
        "quantity_used",
        "stockout_days",
    ],
    "suppliers.csv": [
        "lead_time_min",
        "lead_time_max",
        "lead_time_days",
        "payment_terms_days",
    ],
    "external_factors.csv": [
        "is_lebaran_week",
        "weeks_to_lebaran",
        "is_pre_lebaran",
        "is_post_lebaran",
        "is_year_end",
        "is_rainy_season",
        "is_school_holiday",
        "is_payday_week",
        "working_days",
    ],
}

# Kolom yang harus dapat dikonversi menjadi angka desimal.
DECIMAL_COLUMNS = {
    "inventory.csv": ["unit_cost"],
    "invoices.csv": [
        "subtotal",
        "parts_amount",
        "labor_amount",
        "paint_amount",
        "discount_amount",
        "net_amount",
        "tax_amount",
        "total_amount",
    ],
    "paint_materials.csv": [
        "quantity_required",
        "standard_price",
        "total_cost",
    ],
    "ppic_recommendations.csv": [
        "average_monthly_demand",
        "forecast_demand",
    ],
    "purchase_orders.csv": [
        "unit_cost",
        "total_amount",
    ],
    "repair_cost.csv": [
        "damage_percentage",
        "spare_part_cost",
        "labor_cost",
        "painting_cost",
        "additional_cost",
        "estimated_total_cost",
        "cost_min",
        "cost_max",
    ],
    "repair_orders.csv": [
        "damage_percentage",
        "estimated_repair_cost",
    ],
    "service_requests.csv": [
        "initial_estimated_cost",
    ],
    "suppliers.csv": [
        "reliability_score",
    ],
    "vehicle_demand_history_synthetic_v2.csv": [
        "average_repair_orders",
    ],
}

# Nilai kosong yang diperbolehkan untuk kolom opsional.
OPTIONAL_EMPTY = {
    "queue_number",
    "weeks_to_lebaran",
    "received_quantity",
    "year",
}


def is_valid_decimal(value):
    try:
        Decimal(value)
        return True
    except (InvalidOperation, ValueError):
        return False


def audit_file(filename, integer_columns, decimal_columns):
    path = DATA_DIR / filename

    if not path.exists():
        print(f"[FILE TIDAK DITEMUKAN] {filename}")
        return

    errors = []

    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)

        for row_number, row in enumerate(reader, start=2):
            for column in integer_columns:
                value = (row.get(column) or "").strip()

                if not value:
                    if column not in OPTIONAL_EMPTY:
                        errors.append(
                            (row_number, column, value, "Nilai kosong")
                        )
                    continue

                if not is_valid_decimal(value):
                    errors.append(
                        (row_number, column, value, "Bukan angka")
                    )
                    continue

                number = Decimal(value)

                if number != number.to_integral_value():
                    errors.append(
                        (row_number, column, value, "Bukan bilangan bulat")
                    )

            for column in decimal_columns:
                value = (row.get(column) or "").strip()

                if not value:
                    if column not in OPTIONAL_EMPTY:
                        errors.append(
                            (row_number, column, value, "Nilai kosong")
                        )
                    continue

                if not is_valid_decimal(value):
                    errors.append(
                        (row_number, column, value, "Bukan angka desimal")
                    )

    print(f"\nFILE: {filename}")

    if errors:
        print(f"[PERLU DIPERIKSA] {len(errors)} temuan")

        for row_number, column, value, reason in errors[:20]:
            print(
                f"  Baris {row_number}, kolom {column}, "
                f"nilai={value!r}: {reason}"
            )

        if len(errors) > 20:
            print(f"  ... dan {len(errors) - 20} temuan lainnya")
    else:
        print("[OK] Tidak ditemukan masalah numerik pada kolom yang diperiksa.")


def main():
    print("=" * 75)
    print("AUDIT NILAI NUMERIK DATASET SAVERA")
    print("=" * 75)

    files = sorted(set(INTEGER_COLUMNS) | set(DECIMAL_COLUMNS))

    for filename in files:
        audit_file(
            filename,
            INTEGER_COLUMNS.get(filename, []),
            DECIMAL_COLUMNS.get(filename, []),
        )


if __name__ == "__main__":
    main()
