import { Breadcrumb, Card, Space, Typography } from 'antd';
import { UnorderedListOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import useIsMobile from '@shared/hooks/useIsMobile';
import CatalogosManager from '../components/catalogos/CatalogosManager';

export default function CatalogosPage() {
    const navigate = useNavigate();
    const { isMobile } = useIsMobile();

    return (
        <div>
            <Breadcrumb
                items={[
                    {
                        title: 'Formularios',
                        onClick: () => navigate('/sieej/formularios'),
                        className: 'cursor-pointer',
                    },
                    { title: 'Catálogos' },
                ]}
                style={{ marginBottom: 12 }}
            />
            <div style={{ marginBottom: 16 }}>
                <Space>
                    <UnorderedListOutlined style={{ fontSize: 20 }} />
                    <Typography.Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>
                        SIEEJ — Catálogos
                    </Typography.Title>
                </Space>
                <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
                    Listas globales compartidas entre formularios: editar una afecta a todos
                    los campos enlazados. Renombrar una opción actualiza también los envíos
                    que ya la eligieron; borrarla se bloquea si está en uso.
                </Typography.Paragraph>
            </div>

            <Card>
                <CatalogosManager />
            </Card>
        </div>
    );
}
