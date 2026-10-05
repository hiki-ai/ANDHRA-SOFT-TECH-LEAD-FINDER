def format_response(success: bool, data=None, error=None, message=None):
    payload = {"success": success}
    if data is not None:
        payload["data"] = data
    if error is not None:
        payload["error"] = error
    if message is not None:
        payload["message"] = message
    return payload
