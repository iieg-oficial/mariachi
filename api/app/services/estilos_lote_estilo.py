from __future__ import annotations

from xml.etree import ElementTree

from sqlalchemy.orm import Session

from app.models.borrador import Borrador
from app.models.user import Usuario
from app.services.estilos_lote import _cortes_texto, guardar_borrador, tabla_de_filas
from app.services.estilos_lote_tabla import NOMBRE_ESTILO, TablaInvalidaError
from app.services.geoserver_client import GeoServerClient
from app.services.sld_parser import parse_sld


def tabla_de_estilo(workspace: str, estilo: str, client: GeoServerClient | None = None) -> str:
    cliente = client or GeoServerClient()
    parsed = parse_sld(cliente.get_sld(workspace, estilo))
    if parsed.shape != 'choropleth' or parsed.model is None:
        raise TablaInvalidaError('Este estilo no es coroplético: edítalo como XML')
    modelo = parsed.model
    return tabla_de_filas([{
        'capa': modelo.style_title or estilo,
        'nombre_capa_geoserver': f'{workspace}:{modelo.layer_name}',
        'campo': modelo.attribute,
        'unidades': modelo.units or modelo.style_abstract.removeprefix('Unidades: '),
        'cortes_rangos': _cortes_texto(modelo.cortes),
        'nombre_estilo': estilo,
        'colores': ' '.join(modelo.colors),
    }])


def guardar_xml(db: Session, alias: str, estilo: str, capa: str, xml: str, usuario: Usuario) -> Borrador:
    if not NOMBRE_ESTILO.fullmatch(estilo):
        raise TablaInvalidaError('El nombre del estilo solo admite letras sin acento, números, _ y -')
    try:
        ElementTree.fromstring(xml)
    except ElementTree.ParseError as exc:
        raise TablaInvalidaError(f'El XML no es válido: {exc}') from exc
    data = {
        'shape': 'xml',
        'xml': xml,
        'layer_name': capa,
        'style_title': estilo,
        'default_style': False,
        'origen': 'lote',
    }
    borrador = guardar_borrador(db, f'{alias}:{estilo}', data, usuario)
    db.commit()
    db.refresh(borrador)
    return borrador
