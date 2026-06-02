from flask import Blueprint
from flask import jsonify

from app.models.drift_event import DriftEvent


history_bp=Blueprint(
    "history_bp",
    __name__
)


@history_bp.route(
    "/history"
)

def history():

    events=DriftEvent.query.all()

    result=[]

    for e in events:

        result.append({

            "resource":e.resource,

            "expected":e.expected_value,

            "actual":e.actual_value,

            "severity":e.severity
        })

    return jsonify(
        result
    )