from flask import Blueprint, request, jsonify
from models import db, User, Shop, Order
import jwt
import os

admin_bp = Blueprint('admin', __name__)


def get_current_admin():
    """
    Get the currently logged-in admin using the JWT token.
    """

    auth_header = request.headers.get('Authorization', '')

    if not auth_header.startswith('Bearer '):
        return None

    token = auth_header.replace('Bearer ', '', 1)

    try:
        payload = jwt.decode(
            token,
            os.getenv('SECRET_KEY', 'fallback-secret-key-123'),
            algorithms=['HS256']
        )
    except jwt.PyJWTError:
        return None

    user_id = payload.get('user_id')

    if not user_id:
        return None

    user = db.session.get(User, user_id)

    if not user or user.role != 'admin':
        return None

    return user

@admin_bp.route('/users', methods=['GET'])
def get_all_users():

    user = get_current_admin()

    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    users = db.session.scalars(
        db.select(User)
    ).all()

    users_data = [
        {
            'id': u.id,
            'email': u.email,
            'name': u.name,
            'role': u.role
        }
        for u in users
    ]

    return jsonify(users_data), 200



@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):

    admin = get_current_admin()

    if not admin:
        return jsonify({'error': 'Unauthorized'}), 401

    user = db.session.get(User, user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Prevent the currently logged-in admin from deleting themselves
    if user.id == admin.id:
        return jsonify({
            'error': 'You cannot delete your own admin account'
        }), 400

    db.session.delete(user)
    db.session.commit()

    return jsonify({
        'message': 'User deleted successfully'
    }), 200

@admin_bp.route('/dashboard', methods=['GET'])
def get_admin_dashboard():

    admin = get_current_admin()

    if not admin:
        return jsonify({'error': 'Unauthorized'}), 401

    total_users = db.session.scalar(
        db.select(db.func.count(User.id))
    ) or 0

    total_shops = db.session.scalar(
        db.select(db.func.count(Shop.id))
    ) or 0

    total_orders = db.session.scalar(
        db.select(db.func.count(Order.id))
    ) or 0

    total_revenue = db.session.scalar(
        db.select(db.func.coalesce(db.func.sum(Order.total_price), 0))
    ) or 0

    return jsonify({
        'total_users': total_users,
        'total_shops': total_shops,
        'total_orders': total_orders,
        'total_revenue': float(total_revenue)
    }), 200



@admin_bp.route('/verify', methods=['POST'])
def verify_admin():

    admin = get_current_admin()

    if not admin:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    email = data.get('email', '').strip()

    if not email:
        return jsonify({
            'error': 'Admin email is required'
        }), 400

    target_user = db.session.scalar(
        db.select(User).filter(
            db.func.lower(User.email) == email.lower()
        )
    )

    if not target_user:
        return jsonify({
            'verified': False,
            'message': 'No account found with this email'
        }), 404

    if target_user.role != 'admin':
        return jsonify({
            'verified': False,
            'message': 'This account is not an administrator'
        }), 403

    return jsonify({
        'verified': True,
        'message': 'Administrator account verified',
        'user': {
            'id': target_user.id,
            'name': target_user.name,
            'email': target_user.email,
            'role': target_user.role
        }
    }), 200