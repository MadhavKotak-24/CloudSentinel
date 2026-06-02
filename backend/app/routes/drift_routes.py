from flask import Blueprint
from flask import jsonify
from flask import request
from app.models.drift_event import DriftEvent
from app.config.extensions import db
from app.services.drift.drift_engine import detect_drift

drift_bp=Blueprint(
    "drift_bp",
    __name__
)


@drift_bp.route(
    "/check",
    methods=["POST"]
)
def check_drift():
    data = request.get_json()

    # 1. Detect the drift
    drifts = detect_drift(
        data["terraform"],
        data["aws"]
    )

    # 2. Save each detected drift event to the database
    for item in drifts:
        drift = DriftEvent(
            resource=item["resource"],
            expected_value=item["expected"],
            actual_value=item["actual"],
            severity=item["severity"]
        )
        db.session.add(drift)

    # 3. Commit the events to the database
    db.session.commit()

    # 4. Return the results
    return jsonify(
        drifts
    )
