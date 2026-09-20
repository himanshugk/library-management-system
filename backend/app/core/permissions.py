"""Role constants used across the application."""
from enum import Enum


class Role(str, Enum):
    ADMIN = "ADMIN"
    STAFF = "STAFF"


# Actions that only an ADMIN may perform.
ADMIN_ONLY = {"staff"}