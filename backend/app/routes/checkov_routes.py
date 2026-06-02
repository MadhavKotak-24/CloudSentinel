import os

from flask import Blueprint
from flask import request
from flask import jsonify

from app.services.checkov_service import run_checkov


checkov_bp=Blueprint(
    "checkov_bp",
    __name__
)


@checkov_bp.route(
    "/terraform",
    methods=["POST"]
)

def terraform_scan():

    file=request.files["file"]

    filepath=os.path.join(

        "uploads",

        file.filename
    )

    file.save(filepath)


    result=run_checkov(
        filepath
    )


    return jsonify(
        result
    )