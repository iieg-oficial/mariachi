import { CARACTERISTICA_STYLE, MUNICIPIO_STYLE } from './infoboxStyles';

const TITULO = ['nombre', 'name', 'titulo', 'denominacion', 'razon_social'];
const MUNICIPIO = ['municipio', 'nom_mun', 'mpio', 'nombre_municipio'];
const TIPO = ['tipo', 'categoria', 'clasificacion', 'subtipo', 'nivel'];
const CALLE = ['calle', 'vialidad', 'via'];
const NUMERO = ['numero_ext', 'num_ext', 'numero', 'num'];
const COLONIA = ['colonia', 'asentamiento', 'fraccionamiento'];
const CP = ['cp', 'codigo_postal', 'c_postal'];
const DIRECCION = ['direccion', 'domicilio', 'ubicacion', 'address'];
const TELEFONO = ['telefono', 'tel', 'contacto'];
const WEB = ['sitio_web', 'web', 'url', 'pagina'];

const TIPOS_NUMERICOS = new Set([
    'integer', 'number',
    'int', 'long', 'short', 'double', 'float', 'decimal',
]);

const esNumerico = (tipo) => {
    const limpio = String(tipo || '').toLowerCase().split(':').pop();
    return TIPOS_NUMERICOS.has(limpio);
};

const nombresDe = (fields) => (fields || []).map((f) => f?.name).filter(Boolean);

export const pickField = (fields, candidatos) => {
    const nombres = nombresDe(fields);
    for (const c of candidatos) {
        const exacto = nombres.find((n) => n.toLowerCase() === c);
        if (exacto) return exacto;
    }
    for (const c of candidatos) {
        const parcial = nombres.find((n) => n.toLowerCase().includes(c));
        if (parcial) return parcial;
    }
    return null;
};

const camposNumericos = (fields, tope) => (fields || [])
    .filter((f) => f?.name && esNumerico(f.type))
    .slice(0, tope)
    .map((f) => f.name);

const humanize = (field) => {
    const limpio = String(field || '').replace(/[_-]+/g, ' ').trim();
    return limpio ? limpio.charAt(0).toUpperCase() + limpio.slice(1) : '';
};

export const buildDireccion = (fields) => {
    const calle = pickField(fields, CALLE);
    const numero = pickField(fields, NUMERO);
    const colonia = pickField(fields, COLONIA);
    const cp = pickField(fields, CP);
    const partes = [
        calle && { field: calle },
        numero && { field: numero, prefix: '#' },
        colonia && { field: colonia, prefix: 'Col. ' },
        cp && { field: cp, prefix: 'C.P. ' },
    ].filter(Boolean);
    if (partes.length > 1) return { compose: partes, sep: ', ' };
    const unico = pickField(fields, DIRECCION) || calle;
    return unico ? { field: unico } : null;
};

const grupo = (campo, estilo) => (campo ? [{ fields: [campo], ...estilo }] : []);

const iconos = (fields) => {
    const direccion = buildDireccion(fields);
    const telefono = pickField(fields, TELEFONO);
    const web = pickField(fields, WEB);
    return [
        direccion && { icon: 'ubicacion', ...direccion },
        telefono && { icon: 'celular', field: telefono },
        web && { icon: 'web', field: web },
    ].filter(Boolean);
};

const conTitulo = (fields, construir) => {
    const titulo = pickField(fields, TITULO);
    if (!titulo) return null;
    return construir(titulo);
};

export const INFOBOX_TEMPLATES = [
    {
        key: 'punto_simple',
        nombre: 'Punto simple',
        resumen: 'Título y una etiqueta con el tipo.',
        build: (fields) => conTitulo(fields, (titulo) => ({
            headerField: titulo,
            labelGroups: grupo(pickField(fields, TIPO), CARACTERISTICA_STYLE),
        })),
    },
    {
        key: 'punto_municipio',
        nombre: 'Punto con municipio',
        resumen: 'Título, etiqueta de municipio y etiqueta de tipo.',
        build: (fields) => conTitulo(fields, (titulo) => ({
            headerField: titulo,
            labelGroups: [
                ...grupo(pickField(fields, MUNICIPIO), MUNICIPIO_STYLE),
                ...grupo(pickField(fields, TIPO), CARACTERISTICA_STYLE),
            ],
        })),
    },
    {
        key: 'punto_contacto',
        nombre: 'Punto con contacto',
        resumen: 'Lo anterior más dirección, teléfono y sitio web. La dirección se arma de calle, número y colonia si vienen en columnas aparte.',
        build: (fields) => conTitulo(fields, (titulo) => {
            const iconText = iconos(fields);
            if (!iconText.length) return null;
            return {
                headerField: titulo,
                labelGroups: [
                    ...grupo(pickField(fields, MUNICIPIO), MUNICIPIO_STYLE),
                    ...grupo(pickField(fields, TIPO), CARACTERISTICA_STYLE),
                ],
                iconText,
            };
        }),
    },
    {
        key: 'poligono_cifras',
        nombre: 'Polígono con cifras',
        resumen: 'Título, etiqueta de municipio y hasta tres cifras numéricas en cajas.',
        build: (fields) => conTitulo(fields, (titulo) => {
            const numericos = camposNumericos(fields, 3);
            if (!numericos.length) return null;
            return {
                headerField: titulo,
                labelGroups: grupo(pickField(fields, MUNICIPIO), MUNICIPIO_STYLE),
                cards: numericos.map((field) => ({ field, label: humanize(field) })),
                cardsColumns: 1,
            };
        }),
    },
];
