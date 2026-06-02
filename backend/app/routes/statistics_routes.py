from flask import Blueprint
from flask import jsonify

from app.models.finding import Finding


stats=Blueprint(
    "stats",
    __name__
)


@stats.route(
    "/severity",
    methods=["GET"]
)

def severity_stats():

    findings=Finding.query.all()


    result={

        "LOW":0,

        "MEDIUM":0,

        "HIGH":0,

        "CRITICAL":0
    }


    for finding in findings:

        result[finding.severity]+=1


    return jsonify(
        result
    )