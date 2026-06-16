from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, Shop

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400
    
    user = db.session.scalars(db.select(User).filter_by(email=data['email'])).first()
    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    if user.role == 'admin' and not user.is_verified:
        return jsonify({'error': 'Admin account not verified'}), 403
    
    session['user_id'] = user.id
    return jsonify({'message': 'Logged in', 'user': {'id': user.id, 'email': user.email, 'name': user.name, 'role': user.role}}), 200

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    if not data.get('email') or not data.get('password') or not data.get('name'):
        return jsonify({'error': 'Missing fields'}), 400
    
    if db.session.scalars(db.select(User).filter_by(email=data['email'])).first():
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