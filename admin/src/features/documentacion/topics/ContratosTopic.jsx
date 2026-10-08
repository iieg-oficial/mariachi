import { Space, Tabs, Typography } from 'antd';
import OntoyTopic from '@features/documentacion/topics/contratos/OntoyTopic';
import BaseDatosTopic from '@features/documentacion/topics/contratos/BaseDatosTopic';

const { Title, Text } = Typography;


const TABS = [
    { key: 'ontoy', label: '/ontoy', children: <OntoyTopic /> },
    { key: 'base-de-datos', label: 'Base de datos', children: <BaseDatosTopic /> },
];


export default function ContratosTopic({ defaultActiveTab = 'ontoy' }) {
    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Title level={3} style={{ marginBottom: 4 }}>Contratos</Title>
                <Text type="secondary">
                    Lo que una pieza del ecosistema asume de otra. <Text code>/ontoy</Text> entre servicios, <strong>Base de datos</strong> entre datos.
                </Text>
            </div>

            <Tabs
                defaultActiveKey={defaultActiveTab}
                items={TABS}
                destroyInactiveTabPane
            />
        </Space>
    );
}
