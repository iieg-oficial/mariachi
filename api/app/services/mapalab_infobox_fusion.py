from typing import Any

TIPOS_CUERPO = ('labelGroups', 'list', 'iconText', 'text', 'cards')
TIPOS_EDITABLES = ('list', 'cards', 'text')
CLAVES_EDITABLES = ('headerField', 'list', 'cards', 'text')


def _es_instanciado(valor: Any) -> bool:
    return (
        isinstance(valor, list)
        and len(valor) > 0
        and isinstance(valor[0], dict)
        and isinstance(valor[0].get('id'), str)
        and isinstance(valor[0].get('items'), list)
    )


def _normalizar_llave(llave: str) -> str:
    return 'text:t0' if llave == 'text' else llave


def llaves_presentes(config: dict) -> list[str]:
    llaves: list[str] = []
    for tipo in TIPOS_CUERPO:
        valor = config.get(tipo)
        if tipo == 'labelGroups' and config.get('labels') and not valor:
            llaves.append('labelGroups')
            continue
        if not valor:
            continue
        if _es_instanciado(valor):
            llaves.extend(f"{tipo}:{bloque['id']}" for bloque in valor)
        else:
            llaves.append(_normalizar_llave(tipo))
    return llaves


def orden_base(config: dict) -> list[str]:
    presentes = llaves_presentes(config)
    explicito = [
        llave for llave in (_normalizar_llave(k) for k in config.get('blockOrder') or [])
        if llave in presentes
    ]
    return explicito + [llave for llave in presentes if llave not in explicito]


def _es_editable(llave: str) -> bool:
    return llave.split(':', 1)[0] in TIPOS_EDITABLES


def orden_fusionado(base: dict, propuesta: dict) -> list[str]:
    resultado = list(propuesta.get('blockOrder') or llaves_presentes(propuesta))
    for indice, llave in enumerate(orden_base(base)):
        if not _es_editable(llave) and llave not in resultado:
            resultado.insert(min(indice, len(resultado)), llave)
    return resultado


def fusionar_config(base: dict | None, propuesta: dict) -> dict:
    base = base or {}
    fusion = {
        k: v for k, v in base.items()
        if k not in CLAVES_EDITABLES and k != 'blockOrder'
    }
    for clave in CLAVES_EDITABLES:
        if propuesta.get(clave):
            fusion[clave] = propuesta[clave]
    orden = orden_fusionado(base, propuesta)
    if orden:
        fusion['blockOrder'] = orden
    return fusion


def _items_con_href(config: dict) -> list[dict]:
    items: list[dict] = [row for row in config.get('list') or [] if isinstance(row, dict)]
    texto = config.get('text') or []
    if _es_instanciado(texto):
        for bloque in texto:
            items.extend(i for i in bloque.get('items') or [] if isinstance(i, dict))
    elif isinstance(texto, list):
        items.extend(i for i in texto if isinstance(i, dict))
    return items


def hrefs_de(config: dict | None) -> set[str]:
    return {
        item['href'] for item in _items_con_href(config or {})
        if isinstance(item.get('href'), str) and item['href']
    }


def hrefs_nuevos(base: dict | None, propuesta: dict) -> set[str]:
    return hrefs_de(propuesta) - hrefs_de(base)
