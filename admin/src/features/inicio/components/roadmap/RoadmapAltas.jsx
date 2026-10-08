import { Button, Space, Tooltip } from 'antd';
import useIsMobile from '@shared/hooks/useIsMobile';
import { AimOutlined, BlockOutlined, PlusOutlined, RetweetOutlined } from '@ant-design/icons';

const ALTAS = [
    { clave: 'punto', texto: 'Cambiar punto', icono: <AimOutlined /> },
    { clave: 'hitos', texto: 'Agregar hito', icono: <PlusOutlined /> },
    { clave: 'ciclos', texto: 'Agregar ciclo', icono: <BlockOutlined /> },
    { clave: 'procesos', texto: 'Agregar proceso', icono: <RetweetOutlined /> },
];

export default function RoadmapAltas({ guardando, onPunto, onAgregar }) {
    const { isMobile } = useIsMobile();

    const pulsar = (clave) => (evento) => {
        evento.stopPropagation();
        if (clave === 'punto') onPunto();
        else onAgregar(clave);
    };

    return (
        <Space size={8} wrap style={{ padding: '6px 4px 12px' }}>
            {ALTAS.map((alta) => (
                <Tooltip key={alta.clave} title={alta.texto}>
                    <Button
                        size="small"
                        icon={alta.icono}
                        aria-label={alta.texto}
                        loading={alta.clave !== 'punto' && guardando}
                        onClick={pulsar(alta.clave)}
                    >
                        {isMobile ? null : alta.texto}
                    </Button>
                </Tooltip>
            ))}
        </Space>
    );
}
