import { useCallback, useEffect, useState } from 'react';
import { Button, Empty, Popconfirm, Space, Spin, Typography } from 'antd';
import { message } from '@shared/services/message';
import { batchErrorMessage } from '@features/mapalab-layers/services/stylesBatchService';
import ColorRamp from './ColorRamp';
import SldDraftReviewModal from './SldDraftReviewModal';

const { Text } = Typography;

const ITEM_STYLE = { padding: '8px 12px', border: '1px solid var(--ant-color-border)', borderRadius: 8 };

const when = (date) => new Date(date).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

export default function DraftList({ load, actions, empty, header }) {
    const [items, setItems] = useState(null);
    const [viewing, setViewing] = useState(null);
    const [busy, setBusy] = useState(null);

    const reload = useCallback(() => load()
        .then(setItems)
        .catch((err) => {
            setItems([]);
            message.error(batchErrorMessage(err, 'No se pudo cargar la lista'));
        }), [load]);

    useEffect(() => {
        reload();
    }, [reload]);

    const run = async (item, action) => {
        setBusy(`${item.id}-${action.label}`);
        try {
            await action.run(item);
            message.success(action.done);
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
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            {header?.(items, reload)}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {items.map((item) => (
                    <li key={item.id} style={ITEM_STYLE}>
                        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                            <Space wrap>
                                <ColorRamp colors={item.data?.colors || []} />
                                <Text strong>{item.data?.style_title || item.resource_id}</Text>
                                <Text type="secondary">{when(item.actualizado_en)} · {item.usuario?.name || '—'}</Text>
                            </Space>
                            <Space wrap>
                                <Button size="small" shape="round" onClick={() => setViewing(item)}>Ver</Button>
                                {actions.map((action) => (
                                    <Popconfirm key={action.label} title={action.confirm} onConfirm={() => run(item, action)}>
                                        <Button
                                            size="small"
                                            shape="round"
                                            danger={action.danger}
                                            loading={busy === `${item.id}-${action.label}`}
                                        >
                                            {action.label}
                                        </Button>
                                    </Popconfirm>
                                ))}
                            </Space>
                        </Space>
                    </li>
                ))}
            </ul>
            {viewing && <SldDraftReviewModal borrador={viewing} onClose={() => setViewing(null)} />}
        </Space>
    );
}
