from flask import Blueprint, jsonify
from app.services.kubernetes.kubernetes_scanner import run_kubernetes_scan

kubernetes_bp = Blueprint("kubernetes_bp", __name__)

@kubernetes_bp.route("/scan", methods=["GET"])
def kubernetes_scan():
    try:
        findings = run_kubernetes_scan()
        return jsonify(findings)
    except Exception as e:
        # Return 500 to trigger the frontend client's sandbox fallback mechanism
        return jsonify({"error": str(e)}), 500
