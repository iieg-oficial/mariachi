import { Tabs } from 'antd';
import ApiKeyAuditoriaTab from '@features/mapalab-api-keys/components/ApiKeyAuditoriaTab';
import ApiKeyEditorForm from '@features/mapalab-api-keys/components/ApiKeyEditorForm';
import ApiKeyPlaygroundTab from '@features/mapalab-api-keys/components/ApiKeyPlaygroundTab';


export default function ApiKeyInlinePanel({
    apiKey,
    activeTab = 'edit',
    onTabChange,
    editForm,
    saving,
    onCancel,
    onSubmit,
    initialPlainKey = '',
}) {
    return (
        <div style={{ padding: '12px 8px 4px' }}>
            <Tabs
                activeKey={activeTab}
                onChange={onTabChange}
                size="small"
                items={[
                    {
                        key: 'edit',
                        label: 'Datos de la llave',
                        children: (
                            <ApiKeyEditorForm
                                form={editForm}
                                editing={apiKey}
                                saving={saving}
                                onCancel={onCancel}
                                onSubmit={onSubmit}
                                embedded
                            />
                        ),
                    },
                    {
                        key: 'playground',
                        label: 'Armar y previsualizar mapas',
                        children: <ApiKeyPlaygroundTab apiKey={apiKey} initialPlainKey={initialPlainKey} />,
                    },
                    {
                        key: 'auditoria',
                        label: 'Auditoría',
                        children: <ApiKeyAuditoriaTab apiKey={apiKey} />,
                    },
                ]}
            />
        </div>
    );
}
