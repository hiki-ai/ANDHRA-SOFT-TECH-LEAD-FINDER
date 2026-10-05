from ..config.database import SessionLocal
from ..models.vendor import Vendor

class VendorService:
    @staticmethod
    def get_by_id(vendor_id: str):
        db = SessionLocal()
        try:
            return db.query(Vendor).filter(Vendor.id == vendor_id).first()
        finally:
            db.close()
