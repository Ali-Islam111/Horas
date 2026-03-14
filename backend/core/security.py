from datetime import datetime, timedelta, timezone
import jwt
from passlib.context import CryptContext
from core.config import settings

# Setup the password hashing context using Bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:

    #Takes a plain-text password and returns a securely hashed string.
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Compares a plain-text password with a hashed password from the database.
    Returns True if they match, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)

def create_token(data: dict) -> str:
    """
    Generates a JSON Web Token (JWT) with an expiration time.
    'data' usually contains something like {"sub": user.email, "user_id": user.id}
    """
    # Create a copy of the data so we don't accidentally modify the original dictionary
    to_encode = data.copy()
    
    # Calculate the expiration time (Current UTC time + 1440 minutes from config)
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Add the expiration timestamp ('exp') to the payload
    to_encode.update({"exp": expire})
    
    # Cryptographically sign the token using our SECRET_KEY and ALGORITHM
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    return encoded_jwt