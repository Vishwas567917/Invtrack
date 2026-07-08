import os
from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv
from sqlalchemy import event
from sqlalchemy.engine import Engine

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

load_dotenv()

from models import db, User, Shop, Product
from routes.auth import auth_bp
from routes.shopkeeper import shopkeeper_bp
from routes.customer import customer_bp
from routes.admin import admin_bp

app = Flask(__name__)

app.config['SECRET_KEY'] = os.getenv(
    'SECRET_KEY',
    'this-is-a-very-long-secret-key-for-jwt-security-2026'
)

app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
    'DATABASE_URI',
    'sqlite:///invtrack.db'
)

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False


# CORS
CORS(
    app,
    supports_credentials=True,
    resources={
        r"/api/*": {
            "origins": [
                "http://127.0.0.1:3000",
                "http://localhost:3000",
                "http://127.0.0.1:3002",
                "http://localhost:3002",
                "http://127.0.0.1:5500",
                "http://localhost:5500"
            ]
        }
    },
    expose_headers=["Content-Type", "Authorization"],
    allow_headers=["*"]
)

db.init_app(app)
migrate = Migrate(app, db)

# Blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(shopkeeper_bp, url_prefix='/api/shopkeeper')
app.register_blueprint(customer_bp, url_prefix='/api')
app.register_blueprint(admin_bp, url_prefix='/api/admin')


def init_db():
    with app.app_context():

        db.create_all()

        parth_shop = db.session.execute(
            db.select(Shop).filter(
                Shop.name.ilike("%parth%")
            )
        ).scalar_one_or_none()

        if parth_shop:
            parth_shop.latitude = 28.5355
            parth_shop.longitude = 77.3910

            db.session.commit()

            print("✅ Parth shop coordinates fixed")
            print(
                f"Latitude: {parth_shop.latitude}, "
                f"Longitude: {parth_shop.longitude}"
            )

        if db.session.scalars(db.select(User)).first():
            return

        admin = User(
            email='admin@invtrack.com',
            password=generate_password_hash('Admin@123'),
            name='System Admin',
            role='admin',
            is_verified=True
        )

        customer = User(
            email='customer@test.com',
            password=generate_password_hash('test123'),
            name='Customer',
            role='customer',
            is_verified=True
        )

        shopkeeper = User(
            email='shop@test.com',
            password=generate_password_hash('test123'),
            name='Shop Owner',
            role='shopkeeper',
            is_verified=True
        )

        db.session.add(admin)
        db.session.add(customer)
        db.session.add(shopkeeper)

        db.session.flush()

        shop = Shop(
            name='Fresh Mart',
            owner_id=shopkeeper.id,
            city='New Delhi',
            address='123 Market St',
            latitude=28.6139,
            longitude=77.2090,
            rating=4.5,
            phone='9876543210'
        )

        db.session.add(shop)
        db.session.flush()

        products = [
            Product(
                shop_id=shop.id,
                name='Apple',
                category='Fruits',
                price=80,
                quantity=50
            ),
            Product(
                shop_id=shop.id,
                name='Banana',
                category='Fruits',
                price=40,
                quantity=100
            ),
            Product(
                shop_id=shop.id,
                name='Milk',
                category='Dairy',
                price=60,
                quantity=200
            )
        ]

        for product in products:
            db.session.add(product)

        db.session.commit()

        print("✅ Database initialized successfully")

if __name__ == '__main__':
    init_db()

    print("🚀 Server running on http://127.0.0.1:5000")

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )