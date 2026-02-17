import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Layout, Button, Typography, Spin, Empty, Card, Space, Collapse, Drawer } from 'antd';
import {
    SaveOutlined, CloseOutlined,
    SettingOutlined, CodeOutlined
} from '@ant-design/icons';
import { usePageDraft } from '@hooks/usePageDraft';
import { BLOCK_CONFIG } from '@constants/pageConstants';
import { getBlockComponent } from '@components/pageComponents';
import SEOEditor from '@components/SEOEditor';
import JsonEditorModal from '@components/JsonEditorModal';
import BlockEditorForm from '@components/BlockEditorForm';

const { Header, Content } = Layout;
const { Title, Text } = Typography;


export default function PageEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [settingsDrawerVisible, setSettingsDrawerVisible] = useState(false);

    const {
        page,
        loading,
        publishing,
        hasChanges,
        updateBlock,
        updateSEO,
        updatePageStructure,
        publishChanges,
        discardChanges
    } = usePageDraft(id);

     
    const isAdmin = true;
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
                    <Button icon={<CloseOutlined />} onClick={() => navigate('/menu')}>
                        Cerrar
                    </Button>
                    <Title level={4} style={{ margin: 0 }}>
                        {page.title || 'Sin Título'}
                        {hasChanges && <Text type="warning" style={{ fontSize: 14, marginLeft: 8 }}>(Sin guardar)</Text>}
                    </Title>
                </div>
                <Space>
                    {isAdmin && (
                        <Button icon={<CodeOutlined />} onClick={() => setJsonEditorVisible(true)}>
                            JSON
                        </Button>
                    )}
                    <Button icon={<SettingOutlined />} onClick={() => setSettingsDrawerVisible(true)}>
                        Configuración y SEO
                    </Button>
                    {hasChanges && (
                        <Button danger onClick={discardChanges}>
                            Descartar
                        </Button>
                    )}
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={publishing}
                        onClick={publishChanges}
                        disabled={!hasChanges}
                    >
                        Publicar
                    </Button>
                </Space>
            </Header>

            <Content style={{ padding: '24px', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
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
                                            label: 'Editar Propiedades',
                                            children: (
                                                <BlockEditorForm
                                                    block={block}
                                                    onChange={(values) => updateBlock(block.id, values)}
                                                />
                                            )
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
        </Layout>
    );
}

