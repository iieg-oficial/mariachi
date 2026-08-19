import {
    CalendarOutlined,
    ClockCircleOutlined,
    DatabaseOutlined,
    IdcardOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Space, Tag, Tooltip, Typography } from 'antd';

import { COLOR_VINCULO } from '@features/vine/constants';
import { etiquetaValor } from '@features/vine/constants/filtros';
import { medioInfo } from '@features/vine/constants/medios';

const colorDe = (campo, valor) => {
    if (campo === 'vinculo') return COLOR_VINCULO[valor] ?? 'default';
    if (campo === 'medio') return medioInfo(valor).color;
    return 'default';
};

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

export const ACCIONES = [
    { tab: 'ficha', titulo: 'Ficha', icono: <IdcardOutlined /> },
    { tab: 'incidencias', titulo: 'Vacaciones y permisos', icono: <CalendarOutlined /> },
    { tab: 'asistencia', titulo: 'Asistencia', icono: <ClockCircleOutlined /> },
    { tab: 'biometrico', titulo: 'Lo que trae ZKTeco', icono: <DatabaseOutlined /> },
];

export const columnasPersonal = (onAbrir, dimension) => [
    {
        title: 'Persona',
        key: 'nombre',
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
                <span style={{ minWidth: 0 }}>
                    <Text>{f.nombre?.trim() || `Sin nombre (${f.pin})`}</Text>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                        {f.departamento || `PIN ${f.pin}`}
                    </Text>
                </span>
            </span>
        ),
    },
    {
        title: dimension.etiqueta,
        dataIndex: dimension.campo,
        key: dimension.campo,
        width: 180,
        responsive: ['md'],
        sorter: (a, b) => (a[dimension.campo] ?? '').localeCompare(b[dimension.campo] ?? ''),
        render: (v, f) => (
            <Space size={4} wrap>
                {v
                    ? <Tag color={colorDe(dimension.campo, v)}>{etiquetaValor(dimension.campo, v)}</Tag>
                    : <Text type="secondary">—</Text>}
                {f.baja && v !== 'Baja' && <Tag color="red">baja</Tag>}
            </Space>
        ),
    },
    {
        title: 'Extensión',
        dataIndex: 'extension',
        key: 'extension',
        width: 130,
        responsive: ['lg'],
        sorter: (a, b) => (a.extension ?? '').localeCompare(b.extension ?? ''),
        render: (v) => (v
            ? <Text>{v}</Text>
            : <Text type="secondary">—</Text>),
    },
    {
        title: 'Acciones',
        key: 'acciones',
        width: 170,
        align: 'right',
        render: (_, f) => (
            <Space size={2}>
                {ACCIONES.map(({ tab, titulo, icono }) => (
                    <Tooltip key={tab} title={titulo}>
                        <Button
                            type="text"
                            size="small"
                            icon={icono}
                            aria-label={`${titulo} de ${f.nombre?.trim() || f.pin}`}
                            onClick={(e) => { e.stopPropagation(); onAbrir(f.pin, tab); }}
                        />
                    </Tooltip>
                ))}
            </Space>
        ),
    },
];
