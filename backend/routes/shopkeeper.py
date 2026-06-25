from flask import Blueprint, request, jsonify, session
from models import db, User, Shop, Product

shopkeeper_bp = Blueprint('shopkeeper', __name__)

@shopkeeper_bp.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    user = db.session.get(User, session['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404

    shop = db.session.scalars(
        db.select(Shop).filter_by(owner_id=user.id)
    ).first()

    if not shop:
        return jsonify({'error': 'Shop not found'}), 404

    products = db.session.scalars(
        db.select(Product).filter_by(shop_id=shop.id)
    ).all()

    return jsonify({
        "total_products": len(products),
        "orders_today": 0,
        "revenue_today": 0,
        "low_stock_count": sum(1 for p in products if p.quantity <= 5)
    }), 200

@shopkeeper_bp.route('/products', methods=['GET'])
def get_shopkeeper_products():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    user = db.session.get(User, session['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404

    shop = db.session.scalars(
        db.select(Shop).filter_by(owner_id=user.id)
    ).first()

    if not shop:
        return jsonify({'error': 'Shop not found'}), 404

    products = db.session.scalars(
        db.select(Product).filter_by(shop_id=shop.id)
    ).all()

    return jsonify([
        {
            'id': p.id,
            'name': p.name,
            'category': p.category,
            'price': p.price,
            'quantity': p.quantity
        }
        for p in products
    ]), 200

@shopkeeper_bp.route('/products', methods=['POST'])
def add_product():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    user = db.session.get(User, session['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404

    shop = db.session.scalars(
        db.select(Shop).filter_by(owner_id=user.id)
    ).first()

    if not shop:
        return jsonify({'error': 'Shop not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid data'}), 400

    product = Product(
        shop_id=shop.id,
        name=data['name'],
        category=data['category'],
        price=float(data['price']),
        quantity=int(data['quantity'])
    )

    db.session.add(product)
    db.session.commit()

    return jsonify({
        "message": "Product added successfully",
        "id": product.id
    }), 201