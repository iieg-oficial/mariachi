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
    const vacia = !currentConfig || Object.keys(currentConfig).length === 0;
    const soloLlamada = vacia && mode === 'lienzo';

    return (
        <>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: soloLlamada ? 'flex-end' : 'space-between',
                gap: 12,
                marginBottom: 8,
            }}>
                {!soloLlamada && (
                    <Space size={4}>
                        <Text strong>Configuración del cuadro</Text>
                        <Tooltip title="Bloques que componen el cuadro que aparece al hacer click sobre una feature en el visor. Cada bloque —encabezado, etiquetas, cards, lista, íconos, texto— se agrega o se quita según necesites, y se puede duplicar para ponerlo en dos lugares distintos. En modo JSON se copia y pega la tarjetita completa entre entornos.">
                            <QuestionCircleOutlined style={{ color: '#8c8c8c', cursor: 'help' }} />
                        </Tooltip>
                    </Space>
                )}
                <Space size={8}>
                    {!vacia && (
                        <Button
                            size="small"
                            icon={<AppstoreAddOutlined />}
                            onClick={() => setTemplatesOpen(true)}
                        >
                            Plantillas
                        </Button>
                    )}
                    <InfoBoxModeSwitch value={mode} onChange={onModeChange} />
                </Space>
            </div>

            {vacia && (
                <div style={{
                    border: '1px dashed #d9cfe0',
                    borderRadius: 8,
                    padding: '32px 20px',
                    textAlign: 'center',
                    marginBottom: soloLlamada ? 0 : 16,
                    minHeight: soloLlamada ? 'calc(100vh - 300px)' : undefined,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                }}>
                    <Text strong>Esta capa todavía no tiene tarjetita</Text>
                    <Text type="secondary" style={{ fontSize: 12, marginBottom: 10, maxWidth: '42ch' }}>
                        Empieza con una forma ya armada o copia la de otra capa. Después la ajustas.
                    </Text>
                    <Button
                        type="primary"
                        icon={<AppstoreAddOutlined />}
                        onClick={() => setTemplatesOpen(true)}
                    >
                        Elegir una plantilla
                    </Button>
                </div>
            )}
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
