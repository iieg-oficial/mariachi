import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Layout, Button, Alert, Card, Select, Space, Modal, Typography, Spin, Empty, Drawer } from 'antd';
import {
    PlusOutlined, SaveOutlined, CloseOutlined, DeleteOutlined,
    ArrowUpOutlined, ArrowDownOutlined, FileTextOutlined,
    FontSizeOutlined, PictureOutlined, EyeOutlined, FileAddOutlined, HistoryOutlined,
    HeatMapOutlined, AppstoreOutlined, InfoCircleOutlined,
    FileDoneOutlined, MailOutlined, StarOutlined
} from '@ant-design/icons';
import { usePageDraft } from '@hooks/usePageDraft';
import { GRID_COLUMNS, COMPONENT_CONFIG, COMPONENT_TYPES } from '@constants/pageConstants';
import { getComponentByType } from '@components/pageComponents';
import SEOEditor from '@components/SEOEditor';
import SEOAnalyzer from '@components/SEOAnalyzer';
import PagePreview from '@components/PagePreview';
import TemplateSelector from '@components/TemplateSelector';
import ApprovalStatus from '@components/ApprovalStatus';
import PageVersionHistory from '@components/PageVersionHistory';
import AccessibilityChecker from '@components/AccessibilityChecker';
import SchedulePublisher from '@components/SchedulePublisher';
import { APPROVAL_STATUS } from '@constants/approvalConstants';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

export default function PageEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [previewVisible, setPreviewVisible] = useState(false);
    const [templateSelectorVisible, setTemplateSelectorVisible] = useState(false);
    const [versionHistoryVisible, setVersionHistoryVisible] = useState(false);

    const {
        page,
        loading,
        publishing,
        hasChanges,
        addSection,
        removeSection,
        moveSectionUp,
        moveSectionDown,
        addComponent,
        removeComponent,
        updateComponent,
        moveComponentUp,
        moveComponentDown,
        updateSEO,
        discardChanges,
        publishChanges,
        applyTemplate
    } = usePageDraft(id);

    const handlePublish = () => {
        Modal.confirm({
            title: '¿Publicar cambios?',
            content: 'Los cambios se guardarán y serán visibles en la página pública.',
            okText: 'Publicar',
            cancelText: 'Cancelar',
            onOk: async () => {
                const success = await publishChanges();
                if (success) {
                    navigate('/menu');
                }
            }
        });
    };

    const handleDiscard = () => {
        Modal.confirm({
            title: '¿Descartar cambios?',
            content: 'Se perderán todos los cambios no publicados.',
            okText: 'Descartar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: discardChanges
        });
    };

    const handleAddComponent = (sectionId, itemIndex, componentType) => {
        const component = COMPONENT_CONFIG[componentType];
        if (component) {
            addComponent(sectionId, itemIndex, component);
        }
    };

    const handleTemplateSelect = (template) => {
        applyTemplate(template);
        setTemplateSelectorVisible(false);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!page) {
        return (
            <Empty description="Página no encontrada" />
        );
    }

    return (
        <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
            <Header style={{
                background: '#fff',
                padding: '0 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}>
                <Title level={4} style={{ margin: 0 }}>
                    Editor de Página {hasChanges && <Text type="warning">(Sin guardar)</Text>}
                </Title>
                <Space>
                    <Button
                        icon={<EyeOutlined />}
                        onClick={() => setPreviewVisible(true)}
                    >
                        Vista Previa
                    </Button>
                    <Button
                        icon={<HistoryOutlined />}
                        onClick={() => setVersionHistoryVisible(true)}
                    >
                        Historial
                    </Button>
                    <Button
                        icon={<CloseOutlined />}
                        onClick={() => navigate('/menu')}
                    >
                        Cerrar
                    </Button>
                    {hasChanges && (
                        <Button
                            danger
                            onClick={handleDiscard}
                        >
                            Descartar
                        </Button>
                    )}
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={publishing}
                        disabled={!hasChanges}
                        onClick={handlePublish}
                    >
                        Publicar
                    </Button>
                </Space>
            </Header>

            <Layout>
                <Sider width={280} style={{ background: '#fff', padding: '24px 16px', overflow: 'auto' }}>
                    <Title level={5}>Componentes</Title>
                    <Space orientation="vertical" style={{ width: '100%' }} size="small">
                        <Card size="small" title="Básicos">
                            <Space orientation="vertical" style={{ width: '100%' }}>
                                <Button
                                    block
                                    icon={<FileTextOutlined />}
                                    data-component={COMPONENT_TYPES.TEXT}
                                >
                                    Texto
                                </Button>
                                <Button
                                    block
                                    icon={<FontSizeOutlined />}
                                    data-component={COMPONENT_TYPES.HEADING}
                                >
                                    Título
                                </Button>
                                <Button
                                    block
                                    icon={<PictureOutlined />}
                                    data-component={COMPONENT_TYPES.IMAGE}
                                >
                                    Imagen
                                </Button>
                            </Space>
                        </Card>
                        <Card size="small" title="Secciones">
                            <Space orientation="vertical" style={{ width: '100%' }}>
                                <Button
                                    block
                                    icon={<PictureOutlined />}
                                    data-component={COMPONENT_TYPES.HERO_BANNER}
                                >
                                    Banner Hero
                                </Button>
                                <Button
                                    block
                                    icon={<HeatMapOutlined />}
                                    data-component={COMPONENT_TYPES.CAROUSEL}
                                >
                                    Carrusel
                                </Button>
                                <Button
                                    block
                                    icon={<AppstoreOutlined />}
                                    data-component={COMPONENT_TYPES.CARD_GRID}
                                >
                                    Grid de Cards
                                </Button>
                                <Button
                                    block
                                    icon={<InfoCircleOutlined />}
                                    data-component={COMPONENT_TYPES.INFO_SECTION}
                                >
                                    Sección Informativa
                                </Button>
                                <Button
                                    block
                                    icon={<FileDoneOutlined />}
                                    data-component={COMPONENT_TYPES.PROCUREMENT_LIST}
                                >
                                    Licitaciones
                                </Button>
                                <Button
                                    block
                                    icon={<MailOutlined />}
                                    data-component={COMPONENT_TYPES.CONTACT_FORM}
                                >
                                    Formulario Contacto
                                </Button>
                                <Button
                                    block
                                    icon={<StarOutlined />}
                                    data-component={COMPONENT_TYPES.FEATURE_SHOWCASE}
                                >
                                    Destacado
                                </Button>
                            </Space>
                        </Card>
                        <Alert
                            message="Arrastra o haz clic en un componente para agregarlo"
                            type="info"
                            showIcon
                        />
                    </Space>
                </Sider>

                <Content style={{ padding: 24 }}>
                    {hasChanges && (
                        <Alert
                            message="Tienes cambios sin guardar"
                            description="Recuerda publicar tus cambios cuando termines de editar"
                            type="warning"
                            showIcon
                            closable
                            style={{ marginBottom: 16 }}
                        />
                    )}

                    <SEOEditor
                        seo={page.seo || {}}
                        onChange={updateSEO}
                    />

                    <SEOAnalyzer
                        page={page}
                        seo={page.seo || {}}
                    />

                    <ApprovalStatus
                        status={page.approvalStatus || APPROVAL_STATUS.DRAFT}
                        approvalHistory={page.approvalHistory || []}
                        onRequestApproval={() => { }}
                        onApprove={() => { }}
                        onReject={() => { }}
                        disabled={!page || loading}
                    />

                    <AccessibilityChecker
                        page={page}
                        onValidate={() => { }}
                    />

                    <SchedulePublisher
                        pageId={id}
                        currentSchedule={page.scheduledPublications}
                        onSchedule={() => { }}
                        onCancel={() => { }}
                    />

                    <Card style={{ marginBottom: 16 }}>
                        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                            <Space wrap>
                                <Text strong>Agregar sección:</Text>
                                {GRID_COLUMNS.map(grid => (
                                    <Button
                                        key={grid.value}
                                        icon={<PlusOutlined />}
                                        onClick={() => addSection(grid.value)}
                                    >
                                        {grid.label}
                                    </Button>
                                ))}
                            </Space>
                            <Button
                                type="dashed"
                                icon={<FileAddOutlined />}
                                onClick={() => setTemplateSelectorVisible(true)}
                            >
                                Usar Plantilla
                            </Button>
                        </Space>
                    </Card>

                    {page.sections.length === 0 ? (
                        <Empty
                            description="No hay secciones. Agrega una para comenzar"
                            style={{ padding: '60px 0' }}
                        />
                    ) : (
                        page.sections.map((section, sectionIndex) => (
                            <Card
                                key={section.id}
                                style={{ marginBottom: 16 }}
                                title={`Sección ${sectionIndex + 1} - ${section.columns} columna(s)`}
                                extra={
                                    <Space>
                                        <Button
                                            size="small"
                                            icon={<ArrowUpOutlined />}
                                            disabled={sectionIndex === 0}
                                            onClick={() => moveSectionUp(sectionIndex)}
                                        />
                                        <Button
                                            size="small"
                                            icon={<ArrowDownOutlined />}
                                            disabled={sectionIndex === page.sections.length - 1}
                                            onClick={() => moveSectionDown(sectionIndex)}
                                        />
                                        <Button
                                            size="small"
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={() => removeSection(section.id)}
                                        />
                                    </Space>
                                }
                            >
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${section.columns}, 1fr)`,
                                    gap: 16
                                }}>
                                    {section.items.map((item, itemIndex) => (
                                        <div
                                            key={item.id}
                                            style={{
                                                border: '2px dashed #d9d9d9',
                                                borderRadius: 4,
                                                padding: 16,
                                                minHeight: 200,
                                                background: '#fafafa'
                                            }}
                                        >
                                            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                                                Columna {itemIndex + 1}
                                            </Text>

                                            {item.components.map((component, compIndex) => {
                                                const ComponentRender = getComponentByType(component.type);
                                                if (!ComponentRender) return null;

                                                return (
                                                    <div
                                                        key={component.id}
                                                        style={{
                                                            border: '1px solid #1890ff',
                                                            borderRadius: 4,
                                                            padding: 12,
                                                            marginBottom: 12,
                                                            background: '#fff'
                                                        }}
                                                    >
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            marginBottom: 8
                                                        }}>
                                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                                {COMPONENT_CONFIG[component.type]?.label}
                                                            </Text>
                                                            <Space size="small">
                                                                <Button
                                                                    size="small"
                                                                    type="text"
                                                                    icon={<ArrowUpOutlined />}
                                                                    disabled={compIndex === 0}
                                                                    onClick={() => moveComponentUp(section.id, itemIndex, compIndex)}
                                                                />
                                                                <Button
                                                                    size="small"
                                                                    type="text"
                                                                    icon={<ArrowDownOutlined />}
                                                                    disabled={compIndex === item.components.length - 1}
                                                                    onClick={() => moveComponentDown(section.id, itemIndex, compIndex)}
                                                                />
                                                                <Button
                                                                    size="small"
                                                                    type="text"
                                                                    danger
                                                                    icon={<DeleteOutlined />}
                                                                    onClick={() => removeComponent(section.id, itemIndex, component.id)}
                                                                />
                                                            </Space>
                                                        </div>
                                                        <ComponentRender
                                                            {...component.props}
                                                            editable={true}
                                                            onChange={(newProps) =>
                                                                updateComponent(section.id, itemIndex, component.id, newProps)
                                                            }
                                                        />
                                                    </div>
                                                );
                                            })}

                                            <Select
                                                placeholder="Agregar componente..."
                                                style={{ width: '100%' }}
                                                onChange={(value) => handleAddComponent(section.id, itemIndex, value)}
                                                value={null}
                                            >
                                                <Select.OptGroup label="Básicos">
                                                    <Select.Option value={COMPONENT_TYPES.TEXT}>
                                                        <FileTextOutlined /> Texto
                                                    </Select.Option>
                                                    <Select.Option value={COMPONENT_TYPES.HEADING}>
                                                        <FontSizeOutlined /> Título
                                                    </Select.Option>
                                                    <Select.Option value={COMPONENT_TYPES.IMAGE}>
                                                        <PictureOutlined /> Imagen
                                                    </Select.Option>
                                                </Select.OptGroup>
                                                <Select.OptGroup label="Secciones">
                                                    <Select.Option value={COMPONENT_TYPES.HERO_BANNER}>
                                                        <PictureOutlined /> Banner Hero
                                                    </Select.Option>
                                                    <Select.Option value={COMPONENT_TYPES.CAROUSEL}>
                                                        <HeatMapOutlined /> Carrusel
                                                    </Select.Option>
                                                    <Select.Option value={COMPONENT_TYPES.CARD_GRID}>
                                                        <AppstoreOutlined /> Grid de Cards
                                                    </Select.Option>
                                                    <Select.Option value={COMPONENT_TYPES.INFO_SECTION}>
                                                        <InfoCircleOutlined /> Sección Informativa
                                                    </Select.Option>
                                                    <Select.Option value={COMPONENT_TYPES.PROCUREMENT_LIST}>
                                                        <FileDoneOutlined /> Licitaciones
                                                    </Select.Option>
                                                    <Select.Option value={COMPONENT_TYPES.CONTACT_FORM}>
                                                        <MailOutlined /> Formulario Contacto
                                                    </Select.Option>
                                                    <Select.Option value={COMPONENT_TYPES.FEATURE_SHOWCASE}>
                                                        <StarOutlined /> Destacado
                                                    </Select.Option>
                                                </Select.OptGroup>
                                            </Select>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        ))
                    )}
                </Content>
            </Layout>

            <PagePreview
                visible={previewVisible}
                onClose={() => setPreviewVisible(false)}
                page={page}
            />

            <TemplateSelector
                visible={templateSelectorVisible}
                onSelect={handleTemplateSelect}
                onCancel={() => setTemplateSelectorVisible(false)}
            />

            <Drawer
                title="Historial de Versiones"
                placement="right"
                width={500}
                onClose={() => setVersionHistoryVisible(false)}
                open={versionHistoryVisible}
            >
                <PageVersionHistory
                    versions={page.versions || []}
                    currentVersion={page.currentVersion}
                    onRestore={() => { }}
                    onPreview={() => { }}
                />
            </Drawer>
        </Layout>
    );
}
