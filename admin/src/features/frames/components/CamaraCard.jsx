import { Button, Popconfirm, Space, Typography } from 'antd';
import {
    DeleteOutlined,
    EditOutlined,
    EyeInvisibleOutlined,
    VideoCameraOutlined,
} from '@ant-design/icons';
import { SEMANTIC } from '@app/providers/brand';

import Senal from './Senal';

const { Text } = Typography;

const señalDe = (vivo) => {
    if (!vivo) {
        return {
            color: SEMANTIC.neutral, bg: SEMANTIC.neutralSoft, texto: 'sin datos',
            ayuda: 'frames todavía no reporta esta cámara. Aplica el catálogo para que la tome.',
        };
    }
    if (vivo.en_linea) {
        return {
            color: SEMANTIC.success, bg: SEMANTIC.successSoft, texto: `${vivo.camera_fps} fps`,
            ayuda: 'Cuadros por segundo que frames está recibiendo ahora mismo.',
        };
    }
    return {
        color: SEMANTIC.danger, bg: SEMANTIC.dangerSoft, texto: 'sin señal',
        ayuda: 'frames la tiene configurada pero no recibe video. Suele ser el canal caído en el NVR.',
    };
};

const CamaraCard = ({ camara, vivo, onEditar, onEliminar, puedeGestionar }) => {
    const señal = señalDe(vivo);

    return (
        <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: 16,
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
        }}>
            <Space align="start" size={10} style={{ justifyContent: 'space-between', width: '100%' }}>
                <Space align="center" size={8}>
                    <span style={{ color: camara.habilitada ? SEMANTIC.success : SEMANTIC.neutral }}>
                        {camara.habilitada ? <VideoCameraOutlined /> : <EyeInvisibleOutlined />}
                    </span>
                    <span>
                        <div style={{ fontWeight: 600 }}>{camara.etiqueta}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{camara.nombre}</Text>
                    </span>
                </Space>
            </Space>

            <Space size={6} wrap>
                <Senal pastilla {...señal} />
                {!camara.habilitada && (
                    <Senal
                        pastilla
                        color={SEMANTIC.neutral}
                        bg={SEMANTIC.neutralSoft}
                        texto="apagada"
                        ayuda="No se incluye al aplicar el catálogo en frames."
                    />
                )}
                {camara.grabacion_habilitada ? (
                    <Senal
                        pastilla
                        color={SEMANTIC.info}
                        bg={SEMANTIC.infoSoft}
                        texto={`graba ${camara.retencion_dias} días`}
                        ayuda="Días que se conserva la grabación antes de borrarse."
                    />
                ) : null}
                {camara.deteccion_habilitada ? (
                    <Senal
                        pastilla
                        color={SEMANTIC.warning}
                        bg={SEMANTIC.warningSoft}
                        texto="detección"
                        ayuda="Requiere acelerador en el nodo donde corre frames."
                    />
                ) : null}
            </Space>

            {camara.ubicacion ? (
                <Text type="secondary" style={{ fontSize: 13 }}>{camara.ubicacion}</Text>
            ) : null}

            {puedeGestionar ? (
                <Space size={8} style={{ marginTop: 'auto' }}>
                    <Button size="small" icon={<EditOutlined />} onClick={() => onEditar(camara)}>
                        Editar
                    </Button>
                    <Popconfirm
                        title="Eliminar cámara"
                        description="Deja de administrarse desde mariachi."
                        okText="Eliminar"
                        cancelText="Cancelar"
                        onConfirm={() => onEliminar(camara)}
                    >
                        <Button size="small" danger icon={<DeleteOutlined />}>Eliminar</Button>
                    </Popconfirm>
                </Space>
            ) : null}
        </div>
    );
};

export default CamaraCard;
