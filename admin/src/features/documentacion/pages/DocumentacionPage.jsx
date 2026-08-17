import { Layout, Space, Tabs, Typography } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router';
import useIsMobile from '@shared/hooks/useIsMobile';
import McpTopic from '@features/documentacion/topics/McpTopic';
import TelemetryTopic from '@features/documentacion/topics/TelemetryTopic';
import AcervoTopic from '@features/documentacion/topics/AcervoTopic';
import OntoyTopic from '@features/documentacion/topics/OntoyTopic';
import ColibriTopic from '@features/documentacion/topics/ColibriTopic';
import MapalabTopic from '@features/documentacion/topics/MapalabTopic';
import QgisTopic from '@features/documentacion/topics/QgisTopic';

const { Content } = Layout;
const { Title, Text } = Typography;


const VALID_KEYS = new Set(['acervo', 'colibri', 'mapalab', 'qgis', 'mcp', 'telemetria', 'ontoy']);


export default function DocumentacionPage() {
    const { isMobile } = useIsMobile();
    const [searchParams, setSearchParams] = useSearchParams();

    const topicFromUrl = searchParams.get('topic');
    const activeKey = VALID_KEYS.has(topicFromUrl) ? topicFromUrl : 'acervo';
    const sec = searchParams.get('sec') === 'thumbs' ? 'thumbs' : 'uso';

    const TOPICS = [
        { key: 'acervo', label: 'Acervo', children: <AcervoTopic defaultActiveTab={sec} /> },
        { key: 'colibri', label: 'Colibri', children: <ColibriTopic /> },
        { key: 'mapalab', label: 'MapaLab', children: <MapalabTopic /> },
        { key: 'qgis', label: 'Plugin QGIS', children: <QgisTopic /> },
        { key: 'mcp', label: 'Servidor MCP', children: <McpTopic /> },
        { key: 'telemetria', label: 'Telemetría', children: <TelemetryTopic /> },
        { key: 'ontoy', label: 'Contrato /ontoy', children: <OntoyTopic /> },
    ];

    const handleChange = (key) => {
        setSearchParams({ topic: key }, { replace: true });
    };

    return (
        <Content style={{ padding: isMobile ? 6 : 24, width: '100%' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                    <Space align="center" size={12}>
                        <BookOutlined style={{ fontSize: 24, color: '#5C2472' }} />
                        <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>Documentación</Title>
                    </Space>
                    <Text type="secondary">
                        Referencias y guías de las piezas internas del ecosistema IIEG.
                    </Text>
                </div>

                <Tabs
                    tabPosition={isMobile ? 'top' : 'left'}
                    activeKey={activeKey}
                    onChange={handleChange}
                    items={TOPICS}
                    destroyInactiveTabPane
                    style={{ minHeight: '70vh' }}
                />
            </Space>
        </Content>
    );
}
