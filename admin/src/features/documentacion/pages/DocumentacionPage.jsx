import { Layout, Space, Tabs, Typography } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router';
import useIsMobile from '@shared/hooks/useIsMobile';
import McpTopic from '@features/documentacion/topics/McpTopic';
import TelemetryTopic from '@features/documentacion/topics/TelemetryTopic';
import AcervoTopic from '@features/documentacion/topics/AcervoTopic';
import ContratosTopic from '@features/documentacion/topics/ContratosTopic';
import ColibriTopic from '@features/documentacion/topics/ColibriTopic';
import MapalabTopic from '@features/documentacion/topics/MapalabTopic';
import QgisTopic from '@features/documentacion/topics/QgisTopic';

const { Content } = Layout;
const { Title, Text } = Typography;


const VALID_KEYS = new Set(['acervo', 'colibri', 'mapalab', 'qgis', 'mcp', 'telemetria', 'contratos']);

const LEGACY_KEYS = { ontoy: 'contratos' };

const CONTRATOS_TABS = new Set(['ontoy', 'base-de-datos']);


export default function DocumentacionPage() {
    const { isMobile } = useIsMobile();
    const [searchParams, setSearchParams] = useSearchParams();

    const topicFromUrl = searchParams.get('topic');
    const resolvedTopic = LEGACY_KEYS[topicFromUrl] || topicFromUrl;
    const activeKey = VALID_KEYS.has(resolvedTopic) ? resolvedTopic : 'acervo';
    const secParam = searchParams.get('sec');
    const sec = secParam === 'thumbs' ? 'thumbs' : 'uso';
    const secContratos = CONTRATOS_TABS.has(secParam) ? secParam : 'ontoy';

    const TOPICS = [
        { key: 'acervo', label: 'Acervo', children: <AcervoTopic defaultActiveTab={sec} /> },
        { key: 'colibri', label: 'Colibri', children: <ColibriTopic /> },
        { key: 'mapalab', label: 'MapaLab', children: <MapalabTopic /> },
        { key: 'qgis', label: 'Plugin QGIS', children: <QgisTopic /> },
        { key: 'mcp', label: 'Servidor MCP', children: <McpTopic /> },
        { key: 'telemetria', label: 'Telemetría', children: <TelemetryTopic /> },
        { key: 'contratos', label: 'Contratos', children: <ContratosTopic defaultActiveTab={secContratos} /> },
    ];

    const handleChange = (key) => {
        setSearchParams({ topic: key }, { replace: true });
    };

    return (
        <Content style={{ padding: isMobile ? 6 : 24, width: '100%' }}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
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
                    tabPlacement={isMobile ? 'top' : 'start'}
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
