import { useState } from 'react';
import { Link } from 'react-router';
import { Badge, Breadcrumb, Layout } from 'antd';
import { HistoryOutlined, InboxOutlined, PlusOutlined } from '@ant-design/icons';
import { useAuth } from '@shared/contexts/useAuth';
import { message } from '@shared/services/message';
import useIsMobile from '@shared/hooks/useIsMobile';
import { batchErrorMessage, editDrafts, fetchUnpublished } from '@features/sextante/api/stylesBatchService';
import { saveBatch } from '@features/sextante/utils/stylesBatchStorage';
import useDraftItems from '@features/sextante/hooks/useDraftItems';
import PageHeader from '@features/sextante/components/PageHeader';
import BatchWizard from '@features/sextante/components/stylesBatch/BatchWizard';
import IconAction from '@features/sextante/components/stylesBatch/IconAction';
import { BulkActions, HistoryTab, UnpublishedTab } from '@features/sextante/components/stylesBatch/DraftTabs';

const { Content } = Layout;

const PUBLISH_PERMISSION = 'mariachi.mapalab.manage';
const PAGE_TIP = 'Sube la tabla de estilos coropléticos, revisa cada fila y guarda un borrador por estilo.';

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
            const rows = await editDrafts(drafts.map((d) => d.id));
            saveBatch({ step: 1, rows, drafts: [], replacing: drafts.map((d) => d.id) });
            setWizardKey((k) => k + 1);
            setView('nuevo');
        } catch (err) {
            message.error(batchErrorMessage(err, 'No se pudieron abrir los borradores'));
        }
    };

    const show = (next) => () => {
        if (next === 'sin-publicar') unpublished.reload();
        setView(next);
    };

    const actions = (
        <>
            <IconAction title="Nuevo lote" icon={<PlusOutlined />} active={view === 'nuevo'} onClick={show('nuevo')} />
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
                <>
                    <span aria-hidden="true" style={{ width: 12 }} />
                    <BulkActions
                        items={unpublished.items}
                        reload={unpublished.reload}
                        canPublish={canPublish}
                        onEditAll={editInBatch}
                    />
                </>
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
            <PageHeader title="Estilos en lote" tip={PAGE_TIP} actions={actions} before={breadcrumb} />
            {view === 'nuevo' && <BatchWizard key={wizardKey} canPublish={canPublish} />}
            {view === 'sin-publicar' && (
                <UnpublishedTab items={unpublished.items} reload={unpublished.reload} canPublish={canPublish} />
            )}
            {view === 'historial' && <HistoryTab canPublish={canPublish} />}
        </Content>
    );
}
