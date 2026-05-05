import logging
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import PyMongoError

from app.core.config import settings

logger = logging.getLogger(__name__)

client: Optional[AsyncIOMotorClient] = None
_database: Optional[AsyncIOMotorDatabase] = None
_mongo_connected = False


async def connect_to_mongo() -> None:
    global client, _database, _mongo_connected
    if client is None:
        try:
            client = AsyncIOMotorClient(settings.mongo_uri, serverSelectionTimeoutMS=settings.mongo_timeout_ms)
            _database = client[settings.mongo_db_name]
            await _database.command("ping")
            _mongo_connected = True
            logger.info("Connected to MongoDB database %s", settings.mongo_db_name)
        except PyMongoError as exc:
            logger.warning("MongoDB unavailable at startup; history persistence will be disabled: %s", exc)
            if client is not None:
                client.close()
            client = None
            _database = None
            _mongo_connected = False


async def close_mongo_connection() -> None:
    global client, _database, _mongo_connected
    if client is not None:
        client.close()
    client = None
    _database = None
    _mongo_connected = False


def get_database() -> AsyncIOMotorDatabase:
    if _database is None:
        raise RuntimeError("MongoDB is not connected")
    return _database


def get_database_or_none() -> Optional[AsyncIOMotorDatabase]:
    return _database if _mongo_connected else None


def is_mongo_connected() -> bool:
    return _mongo_connected and _database is not None
