import { Button, Popconfirm, Space, Tooltip, Typography } from 'antd';
import {
    CloudUploadOutlined,
    ExclamationCircleOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import { SEMANTIC } from '@app/providers/brand';

import Senal from './Senal';

const { Text } = Typography;

const AYUDA_SIN_APLICAR = 'Lo que ves aquí todavía no está en frames. Aplicar reinicia el '
    + 'servicio para que tome la configuración, así que la transmisión se corta unos segundos.';

const AYUDA_CAIDA = 'No se pudo hablar con la API de frames. Si el módulo está apagado en este '
    + 'entorno es lo esperado; si no, revisa que el servicio esté arriba.';

const Cifra = ({ valor, etiqueta }) => (
    <div style={{ minWidth: 88 }}>
        <div style={{ fontSize: 24, fontWeight: 600, lineHeight: '30px' }}>{valor}</div>
        <Text type="secondary" style={{ fontSize: 12 }}>{etiqueta}</Text>
    </div>
);

const EstadoFrames = ({ estado, cargando, aplicando, onRecargar, onAplicar, puedeGestionar }) => {
    if (!estado) return null;

    if (!estado.disponible) {
        return (
            <Space size={16} wrap style={{ marginBottom: 20 }}>
                <Senal
                    color={SEMANTIC.danger}
                    icono={<ExclamationCircleOutlined />}
                    texto={estado.detalle ? `frames no responde · ${estado.detalle}` : 'frames no responde'}
                    ayuda={AYUDA_CAIDA}
                />
                <Button icon={<ReloadOutlined />} onClick={onRecargar} loading={cargando}>
                    Reintentar
                </Button>
            </Space>
        );
    }

    const pendientes = Math.abs(estado.camaras_en_mariachi - estado.camaras_en_frames.length);

    return (
        <div style={{ marginBottom: 20 }}>
            <Space size={32} wrap align="start">
                <Cifra valor={estado.version || '—'} etiqueta="versión" />
                <Cifra valor={estado.camaras_en_mariachi} etiqueta="en mariachi" />
                <Cifra valor={estado.camaras_en_frames.length} etiqueta="en frames" />
                {estado.sincronizado ? (
                    <Senal
                        color={SEMANTIC.success}
                        icono={<CloudUploadOutlined />}
                        texto="al día"
                        ayuda="El catálogo y frames dicen lo mismo."
                    />
                ) : (
                    <Senal
                        color={SEMANTIC.warning}
                        icono={<ExclamationCircleOutlined />}
                        texto="sin aplicar"
                        ayuda={AYUDA_SIN_APLICAR}
                    />
                )}
            </Space>

            <Space size={12} wrap style={{ marginTop: 16 }}>
                <Button icon={<ReloadOutlined />} onClick={onRecargar} loading={cargando}>
                    Actualizar
                </Button>
                {!estado.sincronizado && puedeGestionar && (
                    <Popconfirm
                        title="Aplicar en frames"
                        description="frames se reinicia y la transmisión se corta unos segundos."
                        okText="Aplicar"
                        cancelText="Cancelar"
                        onConfirm={onAplicar}
                    >
                        <Button type="primary" icon={<CloudUploadOutlined />} loading={aplicando}>
                            {pendientes > 0
                                ? `Aplicar en frames · ${pendientes} sin aplicar`
                                : 'Aplicar en frames'}
                        </Button>
                    </Popconfirm>
                )}
            </Space>
        </div>
    );
};

export default EstadoFrames;
