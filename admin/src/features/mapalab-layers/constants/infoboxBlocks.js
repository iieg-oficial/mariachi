import { MUNICIPIO_STYLE } from './infoboxStyles';

export const BODY_TYPES = ['labelGroups', 'list', 'iconText', 'text', 'cards'];

export const BLOCK_DEFS = [
    {
        key: 'headerField',
        label: 'Encabezado',
        hint: 'Título grande del cuadro. Siempre se pinta arriba y no se puede duplicar.',
        defaultValue: '',
    },
    {
        key: 'labelGroups',
        label: 'Etiquetas',
        hint: 'Badges con colores (ej. municipio, característica).',
        defaultItems: () => [{ fields: [], ...MUNICIPIO_STYLE }],
    },
    {
        key: 'cards',
        label: 'Cards (estadísticas)',
        hint: 'Grid de valores numéricos con etiqueta. Arrastra el ícono ⋮⋮ para reordenar.',
        defaultItems: () => [{ field: '', label: '' }],
        extras: { cardsColumns: 1 },
    },
    {
        key: 'list',
        label: 'Lista',
        hint: 'Pares etiqueta/valor: formatea fechas y números, admite link. Arrastra el ícono ⋮⋮ para reordenar.',
        defaultItems: () => [{ field: '', label: '' }],
    },
    {
        key: 'iconText',
        label: 'Íconos con texto',
        hint: 'Ícono más el valor del campo. Web, ubicación y celular abren su link automático.',
        defaultItems: () => [{ icon: 'ubicacion', field: '' }],
    },
    {
        key: 'text',
        label: 'Texto (párrafos)',
        hint: 'Cada párrafo es texto fijo o el valor de un campo. Arrastra el ícono ⋮⋮ para reordenar.',
        defaultItems: () => [{ label: '' }],
    },
];

export const blockDef = (type) => BLOCK_DEFS.find((b) => b.key === type);

let idSeq = 0;
export const genBlockId = () => `b${Date.now().toString(36)}${(idSeq++).toString(36)}`;

const isInstanced = (arr) => !!arr[0]
    && typeof arr[0] === 'object'
    && typeof arr[0].id === 'string'
    && Array.isArray(arr[0].items);

export const blockInstances = (cfg, type) => {
    const raw = cfg?.[type];
    if (raw == null) return [];
    if (!Array.isArray(raw)) return [{ key: type, type, id: null, items: [raw] }];
    if (raw.length === 0) return [];
    if (isInstanced(raw)) {
        return raw.map((b) => ({ key: `${type}:${b.id}`, type, id: b.id, items: b.items || [] }));
    }
    return [{ key: type, type, id: null, items: raw }];
};

export const allInstances = (cfg) => BODY_TYPES.flatMap((type) => blockInstances(cfg, type));

export const typeOfKey = (key) => String(key).split(':')[0];

export const materialize = (cfg, type) => blockInstances(cfg, type)
    .map((i) => ({ id: i.id || genBlockId(), items: i.items, oldKey: i.key }));

export const storageFor = (list) => {
    if (!list.length) return undefined;
    if (list.length === 1) return list[0].items;
    return list.map((i) => ({ id: i.id, items: i.items }));
};

export const keysFor = (type, list) => {
    if (!list.length) return [];
    if (list.length === 1) return [type];
    return list.map((i) => `${type}:${i.id}`);
};

export const naturalOrder = (cfg) => allInstances(cfg).map((i) => i.key);

const arraysEqual = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

export const resolveBodyOrder = (config) => {
    const present = naturalOrder(config);
    const explicit = Array.isArray(config.blockOrder)
        ? config.blockOrder.filter((k) => present.includes(k))
        : [];
    return [...explicit, ...present.filter((k) => !explicit.includes(k))];
};

const applyType = (config, bodyOrder, type, previa, lista, { extras, insertAfter = null, newId = null } = {}) => {
    const vivos = lista.filter((i) => Array.isArray(i.items) && i.items.length > 0);
    const patch = { [type]: storageFor(vivos), ...(extras || {}) };
    if (type === 'cards' && !vivos.length) patch.cardsColumns = undefined;

    const llaves = keysFor(type, vivos);
    const porId = new Map(vivos.map((i, idx) => [i.id, llaves[idx]]));

    const orden = [];
    bodyOrder.forEach((k) => {
        const origen = previa.find((i) => i.oldKey === k);
        if (!origen) { orden.push(k); return; }
        const llave = porId.get(origen.id);
        if (llave) orden.push(llave);
        if (insertAfter && k === insertAfter && newId && porId.get(newId)) orden.push(porId.get(newId));
    });
    if (newId && !insertAfter && porId.get(newId)) orden.push(porId.get(newId));

    const natural = naturalOrder({ ...config, ...patch });
    const limpio = orden.filter((k) => natural.includes(k));
    const completo = [...limpio, ...natural.filter((k) => !limpio.includes(k))];
    patch.blockOrder = arraysEqual(completo, natural) ? undefined : completo;

    return { patch, focusKey: newId ? porId.get(newId) || null : null };
};

export const planAddBlock = (config, bodyOrder, type) => {
    const def = blockDef(type);
    if (!def || !def.defaultItems) return null;
    const previa = materialize(config, type);
    const id = genBlockId();
    const lista = [...previa, { id, items: def.defaultItems(), oldKey: null }];
    return applyType(config, bodyOrder, type, previa, lista, { extras: def.extras, newId: id });
};

export const planDuplicateBlock = (config, bodyOrder, key) => {
    const type = typeOfKey(key);
    const previa = materialize(config, type);
    const idx = previa.findIndex((i) => i.oldKey === key);
    if (idx === -1) return null;
    const id = genBlockId();
    const copia = { id, items: JSON.parse(JSON.stringify(previa[idx].items)), oldKey: null };
    const lista = [...previa.slice(0, idx + 1), copia, ...previa.slice(idx + 1)];
    return applyType(config, bodyOrder, type, previa, lista, { insertAfter: key, newId: id });
};

export const planRemoveBlock = (config, bodyOrder, key) => {
    const type = typeOfKey(key);
    const previa = materialize(config, type);
    const lista = previa.filter((i) => i.oldKey !== key);
    return applyType(config, bodyOrder, type, previa, lista);
};

export const planSetBlockItems = (config, bodyOrder, key, items) => {
    const type = typeOfKey(key);
    const previa = materialize(config, type);
    const lista = previa.map((i) => (i.oldKey === key ? { ...i, items } : i));
    return applyType(config, bodyOrder, type, previa, lista);
};
