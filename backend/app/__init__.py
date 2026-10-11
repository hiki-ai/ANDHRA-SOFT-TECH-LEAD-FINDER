"""
==============================================================================
ANDHRA SOFT TECH — LEAD FINDER
FLASK APPLICATION FACTORY
==============================================================================
Location: backend/app/__init__.py
==============================================================================
"""

from flask import Flask, jsonify, request, make_response
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
from .routes.source_routes import source_bp

def create_app(config_name=None):
    app = Flask(__name__)
    if config_name == 'testing':
        app.config['TESTING'] = True
        Settings.TESTING = True

    app.config['SECRET_KEY'] = Settings.SECRET_KEY
    app.config['MAX_CONTENT_LENGTH'] = 30 * 1024 * 1024  # 30MB max upload

    # Configure CORS with Flask-CORS
    CORS(
        app,
        resources={r"/*": {
            "origins": Settings.CORS_ORIGINS,
            "supports_credentials": True,
            "methods": ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
            "expose_headers": ["Content-Type", "Authorization", "Content-Disposition"],
            "max_age": 3600,
        }}
    )

    # Global Preflight & CORS after_request handlers to guarantee headers on all status codes
    @app.before_request
    def handle_options_preflight():
        if request.method == 'OPTIONS':
            origin = request.headers.get('Origin', '')
            response = make_response(('', 204))
            if origin and Settings.is_allowed_origin(origin):
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Credentials'] = 'true'
                response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, PUT, DELETE, OPTIONS'
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, Origin'
                response.headers['Access-Control-Max-Age'] = '3600'
            return response

    @app.after_request
    def set_cors_headers(response):
        origin = request.headers.get('Origin', '')
        if origin and Settings.is_allowed_origin(origin):
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, PUT, DELETE, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, Origin'
            response.headers['Access-Control-Max-Age'] = '3600'
        return response

    # Initialize Firebase Admin singleton
    init_firebase_admin()

    # Register API Blueprints (canonical /api/v1 prefix)
    app.register_blueprint(auth_bp)
    app.register_blueprint(vendor_bp)
    app.register_blueprint(collection_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(import_bp)
    app.register_blueprint(export_bp)
    app.register_blueprint(column_bp)
    app.register_blueprint(source_bp)

    # Register un-prefixed aliases for maximum resilience
    app.register_blueprint(auth_bp, name='auth_alias', url_prefix='/auth')
    app.register_blueprint(vendor_bp, name='vendors_alias', url_prefix='/vendors')
    app.register_blueprint(collection_bp, name='collections_alias', url_prefix='/collections')
    app.register_blueprint(dashboard_bp, name='dashboard_alias', url_prefix='/dashboard')
    app.register_blueprint(import_bp, name='imports_alias', url_prefix='/imports')
    app.register_blueprint(export_bp, name='exports_alias', url_prefix='/exports')
    app.register_blueprint(column_bp, name='columns_alias', url_prefix='/columns')
    app.register_blueprint(source_bp, name='sources_alias', url_prefix='/sources')

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

    # Centralized Error Handlers (Return structured JSON)
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
