import { Tooltip } from 'antd';

const MAX = 80;

const SOURCES = { grid: 'tabla', formulario: 'ficha', ingesta: 'ingesta', backfill: 'carga inicial' };

const shown = (value) => {
    if (value === null || value === undefined || value === '') return '(vacío)';
    if (typeof value === 'boolean') return value ? 'sí' : 'no';
    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return text.length > MAX ? `${text.slice(0, MAX)}…` : text;
};

const when = (value) => (value
    ? new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
    : 'fecha sin registrar');

export const describeCell = ({ isDirty, baseValue, lastChange }) => {
    if (isDirty) return `Sin guardar · antes: ${shown(baseValue)}`;
    if (!lastChange) return null;
    const source = SOURCES[lastChange.source] ? ` · desde ${SOURCES[lastChange.source]}` : '';
    return `${lastChange.changed_by || 'Sin registrar'} · ${when(lastChange.changed_at)}${source} · antes: ${shown(lastChange.from_value)}`;
};

const WRAP = { display: 'flex', alignItems: 'center', flex: 1, alignSelf: 'stretch', minWidth: 0 };

const wrappers = new WeakMap();

const wrapperFor = (Base) => {
    if (wrappers.has(Base)) return wrappers.get(Base);
    const CellWithInfo = ({ columnData, ...props }) => {
        const info = columnData.infoOf(props.rowData);
        return (
            <Tooltip title={info} mouseEnterDelay={0.35} placement="topLeft">
                <div style={WRAP}><Base {...props} columnData={columnData.inner} /></div>
            </Tooltip>
        );
    };
    wrappers.set(Base, CellWithInfo);
    return CellWithInfo;
};

export const withCellInfo = (column, infoOf) => ({
    ...column,
    component: wrapperFor(column.component),
    columnData: { inner: column.columnData, infoOf },
});
