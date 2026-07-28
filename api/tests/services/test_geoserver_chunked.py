from __future__ import annotations

import pytest

from app.services import geoserver_chunked as chunked


class _FakeRedis:
    def __init__(self):
        self.store: dict[str, str] = {}

    def setex(self, key, _ttl, value):
        self.store[key] = value

    def get(self, key):
        return self.store.get(key)

    def exists(self, key):
        return 1 if key in self.store else 0

    def expire(self, key, _ttl):
        return 1 if key in self.store else 0

    def delete(self, *keys):
        for key in keys:
            self.store.pop(key, None)


@pytest.fixture
def staging(tmp_path, monkeypatch):
    fake = _FakeRedis()
    monkeypatch.setattr(chunked, "_redis_text", lambda: fake)
    monkeypatch.setattr(
        chunked.settings, "geoserver_upload_staging_dir", str(tmp_path), raising=False
    )
    return fake


def test_partes_van_a_disco_y_no_a_redis(staging, tmp_path):
    session_id = chunked.create_session({'name': 'a.tif', 'total_chunks': 2, 'total_size': 6})
    chunked.store_part(session_id, 1, b'abc')
    chunked.store_part(session_id, 2, b'def')

    assert chunked.missing_parts(session_id, 2) == []
    assert chunked.stored_bytes(session_id) == 6
    assert b''.join(chunked.iter_parts(session_id, 2)) == b'abcdef'
    assert list(staging.store) == [f"{chunked._PREFIX}:{session_id}"]
    assert (tmp_path / session_id / '1.part').read_bytes() == b'abc'


def test_missing_parts_detecta_faltantes(staging):
    session_id = chunked.create_session({'name': 'a.tif', 'total_chunks': 3, 'total_size': 9})
    chunked.store_part(session_id, 1, b'abc')
    chunked.store_part(session_id, 3, b'ghi')

    assert chunked.missing_parts(session_id, 3) == [2]
    with pytest.raises(KeyError):
        list(chunked.iter_parts(session_id, 3))


def test_store_part_reintentado_reemplaza_sin_duplicar(staging):
    session_id = chunked.create_session({'name': 'a.tif', 'total_chunks': 1, 'total_size': 3})
    chunked.store_part(session_id, 1, b'abc')
    chunked.store_part(session_id, 1, b'xyz')

    assert chunked.stored_bytes(session_id) == 3
    assert b''.join(chunked.iter_parts(session_id, 1)) == b'xyz'


def test_delete_session_borra_metadata_y_bytes(staging, tmp_path):
    session_id = chunked.create_session({'name': 'a.tif', 'total_chunks': 1, 'total_size': 3})
    chunked.store_part(session_id, 1, b'abc')

    chunked.delete_session(session_id, 1)

    assert not (tmp_path / session_id).exists()
    assert staging.store == {}


def test_cleanup_borra_solo_sesiones_expiradas(staging, tmp_path, monkeypatch):
    vivo = chunked.create_session({'name': 'vivo.tif', 'total_chunks': 1, 'total_size': 3})
    chunked.store_part(vivo, 1, b'abc')

    huerfano = tmp_path / 'sesion-abandonada'
    huerfano.mkdir()
    (huerfano / '1.part').write_bytes(b'abc')

    assert chunked.cleanup_stale_dirs() == 0

    monkeypatch.setattr(chunked, 'STALE_DIR_SECONDS', -1)
    assert chunked.cleanup_stale_dirs() == 1
    assert not huerfano.exists()
    assert (tmp_path / vivo).exists()


def test_max_total_bytes_cero_es_sin_limite(monkeypatch):
    monkeypatch.setattr(chunked.settings, 'geoserver_upload_max_bytes', 0, raising=False)
    assert chunked.max_total_bytes() == 0
    monkeypatch.setattr(chunked.settings, 'geoserver_upload_max_bytes', 1024, raising=False)
    assert chunked.max_total_bytes() == 1024
