from flask import Blueprint, request, jsonify
from models import db, User, Shop, Product, Order
import jwt
import os

shopkeeper_bp = Blueprint('shopkeeper', __name__)


# ===========================================
# GET CURRENT USER
# ===========================================

def get_current_user():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")

    if not token:
        return None

    try:
        payload = jwt.decode(
            token,
            os.getenv("SECRET_KEY", "fallback-secret-key-123"),
            algorithms=["HS256"]
        )

        return db.session.get(User, payload["user_id"])

    except jwt.PyJWTError:
        return None


# ===========================================
# DASHBOARD
# ===========================================

@shopkeeper_bp.route("/dashboard", methods=["GET"])
def dashboard():

    user = get_current_user()

    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    shop = db.session.scalars(
        db.select(Shop).filter_by(owner_id=user.id)
    ).first()

    if not shop:
        return jsonify({"error": "Shop not found"}), 404

    products = db.session.scalars(
        db.select(Product).filter_by(shop_id=shop.id)
    ).all()

    # -----------------------------------
    # TOTAL STOCK
    # Example:
    # 199 + 100 + 50 = 349
    # -----------------------------------

    total_stock = sum(product.quantity for product in products)

    # -----------------------------------
    # TOTAL PRODUCT PRICE
    # Example:
    # 50 + 50 + 35.5 = 135.5
    # -----------------------------------

    total_product_price = round(
        sum(product.price for product in products),
        2
    )

    # -----------------------------------
    # INVENTORY VALUE
    # Example:
    # (199×50)+(100×50)+(50×35.5)=16725
    # -----------------------------------

    inventory_value = round(
        sum(product.price * product.quantity for product in products),
        2
    )

    # -----------------------------------
    # LOW STOCK ITEMS
    # -----------------------------------

    low_stock_count = sum(
        1
        for product in products
        if product.quantity <= 5
    )

    return jsonify({

        "total_stock": total_stock,

        "total_product_price": total_product_price,

        "inventory_value": inventory_value,

        "low_stock_count": low_stock_count

    }), 200


# ===========================================
# GET PRODUCTS
# ===========================================

@shopkeeper_bp.route("/products", methods=["GET"])
def get_shopkeeper_products():

    user = get_current_user()

    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    shop = db.session.scalars(
        db.select(Shop).filter_by(owner_id=user.id)
    ).first()

    if not shop:
        return jsonify({"error": "Shop not found"}), 404

    products = db.session.scalars(
        db.select(Product).filter_by(shop_id=shop.id)
    ).all()

    return jsonify([

        {
            "id": product.id,
            "name": product.name,
            "category": product.category,
            "price": product.price,
            "quantity": product.quantity
        }

        for product in products

    ]), 200


# ===========================================
# ADD PRODUCT
# ===========================================

@shopkeeper_bp.route("/products", methods=["POST"])
def add_product():

    user = get_current_user()

    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    shop = db.session.scalars(
        db.select(Shop).filter_by(owner_id=user.id)
    ).first()

    if not shop:
        return jsonify({"error": "Shop not found"}), 404

    data = request.get_json()

    if not data:
        return jsonify({"error": "Invalid data"}), 400

    product = Product(

        shop_id=shop.id,

        name=data["name"],

        category=data["category"],

        price=float(data["price"]),

        quantity=int(data["quantity"])

    )

    db.session.add(product)

    db.session.commit()

    return jsonify({

        "message": "Product added successfully",

        "id": product.id

    }), 201


# ===========================================
# DELETE PRODUCT
# ===========================================

@shopkeeper_bp.route("/products/<int:id>", methods=["DELETE"])
def delete_product(id):

    user = get_current_user()

    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    shop = db.session.scalars(
        db.select(Shop).filter_by(owner_id=user.id)
    ).first()

    if not shop:
        return jsonify({"error": "Shop not found"}), 404

    product = db.session.get(Product, id)

    if not product:
        return jsonify({"error": "Product not found"}), 404

    if product.shop_id != shop.id:
        return jsonify({"error": "Unauthorized"}), 403

    db.session.delete(product)

    db.session.commit()

    return jsonify({

        "message": "Deleted"

    }), 200


# ===========================================
# GET ORDERS
# ===========================================

@shopkeeper_bp.route("/orders", methods=["GET"])
def get_orders():

    user = get_current_user()

    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    shop = db.session.scalars(
        db.select(Shop).filter_by(owner_id=user.id)
    ).first()

    if not shop:
        return jsonify({"error": "Shop not found"}), 404

    orders = db.session.scalars(
        db.select(Order)
        .filter_by(shop_id=shop.id)
        .order_by(Order.created_at.desc())
    ).all()

    order_list = []

    for order in orders:

        items = []

        for item in order.items:

            items.append({
                "product": item.product_ref.name,
                "quantity": item.quantity,
                "price": item.price
            })

        order_list.append({

            "id": order.id,

            "customer_name": order.customer.name,

            "shop_name": shop.name,

            "status": order.status,

            "payment_status": order.payment_status,

            "total_price": order.total_price,

            "created_at": order.created_at.strftime("%d-%m-%Y %I:%M %p"),

            "items": items

        })

    return jsonify(order_list), 200

# ===========================================
# MARK DELIVERED
# ===========================================

@shopkeeper_bp.route("/orders/<int:id>/deliver", methods=["POST"])
def mark_delivered(id):

    user = get_current_user()

    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    order = db.session.get(Order, id)

    if not order:
        return jsonify({"error": "Order not found"}), 404

    order.status = "Delivered"

    db.session.commit()

    return jsonify({

        "message": "Order marked as delivered"

    }), 200


# ===========================================
# LOCATION
# ===========================================

@shopkeeper_bp.route("/location", methods=["POST"])
def update_shop_location():

    return jsonify({

        "message": "Location updates disabled"

    }), 200