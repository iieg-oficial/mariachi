import { Button, Descriptions, Empty, Modal, Space, Typography } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { describeValue, labelOf } from '@features/mapalab-layers/utils/layerDiff';

const { Paragraph, Text } = Typography;

const TITULOS = {
    layer: 'Revisar cambios de la capa',
    layer_metadata: 'Revisar cambios de metadatos',
    layer_stats: 'Revisar cambios de estadísticas',
};

const esListaDeObjetos = (value) => Array.isArray(value)
    && value.length > 0
    && value.every((item) => item && typeof item === 'object');

function Valor({ value }) {
    if (esListaDeObjetos(value)) {
        return (
            <ol style={{ margin: 0, paddingInlineStart: 18 }}>
                {value.map((item, i) => (
                    <li key={i}>
                        {describeValue(item)}
                        {item.operation && <Text type="secondary"> · {item.operation}</Text>}
                    </li>
                ))}
            </ol>
        );
    }
    return (
        <Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 3, expandable: 'collapsible' }}>
            {describeValue(value)}
        </Paragraph>
    );
}

export default function BorradorCapaRevisionModal({ borrador, onClose, onAprobar, onRechazar, aprobando, width }) {
    const data = borrador?.data || {};
    const campos = Object.keys(data).filter((campo) => campo !== 'action');

    return (
        <Modal
            open={Boolean(borrador)}
            onCancel={onClose}
            title={TITULOS[borrador?.resource_type] || 'Revisar borrador'}
            width={width}
            footer={(
                <Space wrap>
                    <Button shape="round" onClick={onClose}>Cerrar</Button>
                    <Button shape="round" danger icon={<CloseOutlined />} disabled={aprobando} onClick={() => onRechazar(borrador)}>
                        Rechazar
                    </Button>
                    <Button
                        shape="round"
                        type="primary"
                        icon={<CheckOutlined />}
                        loading={aprobando}
                        disabled={campos.length === 0}
                        onClick={() => onAprobar(borrador)}
                    >
                        Aprobar
                    </Button>
                </Space>
            )}
        >
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                {data.label || borrador?.resource_id} · {borrador?.usuario?.name || 'sin autor'}
            </Text>
            {campos.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="El borrador no trae cambios." />
            ) : (
                <Descriptions column={1} size="small" bordered>
                    {campos.map((campo) => (
                        <Descriptions.Item key={campo} label={labelOf(campo)}>
                            <Valor value={data[campo]} />
                        </Descriptions.Item>
                    ))}
                </Descriptions>
            )}
        </Modal>
    );
}
