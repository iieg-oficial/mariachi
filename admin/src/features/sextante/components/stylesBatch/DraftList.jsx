import { useCallback, useState } from 'react';
import { Empty, Space, Spin, Tag, Typography } from 'antd';
import { EditOutlined, EyeOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';
import { batchErrorMessage, editDrafts } from '@features/sextante/api/stylesBatchService';
import { isXmlDraft } from '@features/sextante/utils/stylesBatchTable';
import ColorRamp from './ColorRamp';
import DraftEditor from './DraftEditor';
import DraftPreview from './DraftPreview';
import IconAction from './IconAction';
import XmlEditor from './XmlEditor';

const { Text } = Typography;

const ITEM_STYLE = { padding: '8px 12px', border: '1px solid var(--ant-color-border)', borderRadius: 8, display: 'grid', gap: 12 };

function DraftEdit({ item, onDone, onCancel }) {
    const load = useCallback(() => editDrafts([item.id]), [item.id]);
    if (!isXmlDraft(item)) return <DraftEditor load={load} replacing={[item.id]} onSaved={onDone} onCancel={onCancel} />;
    const [alias, style] = item.resource_id.split(':');
    return (
        <XmlEditor
            alias={alias}
            style={style}
            layerName={item.data?.layer_name}
            initial={item.data?.xml}
            onSaved={onDone}
            onCancel={onCancel}
        />
    );
}

const when = (date) => new Date(date).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

export default function DraftList({ items, reload, actions, empty, editable = false }) {
    const [open, setOpen] = useState(null);
    const [busy, setBusy] = useState(null);

    const toggle = (id, mode) => setOpen((prev) => (prev?.id === id && prev.mode === mode ? null : { id, mode }));

    const run = async (item, action) => {
        setBusy(`${item.id}-${action.key}`);
        try {
            await action.run(item);
            message.success(action.done);
            setOpen(null);
            await reload();
        } catch (err) {
            message.error(batchErrorMessage(err, 'No se pudo completar'));
        } finally {
            setBusy(null);
        }
    };

    if (items === null) return <Spin />;
    if (!items.length) return <Empty description={empty} />;

    return (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {items.map((item) => {
                const mode = open?.id === item.id ? open.mode : null;
                return (
                    <li key={item.id} style={ITEM_STYLE}>
                        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                            <Space wrap>
                                {isXmlDraft(item) ? <Tag>XML</Tag> : <ColorRamp colors={item.data?.colors || []} />}
                                <Text strong>{item.data?.style_title || item.resource_id}</Text>
                                <Text type="secondary">{when(item.actualizado_en)} · {item.usuario?.name || '—'}</Text>
                            </Space>
                            <Space size={6}>
                                <IconAction title="Ver hoy contra borrador" icon={<EyeOutlined />} active={mode === 'ver'} onClick={() => toggle(item.id, 'ver')} />
                                {editable && (
                                    <IconAction title="Editar aquí" icon={<EditOutlined />} active={mode === 'editar'} onClick={() => toggle(item.id, 'editar')} />
                                )}
                                {actions.map((action) => (
                                    <IconAction
                                        key={action.key}
                                        title={action.label}
                                        icon={action.icon}
                                        confirm={action.confirm}
                                        danger={action.danger}
                                        loading={busy === `${item.id}-${action.key}`}
                                        onClick={() => run(item, action)}
                                    />
                                ))}
                            </Space>
                        </Space>
                        {mode === 'ver' && <DraftPreview borrador={item} />}
                        {mode === 'editar' && (
                            <DraftEdit
                                item={item}
                                onCancel={() => setOpen(null)}
                                onDone={() => {
                                    setOpen(null);
                                    reload();
                                }}
                            />
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
