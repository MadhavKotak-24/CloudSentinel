from flask import Blueprint
from flask import request
from flask import jsonify

from app.services.scanner_service import run_scan

from app.models.scan import Scan
from app.models.finding import Finding
from app.models.user import User

from app.config.extensions import db

security=Blueprint(
    "security",
    __name__
)


@security.route(
    "/analyze",
    methods=["POST"]
)

def analyze():

    data=request.get_json()

    content=data["content"]


    # Ensure a default system user exists for anonymous scans to satisfy the non-null constraint
    user = User.query.first()
    if not user:
        user = User(username="system_guest", email="guest@cloudsentinel.local")
        user.set_password("guestpass123")
        db.session.add(user)
        db.session.commit()

    scan=Scan(
        user_id=user.id,
        scan_type="IaC Scan",
        status="Completed"
    )

    db.session.add(scan)
    db.session.commit()


    findings=run_scan(
        content
    )


    for item in findings:

        finding=Finding(

            severity=item["severity"],

            resource=item["resource"],

            description=item["description"],

            remediation=item["remediation"],

            risk_score=item["risk_score"],

            scan_id=scan.id
        )

        db.session.add(
            finding
        )


    db.session.commit()


    return jsonify({
        "scan_id": scan.id,
        "findings": findings
    })