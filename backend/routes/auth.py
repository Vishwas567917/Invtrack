from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, Shop
import jwt, os, datetime

auth_bp = Blueprint('auth', __name__)

def make_token(user_id):
    return jwt.encode(
        {'user_id': user_id, 'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)},
        os.getenv('SECRET_KEY', 'fallback-secret-key-123'),
        algorithm='HS256'
    )

@auth_bp.route('/me')
def me():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return jsonify({'error': 'Not logged in'}), 401
    try:
        payload = jwt.decode(token, os.getenv('SECRET_KEY', 'fallback-secret-key-123'), algorithms=['HS256'])
    except jwt.PyJWTError:
        return jsonify({'error': 'Invalid token'}), 401
    user = db.session.get(User, payload['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'id': user.id, 'email': user.email, 'name': user.name, 'role': user.role})

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400
    user = db.session.scalars(db.select(User).filter_by(email=data['email'])).first()
    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401
    if user.role == 'admin' and not user.is_verified:
        return jsonify({'error': 'Admin account not verified'}), 403
    return jsonify({
        'message': 'Logged in',
        'token': make_token(user.id),
        'user': {'id': user.id, 'email': user.email, 'name': user.name, 'role': user.role}
    }), 200

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    if not data.get('email') or not data.get('password') or not data.get('name'):
        return jsonify({'error': 'Missing required fields'}), 400
    if db.session.scalars(db.select(User).filter_by(email=data['email'])).first():
        return jsonify({'error': 'Email already registered'}), 400
    role = data.get('role', 'customer')
    if role == 'admin':
        return jsonify({'error': 'Unauthorized registration attempt'}), 403
    user = User(email=data['email'], password=generate_password_hash(data['password']),
                name=data['name'], role=role, is_verified=True)
    db.session.add(user)
    db.session.flush()
    if role == 'shopkeeper':
        try:
            shop = Shop(
    name=data.get('shop_name', ''),
    owner_id=user.id,
    city=data.get('city', ''),
    address=data.get('address', ''),
    phone=data.get('phone', ''),
    shop_latitude=float(data.get('shop_latitude') or 0),
    shop_longitude=float(data.get('shop_longitude') or 0)
)
            db.session.add(shop)
        except ValueError:
            return jsonify({'error': 'Invalid location coordinates'}), 400
    db.session.commit()
    return jsonify({
        'message': 'Registered successfully',
        'token': make_token(user.id),
        'user': {'id': user.id, 'email': user.email, 'name': user.name, 'role': user.role}
    }), 201