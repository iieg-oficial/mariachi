import os

os.environ.setdefault("MINERVA_ISSUER_URL", "http://minerva.test")
os.environ.setdefault("MINERVA_APPLICATION_CODE", "mariachi")
os.environ.setdefault("MINERVA_CLIENT_ID", "test-client-id")
os.environ.setdefault("MINERVA_CLIENT_SECRET", "test-client-secret")
os.environ.setdefault(
    "MINERVA_REDIRECT_URI", "http://mariachi.test/api/mariachi/autenticacion/callback"
)
os.environ.setdefault("MINERVA_POST_LOGIN_URL", "http://mariachi.test")


def _hashear_una_sola_vez() -> None:
    from functools import lru_cache

    import app.core.security as seguridad

    seguridad.hash_password = lru_cache(maxsize=None)(seguridad.hash_password)


_hashear_una_sola_vez()
