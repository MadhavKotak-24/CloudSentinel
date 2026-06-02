from flask import Blueprint
from flask import request
from flask import jsonify

from app.services.trivy_service import run_trivy


trivy_bp=Blueprint(
    "trivy_bp",
    __name__
)


@trivy_bp.route(
    "/image",
    methods=["POST"]
)

def scan_image():

    data=request.get_json()

    image=data["image"]


    result=run_trivy(
        image
    )


    return jsonify(
        result
    )