from flask import Flask, render_template, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from functools import wraps
import os
from math import radians, cos, sin, asin, sqrt

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-this-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///invtrack.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
CORS(app)

# ===== DATABASE MODELS =====

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_verified = db.Column(db.Boolean, default=False)
    
    shops = db.relationship('Shop', backref='owner', lazy=True)
    orders = db.relationship('Order', backref='customer', lazy=True)

class Shop(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    city = db.Column(db.String(120), nullable=False)
    address = db.Column(db.String(255), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    rating = db.Column(db.Float, default=4.0)
    phone = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    products = db.relationship('Product', backref='shop', lazy=True, cascade='all, delete-orphan')
    orders = db.relationship('Order', backref='shop', lazy=True)

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, default=0)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    order_items = db.relationship('OrderItem', backref='product', lazy=True)

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='pending')
    payment_status = db.Column(db.String(20), default='unpaid')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    items = db.relationship('OrderItem', backref='order', lazy=True, cascade='all, delete-orphan')

class OrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)

# ===== HELPER FUNCTIONS =====

def haversine_distance(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371
    return c * r

def find_shops_for_items(items, user_lat, user_lon, max_shops=3):
    shops = Shop.query.all()
    shop_distances = []
    
    for shop in shops:
        distance = haversine_distance(user_lat, user_lon, shop.latitude, shop.longitude)
        shop_data = {
            'shop': shop,
            'distance': distance,
            'available_items': [],
            'missing_items': []
        }
        
        for item in items:
            product = Product.query.filter_by(shop_id=shop.id, name=item['name']).first()
            if product and product.quantity >= item['quantity']:
                shop_data['available_items'].append({'product': product, 'needed_qty': item['quantity']})
            else:
                shop_data['missing_items'].append(item)
        
        shop_distances.append(shop_data)
    
    shop_distances.sort(key=lambda x: x['distance'])
    selected_shops = []
    remaining_items = items.copy()
    
    for shop_data in shop_distances:
        if not remaining_items or len(selected_shops) >= max_shops:
            break
        
        fulfilled = []
        for item in remaining_items:
            product = Product.query.filter_by(shop_id=shop_data['shop'].id, name=item['name']).first()
            if product and product.quantity >= item['quantity']:
                shop_data['available_items'].append({'product': product, 'needed_qty': item['quantity']})
                fulfilled.append(item)
        
        if shop_data['available_items']:
            selected_shops.append(shop_data)
            remaining_items = [item for item in remaining_items if item not in fulfilled]
    
    return selected_shops, remaining_items

# ===== ROUTES =====

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    if user.role == 'admin' and not user.is_verified:
        return jsonify({'error': 'Admin account not verified'}), 403
    
    session['user_id'] = user.id
    return jsonify({'message': 'Logged in', 'user': {'id': user.id, 'email': user.email, 'name': user.name, 'role': user.role}}), 200

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    if not data.get('email') or not data.get('password') or not data.get('name'):
        return jsonify({'error': 'Missing fields'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email exists'}), 400
    
    role = data.get('role', 'customer')
    if role == 'admin':
        return jsonify({'error': 'Cannot register as admin'}), 403
    
    user = User(email=data['email'], password=generate_password_hash(data['password']), name=data['name'], role=role, is_verified=True)
    
    if role == 'shopkeeper':
        db.session.add(user)
        db.session.flush()
        shop = Shop(name=data.get('shop_name', ''), owner_id=user.id, city=data.get('city', ''), address=data.get('address', ''), latitude=float(data.get('latitude', 0)), longitude=float(data.get('longitude', 0)))
        db.session.add(shop)
    
    db.session.add(user)
    db.session.commit()
    session['user_id'] = user.id
    return jsonify({'message': 'Registered', 'user': {'id': user.id, 'email': user.email, 'name': user.name, 'role': user.role}}), 201

@app.route('/api/shops', methods=['GET'])
def get_shops():
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)
    shops = Shop.query.all()
    shops_data = []
    for shop in shops:
        distance = None
        if lat and lon:
            distance = haversine_distance(lat, lon, shop.latitude, shop.longitude)
        shops_data.append({'id': shop.id, 'name': shop.name, 'city': shop.city, 'address': shop.address, 'latitude': shop.latitude, 'longitude': shop.longitude, 'rating': shop.rating, 'distance': distance, 'owner': shop.owner.name})
    if lat and lon:
        shops_data.sort(key=lambda x: x['distance'])
    return jsonify(shops_data), 200

@app.route('/api/shops/<int:shop_id>/products', methods=['GET'])
def get_shop_products(shop_id):
    products = Product.query.filter_by(shop_id=shop_id).all()
    products_data = [{'id': p.id, 'name': p.name, 'category': p.category, 'price': p.price, 'quantity': p.quantity} for p in products]
    return jsonify(products_data), 200

@app.route('/api/shopping-list/find-shops', methods=['POST'])
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

@app.route('/api/orders/pre-order', methods=['POST'])
def create_pre_order():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    user = User.query.get(session['user_id'])
    shop_id = data.get('shop_id')
    items = data.get('items', [])
    shop = Shop.query.get_or_404(shop_id)
    
    total = 0
    order_items = []
    
    for item in items:
        product = Product.query.get_or_404(item['product_id'])
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

@app.route('/api/orders', methods=['GET'])
def get_user_orders():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user = User.query.get(session['user_id'])
    orders = Order.query.filter_by(customer_id=user.id).all()
    orders_data = [{'id': o.id, 'shop_name': o.shop.name, 'total': o.total_amount, 'status': o.status} for o in orders]
    return jsonify(orders_data), 200

@app.route('/api/shopkeeper/products', methods=['GET'])
def get_shopkeeper_products():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user = User.query.get(session['user_id'])
    shop = Shop.query.filter_by(owner_id=user.id).first()
    if not shop:
        return jsonify({'error': 'Shop not found'}), 404
    products = Product.query.filter_by(shop_id=shop.id).all()
    products_data = [{'id': p.id, 'name': p.name, 'category': p.category, 'price': p.price, 'quantity': p.quantity} for p in products]
    return jsonify(products_data), 200

@app.route('/api/shopkeeper/products', methods=['POST'])
def add_product():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user = User.query.get(session['user_id'])
    shop = Shop.query.filter_by(owner_id=user.id).first()
    if not shop:
        return jsonify({'error': 'Shop not found'}), 404
    
    data = request.json
    product = Product(shop_id=shop.id, name=data['name'], category=data['category'], price=float(data['price']), quantity=int(data['quantity']))
    db.session.add(product)
    db.session.commit()
    return jsonify({'message': 'Product added', 'product': {'id': product.id, 'name': product.name}}), 201

@app.route('/api/admin/users', methods=['GET'])
def get_all_users():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user = User.query.get(session['user_id'])
    if user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    users = User.query.all()
    users_data = [{'id': u.id, 'email': u.email, 'name': u.name, 'role': u.role} for u in users]
    return jsonify(users_data), 200

@app.route('/api/admin/dashboard', methods=['GET'])
def get_admin_dashboard():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user = User.query.get(session['user_id'])
    if user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    return jsonify({'total_users': User.query.count(), 'total_shops': Shop.query.count(), 'total_orders': Order.query.count()}), 200

def init_db():
    with app.app_context():
        db.create_all()
        if User.query.first():
            return
        
        admin = User(email='admin@invtrack.com', password=generate_password_hash('Admin@123'), name='System Admin', role='admin', is_verified=True)
        db.session.add(admin)
        db.session.flush()
        
        customer = User(email='customer@test.com', password=generate_password_hash('test123'), name='Customer', role='customer', is_verified=True)
        db.session.add(customer)
        
        shopkeeper = User(email='shop@test.com', password=generate_password_hash('test123'), name='Shop Owner', role='shopkeeper', is_verified=True)
        db.session.add(shopkeeper)
        db.session.flush()
        
        shop = Shop(name='Fresh Mart', owner_id=shopkeeper.id, city='New Delhi', address='123 Market St', latitude=28.6139, longitude=77.2090, rating=4.5, phone='9876543210')
        db.session.add(shop)
        db.session.flush()
        
        products = [
            Product(shop_id=shop.id, name='Apple', category='Fruits', price=80, quantity=50),
            Product(shop_id=shop.id, name='Banana', category='Fruits', price=40, quantity=100),
            Product(shop_id=shop.id, name='Milk', category='Dairy', price=60, quantity=200),
        ]
        
        for p in products:
            db.session.add(p)
        
        db.session.commit()
        print("✅ Database initialized!")

if __name__ == '__main__':
    init_db()
    print("🚀 Server running on http://localhost:5000")
    app.run(debug=True, port=5000)