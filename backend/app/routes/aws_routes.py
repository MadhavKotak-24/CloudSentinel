from flask import Blueprint
from flask import jsonify

from app.services.aws.aws_scanner import run_aws_scan


aws_bp=Blueprint(
    "aws_bp",
    __name__
)


@aws_bp.route(
    "/scan",
    methods=["GET"]
)

def aws_scan():

    findings=run_aws_scan()

    return jsonify(
        findings
    )