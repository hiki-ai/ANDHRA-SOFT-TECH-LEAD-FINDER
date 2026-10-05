from ..config.database import SessionLocal
from ..models.collection import Collection

class CollectionService:
    @staticmethod
    def get_by_id(collection_id: str):
        db = SessionLocal()
        try:
            return db.query(Collection).filter(Collection.id == collection_id).first()
        finally:
            db.close()
