from flask import Blueprint, jsonify, session
from models import db, User, Shop, Order

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/users', methods=['GET'])
def get_all_users():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user = db.session.get(User, session['user_id'])
    if user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    users = db.session.scalars(db.select(User)).all()
    users_data = [{'id': u.id, 'email': u.email, 'name': u.name, 'role': u.role} for u in users]
    return jsonify(users_data), 200

@admin_bp.route('/dashboard', methods=['GET'])
def get_admin_dashboard():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user = db.session.get(User, session['user_id'])
    if user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
    
    total_users = db.session.scalar(db.select(db.func.count(User.id)))
    total_shops = db.session.scalar(db.select(db.func.count(Shop.id)))
    total_orders = db.session.scalar(db.select(db.func.count(Order.id)))
    
    return jsonify({'total_users': total_users, 'total_shops': total_shops, 'total_orders': total_orders}), 200