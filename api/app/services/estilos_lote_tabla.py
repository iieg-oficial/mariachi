from __future__ import annotations

import csv
import io
from dataclasses import dataclass, field

Number = int | float
Cut = Number | None

COLUMNAS_REQUERIDAS = ('capa', 'nombre_capa_geoserver', 'campo', 'paleta', 'cortes_rangos')
ORIENTACIONES_INVERTIDAS = {'superior', 'invertir'}
VACIOS = {'', 'null', 'none', 'y más', 'y mas', '+'}

DEFAULT_STROKE = {'color': '#FFFFFF', 'width': 0.35, 'opacity': 1.0, 'linejoin': 'bevel'}
DEFAULT_NULL_STYLE = {
    'enabled': True,
    'label': 'Sin dato',
    'stroke': {'color': '#7A7A7A', 'width': 0.35, 'opacity': 1.0, 'linejoin': 'bevel'},
    'background_color': '#FFFFFF',
    'hatch': {
        'well_known_name': 'shape://times',
        'color': '#7A7A7A',
        'size': 7,
        'stroke_width': 1.0,
        'opacity': 1.0,
    },
}


class TablaInvalidaError(ValueError):
    pass


@dataclass
class FilaLote:
    fila: int
    nombre: str
    workspace: str
    layer_name: str
    attribute: str
    unidades: str
    paleta: str
    orientacion: str
    cortes_texto: str = ''
    cortes: list[Cut] = field(default_factory=list)
    colores: list[str] = field(default_factory=list)
    labels: list[str] = field(default_factory=list)
    errores: list[str] = field(default_factory=list)
    alias: str | None = None
    reemplaza: bool = False

    @property
    def style_name(self) -> str:
        return self.layer_name

    @property
    def resource_id(self) -> str:
        return f'{self.alias}:{self.style_name}'

    def borrador_data(self) -> dict:
        return {
            'shape': 'choropleth',
            'layer_name': self.layer_name,
            'style_title': self.nombre,
            'style_abstract': f'Unidades: {self.unidades}' if self.unidades else '',
            'attribute': self.attribute,
            'cortes': self.cortes,
            'labels': self.labels,
            'colors': self.colores,
            'stroke': dict(DEFAULT_STROKE),
            'null_style': dict(DEFAULT_NULL_STYLE),
            'default_style': True,
            'origen': 'lote',
        }

    def to_dict(self) -> dict:
        return {
            'fila': self.fila,
            'nombre': self.nombre,
            'workspace': self.workspace,
            'alias': self.alias,
            'layer_name': self.layer_name,
            'style_name': self.style_name,
            'attribute': self.attribute,
            'unidades': self.unidades,
            'paleta': self.paleta,
            'orientacion': self.orientacion,
            'cortes_texto': self.cortes_texto,
            'cortes': self.cortes,
            'colores': self.colores,
            'labels': self.labels,
            'errores': self.errores,
            'reemplaza': self.reemplaza,
        }


def leer_tabla(texto: str) -> list[dict[str, str]]:
    contenido = (texto or '').lstrip('﻿').strip()
    if not contenido:
        raise TablaInvalidaError('La tabla está vacía')
    primera = contenido.splitlines()[0]
    delimitador = '\t' if '\t' in primera else ','
    lector = csv.DictReader(io.StringIO(contenido), delimiter=delimitador)
    columnas = {(c or '').strip().lower() for c in (lector.fieldnames or [])}
    faltan = [c for c in COLUMNAS_REQUERIDAS if c not in columnas]
    if faltan:
        raise TablaInvalidaError(f'Faltan columnas: {", ".join(faltan)}')
    filas = []
    for fila in lector:
        limpia = {(k or '').strip().lower(): (v or '').strip() for k, v in fila.items() if k}
        if any(limpia.values()):
            filas.append(limpia)
    if not filas:
        raise TablaInvalidaError('La tabla no tiene filas')
    return filas


def _numero(texto: str) -> Number:
    valor = float(texto)
    return int(valor) if valor.is_integer() else valor


def leer_cortes(texto: str) -> list[Cut]:
    partes = [p.strip() for p in (texto or '').strip().strip('[]').split(',')]
    if partes == ['']:
        return []
    return [None if p.lower() in VACIOS else _numero(p) for p in partes]


def validar_cortes(cortes: list[Cut]) -> list[str]:
    if len(cortes) < 3:
        return ['Faltan cortes: se necesitan al menos dos clases']
    if any(c is None for c in cortes[1:-1]):
        return ['Un corte vacío solo puede ir al principio o al final']
    numeros = [c for c in cortes if c is not None]
    if len(numeros) > 2 and numeros[0] == numeros[1] == numeros[2]:
        return ['Solo el primer corte se puede repetir']
    for i in range(1, len(numeros)):
        repetido_inicial = i == 1 and numeros[0] == numeros[1]
        if numeros[i] < numeros[i - 1] or (numeros[i] == numeros[i - 1] and not repetido_inicial):
            return ['Los cortes deben ir de menor a mayor']
    return []


def formato_numero(x: Number) -> str:
    if isinstance(x, float) and x.is_integer():
        x = int(x)
    if isinstance(x, int):
        return f'{x:,}'.replace(',', ' ')
    entero, _, decimales = f'{x:.10f}'.rstrip('0').partition('.')
    signo = '-' if entero.startswith('-') else ''
    miles = f'{int(entero.lstrip("-") or 0):,}'.replace(',', ' ')
    return f'{signo}{miles}' + (f'.{decimales}' if decimales else '')


def generar_labels(cortes: list[Cut], unidades: str) -> list[str]:
    sufijo = ' %' if unidades.strip() == '%' else ''
    cero_aparte = cortes[0] is not None and cortes[0] == cortes[1]
    ultima_abierta = cortes[-1] is None
    n = len(cortes) - 1
    labels = []
    for k in range(n):
        a, b = cortes[k], cortes[k + 1]
        if a is None:
            texto = f'< {formato_numero(b)}'
        elif cero_aparte and k == 0:
            texto = formato_numero(a)
        elif ultima_abierta and k == n - 1:
            texto = f'> {formato_numero(a)}'
        else:
            texto = f'{formato_numero(a)} a {formato_numero(b)}'
        labels.append(texto + sufijo)
    return labels


def paletas_por_nombre(paletas: list[dict]) -> dict[str, dict]:
    return {p['name']: p for p in paletas}


def interpretar_fila(numero: int, fila: dict[str, str], paletas: dict[str, dict]) -> FilaLote:
    workspace, _, layer_name = fila.get('nombre_capa_geoserver', '').partition(':')
    resultado = FilaLote(
        fila=numero,
        nombre=fila.get('capa', ''),
        workspace=workspace.strip(),
        layer_name=layer_name.strip(),
        attribute=fila.get('campo', ''),
        unidades=fila.get('unidades', ''),
        paleta=fila.get('paleta', ''),
        orientacion=fila.get('orientacion_favorable', ''),
        cortes_texto=fila.get('cortes_rangos', ''),
    )
    if not resultado.nombre:
        resultado.errores.append('Falta el nombre de la capa')
    if not resultado.workspace or not resultado.layer_name:
        resultado.errores.append('nombre_capa_geoserver debe ser workspace:capa')
    if not resultado.attribute:
        resultado.errores.append('Falta el campo')
    try:
        resultado.cortes = leer_cortes(fila.get('cortes_rangos', ''))
    except ValueError:
        resultado.errores.append('Hay un corte que no es número')
        return resultado
    errores_cortes = validar_cortes(resultado.cortes)
    resultado.errores.extend(errores_cortes)
    if not errores_cortes:
        resultado.labels = generar_labels(resultado.cortes, resultado.unidades)
    _resolver_colores(resultado, paletas)
    return resultado


def _resolver_colores(fila: FilaLote, paletas: dict[str, dict]) -> None:
    paleta = paletas.get(fila.paleta)
    if paleta is None:
        fila.errores.append(f'La paleta «{fila.paleta}» no existe' if fila.paleta else 'Falta la paleta')
        return
    orientacion = fila.orientacion.strip().lower()
    clases = len(fila.cortes) - 1
    if clases < 1:
        return
    colores = list(paleta.get('colors') or [])
    if len(colores) < clases:
        fila.errores.append(f'La paleta tiene {len(colores)} colores y hay {clases} clases')
        return
    colores = colores[:clases]
    fila.colores = list(reversed(colores)) if orientacion in ORIENTACIONES_INVERTIDAS else colores
