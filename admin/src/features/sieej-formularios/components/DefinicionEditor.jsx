import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Input, Segmented, Space } from 'antd';
import { SaveOutlined, BlockOutlined, CodeOutlined, PlusOutlined } from '@ant-design/icons';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';
import useSearchParamState from '../hooks/useSearchParamState';
import { formulariosApi } from '../services/formulariosAdminApi';
import StepsList from './visualEditor/StepsList';

const EMPTY_DEFINICION = { version: 1, steps: [] };

export default function DefinicionEditor({ formulario, onSaved }) {
    const { isMobile } = useIsMobile();
    const [viewFromUrl, setView] = useSearchParamState('vista', 'visual');
    const view = viewFromUrl === 'json' ? 'json' : 'visual';
    const [definicion, setDefinicion] = useState(EMPTY_DEFINICION);
    const [jsonText, setJsonText] = useState('');
    const [error, setError] = useState(null);
    const [conflicto, setConflicto] = useState(null);
    const [saving, setSaving] = useState(false);
    const [stepAddTrigger, setStepAddTrigger] = useState(null);

    const handleRecargar = async () => {
        const fresco = await formulariosApi.get(formulario.id);
        setDefinicion(fresco.definicion);
        setJsonText(JSON.stringify(fresco.definicion, null, 2));
        setConflicto(null);
        onSaved?.(fresco);
        message.info('Se cargó la versión vigente del formulario.');
    };

    useEffect(() => {
        if (formulario?.definicion) {
            setDefinicion(formulario.definicion);
            setJsonText(JSON.stringify(formulario.definicion, null, 2));
        }
    }, [formulario?.id, formulario?.definicion]);

    const handleStepsChange = (newSteps) => {
        const next = { ...definicion, steps: newSteps };
        setDefinicion(next);
        setJsonText(JSON.stringify(next, null, 2));
    };

    const handleViewChange = (next) => {
        if (next === 'json') {
            setJsonText(JSON.stringify(definicion, null, 2));
        } else {
            try {
                const parsed = JSON.parse(jsonText);
                setDefinicion(parsed);
            } catch (err) {
                setError(`JSON inválido al cambiar a visual: ${err.message}`);
                return;
            }
        }
        setError(null);
        setView(next === 'visual' ? null : next);
    };

    const payload = useMemo(() => {
        if (view === 'json') {
            try { return JSON.parse(jsonText); } catch { return null; }
        }
        return definicion;
    }, [view, jsonText, definicion]);

    const handleSave = async () => {
        if (payload == null) {
            setError('JSON inválido — corrige antes de guardar.');
            return;
        }
        setError(null);
        setSaving(true);
        try {
            const updated = await formulariosApi.update(formulario.id, {
                definicion: payload,
                actualizado_en_esperado: formulario.actualizado_en,
            });
            const cambio = updated?.ultimo_cambio;
            if (!cambio) {
                message.success('Definición actualizada');
            } else if (cambio.tipo === 'menor') {
                message.success('Cambio menor aplicado a todos los envíos en proceso');
            } else {
                const partes = [`Cambio estructural (v${updated.version}).`];
                if (cambio.afectados) {
                    partes.push(`Se avisará a ${cambio.afectados} persona(s) que lo están llenando.`);
                }
                if (cambio.reabiertos) {
                    partes.push(`${cambio.reabiertos} envío(s) ya completados se reabrieron para reenvío.`);
                }
                partes.push('Las respuestas capturadas se conservan.');
                message.warning(partes.join(' '));
            }
            onSaved?.(updated);
            setDefinicion(updated.definicion);
            setJsonText(JSON.stringify(updated.definicion, null, 2));
        } catch (err) {
            const detail = err?.response?.data?.detail;
            if (err?.response?.status === 409) {
                setConflicto(typeof detail === 'string' ? detail : 'Otra persona guardó cambios.');
            } else {
                setError(typeof detail === 'string' ? detail : 'Error al guardar (validación de definición fallo)');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {error && <Alert type="error" showIcon message={error} closable onClose={() => setError(null)} />}

            {conflicto && (
                <Alert
                    type="warning"
                    showIcon
                    message="Este formulario cambió mientras lo editabas"
                    description={conflicto}
                    action={<Button size="small" onClick={handleRecargar}>Recargar</Button>}
                />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Segmented
                    value={view}
                    onChange={handleViewChange}
                    options={[
                        { value: 'visual', label: 'Visual', icon: <BlockOutlined /> },
                        { value: 'json', label: 'JSON', icon: <CodeOutlined /> },
                    ]}
                />
                <Space size="small">
                    {view === 'visual' && (
                        <Button
                            type="dashed"
                            icon={<PlusOutlined />}
                            onClick={() => setStepAddTrigger({ ts: Date.now() })}
                        >
                            {isMobile ? null : 'Agregar paso'}
                        </Button>
                    )}
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={saving}
                        onClick={handleSave}
                    >
                        {isMobile ? null : 'Guardar formulario'}
                    </Button>
                </Space>
            </div>

            {view === 'visual' ? (
                <StepsList
                    steps={definicion.steps ?? []}
                    formularioSlug={formulario?.slug}
                    onChange={handleStepsChange}
                    stepAddTrigger={stepAddTrigger}
                />
            ) : (
                <Input.TextArea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    autoSize={{ minRows: 24, maxRows: 60 }}
                    style={{ fontFamily: 'monospace', fontSize: 13 }}
                />
            )}
        </Space>
    );
}
