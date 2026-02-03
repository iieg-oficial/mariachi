import { useState, useEffect } from 'react';
import {
    Card,
    Table,
    Button,
    Space,
    Typography,
    Tag,
    Alert,
    Select,
    InputNumber,
    Switch,
    Divider,
    message,
    Modal,
    Tooltip,
    Statistic,
    Row,
    Col
} from 'antd';
import {
    GlobalOutlined,
    DownloadOutlined,
    ReloadOutlined,
    EyeOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    InfoCircleOutlined,
    FileTextOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function SitemapManager() {
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [sitemapXML, setSitemapXML] = useState('');
    const [lastGenerated, setLastGenerated] = useState(null);

    const mockPages = [
        {
            id: '1',
            url: '/',
            title: 'Página Principal',
            lastModified: new Date('2024-01-15'),
            includeInSitemap: true,
            priority: 1.0,
            changefreq: 'weekly',
            status: 'published'
        },
        {
            id: '2',
            url: '/nosotros',
            title: 'Acerca de Nosotros',
            lastModified: new Date('2024-01-20'),
            includeInSitemap: true,
            priority: 0.8,
            changefreq: 'monthly',
            status: 'published'
        },
        {
            id: '3',
            url: '/servicios',
            title: 'Servicios',
            lastModified: new Date('2024-01-25'),
            includeInSitemap: true,
            priority: 0.8,
            changefreq: 'weekly',
            status: 'published'
        },
        {
            id: '4',
            url: '/contacto',
            title: 'Contacto',
            lastModified: new Date('2024-01-22'),
            includeInSitemap: true,
            priority: 0.6,
            changefreq: 'monthly',
            status: 'published'
        },
        {
            id: '5',
            url: '/blog/novedades-2024',
            title: 'Blog: Novedades 2024',
            lastModified: new Date('2024-01-18'),
            includeInSitemap: true,
            priority: 0.7,
            changefreq: 'weekly',
            status: 'published'
        },
        {
            id: '6',
            url: '/draft-page',
            title: 'Página en Borrador',
            lastModified: new Date('2024-01-10'),
            includeInSitemap: false,
            priority: 0.5,
            changefreq: 'monthly',
            status: 'draft'
        }
    ];

    useEffect(() => {
        loadPages();
    }, []);

    const loadPages = () => {
        setLoading(true);
        setTimeout(() => {
            setPages(mockPages);
            setLoading(false);
        }, 500);
    };

    const updatePage = (id, field, value) => {
        setPages(prev => prev.map(page =>
            page.id === id ? { ...page, [field]: value } : page
        ));
    };

    const generateSitemap = () => {
        setGenerating(true);

        setTimeout(() => {
            const includedPages = pages.filter(p => p.includeInSitemap && p.status === 'published');

            const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${includedPages.map(page => `    <url>
        <loc>https://iieg.gob.mx${page.url}</loc>
        <lastmod>${page.lastModified.toISOString().split('T')[0]}</lastmod>
        <changefreq>${page.changefreq}</changefreq>
        <priority>${page.priority}</priority>
    </url>`).join('\n')}
</urlset>`;

            setSitemapXML(xml);
            setLastGenerated(new Date());
            setGenerating(false);
            message.success('Sitemap generado correctamente');
        }, 1000);
    };

    const downloadSitemap = () => {
        if (!sitemapXML) {
            message.warning('Primero genera el sitemap');
            return;
        }

        const blob = new Blob([sitemapXML], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'sitemap.xml';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        message.success('Sitemap descargado correctamente');
    };

    const toggleAllInclusion = (include) => {
        setPages(prev => prev.map(page => ({
            ...page,
            includeInSitemap: page.status === 'published' ? include : false
        })));
    };

    const columns = [
        {
            title: 'URL',
            dataIndex: 'url',
            key: 'url',
            width: '25%',
            render: (url, record) => (
                <Space orientation="vertical" size="small">
                    <Text strong>{url}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {record.title}
                    </Text>
                </Space>
            )
        },
        {
            title: 'Estado',
            dataIndex: 'status',
            key: 'status',
            width: '10%',
            render: (status) => (
                <Tag color={status === 'published' ? 'success' : 'default'}>
                    {status === 'published' ? 'Publicado' : 'Borrador'}
                </Tag>
            ),
            filters: [
                { text: 'Publicado', value: 'published' },
                { text: 'Borrador', value: 'draft' }
            ],
            onFilter: (value, record) => record.status === value
        },
        {
            title: 'Incluir',
            dataIndex: 'includeInSitemap',
            key: 'includeInSitemap',
            width: '10%',
            render: (include, record) => (
                <Switch
                    checked={include}
                    disabled={record.status !== 'published'}
                    onChange={(checked) => updatePage(record.id, 'includeInSitemap', checked)}
                    checkedChildren={<CheckCircleOutlined />}
                    unCheckedChildren={<CloseCircleOutlined />}
                />
            )
        },
        {
            title: 'Prioridad',
            dataIndex: 'priority',
            key: 'priority',
            width: '15%',
            render: (priority, record) => (
                <Space>
                    <InputNumber
                        min={0}
                        max={1}
                        step={0.1}
                        value={priority}
                        disabled={!record.includeInSitemap}
                        onChange={(value) => updatePage(record.id, 'priority', value)}
                        style={{ width: 80 }}
                    />
                    <Tooltip title="0.0 = Baja importancia, 1.0 = Máxima importancia">
                        <InfoCircleOutlined style={{ color: '#1890ff' }} />
                    </Tooltip>
                </Space>
            )
        },
        {
            title: 'Frecuencia de Cambio',
            dataIndex: 'changefreq',
            key: 'changefreq',
            width: '15%',
            render: (changefreq, record) => (
                <Select
                    value={changefreq}
                    disabled={!record.includeInSitemap}
                    onChange={(value) => updatePage(record.id, 'changefreq', value)}
                    style={{ width: '100%' }}
                >
                    <Select.Option value="always">Siempre</Select.Option>
                    <Select.Option value="hourly">Cada hora</Select.Option>
                    <Select.Option value="daily">Diaria</Select.Option>
                    <Select.Option value="weekly">Semanal</Select.Option>
                    <Select.Option value="monthly">Mensual</Select.Option>
                    <Select.Option value="yearly">Anual</Select.Option>
                    <Select.Option value="never">Nunca</Select.Option>
                </Select>
            )
        },
        {
            title: 'Última Modificación',
            dataIndex: 'lastModified',
            key: 'lastModified',
            width: '15%',
            render: (date) => (
                <Text>{date.toLocaleDateString('es-ES')}</Text>
            ),
            sorter: (a, b) => a.lastModified - b.lastModified
        }
    ];

    const includedCount = pages.filter(p => p.includeInSitemap).length;
    const publishedCount = pages.filter(p => p.status === 'published').length;

    return (
        <div>
            <Card>
                <Space orientation="vertical" style={{ width: '100%' }} size="large">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Title level={4} style={{ margin: 0 }}>
                            <GlobalOutlined /> Gestor de Sitemap XML
                        </Title>
                        <Space>
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={loadPages}
                                loading={loading}
                            >
                                Recargar
                            </Button>
                            <Button
                                type="primary"
                                icon={<FileTextOutlined />}
                                onClick={generateSitemap}
                                loading={generating}
                            >
                                Generar Sitemap
                            </Button>
                            <Button
                                icon={<EyeOutlined />}
                                onClick={() => setPreviewVisible(true)}
                                disabled={!sitemapXML}
                            >
                                Vista Previa
                            </Button>
                            <Button
                                type="primary"
                                icon={<DownloadOutlined />}
                                onClick={downloadSitemap}
                                disabled={!sitemapXML}
                            >
                                Descargar XML
                            </Button>
                        </Space>
                    </div>

                    <Alert
                        message="Sitemap XML"
                        description="El sitemap ayuda a los motores de búsqueda a descubrir e indexar las páginas de tu sitio. Solo se incluyen páginas publicadas."
                        type="info"
                        showIcon
                    />

                    <Row gutter={16}>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Total de Páginas"
                                    value={pages.length}
                                    prefix={<FileTextOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Páginas Publicadas"
                                    value={publishedCount}
                                    valueStyle={{ color: '#52c41a' }}
                                    prefix={<CheckCircleOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Incluidas en Sitemap"
                                    value={includedCount}
                                    valueStyle={{ color: '#1890ff' }}
                                    prefix={<GlobalOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card>
                                <Statistic
                                    title="Última Generación"
                                    value={lastGenerated ? lastGenerated.toLocaleString('es-ES', {
                                        dateStyle: 'short',
                                        timeStyle: 'short'
                                    }) : 'Nunca'}
                                    valueStyle={{ fontSize: 16 }}
                                />
                            </Card>
                        </Col>
                    </Row>

                    <Card size="small">
                        <Space>
                            <Text strong>Acciones rápidas:</Text>
                            <Button
                                size="small"
                                onClick={() => toggleAllInclusion(true)}
                            >
                                Incluir todas las publicadas
                            </Button>
                            <Button
                                size="small"
                                onClick={() => toggleAllInclusion(false)}
                            >
                                Excluir todas
                            </Button>
                        </Space>
                    </Card>

                    <Divider />

                    <Table
                        columns={columns}
                        dataSource={pages}
                        rowKey="id"
                        loading={loading}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total) => `Total: ${total} páginas`
                        }}
                    />

                    <Alert
                        message="Recomendaciones"
                        description={
                            <ul style={{ margin: 0, paddingLeft: 20 }}>
                                <li>Usa prioridad 1.0 para tu página principal</li>
                                <li>Usa 0.8-0.9 para páginas importantes (servicios, productos)</li>
                                <li>Usa 0.5-0.7 para páginas secundarias</li>
                                <li>Actualiza la frecuencia de cambio según el contenido se modifique</li>
                                <li>Solo páginas publicadas pueden ser incluidas en el sitemap</li>
                            </ul>
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
                        <EyeOutlined />
                        <Text strong>Vista Previa del Sitemap XML</Text>
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
                            downloadSitemap();
                            setPreviewVisible(false);
                        }}
                    >
                        Descargar
                    </Button>
                ]}
                width={800}
            >
                <Alert
                    message="Información"
                    description={
                        <Space orientation="vertical" size="small">
                            <Text>
                                URLs incluidas: <Text strong>{includedCount}</Text>
                            </Text>
                            <Text>
                                Este sitemap debe ser subido a <Text code>https://iieg.gob.mx/sitemap.xml</Text>
                            </Text>
                            <Text>
                                Recuerda registrarlo en{' '}
                                <a
                                    href="https://search.google.com/search-console"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Google Search Console
                                </a>
                            </Text>
                        </Space>
                    }
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />

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
                        fontSize: 12,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all'
                    }}>
                        {sitemapXML || 'Genera el sitemap primero para ver la vista previa'}
                    </pre>
                </Card>
            </Modal>
        </div>
    );
}
