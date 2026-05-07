import re
from typing import Any

REDACTED = "[REDACTED]"

DEFAULT_SCRUBBERS: list[tuple[str, str]] = [
    (r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", REDACTED),
    (r"(?i)([?&](?:token|session|auth|api_key|key|secret|password|access_token|refresh_token|jwt)=)[^&\s]+", r"\1" + REDACTED),
    (r"(?i)(authorization\s*:\s*(?:bearer|basic)\s+)\S+", r"\1" + REDACTED),
    (r"\b(?:\d[ -]*?){13,16}\b", REDACTED),
]

PII_KEYS_TO_DROP = {"userAgent", "viewport", "user", "breadcrumbs"}
PII_FIELDS_IN_REPORTE = {"source_route"}


def _compile_patterns(extra: list[dict] | None) -> list[tuple[re.Pattern, str]]:
    compiled: list[tuple[re.Pattern, str]] = []
    for raw, replacement in DEFAULT_SCRUBBERS:
        compiled.append((re.compile(raw), replacement))
    for entry in extra or []:
        if not isinstance(entry, dict):
            continue
        pattern = entry.get("pattern")
        replacement = entry.get("replacement", REDACTED)
        if not pattern or not isinstance(pattern, str):
            continue
        try:
            compiled.append((re.compile(pattern), replacement))
        except re.error:
            continue
    return compiled


def _scrub_string(value: str, patterns: list[tuple[re.Pattern, str]]) -> str:
    out = value
    for pat, repl in patterns:
        out = pat.sub(repl, out)
    return out


def _scrub_walk(value: Any, patterns: list[tuple[re.Pattern, str]]) -> Any:
    if isinstance(value, str):
        return _scrub_string(value, patterns)
    if isinstance(value, dict):
        return {k: _scrub_walk(v, patterns) for k, v in value.items()}
    if isinstance(value, list):
        return [_scrub_walk(v, patterns) for v in value]
    return value


def scrub_text(text: str | None, extra_scrubbers: list[dict] | None = None) -> str | None:
    if not text:
        return text
    patterns = _compile_patterns(extra_scrubbers)
    return _scrub_string(text, patterns)


def scrub_source_context(
    source_context: dict | None,
    *,
    disable_pii: bool = False,
    extra_scrubbers: list[dict] | None = None,
) -> dict:
    if not isinstance(source_context, dict):
        return {}
    if disable_pii:
        result = {}
        for key, value in source_context.items():
            if key in PII_KEYS_TO_DROP:
                continue
            result[key] = value
        if "auto" in result and isinstance(result["auto"], dict):
            auto = dict(result["auto"])
            auto.pop("userAgent", None)
            auto.pop("viewport", None)
            auto.pop("ip", None)
            result["auto"] = auto
        patterns = _compile_patterns(extra_scrubbers)
        return _scrub_walk(result, patterns)

    patterns = _compile_patterns(extra_scrubbers)
    return _scrub_walk(source_context, patterns)


def scrub_respuestas(
    respuestas: dict | None,
    *,
    extra_scrubbers: list[dict] | None = None,
) -> dict | None:
    if not respuestas:
        return respuestas
    patterns = _compile_patterns(extra_scrubbers)
    return _scrub_walk(respuestas, patterns)
