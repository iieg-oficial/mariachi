import { Space, Tag, Typography } from 'antd';

const { Text } = Typography;

export const hora = (ts) => new Date(ts).toLocaleTimeString();

export const duracion = (s) => {
    if (s < 60) return `${s} s`;
    if (s < 3600) return `${Math.round(s / 60)} min`;
    return `${(s / 3600).toFixed(1)} h`;
};

export const tope = (limite, ventanaS) => (limite ? `${limite} / ${ventanaS} s` : '—');

export const TIPOS = {
    usuario: { color: 'purple', texto: 'Usuario' },
    ip: { color: 'orange', texto: 'IP' },
    sesion: { color: 'blue', texto: 'Sesión cerrada' },
};

export const claveGrupo = (r) => `${r.tipo}|${r.scope}|${r.actor}|${r.metodo}|${r.ruta}`;

export const COLUMNAS_GRUPOS = [
    {
        title: 'Quién',
        dataIndex: 'actor',
        key: 'actor',
        filters: Object.entries(TIPOS).map(([value, t]) => ({ text: t.texto, value })),
        onFilter: (value, row) => row.tipo === value,
        render: (actor, row) => (
            <Space size={6}>
                <Tag color={TIPOS[row.tipo]?.color}>{TIPOS[row.tipo]?.texto || row.tipo}</Tag>
                <Text strong>{actor}</Text>
            </Space>
        ),
    },
    {
        title: 'Petición',
        key: 'ruta',
        render: (_, row) => (
            <Space size={6}>
                <Tag>{row.metodo}</Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>{row.ruta || '—'}</Text>
            </Space>
        ),
    },
    {
        title: 'Scope',
        dataIndex: 'scope',
        key: 'scope',
        width: 160,
        render: (v) => <Text code>{v}</Text>,
    },
    {
        title: 'Tope',
        key: 'tope',
        width: 100,
        render: (_, row) => tope(row.limite, row.ventana_s),
    },
    {
        title: 'Veces',
        dataIndex: 'golpes',
        key: 'golpes',
        width: 70,
        sorter: (a, b) => a.golpes - b.golpes,
        defaultSortOrder: 'descend',
    },
    {
        title: 'Duración',
        key: 'duracion',
        width: 150,
        render: (_, row) => (
            <Text type="secondary" style={{ fontSize: 12 }}>
                {duracion(row.duracion_s)} · desde {hora(row.primero)}
            </Text>
        ),
    },
];

export const COLUMNAS_TOPES = [
    { title: 'Tipo', dataIndex: 'tipo', key: 'tipo', width: 90 },
    { title: 'Scope', dataIndex: 'scope', key: 'scope', render: (v) => <Text code>{v}</Text> },
    {
        title: 'Tope',
        key: 'tope',
        width: 110,
        sorter: (a, b) => a.limite / a.ventana_s - b.limite / b.ventana_s,
        render: (_, row) => tope(row.limite, row.ventana_s),
    },
];
