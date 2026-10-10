"""
Andhra Soft Tech — Extraction Worker Service
HTTP entrypoint for Vercel Serverless execution & service-to-service bindings.
Location: worker/app.py
"""

import os
from flask import Flask, request, jsonify
from services.collection_worker import CollectionWorker

app = Flask(__name__)
collection_worker = CollectionWorker()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "service": "AST Lead Finder Worker",
        "runtime": "python"
    })

@app.route('/jobs', methods=['POST'])
def run_job():
    data = request.get_json() or {}
    job_id = data.get('job_id')
    category = data.get('category')
    location = data.get('location')
    target_count = int(data.get('target_count', 100))

    if not job_id or not category or not location:
        return jsonify({
            "success": False,
            "error": {"code": "VALIDATION_ERROR", "message": "job_id, category, and location are required"}
        }), 400

    try:
        collection_worker.process_job(
            job_id=job_id,
            category=category,
            location=location,
            target_count=target_count
        )
        return jsonify({
            "success": True,
            "job_id": job_id,
            "message": f"Job {job_id} completed successfully"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "job_id": job_id,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
