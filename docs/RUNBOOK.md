# Runbook de incidentes — mariachi y ecosistema IIEG

Procedimientos para incidentes operativos comunes. Aplica a la infraestructura de mariachi (api + admin + nginx + postgres + redis) y al ecosistema en torno (gateway-hub, SIEEJ, MapaLab, Acervo, DataEngine).

Cada seccion sigue el patron: que sintomas indican el problema, como diagnosticar, como mitigar y como recuperar.

## Convenciones

- Todos los comandos se asumen ejecutados en la maquina/VM donde corre el servicio. Si necesitas conectarte: `ssh <usuario>@<host>`.
- Carpeta de mariachi: `/home/egar/IIEG/mariachi` en dev local; en staging/prod ajustar al path real del despliegue.
- Comandos Postgres asumen el container dev `mariachi-postgres-dev` y BD `iieg_portal`. En prod el nombre del container sera `mariachi-postgres`.
- Cuando un procedimiento involucre rotacion de secretos o downtime planeado, anunciar en el canal correspondiente antes y despues.

## Postgres no responde

**Sintomas:** mariachi-api devuelve 500 con stack trace de `OperationalError`. Login devuelve 500. Healthcheck `pg_isready` falla.

**Diagnostico:**

```bash
docker ps --format '{{.Names}}\t{{.Status}}' | grep postgres
docker exec mariachi-postgres-dev pg_isready -U iieg_user -d iieg_portal
docker logs mariachi-postgres-dev --tail 50
```

**Mitigacion inmediata (si el container esta caido):**

```bash
docker compose -f docker-compose.dev.yml --env-file .env.development up -d postgres
```

**Recuperacion desde respaldo:** ver "Restore Postgres desde backup" mas abajo.

## Respaldos automatizados de Postgres

**Politica GFS (Grandfather-Father-Son):** se mantienen 3 archivos fijos en `backups/`:

| Archivo                       | Cuando se regenera                  | Antigüedad max |
|-------------------------------|-------------------------------------|----------------|
| `mariachi-daily.sql.gz`       | Todos los dias a las 3 AM           | 24 h           |
| `mariachi-weekly.sql.gz`      | Domingos a las 3 AM (sobreescribe)  | ~7 dias        |
| `mariachi-monthly.sql.gz`     | Dia 1 del mes a las 3 AM            | ~30 dias       |

Los 3 archivos siempre estan presentes; nunca se acumulan mas. Implementacion: `scripts/postgres-backup.sh`.

**Instalacion del cronjob (solo en la VM de produccion):**

```bash
cd /ruta/a/mariachi
make install-backup-cron ENV=prod
crontab -l | grep mariachi-backup   # verificar
```

**Backup manual (en cualquier momento, cualquier entorno):**

```bash
make backup-db                 # contra docker-compose.yml (staging/prod)
make backup-db ENV=dev         # contra docker-compose.dev.yml
```

**Limitacion conocida:** los respaldos viven en disco local de la VM. Si la VM se pierde, los respaldos tambien. Como mitigacion temprana, copiar `backups/` a almacenamiento externo (GCS) periodicamente. La siguiente iteracion subira esto a un bucket automaticamente.

## Restore Postgres desde backup

**Antes de empezar:** anunciar el inicio del restore. Cualquier escritura entre el ultimo backup y ahora se pierde.

**Restore con el helper:**

```bash
# coloca el archivo a restaurar en restore/ (o usa uno de backups/)
make restore-db FILE=mariachi-daily.sql.gz           # busca en restore/ y backups/
make restore-db FILE=/ruta/absoluta/dump.sql.gz      # ruta absoluta tambien funciona
make restore-db FILE=mariachi-weekly.sql.gz ENV=dev  # entorno dev
```

**Restore manual (equivalente, sin Make):**

```bash
docker compose -f docker-compose.yml stop api
gunzip -c backups/mariachi-daily.sql.gz | docker compose -f docker-compose.yml exec -T postgres \
    sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
docker compose -f docker-compose.yml start api
```

**Validacion post-restore:**

```bash
docker exec mariachi-postgres psql -U iieg_user -d iieg_portal -c "SELECT count(*) FROM usuarios"
docker exec mariachi-postgres psql -U iieg_user -d iieg_portal -c "SELECT count(*) FROM sieej.bases_datos"
docker exec mariachi-api alembic -x db=mariachi current
```

Si alembic current no coincide con la migration esperada, correr `alembic -x db=mariachi upgrade head`.

## Rotar SECRET_KEY

`SECRET_KEY` firma los JWT de access_token. Rotarla invalida todas las sesiones activas (los usuarios deben volver a hacer login).

```bash
NEW_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")
# Editar el .env.production correspondiente:
# SECRET_KEY=<NEW_KEY>
docker compose --env-file .env.production restart api
```

Comunicar a los usuarios la fecha y hora del corte de sesion.

## Rotar CSRF_SECRET_KEY

Mismo procedimiento que SECRET_KEY pero invalida los tokens CSRF en lugar de las sesiones. Los frontends recibiran 403 en mutaciones hasta que vuelvan a hacer login (cuando se solicita un nuevo csrf_token).

## Acervo (MinIO) lleno

**Sintomas:** uploads via `POST /multimedia` o `POST /formularios/bases-datos/{id}/diccionario` devuelven 500 con mensaje "no space left" o similares en logs.

**Diagnostico:**

```bash
docker exec acervo-minio mc admin info local 2>/dev/null || \
    df -h | grep $(docker volume inspect acervo_data --format '{{.Mountpoint}}')
```

**Mitigacion:** liberar espacio identificando los buckets y objetos mas pesados.

```bash
docker exec acervo-minio mc du local --depth 2
```

**Recuperacion definitiva:** ampliar el volumen de Acervo o aplicar lifecycle policies (mover objetos antiguos a cold storage). Documentar la ampliacion en este runbook.

## Recrear un MediaBucket

Si un MediaBucket de la tabla `media_buckets` se borro accidentalmente o nunca se creo en MinIO, recrear:

```sql
-- en mariachi/iieg_portal:
INSERT INTO media_buckets (project_id, acervo_bucket, access_key_ref, display_name, is_public, is_active, created_at)
SELECT p.id, '<nombre_bucket>', '<KEY_REF>', '<display name>', false, true, NOW()
FROM projects p WHERE p.slug = '<slug>'
ON CONFLICT DO NOTHING;
```

Y crear el bucket en MinIO:

```bash
docker exec acervo-minio mc mb local/<nombre_bucket>
```

Para SIEEJ el bucket esperado es `sieej-diccionarios` (creado por la migration `e7f8a9b0c1d2`). Si se borro de MinIO, recrearlo manualmente con `mc mb local/sieej-diccionarios`.

## gateway-hub no responde

**Sintomas:** `curl https://<APP_DOMAIN>/sieej/` cuelga o devuelve 502/504.

**Diagnostico:**

```bash
ssh <gateway_host>
docker ps --format '{{.Names}}\t{{.Status}}' | grep nginx
docker logs gateway-nginx --tail 50
docker exec gateway-nginx nginx -t
```

Verificar tambien que `mariachi-nginx` (referenciado por `PORTAL_HOST`) este UP:

```bash
docker ps | grep mariachi-nginx
```

**Mitigacion:**

```bash
docker exec gateway-nginx nginx -s reload   # si el container vive pero la config no
docker compose up -d gateway-nginx          # si el container esta caido
```

**Recuperacion:** si nginx -t reporta error, revisar el ultimo cambio en `nginx/templates/gateway.conf.template` (rama prod del repo gateway-hub) y revertir.

## Migration alembic falla

**Sintomas:** `docker exec mariachi-api alembic -x db=mariachi upgrade head` devuelve error.

**Diagnostico:**

```bash
docker exec mariachi-api alembic -x db=mariachi current
docker exec mariachi-api alembic -x db=mariachi history --verbose | head -20
```

Buscar la migracion que falla y revisar su SQL.

**Mitigacion:**

- Si la migracion es reversible: `alembic -x db=mariachi downgrade <revision_anterior>` y corregir el archivo.
- Si la migracion no se aplico (transaccion abortada): re-correr `upgrade head` luego de corregir.
- DataEngine: las migraciones `dataengine` viven en `mapalab-dataengine/jobs/alembic/`. Para ese branch usar `alembic -x db=dataengine` desde ese repo. Cualquier cambio a DataEngine va en rama dedicada `prod-migracion`.

## Sentry no recibe eventos

**Sintomas:** un error capturable no aparece en el dashboard de Sentry.

**Diagnostico:**

```bash
docker exec mariachi-api env | grep SENTRY_DSN
docker exec mariachi-admin-dev env | grep VITE_SENTRY_DSN
```

Si las DSN estan vacias, Sentry no se inicializa (es no-op por diseño). Para activar:

```bash
# editar .env.production:
# SENTRY_DSN=<dsn_backend>
# VITE_SENTRY_DSN=<dsn_frontend_admin>
docker compose --env-file .env.production restart api nginx
```

## Crear o eliminar un usuario externo manualmente

Si el flujo del admin (`/sieej/agregar-dependencia`) no esta disponible y se necesita crear o desactivar una cuenta externa:

```sql
-- crear con password temporal (hashearla antes con passlib bcrypt):
INSERT INTO usuarios (username, email, hashed_password, name, role, must_change_password, created_at)
VALUES ('<username>', '<email>', '<bcrypt_hash>', '<nombre>', 'externo', true, NOW());

INSERT INTO user_projects (user_id, project_id, project_role)
SELECT u.id, p.id, 'editor'
FROM usuarios u, projects p
WHERE u.username = '<username>' AND p.slug = 'sieej';

-- desactivar (no se puede borrar por la FK CASCADE; preferir UPDATE):
UPDATE usuarios SET hashed_password = '<bcrypt_invalid>' WHERE username = '<username>';
DELETE FROM user_projects WHERE user_id = (SELECT id FROM usuarios WHERE username = '<username>');
```

Generar bcrypt hash:

```bash
docker exec mariachi-api python3 -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('mi_password'))"
```

## Resetear password del admin (o de cualquier usuario)

`scripts/init_db.py:crear_usuario_admin` solo crea al admin **si no existe**: si despues de la primera inicializacion se cambia `ADMIN_PASSWORD` en `.env.production`, el contenedor no resincroniza el hash y el login sigue rechazando las credenciales del `.env`.

Reset directo via Python en el contenedor de la API:

```bash
docker exec mariachi-api python -c "
from app.core.security import hash_password
from app.core.database import SessionLocal
from app.models import Usuario

db = SessionLocal()
try:
    u = db.query(Usuario).filter(Usuario.username == 'admin').first()
    if u:
        u.hashed_password = hash_password('<nuevo_password>')
        u.must_change_password = False
        db.commit()
        print(f'OK: password reseteado (id={u.id}, email={u.email})')
    else:
        print('ERROR: usuario no encontrado')
finally:
    db.close()
"
```

Sustituir `'admin'` por el username deseado y `'<nuevo_password>'` por la pass nueva. Si el cambio es para produccion, actualizar tambien `ADMIN_PASSWORD` en `.env.production` para que el valor del archivo y el de la BD esten alineados.

## Frontend SIEEJ no carga (404 en /sieej/)

**Sintomas:** el browser muestra 404 al cargar `/sieej/`.

**Diagnostico:**

```bash
docker exec mariachi-nginx ls /usr/share/nginx/html/sieej | head
```

Si esta vacio, falta el dist. Generarlo:

```bash
cd /home/egar/IIEG/SIEEJ
make build
docker compose --env-file .env.production restart nginx -p mariachi
```

`SIEEJ_DIST_PATH` debe apuntar al `dist` correcto (default `../SIEEJ/frontend/dist`). Verificar:

```bash
docker inspect mariachi-nginx --format '{{json .Mounts}}' | python3 -m json.tool
```

## Ambiente staging permanente — pendiente

Hoy `make staging` levanta servicios temporales. Falta una VM dedicada con staging permanente para:

- Validar PRs de develop antes de merge a production.
- Probar migrations alembic en datos cercanos a prod (volcado anonimizado).
- QA manual de SIEEJ con dependencias piloto.

**Plan tentativo (cuando haya recursos):**

- VM con 4 GB RAM, 2 vCPU, 40 GB SSD.
- Stack: gateway-hub + mariachi + SIEEJ + Acervo + Postgres + Redis.
- Deploy automatico en cada merge a develop via GitHub Actions (workflow_dispatch a un script SSH).
- Datos: dump de prod ofuscado (emails, passwords y nombres reemplazados).

Anotado tambien en `docs/PENDIENTES.md`.

## Numeros de incidente y comunicacion

- Reportar incidentes mayores en el canal designado (Slack/Discord/correo del equipo IIEG).
- Documentar cada incidente real al final de este RUNBOOK con: fecha, sintomas, causa raiz, mitigacion aplicada, lecciones.
