from django.db import models
from django.conf import settings


# =========================================================
# 1. MASTER DATA
# =========================================================

class Customer(models.Model):
    customer_id = models.CharField(max_length=50, primary_key=True)
    customer_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=30, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    customer_type = models.CharField(max_length=50, blank=True, null=True)
    registration_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=30, blank=True, null=True)
    data_label = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = "customer_master"

    def __str__(self):
        return self.customer_name


class CustomerAccount(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="customer_account",
    )

    customer = models.OneToOneField(
        "Customer",
        on_delete=models.CASCADE,
        related_name="login_account",
        db_column="customer_id",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "customer_accounts"

    def __str__(self):
        return f"{self.user.username} - {self.customer.customer_id}"


class Vehicle(models.Model):
    vehicle_id = models.CharField(max_length=50, primary_key=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        db_column="customer_id",
        related_name="vehicles",
    )
    plate_number = models.CharField(max_length=20)
    brand = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.PositiveSmallIntegerField()
    vehicle_type = models.CharField(max_length=50, blank=True, null=True)
    transmission = models.CharField(max_length=30, blank=True, null=True)
    fuel_type = models.CharField(max_length=30, blank=True, null=True)
    data_label = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = "vehicle_master"

    def __str__(self):
        return f"{self.plate_number} - {self.brand} {self.model}"


class SparePart(models.Model):
    part_id = models.CharField(max_length=50, primary_key=True)
    part_name = models.CharField(max_length=150)
    brand = models.CharField(max_length=100, blank=True, null=True)
    model = models.CharField(max_length=100, blank=True, null=True)
    vehicle_part = models.CharField(max_length=100)
    part_category = models.CharField(max_length=100, blank=True, null=True)
    unit = models.CharField(max_length=30, default="unit")
    standard_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    data_label = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = "sparepart_master"

    def __str__(self):
        return self.part_name


class Supplier(models.Model):
    supplier_id = models.CharField(max_length=50, primary_key=True)
    supplier_name = models.CharField(max_length=150)
    supplier_type = models.CharField(max_length=50, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    contact_person = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=30, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    lead_time_min = models.PositiveIntegerField(blank=True, null=True)
    lead_time_max = models.PositiveIntegerField(blank=True, null=True)
    lead_time_days = models.PositiveIntegerField(default=0)
    reliability_score = models.DecimalField(max_digits=6, decimal_places=3, blank=True, null=True)
    payment_terms_days = models.PositiveIntegerField(blank=True, null=True)
    payment_terms = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=30, blank=True, null=True)
    data_label = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = "suppliers"

    def __str__(self):
        return self.supplier_name


# =========================================================
# 2. SERVICE REQUESTS
# =========================================================

class ServiceRequest(models.Model):
    service_request_id = models.CharField(max_length=50, primary_key=True)
    request_date = models.DateField(blank=True, null=True)

    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        db_column="customer_id",
        related_name="service_requests",
    )
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.PROTECT,
        db_column="vehicle_id",
        related_name="service_requests",
    )

    brand = models.CharField(max_length=100, blank=True, null=True)
    model = models.CharField(max_length=100, blank=True, null=True)
    year = models.PositiveSmallIntegerField(blank=True, null=True)
    plate_number = models.CharField(max_length=20, blank=True, null=True)
    customer_complaint = models.TextField(blank=True, null=True)
    service_type = models.CharField(max_length=100, blank=True, null=True)
    photo_count = models.PositiveIntegerField(default=0)
    initial_damage_area = models.CharField(max_length=150, blank=True, null=True)
    initial_damage_type = models.CharField(max_length=100, blank=True, null=True)
    initial_severity = models.CharField(max_length=50, blank=True, null=True)
    initial_estimated_cost = models.DecimalField(
        max_digits=14, decimal_places=2, blank=True, null=True
    )
    request_status = models.CharField(max_length=50, blank=True, null=True)
    workshop_notes = models.TextField(blank=True, null=True)
    data_label = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = "service_requests"

class ServiceRequestPhoto(models.Model):
    photo_id = models.BigAutoField(primary_key=True)

    service_request = models.ForeignKey(
        "ServiceRequest",
        on_delete=models.CASCADE,
        related_name="photos",
        db_column="service_request_id",
    )

    storage_path = models.CharField(
        max_length=500,
        unique=True,
    )
    original_filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100)
    file_size = models.PositiveIntegerField()

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_service_photos",
    )

    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "service_request_photos"
        ordering = ["uploaded_at"]

    def __str__(self):
        return (
            f"Foto {self.photo_id} - "
            f"{self.service_request.service_request_id}"
        )

    
# =========================================================
# 3. REPAIR ORDERS
# =========================================================

class RepairOrder(models.Model):
    repair_order_id = models.CharField(max_length=50, primary_key=True)

    service_request = models.ForeignKey(
        ServiceRequest,
        on_delete=models.PROTECT,
        db_column="service_request_id",
        related_name="repair_orders",
    )
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.PROTECT,
        db_column="vehicle_id",
        related_name="repair_orders",
    )
    part = models.ForeignKey(
        SparePart,
        on_delete=models.PROTECT,
        db_column="part_id",
        related_name="repair_orders",
        blank=True,
        null=True,
    )

    brand = models.CharField(max_length=100, blank=True, null=True)
    model = models.CharField(max_length=100, blank=True, null=True)
    year = models.PositiveSmallIntegerField(blank=True, null=True)
    vehicle_part = models.CharField(max_length=100, blank=True, null=True)
    part_name = models.CharField(max_length=150, blank=True, null=True)
    damage_type = models.CharField(max_length=100, blank=True, null=True)
    severity = models.CharField(max_length=50, blank=True, null=True)
    damage_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, blank=True, null=True
    )
    repair_action = models.CharField(max_length=50, blank=True, null=True)
    quantity_required = models.PositiveIntegerField(default=0)
    estimated_repair_cost = models.DecimalField(
        max_digits=14, decimal_places=2, blank=True, null=True
    )
    estimated_repair_days = models.PositiveIntegerField(default=0)
    priority = models.CharField(max_length=30, blank=True, null=True)
    status = models.CharField(max_length=50, blank=True, null=True)
    created_date = models.DateField(blank=True, null=True)
    scheduled_date = models.DateField(blank=True, null=True)
    completed_date = models.DateField(blank=True, null=True)
    data_label = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = "repair_orders"


# =========================================================
# 4. REPAIR QUEUE
# =========================================================

class RepairQueue(models.Model):
    queue_id = models.CharField(max_length=50, primary_key=True)

    repair_order = models.ForeignKey(
        RepairOrder,
        on_delete=models.PROTECT,
        db_column="repair_order_id",
        related_name="queue_entries",
    )
    service_request = models.ForeignKey(
        ServiceRequest,
        on_delete=models.PROTECT,
        db_column="service_request_id",
        related_name="queue_entries",
    )
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.PROTECT,
        db_column="vehicle_id",
        related_name="queue_entries",
    )

    plate_number = models.CharField(max_length=20, blank=True, null=True)
    brand = models.CharField(max_length=100, blank=True, null=True)
    model = models.CharField(max_length=100, blank=True, null=True)
    vehicle_part = models.CharField(max_length=100, blank=True, null=True)
    damage_type = models.CharField(max_length=100, blank=True, null=True)
    severity = models.CharField(max_length=50, blank=True, null=True)
    repair_action = models.CharField(max_length=50, blank=True, null=True)
    priority = models.CharField(max_length=30, blank=True, null=True)
    queue_number = models.PositiveIntegerField(blank=True, null=True)
    estimated_repair_days = models.PositiveIntegerField(default=0)
    estimated_waiting_days = models.PositiveIntegerField(default=0)
    scheduled_date = models.DateField(blank=True, null=True)
    actual_start_date = models.DateField(blank=True, null=True)
    actual_completion_date = models.DateField(blank=True, null=True)
    queue_status = models.CharField(max_length=50, blank=True, null=True)
    technician_status = models.CharField(max_length=50, blank=True, null=True)
    data_label = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = "repair_queue"


# =========================================================
# 5. REPAIR COST
# =========================================================

class RepairCost(models.Model):
    repair_cost_id = models.CharField(max_length=50, primary_key=True)

    repair_order = models.OneToOneField(
        "RepairOrder",
        on_delete=models.PROTECT,
        db_column="repair_order_id",
        related_name="repair_cost",
        null=True,
        blank=True,
    )

    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.PROTECT,
        db_column="vehicle_id",
        related_name="repair_costs",
    )

    brand = models.CharField(max_length=100, blank=True, null=True)
    model = models.CharField(max_length=100, blank=True, null=True)
    year = models.PositiveSmallIntegerField(blank=True, null=True)
    vehicle_part = models.CharField(max_length=100, blank=True, null=True)
    damage_type = models.CharField(max_length=100, blank=True, null=True)
    severity = models.CharField(max_length=50, blank=True, null=True)
    damage_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, blank=True, null=True
    )
    repair_action = models.CharField(max_length=50, blank=True, null=True)

    spare_part_cost = models.DecimalField(
        max_digits=14, decimal_places=2, default=0
    )
    labor_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    painting_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    additional_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    estimated_total_cost = models.DecimalField(
        max_digits=14, decimal_places=2, blank=True, null=True
    )
    cost_min = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True)
    cost_max = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True)
    data_label = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = "repair_cost"


# =========================================================
# 6. INVENTORY
# =========================================================

class Inventory(models.Model):
    inventory_id = models.CharField(max_length=50, primary_key=True)

    part = models.ForeignKey(
        SparePart,
        on_delete=models.PROTECT,
        db_column="part_id",
        related_name="inventory_records",
    )

    part_name = models.CharField(max_length=150, blank=True, null=True)
    brand = models.CharField(max_length=100, blank=True, null=True)
    model = models.CharField(max_length=100, blank=True, null=True)
    vehicle_part = models.CharField(max_length=100, blank=True, null=True)
    current_stock = models.PositiveIntegerField(default=0)
    reorder_point = models.PositiveIntegerField(default=0)
    safety_stock = models.PositiveIntegerField(default=0)
    unit = models.CharField(max_length=30, default="unit")
    location = models.CharField(max_length=100, blank=True, null=True)
    last_updated = models.DateField(blank=True, null=True)
    max_stock = models.PositiveIntegerField(default=0)
    lead_time_days = models.PositiveIntegerField(default=0)
    unit_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    data_label = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = "inventory"


class InventoryTransaction(models.Model):
    transaction_id = models.CharField(max_length=50, primary_key=True)

    part = models.ForeignKey(
        SparePart,
        on_delete=models.PROTECT,
        db_column="part_id",
        related_name="inventory_transactions",
    )

    transaction_date = models.DateField(blank=True, null=True)
    part_name = models.CharField(max_length=150, blank=True, null=True)
    transaction_type = models.CharField(max_length=50)
    quantity = models.PositiveIntegerField()
    unit = models.CharField(max_length=30, default="unit")
    reference_type = models.CharField(max_length=50, blank=True, null=True)
    reference_id = models.CharField(max_length=50, blank=True, null=True)
    balance_after = models.PositiveIntegerField(blank=True, null=True)
    unit_cost = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True)
    total_cost = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    data_label = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = "inventory_transactions"


# =========================================================
# 7. PROCUREMENT
# =========================================================

class PurchaseOrder(models.Model):
    po_id = models.CharField(max_length=50, primary_key=True)

    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        db_column="supplier_id",
        related_name="purchase_orders",
    )
    part = models.ForeignKey(
        SparePart,
        on_delete=models.PROTECT,
        db_column="part_id",
        related_name="purchase_orders",
    )

    po_date = models.DateField(blank=True, null=True)
    part_name = models.CharField(max_length=150, blank=True, null=True)
    brand = models.CharField(max_length=100, blank=True, null=True)
    model = models.CharField(max_length=100, blank=True, null=True)
    vehicle_part = models.CharField(max_length=100, blank=True, null=True)
    quantity = models.PositiveIntegerField()
    unit = models.CharField(max_length=30, default="unit")
    unit_cost = models.DecimalField(max_digits=14, decimal_places=2)
    total_cost = models.DecimalField(max_digits=14, decimal_places=2)
    po_type = models.CharField(max_length=50, blank=True, null=True)
    expected_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=50, blank=True, null=True)
    received_date = models.DateField(blank=True, null=True)
    received_quantity = models.PositiveIntegerField(default=0)
    reference_repair_order = models.CharField(max_length=50, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    data_label = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = "purchase_orders"


# =========================================================
# 8. PPIC RECOMMENDATIONS
# =========================================================

class PPICRecommendation(models.Model):
    recommendation_id = models.CharField(max_length=50, primary_key=True)

    part = models.ForeignKey(
        SparePart,
        on_delete=models.PROTECT,
        db_column="part_id",
        related_name="ppic_recommendations",
    )

    part_name = models.CharField(max_length=150, blank=True, null=True)
    brand = models.CharField(max_length=100, blank=True, null=True)
    model = models.CharField(max_length=100, blank=True, null=True)
    vehicle_part = models.CharField(max_length=100, blank=True, null=True)
    current_stock = models.PositiveIntegerField(default=0)
    reorder_point = models.PositiveIntegerField(default=0)
    safety_stock = models.PositiveIntegerField(default=0)
    average_monthly_demand = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    pending_po_quantity = models.PositiveIntegerField(default=0)
    forecast_demand = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    recommended_order_quantity = models.PositiveIntegerField(default=0)
    recommendation_status = models.CharField(max_length=50, blank=True, null=True)
    priority = models.CharField(max_length=30, blank=True, null=True)
    recommendation_date = models.DateField(blank=True, null=True)
    data_label = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = "ppic_recommendations"


# =========================================================
# 9. VEHICLE DEMAND HISTORY
# =========================================================

class VehicleDemandHistory(models.Model):
    demand_id = models.CharField(max_length=50, primary_key=True)

    part = models.ForeignKey(
        SparePart,
        on_delete=models.PROTECT,
        db_column="part_id",
        related_name="demand_history",
    )

    period = models.CharField(max_length=30)
    part_name = models.CharField(max_length=150, blank=True, null=True)
    brand = models.CharField(max_length=100, blank=True, null=True)
    model = models.CharField(max_length=100, blank=True, null=True)
    vehicle_part = models.CharField(max_length=100, blank=True, null=True)
    quantity_demanded = models.PositiveIntegerField(default=0)
    quantity_used = models.PositiveIntegerField(default=0)
    average_repair_orders = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    stockout_days = models.PositiveIntegerField(default=0)
    data_label = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = "vehicle_demand_history"


# =========================================================
# 10. PAINT MATERIALS
# =========================================================

class PaintMaterial(models.Model):
    paint_material_id = models.CharField(max_length=50, primary_key=True)

    repair_order = models.ForeignKey(
        "RepairOrder",
        on_delete=models.PROTECT,
        db_column="repair_order_id",
        related_name="paint_materials",
        null=True,
        blank=True,
    )

    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.PROTECT,
        db_column="vehicle_id",
        related_name="paint_materials",
    )

    brand = models.CharField(max_length=100, blank=True, null=True)
    model = models.CharField(max_length=100, blank=True, null=True)
    vehicle_part = models.CharField(max_length=100, blank=True, null=True)
    vehicle_color = models.CharField(max_length=50, blank=True, null=True)
    paint_code = models.CharField(max_length=50, blank=True, null=True)
    paint_type = models.CharField(max_length=50, blank=True, null=True)
    material_type = models.CharField(max_length=50, blank=True, null=True)
    material_name = models.CharField(max_length=150)
    unit = models.CharField(max_length=30)
    quantity_required = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    standard_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    data_label = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = "paint_materials"


# =========================================================
# 11. INVOICES
# =========================================================

class Invoice(models.Model):
    invoice_id = models.CharField(max_length=50, primary_key=True)
    repair_order = models.ForeignKey(
        RepairOrder, on_delete=models.PROTECT, db_column="repair_order_id",
        related_name="invoices"
    )
    service_request = models.ForeignKey(
        ServiceRequest, on_delete=models.PROTECT, db_column="service_request_id",
        related_name="invoices"
    )
    customer = models.ForeignKey(
        Customer, on_delete=models.PROTECT, db_column="customer_id",
        related_name="invoices"
    )
    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.PROTECT, db_column="vehicle_id",
        related_name="invoices"
    )
    invoice_date = models.DateField()
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    parts_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    labor_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    paint_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    payment_status = models.CharField(max_length=50, blank=True, null=True)
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    payment_date = models.DateField(blank=True, null=True)
    data_label = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = "invoices"


# =========================================================
# 12. EXTERNAL FACTORS
# =========================================================

class ExternalFactor(models.Model):
    week_start = models.DateField(primary_key=True)
    is_lebaran_week = models.BooleanField(default=False)
    weeks_to_lebaran = models.IntegerField(blank=True, null=True)
    is_pre_lebaran = models.BooleanField(default=False)
    is_post_lebaran = models.BooleanField(default=False)
    is_year_end = models.BooleanField(default=False)
    is_rainy_season = models.BooleanField(default=False)
    is_school_holiday = models.BooleanField(default=False)
    is_payday_week = models.BooleanField(default=False)
    working_days = models.PositiveSmallIntegerField(default=0)
    data_label = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = "external_factors"

