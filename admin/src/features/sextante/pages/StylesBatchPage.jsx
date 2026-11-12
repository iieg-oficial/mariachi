import { useState } from 'react';
import { Link } from 'react-router';
import { Badge, Breadcrumb, Layout } from 'antd';
import { ArrowLeftOutlined, HistoryOutlined, InboxOutlined } from '@ant-design/icons';
import { useAuth } from '@shared/contexts/useAuth';
import { message } from '@shared/services/message';
import useIsMobile from '@shared/hooks/useIsMobile';
import { batchErrorMessage, editDrafts, fetchUnpublished } from '@features/sextante/api/stylesBatchService';
import { saveBatch } from '@features/sextante/utils/stylesBatchStorage';
import { isXmlDraft } from '@features/sextante/utils/stylesBatchTable';
import useDraftItems from '@features/sextante/hooks/useDraftItems';
import PageHeader from '@features/sextante/components/PageHeader';
import BatchWizard from '@features/sextante/components/stylesBatch/BatchWizard';
import IconAction from '@features/sextante/components/stylesBatch/IconAction';
import { BulkActions, HistoryTab, UnpublishedTab } from '@features/sextante/components/stylesBatch/DraftTabs';

const { Content } = Layout;

const PUBLISH_PERMISSION = 'mariachi.mapalab.manage';
const PAGE_TIP = 'Sube la tabla de estilos coropléticos, revisa cada fila y guarda un borrador por estilo.';
const GROUP_STYLE = {
    display: 'inline-flex',
    gap: 8,
    padding: 4,
    marginInlineStart: 8,
    borderRadius: 999,
    background: 'var(--ant-color-fill-tertiary)',
};

export default function StylesBatchPage() {
    const { user } = useAuth();
    const { isMobile } = useIsMobile();
    const [view, setView] = useState('nuevo');
    const [wizardKey, setWizardKey] = useState(0);
    const unpublished = useDraftItems(fetchUnpublished);
    const canPublish = Boolean(user?.permissions?.includes?.(PUBLISH_PERMISSION));
    const pending = unpublished.items?.length || 0;

    const editInBatch = async (drafts) => {
        try {
            const editable = drafts.filter((d) => !isXmlDraft(d));
            const rows = await editDrafts(editable.map((d) => d.id));
            saveBatch({ step: 1, rows, drafts: [], replacing: editable.map((d) => d.id) });
            setWizardKey((k) => k + 1);
            setView('nuevo');
        } catch (err) {
            message.error(batchErrorMessage(err, 'No se pudieron abrir los borradores'));
        }
    };

    const show = (next) => () => {
        const target = view === next ? 'nuevo' : next;
        if (target === 'sin-publicar') unpublished.reload();
        setView(target);
    };

    const actions = (
        <>
            <Badge count={pending} size="small" offset={[-4, 4]}>
                <IconAction
                    title={`Sin publicar (${pending})`}
                    icon={<InboxOutlined />}
                    active={view === 'sin-publicar'}
                    onClick={show('sin-publicar')}
                />
            </Badge>
            <IconAction title="Historial de lo publicado" icon={<HistoryOutlined />} active={view === 'historial'} onClick={show('historial')} />
            {view === 'sin-publicar' && (
                <div role="group" aria-label="Acciones para todos los borradores" style={GROUP_STYLE}>
                    <BulkActions
                        items={unpublished.items}
                        reload={unpublished.reload}
                        canPublish={canPublish}
                        onEditAll={editInBatch}
                    />
                </div>
            )}
        </>
    );

    const breadcrumb = (
        <Breadcrumb items={[
            { title: 'Sextante' },
            { title: <Link to="/sextante/estilos">Estilos</Link> },
            { title: 'En lote' },
        ]} />
    );

    return (
        <Content style={{ padding: isMobile ? 6 : 24, display: 'grid', gap: 16 }}>
            <PageHeader
                title="Estilos en lote"
                tip={PAGE_TIP}
                actions={actions}
                before={breadcrumb}
                back={view !== 'nuevo' && (
                    <IconAction title="Volver a los pasos" icon={<ArrowLeftOutlined />} onClick={() => setView('nuevo')} />
                )}
            />
            {view === 'nuevo' && <BatchWizard key={wizardKey} canPublish={canPublish} />}
            {view === 'sin-publicar' && (
                <UnpublishedTab items={unpublished.items} reload={unpublished.reload} canPublish={canPublish} />
            )}
            {view === 'historial' && <HistoryTab canPublish={canPublish} />}
        </Content>
    );
}
