"""
Application Entrypoint
Location: backend/run.py
"""

from app import create_app
from app.config.settings import Settings

app = create_app()

if __name__ == '__main__':
    app.run(
        host=Settings.HOST,
        port=Settings.PORT,
        debug=Settings.DEBUG
    )
