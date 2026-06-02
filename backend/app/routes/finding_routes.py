from flask import Blueprint
from flask import jsonify

from app.models.finding import Finding


finding_bp=Blueprint(
    "finding_bp",
    __name__
)


@finding_bp.route(
    "/all",
    methods=["GET"]
)

def all_findings():

    findings=Finding.query.all()

    result=[]


    for finding in findings:

        result.append({

            "id":finding.id,

            "severity":finding.severity,

            "resource":finding.resource,

            "description":finding.description,

            "risk_score":finding.risk_score
        })


    return jsonify(
        result
    )