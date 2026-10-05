from .connectors.source_a import SourceAConnector
from .connectors.source_b import SourceBConnector

class SourceManager:
    """
    Manages selection and routing between permitted source connectors.
    """

    def __init__(self):
        self.connectors = {
            "source_a": SourceAConnector(),
            "source_b": SourceBConnector(),
        }

    def get_connector(self, source_key: str = "source_a"):
        return self.connectors.get(source_key, self.connectors["source_a"])

    def list_available_sources(self):
        return [
            {"key": k, "name": conn.get_source_name()}
            for k, conn in self.connectors.items()
        ]
