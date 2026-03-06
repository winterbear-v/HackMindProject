import os
import sys
import re
from urllib.parse import quote_plus
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017/mernapp")


def _encode_mongo_uri(uri: str) -> str:
    """
    Auto-encode special characters in MongoDB URI username and password.
    """
    pattern = r'^(mongodb(?:\+srv)?://)([^:@/]+):([^@]+)@(.+)$'
    match = re.match(pattern, uri)
    if not match:
        return uri
    prefix   = match.group(1)
    username = match.group(2)
    password = match.group(3)
    rest     = match.group(4)
    encoded_uri = f"{prefix}{quote_plus(username)}:{quote_plus(password)}@{rest}"
    return encoded_uri


client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    try:
        safe_uri = _encode_mongo_uri(MONGO_URI)

        # ✅ Fix for SSL/TLS error on Python 3.13 + Windows + pymongo 4.16
        # ssl_context param was removed in pymongo 4.x — use these flags instead
        client = AsyncIOMotorClient(
            safe_uri,
            tls=True,
            tlsAllowInvalidCertificates=True,
            tlsAllowInvalidHostnames=True,
            serverSelectionTimeoutMS=30000,
            connectTimeoutMS=30000,
            socketTimeoutMS=30000,
            retryWrites=True,
        )

        # Verify connection
        await client.admin.command("ping")
        db = client.get_default_database(default="mernapp")
        print("✅ MongoDB Connected successfully!")

    except Exception as e:
        print(f"❌ MongoDB connection error: {e}")
        print("\n💡 Troubleshooting tips:")
        print("   1. Check your MONGO_URI in backend/.env")
        print("   2. IP Access List → must have 0.0.0.0/0 in MongoDB Atlas")
        print("   3. Make sure your cluster is not paused in MongoDB Atlas\n")
        sys.exit(1)


async def disconnect_db():
    global client
    if client:
        client.close()


def get_db():
    return db