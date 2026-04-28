import { useMemo, useState } from 'react';
import { Alert, Button, Drawer, Input, Space, Table, Tag, Typography } from 'antd';
import { useLayerTreeAdmin } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';

const { Text, Paragraph } = Typography;

const parsePaste = (text) => {
    if (!text) return [];
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const rows = [];
    for (const line of lines) {
        const cols = line.split(/\t|;|,(?=\s*[A-Za-z_])/);
        if (cols.length < 2) continue;
        const id = cols[0].trim();
        if (!id) continue;
        const tagsCol = cols.slice(1).join(',');
        const tags = tagsCol
            .split(/[,|]/)
            .map((t) => t.trim())
            .filter(Boolean);
        rows.push({ id, tags });
    }
    return rows;
};

export default function BulkTagsDrawer({ open, onClose, onDone }) {
    const { isMobile } = useIsMobile();
    const { bulkUpdateTags } = useLayerTreeAdmin();
    const [text, setText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);

    const parsed = useMemo(() => parsePaste(text), [text]);

    const handleSubmit = async () => {
        if (parsed.length === 0) {
            message.warning('No hay filas válidas para enviar');
            return;
        }
        setSubmitting(true);
        setResult(null);
        try {
            const res = await bulkUpdateTags(parsed);
            setResult(res);
            message.success(`${res.updated} capas actualizadas`);
            if ((res.not_found || []).length === 0) {
                onDone?.();
            }
        } catch (err) {
            message.error(err.response?.data?.detail || 'Error en bulk update');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setText('');
        setResult(null);
        onClose();
    };

    const columns = [
        { title: 'Layer ID', dataIndex: 'id', key: 'id', width: 240 },
        {
            title: 'Tags',
            dataIndex: 'tags',
            key: 'tags',
            render: (tags) => (
                <Space size={[4, 4]} wrap>
                    {tags.map((t) => (
                        <Tag key={t} color="blue">{t}</Tag>
                    ))}
                </Space>
            ),
        },
    ];

    return (
        <Drawer
            title="Edición masiva de tags"
            placement={isMobile ? 'bottom' : 'right'}
            styles={{
                wrapper: isMobile
                    ? { width: '100%', height: '92%' }
                    : { width: 720 }
            }}
            open={open}
            onClose={handleClose}
            extra={
                <Space wrap size={[8, 8]}>
                    <Button onClick={handleClose}>Cerrar</Button>
                    <Button
                        type="primary"
                        loading={submitting}
                        disabled={parsed.length === 0}
                        onClick={handleSubmit}
                    >
                        Aplicar a {parsed.length} capa{parsed.length === 1 ? '' : 's'}
                    </Button>
                </Space>
            }
        >
            <Paragraph type="secondary">
                Pega filas desde Excel/Sheets. Formato: <Text code>layer_id</Text> TAB <Text code>tag1, tag2, tag3</Text>.
                Máximo 500 capas por request.
            </Paragraph>
            <Input.TextArea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                placeholder={'homicidios_por_municipio\tseguridad, delito\nfeminicidios\tseguridad, genero, feminicidio'}
                style={{ fontFamily: 'monospace', marginBottom: 16 }}
            />
            {parsed.length > 0 && (
                <Table
                    size="small"
                    rowKey="id"
                    dataSource={parsed}
                    columns={columns}
                    pagination={{ pageSize: 10, simple: isMobile }}
                    scroll={{ x: 'max-content' }}
                    style={{ marginBottom: 16 }}
                />
            )}
            {result && (
                <Alert
                    type={result.not_found?.length ? 'warning' : 'success'}
                    title={`${result.updated} actualizadas`}
                    description={
                        result.not_found?.length
                            ? `No encontradas: ${result.not_found.join(', ')}`
                            : 'Todas las capas existían'
                    }
                />
            )}
        </Drawer>
    );
}
