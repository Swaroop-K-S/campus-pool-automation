from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


async def init_db():
    """
    Initialize MongoDB connection and Beanie ODM.
    """
    try:
        client = AsyncIOMotorClient(settings.MONGODB_URI)
        database = client[settings.DATABASE_NAME]
        await init_beanie(
            database=database,
            document_models=[
                "app.models.drive.DriveModel",
                "app.models.drive.RoundModel",
                "app.models.room.RoomModel",
                "app.models.student.StudentModel"
            ]
        )
        logger.info(f"Successfully connected to MongoDB: {settings.DATABASE_NAME}")
    except Exception as e:
        logger.error(f"Error connecting to MongoDB: {e}")
        raise e
