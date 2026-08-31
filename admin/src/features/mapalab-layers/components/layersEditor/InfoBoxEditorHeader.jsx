import { useState } from 'react';
import { Button, Space, Tooltip, Typography } from 'antd';
import { AppstoreAddOutlined, QuestionCircleOutlined } from '@ant-design/icons';
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
                <Space size={4}>
                    <Text strong>Configuración del cuadro</Text>
                    <Tooltip title="Bloques que componen el cuadro que aparece al hacer click sobre una feature en el visor. Cada bloque —encabezado, etiquetas, cards, lista, íconos, texto— se agrega o se quita según necesites, y se puede duplicar para ponerlo en dos lugares distintos. En modo JSON se copia y pega la tarjetita completa entre entornos.">
                        <QuestionCircleOutlined style={{ color: '#8c8c8c', cursor: 'help' }} />
                    </Tooltip>
                </Space>
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
