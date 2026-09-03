import { Button, Space, Tooltip, Typography } from 'antd';
import useIsMobile from '@shared/hooks/useIsMobile';
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
    const { isMobile } = useIsMobile();
    const rotulo = (texto) => (isMobile ? null : texto);

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
            <Tooltip title={verOcultos ? 'Ocultar features' : 'Ver todos'}>
                <Button
                    size="small"
                    icon={verOcultos ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                    type={verOcultos ? 'primary' : 'default'}
                    aria-label={verOcultos ? 'Ocultar features' : 'Ver todos'}
                    onClick={pulsar(onVerOcultos)}
                >
                    {rotulo(verOcultos ? 'Ocultar features' : 'Ver todos')}
                </Button>
            </Tooltip>
            <Tooltip title={pausado ? 'Reanudar' : 'Pausar'}>
                <Button
                    size="small"
                    icon={pausado ? <PlayCircleOutlined /> : <PauseOutlined />}
                    aria-label={pausado ? 'Reanudar' : 'Pausar'}
                    onClick={pulsar(onPausa)}
                >
                    {rotulo(pausado ? 'Reanudar' : 'Pausar')}
                </Button>
            </Tooltip>
            <Tooltip title={pantallaCompleta ? 'Salir' : 'Pantalla completa'}>
                <Button
                    size="small"
                    icon={pantallaCompleta ? <CompressOutlined /> : <ExpandOutlined />}
                    aria-label={pantallaCompleta ? 'Salir' : 'Pantalla completa'}
                    onClick={pulsar(onPantalla)}
                >
                    {rotulo(pantallaCompleta ? 'Salir' : 'Pantalla completa')}
                </Button>
            </Tooltip>
            {puedeEditar && (
                <Tooltip title={editando ? 'Salir de edición' : 'Editar'}>
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        type={editando ? 'primary' : 'default'}
                        aria-label={editando ? 'Salir de edición' : 'Editar'}
                        onClick={pulsar(onEditar)}
                    >
                        {rotulo(editando ? 'Salir de edición' : 'Editar')}
                    </Button>
                </Tooltip>
            )}
        </Space>
    );
}
