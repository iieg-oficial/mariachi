"""seed home_sections from existing visor configs

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-04-26 12:30:00.000000

"""
import json

import sqlalchemy as sa
from alembic import op

from app.core.settings import get_settings


revision = 'b8c9d0e1f2a3'
down_revision = 'a7b8c9d0e1f2'
branch_labels = None
depends_on = None


def _public_url(object_name: str) -> str:
    s = get_settings()
    scheme = "https" if s.acervo_use_ssl else "http"
    return f"{scheme}://{s.acervo_public_endpoint}/mapalab/{object_name}"


BANNER = {'items': [
    {
        'id': 'banner-default',
        'titulo': 'Explora Jalisco en capas',
        'descripcion': 'MapaLab es una herramienta interactiva que pone a tu alcance información geoespacial confiable y actualizada.',
        'imagen_url': _public_url('webp/bannerHeader.webp'),
        'logo_url': _public_url('svg/mapalab_square.svg'),
        'cta_label': 'Quiero explorar el mapa',
        'cta_href': '/mapa',
        'activo': True,
    },
]}

TOPICS = {'items': [
    {'id': 'general', 'titulo': 'General', 'descripcion': 'Navega el territorio de Jalisco a través de un mapa base que facilita la ubicación y comprensión geográfica.', 'icon': 'base_layers', 'imagen_url': '', 'link': '', 'subtopics': [
        {'label': 'Medio físico', 'layer_ids': ['cuerpos_de_agua_50k']},
        {'label': 'Centro e infraestructura', 'layer_ids': ['cabeceras_municipales', 'limite_municipal']},
    ], 'activo': True, 'orden': 0},
    {'id': 'demografia', 'titulo': 'Demografía', 'descripcion': 'Consulta datos sobre cuántos somos y cómo nos distribuimos en Jalisco.', 'icon': 'demografia', 'imagen_url': '', 'link': '', 'subtopics': [
        {'label': 'Población', 'layer_ids': ['tasa_poblacion_total']},
    ], 'activo': True, 'orden': 1},
    {'id': 'economia', 'titulo': 'Economía', 'descripcion': 'Descubre cómo se mueve la economía con estadísticas de empleo, producción y actividad económica.', 'icon': 'economia', 'imagen_url': '', 'link': '', 'subtopics': [
        {'label': 'Ocupación y empleo', 'layer_ids': ['tasa_trabajadores_asegurados']},
        {'label': 'Sector primario', 'layer_ids': ['agave']},
    ], 'activo': True, 'orden': 2},
    {'id': 'recursos', 'titulo': 'Recursos y Calidad de Vida', 'descripcion': 'Encuentra información sobre espacios públicos, agua, clima y áreas naturales protegidas.', 'icon': 'recursos', 'imagen_url': '', 'link': '', 'subtopics': [
        {'label': 'Asentamientos urbanos', 'layer_ids': ['espacios_publicos_y_lugares_recreativos']},
        {'label': 'Clima', 'layer_ids': ['temperatura_media_anual']},
        {'label': 'Agua', 'layer_ids': ['disponibilidad_acuiferos']},
        {'label': 'Áreas protegidas', 'layer_ids': ['bosque_de_la_primavera']},
        {'label': 'Territorio', 'layer_ids': ['urbano']},
    ], 'activo': True, 'orden': 3},
    {'id': 'seguridad', 'titulo': 'Seguridad', 'descripcion': 'Conoce índices de seguridad y datos sobre diferentes categorías de delitos.', 'icon': 'seguridad', 'imagen_url': '', 'link': '', 'subtopics': [
        {'label': 'Incidencia en delitos del fuero común', 'layer_ids': ['tasa_lesiones_dolosas', 'tasa_homicidio_doloso']},
        {'label': 'Delitos del fuero común', 'layer_ids': ['lesiones_dolosas', 'homicidio_doloso']},
        {'label': 'Personas desaparecidas', 'layer_ids': ['tasa_personas_desaparecidas']},
    ], 'activo': True, 'orden': 4},
    {'id': 'salud', 'titulo': 'Salud', 'descripcion': 'Visualiza información sobre clínicas, hospitales y servicios médicos municipales, estatales y federales.', 'icon': 'salud', 'imagen_url': '', 'link': '', 'subtopics': [
        {'label': 'Oferta e infraestructura', 'layer_ids': ['establecimientos_salud']},
        {'label': 'Acceso a servicios de salud', 'layer_ids': ['carencia_acceso']},
    ], 'activo': True, 'orden': 5},
    {'id': 'educacion', 'titulo': 'Educación', 'descripcion': 'Accede a estadísticas sobre escuelas en todos sus niveles y rezago educativo.', 'icon': 'educacion', 'imagen_url': '', 'link': '', 'subtopics': [
        {'label': 'Oferta e infraestructura', 'layer_ids': ['cat-centros-educativos']},
        {'label': 'Capacidades y alfabetización', 'layer_ids': ['tasa_rezago_educativo']},
    ], 'activo': True, 'orden': 6},
    {'id': 'desarrollo', 'titulo': 'Desarrollo Social', 'descripcion': 'Analiza información sobre pobreza, vulnerabilidad y desigualdad.', 'icon': 'desarrollo', 'imagen_url': '', 'link': '', 'subtopics': [
        {'label': 'Pobreza y vulnerabilidades', 'layer_ids': ['tasa_pobreza']},
        {'label': 'Igualdad de género', 'layer_ids': ['tasa_brecha_salarial']},
    ], 'activo': True, 'orden': 7},
    {'id': 'gobierno', 'titulo': 'Gobierno y Ciudadanía', 'descripcion': 'Explora cómo se manejan los recursos municipales con estadísticas sobre ingresos y gastos.', 'icon': 'gobierno', 'imagen_url': '', 'link': '', 'subtopics': [
        {'label': 'Finanzas municipales', 'layer_ids': ['tasa_ingreso_per_capita']},
    ], 'activo': True, 'orden': 8},
]}

GUIDE = {'items': [
    {'id': 'paso-1', 'titulo': 'Búsqueda por palabra clave', 'descripcion': 'Utiliza el buscador para encontrar capas relacionadas y activar las que desees visualizar en el mapa.', 'imagen_url': _public_url('svg/img_buscador.svg'), 'orden': 0},
    {'id': 'paso-2', 'titulo': 'Navegación por temáticas', 'descripcion': 'Explora las distintas temáticas del menú para ver y seleccionar las capas disponibles.', 'imagen_url': _public_url('svg/img_navegacion_tematica.svg'), 'orden': 1},
    {'id': 'paso-3', 'titulo': 'Activación de capas', 'descripcion': 'Activa o desactiva capas según tus necesidades; cada una cuenta con una tarjeta con información y acciones específicas.', 'imagen_url': _public_url('svg/img_activar_capa.svg'), 'orden': 2},
    {'id': 'paso-4', 'titulo': 'Consulta de información puntual', 'descripcion': 'Al seleccionar un punto en el mapa, se muestra una tarjeta con los datos más relevantes.', 'imagen_url': _public_url('svg/img_Informacion.svg'), 'orden': 3},
    {'id': 'paso-5', 'titulo': 'Uso de distintas herramientas', 'descripcion': 'Utiliza herramientas de medición y agrega marcadores personalizados con emojis.', 'imagen_url': _public_url('svg/img_herramientas.svg'), 'orden': 4},
    {'id': 'paso-6', 'titulo': 'Descarga de capas', 'descripcion': 'Descarga la visualización del mapa o la información específica de cada capa, puedes descargar la capa para trabajarla en plataformas SIG.', 'imagen_url': _public_url('svg/img_descargar_capa_normal.svg'), 'orden': 5},
]}

VIDEO = {
    'youtube_id': 'MzuImZuDM3E',
    'titulo': 'MapaLab — IIEG',
    'descripcion': '',
    'activo': True,
}

SELECT_PAYLOAD = {'items': [
    {'id': 'opcion-1', 'titulo': 'Tarjeta de información específica por capa', 'descripcion': 'Al seleccionar una capa desde el menú, se mostrará en el panel de capas activas con sus acciones específicas: ocultarla, cambiar el orden del listado, ver su tarjeta de información, así como eliminar la capa. Al activar la tarjeta informativa podrás descargar la capa completa, ajustar su opacidad, consultar su descripción, ver numeralia, filtrar información según el año, así como conocer la metodología, fuente y fecha de actualización de la capa que tienes seleccionada.', 'imagen_url': _public_url('webp/img_info_banner.webp'), 'color': '#FFB98E', 'link': '', 'orden': 0},
    {'id': 'opcion-2', 'titulo': '¿Qué información puedo descargar?', 'descripcion': 'En MapaLab puedes descargar la visualización completa del mapa o el contenido de las capas activas. Las capas pueden descargarse de forma personalizada desde su tarjeta informativa para trabajar posteriormente en software SIG.', 'imagen_url': _public_url('webp/img_descargada_banner.webp'), 'color': '#CBC5F1', 'link': '', 'orden': 1},
    {'id': 'opcion-3', 'titulo': '¿Qué herramientas tiene MapaLab?', 'descripcion': 'MapaLab ofrece herramientas para analizar el mapa, como el trazado y medición de líneas y polígonos, consulta de información por punto, gestión de mediciones guardadas y la posibilidad de agregar marcadores personalizados con emojis. 😉', 'imagen_url': _public_url('webp/img_herramientas_banner.webp'), 'color': '#FFE09B', 'link': '', 'orden': 2},
]}

FAQ = {'items': [
    {'id': 'faq-1', 'pregunta': '¿Qué es MapaLab y para qué sirve?', 'respuesta': 'MapaLab es un geoportal que concentra información geoespacial y estadística de distintos temas para el estado de Jalisco.', 'orden': 0},
    {'id': 'faq-2', 'pregunta': '¿Qué tipo de información puedo consultar?', 'respuesta': 'Puedes consultar información demográfica, económica, de educación, salud, seguridad, desarrollo social, recursos naturales y calidad de vida, gobierno y ciudadanía.', 'orden': 1},
    {'id': 'faq-3', 'pregunta': '¿Puedo visualizar diferentes capas temáticas?', 'respuesta': 'Sí, en Mapalab puedes visualizar diferentes capas temáticas y combinarlas según la información que necesites analizar.', 'orden': 2},
    {'id': 'faq-4', 'pregunta': '¿Puedo descargar los datos que estoy consultando?', 'respuesta': '¡Claro! Puedes descargar la base de datos y además elegir únicamente la información de la capa que te interese. La descarga incluye metadatos para facilitar la compresión del contenido.', 'orden': 3},
    {'id': 'faq-5', 'pregunta': '¿Los datos están actualizados?', 'respuesta': 'Cada capa tiene actualizaciones en fechas distintas, indicadas en su tarjeta de información específica. La información de las capas se actualiza conforme las fuentes generan nueva información, en algunos capas aunque la actualización no sea reciente, la información que se presenta es la vigente.', 'orden': 4},
    {'id': 'faq-6', 'pregunta': '¿Se pueden hacer comparaciones entre municipios o regiones de Jalisco?', 'respuesta': 'Actualmente no es posible comparar municipios o regiones de Jalisco en MapaLab. Sin embargo, está funcionalidad ya está contemplada para las siguientes versiones.', 'orden': 5},
    {'id': 'faq-7', 'pregunta': '¿Puedo consultar tendencias o cambios a lo largo del tiempo?', 'respuesta': '¡Por supuesto! En la tarjeta de información específica de cada capa se indican los distintos periodos disponibles para la selección de tu visualización.', 'orden': 6},
    {'id': 'faq-8', 'pregunta': '¿Mapalab está optimizado para tabletas o dispositivos móviles?', 'respuesta': 'MapaLab es compatible con cualquier dispositivo, pero recomendamos usar una computadora para disfrutar de la mejor experiencia visual y funcional.', 'orden': 7},
    {'id': 'faq-9', 'pregunta': '¿Cómo puedo contactar al IIEG si tengo dudas sobre el uso o los datos de MapaLab?', 'respuesta': 'Para dudas y preguntas sobre MapaLab puedes contactarnos a través del correo contacto@iieg.gob.mx.', 'orden': 8},
    {'id': 'faq-10', 'pregunta': '¿Quién produce la información disponible en MapaLab?', 'respuesta': 'En la tarjeta de información específica de cada capa se indica la fuente original, así como las capas que tienen algún tipo de transformación o procesamiento interno.', 'orden': 9},
]}

FOOTER = {
    'copyright': 'Instituto de Información Estadística y Geográfica de Jalisco ©',
    'privacy_policy_label': 'Aviso de Privacidad',
    'privacy_policy_href': 'https://iieg.gob.mx/ns/wp-content/uploads/2025/06/Aviso_de_Privacidad_Integral_IIEG_06_2025.pdf',
    'logos': [
        {'id': 'mapalab', 'name': 'MapaLab', 'imagen_url': _public_url('svg/mapalab_large_dark.svg'), 'href': '', 'width': '335px', 'height': '57px', 'orden': 0},
        {'id': 'iieg', 'name': 'IIEG', 'imagen_url': _public_url('svg/iieg_large_dark.svg'), 'href': 'https://iieg.gob.mx/ns/', 'width': '230px', 'height': '80px', 'orden': 1},
        {'id': 'jalisco', 'name': 'Jalisco', 'imagen_url': _public_url('svg/jalisco_large_dark.svg'), 'href': 'https://www.jalisco.gob.mx/inicio', 'width': '230px', 'height': '80px', 'orden': 2},
    ],
}


SEEDS = {
    'banner': BANNER,
    'topics': TOPICS,
    'guide': GUIDE,
    'video': VIDEO,
    'select': SELECT_PAYLOAD,
    'faq': FAQ,
    'footer': FOOTER,
}


def upgrade() -> None:
    conn = op.get_bind()
    for key, payload in SEEDS.items():
        existing = conn.execute(
            sa.text(
                "SELECT payload_published, payload_draft "
                "FROM home_sections WHERE key = :k"
            ),
            {'k': key},
        ).fetchone()

        is_empty = existing is None or _looks_empty(existing.payload_published) or _looks_empty(existing.payload_draft)
        if not is_empty:
            continue

        conn.execute(
            sa.text(
                "UPDATE home_sections "
                "SET payload_published = CAST(:p AS JSON), "
                "    payload_draft = CAST(:p AS JSON), "
                "    updated_at = NOW(), "
                "    published_at = NOW() "
                "WHERE key = :k"
            ),
            {'k': key, 'p': json.dumps(payload)},
        )


def _looks_empty(payload):
    if payload is None:
        return True
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except Exception:
            return False
    if not payload:
        return True
    if isinstance(payload, dict):
        if 'items' in payload and not payload['items']:
            return True
        if 'links' in payload and not payload['links']:
            return True
        if all(v in (None, '', False) for v in payload.values()):
            return True
    return False


def downgrade() -> None:
    pass
