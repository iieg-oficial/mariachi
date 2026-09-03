import { useState } from 'react';
import { Button, Space, Tooltip, Typography } from 'antd';
import { AppstoreAddOutlined, EditOutlined, EyeOutlined, QuestionCircleOutlined } from '@ant-design/icons';

import InfoBoxEditor from './InfoBoxEditor';
import InfoBoxModeSwitch from './InfoBoxModeSwitch';
import InfoBoxPreviewPanel from './InfoBoxPreviewPanel';
import InfoBoxTemplatesModal from './InfoBoxTemplatesModal';
import PropagacionBadge from './PropagacionBadge';

const { Text } = Typography;

const AYUDA = 'Bloques que componen el cuadro que aparece al hacer click sobre una feature en el visor. '
    + 'Cada bloque —encabezado, etiquetas, cards, lista, íconos, texto— se agrega o se quita según '
    + 'necesites, y se puede duplicar para ponerlo en dos lugares distintos. En modo JSON se copia y '
    + 'pega la tarjetita completa entre entornos.';

export default function TarjetitaEditor({
    value,
    onChange,
    availableFields = [],
    fieldsLoading = false,
    hasFeatureType = true,
    rawTree = [],
    currentLayerId = null,
    inherited = null,
    nodeType = null,
    onIrACapa = null,
    updateLayer = null,
    reloadTree = null,
    puedePublicar = false,
}) {
    const [mode, setMode] = useState('lienzo');
    const [soloVista, setSoloVista] = useState(false);
    const [plantillasAbiertas, setPlantillasAbiertas] = useState(false);

    const vacia = !value || Object.keys(value).length === 0;
    const soloLlamada = vacia && !inherited && mode === 'lienzo';
    const esLienzo = mode === 'lienzo';
    const previewValue = (!esLienzo && (value || inherited?.config)) || null;

    const alternarVista = () => { setSoloVista((v) => !v); };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: (soloLlamada || soloVista) ? 'flex-end' : 'space-between',
                gap: 12,
                marginBottom: 8,
            }}>
                {!soloLlamada && !soloVista && (
                    <Space size={4}>
                        <Text strong>Configuración del cuadro</Text>
                        <Tooltip title={AYUDA}>
                            <QuestionCircleOutlined style={{ color: '#8c8c8c', cursor: 'help' }} />
                        </Tooltip>
                    </Space>
                )}
                <Space size={8}>
                    {nodeType === 'group' && !soloVista && (
                        <PropagacionBadge
                            rawTree={rawTree}
                            groupId={currentLayerId}
                            onIrACapa={onIrACapa}
                            updateLayer={updateLayer}
                            reload={reloadTree}
                            configDelGrupo={value}
                            puedePublicar={puedePublicar}
                        />
                    )}
                    {esLienzo && !soloLlamada && (
                        <Tooltip title={soloVista ? 'Volver a editar' : 'Ver cómo queda'}>
                            <Button
                                size="small"
                                icon={soloVista ? <EditOutlined /> : <EyeOutlined />}
                                onClick={alternarVista}
                                aria-label={soloVista ? 'Volver a editar' : 'Ver cómo queda'}
                            />
                        </Tooltip>
                    )}
                    {!soloVista && <InfoBoxModeSwitch value={mode} onChange={setMode} />}
                </Space>
            </div>

            {soloLlamada ? (
                <div style={{
                    flex: 1,
                    minHeight: 220,
                    border: '1px dashed #d9cfe0',
                    borderRadius: 8,
                    padding: '32px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    gap: 4,
                }}>
                    <Text strong>Esta capa todavía no tiene tarjetita</Text>
                    <Text type="secondary" style={{ fontSize: 12, marginBottom: 10, maxWidth: '42ch' }}>
                        Empieza con una forma ya armada o copia la de otra capa. Después la ajustas.
                    </Text>
                    <Button
                        type="primary"
                        icon={<AppstoreAddOutlined />}
                        onClick={() => setPlantillasAbiertas(true)}
                    >
                        Elegir una plantilla
                    </Button>
                </div>
            ) : (
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 24,
                    minWidth: 0,
                    justifyContent: soloVista ? 'center' : undefined,
                }}>
                    <div style={{ flex: soloVista ? '0 0 auto' : '1 1 340px', minWidth: 0 }}>
                        <InfoBoxEditor
                            value={value}
                            onChange={onChange}
                            mode={mode}
                            availableFields={availableFields}
                            inherited={inherited}
                            nodeType={nodeType}
                            soloVista={soloVista}
                            onAbrirPlantillas={() => setPlantillasAbiertas(true)}
                            onIrACapa={onIrACapa}
                        />
                    </div>
                    {previewValue && (
                        <div style={{ flex: '0 1 300px', minWidth: 0 }}>
                            <div style={{ position: 'sticky', top: 0 }}>
                                <InfoBoxPreviewPanel
                                    value={value}
                                    inherited={inherited}
                                    hasFeatureType={hasFeatureType}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            <InfoBoxTemplatesModal
                open={plantillasAbiertas}
                onClose={() => setPlantillasAbiertas(false)}
                onApply={onChange}
                availableFields={availableFields}
                fieldsLoading={fieldsLoading}
                hasFeatureType={hasFeatureType}
                rawTree={rawTree}
                currentConfig={value}
                currentLayerId={currentLayerId}
            />
        </div>
    );
}
