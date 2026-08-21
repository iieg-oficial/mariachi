import { Avatar, Descriptions, Space, Tooltip, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const fmt = (v) => (v ? new Date(v).toLocaleString() : '—');

const iniciales = (nombre) => String(nombre || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase();

function Autor({ autor }) {
    if (!autor?.fecha) return null;
    const titulo = autor.nombre
        ? `${autor.nombre} · ${fmt(autor.fecha)}`
        : `Modificado el ${fmt(autor.fecha)}`;
    return (
        <Tooltip title={titulo}>
            {autor.nombre ? (
                <Avatar size={20} style={{ backgroundColor: '#5C2472', fontSize: 10 }}>
                    {iniciales(autor.nombre)}
                </Avatar>
            ) : (
                <Avatar size={20} icon={<UserOutlined />} style={{ backgroundColor: '#d9d9d9' }} />
            )}
        </Tooltip>
    );
}

const celda = (e) => (
    <Space size={6} align="center">
        <span>{e.value}</span>
        <Autor autor={e.autor} />
    </Space>
);

export function SeccionContenido({ sec }) {
    if (sec.repeater) {
        if (sec.items.length === 0) {
            return <Typography.Text type="secondary">Sin elementos</Typography.Text>;
        }
        return sec.items.map((item, idx) => (
            <Descriptions
                key={item.key}
                size="small"
                bordered
                column={1}
                title={`#${idx + 1}`}
                style={{ marginBottom: 12 }}
                items={item.entries.map((e) => ({ key: e.key, label: e.label, children: celda(e) }))}
            />
        ));
    }
    return (
        <Descriptions
            size="small"
            bordered
            column={1}
            items={sec.entries.map((e) => ({ key: e.key, label: e.label, children: celda(e) }))}
        />
    );
}
