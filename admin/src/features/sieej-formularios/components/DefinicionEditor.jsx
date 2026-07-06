import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Input, Segmented, Space } from 'antd';
import { SaveOutlined, BlockOutlined, CodeOutlined } from '@ant-design/icons';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';
import { formulariosApi } from '../services/formulariosAdminApi';
import StepsList from './visualEditor/StepsList';

const EMPTY_DEFINICION = { version: 1, steps: [] };

export default function DefinicionEditor({ formulario, onSaved }) {
    const { isMobile } = useIsMobile();
    const [view, setView] = useState('visual');
    const [definicion, setDefinicion] = useState(EMPTY_DEFINICION);
    const [jsonText, setJsonText] = useState('');
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

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
        setView(next);
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
            const updated = await formulariosApi.update(formulario.id, { definicion: payload });
            message.success('Definición actualizada');
            onSaved?.(updated);
            setDefinicion(updated.definicion);
            setJsonText(JSON.stringify(updated.definicion, null, 2));
        } catch (err) {
            const detail = err?.response?.data?.detail;
            setError(typeof detail === 'string' ? detail : 'Error al guardar (validación de definición fallo)');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {error && <Alert type="error" showIcon message={error} closable onClose={() => setError(null)} />}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <Segmented
                    value={view}
                    onChange={handleViewChange}
                    options={[
                        { value: 'visual', label: 'Visual', icon: <BlockOutlined /> },
                        { value: 'json', label: 'JSON', icon: <CodeOutlined /> },
                    ]}
                />
                <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
                    {isMobile ? null : 'Guardar definición'}
                </Button>
            </div>

            {view === 'visual' ? (
                <StepsList
                    steps={definicion.steps ?? []}
                    onChange={handleStepsChange}
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
