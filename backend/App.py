import os
from flask import Flask
from flask_cors import CORS
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv

load_dotenv()

from models import db, User, Shop, Product
from routes.auth import auth_bp
from routes.shopkeeper import shopkeeper_bp
from routes.customer import customer_bp
from routes.admin import admin_bp

app = Flask(__name__)

# Basic Config
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'fallback-secret-key-123')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False

# DB Config
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URI', 'sqlite:///invtrack.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# CORS Configuration
CORS(
    app,
    supports_credentials=True,
    origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:3000",
        "http://localhost:3000"
    ]
)

db.init_app(app)

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(shopkeeper_bp, url_prefix='/api/shopkeeper')
app.register_blueprint(customer_bp, url_prefix='/api')
app.register_blueprint(admin_bp, url_prefix='/api/admin')

def init_db():
    with app.app_context():
        db.create_all()
        if db.session.scalars(db.select(User)).first():
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
        print("✅ Database initialized structures and seed data completed!")

if __name__ == '__main__':
    init_db()
    print("🚀 Server running on http://localhost:5000")
    app.run(debug=True, port=5000)