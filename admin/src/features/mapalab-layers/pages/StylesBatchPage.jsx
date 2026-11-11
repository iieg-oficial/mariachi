import { useState } from 'react';
import { Breadcrumb, Space, Tabs, Typography } from 'antd';
import { useAuth } from '@shared/contexts/useAuth';
import BatchWizard from '@features/mapalab-layers/components/stylesBatch/BatchWizard';
import { HistoryTab, UnpublishedTab } from '@features/mapalab-layers/components/stylesBatch/DraftTabs';

const { Title } = Typography;

const PUBLISH_PERMISSION = 'mariachi.mapalab.manage';

export default function StylesBatchPage() {
    const { user } = useAuth();
    const [tab, setTab] = useState('nuevo');
    const canPublish = Boolean(user?.permissions?.includes?.(PUBLISH_PERMISSION));

    const items = [
        { key: 'nuevo', label: 'Nuevo lote', children: <BatchWizard canPublish={canPublish} /> },
        { key: 'sin-publicar', label: 'Sin publicar', children: <UnpublishedTab canPublish={canPublish} /> },
        { key: 'historial', label: 'Historial', children: <HistoryTab canPublish={canPublish} /> },
    ];

    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Breadcrumb items={[{ title: 'MapaLab' }, { title: 'Capas' }, { title: 'Estilos en lote' }]} />
            <Title level={3} style={{ margin: 0 }}>Estilos en lote</Title>
            <Tabs activeKey={tab} onChange={setTab} items={items} destroyOnHidden />
        </Space>
    );
}
