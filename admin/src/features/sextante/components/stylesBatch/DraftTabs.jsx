import { useState } from 'react';
import { CloudUploadOutlined, DeleteOutlined, EditOutlined, RollbackOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';
import { approveDraft, discardDraft, fetchHistory, reapplyDraft } from '@features/sextante/api/stylesBatchService';
import useDraftItems from '@features/sextante/hooks/useDraftItems';
import DraftList from './DraftList';
import IconAction from './IconAction';

const PUBLISH = {
    key: 'publicar', label: 'Publicar', icon: <CloudUploadOutlined />,
    confirm: '¿Publicar este estilo en el visor?', done: 'Publicado', run: (d) => approveDraft(d.id),
};
const DISCARD = {
    key: 'descartar', label: 'Descartar', icon: <DeleteOutlined />, danger: true,
    confirm: '¿Descartar este borrador?', done: 'Borrador descartado', run: (d) => discardDraft(d.id),
};
const REAPPLY = {
    key: 'reaplicar', label: 'Volver a este', icon: <RollbackOutlined />,
    confirm: '¿Volver a publicar esta versión?', done: 'Versión publicada de nuevo', run: (d) => reapplyDraft(d.id),
};

const runAll = async (items, task, done) => {
    let failed = 0;
    for (const item of items) {
        try {
            await task(item.id);
        } catch {
            failed += 1;
        }
    }
    if (failed) message.error(`${failed} de ${items.length} no se pudieron`);
    else message.success(done);
};

export function BulkActions({ items, reload, canPublish, onEditAll }) {
    const [busy, setBusy] = useState(null);
    const count = items?.length || 0;

    const run = (key, task) => async () => {
        setBusy(key);
        try {
            await task();
        } finally {
            setBusy(null);
            reload();
        }
    };

    return (
        <>
            <IconAction
                title={`Editar los ${count} en la revisión`}
                icon={<EditOutlined />}
                disabled={!count}
                loading={busy === 'editar'}
                onClick={run('editar', () => onEditAll(items))}
            />
            {canPublish && (
                <IconAction
                    title={`Publicar los ${count}`}
                    icon={<CloudUploadOutlined />}
                    disabled={!count}
                    confirm={`¿Publicar los ${count} en el visor?`}
                    loading={busy === 'publicar'}
                    onClick={run('publicar', () => runAll(items, approveDraft, 'Todos publicados'))}
                />
            )}
            {canPublish && (
                <IconAction
                    title={`Descartar los ${count}`}
                    icon={<DeleteOutlined />}
                    danger
                    disabled={!count}
                    confirm={`¿Descartar los ${count} borradores?`}
                    loading={busy === 'descartar'}
                    onClick={run('descartar', () => runAll(items, discardDraft, 'Borradores descartados'))}
                />
            )}
        </>
    );
}

export function UnpublishedTab({ items, reload, canPublish }) {
    return (
        <DraftList
            items={items}
            reload={reload}
            actions={canPublish ? [PUBLISH, DISCARD] : []}
            empty="No hay estilos sin publicar"
            editable
        />
    );
}

export function HistoryTab({ canPublish }) {
    const { items, reload } = useDraftItems(fetchHistory);
    return (
        <DraftList
            items={items}
            reload={reload}
            actions={canPublish ? [REAPPLY] : []}
            empty="Todavía no se publica ningún lote"
        />
    );
}
