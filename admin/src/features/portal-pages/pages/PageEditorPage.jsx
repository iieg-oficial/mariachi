import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { Layout, Button, Typography, Spin, Empty, Card, Space, Collapse, Drawer, Tag, Alert, Modal, Input, Tooltip } from 'antd';
import {
    SaveOutlined, CloseOutlined,
    SettingOutlined, CodeOutlined, CloudOutlined, EyeOutlined, SendOutlined
} from '@ant-design/icons';
import { usePageDraft } from '@features/portal-pages/hooks/usePageDraft';
import { useAuth } from '@shared/contexts/AuthContext';
import useIsMobile from '@shared/hooks/useIsMobile';
import { BLOCK_CONFIG, BLOCK_TYPES } from '@features/portal-pages/constants/pageConstants';
import { getBlockComponent } from '@features/portal-pages/components/pageComponents';
import SEOEditor from '@features/portal-pages/components/SEOEditor';
import JsonEditorModal from '@features/portal-pages/components/JsonEditorModal';
import BlockEditorForm from '@features/portal-pages/components/BlockEditorForm';
import CarouselEditor from '@features/portal-pages/components/CarouselEditor';

const { Header, Content } = Layout;
const { Title, Text } = Typography;


export default function PageEditor() {
    const { isMobile } = useIsMobile();
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [settingsDrawerVisible, setSettingsDrawerVisible] = useState(false);
    const [rechazarModalVisible, setRechazarModalVisible] = useState(false);
    const [rechazarComentario, setRechazarComentario] = useState('');

    const { user } = useAuth();
    const isAdmin = user?.role === 'tetlamamakani';

    const reviewMode = isAdmin && searchParams.get('review') === 'true';
    const borradorId = searchParams.get('borrador');

    const {
        page,
        loading,
        publishing,
        saving,
        hasChanges,
        hasDraft,
        editores,
        borradorEstado,
        comentarioRechazo,
        reviewAuthor,
        updateBlock,
        updateSEO,
        updatePageStructure,
        publishChanges,
        discardChanges,
        saveDraft,
        solicitarRevision,
        rechazarRevision,
        openPreview
    } = usePageDraft(id, { reviewMode, borradorId });

    const isAdmin2 = isAdmin;
    const [jsonEditorVisible, setJsonEditorVisible] = useState(false);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!page) {
        return <Empty description="Página no encontrada" />;
    }

    const labelOrIcon = (label) => (isMobile ? '' : label);

    return (
        <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
            <Header style={{
                background: '#fff',
                padding: isMobile ? '8px 12px' : '0 24px',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'center',
                justifyContent: 'space-between',
                gap: isMobile ? 8 : 16,
                height: 'auto',
                lineHeight: 'normal',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                zIndex: 10,
                position: 'sticky',
                top: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', minWidth: 0 }}>
                    <Button icon={<CloseOutlined />} onClick={() => navigate(reviewMode ? '/revision' : '/menu')}>
                        {isMobile ? '' : 'Cerrar'}
                    </Button>
                    <Title level={isMobile ? 5 : 4} style={{ margin: 0, wordBreak: 'break-word' }}>
                        {page.title || 'Sin Título'}
                        {hasChanges && !reviewMode && <Text type="warning" style={{ fontSize: 13, marginLeft: 8 }}>(Sin publicar)</Text>}
                        {!hasChanges && hasDraft && !reviewMode && <Tag icon={<CloudOutlined />} color="blue" style={{ marginLeft: 8, fontWeight: 'normal' }}>Borrador</Tag>}
                        {!isAdmin && borradorEstado === 'pendiente_revision' && <Tag color="orange" style={{ marginLeft: 8, fontWeight: 'normal' }}>En revisión</Tag>}
                        {!isAdmin && borradorEstado === 'rechazado' && <Tag color="red" style={{ marginLeft: 8, fontWeight: 'normal' }}>Rechazado</Tag>}
                    </Title>
                </div>
                <Space wrap size={[8, 8]} style={{ width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
                    {editores.length > 0 && !isMobile && (
                        <Space size={4}>
                            <Text type="warning" style={{ fontSize: 13 }}>Editando:</Text>
                            {editores.map(e => <Tag key={e.username} color="orange">{e.name}</Tag>)}
                        </Space>
                    )}
                    {isAdmin && (
                        <Tooltip title="JSON">
                            <Button icon={<CodeOutlined />} onClick={() => setJsonEditorVisible(true)}>
                                {labelOrIcon('JSON')}
                            </Button>
                        </Tooltip>
                    )}
                    <Tooltip title="Configuración y SEO">
                        <Button icon={<SettingOutlined />} onClick={() => setSettingsDrawerVisible(true)}>
                            {labelOrIcon('Configuración y SEO')}
                        </Button>
                    </Tooltip>
                    <Tooltip title="Vista previa">
                        <Button icon={<EyeOutlined />} onClick={openPreview}>
                            {labelOrIcon('Vista previa')}
                        </Button>
                    </Tooltip>
                    {reviewMode && isAdmin && (
                        <Button danger onClick={() => setRechazarModalVisible(true)}>
                            Rechazar
                        </Button>
                    )}
                    {isAdmin && hasChanges && !reviewMode && (
                        <Button danger onClick={discardChanges}>
                            {labelOrIcon('Descartar')}
                        </Button>
                    )}
                    {isAdmin && (
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            loading={publishing}
                            onClick={publishChanges}
                            disabled={!hasChanges && !reviewMode}
                        >
                            Publicar
                        </Button>
                    )}
                    {!isAdmin && (
                        <>
                            {hasChanges && (
                                <Button danger onClick={discardChanges}>
                                    {labelOrIcon('Descartar')}
                                </Button>
                            )}
                            <Button
                                icon={<SaveOutlined />}
                                loading={saving}
                                onClick={() => saveDraft()}
                                disabled={!hasChanges}
                            >
                                {labelOrIcon('Guardar borrador')}
                            </Button>
                            {borradorEstado !== 'pendiente_revision' && (
                                <Button
                                    type="primary"
                                    icon={<SendOutlined />}
                                    onClick={solicitarRevision}
                                    disabled={!hasDraft}
                                >
                                    {labelOrIcon('Enviar a revisión')}
                                </Button>
                            )}
                        </>
                    )}
                </Space>
            </Header>

            <Content style={{ padding: isMobile ? 12 : 24, maxWidth: 1000, margin: '0 auto', width: '100%' }}>
                {reviewMode && reviewAuthor && (
                    <Alert
                        type="info"
                        title={`Revisando borrador de ${reviewAuthor.name}`}
                        style={{ marginBottom: 16 }}
                        showIcon
                    />
                )}
                {!isAdmin && borradorEstado === 'rechazado' && (
                    <Alert
                        type="error"
                        title="Borrador rechazado"
                        description={comentarioRechazo || 'El administrador rechazó el borrador sin especificar un motivo.'}
                        style={{ marginBottom: 16 }}
                        showIcon
                    />
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
                    {page.sections && page.sections.length === 0 && (
                        <Empty
                            description={
                                <span>No hay contenido aún. Usa el editor JSON para agregar bloques.</span>
                            }
                        />
                    )}

                    {page.sections && page.sections.map((block) => {
                        const BlockComponent = getBlockComponent(block.type);
                        const config = BLOCK_CONFIG[block.type];

                        return (
                            <div key={block.id} className="block-wrapper" style={{ position: 'relative' }}>
                                <Card
                                    hoverable
                                    styles={{ body: { padding: 0 } }}
                                    style={{ border: '1px solid #e0e0e0', overflow: 'hidden' }}
                                    title={<Text strong>{config ? config.label : block.type}</Text>}
                                >
                                    <div style={{ padding: 0, borderBottom: '1px solid #f0f0f0' }}>
                                        <BlockComponent {...block.props} />
                                    </div>

                                    <Collapse
                                        ghost
                                        expandIconPlacement="end"
                                        items={[{
                                            key: '1',
                                            label: 'Editar Contenido',
                                            children: block.type === BLOCK_TYPES.CAROUSEL
                                                ? <CarouselEditor block={block} onChange={(values) => updateBlock(block.id, values)} />
                                                : <BlockEditorForm block={block} onChange={(values) => updateBlock(block.id, values)} />
                                        }]}
                                    />
                                </Card>
                            </div>
                        );
                    })}
                </div>
            </Content>

            <Drawer
                title="Configuración de Página y SEO"
                placement={isMobile ? 'bottom' : 'right'}
                size={isMobile ? undefined : 'large'}
                styles={isMobile ? { wrapper: { width: '100%', height: '92%' } } : undefined}
                onClose={() => setSettingsDrawerVisible(false)}
                open={settingsDrawerVisible}
            >
                <div style={{ marginBottom: 24 }}>
                    <Text strong>Título de la página (Interno)</Text>
                    <Typography.Paragraph>{page.title}</Typography.Paragraph>
                </div>

                <SEOEditor
                    seo={page.seo || {}}
                    onChange={updateSEO}
                />
            </Drawer>

            <JsonEditorModal
                visible={jsonEditorVisible}
                onClose={() => setJsonEditorVisible(false)}
                initialData={page.sections}
                onSave={updatePageStructure}
            />

            <Modal
                title="Rechazar borrador"
                open={rechazarModalVisible}
                onOk={async () => {
                    await rechazarRevision(rechazarComentario);
                    setRechazarModalVisible(false);
                    setRechazarComentario('');
                }}
                onCancel={() => { setRechazarModalVisible(false); setRechazarComentario(''); }}
                okText="Rechazar"
                okType="danger"
                cancelText="Cancelar"
                width={isMobile ? '100%' : 520}
                centered={isMobile}
            >
                <Input.TextArea
                    placeholder="Motivo del rechazo (opcional)"
                    value={rechazarComentario}
                    onChange={e => setRechazarComentario(e.target.value)}
                    rows={3}
                />
            </Modal>
        </Layout>
    );
}
