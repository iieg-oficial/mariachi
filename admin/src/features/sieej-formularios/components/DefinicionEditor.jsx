import { useEffect, useState } from 'react';
import { Alert, Button, Input, Space, Typography } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';
import { formulariosApi } from '../services/formulariosAdminApi';

const { Paragraph, Text } = Typography;

export default function DefinicionEditor({ formulario, onSaved }) {
    const [jsonText, setJsonText] = useState('');
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (formulario?.definicion) {
            setJsonText(JSON.stringify(formulario.definicion, null, 2));
        }
    }, [formulario?.id, formulario?.definicion]);

    const handleSave = async () => {
        let parsed;
        try {
            parsed = JSON.parse(jsonText);
        } catch (err) {
            setError(`JSON inválido: ${err.message}`);
            return;
        }
        setError(null);
        setSaving(true);
        try {
            const updated = await formulariosApi.update(formulario.id, { definicion: parsed });
            message.success('Definición actualizada');
            onSaved?.(updated);
        } catch (err) {
            const detail = err?.response?.data?.detail;
            setError(typeof detail === 'string' ? detail : 'Error al guardar (validación de definición fallo)');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Alert
                type="info"
                showIcon
                message="Editor JSON de la definición"
                description={
                    <Paragraph style={{ margin: 0 }}>
                        El backend valida la estructura antes de guardar. Si el formulario ya tiene envíos
                        y la <Text code>definición</Text> cambia, la versión se incrementa y los envíos
                        existentes mantienen su snapshot.
                    </Paragraph>
                }
            />
            {error && <Alert type="error" showIcon message={error} closable onClose={() => setError(null)} />}
            <Input.TextArea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                autoSize={{ minRows: 24, maxRows: 60 }}
                style={{ fontFamily: 'monospace', fontSize: 13 }}
            />
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
                Guardar definición
            </Button>
        </Space>
    );
}
