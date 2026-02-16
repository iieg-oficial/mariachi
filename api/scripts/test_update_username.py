import sys
import os

# Add the parent directory to sys.path to allow imports from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.user import Usuario
from app.schemas.user import UsuarioUpdate

def test_update_username(current_username, new_username):
    db = SessionLocal()
    try:
        user = db.query(Usuario).filter(Usuario.username == current_username).first()
        if not user:
            print(f"Error: Usuario '{current_username}' no encontrado.")
            return

        print(f"Username actual: {user.username}")
        
        # Simulate what the endpoint does
        try:
            # Check for conflict manually as done in endpoint
            existing = db.query(Usuario).filter(Usuario.username == new_username).first()
            if existing:
                print(f"FAILURE: El username '{new_username}' ya existe.")
                return

            usuario_in = UsuarioUpdate(username=new_username)
            update_data = usuario_in.model_dump(exclude_unset=True)
            
            for field, value in update_data.items():
                setattr(user, field, value)

            db.commit()
            db.refresh(user)
            
            print(f"Username nuevo en DB: {user.username}")
            
            if user.username == new_username:
                print("SUCCESS: El username se actualizó correctamente.")
            else:
                print("FAILURE: El username NO se actualizó.")
        except Exception as e:
             print(f"Error durante update: {e}")

    except Exception as e:
        print(f"Error general: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Uso: python scripts/test_update_username.py <current_username> <new_username>")
        sys.exit(1)
    
    test_update_username(sys.argv[1], sys.argv[2])
