import { Button, Form, Input, Popconfirm, Space, Switch, Table, Tag, Tooltip, Typography } from 'antd';
import { DeleteOutlined, UserAddOutlined } from '@ant-design/icons';
import { formatearFecha } from '@features/mapalab-acceso/utils/fechas';

const { Text } = Typography;

export default function UsuariosTab({ usuarios, grupos, cargando, onCrear, onActivar, onEliminar }) {
    const [form] = Form.useForm();
    const nombreGrupo = Object.fromEntries(grupos.map((g) => [g.id, g.nombre]));

    const agregar = async (valores) => {
        const ok = await onCrear({ correo: valores.correo.trim(), nombre: valores.nombre?.trim() || null });
        if (ok) form.resetFields();
    };

    const columnas = [
        {
            title: 'Persona',
            key: 'persona',
            render: (_, u) => (
                <Space orientation="vertical" size={0}>
                    <Text strong>{u.nombre || u.correo}</Text>
                    {u.nombre && <Text type="secondary" style={{ fontSize: 12 }}>{u.correo}</Text>}
                </Space>
            ),
        },
        {
            title: 'Último acceso',
            key: 'acceso',
            render: (_, u) => (u.vinculado
                ? formatearFecha(u.ultimoAcceso)
                : <Tooltip title="Se dio de alta por correo y todavía no entra al visor"><Tag>Sin entrar aún</Tag></Tooltip>),
        },
        {
            title: 'Grupos',
            dataIndex: 'grupos',
            key: 'grupos',
            render: (ids) => <Space size={4} wrap>{ids.map((id) => <Tag key={id} color="purple">{nombreGrupo[id] || id}</Tag>)}</Space>,
        },
        {
            title: 'Activo',
            key: 'activo',
            width: 90,
            render: (_, u) => (
                <Tooltip title={u.activo ? 'Suspender: deja de ver las capas privadas al momento' : 'Reactivar'}>
                    <Switch size="small" checked={u.activo} onChange={(v) => onActivar(u.id, v)} />
                </Tooltip>
            ),
        },
        {
            title: '',
            key: 'borrar',
            width: 60,
            render: (_, u) => (
                <Popconfirm title="¿Quitar a esta persona?" description="Pierde sus grupos y accesos" okText="Quitar" cancelText="Cancelar" onConfirm={() => onEliminar(u.id)}>
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label={`Quitar a ${u.correo}`} />
                </Popconfirm>
            ),
        },
    ];

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Form form={form} layout="inline" onFinish={agregar}>
                <Form.Item name="correo" rules={[{ required: true, type: 'email', message: 'Escribe un correo válido' }]}>
                    <Input placeholder="correo@jalisco.gob.mx" style={{ width: 260 }} />
                </Form.Item>
                <Form.Item name="nombre">
                    <Input placeholder="Nombre (opcional)" style={{ width: 220 }} />
                </Form.Item>
                <Form.Item>
                    <Button type="primary" shape="round" htmlType="submit" icon={<UserAddOutlined />}>Agregar</Button>
                </Form.Item>
            </Form>
            <Table rowKey="id" columns={columnas} dataSource={usuarios} loading={cargando} pagination={{ pageSize: 20, hideOnSinglePage: true }} scroll={{ x: true }} locale={{ emptyText: 'Nadie ha entrado al visor todavía' }} />
        </Space>
    );
}
