import { useEffect, useState } from 'react';
import { Button, Popconfirm, Space, Spin, Typography } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import DraftPreview from '@features/sextante/components/stylesBatch/DraftPreview';
import { fetchPublicado } from '@features/revision/api/publicados';
import FieldDiff from '@features/revision/components/FieldDiff';
import InfoboxDiff from '@features/revision/components/previews/InfoboxDiff';
import MetadataDiff from '@features/revision/components/previews/MetadataDiff';
import StatsDiff from '@features/revision/components/previews/StatsDiff';

const { Text } = Typography;

function Visual({ borrador, publicado }) {
    const cambios = borrador.data || {};
    const tipo = borrador.resource_type;
    if (tipo === 'sld') return <DraftPreview borrador={borrador} />;
    if (tipo === 'layer' && 'infoboxConfig' in cambios) return <InfoboxDiff publicado={publicado} cambios={cambios} />;
    if (tipo === 'layer_metadata') {
        return <MetadataDiff publicado={publicado} cambios={cambios} etiqueta={cambios.label || borrador.resource_id} />;
    }
    if (tipo === 'layer_stats') return <StatsDiff layerKey={borrador.resource_id} publicado={publicado} cambios={cambios} />;
    return null;
}

export default function DraftReviewPanel({ borrador, onAprobar, onRechazar, aprobando }) {
    const [estado, setEstado] = useState({ cargando: true, publicado: null, error: null });

    useEffect(() => {
        let activo = true;
        fetchPublicado(borrador)
            .then((publicado) => { if (activo) setEstado({ cargando: false, publicado, error: null }); })
            .catch(() => { if (activo) setEstado({ cargando: false, publicado: null, error: 'No se pudo cargar lo publicado' }); });
        return () => { activo = false; };
    }, [borrador]);

    if (estado.cargando) return <Spin />;

    const esSld = borrador.resource_type === 'sld';
    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            {estado.error && <Text type="danger">{estado.error}</Text>}
            <Visual borrador={borrador} publicado={estado.publicado} />
            {!esSld && <FieldDiff cambios={borrador.data} publicado={estado.publicado} />}
            <Space wrap style={{ justifyContent: 'flex-end', width: '100%' }}>
                <Button shape="round" danger icon={<CloseOutlined />} disabled={aprobando} onClick={() => onRechazar(borrador)}>
                    Rechazar
                </Button>
                <Popconfirm title="¿Aprobar y publicar en el visor?" okText="Aprobar" cancelText="Cancelar" onConfirm={() => onAprobar(borrador)}>
                    <Button shape="round" type="primary" icon={<CheckOutlined />} loading={aprobando}>Aprobar</Button>
                </Popconfirm>
            </Space>
        </Space>
    );
}
