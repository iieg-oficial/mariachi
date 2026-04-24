# Credenciales DataEngine para mariachi

> Documento de provisioning del rol `mariachi_layers` en DataEngine y los permisos requeridos por el módulo de capas de MapaLab.

**Versión:** 0.14.0 · **Última actualización:** 2026-04-24

> **Estado:** v1.4.0+ — implementado.
>
> **Contexto:** el sistema de capas de MapaLab requiere que mariachi acceda a DataEngine con permisos de lectura y escritura sobre el schema `mapalab`. La documentación completa del modelo de capas vive en el repo interno de MapaLab.

---

## Resumen

| Item | Valor |
|---|---|
| Host de DataEngine (prod) | Primary (read/write) en puerto 5432 |
| Host de DataEngine (dev) | Container `dataengine-primary` en red `db-network` (puerto 5432 expuesto al host) |
| Base de datos | Nombre configurado en `.env` de DataEngine (variable `POSTGRES_DB`) |
| Superuser (admin) | Configurado por el equipo de DataEngine — ver `.env` local de dataengine |
| Schema | `public` (o un schema dedicado `mapalab_config` si se prefiere aislar) |
| Usuario nuevo | `mariachi_layers` |
| Permisos | `SELECT, INSERT, UPDATE, DELETE` sobre 3 tablas; `USAGE` sobre schema; sin privilegios adicionales |
| SSL | Requerido en prod (DataEngine exige SSL en hostssl). En dev con containers en `db-network` se puede deshabilitar. |
| Host desde donde conecta (prod) | Servidor de mariachi (restringir en `pg_hba.conf` via `ALLOWED_HOSTS` del `.env` de dataengine) |

---

## Tablas a las que accede

mariachi crea y manipula solo estas tres tablas:

- `layers`
- `workspaces`
- `initial_layer_order`

Las migraciones las ejecuta Alembic desde mariachi. El DDL completo vive en la documentación interna de MapaLab.

mariachi **no toca** `mapalab_card`, `layer_periodicity` ni los schemas de datos geoespaciales — esos siguen siendo propiedad de mapalab y GeoServer.

> Nota: `public` ya contiene una tabla `alembic_version` de otro proyecto. Por eso las migraciones de mariachi usan `alembic_version_dataengine` como `version_table` (ver `docs/ALEMBIC_MULTI_ENV.md`). No interfieren.

---

## SQL de provisioning

```sql
-- 1. Crear rol con password
CREATE ROLE mariachi_layers WITH LOGIN PASSWORD '<password_generado>';

-- 2. Conceder acceso a la BD
GRANT CONNECT ON DATABASE <dataengine_db> TO mariachi_layers;

-- 3. Crear schema dedicado propiedad del rol
CREATE SCHEMA mapalab AUTHORIZATION mariachi_layers;

-- 4. El rol ya puede crear/modificar tablas dentro de 'mapalab' por ser OWNER.
--    Revocar CREATE sobre 'public' para limitar el blast radius:
REVOKE CREATE ON SCHEMA public FROM mariachi_layers;

-- 5. Setear search_path para que las queries no necesiten prefijo 'mapalab.'
ALTER ROLE mariachi_layers SET search_path = mapalab, public;
```

**Por que schema dedicado:** aisla las tablas del modulo de capas de todo lo demas en DataEngine (schemas de datos geoespaciales, `public` que tiene `mapalab_card` y `layer_periodicity`, etc.). Si algo va mal, `DROP SCHEMA mapalab CASCADE` limpia todo sin tocar el resto.

### GRANTs sobre tablas creadas por otro rol (bootstrap v14)

El schema `mapalab` es owned por `mariachi_layers`, pero las tablas las crea el superuser (`POSTGRES_USER` del DataEngine, p.ej. `gengine_user`) al correr `v14_schema.sql`. Sin GRANTs explicitos, `mariachi_layers` solo es owner del schema pero no de las tablas, y el editor de capas truena con `permission denied for table layers`.

**Automatizado en el bootstrap:** `mapalab-dataengine/scripts/bootstrap-v14.sh` aplica estos GRANTs en el "Paso 3b" (justo después de crear las tablas). Se corren via `make prod-migration` o `./scripts/bootstrap-v14.sh` y son idempotentes. Ver `ecosystem.md` sección 7.3 / este script para el detalle.

```sql
-- Aplicado automáticamente por bootstrap-v14.sh paso 3b:
GRANT USAGE ON SCHEMA mapalab TO mariachi_layers;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA mapalab TO mariachi_layers;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA mapalab TO mariachi_layers;
ALTER DEFAULT PRIVILEGES FOR ROLE <POSTGRES_USER> IN SCHEMA mapalab
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO mariachi_layers;
ALTER DEFAULT PRIVILEGES FOR ROLE <POSTGRES_USER> IN SCHEMA mapalab
    GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO mariachi_layers;
```

El `ALTER DEFAULT PRIVILEGES` cubre tablas/sequences futuras que cree el mismo rol (p.ej. migraciones de alembic corriendo como `POSTGRES_USER`). Si en el futuro las migraciones corren como `mariachi_layers`, estos GRANTs no hacen falta para esos objetos nuevos — las tablas serían owned directamente por `mariachi_layers`.

**Replicar en staging/prod:** se aplica solo al correr `make prod-migration` en `mapalab-dataengine`. No hay runbook manual.

---

## Configuración de red (pg_hba.conf)

Restringir el acceso del rol al IP/hostname del servidor de mariachi:

```
# TYPE  DATABASE            USER               ADDRESS              METHOD
hostssl <dataengine_db_name> mariachi_layers   <mariachi_server_ip>/32  scram-sha-256
```

`hostssl` fuerza SSL. `scram-sha-256` es el metodo de hashing recomendado en PostgreSQL 14+.

---

## Configuración en mariachi

Agregar la URL de conexión en el `.env` del entorno correspondiente:

**Producción:**

```bash
DATAENGINE_DATABASE_URL=postgresql://mariachi_layers:<password>@<dataengine_host>:5432/<dataengine_db>?sslmode=require
DATAENGINE_POOL_SIZE=5
DATAENGINE_MAX_OVERFLOW=5
```

**Desarrollo local** (mariachi corriendo en Docker, dataengine también):

```bash
# Si mariachi-api-dev y dataengine-primary estan en la misma red Docker compartida:
DATAENGINE_DATABASE_URL=postgresql://mariachi_layers:<password>@dataengine-primary:5432/<dataengine_db>

# Si mariachi se corre fuera de Docker:
DATAENGINE_DATABASE_URL=postgresql://mariachi_layers:<password>@localhost:5432/<dataengine_db>
```

En dev sin SSL se omite `sslmode=require`. En prod es obligatorio.

- `pool_size` y `max_overflow` configurados conservadoramente. Ajustar segun carga real.

La URL se lee en `app/core/settings.py` como `dataengine_database_url` y se usa en `app/core/database.py` via `get_dataengine_db()`.

---

## Verificación

Desde el servidor de mariachi:

```bash
# 1. Probar conectividad básica (psql)
psql "postgresql://mariachi_layers:<password>@<dataengine_host>:5432/<db_name>?sslmode=require" -c "SELECT version();"

# 2. Probar permisos (debería fallar con 'permission denied' sobre mapalab_card)
psql "postgresql://mariachi_layers:<password>@..." -c "SELECT 1 FROM public.mapalab_card LIMIT 1;"

# 3. Probar que puede crear tablas (para Alembic)
psql "postgresql://mariachi_layers:<password>@..." -c "CREATE TABLE _tmp_permission_check (id int); DROP TABLE _tmp_permission_check;"
```

Desde dentro del contenedor de mariachi, una vez configurado el `.env`:

```python
# python -c ...
from app.core.database import get_dataengine_db
gen = get_dataengine_db()
db = next(gen)
print(db.execute("SELECT 1").scalar())
```

Debe imprimir `1` sin errores.

---

## Consideraciones de seguridad

- **No reusar superuser**: el rol debe ser específico para este modulo. Nada de `postgres` ni roles admin.
- **Password en gestor de secretos**: no versionar el password en git. En dev, usar `.env` local (ya en `.gitignore`). En prod, usar el gestor de secretos del servidor.
- **Rotacion**: rotar password al menos anualmente o cuando haya cambios de personal con acceso.
- **Auditoria**: habilitar `log_connections=on` y `log_disconnections=on` en PostgreSQL para detectar uso anormal.
- **Replica no se usa**: este rol se conecta al primary porque requiere INSERT/UPDATE. La replica (puerto 5433) es solo lectura y la usa mapalab.

---

## Rollback

Si hay que revertir (por ejemplo, desastre en v1.4.0):

```sql
-- El rol es owner del schema, así que reasignar antes o dropear el schema
DROP SCHEMA mapalab CASCADE;
REVOKE CONNECT ON DATABASE <dataengine_db> FROM mariachi_layers;
DROP ROLE mariachi_layers;
```

---

## Checklist para el equipo de DataEngine

- [ ] Crear rol `mariachi_layers` con password seguro (entregar via canal cifrado).
- [ ] Ejecutar SQL de provisioning (sección 3) — crea schema `mapalab` con el rol como owner.
- [ ] Actualizar `pg_hba.conf` con la IP del servidor mariachi y `hostssl`.
- [ ] Recargar PostgreSQL (`SELECT pg_reload_conf()`).
- [ ] Confirmar a mapalab que las credenciales estan listas.
- [ ] Entregar: `DATAENGINE_DATABASE_URL` completo via gestor de secretos.
- [ ] Despues, desde mariachi: `alembic -x db=dataengine upgrade dataengine@head` crea las 3 tablas + seed de workspaces dentro del schema `mapalab`.

---

## Referencias

- Documentación interna de MapaLab (arquitectura de capas, schema DDL, scripts de bootstrap).
