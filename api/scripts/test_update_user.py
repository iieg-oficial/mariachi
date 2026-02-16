import sys
import os

# Add the parent directory to sys.path to allow imports from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.user import Usuario
from app.schemas.user import UsuarioUpdate

def test_update_user(username, new_name):
    db = SessionLocal()
    try:
        user = db.query(Usuario).filter(Usuario.username == username).first()
        if not user:
            print(f"Error: Usuario '{username}' no encontrado.")
            return

        print(f"Nombre actual: {user.name}")
        
        # Simulate what the endpoint does
        usuario_in = UsuarioUpdate(name=new_name)
        update_data = usuario_in.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(user, field, value)

        db.commit()
        db.refresh(user)
        
        print(f"Nombre nuevo en DB: {user.name}")
        
        if user.name == new_name:
            print("SUCCESS: El nombre se actualizó correctamente.")
        else:
            print("FAILURE: El nombre NO se actualizó.")

    except Exception as e:
        print(f"Error al actualizar usuario: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Uso: python scripts/test_update_user.py <username> <new_name>")
        sys.exit(1)
    
    test_update_user(sys.argv[1], sys.argv[2])
