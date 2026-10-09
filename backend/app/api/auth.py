"""Authentication API endpoints for user registration, login, and user profile."""

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session
import jwt

from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.auth import TokenResponse, UserLoginRequest, UserRegisterRequest, UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])
security_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    auth_credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)],
    db: Annotated[Session, Depends(get_db_session)],
) -> User:
    """Dependency to retrieve and authenticate current user from Bearer JWT token."""
    if not auth_credentials or not auth_credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_credentials.credentials
    try:
        payload = decode_access_token(token)
        user_id_str: str | None = payload.get("sub")
        if not user_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id = uuid.UUID(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: UserRegisterRequest,
    db: Annotated[Session, Depends(get_db_session)],
) -> UserResponse:
    """Register a new user account with unique email and hashed password."""
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists",
        )

    hashed_pw = hash_password(payload.password)
    user = User(
        email=payload.email,
        password_hash=hashed_pw,
        display_name=payload.display_name,
        name=payload.display_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    logger.info("User registered successfully with ID %s", user.id)
    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.effective_display_name,
        created_at=user.created_at,
    )


@router.post("/login", response_model=TokenResponse)
def login_user(
    payload: UserLoginRequest,
    db: Annotated[Session, Depends(get_db_session)],
) -> TokenResponse:
    """Authenticate user with email/password and return an expiring JWT access token."""
    user = db.scalar(select(User).where(User.email == payload.email))

    # Generic error message to prevent user enumeration
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(subject=user.id)
    logger.info("User logged in successfully: ID %s", user.id)
    return TokenResponse(access_token=token, token_type="bearer")


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    """Return the profile of the currently authenticated user."""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        display_name=current_user.effective_display_name,
        created_at=current_user.created_at,
    )
