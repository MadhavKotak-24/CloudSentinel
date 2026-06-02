from flask import Blueprint
from flask import jsonify
from flask import request

from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity
)

from app.models.scan import Scan
from app.config.extensions import db


scan=Blueprint(
    "scan",
    __name__
)


@scan.route(
    "/start",
    methods=["POST"]
)

@jwt_required()

def start_scan():

    data=request.get_json()
    current_user_id = int(get_jwt_identity())

    if not data or not data.get("scan_type"):
        return jsonify({"error": "scan_type is required"}), 400

    new_scan=Scan(

        scan_type=data.get("scan_type"),

        status="Running",
        
        user_id=current_user_id
    )

    db.session.add(
        new_scan
    )

    db.session.commit()

    return jsonify({

        "message":"Scan started"

    })


@scan.route(
    "/history",
    methods=["GET"]
)

@jwt_required()

def scan_history():
    current_user_id = int(get_jwt_identity())
    scans=Scan.query.filter_by(user_id=current_user_id).all()

    result=[]

    for s in scans:

        result.append({

            "id":s.id,

            "scan_type":s.scan_type,

            "status":s.status
        })

    return jsonify(
        result
    )