"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
FLASK APPLICATION FACTORY
==============================================================================
Location: backend/app/__init__.py
==============================================================================
"""

from flask import Flask, jsonify
from flask_cors import CORS
from .config.settings import Settings
from .config.firebase import init_firebase_admin, is_live_firestore, get_firestore_db
from .routes.auth_routes import auth_bp
from .routes.vendor_routes import vendor_bp
from .routes.collection_routes import collection_bp
from .routes.dashboard_routes import dashboard_bp
from .routes.import_routes import import_bp
from .routes.export_routes import export_bp
from .routes.column_routes import column_bp

def create_app(config_name=None):
    app = Flask(__name__)
    if config_name == 'testing':
        app.config['TESTING'] = True
        Settings.TESTING = True

    app.config['SECRET_KEY'] = Settings.SECRET_KEY
    app.config['MAX_CONTENT_LENGTH'] = 30 * 1024 * 1024  # 30MB max upload

    # Enable CORS
    CORS(app, origins=Settings.CORS_ORIGINS, supports_credentials=True)

    # Initialize Firebase Admin singleton
    init_firebase_admin()

    # Register API Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(vendor_bp)
    app.register_blueprint(collection_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(import_bp)
    app.register_blueprint(export_bp)
    app.register_blueprint(column_bp)

    def _health_response():
        live_db = is_live_firestore()
        db_status = "connected" if live_db else "local_in_memory"
        return {
            "status": "healthy",
            "service": "AST Lead Finder API",
            "version": "1.0.0",
            "database": {
                "status": db_status,
                "type": "Firebase Cloud Firestore",
                "project_id": Settings.FIREBASE_PROJECT_ID,
                "is_live_cloud": live_db
            }
        }

    @app.route('/health', methods=['GET'])
    @app.route('/api/v1/health', methods=['GET'])
    def health_check():
        return jsonify(_health_response())

    # Centralized Error Handlers
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            "success": False,
            "error": {"code": "BAD_REQUEST", "message": str(error)}
        }), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "success": False,
            "error": {"code": "NOT_FOUND", "message": "The requested API resource does not exist"}
        }), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            "success": False,
            "error": {"code": "SERVER_ERROR", "message": "An internal server error occurred"}
        }), 500

    return app
