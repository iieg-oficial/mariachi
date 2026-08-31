import { MUNICIPIO_STYLE, STYLE_PRESETS } from './infoboxStyles';
import { allInstances, resolveBodyOrder } from './infoboxBlocks';

/*
 * Texto corto: la tarjetita escrita en lineas legibles, para copiar entre entornos
 * y revisarla en un diff sin contar corchetes.
 *
 * Regla dura: si una configuracion no se puede escribir sin perder nada, NO se
 * escribe. `configATexto` devuelve las razones y el editor manda al modo JSON.
 * Un texto que pierde datos en silencio es peor que las llaves.
 */

const ICONOS = { ubicacion: 'ubicacion', celular: 'telefono', web: 'web' };

// El color se escribe con una palabra, no con la llave del preset: «insignia municipio naranja»
// se lee de corrido y ademas desambigua, porque hay columnas que se llaman igual que un preset.
const COLORES = { naranja: 'municipio', morado: 'caracteristica', azul: 'institucion', verde: 'estatus_ok', vino: 'submorado' };
const PALABRA_DE_PRESET = Object.fromEntries(Object.entries(COLORES).map(([palabra, key]) => [key, palabra]));
const ICONO_DE_PALABRA = { ubicacion: 'ubicacion', telefono: 'celular', web: 'web' };
const SEP_ESPERADO = ', ';

const colorDe = (grupo) => STYLE_PRESETS.find(
    (p) => p.color?.toLowerCase() === (grupo.color || '').toLowerCase()
        && p.bg?.toLowerCase() === (grupo.bg || '').toLowerCase(),
)?.key;

const partesDe = (compose) => (Array.isArray(compose) ? compose : [])
    .map((p) => (typeof p === 'string' ? { field: p } : p))
    .filter((p) => p && p.field);

const comillas = (t) => `"${String(t).replace(/"/g, '\\"')}"`;

export const expresionDe = (def, razones, donde) => {
    if (typeof def === 'string') return def;
    if (!def || typeof def !== 'object') return null;
    if (def.field) return def.field;
    const partes = partesDe(def.compose);
    if (!partes.length) return null;
    if (def.op === 'sum') return partes.map((p) => p.field).join(' + ');
    if (def.sep !== undefined && def.sep !== SEP_ESPERADO) {
        razones.push(`${donde}: usa un separador propio (${JSON.stringify(def.sep)})`);
        return null;
    }
    return partes
        .map((p) => `${p.prefix ? comillas(p.prefix) : ''}${p.field}${p.suffix ? comillas(p.suffix) : ''}`)
        .join(SEP_ESPERADO);
};

const soloClaves = (obj, permitidas) => Object.keys(obj).filter((k) => !permitidas.includes(k));

export const configATexto = (config) => {
    const razones = [];
    const lineas = [];
    if (!config || typeof config !== 'object') return { texto: '', razones };

    const extra = soloClaves(config, ['headerField', 'labelGroups', 'list', 'iconText', 'text', 'cards', 'cardsColumns', 'blockOrder']);
    extra.forEach((k) => razones.push(`la clave ${k} no se escribe en texto corto`));
    if (config.headerTransform) razones.push('el titulo usa headerTransform');

    if (config.headerField) {
        const e = expresionDe(config.headerField, razones, 'titulo');
        if (e) lineas.push(`titulo      ${e}`);
    }

    const instancias = allInstances(config);
    const porLlave = new Map(instancias.map((i) => [i.key, i]));
    resolveBodyOrder(config).forEach((llave) => {
        const inst = porLlave.get(llave);
        if (!inst) return;
        const { type, items } = inst;
        items.forEach((item) => {
            if (type === 'labelGroups') {
                if (item.staticValues) { razones.push('hay etiquetas con valores fijos'); return; }
                if (item.fullWidth || item.splitValues) { razones.push('hay etiquetas con opciones de maquetacion'); return; }
                const preset = colorDe(item);
                const palabra = PALABRA_DE_PRESET[preset];
                if (!palabra) { razones.push('hay etiquetas con un color fuera de la paleta'); return; }
                (item.fields || []).forEach((f) => {
                    const e = expresionDe(f, razones, 'insignia');
                    if (e) lineas.push(`insignia    ${e} ${palabra}`);
                });
                return;
            }
            if (type === 'list') {
                const sobra = soloClaves(item, ['field', 'compose', 'sep', 'label']);
                if (sobra.length) { razones.push(`un renglon usa ${sobra.join(', ')}`); return; }
                const e = expresionDe(item, razones, 'renglon');
                if (e) lineas.push(`renglon     ${item.label || ''}: ${e}`);
                return;
            }
            if (type === 'iconText') {
                const palabra = ICONOS[item.icon];
                const sobra = soloClaves(item, ['icon', 'field', 'compose', 'sep']);
                if (!palabra || sobra.length) { razones.push('un icono usa opciones que el texto no escribe'); return; }
                const e = expresionDe(item, razones, palabra);
                if (e) lineas.push(`${palabra.padEnd(11)} ${e}`);
                return;
            }
            if (type === 'cards') {
                const sobra = soloClaves(item, ['field', 'compose', 'sep', 'label', 'op']);
                if (sobra.length) { razones.push(`una cifra usa ${sobra.join(', ')}`); return; }
                const e = expresionDe(item, razones, 'cifra');
                if (e) lineas.push(`cifra       ${item.label || ''}: ${e}`);
                return;
            }
            if (type === 'text') {
                if (item.field || item.compose || item.href) { razones.push('hay parrafos con campos o enlaces'); return; }
                if (item.label) lineas.push(`parrafo     ${item.label}`);
            }
        });
    });

    return { texto: lineas.join('\n'), razones };
};

const leerExpresion = (crudo) => {
    const texto = crudo.trim();
    if (!texto) return null;
    if (texto.includes(' + ')) {
        const campos = texto.split('+').map((t) => t.trim()).filter(Boolean);
        return campos.length > 1 ? { compose: campos.map((field) => ({ field })), op: 'sum' } : null;
    }
    const trozos = texto.split(',').map((t) => t.trim()).filter(Boolean);
    const partes = trozos.map((trozo) => {
        const m = trozo.match(/^(?:"((?:[^"\\]|\\.)*)")?\s*([A-Za-z_][\w]*)\s*(?:"((?:[^"\\]|\\.)*)")?$/);
        if (!m) return null;
        const parte = { field: m[2] };
        if (m[1]) parte.prefix = m[1].replace(/\\"/g, '"');
        if (m[3]) parte.suffix = m[3].replace(/\\"/g, '"');
        return parte;
    });
    if (partes.some((p) => p === null)) return null;
    if (partes.length === 1 && !partes[0].prefix && !partes[0].suffix) return { field: partes[0].field };
    return { compose: partes, sep: SEP_ESPERADO };
};

const conEtiqueta = (resto) => {
    const i = resto.indexOf(':');
    if (i === -1) return null;
    return { label: resto.slice(0, i).trim(), expr: resto.slice(i + 1).trim() };
};

export const textoAConfig = (texto) => {
    const errores = [];
    const bloques = [];
    const empujar = (tipo, item) => {
        const ultimo = bloques[bloques.length - 1];
        if (ultimo && ultimo.tipo === tipo) ultimo.items.push(item);
        else bloques.push({ tipo, items: [item] });
    };
    let headerField;

    String(texto || '').split('\n').forEach((cruda, i) => {
        const linea = cruda.trim();
        if (!linea || linea.startsWith('#')) return;
        const nl = i + 1;
        const esp = linea.indexOf(' ');
        if (esp === -1) { errores.push(`Línea ${nl}: falta el valor de «${linea}»`); return; }
        const clave = linea.slice(0, esp);
        const resto = linea.slice(esp).trim();

        if (clave === 'titulo') {
            const e = leerExpresion(resto);
            if (!e) { errores.push(`Línea ${nl}: no entendí el campo del título`); return; }
            headerField = e.field || e;
            return;
        }
        if (clave === 'insignia') {
            const partes = resto.split(/\s+/);
            const ultima = partes[partes.length - 1];
            const esColor = partes.length > 1 && COLORES[ultima];
            const preset = STYLE_PRESETS.find((p) => p.key === (esColor ? COLORES[ultima] : 'municipio'));
            const expr = esColor ? partes.slice(0, -1).join(' ') : resto;
            const e = leerExpresion(expr);
            if (!e) { errores.push(`Línea ${nl}: no entendí la insignia`); return; }
            empujar('labelGroups', { fields: [e], color: preset.color, bg: preset.bg });
            return;
        }
        if (clave === 'renglon' || clave === 'cifra') {
            const partido = conEtiqueta(resto);
            if (!partido) { errores.push(`Línea ${nl}: falta «Etiqueta:» antes del campo`); return; }
            const e = leerExpresion(partido.expr);
            if (!e) { errores.push(`Línea ${nl}: no entendí el campo`); return; }
            empujar(clave === 'renglon' ? 'list' : 'cards', { ...e, label: partido.label });
            return;
        }
        if (ICONO_DE_PALABRA[clave]) {
            const e = leerExpresion(resto);
            if (!e) { errores.push(`Línea ${nl}: no entendí el campo del ${clave}`); return; }
            empujar('iconText', { icon: ICONO_DE_PALABRA[clave], ...e });
            return;
        }
        if (clave === 'parrafo') { empujar('text', { label: resto }); return; }
        errores.push(`Línea ${nl}: «${clave}» no es una palabra que el texto corto conozca`);
    });

    const config = {};
    if (headerField) config.headerField = headerField;
    const porTipo = new Map();
    const orden = [];
    bloques.forEach((b, i) => {
        const previos = porTipo.get(b.tipo) || [];
        porTipo.set(b.tipo, [...previos, { id: `t${i}`, items: b.items }]);
    });
    porTipo.forEach((instancias, tipo) => {
        config[tipo] = instancias.length === 1 ? instancias[0].items : instancias;
    });
    bloques.forEach((b, i) => {
        const instancias = porTipo.get(b.tipo);
        orden.push(instancias.length === 1 ? b.tipo : `${b.tipo}:t${i}`);
    });
    if (config.cards) config.cardsColumns = 1;
    if (orden.length > 1) config.blockOrder = orden;
    return { config: Object.keys(config).length ? config : null, errores };
};

export const ESTILO_POR_DEFECTO = MUNICIPIO_STYLE;
