import { Button, Space } from 'antd';
import {
    CompressOutlined,
    EditOutlined,
    ExpandOutlined,
    EyeInvisibleOutlined,
    EyeOutlined,
    PauseOutlined,
    PlayCircleOutlined,
} from '@ant-design/icons';

export default function RoadmapAcciones({
    verOcultos, pausado, pantallaCompleta, editando, puedeEditar,
    onVerOcultos, onPausa, onPantalla, onEditar,
}) {
    const pulsar = (accion) => (evento) => {
        evento.stopPropagation();
        accion();
    };

    return (
        <Space size={6} wrap>
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
