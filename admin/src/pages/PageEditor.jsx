import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { Layout, Button, Typography, Spin, Empty, Card, Space, Collapse, Drawer, Tag, Alert, Modal, Input } from 'antd';
import {
    SaveOutlined, CloseOutlined,
    SettingOutlined, CodeOutlined, CloudOutlined, EyeOutlined, SendOutlined
} from '@ant-design/icons';
import { usePageDraft } from '@hooks/usePageDraft';
import { useAuth } from '@contexts/AuthContext';
import { BLOCK_CONFIG, BLOCK_TYPES } from '@constants/pageConstants';
import { getBlockComponent } from '@components/pageComponents';
import SEOEditor from '@components/SEOEditor';
import JsonEditorModal from '@components/JsonEditorModal';
import BlockEditorForm from '@components/BlockEditorForm';
import CarouselEditor from '@components/CarouselEditor';

const { Header, Content } = Layout;
const { Title, Text } = Typography;


export default function PageEditor() {
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

    return (
        <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
            <Header style={{
                background: '#fff',
                padding: '0 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Button icon={<CloseOutlined />} onClick={() => navigate(reviewMode ? '/revision' : '/menu')}>
                        Cerrar
                    </Button>
                    <Title level={4} style={{ margin: 0 }}>
                        {page.title || 'Sin Título'}
                        {hasChanges && !reviewMode && <Text type="warning" style={{ fontSize: 14, marginLeft: 8 }}>(Sin publicar)</Text>}
                        {!hasChanges && hasDraft && !reviewMode && <Tag icon={<CloudOutlined />} color="blue" style={{ marginLeft: 8, fontWeight: 'normal' }}>Borrador guardado</Tag>}
                        {!isAdmin && borradorEstado === 'pendiente_revision' && <Tag color="orange" style={{ marginLeft: 8, fontWeight: 'normal' }}>En revisión</Tag>}
                        {!isAdmin && borradorEstado === 'rechazado' && <Tag color="red" style={{ marginLeft: 8, fontWeight: 'normal' }}>Rechazado</Tag>}
                    </Title>
                </div>
                <Space>
                    {editores.length > 0 && (
                        <Space size={4}>
                            <Text type="warning" style={{ fontSize: 13 }}>También editando:</Text>
                            {editores.map(e => <Tag key={e.username} color="orange">{e.name}</Tag>)}
                        </Space>
                    )}
                    {isAdmin && (
                        <Button icon={<CodeOutlined />} onClick={() => setJsonEditorVisible(true)}>
                            JSON
                        </Button>
                    )}
                    <Button icon={<SettingOutlined />} onClick={() => setSettingsDrawerVisible(true)}>
                        Configuración y SEO
                    </Button>
                    <Button icon={<EyeOutlined />} onClick={openPreview}>
                        Vista previa
                    </Button>
                    {reviewMode && isAdmin && (
                        <Button danger onClick={() => setRechazarModalVisible(true)}>
                            Rechazar
                        </Button>
                    )}
                    {isAdmin && hasChanges && !reviewMode && (
                        <Button danger onClick={discardChanges}>
                            Descartar
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
                                    Descartar
                                </Button>
                            )}
                            <Button
                                icon={<SaveOutlined />}
                                loading={saving}
                                onClick={() => saveDraft()}
                                disabled={!hasChanges}
                            >
                                Guardar borrador
                            </Button>
                            {borradorEstado !== 'pendiente_revision' && (
                                <Button
                                    type="primary"
                                    icon={<SendOutlined />}
                                    onClick={solicitarRevision}
                                    disabled={!hasDraft}
                                >
                                    Enviar a revisión
                                </Button>
                            )}
                        </>
                    )}
                </Space>
            </Header>

            <Content style={{ padding: '24px', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
                {reviewMode && reviewAuthor && (
                    <Alert
                        type="info"
                        message={`Revisando borrador de ${reviewAuthor.name}`}
                        style={{ marginBottom: 16 }}
                        showIcon
                    />
                )}
                {!isAdmin && borradorEstado === 'rechazado' && (
                    <Alert
                        type="error"
                        message="Borrador rechazado"
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
                placement="right"
                size="large"
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
