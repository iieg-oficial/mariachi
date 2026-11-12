import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Badge, Breadcrumb, Button, Layout } from 'antd';
import { useAuth } from '@shared/contexts/useAuth';
import { message } from '@shared/services/message';
import useIsMobile from '@shared/hooks/useIsMobile';
import { batchErrorMessage, editDrafts, fetchUnpublished } from '@features/sextante/api/stylesBatchService';
import { saveBatch } from '@features/sextante/utils/stylesBatchStorage';
import PageHeader from '@features/sextante/components/PageHeader';
import BatchWizard from '@features/sextante/components/stylesBatch/BatchWizard';
import { HistoryTab, UnpublishedTab } from '@features/sextante/components/stylesBatch/DraftTabs';

const { Content } = Layout;

const PUBLISH_PERMISSION = 'mariachi.mapalab.manage';
const PAGE_TIP = 'Sube la tabla de estilos coropléticos, revisa cada fila y guarda un borrador por estilo.';

const VIEWS = [
    { key: 'nuevo', label: 'Nuevo lote' },
    { key: 'sin-publicar', label: 'Sin publicar' },
    { key: 'historial', label: 'Historial' },
];

export default function StylesBatchPage() {
    const { user } = useAuth();
    const { isMobile } = useIsMobile();
    const [view, setView] = useState('nuevo');
    const [pending, setPending] = useState(null);
    const [wizardKey, setWizardKey] = useState(0);
    const canPublish = Boolean(user?.permissions?.includes?.(PUBLISH_PERMISSION));

    useEffect(() => {
        fetchUnpublished().then((items) => setPending(items.length)).catch(() => setPending(null));
    }, [wizardKey]);

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

    const actions = VIEWS.map((item) => (
        <Button
            key={item.key}
            shape="round"
            type={view === item.key ? 'primary' : 'default'}
            aria-pressed={view === item.key}
            onClick={() => setView(item.key)}
        >
            {item.label}
            {item.key === 'sin-publicar' && pending > 0 && (
                <Badge count={pending} size="small" color={view === item.key ? 'var(--ant-color-white)' : undefined}
                    style={view === item.key ? { color: 'var(--ant-color-primary)' } : undefined} />
            )}
        </Button>
    ));

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
                <UnpublishedTab canPublish={canPublish} onEdit={editInBatch} onCount={setPending} />
            )}
            {view === 'historial' && <HistoryTab canPublish={canPublish} />}
        </Content>
    );
}
