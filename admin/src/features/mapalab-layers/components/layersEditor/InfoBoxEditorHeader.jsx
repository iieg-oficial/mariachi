import { useState } from 'react';
import { Button, Space, Typography } from 'antd';
import { AppstoreAddOutlined } from '@ant-design/icons';
import InfoBoxModeSwitch from './InfoBoxModeSwitch';
import InfoBoxTemplatesModal from './InfoBoxTemplatesModal';

const { Text } = Typography;

export default function InfoBoxEditorHeader({
    mode,
    onModeChange,
    onApplyTemplate,
    availableFields = [],
    fieldsLoading = false,
    hasFeatureType = true,
    rawTree = [],
    currentConfig = null,
    currentLayerId = null,
}) {
    const [templatesOpen, setTemplatesOpen] = useState(false);

    return (
        <>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 8,
            }}>
                <Text strong>Configuración del cuadro</Text>
                <Space size={8}>
                    <Button
                        size="small"
                        icon={<AppstoreAddOutlined />}
                        onClick={() => setTemplatesOpen(true)}
                    >
                        Plantillas
                    </Button>
                    <InfoBoxModeSwitch value={mode} onChange={onModeChange} />
                </Space>
            </div>
            <InfoBoxTemplatesModal
                open={templatesOpen}
                onClose={() => setTemplatesOpen(false)}
                onApply={onApplyTemplate}
                availableFields={availableFields}
                fieldsLoading={fieldsLoading}
                hasFeatureType={hasFeatureType}
                rawTree={rawTree}
                currentConfig={currentConfig}
                currentLayerId={currentLayerId}
            />
        </>
    );
}
