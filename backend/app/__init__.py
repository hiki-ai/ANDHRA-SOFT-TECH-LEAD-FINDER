from flask import Flask
from flask_cors import CORS
from .config.settings import Settings
from .routes.auth_routes import auth_bp
from .routes.vendor_routes import vendor_bp
from .routes.collection_routes import collection_bp
from .routes.import_routes import import_bp
from .routes.export_routes import export_bp

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = Settings.SECRET_KEY

    # Enable CORS
    CORS(app, origins=Settings.CORS_ORIGINS, supports_credentials=True)

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(vendor_bp)
    app.register_blueprint(collection_bp)
    app.register_blueprint(import_bp)
    app.register_blueprint(export_bp)

    @app.route('/health', methods=['GET'])
    def health_check():
        return {"status": "healthy", "service": "AST Lead Finder API"}

    return app
