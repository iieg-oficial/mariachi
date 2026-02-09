import { Typography, Space, Button, Badge, Tag } from 'antd';
import { PlusOutlined, SaveOutlined, UndoOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import DisabledFeature from '@components/common/DisabledFeature';

const { Title } = Typography;

export default function MenuHeader({
    hasChanges,
    changesCount,
    publishing,
    onDiscard,
    onPublish
}) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Title level={2} style={{ margin: 0 }}>Gestión de Menú</Title>
                {hasChanges && (
                    <Badge count={changesCount} overflowCount={99}>
                        <Tag color="orange" style={{ padding: '4px 12px', fontSize: 14 }}>
                            <ExclamationCircleOutlined /> Cambios sin publicar
                        </Tag>
                    </Badge>
                )}
            </div>
            <Space>
                {hasChanges && (
                    <>
                        <Button
                            icon={<UndoOutlined />}
                            onClick={onDiscard}
                        >
                            Descartar cambios
                        </Button>
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            onClick={onPublish}
                            loading={publishing}
                        >
                            Publicar cambios
                        </Button>
                    </>
                )}
                <DisabledFeature>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        disabled
                        ghost={hasChanges}
                    >
                        Nuevo Item de Nivel Superior
                    </Button>
                </DisabledFeature>
            </Space>
        </div>
    );
}
