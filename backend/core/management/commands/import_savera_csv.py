import csv
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.dateparse import parse_date

from core.models import (
    Customer,
    Vehicle,
    Supplier,
    SparePart,
    ServiceRequest,
    RepairOrder,
    RepairQueue,
    RepairCost,
    Inventory,
    InventoryTransaction,
    PurchaseOrder,
    PPICRecommendation,
    VehicleDemandHistory,
    PaintMaterial,
    Invoice,
    ExternalFactor,
)


class Command(BaseCommand):
    help = (
        "Validasi atau impor dataset CSV SAVERA dari ../datasets/new. "
        "Impor sungguhan hanya diizinkan jika tabel target masih kosong."
    )

    CHUNK_SIZE = 1000

    def add_arguments(self, parser):
        parser.add_argument(
            "--data-dir",
            default=None,
            help="Folder CSV. Default: <root proyek>/datasets/new",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validasi file, kolom, tipe data, dan relasi tanpa menulis ke database.",
        )

    def handle(self, *args, **options):
        data_dir = (
            Path(options["data_dir"]).resolve()
            if options["data_dir"]
            else Path(__file__).resolve().parents[4] / "datasets" / "new"
        )

        if not data_dir.is_dir():
            raise CommandError(f"Folder dataset tidak ditemukan: {data_dir}")

        self.stdout.write(f"Folder dataset: {data_dir}")
        self.stdout.write("Membaca dan memvalidasi semua CSV...")

        specs = self.build_specs(data_dir)
        prepared = {}
        for key, spec in specs.items():
            path = data_dir / spec["file"]
            if not path.is_file():
                raise CommandError(f"File wajib tidak ditemukan: {path}")
            rows = self.read_csv(path)
            self.check_columns(path.name, rows, spec["columns"])
            prepared[key] = (spec, rows)

        # Validasi seluruh ID dan relasi sebelum ada perubahan database.
        self.validate_rows(prepared)

        self.stdout.write(self.style.SUCCESS("Validasi CSV dan relasi berhasil."))
        for key, (spec, rows) in prepared.items():
            self.stdout.write(f"  {spec['file']}: {len(rows):,} baris")

        if options["dry_run"]:
            self.stdout.write(
                self.style.SUCCESS(
                    "DRY RUN selesai: database tidak diubah. "
                    "Periksa juga bahwa migration sudah diterapkan sebelum impor sungguhan."
                )
            )
            return

        # Sengaja tidak melakukan upsert. Ini mencegah duplikasi atau campuran
        # dataset baru dengan data lama. Jalankan impor setelah reset/migrasi.
        models = [spec["model"] for spec, _ in prepared.values()]
        nonempty = []
        for model in models:
            if model.objects.exists():
                nonempty.append(model._meta.db_table)
        if nonempty:
            raise CommandError(
                "Impor dibatalkan karena tabel target berikut tidak kosong: "
                + ", ".join(nonempty)
                + ". Jangan menghapus data otomatis dari importer. Pastikan reset "
                  "database dan migrasi telah dilakukan secara terencana, lalu ulangi."
            )

        with transaction.atomic():
            for key, (spec, rows) in prepared.items():
                objects = [spec["build"](row) for row in rows]
                spec["model"].objects.bulk_create(
                    objects, batch_size=self.CHUNK_SIZE
                )
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Diimpor {spec['file']}: {len(objects):,} baris"
                    )
                )

        self.stdout.write(self.style.SUCCESS("Impor seluruh dataset SAVERA berhasil."))

    @staticmethod
    def clean(value):
        if value is None:
            return None
        value = str(value).strip()
        if value == "" or value.lower() in {"nan", "nat", "null", "none"}:
            return None
        return value

    @classmethod
    def text(cls, row, key, default=None):
        value = cls.clean(row.get(key))
        return default if value is None else value

    @classmethod
    def integer(cls, row, key, default=None):
        value = cls.clean(row.get(key))
        if value is None:
            return default
        try:
            return int(float(value))
        except (TypeError, ValueError, OverflowError):
            raise ValueError(f"kolom {key} harus berupa bilangan bulat, ditemukan {value!r}")

    @classmethod
    def decimal(cls, row, key, default=None):
        value = cls.clean(row.get(key))
        if value is None:
            return default
        try:
            return Decimal(value)
        except (InvalidOperation, ValueError):
            raise ValueError(f"kolom {key} harus berupa angka desimal, ditemukan {value!r}")

    @classmethod
    def date_value(cls, row, key, default=None):
        value = cls.clean(row.get(key))
        if value is None:
            return default
        parsed = parse_date(value[:10])
        if parsed is None:
            raise ValueError(f"kolom {key} harus berupa tanggal YYYY-MM-DD, ditemukan {value!r}")
        return parsed

    @classmethod
    def month_date_value(cls, row, key, default=None):
        value = cls.clean(row.get(key))
        if value is None:
            return default

        # Format periode bulanan: YYYY-MM
        if len(value) == 7 and value[4] == "-":
            try:
                year, month = map(int, value.split("-"))
                return date(year, month, 1)
            except (ValueError, TypeError):
                raise ValueError(
                    f"kolom {key} harus berupa YYYY-MM atau YYYY-MM-DD, "
                    f"ditemukan {value!r}"
                )

        # Tetap mendukung tanggal lengkap.
        parsed = parse_date(value[:10])
        if parsed is None:
            raise ValueError(
                f"kolom {key} harus berupa YYYY-MM atau YYYY-MM-DD, "
                f"ditemukan {value!r}"
            )
        return parsed

    @classmethod
    def boolean(cls, row, key, default=False):
        value = cls.clean(row.get(key))
        if value is None:
            return default
        normalized = value.lower()
        if normalized in {"true", "1", "yes", "y", "t"}:
            return True
        if normalized in {"false", "0", "no", "n", "f"}:
            return False
        raise ValueError(f"kolom {key} harus berupa boolean, ditemukan {value!r}")

    @staticmethod
    def read_csv(path):
        class CSVRows(list):
            fieldnames = None

        try:
            with path.open("r", encoding="utf-8-sig", newline="") as handle:
                reader = csv.DictReader(handle)
                if not reader.fieldnames:
                    raise CommandError(f"CSV tidak memiliki header: {path.name}")
                rows = CSVRows()
                rows.fieldnames = list(reader.fieldnames)
                for line_number, row in enumerate(reader, start=2):
                    row["__line__"] = line_number
                    rows.append(row)
                return rows
        except UnicodeDecodeError as exc:
            raise CommandError(f"Encoding CSV tidak valid untuk {path.name}: {exc}") from exc

    @staticmethod
    def check_columns(filename, rows, required):
        # Header disimpan sebagai key pada setiap row; untuk file kosong header
        # dibaca melalui row tidak tersedia, sehingga validasi header dilakukan
        # di read_csv melalui atribut yang ditambahkan di bawah.
        actual = getattr(rows, "fieldnames", None)
        if actual is None and rows:
            actual = [key for key in rows[0].keys() if key != "__line__"]
        if actual is None:
            # File kosong tidak dapat membuktikan keberadaan kolom wajib.
            raise CommandError(f"{filename}: file kosong; header/kolom tidak dapat diverifikasi.")
        missing = sorted(set(required) - set(actual))
        if missing:
            raise CommandError(f"{filename}: kolom wajib tidak ditemukan: {', '.join(missing)}")

    def build_specs(self, data_dir):
        t, i, d, dt, b = self.text, self.integer, self.decimal, self.date_value, self.boolean
        label = lambda r: t(r, "data_label")
        return {
            "customers": {
                "file": "customer_master.csv", "model": Customer,
                "columns": ["customer_id", "customer_name", "data_label"],
                "build": lambda r: Customer(
                    customer_id=t(r, "customer_id"),
                    customer_name=t(r, "customer_name", ""),
                    customer_type=t(r, "customer_type"),
                    city=t(r, "city"),
                    phone=t(r, "phone"),
                    registration_date=dt(r, "registration_date"),
                    data_label=label(r),
                ),
            },
            "vehicles": {
                "file": "vehicle_master.csv", "model": Vehicle,
                "columns": ["vehicle_id", "customer_id", "plate_number", "brand", "model", "year"],
                "build": lambda r: Vehicle(
                    vehicle_id=t(r, "vehicle_id"),
                    customer_id=t(r, "customer_id"),
                    plate_number=t(r, "plate_number", ""),
                    brand=t(r, "brand", ""),
                    model=t(r, "model", ""),
                    year=i(r, "year"),
                    vehicle_type=t(r, "vehicle_class"),
                    data_label=label(r),
                ),
            },
            "suppliers": {
                "file": "suppliers.csv", "model": Supplier,
                "columns": ["supplier_id", "supplier_name", "data_label"],
                "build": lambda r: Supplier(
                    supplier_id=t(r, "supplier_id"),
                    supplier_name=t(r, "supplier_name", ""),
                    city=t(r, "city"),
                    lead_time_min=i(r, "lead_time_min"),
                    lead_time_max=i(r, "lead_time_max"),
                    lead_time_days=i(r, "lead_time_days", 0),
                    reliability_score=d(r, "reliability_score"),
                    payment_terms_days=i(r, "payment_terms_days"),
                    data_label=label(r),
                ),
            },
            "spareparts": {
                "file": "inventory.csv", "model": SparePart,
                "columns": ["part_id", "part_name", "unit_cost", "data_label"],
                "build": lambda r: SparePart(
                    part_id=t(r, "part_id"),
                    part_name=t(r, "part_name", ""),
                    brand=t(r, "brand"),
                    model=t(r, "model"),
                    vehicle_part=t(r, "vehicle_part"),
                    standard_price=d(r, "unit_cost", Decimal("0")),
                    data_label=label(r),
                ),
            },
            "service_requests": {
                "file": "service_requests.csv", "model": ServiceRequest,
                "columns": ["service_request_id", "customer_id", "vehicle_id", "data_label"],
                "build": lambda r: ServiceRequest(
                    service_request_id=t(r, "service_request_id"),
                    request_date=dt(r, "request_date"),
                    customer_id=t(r, "customer_id"),
                    vehicle_id=t(r, "vehicle_id"),
                    brand=t(r, "brand"),
                    model=t(r, "model"),
                    year=i(r, "year"),
                    plate_number=t(r, "plate_number"),
                    customer_complaint=t(r, "customer_complaint"),
                    service_type=t(r, "service_type"),
                    photo_count=i(r, "photo_count", 0),
                    initial_damage_area=t(r, "initial_damage_area"),
                    initial_damage_type=t(r, "initial_damage_type"),
                    initial_severity=t(r, "initial_severity"),
                    initial_estimated_cost=d(r, "initial_estimated_cost"),
                    request_status=t(r, "request_status"),
                    workshop_notes=t(r, "workshop_notes"),
                    data_label=label(r),
                ),
            },
            "repair_orders": {
                "file": "repair_orders.csv", "model": RepairOrder,
                "columns": ["repair_order_id", "service_request_id", "vehicle_id", "part_id", "data_label"],
                "build": lambda r: RepairOrder(
                    repair_order_id=t(r, "repair_order_id"),
                    service_request_id=t(r, "service_request_id"),
                    vehicle_id=t(r, "vehicle_id"),
                    part_id=(
                        None if (t(r, "part_id") or "").upper() in {"NOT_REQUIRED", "N/A", "NA"}
                        else t(r, "part_id")
                    ),
                    brand=t(r, "brand"),
                    model=t(r, "model"),
                    year=i(r, "year"),
                    vehicle_part=t(r, "vehicle_part"),
                    part_name=t(r, "part_name"),
                    damage_type=t(r, "damage_type"),
                    severity=t(r, "severity"),
                    damage_percentage=d(r, "damage_percentage"),
                    repair_action=t(r, "repair_action"),
                    quantity_required=i(r, "quantity_required", 0),
                    estimated_repair_cost=d(r, "estimated_repair_cost", Decimal("0")),
                    estimated_repair_days=i(r, "estimated_repair_days", 0),
                    priority=t(r, "priority"),
                    status=t(r, "status"),
                    created_date=dt(r, "created_date"),
                    scheduled_date=dt(r, "scheduled_date"),
                    completed_date=dt(r, "completed_date"),
                    data_label=label(r),
                ),
            },
            "repair_queue": {
                "file": "repair_queue.csv", "model": RepairQueue,
                "columns": ["queue_id", "repair_order_id", "service_request_id", "vehicle_id", "data_label"],
                "build": lambda r: RepairQueue(
                    queue_id=t(r, "queue_id"),
                    repair_order_id=t(r, "repair_order_id"),
                    service_request_id=t(r, "service_request_id"),
                    vehicle_id=t(r, "vehicle_id"),
                    plate_number=t(r, "plate_number"),
                    brand=t(r, "brand"),
                    model=t(r, "model"),
                    vehicle_part=t(r, "vehicle_part"),
                    damage_type=t(r, "damage_type"),
                    severity=t(r, "severity"),
                    repair_action=t(r, "repair_action"),
                    priority=t(r, "priority"),
                    queue_number=i(r, "queue_number"),
                    estimated_repair_days=i(r, "estimated_repair_days", 0),
                    estimated_waiting_days=i(r, "estimated_waiting_days", 0),
                    scheduled_date=dt(r, "scheduled_date"),
                    actual_start_date=dt(r, "actual_start_date"),
                    actual_completion_date=dt(r, "actual_completion_date"),
                    queue_status=t(r, "queue_status"),
                    technician_status=t(r, "technician_status"),
                    data_label=label(r),
                ),
            },
            "repair_cost": {
                "file": "repair_cost.csv", "model": RepairCost,
                "columns": ["repair_cost_id", "repair_order_id", "vehicle_id", "data_label"],
                "build": lambda r: RepairCost(
                    repair_cost_id=t(r, "repair_cost_id"),
                    repair_order_id=t(r, "repair_order_id"),
                    vehicle_id=t(r, "vehicle_id"),
                    brand=t(r, "brand"),
                    model=t(r, "model"),
                    year=i(r, "year"),
                    vehicle_part=t(r, "vehicle_part"),
                    damage_type=t(r, "damage_type"),
                    severity=t(r, "severity"),
                    damage_percentage=d(r, "damage_percentage"),
                    repair_action=t(r, "repair_action"),
                    spare_part_cost=d(r, "spare_part_cost", Decimal("0")),
                    labor_cost=d(r, "labor_cost", Decimal("0")),
                    painting_cost=d(r, "painting_cost", Decimal("0")),
                    additional_cost=d(r, "additional_cost", Decimal("0")),
                    estimated_total_cost=d(r, "estimated_total_cost"),
                    cost_min=d(r, "cost_min"),
                    cost_max=d(r, "cost_max"),
                    data_label=label(r),
                ),
            },
            "inventory": {
                "file": "inventory.csv", "model": Inventory,
                "columns": ["part_id", "part_name", "current_stock", "data_label"],
                "build": lambda r: Inventory(
                    inventory_id=f"INV-{t(r, 'part_id')}",
                    part_id=t(r, "part_id"),
                    part_name=t(r, "part_name"),
                    brand=t(r, "brand"),
                    model=t(r, "model"),
                    vehicle_part=t(r, "vehicle_part"),
                    current_stock=i(r, "current_stock", 0),
                    reorder_point=i(r, "reorder_point", 0),
                    safety_stock=i(r, "safety_stock", 0),
                    max_stock=i(r, "max_stock", 0),
                    lead_time_days=i(r, "lead_time_days", 0),
                    unit_cost=d(r, "unit_cost", Decimal("0")),
                    last_updated=dt(r, "last_updated"),
                    data_label=label(r),
                ),
            },
            "inventory_transactions": {
                "file": "inventory_transactions.csv", "model": InventoryTransaction,
                "columns": ["transaction_id", "transaction_date", "part_id", "transaction_type", "quantity", "data_label"],
                "build": lambda r: InventoryTransaction(
                    transaction_id=t(r, "transaction_id"),
                    transaction_date=dt(r, "transaction_date"),
                    part_id=t(r, "part_id"),
                    part_name=t(r, "part_name"),
                    transaction_type=t(r, "transaction_type"),
                    quantity=i(r, "quantity", 0),
                    reference_id=t(r, "reference_id"),
                    balance_after=i(r, "balance_after"),
                    data_label=label(r),
                ),
            },
            "purchase_orders": {
                "file": "purchase_orders.csv", "model": PurchaseOrder,
                "columns": ["po_id", "supplier_id", "part_id", "po_date", "quantity_ordered", "data_label"],
                "build": lambda r: PurchaseOrder(
                    po_id=t(r, "po_id"),
                    supplier_id=t(r, "supplier_id"),
                    part_id=t(r, "part_id"),
                    po_date=dt(r, "po_date"),
                    part_name=t(r, "part_name"),
                    brand=t(r, "brand"),
                    model=t(r, "model"),
                    vehicle_part=t(r, "vehicle_part"),
                    quantity=i(r, "quantity_ordered", 0),
                    unit_cost=d(r, "unit_cost", Decimal("0")),
                    total_cost=d(r, "total_amount", Decimal("0")),
                    po_type=t(r, "po_type"),
                    expected_date=dt(r, "expected_date"),
                    status=t(r, "status"),
                    received_date=dt(r, "received_date"),
                    received_quantity=i(r, "received_quantity", 0),
                    data_label=label(r),
                ),
            },
            "ppic_recommendations": {
                "file": "ppic_recommendations.csv", "model": PPICRecommendation,
                "columns": ["recommendation_id", "part_id", "recommendation_date", "data_label"],
                "build": lambda r: PPICRecommendation(
                    recommendation_id=t(r, "recommendation_id"),
                    part_id=t(r, "part_id"),
                    part_name=t(r, "part_name"),
                    brand=t(r, "brand"),
                    model=t(r, "model"),
                    vehicle_part=t(r, "vehicle_part"),
                    current_stock=i(r, "current_stock", 0),
                    reorder_point=i(r, "reorder_point", 0),
                    safety_stock=i(r, "safety_stock", 0),
                    average_monthly_demand=d(r, "average_monthly_demand", Decimal("0")),
                    pending_po_quantity=i(r, "pending_po_quantity", 0),
                    forecast_demand=d(r, "forecast_demand", Decimal("0")),
                    recommended_order_quantity=i(r, "recommended_order_quantity", 0),
                    recommendation_status=t(r, "recommendation_status"),
                    priority=t(r, "priority"),
                    recommendation_date=dt(r, "recommendation_date"),
                    data_label=label(r),
                ),
            },
            "vehicle_demand_history": {
                "file": "vehicle_demand_history_synthetic_v2.csv", "model": VehicleDemandHistory,
                "columns": ["demand_id", "period", "part_id", "quantity_demanded", "data_label"],
                "build": lambda r: VehicleDemandHistory(
                    demand_id=t(r, "demand_id"),
                    period=t(r, "period"),
                    part_id=t(r, "part_id"),
                    part_name=t(r, "part_name"),
                    brand=t(r, "brand"),
                    model=t(r, "model"),
                    vehicle_part=t(r, "vehicle_part"),
                    quantity_demanded=i(r, "quantity_demanded", 0),
                    quantity_used=i(r, "quantity_used", 0),
                    average_repair_orders=d(r, "average_repair_orders", Decimal("0")),
                    stockout_days=i(r, "stockout_days", 0),
                    data_label=label(r),
                ),
            },
            "paint_materials": {
                "file": "paint_materials.csv", "model": PaintMaterial,
                "columns": ["paint_material_id", "repair_order_id", "vehicle_id", "data_label"],
                "build": lambda r: PaintMaterial(
                    paint_material_id=t(r, "paint_material_id"),
                    repair_order_id=t(r, "repair_order_id"),
                    vehicle_id=t(r, "vehicle_id"),
                    brand=t(r, "brand"),
                    model=t(r, "model"),
                    vehicle_part=t(r, "vehicle_part"),
                    vehicle_color=t(r, "vehicle_color"),
                    paint_code=t(r, "paint_code"),
                    paint_type=t(r, "paint_type"),
                    material_type=t(r, "material_type"),
                    material_name=t(r, "material_name"),
                    unit=t(r, "unit", "unit"),
                    quantity_required=d(r, "quantity_required", Decimal("0")),
                    standard_price=d(r, "standard_price", Decimal("0")),
                    total_cost=d(r, "total_cost", Decimal("0")),
                    data_label=label(r),
                ),
            },
            "invoices": {
                "file": "invoices.csv", "model": Invoice,
                "columns": ["invoice_id", "repair_order_id", "service_request_id", "customer_id", "vehicle_id", "invoice_date", "data_label"],
                "build": lambda r: Invoice(
                    invoice_id=t(r, "invoice_id"),
                    repair_order_id=t(r, "repair_order_id"),
                    service_request_id=t(r, "service_request_id"),
                    customer_id=t(r, "customer_id"),
                    vehicle_id=t(r, "vehicle_id"),
                    invoice_date=dt(r, "invoice_date"),
                    subtotal=d(r, "subtotal", Decimal("0")),
                    parts_amount=d(r, "parts_amount", Decimal("0")),
                    labor_amount=d(r, "labor_amount", Decimal("0")),
                    paint_amount=d(r, "paint_amount", Decimal("0")),
                    discount_amount=d(r, "discount_amount", Decimal("0")),
                    net_amount=d(r, "net_amount", Decimal("0")),
                    tax_amount=d(r, "tax_amount", Decimal("0")),
                    total_amount=d(r, "total_amount", Decimal("0")),
                    payment_status=t(r, "payment_status"),
                    payment_method=t(r, "payment_method"),
                    payment_date=dt(r, "payment_date"),
                    data_label=label(r),
                ),
            },
            "external_factors": {
                "file": "external_factors.csv", "model": ExternalFactor,
                "columns": ["week_start", "data_label"],
                "build": lambda r: ExternalFactor(
                    week_start=dt(r, "week_start"),
                    is_lebaran_week=b(r, "is_lebaran_week"),
                    weeks_to_lebaran=i(r, "weeks_to_lebaran"),
                    is_pre_lebaran=b(r, "is_pre_lebaran"),
                    is_post_lebaran=b(r, "is_post_lebaran"),
                    is_year_end=b(r, "is_year_end"),
                    is_rainy_season=b(r, "is_rainy_season"),
                    is_school_holiday=b(r, "is_school_holiday"),
                    is_payday_week=b(r, "is_payday_week"),
                    working_days=i(r, "working_days", 0),
                    data_label=label(r),
                ),
            },
        }

    def validate_rows(self, prepared):
        # Pemeriksaan duplikasi primary key di dalam file CSV.
        for key, (spec, rows) in prepared.items():
            pk_name = spec["model"]._meta.pk.attname
            seen = set()
            for row in rows:
                raw_pk = self.clean(row.get(pk_name))
                if key == "inventory":
                    raw_pk = f"INV-{self.clean(row.get('part_id'))}"
                if raw_pk is None:
                    raise CommandError(
                        f"{spec['file']} baris {row['__line__']}: primary key {pk_name} kosong."
                    )
                if raw_pk in seen:
                    raise CommandError(
                        f"{spec['file']} baris {row['__line__']}: primary key duplikat {raw_pk!r}."
                    )
                seen.add(raw_pk)

        # Bangun set ID dari CSV untuk memeriksa foreign key sebelum import.
        id_sets = {}
        for key, (spec, rows) in prepared.items():
            model = spec["model"]
            pk = model._meta.pk.attname
            if key == "inventory":
                id_sets[key] = {f"INV-{self.clean(r.get('part_id'))}" for r in rows}
            else:
                id_sets[key] = {self.clean(r.get(pk)) for r in rows}

        refs = [
            ("vehicles", "customer_id", "customers", "customer_id", "vehicle_master.csv"),
            ("service_requests", "customer_id", "customers", "customer_id", "service_requests.csv"),
            ("service_requests", "vehicle_id", "vehicles", "vehicle_id", "service_requests.csv"),
            ("repair_orders", "service_request_id", "service_requests", "service_request_id", "repair_orders.csv"),
            ("repair_orders", "vehicle_id", "vehicles", "vehicle_id", "repair_orders.csv"),
            ("repair_orders", "part_id", "spareparts", "part_id", "repair_orders.csv"),
            ("repair_queue", "repair_order_id", "repair_orders", "repair_order_id", "repair_queue.csv"),
            ("repair_queue", "service_request_id", "service_requests", "service_request_id", "repair_queue.csv"),
            ("repair_queue", "vehicle_id", "vehicles", "vehicle_id", "repair_queue.csv"),
            ("repair_cost", "repair_order_id", "repair_orders", "repair_order_id", "repair_cost.csv"),
            ("repair_cost", "vehicle_id", "vehicles", "vehicle_id", "repair_cost.csv"),
            ("inventory", "part_id", "spareparts", "part_id", "inventory.csv"),
            ("inventory_transactions", "part_id", "spareparts", "part_id", "inventory_transactions.csv"),
            ("purchase_orders", "supplier_id", "suppliers", "supplier_id", "purchase_orders.csv"),
            ("purchase_orders", "part_id", "spareparts", "part_id", "purchase_orders.csv"),
            ("ppic_recommendations", "part_id", "spareparts", "part_id", "ppic_recommendations.csv"),
            ("vehicle_demand_history", "part_id", "spareparts", "part_id", "vehicle_demand_history_synthetic_v2.csv"),
            ("paint_materials", "repair_order_id", "repair_orders", "repair_order_id", "paint_materials.csv"),
            ("paint_materials", "vehicle_id", "vehicles", "vehicle_id", "paint_materials.csv"),
            ("invoices", "repair_order_id", "repair_orders", "repair_order_id", "invoices.csv"),
            ("invoices", "service_request_id", "service_requests", "service_request_id", "invoices.csv"),
            ("invoices", "customer_id", "customers", "customer_id", "invoices.csv"),
            ("invoices", "vehicle_id", "vehicles", "vehicle_id", "invoices.csv"),
        ]

        for child_key, field, parent_key, parent_pk, filename in refs:
            spec, rows = prepared[child_key]
            parent_ids = id_sets[parent_key]
            for row in rows:
                value = self.clean(row.get(field))
                if field == "part_id" and child_key == "repair_orders" and (
                    value is None or value.upper() in {"NOT_REQUIRED", "N/A", "NA"}
                ):
                    continue
                if value is None or value not in parent_ids:
                    raise CommandError(
                        f"{filename} baris {row['__line__']}: {field}={value!r} "
                        f"tidak ditemukan pada dataset {parent_key}."
                    )

        # Periksa nilai tanggal/angka/boolean dengan membangun objek di memori.
        for key, (spec, rows) in prepared.items():
            for row in rows:
                try:
                    spec["build"](row)
                except (ValueError, TypeError, InvalidOperation) as exc:
                    raise CommandError(
                        f"{spec['file']} baris {row['__line__']}: {exc}"
                    ) from exc
