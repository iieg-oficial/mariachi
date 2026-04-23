# Alembic con multiples bases de datos

> Mariachi maneja **dos bases de datos** via un solo setup de Alembic, usando el argumento `-x db=...`.
>
> **Politica de ownership (2026-04-23)**: las migraciones con `-x db=dataengine` son la **fuente autoritativa** del schema `mapalab.*` en DataEngine. El archivo `mapalab-dataengine/jobs/bootstrap/v14_schema.sql` queda frozen como baseline de bootstrap — no se toca. Cualquier cambio futuro de schema entra como migracion alembic aqui. Ver `gateway-hub/docs/ecosystem.md` seccion 7.3.

---

## Bases de datos

| `-x db=` | URL (env) | Metadata | Version table | Branch label | Carpeta |
|---|---|---|---|---|---|
| `mariachi` (default) | `DATABASE_URL` | `app.models.Base` | `public.alembic_version` | `mariachi` | `alembic/versions/mariachi/` |
| `dataengine` | `DATAENGINE_DATABASE_URL` | `app.core.database.DataEngineBase` | `mapalab.alembic_version_dataengine` | `dataengine` | `alembic/versions/dataengine/` |

Version tables distintas permiten que las migraciones de cada BD no interfieran. Branch labels permiten apuntar a un head especifico con `alembic upgrade <label>@head` sin correr el otro.

---

## Comandos

### Migrar BD del CMS (mariachi)

```bash
# Explicito
alembic -x db=mariachi upgrade head

# Implicito (default)
alembic upgrade head
```

### Migrar DataEngine (modulo de capas MapaLab v1.4.0)

Requiere:
- `DATAENGINE_DATABASE_URL` configurado en `.env`
- Schema `mapalab` creado previamente por el admin de DataEngine (ver `docs/DATAENGINE_CREDENTIALS.md`)

Las migraciones usan branch label `dataengine`:

```bash
alembic -x db=dataengine upgrade dataengine@head
```

Esto aplica solo las migraciones de la carpeta `alembic/versions/dataengine/`, sin tocar las de mariachi.

### Crear revision autogenerate

```bash
# Para mariachi
alembic -x db=mariachi revision --autogenerate -m "add something to user"

# Para dataengine
alembic -x db=dataengine revision --autogenerate -m "add layers table"
```

Importante: `alembic/env.py` importa `app.models.layer` cuando `db=dataengine` — agregar ahi los modelos nuevos del modulo de capas para que `autogenerate` los detecte.

### Downgrade

```bash
alembic -x db=dataengine downgrade -1
```

### History y current

```bash
alembic -x db=dataengine history
alembic -x db=dataengine current
```

---

## Estructura

```
api/
├── alembic.ini
├── alembic/
│   ├── env.py                # lee -x db=, selecciona metadata+url+version_table
│   ├── script.py.mako
│   └── versions/
│       ├── mariachi/         # migraciones de iieg_portal (CMS)
│       │   ├── 001_initial_migration.py
│       │   ├── 62523bba38ac_add_must_change_password.py
│       │   ├── b5c6d7e8f9a0_add_estado_borrador.py
│       │   ├── ee37ba52b458_add_publication_requests.py
│       │   └── f3a8b2c1d9e7_add_borradores.py
│       └── dataengine/       # migraciones de DataEngine (capas MapaLab)
│           └── (vacio por ahora)
├── app/
│   ├── models/
│   │   ├── __init__.py       # exporta Base + modelos del CMS
│   │   ├── user.py
│   │   ├── page.py
│   │   ├── menu_item.py
│   │   ├── media.py
│   │   ├── borrador.py
│   │   └── layer.py          # stub; modelos de capas cuando inicie v1.4.0
│   └── core/
│       └── database.py       # engine + Base (CMS) / dataengine_engine + DataEngineBase
```

---

## Agregar un modelo a DataEngine

1. Editar `app/models/layer.py`:

```python
from sqlalchemy import Column, String, Integer, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from app.core.database import DataEngineBase


class Workspace(DataEngineBase):
    __tablename__ = "workspaces"
    alias = Column(String(50), primary_key=True)
    geoserver_workspace = Column(String(200), nullable=False)
    db_schema = Column(String(200), nullable=False)
    label = Column(String(200))
    # ...


class Layer(DataEngineBase):
    __tablename__ = "layers"
    id = Column(String(100), primary_key=True)
    # ...
```

2. Generar migracion:

```bash
alembic -x db=dataengine revision --autogenerate -m "add workspaces and layers"
```

3. Revisar el archivo generado en `alembic/versions/dataengine/`.

4. Aplicar:

```bash
alembic -x db=dataengine upgrade head
```

---

## Flujos comunes

### Primer deploy a DataEngine

```bash
# 1. Verificar conexion
python -c "from app.core.database import get_dataengine_db; next(get_dataengine_db()).execute('SELECT 1')"

# 2. Aplicar migraciones
alembic -x db=dataengine upgrade head

# 3. Verificar estado
alembic -x db=dataengine current
```

### Rollback completo de DataEngine (caso emergencia)

```bash
alembic -x db=dataengine downgrade base
```

No afecta la BD del CMS (tiene `version_table` separada).

---

## Troubleshooting

**Error: `DATAENGINE_DATABASE_URL no esta configurado`**
- Agregar al `.env` la URL de DataEngine. Ver `docs/DATAENGINE_CREDENTIALS.md`.

**`Multiple head revisions are present`**
- Puede pasar si dos personas crearon migraciones paralelas en la misma BD. Merge con:
  ```bash
  alembic -x db=dataengine merge -m "merge heads" <rev1> <rev2>
  ```

**`Can't locate revision identified by '<hash>'`**
- El archivo de migracion con ese hash no existe en la carpeta correspondiente. Verificar que esta en `alembic/versions/<db>/`.

---

## Referencias

- [Alembic docs: using -x arguments](https://alembic.sqlalchemy.org/en/latest/cookbook.html#run-multiple-alembic-environments-from-one-ini-file)
- `docs/DATAENGINE_CREDENTIALS.md` — credenciales y provisioning
