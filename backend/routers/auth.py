from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config as StarletteConfig

from core.database import get_db
from core.security import verify_password, create_token
from core.config import settings
from schemas.auth import UserCreate, UserResponse, Token
from core import crud
import logging
import secrets

logger = logging.getLogger(__name__)

# ─── OAuth2 Client Setup ───────────────────────────────────────────────────────
starlette_config = StarletteConfig(environ={
    "GOOGLE_CLIENT_ID": settings.GOOGLE_CLIENT_ID,
    "GOOGLE_CLIENT_SECRET": settings.GOOGLE_CLIENT_SECRET,
})

oauth = OAuth(starlette_config)
oauth.register(
    name="google",
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

# ─── Main Auth Router ──────────────────────────────────────────────────────────
router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user account.

    Body (JSON): email, full_name, password, role (optional)
    """
    existing = crud.get_user_by_email(db, email=user.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )
    
    # Force local provider — client cannot override this
    user.auth_provider = "local"
    return crud.create_user(db=db, user=user)


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Login with email (as 'username') and password.
    Returns a JWT Bearer token.

    Body (form-urlencoded): username (email), password
    """
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Block Google-only accounts from using the password form
    if getattr(user, "auth_provider", "local") == "google":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account was created with Google Sign-In. Please use the 'Continue with Google' button.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


# ─── Google OAuth2 ─────────────────────────────────────────────────────────────
@router.get("/google", tags=["Google OAuth2"])
async def google_login(request: Request):
    """
    Step 1: Redirect the user to Google's login page.

    The frontend should send the user to this URL when they click 'Login with Google'.
    """
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback", tags=["Google OAuth2"])
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """
    Step 2: Google redirects here after the user approves access.

    The backend:
    1. Exchanges the code for a Google access token
    2. Fetches the user's email and name from Google
    3. Creates a new user account if they don't exist yet
    4. Issues a JWT token and redirects to the frontend
    """
    try:
        google_token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        logger.error(f"Google OAuth token exchange failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google authentication failed. Please try again.",
        )

    # Extract user info from the Google ID token
    user_info = google_token.get("userinfo")
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not retrieve user info from Google.",
        )

    email = user_info.get("email")
    full_name = user_info.get("name", email)

    # Find or create the user in our database
    user = crud.get_user_by_email(db, email=email)
    
    if user:
        # CASE 1: Email exists but was registered with email+password (any role).
        # Block: Google OAuth cannot hijack a local account — instructor or student.
        if getattr(user, "auth_provider", "local") == "local":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists. Please log in with your email and password.",
            )
        # CASE 2: Returning Google student — log them in.
        # (auth_provider == "google", no action needed)

    else:
        # CASE 3: No existing account — create a Google-only STUDENT account.
        # This endpoint is a student-only entry point by design.
        # Instructors are never created here:
        #   a) The frontend never shows them the Google button.
        #   b) Even if they bypass the frontend and hit this URL directly,
        #      they get a student account — not instructor access.
        #      They cannot do anything an instructor can do.
        new_user = UserCreate(
            email=email,
            full_name=full_name,
            password=secrets.token_hex(32),  # cryptographically random, never retrievable
            role="student",                  # hardcoded — cannot be overridden by client
            auth_provider="google",
        )
        user = crud.create_user(db=db, user=new_user)

    # Issue our own JWT and redirect to the frontend
    access_token = create_token(data={"sub": user.email})
    frontend_redirect = f"{settings.FRONTEND_URL}/auth/callback?token={access_token}"
    return RedirectResponse(url=frontend_redirect)


# ─── Hidden /token endpoint (OAuth2 standard for Swagger UI Authorize button) ──
token_router = APIRouter(tags=["Authentication"])

@token_router.post("/token", response_model=Token, include_in_schema=False)
def token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Alias for /auth/login — required by OAuth2 for the Swagger Authorize button."""
    return login(form_data=form_data, db=db)
