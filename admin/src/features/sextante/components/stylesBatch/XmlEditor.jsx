import { useState } from 'react';
import { Button, Input, Space } from 'antd';
import { message } from '@shared/services/message';
import { batchErrorMessage, saveXmlDraft } from '@features/sextante/api/stylesBatchService';

const XML_STYLE = { fontFamily: 'monospace', fontSize: 12 };

export default function XmlEditor({ alias, style, layerName, initial, onSaved, onCancel }) {
    const [xml, setXml] = useState(initial || '');
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            await saveXmlDraft({ alias, style, layerName, xml });
            message.success('Borrador guardado en Sin publicar');
            onSaved();
        } catch (err) {
            message.error(batchErrorMessage(err, 'No se pudo guardar'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Input.TextArea
                value={xml}
                onChange={(e) => setXml(e.target.value)}
                autoSize={{ minRows: 12, maxRows: 28 }}
                spellCheck={false}
                style={XML_STYLE}
                aria-label="SLD en XML"
            />
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button shape="round" onClick={onCancel}>Cancelar</Button>
                <Button
                    type="primary"
                    shape="round"
                    loading={saving}
                    disabled={!xml.trim() || xml === initial}
                    onClick={save}
                >
                    Guardar borrador
                </Button>
            </Space>
        </Space>
    );
}
