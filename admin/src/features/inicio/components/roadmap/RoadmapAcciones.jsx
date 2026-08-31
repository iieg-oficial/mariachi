import { Button, Space, Tooltip, Typography } from 'antd';
import {
    CompressOutlined,
    MinusOutlined,
    PlusOutlined,
    EditOutlined,
    ExpandOutlined,
    EyeInvisibleOutlined,
    EyeOutlined,
    PauseOutlined,
    PlayCircleOutlined,
} from '@ant-design/icons';
import { PASO_ZOOM, ZOOM_MAXIMO, ZOOM_MINIMO } from '@features/inicio/constants/roadmapModelo';

const { Text } = Typography;

export default function RoadmapAcciones({
    verOcultos, pausado, pantallaCompleta, editando, puedeEditar, zoom,
    onVerOcultos, onPausa, onPantalla, onEditar, onZoom,
}) {
    const pulsar = (accion) => (evento) => {
        evento.stopPropagation();
        accion();
    };

    return (
        <Space size={6} wrap>
            {pantallaCompleta && (
                <>
                    <Space.Compact>
                        <Tooltip title="Alejar">
                            <Button
                                size="small"
                                icon={<MinusOutlined />}
                                aria-label="Alejar el mapa"
                                disabled={zoom <= ZOOM_MINIMO}
                                onClick={pulsar(() => onZoom(-PASO_ZOOM))}
                            />
                        </Tooltip>
                        <Tooltip title="Acercar">
                            <Button
                                size="small"
                                icon={<PlusOutlined />}
                                aria-label="Acercar el mapa"
                                disabled={zoom >= ZOOM_MAXIMO}
                                onClick={pulsar(() => onZoom(PASO_ZOOM))}
                            />
                        </Tooltip>
                    </Space.Compact>
                    <Text type="secondary" style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                        {`${Math.round(zoom * 100)}%`}
                    </Text>
                </>
            )}
            <Button
                size="small"
                icon={verOcultos ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                type={verOcultos ? 'primary' : 'default'}
                onClick={pulsar(onVerOcultos)}
            >
                {verOcultos ? 'Ocultar features' : 'Ver todos'}
            </Button>
            <Button
                size="small"
                icon={pausado ? <PlayCircleOutlined /> : <PauseOutlined />}
                onClick={pulsar(onPausa)}
            >
                {pausado ? 'Reanudar' : 'Pausar'}
            </Button>
            <Button
                size="small"
                icon={pantallaCompleta ? <CompressOutlined /> : <ExpandOutlined />}
                onClick={pulsar(onPantalla)}
            >
                {pantallaCompleta ? 'Salir' : 'Pantalla completa'}
            </Button>
            {puedeEditar && (
                <Button
                    size="small"
                    icon={<EditOutlined />}
                    type={editando ? 'primary' : 'default'}
                    onClick={pulsar(onEditar)}
                >
                    {editando ? 'Salir de edición' : 'Editar'}
                </Button>
            )}
        </Space>
    );
}
