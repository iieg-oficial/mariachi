import { Layout, Space, Tabs, Typography } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router';
import useIsMobile from '@shared/hooks/useIsMobile';
import McpTopic from '@features/documentacion/topics/McpTopic';

const { Content } = Layout;
const { Title, Text } = Typography;


const TOPICS = [
    {
        key: 'mcp',
        label: 'Servidor MCP',
        children: <McpTopic />,
    },
];

const VALID_KEYS = new Set(TOPICS.map((t) => t.key));


export default function DocumentacionPage() {
    const { isMobile } = useIsMobile();
    const [searchParams, setSearchParams] = useSearchParams();

    const topicFromUrl = searchParams.get('topic');
    const activeKey = VALID_KEYS.has(topicFromUrl) ? topicFromUrl : TOPICS[0].key;

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
