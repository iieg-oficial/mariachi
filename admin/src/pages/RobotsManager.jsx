import { useState, useEffect } from 'react';
import {
    Card,
    Button,
    Space,
    Typography,
    Alert,
    Divider,
    message,
    Modal,
    Radio,
    Input,
    List,
    Tag,
    Row,
    Col,
    Tooltip
} from 'antd';
import {
    FileTextOutlined,
    DownloadOutlined,
    PlusOutlined,
    DeleteOutlined,
    EyeOutlined,
    InfoCircleOutlined,
    CheckCircleOutlined,
    WarningOutlined,
    SaveOutlined,
    ReloadOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const ROBOT_TEMPLATES = {
    allow_all: {
        name: 'Permitir Todo',
        description: 'Permite a todos los bots rastrear todo el sitio',
        content: `User-agent: *
Disallow:

Sitemap: https://iieg.gob.mx/sitemap.xml`
    },
    block_all: {
        name: 'Bloquear Todo',
        description: 'Bloquea todos los bots (útil durante desarrollo)',
        content: `User-agent: *
Disallow: /`
    },
    standard: {
        name: 'Estándar (Recomendado)',
        description: 'Configuración estándar para sitios gubernamentales',
        content: `User-agent: *
Disallow: /admin/
Disallow: /api/
Disallow: /private/
Disallow: /*.json$
Disallow: /*?*

Allow: /

Sitemap: https://iieg.gob.mx/sitemap.xml`
    },
    selective: {
        name: 'Selectivo',
        description: 'Permite el acceso general pero bloquea áreas sensibles',
        content: `User-agent: *
Disallow: /admin/
Disallow: /login
Disallow: /api/
Disallow: /private/
Disallow: /draft/
Disallow: /temp/

Allow: /
Allow: /public/

Crawl-delay: 5

Sitemap: https://iieg.gob.mx/sitemap.xml`
    }
};

export default function RobotsManager() {
    const [robotsContent, setRobotsContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [templateModalVisible, setTemplateModalVisible] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState('standard');
    const [hasChanges, setHasChanges] = useState(false);
    const [validation, setValidation] = useState({ valid: true, warnings: [], errors: [] });

    useEffect(() => {
        loadRobotsTxt();
    }, []);

    useEffect(() => {
        validateRobotsTxt(robotsContent);
    }, [robotsContent]);

    const loadRobotsTxt = () => {
        setLoading(true);
        setTimeout(() => {
            const content = ROBOT_TEMPLATES.standard.content;
            setRobotsContent(content);
            setHasChanges(false);
            setLoading(false);
        }, 500);
    };

    const validateRobotsTxt = (content) => {
        const warnings = [];
        const errors = [];

        if (!content || content.trim() === '') {
            errors.push('El archivo robots.txt está vacío');
        }

        if (!content.includes('User-agent:')) {
            errors.push('Falta la directiva User-agent');
        }

        if (!content.includes('Sitemap:')) {
            warnings.push('No se especificó la ubicación del sitemap');
        }

        if (content.includes('Disallow: /') && content.split('\n').filter(line => line.trim().startsWith('Disallow:')).length === 1) {
            warnings.push('Estás bloqueando todo el sitio. Verifica que esto sea intencional');
        }

        const lines = content.split('\n');
        lines.forEach((line, index) => {
            if (line.trim() && !line.startsWith('#') &&
                !line.includes(':') && line.trim() !== '') {
                warnings.push(`Línea ${index + 1}: Formato inválido - "${line}"`);
            }
        });

        setValidation({
            valid: errors.length === 0,
            warnings,
            errors
        });
    };

    const handleContentChange = (e) => {
        setRobotsContent(e.target.value);
        setHasChanges(true);
    };

    const applyTemplate = () => {
        const template = ROBOT_TEMPLATES[selectedTemplate];
        setRobotsContent(template.content);
        setHasChanges(true);
        setTemplateModalVisible(false);
        message.success(`Plantilla "${template.name}" aplicada`);
    };

    const saveRobotsTxt = () => {
        if (!validation.valid) {
            message.error('Corrige los errores antes de guardar');
            return;
        }

        setSaving(true);
        setTimeout(() => {
            setSaving(false);
            setHasChanges(false);
            message.success('robots.txt guardado correctamente');
        }, 1000);
    };

    const downloadRobotsTxt = () => {
        if (!robotsContent) {
            message.warning('No hay contenido para descargar');
            return;
        }

        const blob = new Blob([robotsContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'robots.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        message.success('robots.txt descargado correctamente');
    };

    const discardChanges = () => {
        Modal.confirm({
            title: '¿Descartar cambios?',
            content: 'Se perderán todos los cambios no guardados.',
            okText: 'Descartar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: loadRobotsTxt
        });
    };

    const commonDirectives = [
        {
            directive: 'User-agent: *',
            description: 'Aplica a todos los bots'
        },
        {
            directive: 'User-agent: Googlebot',
            description: 'Específico para Google'
        },
        {
            directive: 'User-agent: Bingbot',
            description: 'Específico para Bing'
        },
        {
            directive: 'Disallow: /admin/',
            description: 'Bloquea carpeta admin'
        },
        {
            directive: 'Disallow: /api/',
            description: 'Bloquea API endpoints'
        },
        {
            directive: 'Allow: /',
            description: 'Permite todo el sitio'
        },
        {
            directive: 'Crawl-delay: 10',
            description: 'Demora entre requests (segundos)'
        },
        {
            directive: 'Sitemap: https://iieg.gob.mx/sitemap.xml',
            description: 'Ubicación del sitemap'
        }
    ];

    const addDirective = (directive) => {
        const newContent = robotsContent + (robotsContent ? '\n' : '') + directive;
        setRobotsContent(newContent);
        setHasChanges(true);
        message.success('Directiva agregada');
    };

    return (
        <div>
            <Card>
                <Space orientation="vertical" style={{ width: '100%' }} size="large">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Title level={4} style={{ margin: 0 }}>
                            <FileTextOutlined /> Gestor de Robots.txt
                        </Title>
                        <Space>
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={() => setTemplateModalVisible(true)}
                            >
                                Usar Plantilla
                            </Button>
                            {hasChanges && (
                                <Button
                                    danger
                                    onClick={discardChanges}
                                >
                                    Descartar
                                </Button>
                            )}
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                onClick={saveRobotsTxt}
                                loading={saving}
                                disabled={!hasChanges || !validation.valid}
                            >
                                Guardar
                            </Button>
                            <Button
                                icon={<EyeOutlined />}
                                onClick={() => setPreviewVisible(true)}
                            >
                                Vista Previa
                            </Button>
                            <Button
                                icon={<DownloadOutlined />}
                                onClick={downloadRobotsTxt}
                            >
                                Descargar
                            </Button>
                        </Space>
                    </div>

                    <Alert
                        message="Robots.txt"
                        description="El archivo robots.txt indica a los motores de búsqueda qué páginas pueden o no rastrear en tu sitio."
                        type="info"
                        showIcon
                    />

                    {validation.errors.length > 0 && (
                        <Alert
                            message="Errores de Validación"
                            description={
                                <ul style={{ margin: 0, paddingLeft: 20 }}>
                                    {validation.errors.map((error, index) => (
                                        <li key={index}>{error}</li>
                                    ))}
                                </ul>
                            }
                            type="error"
                            showIcon
                        />
                    )}

                    {validation.warnings.length > 0 && (
                        <Alert
                            message="Advertencias"
                            description={
                                <ul style={{ margin: 0, paddingLeft: 20 }}>
                                    {validation.warnings.map((warning, index) => (
                                        <li key={index}>{warning}</li>
                                    ))}
                                </ul>
                            }
                            type="warning"
                            showIcon
                        />
                    )}

                    {validation.valid && validation.warnings.length === 0 && (
                        <Alert
                            message="Validación Exitosa"
                            description="El archivo robots.txt tiene un formato válido"
                            type="success"
                            showIcon
                            icon={<CheckCircleOutlined />}
                        />
                    )}

                    <Row gutter={16}>
                        <Col span={16}>
                            <Card
                                title="Contenido de robots.txt"
                                extra={
                                    hasChanges && (
                                        <Tag color="warning">Sin guardar</Tag>
                                    )
                                }
                            >
                                <TextArea
                                    value={robotsContent}
                                    onChange={handleContentChange}
                                    placeholder="# robots.txt&#10;User-agent: *&#10;Disallow: /admin/&#10;&#10;Sitemap: https://iieg.gob.mx/sitemap.xml"
                                    rows={20}
                                    style={{
                                        fontFamily: 'monospace',
                                        fontSize: 13
                                    }}
                                />
                                <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                                    <InfoCircleOutlined /> Las líneas que comienzan con # son comentarios
                                </Paragraph>
                            </Card>
                        </Col>

                        <Col span={8}>
                            <Card
                                title="Directivas Comunes"
                                size="small"
                            >
                                <List
                                    size="small"
                                    dataSource={commonDirectives}
                                    renderItem={item => (
                                        <List.Item
                                            actions={[
                                                <Tooltip title="Agregar" key="add">
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        icon={<PlusOutlined />}
                                                        onClick={() => addDirective(item.directive)}
                                                    />
                                                </Tooltip>
                                            ]}
                                        >
                                            <List.Item.Meta
                                                title={
                                                    <Text code style={{ fontSize: 12 }}>
                                                        {item.directive}
                                                    </Text>
                                                }
                                                description={
                                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                                        {item.description}
                                                    </Text>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                />
                            </Card>
                        </Col>
                    </Row>

                    <Alert
                        message="Importante"
                        description={
                            <Space orientation="vertical" size="small">
                                <Text>• El archivo robots.txt debe estar en la raíz del sitio: <Text code>https://iieg.gob.mx/robots.txt</Text></Text>
                                <Text>• Los cambios pueden tardar en reflejarse en los motores de búsqueda</Text>
                                <Text>• Valida tu robots.txt con <a href="https://www.google.com/webmasters/tools/robots-testing-tool" target="_blank" rel="noopener noreferrer">Google Robots Testing Tool</a></Text>
                                <Text>• Las directivas son case-sensitive</Text>
                            </Space>
                        }
                        type="info"
                        showIcon
                        icon={<InfoCircleOutlined />}
                    />
                </Space>
            </Card>

            <Modal
                title={
                    <Space>
                        <FileTextOutlined />
                        <Text strong>Seleccionar Plantilla</Text>
                    </Space>
                }
                open={templateModalVisible}
                onCancel={() => setTemplateModalVisible(false)}
                onOk={applyTemplate}
                okText="Aplicar Plantilla"
                cancelText="Cancelar"
                width={700}
            >
                <Alert
                    message="Advertencia"
                    description="Aplicar una plantilla reemplazará el contenido actual. Asegúrate de guardar tus cambios primero si los necesitas."
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                />

                <Radio.Group
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    style={{ width: '100%' }}
                >
                    <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                        {Object.entries(ROBOT_TEMPLATES).map(([key, template]) => (
                            <Card key={key} size="small">
                                <Radio value={key} style={{ width: '100%' }}>
                                    <Space orientation="vertical" size="small">
                                        <Text strong>{template.name}</Text>
                                        <Text type="secondary">{template.description}</Text>
                                        <Card
                                            size="small"
                                            style={{
                                                backgroundColor: '#f5f5f5',
                                                marginTop: 8
                                            }}
                                        >
                                            <pre style={{
                                                margin: 0,
                                                fontSize: 11,
                                                fontFamily: 'monospace',
                                                whiteSpace: 'pre-wrap'
                                            }}>
                                                {template.content}
                                            </pre>
                                        </Card>
                                    </Space>
                                </Radio>
                            </Card>
                        ))}
                    </Space>
                </Radio.Group>
            </Modal>

            <Modal
                title={
                    <Space>
                        <EyeOutlined />
                        <Text strong>Vista Previa de robots.txt</Text>
                    </Space>
                }
                open={previewVisible}
                onCancel={() => setPreviewVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setPreviewVisible(false)}>
                        Cerrar
                    </Button>,
                    <Button
                        key="download"
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={() => {
                            downloadRobotsTxt();
                            setPreviewVisible(false);
                        }}
                    >
                        Descargar
                    </Button>
                ]}
                width={700}
            >
                <Alert
                    message="Información"
                    description={
                        <Space orientation="vertical" size="small">
                            <Text>
                                Este archivo debe ser subido a: <Text code>https://iieg.gob.mx/robots.txt</Text>
                            </Text>
                            <Text>
                                Prueba tu robots.txt con{' '}
                                <a
                                    href="https://www.google.com/webmasters/tools/robots-testing-tool"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Google Robots Testing Tool
                                </a>
                            </Text>
                        </Space>
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />

                {validation.valid ? (
                    <Alert
                        message="Validación Exitosa"
                        type="success"
                        showIcon
                        icon={<CheckCircleOutlined />}
                        style={{ marginBottom: 16 }}
                    />
                ) : (
                    <Alert
                        message="Errores de Validación"
                        description={validation.errors.join(', ')}
                        type="error"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                )}

                <Card
                    size="small"
                    style={{
                        backgroundColor: '#f5f5f5',
                        maxHeight: 500,
                        overflow: 'auto'
                    }}
                >
                    <pre style={{
                        margin: 0,
                        fontSize: 13,
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                    }}>
                        {robotsContent || '# Contenido vacío'}
                    </pre>
                </Card>
            </Modal>
        </div>
    );
}
