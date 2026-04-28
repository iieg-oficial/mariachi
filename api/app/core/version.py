import tomllib
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path

_PYPROJECT = Path(__file__).resolve().parent.parent.parent / "pyproject.toml"


def get_app_version(fallback: str = "0.0.0") -> str:
    try:
        with _PYPROJECT.open("rb") as f:
            return tomllib.load(f)["project"]["version"]
    except (OSError, KeyError, ValueError):
        pass
    try:
        return version("mariachi-api")
    except PackageNotFoundError:
        return fallback
