import { useState } from 'react';
import { Button, Progress, Space, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router';
import { approveDraft, batchErrorMessage, sendDraftToReview } from '@features/sextante/api/stylesBatchService';
import ColorRamp from './ColorRamp';

const { Text } = Typography;

const STATUS = {
    pending: { color: 'blue', label: 'Borrador' },
    done: { color: 'success', label: 'Publicada' },
    sent: { color: 'warning', label: 'En revisión' },
    failed: { color: 'error', label: 'No se pudo' },
};

const ITEM_STYLE = { padding: '8px 12px', border: '1px solid var(--ant-color-border)', borderRadius: 8 };

export default function ResultStep({ drafts, canPublish }) {
    const navigate = useNavigate();
    const [status, setStatus] = useState({});
    const [publishing, setPublishing] = useState(false);

    const finished = canPublish ? 'done' : 'sent';
    const run = canPublish ? (draft) => approveDraft(draft.id) : sendDraftToReview;
    const done = Object.values(status).filter((s) => s.state !== 'pending').length;
    const pendingDrafts = drafts.filter((d) => (status[d.id]?.state || 'pending') !== finished);

    const runAll = async () => {
        setPublishing(true);
        for (const draft of pendingDrafts) {
            try {
                await run(draft);
                setStatus((prev) => ({ ...prev, [draft.id]: { state: finished } }));
            } catch (err) {
                const error = batchErrorMessage(err, 'No se pudo completar');
                setStatus((prev) => ({ ...prev, [draft.id]: { state: 'failed', error } }));
            }
        }
        setPublishing(false);
    };

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap>
                {canPublish && <Button shape="round" onClick={() => navigate('/revision')}>Ir a Revisión</Button>}
                <Button type="primary" shape="round" loading={publishing} disabled={!pendingDrafts.length} onClick={runAll}>
                    {canPublish ? `Publicar ${pendingDrafts.length} ahora` : `Enviar ${pendingDrafts.length} a revisión`}
                </Button>
            </Space>
            {publishing && <Progress percent={Math.round((done / drafts.length) * 100)} />}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {drafts.map((draft) => {
                    const state = status[draft.id]?.state || 'pending';
                    return (
                        <li key={draft.id} style={ITEM_STYLE}>
                            <Space wrap>
                                <Tag color={STATUS[state].color}>{STATUS[state].label}</Tag>
                                <ColorRamp colors={draft.data.colors} />
                                <Text strong>{draft.data.style_title}</Text>
                                <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>{draft.resource_id}</Text>
                                {status[draft.id]?.error && <Text type="danger">{status[draft.id].error}</Text>}
                            </Space>
                        </li>
                    );
                })}
            </ul>
        </Space>
    );
}
