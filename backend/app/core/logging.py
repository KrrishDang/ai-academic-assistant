"""Central logging configuration."""

import logging
from logging.config import dictConfig


def configure_logging(log_level: str) -> None:
    """Configure consistent console logging for the API process."""
    normalized_level = log_level.upper()
    if normalized_level not in logging.getLevelNamesMapping():
        normalized_level = "INFO"

    dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s %(levelname)s [%(name)s] %(message)s",
                    "datefmt": "%Y-%m-%dT%H:%M:%S%z",
                }
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                    "stream": "ext://sys.stdout",
                }
            },
            "root": {"level": normalized_level, "handlers": ["console"]},
        }
    )
