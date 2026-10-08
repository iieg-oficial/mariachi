"""Traduce el padron de mariachi a los roles que declara `manifest.minerva.yml`.

La autorizacion real vive en minerva: aqui solo se decide que roles de la
aplicacion `mariachi` le tocan a cada fila de `usuarios`, a partir del rol local
y de sus asignaciones en `user_projects`. Es logica pura y sin red para poder
probarla sin minerva delante.
"""

ROL_ADMINISTRADOR = "Administrador"

_POR_PROYECTO = {
    "mapalab": {"editor": "MapaLab - edicion", "viewer": "MapaLab - consulta"},
    "portal": {"editor": "Portal - edicion", "viewer": "Portal - consulta"},
    "sieej": {"editor": "SIEEJ - administracion", "viewer": "SIEEJ - consulta"},
    "iieg": {"editor": "Acervo - carga", "viewer": "Acervo - consulta"},
    "mariachi": {"editor": "Acervo - carga", "viewer": "Acervo - consulta"},
}

_ROL_EXTERNO = "SIEEJ - reportar"


def roles_para(usuario: dict) -> list[str]:
    """Roles de minerva que le corresponden a un usuario de mariachi.

    `usuario` es el dict que ya devuelve `_serialize_user()`: necesita `role` y
    `projects` (cada uno con `slug` y `project_role`).
    """
    rol_local = usuario.get("role")

    if rol_local == "tetlamamakani":
        return [ROL_ADMINISTRADOR]

    proyectos = usuario.get("projects") or []

    if rol_local == "externo":
        tiene_sieej = any(p.get("slug") == "sieej" for p in proyectos)
        return [_ROL_EXTERNO] if tiene_sieej else []

    roles: list[str] = []
    for proyecto in proyectos:
        equivalencias = _POR_PROYECTO.get(proyecto.get("slug"))
        if not equivalencias:
            continue
        rol = equivalencias.get(proyecto.get("project_role"))
        if rol and rol not in roles:
            roles.append(rol)
    return roles


def planificar(usuarios: list[dict], correos_en_minerva: set[str]) -> dict:
    """Clasifica el padron sin escribir nada.

    Devuelve tres listas: `crear` (no existen en minerva), `existentes` (ya
    estan, solo habria que revisar roles) y `sin_roles` (no les toca ningun rol,
    asi que minerva les negaria el acceso aunque se les diera de alta).
    """
    correos = {c.strip().lower() for c in correos_en_minerva if c}
    crear, existentes, sin_roles, duplicados = [], [], [], []
    vistos: set[str] = set()

    for usuario in usuarios:
        correo = (usuario.get("email") or "").strip().lower()
        roles = roles_para(usuario)
        fila = {
            "id": usuario.get("id"),
            "username": usuario.get("username"),
            "email": correo,
            "name": usuario.get("name"),
            "role": usuario.get("role"),
            "roles_minerva": roles,
            "ya_vinculado": bool(usuario.get("minerva_vinculado")),
        }

        if not correo:
            fila["motivo"] = "sin correo: no hay llave de reconciliacion"
            sin_roles.append(fila)
            continue
        if correo in vistos:
            duplicados.append(fila)
            continue
        vistos.add(correo)

        if not roles:
            fila["motivo"] = "sin roles: minerva le negaria el codigo de autorizacion"
            sin_roles.append(fila)
            continue

        (existentes if correo in correos else crear).append(fila)

    return {
        "crear": crear,
        "existentes": existentes,
        "sin_roles": sin_roles,
        "duplicados": duplicados,
        "total": len(usuarios),
    }
