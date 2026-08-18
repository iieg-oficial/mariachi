import { Avatar, Tag, Typography } from 'antd';

import { COLOR_VINCULO } from '@features/vine/constants';
import { medioInfo } from '@features/vine/constants/medios';

const { Text } = Typography;

const COLORES_AVATAR = ['#3B5BA9', '#0F7B6C', '#8B5CF6', '#D46B08', '#C41D7F', '#096DD9'];

export const iniciales = (nombre, pin) => {
    const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return String(pin).slice(0, 2);
    return (partes[0][0] + (partes[1]?.[0] ?? '')).toUpperCase();
};

export const colorAvatar = (pin) => COLORES_AVATAR[
    [...String(pin)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORES_AVATAR.length
];

const fecha = (v) => new Date(`${v}T12:00:00`).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: '2-digit',
});

const oVacio = (v) => v || <Text type="secondary">—</Text>;

export const COLUMNAS_PERSONAL = [
    {
        title: 'Persona',
        key: 'nombre',
        fixed: 'left',
        width: 280,
        sorter: (a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? ''),
        render: (_, f) => (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <Avatar
                    size={32}
                    src={f.foto_url || undefined}
                    style={{ backgroundColor: colorAvatar(f.pin), flexShrink: 0 }}
                >
                    {iniciales(f.nombre, f.pin)}
                </Avatar>
                <span>
                    <Text>{f.nombre?.trim() || `Sin nombre (${f.pin})`}</Text>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                        {f.departamento || `PIN ${f.pin}`}
                    </Text>
                </span>
            </span>
        ),
    },
    {
        title: 'Vínculo',
        dataIndex: 'vinculo',
        key: 'vinculo',
        width: 180,
        filtrable: true,
        onFilter: (v, f) => f.vinculo === v,
        render: (v) => (v ? <Tag color={COLOR_VINCULO[v] ?? 'default'}>{v}</Tag> : oVacio(null)),
    },
    {
        title: 'Puesto',
        dataIndex: 'puesto',
        key: 'puesto',
        width: 200,
        responsive: ['lg'],
        render: oVacio,
    },
    {
        title: 'Teléfono',
        dataIndex: 'telefono',
        key: 'telefono',
        width: 150,
        responsive: ['xl'],
        render: oVacio,
    },
    {
        title: 'Marca',
        dataIndex: 'medio',
        key: 'medio',
        width: 130,
        filtrable: true,
        onFilter: (v, f) => f.medio === v,
        render: (v) => (v ? <Tag color={medioInfo(v).color}>{medioInfo(v).etiqueta}</Tag> : oVacio(null)),
    },
    {
        title: 'Último registro',
        dataIndex: 'ultimo_dia',
        key: 'ultimo_dia',
        width: 140,
        sorter: (a, b) => (a.ultimo_dia ?? '').localeCompare(b.ultimo_dia ?? ''),
        defaultSortOrder: 'descend',
        render: (v) => (v ? <Text type="secondary">{fecha(v)}</Text> : <Tag>sin registro</Tag>),
    },
];
