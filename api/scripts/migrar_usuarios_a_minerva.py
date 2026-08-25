"""Da de alta en minerva el padron de mariachi, con sus roles de la aplicacion.

Sin esto, el dia que se exponga el login nadie entra: minerva no emite codigo de
autorizacion a quien no tiene al menos un rol de la aplicacion, y responde
`redirect_uri?error=access_denied`.

No inventa un modelo nuevo: lee `usuarios` + `user_projects` de mariachi,
traduce con `app.services.minerva_migracion` y llama a la API del panel de
minerva, que es unitaria. `minerva_sub` NO se escribe aqui: lo enlaza solo
`resolve_user()` en el primer login, buscando por correo.

Uso (dentro del contenedor de la api):

    python scripts/migrar_usuarios_a_minerva.py                  # plan, no escribe
    python scripts/migrar_usuarios_a_minerva.py --aplicar        # da de alta

Autenticacion: pide correo y contrasena de un administrador global de minerva
(`minerva.admin`). No se guardan; se usan para abrir la sesion del panel y se
descartan al terminar. Se pueden pasar por `MINERVA_ADMIN_EMAIL` y
`MINERVA_ADMIN_PASSWORD` para correrlo desatendido.

Es idempotente: quien ya existe en minerva no se recrea, y un rol ya asignado no
se vuelve a asignar.
"""
import argparse
import csv
import json
import os
import secrets
import sys
from datetime import datetime, timezone
from getpass import getpass
from pathlib import Path

import httpx

sys.path.append(str(Path(__file__).parent.parent))

from app.api.routes.users import _user_memberships  # noqa: E402
from app.core.database import SessionLocal  # noqa: E402
from app.models.user import Usuario  # noqa: E402
from app.services.minerva_migracion import planificar  # noqa: E402

APLICACION = "mariachi"
_TIMEOUT = httpx.Timeout(30.0)


class MinervaPanel:
    """Cliente minimo del panel: cookie de sesion mas `X-CSRF-Token`.

    El panel no acepta tokens de consumidor ni existe `client_credentials`, asi
    que la unica via es iniciar sesion como lo haria una persona.
    """

    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.cliente = httpx.Client(base_url=self.base_url, timeout=_TIMEOUT, follow_redirects=False)
        self.csrf = ""

    def login(self, email: str, password: str) -> None:
        respuesta = self.cliente.post("/auth/login", json={"email": email, "password": password})
        respuesta.raise_for_status()
        self.csrf = respuesta.json().get("csrf", "")
        if not self.csrf:
            self.csrf = self.cliente.get("/auth/session").json().get("csrf", "")

    def _headers(self) -> dict:
        return {"X-CSRF-Token": self.csrf}

    def usuarios(self) -> list[dict]:
        salida, offset = [], 0
        while True:
            pagina = self.cliente.get("/users", params={"offset": offset, "limit": 500}).json()
            salida.extend(pagina["items"])
            offset += len(pagina["items"])
            if offset >= pagina["total"] or not pagina["items"]:
                return salida

    def roles(self) -> list[dict]:
        salida, offset = [], 0
        while True:
            pagina = self.cliente.get("/roles", params={"offset": offset, "limit": 500}).json()
            salida.extend(pagina["items"])
            offset += len(pagina["items"])
            if offset >= pagina["total"] or not pagina["items"]:
                return salida

    def aplicacion(self, slug: str) -> dict | None:
        pagina = self.cliente.get("/applications", params={"offset": 0, "limit": 500}).json()
        return next((a for a in pagina["items"] if a.get("slug") == slug), None)

    def usuarios_por_rol(self, role_id: str) -> set[str]:
        respuesta = self.cliente.get(f"/roles/{role_id}/users")
        if respuesta.status_code == 404:
            return set()
        respuesta.raise_for_status()
        return {u["id"] for u in respuesta.json()}

    def crear_usuario(self, email: str, full_name: str, password: str) -> dict:
        respuesta = self.cliente.post(
            "/users",
            json={"email": email, "full_name": full_name, "password": password},
            headers=self._headers(),
        )
        respuesta.raise_for_status()
        return respuesta.json()

    def asignar_rol(self, user_id: str, role_id: str) -> None:
        respuesta = self.cliente.post(
            f"/groups/users/{user_id}/roles/{role_id}", headers=self._headers()
        )
        if respuesta.status_code not in (200, 201, 204, 409):
            respuesta.raise_for_status()

    def cerrar(self) -> None:
        self.cliente.close()


def _padron_de_mariachi() -> list[dict]:
    """El padron completo, sin enmascarar.

    No se usa `_serialize_user()` a proposito: sin un `viewer` con permiso
    devuelve el correo enmascarado y la lista de proyectos vacia, y con eso
    nadie recibiria rol alguno.
    """
    session = SessionLocal()
    try:
        return [
            {
                "id": usuario.id,
                "username": usuario.username,
                "email": usuario.email,
                "name": usuario.name,
                "role": usuario.role,
                "projects": _user_memberships(session, usuario.id),
                "minerva_vinculado": bool(usuario.minerva_sub),
            }
            for usuario in session.query(Usuario).order_by(Usuario.id).all()
        ]
    finally:
        session.close()


def _nombre_valido(nombre: str, email: str) -> str:
    """minerva exige `full_name` de al menos 6 caracteres."""
    candidato = (nombre or "").strip()
    if len(candidato) >= 6:
        return candidato[:255]
    return (candidato or email.split("@", 1)[0]).ljust(6, ".")[:255]


def _imprimir_plan(plan: dict) -> None:
    print(f"padron de mariachi: {plan['total']} usuarios")
    print(f"  altas en minerva:  {len(plan['crear'])}")
    print(f"  ya existen alla:   {len(plan['existentes'])}")
    print(f"  sin roles:         {len(plan['sin_roles'])}")
    print(f"  correos repetidos: {len(plan['duplicados'])}")

    for titulo, clave in (("ALTAS", "crear"), ("YA EXISTEN", "existentes")):
        if not plan[clave]:
            continue
        print(f"\n{titulo}")
        for fila in plan[clave]:
            print(f"  {fila['email']:<40} {fila['role']:<15} {', '.join(fila['roles_minerva'])}")

    for titulo, clave in (("SIN ROLES (no entrarian)", "sin_roles"), ("CORREO REPETIDO", "duplicados")):
        if not plan[clave]:
            continue
        print(f"\n{titulo}")
        for fila in plan[clave]:
            print(f"  {fila['email'] or '(sin correo)':<40} {fila['role']:<15} {fila.get('motivo', '')}")


def _aplicar(panel: MinervaPanel, plan: dict, roles_por_nombre: dict, salida: Path) -> None:
    credenciales = []
    aplicados = 0

    miembros = {nombre: panel.usuarios_por_rol(rol["id"]) for nombre, rol in roles_por_nombre.items()}
    por_correo = {u["email"].lower(): u["id"] for u in panel.usuarios()}

    for fila in plan["crear"] + plan["existentes"]:
        faltantes = [n for n in fila["roles_minerva"] if n not in roles_por_nombre]
        if faltantes:
            print(f"  [omitido] {fila['email']}: minerva no declara {faltantes}", flush=True)
            continue

        user_id = por_correo.get(fila["email"])

        if user_id is None:
            password = secrets.token_urlsafe(12)
            creado = panel.crear_usuario(
                fila["email"], _nombre_valido(fila["name"], fila["email"]), password
            )
            credenciales.append({"email": fila["email"], "password": password})
            user_id = creado["id"]
            por_correo[fila["email"]] = user_id
            print(f"  [alta] {fila['email']}", flush=True)

        for nombre in fila["roles_minerva"]:
            if user_id in miembros.get(nombre, set()):
                continue
            panel.asignar_rol(user_id, roles_por_nombre[nombre]["id"])
            miembros.setdefault(nombre, set()).add(user_id)
            print(f"     + {nombre}", flush=True)
        aplicados += 1

    print(f"\nusuarios procesados: {aplicados}")

    if credenciales:
        salida.parent.mkdir(parents=True, exist_ok=True)
        with salida.open("w", newline="", encoding="utf-8") as archivo:
            escritor = csv.DictWriter(archivo, fieldnames=["email", "password"])
            escritor.writeheader()
            escritor.writerows(credenciales)
        salida.chmod(0o600)
        print(f"credenciales temporales en {salida} ({len(credenciales)} altas)")
        print("Entregalas por un canal seguro y borra el archivo despues.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--minerva-url", default=os.getenv("MINERVA_ISSUER_URL", "http://localhost:9000"))
    parser.add_argument("--aplicar", action="store_true", help="escribe en minerva; sin esto solo planea")
    parser.add_argument("--plan-json", type=Path, help="guarda el plan en un archivo")
    parser.add_argument(
        "--credenciales",
        type=Path,
        default=Path("/tmp/minerva-altas.csv"),
        help="donde dejar las contrasenas temporales de las altas",
    )
    args = parser.parse_args()

    padron = _padron_de_mariachi()
    if not padron:
        print("El padron de mariachi esta vacio: no hay nada que migrar")
        return 0

    email = os.getenv("MINERVA_ADMIN_EMAIL") or input("Correo del administrador de minerva: ")
    password = os.getenv("MINERVA_ADMIN_PASSWORD") or getpass("Contrasena: ")

    panel = MinervaPanel(args.minerva_url)
    try:
        panel.login(email, password)
        correos = {u["email"] for u in panel.usuarios()}
        aplicacion = panel.aplicacion(APLICACION)
        roles_app = (
            {r["name"]: r for r in panel.roles() if r["application_id"] == aplicacion["id"]}
            if aplicacion
            else {}
        )

        plan = planificar(padron, correos)
        plan["generado_en"] = datetime.now(timezone.utc).isoformat()
        _imprimir_plan(plan)

        necesarios = {n for fila in plan["crear"] + plan["existentes"] for n in fila["roles_minerva"]}
        ausentes = sorted(necesarios - set(roles_app))
        if ausentes:
            print(
                f"\nATENCION: minerva no declara {len(ausentes)} de los {len(necesarios)} roles "
                f"que este plan necesita:\n  - " + "\n  - ".join(ausentes)
            )
            print(
                "\nEs el sintoma de un manifiesto desactualizado del lado de minerva. "
                "Copia manifest.minerva.yml de mariachi a su carpeta manifests/ y reimportalo "
                "(panel, o `python -m app.cli import-manifests` en su backend)."
            )

        if args.plan_json:
            args.plan_json.write_text(json.dumps(plan, indent=2, ensure_ascii=False), encoding="utf-8")
            print(f"\nplan guardado en {args.plan_json}")

        if not args.aplicar:
            print("\nEsto fue un plan: no se escribio nada. Repite con --aplicar cuando lo apruebes.")
            return 0

        if not roles_app:
            print(
                "\nminerva no tiene roles de la aplicacion 'mariachi': importa "
                "manifest.minerva.yml desde el panel antes de aplicar."
            )
            return 1

        if ausentes:
            print(
                "\nNo se aplica nada: con roles faltantes la mitad del padron quedaria "
                "dada de alta y sin acceso. Arregla el manifiesto y vuelve a correrlo."
            )
            return 1

        print("\naplicando...")
        _aplicar(panel, plan, roles_app, args.credenciales)
        return 0
    except httpx.HTTPStatusError as exc:
        print(f"minerva respondio {exc.response.status_code}: {exc.response.text[:200]}", file=sys.stderr)
        return 1
    finally:
        panel.cerrar()


if __name__ == "__main__":
    raise SystemExit(main())
