from flask import Blueprint, request, jsonify, session
from models import db, User, Shop, Product, Order, OrderItem
from helpers import haversine_distance, find_shops_for_items

customer_bp = Blueprint('customer', __name__)

@customer_bp.route('/shops', methods=['GET'])
def get_shops():
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)
    shops = db.session.scalars(db.select(Shop)).all()
    shops_data = []
    for shop in shops:
        distance = None
        if lat and lon:
            distance = haversine_distance(lat, lon, shop.latitude, shop.longitude)
        shops_data.append({'id': shop.id, 'name': shop.name, 'city': shop.city, 'address': shop.address, 'latitude': shop.latitude, 'longitude': shop.longitude, 'rating': shop.rating, 'distance': distance, 'owner': shop.owner.name})
    if lat and lon:
        shops_data.sort(key=lambda x: x['distance'])
    return jsonify(shops_data), 200

@customer_bp.route('/shops/<int:shop_id>/products', methods=['GET'])
def get_shop_products(shop_id):
    products = db.session.scalars(db.select(Product).filter_by(shop_id=shop_id)).all()
    products_data = [{'id': p.id, 'name': p.name, 'category': p.category, 'price': p.price, 'quantity': p.quantity} for p in products]
    return jsonify(products_data), 200

@customer_bp.route('/shopping-list/find-shops', methods=['POST'])
def find_shops_for_list():
    data = request.json
    items = data.get('items', [])
    user_lat = data.get('latitude')
    user_lon = data.get('longitude')
    
    if not items or not user_lat or not user_lon:
        return jsonify({'error': 'Items and location required'}), 400
    
    selected_shops, missing = find_shops_for_items(items, user_lat, user_lon)
    shops_response = []
    for shop_data in selected_shops:
        shop = shop_data['shop']
        shops_response.append({'id': shop.id, 'name': shop.name, 'distance': round(shop_data['distance'], 2), 'latitude': shop.latitude, 'longitude': shop.longitude, 'items': [{'id': item['product'].id, 'name': item['product'].name, 'price': item['product'].price, 'quantity_needed': item['needed_qty']} for item in shop_data['available_items']]})
    
    return jsonify({'shops': shops_response, 'missing_items': missing, 'complete': len(missing) == 0}), 200

@customer_bp.route('/orders/pre-order', methods=['POST'])
def create_pre_order():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    user = db.session.get(User, session['user_id'])
    shop_id = data.get('shop_id')
    items = data.get('items', [])
    
    total = 0
    order_items = []
    
    for item in items:
        product = db.get_or_404(Product, item['product_id'])
        qty = item['quantity']
        if product.quantity < qty:
            return jsonify({'error': f'{product.name} insufficient stock'}), 400
        order_items.append({'product': product, 'quantity': qty, 'price': product.price})
        total += product.price * qty
    
    order = Order(customer_id=user.id, shop_id=shop_id, total_amount=total, status='confirmed', payment_status='paid')
    db.session.add(order)
    db.session.flush()
    
    for item in order_items:
        order_item = OrderItem(order_id=order.id, product_id=item['product'].id, quantity=item['quantity'], price=item['price'])
        db.session.add(order_item)
        item['product'].quantity -= item['quantity']
    
    db.session.commit()
    return jsonify({'message': 'Order created', 'order': {'id': order.id, 'shop_id': shop_id, 'total': total}}), 201

@customer_bp.route('/orders', methods=['GET'])
def get_user_orders():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user = db.session.get(User, session['user_id'])
    orders = db.session.scalars(db.select(Order).filter_by(customer_id=user.id)).all()
    orders_data = [{'id': o.id, 'shop_name': o.shop.name, 'total': o.total_amount, 'status': o.status} for o in orders]
    return jsonify(orders_data), 200