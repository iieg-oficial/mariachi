import { useState } from 'react';
import { Card, Form, Input, Switch, Button, Space, Collapse, Alert, Tag, Divider, Select, Typography } from 'antd';
import { GlobalOutlined, TwitterOutlined, FacebookOutlined, CheckCircleOutlined, WarningOutlined, CodeOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

const { TextArea } = Input;
const { Panel } = Collapse;

const SEOEditor = ({ seo = {}, onChange }) => {
    const [form] = Form.useForm();
    const [validation, setValidation] = useState({
        title: { status: 'success', message: '' },
        description: { status: 'success', message: '' }
    });
    const [schemaType, setSchemaType] = useState(seo.structuredData?.type || 'WebPage');

    const defaultSEO = {
        metaTitle: '',
        metaDescription: '',
        metaKeywords: '',
        ogTitle: '',
        ogDescription: '',
        ogImage: '',
        ogUrl: '',
        twitterCard: 'summary_large_image',
        twitterTitle: '',
        twitterDescription: '',
        twitterImage: '',
        canonicalUrl: '',
        noIndex: false,
        noFollow: false,
        structuredData: {
            type: 'WebPage',
            organizationName: '',
            organizationLogo: '',
            articleAuthor: '',
            articlePublisher: '',
            articleDatePublished: '',
            articleDateModified: '',
            breadcrumbs: [],
            localBusinessName: '',
            localBusinessAddress: '',
            localBusinessPhone: '',
            localBusinessType: 'Organization',
            faqItems: []
        },
        ...seo
    };

    const validateField = (field, value) => {
        const validations = {
            metaTitle: {
                min: 30,
                max: 60,
                ideal: 'entre 50-60 caracteres'
            },
            metaDescription: {
                min: 120,
                max: 160,
                ideal: 'entre 150-160 caracteres'
            }
        };

        if (!validations[field]) return;

        const rules = validations[field];
        const length = value?.length || 0;

        let status = 'success';
        let message = `${length} caracteres`;

        if (length === 0) {
            status = 'warning';
            message = 'Campo requerido para SEO';
        } else if (length < rules.min) {
            status = 'warning';
            message = `${length}/${rules.min} - Muy corto. Ideal: ${rules.ideal}`;
        } else if (length > rules.max) {
            status = 'error';
            message = `${length}/${rules.max} - Demasiado largo`;
        } else {
            status = 'success';
            message = `${length} caracteres - Óptimo`;
        }

        setValidation(prev => ({
            ...prev,
            [field]: { status, message }
        }));
    };

    const handleFieldChange = (field, value) => {
        const newSEO = {
            ...defaultSEO,
            [field]: value
        };

        if (field === 'metaTitle' || field === 'metaDescription') {
            validateField(field, value);
        }

        onChange(newSEO);
        form.setFieldsValue({ [field]: value });
    };

    const autoFillOG = () => {
        const metaTitle = form.getFieldValue('metaTitle');
        const metaDescription = form.getFieldValue('metaDescription');

        form.setFieldsValue({
            ogTitle: metaTitle,
            ogDescription: metaDescription
        });

        onChange({
            ...defaultSEO,
            ogTitle: metaTitle,
            ogDescription: metaDescription
        });
    };

    const autoFillTwitter = () => {
        const metaTitle = form.getFieldValue('metaTitle');
        const metaDescription = form.getFieldValue('metaDescription');

        form.setFieldsValue({
            twitterTitle: metaTitle,
            twitterDescription: metaDescription
        });

        onChange({
            ...defaultSEO,
            twitterTitle: metaTitle,
            twitterDescription: metaDescription
        });
    };

    const handleSchemaTypeChange = (type) => {
        setSchemaType(type);
        onChange({
            ...defaultSEO,
            structuredData: {
                ...defaultSEO.structuredData,
                type
            }
        });
    };

    const handleStructuredDataChange = (field, value) => {
        onChange({
            ...defaultSEO,
            structuredData: {
                ...defaultSEO.structuredData,
                [field]: value
            }
        });
    };

    const generateSchemaPreview = () => {
        const schema = { '@context': 'https://schema.org' };

        switch (schemaType) {
        case 'Organization':
            return {
                ...schema,
                '@type': 'Organization',
                name: defaultSEO.structuredData?.organizationName || '',
                logo: defaultSEO.structuredData?.organizationLogo || '',
                url: defaultSEO.canonicalUrl || ''
            };

        case 'Article':
            return {
                ...schema,
                '@type': 'Article',
                headline: defaultSEO.metaTitle || '',
                description: defaultSEO.metaDescription || '',
                author: {
                    '@type': 'Person',
                    name: defaultSEO.structuredData?.articleAuthor || ''
                },
                publisher: {
                    '@type': 'Organization',
                    name: defaultSEO.structuredData?.articlePublisher || '',
                    logo: {
                        '@type': 'ImageObject',
                        url: defaultSEO.structuredData?.organizationLogo || ''
                    }
                },
                datePublished: defaultSEO.structuredData?.articleDatePublished || '',
                dateModified: defaultSEO.structuredData?.articleDateModified || '',
                image: defaultSEO.ogImage || ''
            };

        case 'LocalBusiness':
            return {
                ...schema,
                '@type': defaultSEO.structuredData?.localBusinessType || 'LocalBusiness',
                name: defaultSEO.structuredData?.localBusinessName || '',
                address: defaultSEO.structuredData?.localBusinessAddress || '',
                telephone: defaultSEO.structuredData?.localBusinessPhone || '',
                url: defaultSEO.canonicalUrl || ''
            };

        case 'BreadcrumbList':
            return {
                ...schema,
                '@type': 'BreadcrumbList',
                itemListElement: (defaultSEO.structuredData?.breadcrumbs || []).map((item, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    name: item.name,
                    item: item.url
                }))
            };

        case 'FAQPage':
            return {
                ...schema,
                '@type': 'FAQPage',
                mainEntity: (defaultSEO.structuredData?.faqItems || []).map(item => ({
                    '@type': 'Question',
                    name: item.question,
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: item.answer
                    }
                }))
            };

        case 'WebPage':
        default:
            return {
                ...schema,
                '@type': 'WebPage',
                name: defaultSEO.metaTitle || '',
                description: defaultSEO.metaDescription || '',
                url: defaultSEO.canonicalUrl || ''
            };
        }
    };

    return (
        <Card title={<><GlobalOutlined /> SEO & Metadata</>} style={{ marginBottom: 16 }}>
            <Alert
                title="Optimización para Motores de Búsqueda"
                description="Completa estos campos para mejorar la visibilidad de la página en Google y redes sociales."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
            />

            <Form
                form={form}
                layout="vertical"
                initialValues={defaultSEO}
            >
                <Divider orientation="left">Meta Tags Básicos</Divider>

                <Form.Item
                    label={
                        <Space>
                            <span>Título SEO (Meta Title)</span>
                            {validation.title.status === 'success' && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                            {validation.title.status === 'warning' && <WarningOutlined style={{ color: '#faad14' }} />}
                            {validation.title.status === 'error' && <WarningOutlined style={{ color: '#ff4d4f' }} />}
                        </Space>
                    }
                    name="metaTitle"
                    help={
                        <Space>
                            <Tag color={
                                validation.title.status === 'success' ? 'success' :
                                    validation.title.status === 'warning' ? 'warning' : 'error'
                            }>
                                {validation.title.message}
                            </Tag>
                        </Space>
                    }
                >
                    <Input
                        placeholder="Título optimizado para motores de búsqueda (50-60 caracteres)"
                        value={defaultSEO.metaTitle}
                        onChange={(e) => handleFieldChange('metaTitle', e.target.value)}
                        maxLength={70}
                    />
                </Form.Item>

                <Form.Item
                    label={
                        <Space>
                            <span>Descripción SEO (Meta Description)</span>
                            {validation.description.status === 'success' && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                            {validation.description.status === 'warning' && <WarningOutlined style={{ color: '#faad14' }} />}
                            {validation.description.status === 'error' && <WarningOutlined style={{ color: '#ff4d4f' }} />}
                        </Space>
                    }
                    name="metaDescription"
                    help={
                        <Space>
                            <Tag color={
                                validation.description.status === 'success' ? 'success' :
                                    validation.description.status === 'warning' ? 'warning' : 'error'
                            }>
                                {validation.description.message}
                            </Tag>
                        </Space>
                    }
                >
                    <TextArea
                        rows={3}
                        placeholder="Descripción que aparecerá en resultados de búsqueda (150-160 caracteres)"
                        value={defaultSEO.metaDescription}
                        onChange={(e) => handleFieldChange('metaDescription', e.target.value)}
                        maxLength={180}
                    />
                </Form.Item>

                <Form.Item
                    label="Palabras Clave (Keywords)"
                    name="metaKeywords"
                    help="Separa las palabras clave con comas"
                >
                    <Input
                        placeholder="estadística, geografía, jalisco, datos abiertos"
                        value={defaultSEO.metaKeywords}
                        onChange={(e) => handleFieldChange('metaKeywords', e.target.value)}
                    />
                </Form.Item>

                <Form.Item
                    label="URL Canónica"
                    name="canonicalUrl"
                    help="URL preferida para evitar contenido duplicado"
                >
                    <Input
                        placeholder="https://iieg.gob.mx/pagina-principal"
                        value={defaultSEO.canonicalUrl}
                        onChange={(e) => handleFieldChange('canonicalUrl', e.target.value)}
                    />
                </Form.Item>

                <Space>
                    <Form.Item
                        label="No Index"
                        name="noIndex"
                        valuePropName="checked"
                        help="Evita que se indexe en buscadores"
                    >
                        <Switch
                            checked={defaultSEO.noIndex}
                            onChange={(checked) => handleFieldChange('noIndex', checked)}
                        />
                    </Form.Item>

                    <Form.Item
                        label="No Follow"
                        name="noFollow"
                        valuePropName="checked"
                        help="Evita seguir enlaces de esta página"
                    >
                        <Switch
                            checked={defaultSEO.noFollow}
                            onChange={(checked) => handleFieldChange('noFollow', checked)}
                        />
                    </Form.Item>
                </Space>

                <Collapse ghost style={{ marginTop: 24 }}>
                    <Panel
                        header={
                            <Space>
                                <FacebookOutlined style={{ color: '#1877f2' }} />
                                <span>OpenGraph (Facebook, LinkedIn)</span>
                            </Space>
                        }
                        key="opengraph"
                        extra={
                            <Button size="small" type="link" onClick={autoFillOG}>
                                Auto-llenar desde Meta Tags
                            </Button>
                        }
                    >
                        <Form.Item
                            label="OG Title"
                            name="ogTitle"
                        >
                            <Input
                                placeholder="Título para redes sociales"
                                value={defaultSEO.ogTitle}
                                onChange={(e) => handleFieldChange('ogTitle', e.target.value)}
                            />
                        </Form.Item>

                        <Form.Item
                            label="OG Description"
                            name="ogDescription"
                        >
                            <TextArea
                                rows={2}
                                placeholder="Descripción para redes sociales"
                                value={defaultSEO.ogDescription}
                                onChange={(e) => handleFieldChange('ogDescription', e.target.value)}
                            />
                        </Form.Item>

                        <Form.Item
                            label="OG Image"
                            name="ogImage"
                            help="URL de la imagen (1200x630px recomendado)"
                        >
                            <Input
                                placeholder="https://iieg.gob.mx/images/og-image.jpg"
                                value={defaultSEO.ogImage}
                                onChange={(e) => handleFieldChange('ogImage', e.target.value)}
                            />
                        </Form.Item>

                        <Form.Item
                            label="OG URL"
                            name="ogUrl"
                        >
                            <Input
                                placeholder="https://iieg.gob.mx/pagina"
                                value={defaultSEO.ogUrl}
                                onChange={(e) => handleFieldChange('ogUrl', e.target.value)}
                            />
                        </Form.Item>
                    </Panel>

                    <Panel
                        header={
                            <Space>
                                <TwitterOutlined style={{ color: '#1da1f2' }} />
                                <span>Twitter Cards</span>
                            </Space>
                        }
                        key="twitter"
                        extra={
                            <Button size="small" type="link" onClick={autoFillTwitter}>
                                Auto-llenar desde Meta Tags
                            </Button>
                        }
                    >
                        <Form.Item
                            label="Twitter Card Type"
                            name="twitterCard"
                        >
                            <Input
                                placeholder="summary_large_image"
                                value={defaultSEO.twitterCard}
                                onChange={(e) => handleFieldChange('twitterCard', e.target.value)}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Twitter Title"
                            name="twitterTitle"
                        >
                            <Input
                                placeholder="Título para Twitter"
                                value={defaultSEO.twitterTitle}
                                onChange={(e) => handleFieldChange('twitterTitle', e.target.value)}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Twitter Description"
                            name="twitterDescription"
                        >
                            <TextArea
                                rows={2}
                                placeholder="Descripción para Twitter"
                                value={defaultSEO.twitterDescription}
                                onChange={(e) => handleFieldChange('twitterDescription', e.target.value)}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Twitter Image"
                            name="twitterImage"
                            help="URL de la imagen (1200x600px recomendado)"
                        >
                            <Input
                                placeholder="https://iieg.gob.mx/images/twitter-image.jpg"
                                value={defaultSEO.twitterImage}
                                onChange={(e) => handleFieldChange('twitterImage', e.target.value)}
                            />
                        </Form.Item>
                    </Panel>

                    <Panel
                        header={
                            <Space>
                                <CodeOutlined style={{ color: '#722ed1' }} />
                                <span>Structured Data (Schema.org)</span>
                            </Space>
                        }
                        key="structured-data"
                    >
                        <Alert
                            title="Datos Estructurados"
                            description="Ayuda a los motores de búsqueda a entender mejor tu contenido mediante Schema.org JSON-LD"
                            type="info"
                            icon={<InfoCircleOutlined />}
                            showIcon
                            style={{ marginBottom: 16 }}
                        />

                        <Form.Item label="Tipo de Schema">
                            <Select
                                value={schemaType}
                                onChange={handleSchemaTypeChange}
                                style={{ width: '100%' }}
                            >
                                <Select.Option value="WebPage">Página Web (General)</Select.Option>
                                <Select.Option value="Article">Artículo</Select.Option>
                                <Select.Option value="Organization">Organización</Select.Option>
                                <Select.Option value="LocalBusiness">Negocio Local</Select.Option>
                                <Select.Option value="BreadcrumbList">Migas de Pan</Select.Option>
                                <Select.Option value="FAQPage">Página de Preguntas Frecuentes</Select.Option>
                            </Select>
                        </Form.Item>

                        <Divider />

                        {schemaType === 'Organization' && (
                            <>
                                <Form.Item label="Nombre de la Organización">
                                    <Input
                                        placeholder="IIEG - Instituto de Información Estadística y Geográfica"
                                        value={defaultSEO.structuredData?.organizationName}
                                        onChange={(e) => handleStructuredDataChange('organizationName', e.target.value)}
                                    />
                                </Form.Item>
                                <Form.Item label="Logo de la Organización (URL)">
                                    <Input
                                        placeholder="https://iieg.gob.mx/logo.png"
                                        value={defaultSEO.structuredData?.organizationLogo}
                                        onChange={(e) => handleStructuredDataChange('organizationLogo', e.target.value)}
                                    />
                                </Form.Item>
                            </>
                        )}

                        {schemaType === 'Article' && (
                            <>
                                <Form.Item label="Autor del Artículo">
                                    <Input
                                        placeholder="Nombre del autor"
                                        value={defaultSEO.structuredData?.articleAuthor}
                                        onChange={(e) => handleStructuredDataChange('articleAuthor', e.target.value)}
                                    />
                                </Form.Item>
                                <Form.Item label="Publicador">
                                    <Input
                                        placeholder="IIEG"
                                        value={defaultSEO.structuredData?.articlePublisher}
                                        onChange={(e) => handleStructuredDataChange('articlePublisher', e.target.value)}
                                    />
                                </Form.Item>
                                <Form.Item label="Fecha de Publicación">
                                    <Input
                                        type="date"
                                        value={defaultSEO.structuredData?.articleDatePublished}
                                        onChange={(e) => handleStructuredDataChange('articleDatePublished', e.target.value)}
                                    />
                                </Form.Item>
                                <Form.Item label="Fecha de Modificación">
                                    <Input
                                        type="date"
                                        value={defaultSEO.structuredData?.articleDateModified}
                                        onChange={(e) => handleStructuredDataChange('articleDateModified', e.target.value)}
                                    />
                                </Form.Item>
                                <Form.Item label="Logo del Publicador (URL)">
                                    <Input
                                        placeholder="https://iieg.gob.mx/logo.png"
                                        value={defaultSEO.structuredData?.organizationLogo}
                                        onChange={(e) => handleStructuredDataChange('organizationLogo', e.target.value)}
                                    />
                                </Form.Item>
                            </>
                        )}

                        {schemaType === 'LocalBusiness' && (
                            <>
                                <Form.Item label="Tipo de Negocio">
                                    <Select
                                        value={defaultSEO.structuredData?.localBusinessType}
                                        onChange={(value) => handleStructuredDataChange('localBusinessType', value)}
                                        style={{ width: '100%' }}
                                    >
                                        <Select.Option value="Organization">Organización</Select.Option>
                                        <Select.Option value="LocalBusiness">Negocio Local</Select.Option>
                                        <Select.Option value="GovernmentOffice">Oficina Gubernamental</Select.Option>
                                        <Select.Option value="EducationalOrganization">Organización Educativa</Select.Option>
                                    </Select>
                                </Form.Item>
                                <Form.Item label="Nombre del Negocio">
                                    <Input
                                        placeholder="IIEG Jalisco"
                                        value={defaultSEO.structuredData?.localBusinessName}
                                        onChange={(e) => handleStructuredDataChange('localBusinessName', e.target.value)}
                                    />
                                </Form.Item>
                                <Form.Item label="Dirección">
                                    <TextArea
                                        rows={2}
                                        placeholder="Calle, número, colonia, ciudad, estado, código postal"
                                        value={defaultSEO.structuredData?.localBusinessAddress}
                                        onChange={(e) => handleStructuredDataChange('localBusinessAddress', e.target.value)}
                                    />
                                </Form.Item>
                                <Form.Item label="Teléfono">
                                    <Input
                                        placeholder="+52 33 1234 5678"
                                        value={defaultSEO.structuredData?.localBusinessPhone}
                                        onChange={(e) => handleStructuredDataChange('localBusinessPhone', e.target.value)}
                                    />
                                </Form.Item>
                            </>
                        )}

                        {schemaType === 'BreadcrumbList' && (
                            <Alert
                                title="Migas de Pan"
                                description="Las migas de pan se generan automáticamente basadas en la estructura de navegación de tu sitio."
                                type="info"
                                showIcon
                            />
                        )}

                        {schemaType === 'FAQPage' && (
                            <Alert
                                title="Página de Preguntas Frecuentes"
                                description="Los elementos FAQ se generan automáticamente si agregas componentes de tipo FAQ a tu página."
                                type="info"
                                showIcon
                            />
                        )}

                        {schemaType === 'WebPage' && (
                            <Alert
                                title="Página Web General"
                                description="Los datos básicos (título, descripción, URL) se toman automáticamente de los meta tags."
                                type="success"
                                showIcon
                            />
                        )}

                        <Divider orientation="left">Vista Previa del JSON-LD</Divider>

                        <Card size="small" style={{ backgroundColor: '#f5f5f5' }}>
                            <pre style={{
                                margin: 0,
                                fontSize: 12,
                                maxHeight: 300,
                                overflow: 'auto',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                            }}>
                                {JSON.stringify(generateSchemaPreview(), null, 2)}
                            </pre>
                        </Card>

                        <Alert
                            title="Validación"
                            description={
                                <span>
                                    Valida tu structured data con{' '}
                                    <a
                                        href="https://validator.schema.org/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Schema.org Validator
                                    </a>
                                    {' '}o{' '}
                                    <a
                                        href="https://search.google.com/test/rich-results"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Google Rich Results Test
                                    </a>
                                </span>
                            }
                            type="info"
                            showIcon
                            style={{ marginTop: 16 }}
                        />
                    </Panel>
                </Collapse>
            </Form>
        </Card>
    );
};

export default SEOEditor;
