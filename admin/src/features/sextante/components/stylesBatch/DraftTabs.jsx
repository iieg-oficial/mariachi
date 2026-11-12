import { useState } from 'react';
import { Button, Space } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';
import {
    approveDraft,
    discardDraft,
    fetchHistory,
    fetchUnpublished,
    reapplyDraft,
} from '@features/sextante/api/stylesBatchService';
import DraftList from './DraftList';

const PUBLISH = { label: 'Publicar', confirm: '¿Publicar este estilo en el visor?', done: 'Publicado', run: (d) => approveDraft(d.id) };
const DISCARD = { label: 'Descartar', confirm: '¿Descartar este borrador?', done: 'Borrador descartado', danger: true, run: (d) => discardDraft(d.id) };
const REAPPLY = { label: 'Volver a este', confirm: '¿Volver a publicar esta versión?', done: 'Versión publicada de nuevo', run: (d) => reapplyDraft(d.id) };

function PublishAll({ items, reload }) {
    const [publishing, setPublishing] = useState(false);
    const publishAll = async () => {
        setPublishing(true);
        let failed = 0;
        for (const item of items) {
            try {
                await approveDraft(item.id);
            } catch {
                failed += 1;
            }
        }
        setPublishing(false);
        if (failed) message.error(`${failed} no se publicaron`);
        else message.success('Todos publicados');
        reload();
    };
    return (
        <Button type="primary" shape="round" loading={publishing} onClick={publishAll}>
            Publicar {items.length}
        </Button>
    );
}

function UnpublishedHeader({ items, reload, canPublish, onEdit }) {
    const [opening, setOpening] = useState(false);
    const editAll = async () => {
        setOpening(true);
        await onEdit(items);
        setOpening(false);
    };
    return (
        <Space wrap style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button shape="round" icon={<EditOutlined />} loading={opening} onClick={editAll}>
                Editar {items.length}
            </Button>
            {canPublish && <PublishAll items={items} reload={reload} />}
        </Space>
    );
}

export function UnpublishedTab({ canPublish, onEdit, onCount }) {
    return (
        <DraftList
            load={fetchUnpublished}
            actions={canPublish ? [PUBLISH, DISCARD] : []}
            empty="No hay estilos sin publicar"
            onEdit={onEdit}
            onCount={onCount}
            header={(items, reload) => (
                <UnpublishedHeader items={items} reload={reload} canPublish={canPublish} onEdit={onEdit} />
            )}
        />
    );
}

export function HistoryTab({ canPublish }) {
    return (
        <DraftList
            load={fetchHistory}
            actions={canPublish ? [REAPPLY] : []}
            empty="Todavía no se publica ningún lote"
        />
    );
}
