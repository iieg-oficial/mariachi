import os
import subprocess
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import MediaFolder, MenuItem, Usuario

API_ROOT = Path(__file__).parent.parent


def aplicar_migraciones():
    print("Aplicando migraciones Alembic (schema mariachi)...")
    result = subprocess.run(
        ["alembic", "upgrade", "head"],
        cwd=API_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr, file=sys.stderr)
        raise RuntimeError("Alembic upgrade fallo")
    print("✓ Migraciones mariachi aplicadas")
    print()
    print("ℹ Las migraciones del schema mapalab.* viven en mapalab-dataengine.")
    print("  Aplicalas desde alli con: cd ../mapalab-dataengine && make migrate")


def crear_usuario_admin(db):
    print("Creando usuario administrador...")

    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin_password = os.getenv("ADMIN_PASSWORD")

    if not admin_password:
        print("ADMIN_PASSWORD no está definida en variables de entorno. Omitiendo creación de admin.")
        return

    admin = (
        db.query(Usuario).filter(Usuario.username == admin_username).first()
    )

    if not admin:
        admin = Usuario(
            username=admin_username,
            email=os.getenv("ADMIN_EMAIL", "admin@iieg.gob.mx"),
            name="Administrador",
            hashed_password=hash_password(admin_password),
            role="tetlamamakani",
        )
        db.add(admin)
        db.commit()
        print(f"✓ Usuario admin creado (usuario: {admin_username})")
    else:
        print("✓ Usuario admin ya existe")


def crear_usuarios_ejemplo(db):
    if os.getenv("CREATE_SAMPLE_USERS", "false").lower() != "true":
        return

    print("Creando usuarios de ejemplo...")

    editora_password = os.getenv("SAMPLE_EDITORA_PASSWORD")

    if not editora_password:
        print("SAMPLE_EDITORA_PASSWORD no definida. Omitiendo usuario de ejemplo.")
        return

    usuario_existente = (
        db.query(Usuario)
        .filter((Usuario.username == "editora1") | (Usuario.email == "editora@iieg.gob.mx"))
        .first()
    )
    if not usuario_existente:
        nuevo_usuario = Usuario(
            username="editora1",
            email="editora@iieg.gob.mx",
            name="María Editora",
            hashed_password=hash_password(editora_password),
            role="editora",
        )
        db.add(nuevo_usuario)
        db.commit()
    print("✓ Usuarios de ejemplo creados")


def crear_menu_items_ejemplo(db):
    print("Creando items de menú de ejemplo...")

    menu_items = [
        {"label": "Inicio", "url": "/", "order": 1, "visible": True, "disabled": False},
        {"label": "Conocenos", "url": "/conocenos", "order": 2, "visible": True, "disabled": False},
        {"label": "Sistema de información", "url": "/sistema-de-informacion", "order": 3, "visible": True, "disabled": False},
        {"label": "Datos Abiertos y documentación", "url": "/datos-abiertos-y-documentacion", "order": 4, "visible": True, "disabled": False},
        {"label": "Comunidad", "url": "/comunidad", "order": 5, "visible": True, "disabled": False},
        {"label": "Transparencia", "url": "/transparencia", "order": 6, "visible": True, "disabled": False},
        {"label": "Trámites y servicios", "url": "/tramites-y-servicios", "order": 7, "visible": True, "disabled": False},
        {"label": "Próximamente", "url": "/proximamente", "order": 8, "visible": True, "disabled": True},
    ]

    for item_data in menu_items:
        item_existente = db.query(MenuItem).filter(MenuItem.url == item_data["url"]).first()
        if not item_existente:
            nuevo_item = MenuItem(**item_data)
            db.add(nuevo_item)

    db.commit()
    print("✓ Items de menú creados")


def crear_carpeta_raiz(db):
    print("Creando carpeta raíz de media...")
    carpeta = db.query(MediaFolder).filter(MediaFolder.path == "/").first()
    if not carpeta:
        carpeta = MediaFolder(name="Root", path="/", parent=None)
        db.add(carpeta)
        db.commit()
        print("✓ Carpeta raíz creada")
    else:
        print("✓ Carpeta raíz ya existe")


def main():
    print("=" * 60)
    print("Inicializando base de datos — Mariachi API")
    print("=" * 60)
    print()

    aplicar_migraciones()

    db = SessionLocal()

    try:
        crear_carpeta_raiz(db)
        crear_usuario_admin(db)
        crear_usuarios_ejemplo(db)
        crear_menu_items_ejemplo(db)

        print()
        print("=" * 60)
        print("✓ Inicialización completada exitosamente")
        print("=" * 60)
        print()

    except Exception as e:
        print(f"❌ Error durante la inicialización: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
