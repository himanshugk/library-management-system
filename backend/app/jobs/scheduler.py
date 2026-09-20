"""Scheduled job runner using APScheduler.

The overdue job is a BackgroundScheduler interval job so closed-loop
notification happens even when nobody opens the website. On Render/Vercel we
run the FastAPI process with workers=1 so exactly one scheduler instance runs.
"""
import logging
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler

from app.core.config import settings

logger = logging.getLogger("lms.scheduler")

_scheduler: BackgroundScheduler | None = None
OVERDUE_INTERVAL_SECONDS = 300  # every 5 minutes


def _run_job() -> None:
    from app.db.session import SessionLocal
    from app.jobs.overdue_job import run_overdue_check

    db = SessionLocal()
    try:
        checked, sent = run_overdue_check(db)
        if checked or sent:
            logger.info(
                "overdue-check ran at %s: checked=%d sent=%d",
                datetime.now().isoformat(),
                checked,
                sent,
            )
    except Exception as exc:  # pragma: no cover
        logger.exception("overdue-check failed: %s", exc)
    finally:
        db.close()


def start_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        return
    if settings.ENVIRONMENT.lower() in {"testing", "test"}:
        return
    _scheduler = BackgroundScheduler(daemon=True)
    _scheduler.add_job(
        _run_job,
        "interval",
        seconds=OVERDUE_INTERVAL_SECONDS,
        id="overdue_check",
        max_instances=1,
        coalesce=True,
    )
    _scheduler.start()
    logger.info("Overdue-check scheduler started (every %ds).", OVERDUE_INTERVAL_SECONDS)


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None