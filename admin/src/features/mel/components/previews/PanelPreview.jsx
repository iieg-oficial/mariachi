import { Button, Table, Tag, Typography } from 'antd';
import { aclarar, esHex } from '@features/mel/helpers/contraste';

const { Text, Title } = Typography;

const FILAS = [
    { key: '1', capa: 'Delitos por municipio', ws: 'seguridad', estado: 'Publicada' },
    { key: '2', capa: 'Densidad de población', ws: 'demografia', estado: 'Aprobada' },
    { key: '3', capa: 'Incidencia vial', ws: 'movilidad', estado: 'Pendiente' },
];

const ETIQUETAS = ['GDL', 'Zap', 'Tlaq', 'Tona', 'Zapo', 'Tlaj'];
const ALTURAS = [92, 61, 78, 45, 100, 34];

export default function PanelPreview({ color }) {
    const acento = esHex(color) ? color : '#5C2472';

    const columnas = [
        { title: 'Capa', dataIndex: 'capa', key: 'capa' },
        { title: 'Workspace', dataIndex: 'ws', key: 'ws', width: 130 },
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            width: 120,
            render: (estado) => (
                estado === 'Publicada'
                    ? <Tag style={{ background: acento, color: '#fff', border: 'none' }}>{estado}</Tag>
                    : <Tag color={estado === 'Aprobada' ? 'success' : 'warning'}>{estado}</Tag>
            ),
        },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Title level={4} style={{ margin: 0, color: acento }}>Catálogo de capas</Title>
                <span style={{ flexGrow: 1 }} />
                <Button type='primary' style={{ background: acento }}>Nueva capa</Button>
                <Button>Cancelar</Button>
            </div>

            <Table
                size='small'
                columns={columnas}
                dataSource={FILAS}
                pagination={false}
            />

            <div style={{ display: 'flex', gap: 20, flexGrow: 1, minHeight: 0 }}>
                <div style={{ flexGrow: 1, border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <Text strong>Delitos por municipio</Text>
                    <Text type='secondary' style={{ fontSize: 13, marginBottom: 12 }}>Rampa derivada del color</Text>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexGrow: 1 }}>
                        {ALTURAS.map((alto, indice) => (
                            <div key={ETIQUETAS[indice]} style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, justifyContent: 'flex-end', height: '100%' }}>
                                <div style={{ width: '100%', borderRadius: '4px 4px 0 0', height: alto, background: aclarar(acento, (5 - indice) * 0.14) }} />
                                <Text type='secondary' style={{ fontSize: 11 }}>{ETIQUETAS[indice]}</Text>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ width: 260, border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, flexShrink: 0 }}>
                    <Text strong>Texto en este color</Text>
                    <div style={{ marginTop: 12, padding: 14, borderRadius: 8, border: '1px solid #f0f0f0', color: acento }}>
                        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Título de sección</div>
                        <div style={{ fontSize: 13 }}>Cuerpo de párrafo a 13 px, que es donde el contraste se nota.</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
