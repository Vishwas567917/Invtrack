from flask import Blueprint, request, jsonify

from models import db, User, Shop, Product, Order, OrderItem

from helpers import haversine_distance, find_shops_for_items

import jwt

import os



customer_bp = Blueprint('customer', __name__)



# Helper to extract user_id from JWT

def get_user_id_from_token():

    auth_header = request.headers.get('Authorization', '')

    if not auth_header.startswith('Bearer '):

        return None

    token = auth_header.split(" ")[1]

    try:

        payload = jwt.decode(token, os.getenv('SECRET_KEY', 'fallback-secret-key-123'), algorithms=['HS256'])

        return payload['user_id']

    except Exception:

        return None



@customer_bp.route('/verify-token', methods=['GET', 'OPTIONS'])
def verify_token():

    if request.method == 'OPTIONS': return '', 200

    user_id = get_user_id_from_token()

    if not user_id: return jsonify({'valid': False}), 401

    user = db.session.get(User, user_id)

    if not user: return jsonify({'valid': False}), 401

    return jsonify({'valid': True, 'user': {'name': user.name, 'role': user.role}}), 200



@customer_bp.route('/calculate-route', methods=['POST', 'OPTIONS'])
def calculate_route():

    if request.method == 'OPTIONS':
        return '', 200

    data = request.json

    items = data.get('items', [])
    strategy = data.get('strategy', 'convenience')

    user_lat = data.get('latitude')
    user_lon = data.get('longitude')

    if user_lat is None or user_lon is None:
        return jsonify({
            "error": "Customer location required"
        }), 400

    normalized_items = [
        {
            'name': str(i['name']).strip().lower(),
            'quantity': i.get('quantity', 1)
        }
        for i in items
    ]

    selected_shops, missing = find_shops_for_items(
        normalized_items,
        user_lat,
        user_lon
    )

    shops_data = []

    for entry in selected_shops:
        shop = entry['shop']

        shops_data.append({
            'shop_id': shop.id,
            'shop_name': shop.name,
            'distance': round(entry['distance'], 2),
            'latitude': shop.latitude,
            'longitude': shop.longitude,
            'available_items': [
                {
                    'name': item['product'].name,
                    'price': item['product'].price,
                    'needed': item['needed_qty']
                }
                for item in entry['available_items']
            ]
        })

    return jsonify({
        'shops': shops_data,
        'missing_items': missing,
        'complete': len(missing) == 0,
        'strategy': strategy
    }), 200



@customer_bp.route('/shops', methods=['GET', 'OPTIONS'])
def get_shops():

    if request.method == 'OPTIONS':
        return '', 200

    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)

    shops = db.session.scalars(
        db.select(Shop)
    ).all()

    shops_data = []

    for shop in shops:
        print("Customer Location:", lat, lon)
        print("Shop Location:", shop.latitude, shop.longitude)
        

        distance = None

        if lat is not None and lon is not None:
            distance = haversine_distance(
                lat,
                lon,
                shop.latitude,
                shop.longitude
            )
            print("Calculated Distance:", distance)

        shops_data.append({
            'id': shop.id,
            'name': shop.name,
            'city': shop.city,
            'address': shop.address,
            'latitude': shop.latitude,
            'longitude': shop.longitude,
            'rating': shop.rating,
            'distance': distance,
            'owner': shop.owner.name
        })

    shops_data.sort(
        key=lambda x: x['distance']
        if x['distance'] is not None else 999999
    )

    return jsonify(shops_data), 200



@customer_bp.route('/shops/<int:shop_id>/products', methods=['GET', 'OPTIONS'])
def get_shop_products(shop_id):

    if request.method == 'OPTIONS': return '', 200

    products = db.session.scalars(db.select(Product).filter_by(shop_id=shop_id)).all()

    return jsonify([{'id': p.id, 'name': p.name, 'category': p.category, 'price': p.price, 'stock': p.quantity} for p in products]), 200



@customer_bp.route('/shopping-list/find-shops', methods=['POST', 'OPTIONS'])
def find_shops_for_list():

    if request.method == 'OPTIONS': return '', 200

    data = request.json

    items, user_lat, user_lon = data.get('items', []), data.get('latitude'), data.get('longitude')

    if not items or not user_lat or not user_lon: return jsonify({'error': 'Items and location required'}), 400

    normalized_items = [{'name': str(i.get('name', '')).strip().lower(), 'quantity': i.get('quantity', 1)} for i in items]

    selected_shops, missing = find_shops_for_items(normalized_items, user_lat, user_lon)

    return jsonify({'shops': selected_shops, 'missing_items': missing, 'complete': len(missing) == 0}), 200



@customer_bp.route('/orders/pre-order', methods=['POST', 'OPTIONS'])
def create_pre_order():

    if request.method == 'OPTIONS':
        return '', 200

    user_id = get_user_id_from_token()

    if not user_id:
        return jsonify({
            'error': 'Unauthorized'
        }), 401

    data = request.json

    shop_id = data.get('shop_id')
    items = data.get('items', [])

    if not shop_id:
        return jsonify({
            'error': 'Shop required'
        }), 400

    total_price = 0
    order_products = []

    for item in items:

        product = db.session.get(
            Product,
            item['product_id']
        )

        if not product:
            return jsonify({
                'error': 'Product not found'
            }), 404

        qty = int(item['quantity'])

        if product.quantity < qty:
            return jsonify({
                'error':
                f'{product.name} out of stock'
            }), 400

        total_price += (
            product.price * qty
        )

        order_products.append(
            (
                product,
                qty
            )
        )

    order = Order(
        customer_id=user_id,
        shop_id=shop_id,
        total_price=total_price,
        status='confirmed',
        payment_status='paid'
    )

    db.session.add(order)
    db.session.flush()

    for product, qty in order_products:

        db.session.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=qty,
                price=product.price
            )
        )

        product.quantity -= qty

    db.session.commit()

    return jsonify({
        'message':
            'Order created successfully',
        'order_id':
            order.id,
        'shop_id':
            shop_id
    }), 201



@customer_bp.route('/orders', methods=['GET', 'OPTIONS'])
def get_user_orders():

    if request.method == 'OPTIONS': return '', 200

    user_id = get_user_id_from_token()

    if not user_id: return jsonify({'error': 'Unauthorized'}), 401

    orders = db.session.scalars(db.select(Order).filter_by(customer_id=user_id)).all()

    # FIXED: Accessing o.total_price from the model

    return jsonify([{'id': o.id, 'shop_name': o.shop.name, 'total': o.total_price, 'status': o.status} for o in orders]), 200