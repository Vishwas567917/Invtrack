from math import radians, cos, sin, asin, sqrt
from sqlalchemy import func
from models import db, Shop, Product


def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate distance between two coordinates in KM.
    """
    lat1, lon1, lat2, lon2 = map(
        radians,
        [lat1, lon1, lat2, lon2]
    )

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        sin(dlat / 2) ** 2 +
        cos(lat1) *
        cos(lat2) *
        sin(dlon / 2) ** 2
    )

    c = 2 * asin(sqrt(a))

    return c * 6371


def find_shops_for_items(
        items,
        user_lat,
        user_lon,
        strategy="convenience",
        max_shops=3
):
    shops = db.session.scalars(
        db.select(Shop)
    ).all()

    shop_results = []

    for shop in shops:

        distance = haversine_distance(
            user_lat,
            user_lon,
            shop.latitude,
            shop.longitude
        )

        available_items = []
        missing_items = []
        total_cost = 0

        for item in items:

            product = db.session.scalars(
                db.select(Product).filter(
                    Product.shop_id == shop.id,
                    func.lower(Product.name) == item["name"].lower()
                )
            ).first()

            if product and product.quantity > 0:

                available_qty = min(
                    product.quantity,
                    item["quantity"]
                )

                available_items.append({
                    "product": product,
                    "needed_qty": available_qty
                })

                total_cost += (
                    product.price *
                    available_qty
                )

                if available_qty < item["quantity"]:
                    missing_items.append({
                        "name": item["name"],
                        "quantity":
                            item["quantity"] - available_qty
                    })

            else:
                missing_items.append(item)

        shop_results.append({
            "shop": shop,
            "distance": distance,
            "total_cost": total_cost,
            "available_items": available_items,
            "missing_items": missing_items
        })

    if strategy == "convenience":
        shop_results.sort(
            key=lambda x: (
                len(x["missing_items"]),
                x["distance"]
            )
        )

    elif strategy == "frugal":
        shop_results.sort(
            key=lambda x: (
                len(x["missing_items"]),
                x["total_cost"]
            )
        )

    selected_shops = []
    remaining_items = items.copy()

    for shop_data in shop_results:

        if not remaining_items:
            break

        fulfilled_items = []

        for requested_item in remaining_items:

            match = next(
                (
                    x for x in shop_data["available_items"]
                    if x["product"].name.lower()
                    ==
                    requested_item["name"].lower()
                ),
                None
            )

            if match:
                fulfilled_items.append(requested_item)

        if fulfilled_items:
            selected_shops.append(shop_data)

            remaining_items = [
                item for item in remaining_items
                if item not in fulfilled_items
            ]

        if len(selected_shops) >= max_shops:
            break

    return selected_shops, remaining_items