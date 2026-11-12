import { useState } from 'react';
import { Button } from 'antd';
import { message } from '@shared/services/message';
import {
    approveDraft,
    discardDraft,
    fetchHistory,
    fetchUnpublished,
    reapplyDraft,
} from '@features/mapalab-layers/services/stylesBatchService';
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

export function UnpublishedTab({ canPublish }) {
    return (
        <DraftList
            load={fetchUnpublished}
            actions={canPublish ? [PUBLISH, DISCARD] : []}
            empty="No hay estilos sin publicar"
            header={canPublish ? (items, reload) => <PublishAll items={items} reload={reload} /> : undefined}
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
