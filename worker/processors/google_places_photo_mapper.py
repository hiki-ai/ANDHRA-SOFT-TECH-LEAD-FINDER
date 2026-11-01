from typing import Any, Callable, Dict, Optional


class GooglePlacesPhotoMapper:
    IMAGE_FIELDS = ("image_1_url", "image_2_url", "image_3_url")
    MAX_PHOTOS = len(IMAGE_FIELDS)

    @classmethod
    def map_record(
        cls,
        record: Dict[str, Any],
        fetch_photo_uri: Callable[[str], Optional[str]],
    ) -> Dict[str, Any]:
        mapped = record.copy()
        photos = record.get("photos")
        photo_refs = photos[:cls.MAX_PHOTOS] if isinstance(photos, list) else []
        image_urls = []

        for photo in photo_refs:
            photo_name = photo.get("name") if isinstance(photo, dict) else None
            try:
                image_urls.append((fetch_photo_uri(photo_name) or None) if photo_name else None)
            except Exception:
                image_urls.append(None)

        image_urls.extend([None] * (cls.MAX_PHOTOS - len(image_urls)))
        for field, url in zip(cls.IMAGE_FIELDS, image_urls):
            mapped[field] = url
        mapped["image_count"] = sum(bool(url) for url in image_urls)
        return mapped