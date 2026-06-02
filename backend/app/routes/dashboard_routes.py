from flask import Blueprint
from flask import jsonify

from app.models.scan import Scan
from app.models.finding import Finding


dashboard=Blueprint(
    "dashboard",
    __name__
)


@dashboard.route(
    "/metrics"
)

def metrics():

    total_scans=Scan.query.count()

    total_findings=Finding.query.count()

    return jsonify({

        "total_scans":total_scans,

        "total_findings":total_findings
    })