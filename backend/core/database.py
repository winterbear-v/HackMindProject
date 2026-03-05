import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017/mernapp")

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    try:
        client = AsyncIOMotorClient(MONGO_URI)
        # Verify connection
        await client.admin.command("ping")
        db = client.get_default_database(default="mernapp")
        print("MongoDB Connected")
    except Exception as e:
        print(f"MongoDB connection error: {e}")
        sys.exit(1)


async def disconnect_db():
    global client
    if client:
        client.close()


def get_db():
    return db
