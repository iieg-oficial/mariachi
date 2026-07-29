# Alembic en mariachi

> **Cambio de política (2026-04-24):** mariachi gestiona únicamente su **propio schema** (`public.*` y `mariachi.*`). Las migraciones del schema `mapalab.*` se movieron a `dataengine/jobs/alembic/`. Ver `gateway-hub/docs/ecosystem.md` §7.3 (revisado).

**Versión:** 1.4.x · **Última actualización:** 2026-07-27

---

## Single-env

Mariachi tiene un solo target de Alembic. Comandos estándar sin `-x db=`:

```bash
cd api/

# Aplicar migraciones pendientes
alembic upgrade head

# Ver estado actual
alembic current

# Crear nueva migración (autogenerate desde models)
alembic revision --autogenerate -m "add x to user"
```

| | |
|---|---|
| URL (env) | `DATABASE_URL` |
| Metadata | `app.models.Base` |
| Version table | `public.alembic_version` |
| Carpeta | `alembic/versions/mariachi/` |

## Cabezas múltiples (`Multiple head revisions`)

Dos ramas que crean su migración desde el mismo padre dejan el árbol bifurcado. `alembic upgrade head` —lo que corre `scripts/init_db.py` en el arranque— falla, el api sale con código 1 y se lleva el deploy por delante:

```
FAILED: Multiple head revisions are present for given argument 'head'
```

```bash
alembic heads                                        # ¿cuántas cabezas hay?
alembic merge -m "merge <rama-a> y <rama-b>" --rev-id <id-nuevo> heads
```

El merge genera una revisión vacía con `down_revision` en tupla (precedentes: `e4f5a6b7c8d9`, `f9a0b1c2d3e4`). Los ids del repo siguen el patrón hex de 12 (`e4f5a6b7c8d9`); revisar que el elegido no exista.

> **No reapuntes el `down_revision` de una cabeza sobre la otra** aunque deje el historial lineal. Solo es seguro si ninguna se aplicó en ningún entorno: si producción está parada en la que quedaría arriba, Alembic da por aplicada a la que pasó a ser su padre y **nunca corre esa migración**. El merge converge desde cualquier estado.

Se previene rebasando `down_revision` contra `develop` antes de integrar la rama.

## ¿Necesitas cambiar el schema `mapalab.*`?

No es en este repo. Las migraciones del schema dataengine viven ahora en:

```
dataengine/jobs/alembic/versions/
```

Para crear una migración nueva ahí:

```bash
cd dataengine
docker compose exec jobs alembic revision -m "add x to layers"
```

Para aplicar:

```bash
cd dataengine
make migrate              # aplica pendientes (idempotente)
make migrate-status       # muestra version actual + history
```

En producción, `make prod-migration` ya corre `alembic upgrade head` internamente al final del bootstrap. Re-ejecutable cada deploy.

## Coordinación con mariachi al cambiar el schema

Cuando agregues columna/tabla en dataengine, recuerda:

1. Crear migración + abrir PR en `dataengine`
2. Actualizar `app/models/layer.py` y `app/schemas/layer.py` en mariachi para reflejar el cambio (sin Alembic — los modelos sólo describen la estructura existente)
3. Si la columna es nueva y nullable, la app puede convivir con DB pre-y-post migración. Si es NOT NULL o cambia tipo, coordinar deploy.

El guardrail `gateway-hub/scripts/check-model-drift.py` detecta drift entre los modelos SQLAlchemy de mapalab y mariachi para tablas compartidas. Correrlo pre-PR.

## Workflow de dev local

```bash
# 1. DataEngine arriba
cd ../dataengine && make up && make migrate

# 2. Mariachi arriba (aplica sus propias migraciones)
cd ../mariachi && make dev
# o equivalentemente: alembic upgrade head ; uvicorn app.main:app --reload
```

Si la BD dataengine de dev quedó vacía, antes de `make migrate` corre `make prod-migration PROD_MIGRATION_FLAGS="--skip-etl"` para crear el rol, schema y aplicar el baseline.
