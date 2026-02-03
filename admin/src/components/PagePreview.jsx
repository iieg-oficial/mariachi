import { useState } from 'react';
import { Modal, Segmented, Space, Tag } from 'antd';
import { DesktopOutlined, TabletOutlined, MobileOutlined, CloseOutlined } from '@ant-design/icons';
import { getComponentByType } from '@components/pageComponents';

const DEVICE_SIZES = {
    desktop: { width: '100%', label: 'Desktop', icon: <DesktopOutlined /> },
    tablet: { width: '768px', label: 'Tablet', icon: <TabletOutlined /> },
    mobile: { width: '375px', label: 'Móvil', icon: <MobileOutlined /> }
};

const PagePreview = ({ visible, onClose, page }) => {
    const [device, setDevice] = useState('desktop');

    if (!page) return null;

    const renderSection = (section) => {
        return (
            <div
                key={section.id}
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${section.columns}, 1fr)`,
                    gap: 16,
                    marginBottom: 24
                }}
            >
                {section.items.map((item) => (
                    <div key={item.id}>
                        {item.components.map((component) => {
                            const ComponentRender = getComponentByType(component.type);
                            if (!ComponentRender) return null;

                            return (
                                <div key={component.id} style={{ marginBottom: 16 }}>
                                    <ComponentRender
                                        {...component.props}
                                        editable={false}
                                    />
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <Modal
            title={
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <span>Vista Previa de Página</span>
                    <Segmented
                        value={device}
                        onChange={setDevice}
                        options={[
                            {
                                label: DEVICE_SIZES.desktop.label,
                                value: 'desktop',
                                icon: DEVICE_SIZES.desktop.icon
                            },
                            {
                                label: DEVICE_SIZES.tablet.label,
                                value: 'tablet',
                                icon: DEVICE_SIZES.tablet.icon
                            },
                            {
                                label: DEVICE_SIZES.mobile.label,
                                value: 'mobile',
                                icon: DEVICE_SIZES.mobile.icon
                            }
                        ]}
                    />
                </Space>
            }
            open={visible}
            onCancel={onClose}
            width="95%"
            style={{ top: 20 }}
            footer={null}
            closeIcon={<CloseOutlined />}
        >
            {page.seo && (page.seo.metaTitle || page.seo.metaDescription) && (
                <div style={{
                    padding: 12,
                    background: '#f0f8ff',
                    borderRadius: 4,
                    marginBottom: 16,
                    border: '1px solid #91d5ff'
                }}>
                    <Space orientation="vertical" style={{ width: '100%' }}>
                        {page.seo.metaTitle && (
                            <div>
                                <Tag color="blue">Meta Title</Tag>
                                <span style={{ fontWeight: 500 }}>{page.seo.metaTitle}</span>
                            </div>
                        )}
                        {page.seo.metaDescription && (
                            <div>
                                <Tag color="blue">Meta Description</Tag>
                                <span>{page.seo.metaDescription}</span>
                            </div>
                        )}
                    </Space>
                </div>
            )}

            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                background: '#f0f2f5',
                padding: 24,
                borderRadius: 4,
                minHeight: '70vh'
            }}>
                <div
                    style={{
                        width: DEVICE_SIZES[device].width,
                        maxWidth: '100%',
                        background: '#fff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        borderRadius: 8,
                        padding: 24,
                        transition: 'width 0.3s ease',
                        minHeight: '60vh'
                    }}
                >
                    {page.title && (
                        <h1 style={{
                            fontSize: device === 'mobile' ? 24 : 32,
                            marginBottom: 24,
                            color: '#262626'
                        }}>
                            {page.title}
                        </h1>
                    )}

                    {page.sections && page.sections.length > 0 ? (
                        page.sections.map(renderSection)
                    ) : (
                        <div style={{
                            textAlign: 'center',
                            padding: '60px 20px',
                            color: '#8c8c8c'
                        }}>
                            No hay contenido para previsualizar
                        </div>
                    )}
                </div>
            </div>

            <div style={{
                marginTop: 16,
                textAlign: 'center',
                color: '#8c8c8c',
                fontSize: 12
            }}>
                Visualizando en modo {DEVICE_SIZES[device].label}
                {device !== 'desktop' && ` (${DEVICE_SIZES[device].width})`}
            </div>
        </Modal>
    );
};

export default PagePreview;
