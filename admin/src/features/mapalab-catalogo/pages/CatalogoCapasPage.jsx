import { Tabs, Typography } from 'antd';
import { BankOutlined, DatabaseOutlined } from '@ant-design/icons';
import CapasTab from '../components/CapasTab';
import InstitucionesPanel from '../components/InstitucionesPanel';
import { useCatalogoData } from '../hooks/useCatalogoData';

const { Title, Text } = Typography;

const CatalogoCapasPage = () => {
    const data = useCatalogoData();

    const items = [
        {
            key: 'capas',
            label: (
                <span>
                    <DatabaseOutlined /> Capas
                    {data.capas.length ? ` (${data.capas.length})` : ''}
                </span>
            ),
            children: <CapasTab data={data} />,
        },
        {
            key: 'instituciones',
            label: (
                <span>
                    <BankOutlined /> Instituciones
                    {data.instituciones.length ? ` (${data.instituciones.length})` : ''}
                </span>
            ),
            children: (
                <InstitucionesPanel
                    instituciones={data.instituciones}
                    capas={data.capas}
                    onChanged={() => { data.reloadInstituciones(); data.loadCapas(); }}
                />
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
                <Title level={2} style={{ margin: 0 }}>Catálogo de capas</Title>
                <Text type="secondary">
                    Capas sueltas que se publican en la vista pública de catálogo de Mapalab para consulta y descarga directa.
                </Text>
            </div>

            <Tabs defaultActiveKey="capas" items={items} destroyInactiveTabPane={false} />
        </div>
    );
};

export default CatalogoCapasPage;
