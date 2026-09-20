"""Testable clock/date service.

Business logic always routes "what day is it?" through this module so tests can
freeze or shift time instead of waiting real days.
"""
from datetime import date, datetime


class Clock:
    def today(self) -> date:
        return date.today()

    def now(self) -> datetime:
        return datetime.now()


# Single shared clock. Tests replace it via `app.utils.clock.set_clock(...)`.
clock = Clock()


def set_clock(new_clock: Clock) -> None:
    """Swap the active clock (used by tests to simulate dates)."""
    global clock
    clock = new_clock


def today() -> date:
    return clock.today()


def now() -> datetime:
    return clock.now()