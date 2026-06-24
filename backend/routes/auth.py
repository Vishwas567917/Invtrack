from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, Shop

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/me')
def me():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401

    user = db.session.get(User, session['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'role': user.role
    })

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400

    user = db.session.scalars(
        db.select(User).filter_by(email=data['email'])
    ).first()

    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401

    if user.role == 'admin' and not user.is_verified:
        return jsonify({'error': 'Admin account not verified'}), 403

    session.clear()
    session['user_id'] = user.id
    session.permanent = True

    return jsonify({
        'message': 'Logged in',
        'user': {
            'id': user.id,
            'email': user.email,
            'name': user.name,
            'role': user.role
        }
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
    
    user = User(
        email=data['email'], 
        password=generate_password_hash(data['password']), 
        name=data['name'], 
        role=role, 
        is_verified=True
    )
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
                latitude=float(data.get('latitude') or 0), 
                longitude=float(data.get('longitude') or 0)
            )
            db.session.add(shop)
        except ValueError:
            return jsonify({'error': 'Invalid location coordinates'}), 400
    
    db.session.commit()
    session['user_id'] = user.id
    
    return jsonify({
        'message': 'Registered successfully', 
        'user': {
            'id': user.id, 
            'email': user.email, 
            'name': user.name, 
            'role': user.role
        }
    }), 201