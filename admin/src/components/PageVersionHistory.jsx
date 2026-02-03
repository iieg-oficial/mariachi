import { Card, Timeline, Button, Space, Typography, Tag, Modal, Empty, Tooltip, Descriptions } from 'antd';
import { useState } from 'react';
import {
    HistoryOutlined,
    RollbackOutlined,
    EyeOutlined,
    UserOutlined,
    ClockCircleOutlined,
    SaveOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;

    if (interval > 1) return `hace ${Math.floor(interval)} años`;
    interval = seconds / 2592000;
    if (interval > 1) return `hace ${Math.floor(interval)} meses`;
    interval = seconds / 86400;
    if (interval > 1) return `hace ${Math.floor(interval)} días`;
    interval = seconds / 3600;
    if (interval > 1) return `hace ${Math.floor(interval)} horas`;
    interval = seconds / 60;
    if (interval > 1) return `hace ${Math.floor(interval)} minutos`;
    return `hace ${Math.floor(seconds)} segundos`;
};

const PageVersionHistory = ({ versions = [], currentVersion, onRestore, onPreview }) => {
    const [previewVisible, setPreviewVisible] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState(null);

    const handleRestore = (version) => {
        Modal.confirm({
            title: '¿Restaurar esta versión?',
            content: (
                <Space orientation="vertical">
                    <Text>Se restaurará la versión del {new Date(version.createdAt).toLocaleString()}</Text>
                    <Text type="warning">Los cambios no guardados se perderán</Text>
                </Space>
            ),
            okText: 'Restaurar',
            okType: 'primary',
            cancelText: 'Cancelar',
            onOk: () => onRestore(version)
        });
    };

    const handlePreview = (version) => {
        setSelectedVersion(version);
        setPreviewVisible(true);
        if (onPreview) {
            onPreview(version);
        }
    };

    const getVersionTypeColor = (type) => {
        switch (type) {
            case 'major': return 'red';
            case 'minor': return 'orange';
            case 'patch': return 'blue';
            case 'auto': return 'default';
            default: return 'default';
        }
    };

    const getVersionTypeLabel = (type) => {
        switch (type) {
            case 'major': return 'Mayor';
            case 'minor': return 'Menor';
            case 'patch': return 'Parche';
            case 'auto': return 'Auto';
            default: return type;
        }
    };

    if (!versions || versions.length === 0) {
        return (
            <Card>
                <Empty
                    image={<HistoryOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                    description="No hay versiones guardadas"
                />
            </Card>
        );
    }

    return (
        <>
            <Card
                title={
                    <Space>
                        <HistoryOutlined />
                        <Title level={5} style={{ margin: 0 }}>Historial de Versiones</Title>
                    </Space>
                }
            >
                <Timeline
                    items={versions.map((version, index) => {
                        const isCurrent = version.id === currentVersion;
                        const versionTimeAgo = timeAgo(version.createdAt);

                        return {
                            color: isCurrent ? 'green' : 'blue',
                            dot: isCurrent ? <SaveOutlined /> : <ClockCircleOutlined />,
                            children: (
                                <div key={version.id}>
                                    <Space orientation="vertical" style={{ width: '100%' }} size="small">
                                        <Space wrap>
                                            <Tag color={getVersionTypeColor(version.type)}>
                                                v{version.version}
                                            </Tag>
                                            {isCurrent && (
                                                <Tag color="success">Actual</Tag>
                                            )}
                                            {version.type && (
                                                <Tag>{getVersionTypeLabel(version.type)}</Tag>
                                            )}
                                        </Space>

                                        {version.comment && (
                                            <Text strong>{version.comment}</Text>
                                        )}

                                        <Space size="small">
                                            <UserOutlined style={{ fontSize: 12 }} />
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                {version.userName || 'Usuario'}
                                            </Text>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                • {versionTimeAgo}
                                            </Text>
                                        </Space>

                                        {version.changes && (
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                {version.changes.sections && `${version.changes.sections} secciones modificadas`}
                                                {version.changes.seo && ` • SEO actualizado`}
                                            </Text>
                                        )}

                                        <Space>
                                            <Tooltip title="Vista previa">
                                                <Button
                                                    size="small"
                                                    icon={<EyeOutlined />}
                                                    onClick={() => handlePreview(version)}
                                                />
                                            </Tooltip>
                                            {!isCurrent && (
                                                <Tooltip title="Restaurar esta versión">
                                                    <Button
                                                        size="small"
                                                        icon={<RollbackOutlined />}
                                                        onClick={() => handleRestore(version)}
                                                    >
                                                        Restaurar
                                                    </Button>
                                                </Tooltip>
                                            )}
                                        </Space>
                                    </Space>
                                </div>
                            )
                        };
                    })}
                />
            </Card>

            <Modal
                title={`Vista Previa - Versión ${selectedVersion?.version}`}
                open={previewVisible}
                onCancel={() => setPreviewVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setPreviewVisible(false)}>
                        Cerrar
                    </Button>,
                    selectedVersion && selectedVersion.id !== currentVersion && (
                        <Button
                            key="restore"
                            type="primary"
                            icon={<RollbackOutlined />}
                            onClick={() => {
                                handleRestore(selectedVersion);
                                setPreviewVisible(false);
                            }}
                        >
                            Restaurar
                        </Button>
                    )
                ]}
                width="80%"
            >
                {selectedVersion && (
                    <Space orientation="vertical" style={{ width: '100%' }}>
                        <Descriptions column={2} size="small" bordered>
                            <Descriptions.Item label="Versión">
                                v{selectedVersion.version}
                            </Descriptions.Item>
                            <Descriptions.Item label="Fecha">
                                {new Date(selectedVersion.createdAt).toLocaleString()}
                            </Descriptions.Item>
                            <Descriptions.Item label="Autor">
                                {selectedVersion.userName || 'Usuario'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Tipo">
                                <Tag color={getVersionTypeColor(selectedVersion.type)}>
                                    {getVersionTypeLabel(selectedVersion.type)}
                                </Tag>
                            </Descriptions.Item>
                            {selectedVersion.comment && (
                                <Descriptions.Item label="Comentario" span={2}>
                                    {selectedVersion.comment}
                                </Descriptions.Item>
                            )}
                        </Descriptions>

                        <Card
                            title="Resumen de Cambios"
                            size="small"
                            style={{ marginTop: 16 }}
                        >
                            {selectedVersion.changes ? (
                                <Space orientation="vertical">
                                    {selectedVersion.changes.sections && (
                                        <Text>• {selectedVersion.changes.sections} secciones modificadas</Text>
                                    )}
                                    {selectedVersion.changes.seo && (
                                        <Text>• Metadata SEO actualizado</Text>
                                    )}
                                    {selectedVersion.changes.approval && (
                                        <Text>• Estado de aprobación cambiado</Text>
                                    )}
                                </Space>
                            ) : (
                                <Text type="secondary">Sin información de cambios</Text>
                            )}
                        </Card>
                    </Space>
                )}
            </Modal>
        </>
    );
};

export default PageVersionHistory;
