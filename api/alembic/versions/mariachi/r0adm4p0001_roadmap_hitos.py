"""roadmap hitos

Revision ID: r0adm4p0001
Revises: m3rg30001
Create Date: 2026-08-28

"""

import sqlalchemy as sa
from alembic import op

revision = "r0adm4p0001"
down_revision = "m3rg30001"
branch_labels = None
depends_on = None


HITOS = (
    ("legado-intranet", "intranet", "legado", "legacy", "2024-01-15", "sexenios anteriores · sin fecha", "La intranet heredada. Lleva años corriendo y en este sexenio no se le tocó una línea: se releva entera con la nueva de diciembre.", None, None, None, None, False, False, 0),
    ("legado-colibri", "colibrí", "legado", "legacy", "2024-03-15", "sexenios anteriores · sin fecha", "El colibrí de sexenios anteriores. El nombre se conservó, pero el de 2026 es un proyecto nuevo: no comparte código con este.", None, None, None, None, False, False, 10),
    ("gitlab", "GitLab del instituto", "infra", "momento", "2024-12-18", "18 dic 2024", "El GitLab self-hosted. Hoy tiene 92 proyectos; el más viejo es de esta fecha. Ahí nacieron sieej y mapalab, y ahí sigue intranet.", None, None, None, None, False, False, 20),
    ("f-sieej-01", "sieej · 0.1", "sieej", "feature", "2025-01-20", "20 ene 2025", "Primer registro del proyecto: React, Vite, Tailwind y los mockups de login y home, en GitLab.", None, "sieej", None, None, False, False, 30),
    ("f-mapalab-01", "mapalab · 0.1", "mapalab", "feature", "2025-08-10", "10 ago 2025", "Primer registro del proyecto: estructura básica del visor en React y los primeros componentes de mapa.", None, "mapalab", None, None, False, False, 40),
    ("igibot", "IGIBot", "igibot", "muerto", "2025-11-10", "10 nov 2025 — 15 dic 2025", "Chatbot agéntico sobre estadística, geografía e indicadores de Jalisco. Fue el primer repo de la organización en GitHub. Su desarrollo principal murió; lo que sobrevivió se rehízo desde cero como agent.", None, None, None, None, False, False, 50),
    ("github", "salto a GitHub", "infra", "momento", "2025-11-10", "10 nov 2025 — 24 abr 2026", "La organización abre con IGIBot y los repos se mudan uno por uno: huachicol el 13 nov 2025, sieej el último el 24 abr 2026. El historial no viajó. intranet se quedó en GitLab.", None, None, None, None, False, False, 60),
    ("f-mariachi-01", "mariachi · 0.1", "mariachi", "feature", "2026-01-26", "26 ene 2026", "Primer registro: nace el monorepo con API FastAPI, sitio público y CMS bajo un solo Compose.", None, "mariachi", None, None, False, False, 70),
    ("dataengine-1", "dataengine 1", "dataengine", "mayor", "2026-02-25", "25 feb 2026", "Cluster PostgreSQL con réplica, SSL obligatorio y respaldos diarios al Acervo.", None, None, None, None, False, False, 80),
    ("geoserver-1", "geoserver 1", "sextante", "mayor", "2026-02-25", "25 feb 2026", "Primer despliegue a producción. En esta fecha el servicio se llamaba geoserver: el nombre sextante llega hasta julio.", None, None, None, None, False, False, 90),
    ("gateway-1", "gateway-hub 1", "gateway-hub", "mayor", "2026-03-13", "13 mar 2026", "El nginx de entrada toma el ruteo de todo el ecosistema.", None, None, None, None, False, False, 100),
    ("mapalab-1", "mapalab 1", "mapalab", "mayor", "2026-03-27", "27 mar 2026", "El visor sale estable: descarga de capas, exportación con leyendas y capas temporales.", None, None, None, None, False, False, 110),
    ("lanz-mapalab", "MapaLab", "mapalab", "lanzamiento", "2026-04-16", "16 abr 2026", "Lanzamiento oficial en Guadalajara. Nueve temas y 99 capas de los 125 municipios, con datos demográficos desde 1940. El único lanzamiento público del ecosistema.", None, None, None, None, False, False, 120),
    ("f-agent-01", "agent · 0.1", "agent", "feature", "2026-05-05", "5 mayo 2026", "Primer registro del heredero de IGIBot, reescrito por completo.", None, "agent", None, None, False, False, 130),
    ("agent", "agent", "agent", "joven", "2026-05-05", "sin versión mayor", "Asistente conversacional sobre agentes LLM que integra fuentes por MCP: SQL, documentos e imágenes. Es de solo lectura para el ecosistema.", None, None, "igibot", "lo hereda", False, False, 140),
    ("colibri", "colibrí", "colibri", "joven", "2026-05-07", "7 mayo 2026", "El sistema de reportes del ecosistema. Vive dentro de mariachi pero se comporta como producto propio: tiene su widget, su API de llaves y su bandeja.", None, None, "legado-colibri", "mismo nombre, todo nuevo", False, False, 150),
    ("f-colibri-widget", "colibrí · Widget embebible", "colibri", "feature", "2026-05-07", "7 mayo 2026", "Un script que cualquier sistema monta para abrir una incidencia sin salir de su pantalla. Framework-agnóstico.", None, "colibri", None, None, False, False, 160),
    ("minerva", "minerva", "minerva", "joven", "2026-05-14", "v0.5.0 · sin versión mayor", "El SSO institucional: identidad, autenticación y permisos. No es repo nuestro — se consume su main y la integración se registra de nuestro lado.", None, None, None, None, False, False, 170),
    ("mariachi-1", "mariachi 1", "mariachi", "mayor", "2026-05-14", "14 mayo 2026", "Primera versión estable en producción; desde aquí el versionado es de producción.", None, None, None, None, False, False, 180),
    ("godin", "godin", "godin", "muerto", "2026-06-05", "5 jun 2026", "Sistema interno con salida propia a internet, sin pasar por el gateway. Murió: ya no se desarrolla.", None, None, None, None, False, False, 190),
    ("f-catalogo", "mapalab · Catálogo de capas", "mapalab", "feature", "2026-06-08", "8 jun 2026", "El catálogo público de capas: endpoints /catalogo/capas y su tarjeta propia, administrable desde el CMS.", None, "mapalab", None, None, False, False, 200),
    ("f-vine-01", "vine · 0.1", "vine", "feature", "2026-06-16", "16 jun 2026", "Primer registro: scaffolding y modelo de datos de asistencias, con la BD ZKTeco simulada.", None, "vine", None, None, False, False, 210),
    ("mirador", "mirador", "mirador", "joven", "2026-07-02", "sin versión mayor", "Laboratorio de datos y visualizaciones del instituto.", None, None, None, None, False, False, 220),
    ("f-portal-web", "mariachi · Portal público", "mariachi", "feature", "2026-07-03", "congelado", "mariachi nació siendo el portal: su base se llamaba iieg_portal hasta el 3 de julio de 2026. Su web/ quedó congelado cuando sitio2026 tomó el rol del portal público.", None, "mariachi", None, None, False, True, 230),
    ("acervo-2", "acervo 2", "acervo", "mayor", "2026-07-21", "21 jul 2026", "Termina la migración de MinIO a SeaweedFS. Se va la consola web: todo por mc y weed shell.", None, None, None, None, False, False, 240),
    ("f-ontoy", "huachicol · Contrato /ontoy", "huachicol", "feature", "2026-07-21", "21 jul 2026", "Cada servicio declara su versión, su estado y su nodo en un solo endpoint. Es lo que permitió apagar Prometheus y Grafana.", None, "huachicol", None, None, False, False, 250),
    ("f-alertas", "huachicol · Alertas a Discord", "huachicol", "feature", "2026-07-21", "21 jul 2026", "Las alertas dejan de pasar por Alertmanager y salen directo a Discord desde el monitor.", None, "huachicol", None, None, False, False, 260),
    ("huachicol-2", "huachicol 2", "huachicol", "mayor", "2026-07-21", "21 jul 2026", "Se apaga el stack de observabilidad; el repo queda como monitor ligero.", None, None, None, None, False, False, 270),
    ("f-api", "gateway-hub · Prefijo /api/mariachi", "gateway-hub", "feature", "2026-07-22", "22 jul 2026", "El prefijo de la API cambia en dos fases, con inventario de todo lo que apuntaba al viejo.", None, "gateway-hub", None, None, False, False, 280),
    ("identidad", "identidad", "identidad", "joven", "2026-07-28", "28 jul 2026", "El módulo que administra la identidad visual multi-marca. Absorbió al design system: por eso guidelines-iieg se archivó al día siguiente.", None, None, "guidelines", "lo absorbe", False, False, 290),
    ("f-numeralia", "mariachi · Numeralia dinámica", "mariachi", "feature", "2026-07-29", "29 jul 2026", "Estadísticas dinámicas de metadatos de capas, calculadas en dataengine y servidas por mariachi al visor.", None, "mariachi", None, None, False, False, 300),
    ("guidelines", "guidelines-iieg", "heredado", "muerto", "2026-07-29", "29 jul 2026", "Se archiva en solo lectura: el módulo Identidad del CMS absorbió el design system.", None, None, None, None, False, False, 310),
    ("f-mcp", "mapalab · Servidor MCP", "mapalab", "feature", "2026-07-30", "30 jul 2026", "El visor expone un servidor MCP: sus capas y su catálogo quedan consultables por herramientas de IA.", None, "mapalab", None, None, False, False, 320),
    ("sextante-2", "sextante 2", "sextante", "mayor", "2026-07-31", "31 jul 2026", "El servicio deja de llamarse geoserver: cambian contenedores, red y la URL pública. Mismo software, nombre nuevo.", "geoserver", None, "geoserver-1", "se renombra", False, False, 330),
    ("sitio2026", "sitio2026", "sitio2026", "mayor", "2026-07-31", "31 jul 2026", "El portalito toma el location / del gateway, con iieg.jalisco.gob.mx como dominio objetivo. sitio2026 y portalito son el mismo.", None, None, "f-portal-web", "lo sucede", False, False, 340),
    ("espejo", "espejo de Proxmox", "infra", "momento", "2026-08-03", "3 ago 2026", "El Proxmox del instituto pasa a espejo multi-nodo: una VM por rol S1-S5. Ahí vive también el runner de CI self-hosted.", None, None, None, None, False, False, 350),
    ("f-colibri-huespedes", "colibrí · Cinco huéspedes", "colibri", "feature", "2026-08-10", "10 ago 2026", "La adopción: cinco sistemas del ecosistema montan el widget. Falta el hardening H4.", None, "colibri", None, None, False, False, 360),
    ("mariachi-2", "mariachi 2", "mariachi", "mayor", "2026-08-10", "10 ago 2026", "El feature fuerte del ciclo: la identidad se va a minerva. Retira su login propio y la autorización deja de mirar el rol.", None, None, None, None, False, False, 370),
    ("sieej-2", "sieej 2", "sieej", "mayor", "2026-08-10", "10 ago 2026", "Su pantalla de login se va a minerva; no se puede desplegar sin mariachi 2.", None, None, None, None, False, False, 380),
    ("wacha", "wacha", "wacha", "mayor", "2026-08-10", "10 ago 2026", "El repo se transfiere y se renombra: se llamaba frigate. Comparte VM con vine desde ese mismo día.", "frigate", None, None, None, False, False, 390),
    ("f-identidad-tokens", "identidad · Tokens y temas", "identidad", "feature", "2026-08-17", "17 ago 2026", "Emite el theme.qss que lee el complemento de QGIS y los tokens que consumen los frontends. La marca deja de estar escrita en el código.", None, "identidad", None, None, False, False, 400),
    ("f-qgis", "mapalab · Complemento de QGIS", "mapalab", "feature", "2026-08-17", "17 ago 2026", "El complemento de QGIS con el catálogo del visor. Vive en su propio repo por comodidad de empaquetado, pero es un feature de mapalab.", None, "mapalab", None, None, False, False, 410),
    ("f-sidecar", "huachicol · Sidecar de encargo", "huachicol", "feature", "2026-08-26", "26 ago 2026", "Un /ontoy prestado para los servicios que no pueden exponer el suyo, como sitio2026.", None, "huachicol", None, None, False, False, 420),
    ("f-uptime", "huachicol · Uptime de 24 horas", "huachicol", "feature", "2026-08-26", "26 ago 2026", "El /api/status publica las 24 horas de cada servicio comprimidas en tramos, en vez de un solo número.", None, "huachicol", None, None, False, False, 430),
    ("f-nodos", "huachicol · Mapa de nodos", "huachicol", "feature", "2026-08-27", "27 ago 2026", "El /ontoy pasa a hablar de la máquina y no solo del servicio. /api/nodos agrupa los servicios por servidor y el CMS lo dibuja como mapa.", None, "huachicol", None, None, False, False, 440),
    ("f-temp", "huachicol · Temperatura del CPU", "huachicol", "feature", "2026-08-28", "28 ago 2026", "El nodo reporta la temperatura cuando el equipo la expone, como lista de sensores.", None, "huachicol", None, None, False, False, 450),
    ("dns", "DNS local del instituto", "infra", "momento", "2026-08-28", "28 ago 2026", "portalito.iieg e intranet.iieg en el DNS del AD. Los dos apuntan al hipervisor de Proxmox, que enruta por server_name a la VM que toca.", None, None, None, None, False, False, 460),
    ("f-selector", "mapalab · Selector de municipios", "mapalab", "feature", "2026-08-28", "en desarrollo", "El selector de municipios del visor. Es lo que se está terminando ahora: todavía no sale a público.", None, "mapalab", None, None, True, False, 470),
    ("intranet-1", "intranet 1", "intranet", "porllegar", "2026-12-15", "mediados de dic 2026", "La intranet nueva, la que vive en GitLab, releva a la de sexenios anteriores. Hoy se llega por intranet.iieg.", None, None, "legado-intranet", "lo releva", False, False, 480),
    ("vine-1", "vine 1", "vine", "porllegar", "2026-12-20", "sin fecha comprometida", "Deja de ser sistema aparte: las asistencias se administran desde el CMS.", None, None, None, None, False, False, 490),
    ("f-minerva-sub", "minerva · Subdominio propio", "minerva", "feature", "2027-03-01", "sin fecha comprometida", "Sacar a minerva de la ruta compartida y darle host propio. Plan escrito, sin fecha.", None, "minerva", None, None, True, False, 500),
    ("sitio-viejo", "apagado del sitio viejo", "heredado", "momento", "2027-06-01", "2027 · sin fecha", "El apagado definitivo del portal heredado. Su Apache con PHP ya no sirve nada desde marzo de 2026, pero la VM y el MySQL siguen ahí.", None, None, None, None, False, False, 510),
)

COLUMNAS = (
    "clave",
    "etiqueta",
    "proyecto",
    "tipo",
    "fecha_eje",
    "fecha_texto",
    "motivo",
    "nombre_anterior",
    "feature_de",
    "nace_de",
    "leyenda",
    "beta",
    "muerto",
    "orden",
)


def upgrade() -> None:
    tabla = op.create_table(
        "roadmap_hitos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("clave", sa.String(length=60), nullable=False),
        sa.Column("etiqueta", sa.String(length=120), nullable=False),
        sa.Column("proyecto", sa.String(length=40), nullable=False),
        sa.Column("tipo", sa.String(length=20), nullable=False),
        sa.Column("fecha_eje", sa.String(length=10), nullable=False),
        sa.Column("fecha_texto", sa.String(length=80), nullable=False),
        sa.Column("motivo", sa.Text(), nullable=False),
        sa.Column("nombre_anterior", sa.String(length=60), nullable=True),
        sa.Column("feature_de", sa.String(length=40), nullable=True),
        sa.Column("nace_de", sa.String(length=60), nullable=True),
        sa.Column("leyenda", sa.String(length=60), nullable=True),
        sa.Column("beta", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("muerto", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("orden", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_roadmap_hitos_clave", "roadmap_hitos", ["clave"], unique=True)
    op.create_index("ix_roadmap_hitos_proyecto", "roadmap_hitos", ["proyecto"])
    op.bulk_insert(tabla, [dict(zip(COLUMNAS, fila)) for fila in HITOS])


def downgrade() -> None:
    op.drop_index("ix_roadmap_hitos_proyecto", table_name="roadmap_hitos")
    op.drop_index("ix_roadmap_hitos_clave", table_name="roadmap_hitos")
    op.drop_table("roadmap_hitos")
