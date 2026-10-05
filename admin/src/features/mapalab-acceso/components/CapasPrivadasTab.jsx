import { Button, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { EditOutlined, LockOutlined } from '@ant-design/icons';
import { textoDeConteo } from '@features/mapalab-acceso/utils/arbolOpciones';

const { Text } = Typography;

const TIPOS = { tema: 'Tema', category: 'Carpeta', label: 'Sección', group: 'Grupo', leaf: 'Capa' };

export default function CapasPrivadasTab({ capas, cargando, onEditar, onMarcar }) {
    const columnas = [
        {
            title: 'Capa',
            key: 'capa',
            render: (_, c) => (
                <Space orientation="vertical" size={0}>
                    <Text strong><LockOutlined style={{ marginRight: 6, color: '#703089' }} />{c.label}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{c.id}</Text>
                </Space>
            ),
        },
        { title: 'Tipo', dataIndex: 'nodeType', key: 'tipo', width: 110, render: (t) => TIPOS[t] || t },
        {
            title: 'Quién la ve',
            key: 'quien',
            render: (_, c) => (c.usuarios + c.grupos === 0
                ? <Tooltip title="Está privada y sin nadie con acceso: no la ve nadie en el visor"><Tag color="red">Nadie</Tag></Tooltip>
                : (
                    <Space size={4} wrap>
                        {c.usuarios > 0 && <Tag>{textoDeConteo(c.usuarios, 'persona', 'personas')}</Tag>}
                        {c.grupos > 0 && <Tag color="purple">{textoDeConteo(c.grupos, 'grupo', 'grupos')}</Tag>}
                    </Space>
                )),
        },
        {
            title: '',
            key: 'acciones',
            width: 120,
            render: (_, c) => <Button size="small" shape="round" icon={<EditOutlined />} onClick={() => onEditar(c.id)}>Acceso</Button>,
        },
    ];

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Button type="primary" shape="round" icon={<LockOutlined />} onClick={onMarcar}>Marcar capa privada</Button>
            <Table
                rowKey="id"
                columns={columnas}
                dataSource={capas}
                loading={cargando}
                pagination={false}
                locale={{ emptyText: 'Todas las capas son públicas' }}
                scroll={{ x: true }}
            />
        </Space>
    );
}
