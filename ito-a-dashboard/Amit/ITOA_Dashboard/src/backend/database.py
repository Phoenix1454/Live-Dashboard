"""
Simple in-memory database for user management.
In production, replace this with a proper database (PostgreSQL, MySQL, etc.)
"""

from typing import Optional, Dict
from auth import UserInDB, get_password_hash

# In-memory user database (replace with real database in production)
users_db: Dict[str, UserInDB] = {}

def get_user(username: str) -> Optional[UserInDB]:
    """
    Retrieve a user from the database by username.
    
    Args:
        username: Username to search for
        
    Returns:
        UserInDB object if found, None otherwise
    """
    if username in users_db:
        return users_db[username]
    return None

def create_user(username: str, password: str, email: Optional[str] = None, 
                full_name: Optional[str] = None) -> UserInDB:
    """
    Create a new user in the database.
    
    Args:
        username: Unique username
        password: Plain text password (will be hashed)
        email: Optional email address
        full_name: Optional full name
        
    Returns:
        Created UserInDB object
        
    Raises:
        ValueError: If username already exists
    """
    if username in users_db:
        raise ValueError("Username already exists")
    
    # Truncate password to 72 characters for bcrypt
    password = password[:72]
    hashed_password = get_password_hash(password)
    user = UserInDB(
        username=username,
        email=email,
        full_name=full_name,
        disabled=False,
        hashed_password=hashed_password
    )
    users_db[username] = user
    return user

def authenticate_user(username: str, password: str) -> Optional[UserInDB]:
    """
    Authenticate a user with username and password.
    
    Args:
        username: Username
        password: Plain text password
        
    Returns:
        UserInDB object if authentication successful, None otherwise
    """
    from auth import verify_password
    
    user = get_user(username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

# Create a default demo user for testing
def initialize_demo_user():
    """
    Create a demo user for testing purposes.
    Username: demo
    Password: demo123
    """
    try:
        create_user(
            username="demo",
            password="demo123",
            email="demo@example.com",
            full_name="Demo User"
        )
    except ValueError:
        # User already exists
        pass

# Initialize demo user on module import
initialize_demo_user()
