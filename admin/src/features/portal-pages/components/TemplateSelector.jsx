import { Modal, Card, Row, Col, Empty, Typography } from 'antd';
import {
    FileOutlined,
    NotificationOutlined,
    SoundOutlined,
    FileTextOutlined,
    RocketOutlined
} from '@ant-design/icons';
import { PAGE_TEMPLATES, TEMPLATE_LIST } from '@features/portal-pages/constants/pageTemplates';

const { Title, Text } = Typography;

const ICON_MAP = {
    FileOutlined: FileOutlined,
    NotificationOutlined: NotificationOutlined,
    SoundOutlined: SoundOutlined,
    FileTextOutlined: FileTextOutlined,
    RocketOutlined: RocketOutlined
};

const TemplateSelector = ({ visible, onSelect, onCancel }) => {
    const handleTemplateSelect = (templateId) => {
        const template = PAGE_TEMPLATES[templateId];
        if (template) {
            onSelect(template.template);
        }
    };

    return (
        <Modal
            title={<Title level={4}>Selecciona una Plantilla</Title>}
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={900}
            style={{ top: 40 }}
        >
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                Elige una plantilla para comenzar a crear tu página. Puedes personalizarla después.
            </Text>

            {TEMPLATE_LIST.length === 0 ? (
                <Empty description="No hay plantillas disponibles" />
            ) : (
                <Row gutter={[16, 16]}>
                    {TEMPLATE_LIST.map((template) => {
                        const IconComponent = ICON_MAP[template.icon] || FileOutlined;

                        return (
                            <Col xs={24} sm={12} md={8} key={template.id}>
                                <Card
                                    hoverable
                                    onClick={() => handleTemplateSelect(template.id.toUpperCase())}
                                    style={{
                                        height: '100%',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s'
                                    }}
                                    styles={{
                                        body: {
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            textAlign: 'center',
                                            padding: 24
                                        }
                                    }}
                                >
                                    <IconComponent
                                        style={{
                                            fontSize: 48,
                                            color: '#1890ff',
                                            marginBottom: 16
                                        }}
                                    />
                                    <Title level={5} style={{ marginBottom: 8 }}>
                                        {template.name}
                                    </Title>
                                    <Text type="secondary" style={{ fontSize: 13 }}>
                                        {template.description}
                                    </Text>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            )}
        </Modal>
    );
};

export default TemplateSelector;
