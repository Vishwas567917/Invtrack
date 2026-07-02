from flask import Blueprint, request, jsonify
from models import db, User, Shop, Product
import jwt, os

shopkeeper_bp = Blueprint('shopkeeper', __name__)

def get_current_user():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return None
    try:
        payload = jwt.decode(token, os.getenv('SECRET_KEY', 'fallback-secret-key-123'), algorithms=['HS256'])
        return db.session.get(User, payload['user_id'])
    except jwt.PyJWTError:
        return None

@shopkeeper_bp.route('/dashboard')
def dashboard():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    shop = db.session.scalars(db.select(Shop).filter_by(owner_id=user.id)).first()
    if not shop:
        return jsonify({'error': 'Shop not found'}), 404
    products = db.session.scalars(db.select(Product).filter_by(shop_id=shop.id)).all()
    return jsonify({
        "total_products": len(products),
        "orders_today": 0,
        "revenue_today": 0,
        "low_stock_count": sum(1 for p in products if p.quantity <= 5)
    }), 200

@shopkeeper_bp.route('/products', methods=['GET'])
def get_shopkeeper_products():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    shop = db.session.scalars(db.select(Shop).filter_by(owner_id=user.id)).first()
    if not shop:
        return jsonify({'error': 'Shop not found'}), 404
    products = db.session.scalars(db.select(Product).filter_by(shop_id=shop.id)).all()
    return jsonify([{'id': p.id, 'name': p.name, 'category': p.category,
                     'price': p.price, 'quantity': p.quantity} for p in products]), 200

@shopkeeper_bp.route('/products', methods=['POST'])
def add_product():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    shop = db.session.scalars(db.select(Shop).filter_by(owner_id=user.id)).first()
    if not shop:
        return jsonify({'error': 'Shop not found'}), 404
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid data'}), 400
    product = Product(shop_id=shop.id, name=data['name'], category=data['category'],
                      price=float(data['price']), quantity=int(data['quantity']))
    db.session.add(product)
    db.session.commit()
    return jsonify({"message": "Product added successfully", "id": product.id}), 201

@shopkeeper_bp.route('/products/<int:id>', methods=['DELETE'])
def delete_product(id):
    user = get_current_user()

    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    shop = db.session.scalars(
        db.select(Shop).filter_by(owner_id=user.id)
    ).first()

    if not shop:
        return jsonify({'error': 'Shop not found'}), 404

    product = db.session.get(Product, id)

    if not product:
        return jsonify({'error': 'Product not found'}), 404

    if product.shop_id != shop.id:
        return jsonify({'error': 'Unauthorized'}), 403

    db.session.delete(product)
    db.session.commit()

    return jsonify({
        "message": "Deleted"
    }), 200

@shopkeeper_bp.route('/orders')
def get_orders():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    return jsonify([]), 200

@shopkeeper_bp.route('/orders/<int:id>/deliver', methods=['POST'])
def mark_delivered(id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    return jsonify({"message": "Marked delivered"}), 200

@shopkeeper_bp.route('/location', methods=['POST'])
def update_shop_location():
    return jsonify({
        "message": "Location updates disabled"
    }), 200