from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


import certifi

async def init_db():
    """
    Initialize MongoDB connection and Beanie ODM.
    """
    try:
        # Monkey patch append_metadata to avoid Beanie/Motor compatibility issues
        if not hasattr(AsyncIOMotorClient, "append_metadata"):
            AsyncIOMotorClient.append_metadata = lambda self, *args, **kwargs: None

        if "mongodb+srv" in settings.MONGODB_URI:
            client = AsyncIOMotorClient(settings.MONGODB_URI, tlsCAFile=certifi.where(), tlsAllowInvalidCertificates=True)
        else:
            client = AsyncIOMotorClient(settings.MONGODB_URI)
        database = client[settings.DATABASE_NAME]
        await init_beanie(
            database=database,
            document_models=[
                "app.models.drive.DriveModel",
                "app.models.drive.RoundModel",
                "app.models.room.RoomModel",
                "app.models.student.StudentModel",
                "app.models.form.FormSchemaModel",
                "app.models.settings.SystemSettings"
            ]
        )
        logger.info(f"Successfully connected to MongoDB: {settings.DATABASE_NAME}")
    except Exception as e:
        logger.error(f"Error connecting to MongoDB: {e}")
        raise e
