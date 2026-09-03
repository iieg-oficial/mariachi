import { Button, Space } from 'antd';
import { AimOutlined, BlockOutlined, PlusOutlined, RetweetOutlined } from '@ant-design/icons';

export default function RoadmapAltas({ guardando, onPunto, onAgregar }) {
    const pulsar = (accion) => (evento) => {
        evento.stopPropagation();
        accion();
    };

    return (
        <Space size={6} wrap style={{ padding: '0 2px 8px' }}>
            <Button size="small" icon={<AimOutlined />} onClick={pulsar(onPunto)}>
                Cambiar punto
            </Button>
            <Button size="small" icon={<PlusOutlined />} loading={guardando} onClick={pulsar(() => onAgregar('hitos'))}>
                Agregar hito
            </Button>
            <Button size="small" icon={<BlockOutlined />} loading={guardando} onClick={pulsar(() => onAgregar('ciclos'))}>
                Agregar ciclo
            </Button>
            <Button size="small" icon={<RetweetOutlined />} loading={guardando} onClick={pulsar(() => onAgregar('procesos'))}>
                Agregar proceso
            </Button>
        </Space>
    );
}
