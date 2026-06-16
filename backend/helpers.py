from math import radians, cos, sin, asin, sqrt
from models import db, Shop, Product

def haversine_distance(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    return c * 6371

def find_shops_for_items(items, user_lat, user_lon, max_shops=3):
    shops = db.session.scalars(db.select(Shop)).all()
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
            product = db.session.scalars(
                db.select(Product).filter_by(shop_id=shop.id, name=item['name'])
            ).first()
            
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
            found = next((x for x in shop_data['available_items'] if x['product'].name == item['name']), None)
            if found:
                fulfilled.append(item)
        
        if fulfilled:
            selected_shops.append(shop_data)
            remaining_items = [item for item in remaining_items if item not in fulfilled]
            
    return selected_shops, remaining_items