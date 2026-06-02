from flask import Blueprint
from flask import jsonify

from app.models.scan import Scan


reports=Blueprint(
    "reports",
    __name__
)


@reports.route(
    "/scan/<int:scan_id>",
    methods=["GET"]
)

def get_report(scan_id):

    scan=Scan.query.get(scan_id)

    if not scan:

        return jsonify({

            "error":"Scan not found"

        }),404


    findings=[]

    for finding in scan.findings:

        findings.append({

            "severity":finding.severity,

            "resource":finding.resource,

            "description":finding.description,

            "risk_score":finding.risk_score
        })


    return jsonify({

        "scan_id":scan.id,

        "scan_type":scan.scan_type,

        "status":scan.status,

        "findings":findings
    })