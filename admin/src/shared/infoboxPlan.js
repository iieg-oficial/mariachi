/*
 * Resolución de la tarjetita: configuración + propiedades de una feature -> plan de pintado.
 *
 * COPIA CANÓNICA. mariachi tiene una copia byte a byte en admin/src/shared/infoboxPlan.js.
 * No editar la copia: editar aquí y correr scripts/sync-infobox-plan.sh de mariachi.
 * El módulo es puro a propósito —sin React, sin estilos, sin imports— para que las dos
 * aplicaciones tomen las mismas decisiones y solo difieran en cómo las pintan.
 */

export const MULTIVALOR_SEPARADOR = '; ';
export const MULTIVALOR_SPLIT = /\s*;\s*/;

export const BODY_TYPES = ['labelGroups', 'list', 'iconText', 'text', 'cards'];

const SEPARADOR_MILES = ',';

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const GENERO_SUFIJOS = ['hombres', 'mujeres', 'masculino', 'femenino', 'ninos', 'ninas', 'adultos', 'jovenes'];
const ESQUEMAS_HREF = ['http:', 'https:', 'mailto:', 'tel:'];
const PATRON_TOKEN = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
const SEPARADOR_UNION = ', ';
const ESTILO_LABELS_LEGADO = { color: '#7B61FF', bg: '#F3F0FF' };

const esVacio = (v) => v === null || v === undefined || v === '';
const esBlanco = (v) => v === null || v === undefined || String(v).trim() === '';

const PREFIJO_ISO = /^(\d{4})-\d{2}-\d{2}/;

const anioDe = (valor) => {
    const texto = String(valor).trim();
    if (PREFIJO_ISO.test(texto)) return texto.slice(0, 4);
    const fecha = new Date(texto);
    return Number.isNaN(fecha.getTime()) ? null : String(fecha.getUTCFullYear());
};

export const aplicarFormato = (valor, formato) => (
    formato !== 'anio' || esVacio(valor) ? valor : anioDe(valor) ?? valor
);

export const formatNumber = (value) => {
    if (esVacio(value)) return value;
    const str = String(value);
    const partes = str.split('.');
    const entera = partes[0];
    const negativo = entera.startsWith('-');
    const digitos = negativo ? entera.slice(1) : entera;
    if (digitos.length <= 3 || !/^\d+$/.test(digitos)) return str;
    const agrupado = digitos.replace(/\B(?=(\d{3})+(?!\d))/g, SEPARADOR_MILES);
    const conSigno = negativo ? `-${agrupado}` : agrupado;
    return partes.length > 1 ? `${conSigno}.${partes[1]}` : conSigno;
};

export const formatIsoAsMonthYear = (iso) => {
    if (!iso || typeof iso !== 'string') return null;
    const partes = iso.split('-');
    if (partes.length < 2) return null;
    const mes = MESES[parseInt(partes[1], 10) - 1] || '';
    return `${mes} ${partes[0]}`.trim();
};

export const splitMultivalue = (value) => {
    if (typeof value !== 'string') return [];
    return value.split(MULTIVALOR_SPLIT).map((i) => i.trim()).filter(Boolean);
};

const partesDe = (compose) => (Array.isArray(compose) ? compose : [])
    .map((p) => (typeof p === 'string' ? { field: p } : p))
    .filter((p) => p && typeof p === 'object' && p.field);

export const isComposedDef = (def) => !!def
    && typeof def === 'object'
    && !def.field
    && Array.isArray(def.compose)
    && partesDe(def.compose).length > 0;

export const isJoinedDef = (def) => isComposedDef(def) && def.op !== 'sum';

export const makeValueResolver = (properties) => {
    const porMinuscula = new Map();
    Object.keys(properties || {}).forEach((k) => {
        const baja = k.toLowerCase();
        if (!porMinuscula.has(baja)) porMinuscula.set(baja, k);
    });

    const readField = (field) => {
        if (!field) return '';
        const k = porMinuscula.get(String(field).toLowerCase());
        return k === undefined ? '' : properties[k];
    };

    const sumar = (partes) => {
        let total = 0;
        let hubo = false;
        partes.forEach((p) => {
            const crudo = readField(p.field);
            if (esBlanco(crudo)) return;
            const n = Number(crudo);
            if (!Number.isFinite(n)) return;
            total += n;
            hubo = true;
        });
        return hubo ? total : '';
    };

    const unir = (partes, sep) => {
        const trozos = [];
        partes.forEach((p) => {
            const crudo = readField(p.field);
            if (esBlanco(crudo)) return;
            trozos.push(`${p.prefix || ''}${String(crudo).trim()}${p.suffix || ''}`);
        });
        return trozos.length ? trozos.join(sep) : '';
    };

    const resolve = (def) => {
        if (def === null || def === undefined) return '';
        if (typeof def === 'string') return readField(def);
        if (typeof def !== 'object') return '';
        if (def.field) return readField(def.field);
        const partes = partesDe(def.compose);
        if (!partes.length) return '';
        if (def.op === 'sum') return sumar(partes);
        return unir(partes, typeof def.sep === 'string' ? def.sep : SEPARADOR_UNION);
    };

    return { resolve, readField };
};

export const resolveHref = (plantilla, getValue) => {
    if (typeof plantilla !== 'string' || !plantilla.trim()) return null;
    let sinResolver = false;
    const puesto = plantilla.replace(PATRON_TOKEN, (_, nombre) => {
        const v = typeof getValue === 'function' ? getValue(nombre) : '';
        if (v === '' || v == null) { sinResolver = true; return ''; }
        return encodeURIComponent(String(v));
    });
    if (sinResolver) return null;
    const limpio = puesto.trim();
    if (!limpio) return null;
    if (limpio.startsWith('/')) return limpio;
    try {
        const url = new URL(limpio);
        return ESQUEMAS_HREF.includes(url.protocol) ? limpio : null;
    } catch { return null; }
};

const hrefDeIcono = (icon, value) => {
    if (!value) return null;
    const s = String(value);
    if (icon === 'celular') return `tel:${s.replace(/\s+/g, '')}`;
    if (icon === 'ubicacion') return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s)}`;
    if (icon === 'web') return /^https?:\/\//i.test(s) ? s : `https://${s}`;
    return null;
};

export const applyHeaderTransform = (transform, value, featureId) => {
    if (!transform) return value;
    let r = transform.valueMap?.[value] ?? value;
    if (transform.featureIdSuffix) {
        const { match, ifMatch, ifNoMatch } = transform.featureIdSuffix;
        const sufijo = featureId?.includes(match) ? ifMatch : ifNoMatch;
        if (sufijo) r = `${r} ${sufijo}`;
    }
    return r;
};

export const resolveStaticValue = (value, dateValue) => {
    if (typeof value !== 'object' || value === null) return value;
    if (value.dynamic === 'rasterDate') return formatIsoAsMonthYear(dateValue) || value.fallback;
    return value;
};

export const extractSuffixFromLayerId = (layerId) => {
    if (!layerId) return null;
    const baja = layerId.toLowerCase();
    return GENERO_SUFIJOS.find((s) => baja.includes(s)) || null;
};

const incluyeCampo = (nombre, sufijo) => {
    if (!sufijo || !nombre) return true;
    const baja = nombre.toLowerCase();
    if (baja.includes(sufijo)) return true;
    return !GENERO_SUFIJOS.filter((s) => s !== sufijo).some((o) => baja.includes(o));
};

const iconoDeGenero = (label) => {
    const baja = String(label || '').toLowerCase();
    if (baja.includes('hombre')) return 'hombre';
    if (baja.includes('mujer')) return 'mujer';
    return null;
};

const formatoPorEtiqueta = (label, value) => {
    const etiqueta = String(label || '');
    if (etiqueta.includes('Año de la información')) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) return d.getFullYear();
    }
    if (etiqueta.includes('Fecha')) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    return value;
};

const esInstanciada = (arr) => !!arr[0]
    && typeof arr[0] === 'object'
    && typeof arr[0].id === 'string'
    && Array.isArray(arr[0].items);

export const blockInstances = (cfg, type) => {
    const crudo = cfg?.[type];
    if (crudo == null) return [];
    if (!Array.isArray(crudo)) return [{ key: type, type, id: null, items: [crudo] }];
    if (crudo.length === 0) return [];
    if (esInstanciada(crudo)) {
        return crudo.map((b) => ({ key: `${type}:${b.id}`, type, id: b.id, items: b.items || [] }));
    }
    return [{ key: type, type, id: null, items: crudo }];
};

export const allInstances = (cfg) => BODY_TYPES.flatMap((t) => blockInstances(cfg, t));

export const normalizeConfig = (cfg) => {
    if (!cfg || typeof cfg !== 'object') return cfg;
    let out = cfg;
    if (Array.isArray(out.text) && out.text.length && !Array.isArray(out.text[0]?.items)) {
        out = { ...out, text: [{ id: 't0', items: out.text }] };
        if (Array.isArray(cfg.blockOrder)) {
            out.blockOrder = cfg.blockOrder.map((k) => (k === 'text' ? 'text:t0' : k));
        }
    }
    if (Array.isArray(out.labels) && out.labels.length) {
        const migrado = { fields: out.labels.slice(), ...ESTILO_LABELS_LEGADO };
        const { labels: _fuera, ...resto } = out;
        out = { ...resto, labelGroups: Array.isArray(out.labelGroups) ? [migrado, ...out.labelGroups] : [migrado] };
        if (Array.isArray(cfg.blockOrder)) {
            const filtrado = cfg.blockOrder.filter((k) => k !== 'labels');
            if (filtrado.length) out.blockOrder = filtrado; else delete out.blockOrder;
        }
    }
    return out;
};

const ordenDelCuerpo = (instancias, blockOrder) => {
    const presentes = instancias.map((i) => i.key);
    const validas = new Set(presentes);
    const explicito = Array.isArray(blockOrder) ? blockOrder.filter((k) => validas.has(k)) : [];
    return [...explicito, ...presentes.filter((k) => !explicito.includes(k))];
};

const planLabelGroups = ({ items, resolve, dateValue }) => {
    const grupos = [];
    items.forEach((grupo) => {
        const etiquetas = [];
        (grupo.staticValues || []).forEach((v) => {
            const r = resolveStaticValue(v, dateValue);
            if (!esVacio(r)) etiquetas.push({ value: r, color: grupo.color, bg: grupo.bg });
        });
        (grupo.fields || []).map((f) => (typeof f === 'string' ? { field: f } : f)).forEach((def) => {
            if (!def || (!def.field && !def.compose)) return;
            const valor = aplicarFormato(resolve(def), def.formato);
            if (esVacio(valor)) return;
            const comun = {
                color: def.color || grupo.color,
                bg: def.bg || grupo.bg,
                fullWidth: def.fullWidth,
            };
            if ((def.split ?? grupo.splitValues) && typeof valor === 'string') {
                splitMultivalue(valor).forEach((item) => etiquetas.push({ value: item, ...comun }));
            } else {
                etiquetas.push({ value: valor, ...comun });
            }
        });
        if (etiquetas.length) grupos.push({ labels: etiquetas });
    });
    return grupos.length ? { groups: grupos } : null;
};

const planList = ({ items, resolve, getValue, suffix }) => {
    const rows = items
        .filter((row) => incluyeCampo(row.field, suffix))
        .map((row) => {
            const crudo = resolve(row);
            const sinFormato = row.raw || row.formato || isJoinedDef(row);
            const conFecha = row.formato ? aplicarFormato(crudo, row.formato) : formatoPorEtiqueta(row.label, crudo);
            return {
                label: row.label,
                value: sinFormato ? conFecha : formatNumber(conFecha),
                values: row.split ? splitMultivalue(crudo) : null,
                href: resolveHref(row.href, getValue),
            };
        })
        .filter((row) => !esVacio(row.value) && (!row.values || row.values.length > 0));
    return rows.length ? { rows } : null;
};

const planIconText = ({ items, resolve, getValue, allowActions }) => {
    const validos = items
        .filter(Boolean)
        .map((item) => ({ item, fieldValue: aplicarFormato(resolve(item), item.formato) }))
        .filter(({ item, fieldValue }) => item.label || fieldValue || item.value)
        .filter(({ item }) => allowActions || item.action !== 'report');
    const salida = validos.map(({ item, fieldValue }, idx) => {
        const mostrado = item.label || item.value || fieldValue;
        const paraHref = fieldValue || item.value || mostrado;
        const explicito = item.href ? resolveHref(item.href, getValue) : null;
        return {
            icon: item.icon,
            value: mostrado,
            href: explicito || hrefDeIcono(item.icon, paraHref),
            action: item.action && !explicito ? item.action : null,
            showDivider: idx === 0,
            isLast: idx === validos.length - 1,
        };
    });
    return salida.length ? { items: salida } : null;
};

const planText = ({ items, resolve, getValue }) => {
    const salida = items
        .map((it) => ({
            label: it.label || null,
            value: aplicarFormato(resolve(it), it.formato),
            href: resolveHref(it.href, getValue),
        }))
        .filter((it) => it.label || it.value);
    return salida.length ? { items: salida } : null;
};

const planCards = ({ items, resolve, suffix, config, variant }) => {
    const cards = items
        .filter(Boolean)
        .filter((c) => incluyeCampo(c.field, suffix))
        .map((card) => {
            const crudo = aplicarFormato(resolve(card), card.formato);
            const sinFormato = card.raw || card.formato || isJoinedDef(card);
            let valor;
            if (sinFormato) valor = crudo ?? '';
            else if (card.decimals != null && typeof crudo === 'number') valor = formatNumber(crudo.toFixed(card.decimals));
            else valor = formatNumber(crudo);
            return {
                label: card.label,
                value: valor,
                suffix: card.suffix || '',
                icon: iconoDeGenero(card.label),
            };
        })
        .filter((c) => !esVacio(c.value));
    if (!cards.length) return null;
    return { cards, columns: config.cardsColumns ?? (variant === 'mobile' ? 2 : 1) };
};

const PLANIFICADORES = {
    labelGroups: planLabelGroups,
    list: planList,
    iconText: planIconText,
    text: planText,
    cards: planCards,
};

const CAMPOS_TITULO = ['nombre', 'name', 'titulo', 'title', 'descripcion', 'delito', 'tipo'];
const CAMPOS_MUNICIPIO = ['municipio', 'municipality', 'mpio', 'nom_mun', 'clave_geo'];
const CAMPOS_UBICACION = ['domicilio', 'direccion', 'address', 'ubicacion', 'calle'];
const CAMPOS_EXCLUIDOS = ['gid', 'id', 'fid', 'ogc_fid', 'geom', 'geometry', 'the_geom', 'shape'];

const primerCampo = (properties, candidatos) => {
    const porMinuscula = {};
    Object.keys(properties || {}).forEach((k) => { porMinuscula[k.toLowerCase()] = k; });
    for (const c of candidatos) {
        const original = porMinuscula[c.toLowerCase()];
        if (original && properties[original]) return original;
    }
    return null;
};

export const generateDefaultConfig = (properties) => {
    if (!properties) return null;
    const titulo = primerCampo(properties, CAMPOS_TITULO);
    const municipio = primerCampo(properties, CAMPOS_MUNICIPIO);
    const ubicacion = primerCampo(properties, CAMPOS_UBICACION);
    const usados = new Set([titulo, municipio, ubicacion, ...CAMPOS_EXCLUIDOS]
        .filter(Boolean).map((f) => f.toLowerCase()));
    const restantes = Object.keys(properties)
        .filter((k) => !usados.has(k.toLowerCase()))
        .filter((k) => !esVacio(properties[k]));
    const config = {};
    if (titulo) config.headerField = titulo;
    if (municipio) config.labelGroups = [{ fields: [municipio], color: '#FF8300', bg: '#FFF2E5' }];
    if (restantes.length) {
        config.list = restantes.slice(0, 6).map((field) => ({
            label: field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
            field,
        }));
    }
    if (ubicacion) config.iconText = [{ icon: 'ubicacion', field: ubicacion }];
    return Object.keys(config).length ? config : null;
};

const campoDeDef = (def, acc) => {
    if (typeof def === 'string') { acc.add(def); return; }
    if (!def || typeof def !== 'object') return;
    if (def.field) { acc.add(def.field); return; }
    partesDe(def.compose).forEach((p) => acc.add(p.field));
};

export const referencedFields = (config) => {
    const cfg = normalizeConfig(config);
    const acc = new Set();
    if (!cfg || typeof cfg !== 'object') return acc;
    if (cfg.headerField) campoDeDef(cfg.headerField, acc);
    allInstances(cfg).forEach(({ type, items }) => {
        items.forEach((item) => {
            if (type === 'labelGroups') {
                (item.fields || []).forEach((f) => campoDeDef(f, acc));
                return;
            }
            campoDeDef(item, acc);
        });
    });
    return acc;
};

export const buildCardPlan = (properties, config, opciones = {}) => {
    if (!properties) return null;
    const { layerId = null, featureId = null, dateValue = null, variant = 'desktop', allowActions = false } = opciones;
    const cfg = normalizeConfig(config || generateDefaultConfig(properties));
    if (!cfg) return null;

    const { resolve, readField } = makeValueResolver(properties);
    const suffix = extractSuffixFromLayerId(layerId);

    let title = null;
    if (cfg.headerField) {
        const resuelto = resolve(cfg.headerField);
        const respaldo = typeof cfg.headerField === 'string' ? cfg.headerField : '';
        title = applyHeaderTransform(cfg.headerTransform, resuelto || respaldo, featureId) || null;
    }

    const instancias = allInstances(cfg);
    const porLlave = new Map(instancias.map((i) => [i.key, i]));
    const blocks = [];
    ordenDelCuerpo(instancias, cfg.blockOrder).forEach((key) => {
        const inst = porLlave.get(key);
        if (!inst) return;
        const armado = PLANIFICADORES[inst.type]?.({
            items: inst.items,
            resolve,
            getValue: readField,
            dateValue,
            suffix,
            variant,
            allowActions,
            config: cfg,
        });
        if (armado) blocks.push({ key: inst.key, type: inst.type, ...armado });
    });

    return { title, blocks, isEmpty: !title && blocks.length === 0 };
};
