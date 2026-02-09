import os
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import SessionLocal, engine
from app.core.security import hash_password
from app.models import Base, Icon, Layout, MediaFolder, MenuItem, Style, Usuario


def crear_tablas():
    print("Creando tablas en la base de datos...")
    Base.metadata.create_all(bind=engine)
    print("✓ Tablas creadas")


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
    disenadora_password = os.getenv("SAMPLE_DISENADORA_PASSWORD")
    
    if not editora_password or not disenadora_password:
        print("SAMPLE_EDITORA_PASSWORD o SAMPLE_DISENADORA_PASSWORD no definidos. Omitiendo usuarios de ejemplo.")
        return

    usuarios = [
        {
            "username": "editora1",
            "email": "editora@iieg.gob.mx",
            "name": "María Editora",
            "password": editora_password,
            "role": "editora",
        },
        {
            "username": "disenadora1",
            "email": "disenadora@iieg.gob.mx",
            "name": "Ana Diseñadora",
            "password": disenadora_password,
            "role": "diseñadora",
        },
    ]

    for usuario_data in usuarios:
        usuario_existente = (
            db.query(Usuario)
            .filter(Usuario.username == usuario_data["username"])
            .first()
        )
        if not usuario_existente:
            nuevo_usuario = Usuario(
                username=usuario_data["username"],
                email=usuario_data["email"],
                name=usuario_data["name"],
                hashed_password=hash_password(usuario_data["password"]),
                role=usuario_data["role"],
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
    ]

    for item_data in menu_items:
        item_existente = db.query(MenuItem).filter(MenuItem.url == item_data["url"]).first()
        if not item_existente:
            nuevo_item = MenuItem(**item_data)
            db.add(nuevo_item)

    db.commit()
    print("✓ Items de menú creados")


def crear_layouts_ejemplo(db):
    print("Creando layouts de ejemplo...")

    layouts = [
        {
            "type": "header",
            "config": {
                "logo": "https://via.placeholder.com/150x50",
                "showSearch": True,
                "backgroundColor": "#ffffff",
            },
        },
        {
            "type": "footer",
            "config": {
                "copyright": "© 2024 IIEG. Todos los derechos reservados.",
                "socialLinks": [
                    {"name": "Facebook", "url": "https://facebook.com/iieg"},
                    {"name": "Twitter", "url": "https://twitter.com/iieg"},
                ],
            },
        },
    ]

    for layout_data in layouts:
        layout_existente = db.query(Layout).filter(Layout.type == layout_data["type"]).first()
        if not layout_existente:
            nuevo_layout = Layout(**layout_data)
            db.add(nuevo_layout)

    db.commit()
    print("✓ Layouts creados")


def crear_estilos_ejemplo(db):
    print("Creando estilos globales de ejemplo...")


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

    estilo_existente = db.query(Style).filter(Style.key == "global").first()

    if not estilo_existente:
        estilo = Style(
            key="global",
            config={
                "typography": {
                    "fontFamily": "Inter, sans-serif",
                    "headingFont": "Poppins, sans-serif",
                },
                "colors": {
                    "primary": "#1890ff",
                    "secondary": "#52c41a",
                    "text": "#000000",
                    "background": "#ffffff",
                },
            },
        )
        db.add(estilo)
        db.commit()
        print("✓ Estilos globales creados")
    else:
        print("✓ Estilos globales ya existen")


def main():
    print("=" * 60)
    print("Inicializando base de datos - Backend Portal IIEG")
    print("=" * 60)
    print()

    db = SessionLocal()

    try:
        crear_tablas()
        crear_carpeta_raiz(db)
        crear_usuario_admin(db)
        crear_usuarios_ejemplo(db)
        crear_menu_items_ejemplo(db)
        crear_layouts_ejemplo(db)
        crear_estilos_ejemplo(db)

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
