from flask import Flask,jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
from flask_migrate import Migrate
from app.config.extensions import db
from app.routes.auth_routes import auth
from flask_jwt_extended import JWTManager
from app.routes.scan_routes import scan
from app.routes.dashboard_routes import dashboard
from app.routes.security_routes import security
from app.routes.report_routes import reports
from app.routes.finding_routes import finding_bp
from app.routes.statistics_routes import stats
from app.routes.upload_routes import upload
from app.routes.checkov_routes import checkov_bp
from app.routes.trivy_routes import trivy_bp
from app.routes.aws_routes import aws_bp
from app.routes.drift_routes import drift_bp
from app.routes.drift_history import history_bp
from app.routes.kubernetes_routes import kubernetes_bp

load_dotenv()

migrate=Migrate()

def create_app():
    app=Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"]=os.getenv("JWT_SECRET_KEY")

    jwt=JWTManager(app)

    CORS(app)

    db.init_app(app)

    from app.models.user import User
    from app.models.scan import Scan
    from app.models.finding import Finding
    from app.models.drift_event import DriftEvent

    with app.app_context():
        db.create_all()

    migrate.init_app(app,db) 
    
    app.register_blueprint(auth,url_prefix="/auth")
    app.register_blueprint(scan,url_prefix="/scan")
    app.register_blueprint(dashboard,url_prefix="/dashboard")
    app.register_blueprint(security,url_prefix="/security")
    app.register_blueprint(reports,url_prefix="/reports")
    app.register_blueprint(finding_bp,url_prefix="/findings")
    app.register_blueprint(stats,url_prefix="/statistics")
    app.register_blueprint(upload,url_prefix="/upload")
    app.register_blueprint(checkov_bp,url_prefix="/checkov")
    app.register_blueprint(trivy_bp,url_prefix="/trivy")
    app.register_blueprint(aws_bp,url_prefix="/aws")
    app.register_blueprint(drift_bp,url_prefix="/drift")
    app.register_blueprint(history_bp,url_prefix="/history")
    app.register_blueprint(kubernetes_bp,url_prefix="/kubernetes")
    @app.route("/")
    def home():
        return jsonify({
            "project":"CloudSentinel",
            "status":"running"
        })
    
    @app.route("/health")
    def health():
        return jsonify({
            "status":"healthy"
        })
    return app

app=create_app()

if __name__=="__main__":
    app.run(host="0.0.0.0",
            port=5000,
            debug=True
            )