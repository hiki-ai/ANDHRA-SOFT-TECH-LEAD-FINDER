"""
Vercel Serverless Entrypoint
Location: backend/index.py
"""

from run import app

# Top-level 'app' discovered by Vercel's Python runtime
if __name__ == '__main__':
    from app.config.settings import Settings
    app.run(
        host=Settings.HOST,
        port=Settings.PORT,
        debug=Settings.DEBUG
    )
