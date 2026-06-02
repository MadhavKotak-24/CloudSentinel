import token

from flask import request,jsonify,Blueprint
from app.models.user import User
from app.config.extensions import db
from app.models import user
from flask_jwt_extended import create_access_token

auth=Blueprint("auth",__name__)

@auth.route("/register",methods=["POST"])
def register():
    data=request.get_json()

    if not data or not data.get("email") or not data.get("username") or not data.get("password"):
        return jsonify({"error":"Missing required fields"}),400

    existing_user=User.query.filter_by(email=data.get("email")).first()

    if existing_user:
        return jsonify({"error":"Email already exists"}),400
    
    user=User(
        username=data.get("username"),
        email=data.get("email")
    )

    user.set_password(data.get("password"))

    db.session.add(user)
    db.session.commit()

    return jsonify({"message":"Registration Successful"})

@auth.route("/login",methods=["POST"])
def login():
    data = request.get_json()
    if not data or not data.get("email") or not data.get("password"):
        return jsonify({"error": "Missing email or password"}), 400

    user_obj = User.query.filter_by(email=data.get("email")).first()

    if not user_obj or not user_obj.check_password(data.get("password")):
        return jsonify({"error": "Invalid credentials"}), 401

    token=create_access_token(
        identity=str(user_obj.id)
    )

    return jsonify({
        "message":"Login successful",
        "token":token,
        "username":user_obj.username
    })