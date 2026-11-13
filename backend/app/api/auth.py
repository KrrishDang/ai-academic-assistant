"""Authentication API endpoints for user registration, login, and user profile."""

import logging
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session
import jwt

from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.auth import TokenResponse, UserLoginRequest, UserRegisterRequest, UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


def get_optional_current_user(
    request: Request,
    db: Annotated[Session, Depends(get_db_session)],
) -> User | None:
    """Dependency that returns authenticated User if Bearer token is provided.

    - When the Authorization header is absent, returns None (allowing anonymous V1 access).
    - When the Authorization header is present, strictly validates the token.
      Any invalid, malformed, expired, or deactivated user credentials raise HTTP 401.
    """
    auth_header = request.headers.get("authorization")
    if not auth_header:
        return None

    parts = auth_header.strip().split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Expected 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]
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

    if not user.is_active or user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or suspended",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_current_user(
    current_user: Annotated[User | None, Depends(get_optional_current_user)],
) -> User:
    """Dependency for endpoints requiring mandatory authentication."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


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
    user_name = payload.display_name or payload.email.split("@")[0]
    user = User(
        email=payload.email,
        password_hash=hashed_pw,
        name=user_name,
        display_name=payload.display_name,
        role="user",
        is_active=True,
        is_verified=False,
        is_banned=False,
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

    if not user.is_active or user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive or suspended",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user.last_login = datetime.now(timezone.utc)
    db.commit()

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
