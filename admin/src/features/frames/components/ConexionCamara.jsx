import { Button, Form, Input, InputNumber, Segmented, Space, Typography } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import TituloConAyuda from '@shared/components/TituloConAyuda';

import { CONEXION_DIRECTA, CONEXION_NVR, RUTA_DIRECTA, enmascarar } from '../utils/camara';

const { Text } = Typography;

const MODOS = [
    { label: 'IP propia', value: CONEXION_DIRECTA },
    { label: 'Por el NVR', value: CONEXION_NVR },
];

const AYUDA_MODO = 'Por el grabador basta una credencial para todas las cámaras y el canal arma '
    + 'la ruta solo. Directo a la IP, cada cámara tiene su propia contraseña.';

const enlace = { padding: 0, height: 'auto' };

const ConexionCamara = ({
    modo,
    onModo,
    compuesta,
    porNvr,
    editaConexion,
    manual,
    onManual,
    urlCompuesta,
    urlActual,
    onCambiar,
}) => (
    <>
        {editaConexion && !manual && (
            <Form.Item label={<TituloConAyuda titulo="Cómo se conecta" ayuda={AYUDA_MODO} />}>
                <Segmented options={MODOS} value={modo} onChange={onModo} block />
            </Form.Item>
        )}

        {compuesta ? (
            <>
                <Form.Item
                    name={['conexion', 'host']}
                    label={porNvr ? 'IP del grabador' : 'IP de la cámara'}
                    rules={[{ required: true, message: 'Requerido' }]}
                >
                    <Input placeholder="192.0.2.10" />
                </Form.Item>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {porNvr && (
                        <Form.Item
                            name={['conexion', 'canal']}
                            label="Canal"
                            style={{ flex: '0 0 96px' }}
                            rules={[{ required: true, message: 'Requerido' }]}
                        >
                            <InputNumber min={1} max={32} style={{ width: '100%' }} />
                        </Form.Item>
                    )}
                    <Form.Item
                        name={['conexion', 'usuario']}
                        label="Usuario"
                        style={{ flex: 1, minWidth: 140 }}
                        rules={[{ required: true, message: 'Requerido' }]}
                    >
                        <Input autoComplete="off" />
                    </Form.Item>
                    <Form.Item
                        name={['conexion', 'contrasena']}
                        label="Contraseña"
                        style={{ flex: 1, minWidth: 140 }}
                        rules={[{ required: true, message: 'Requerido' }]}
                    >
                        <Input.Password autoComplete="new-password" />
                    </Form.Item>
                </div>

                <Space size={8} style={{ marginBottom: 16 }} wrap>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {urlCompuesta
                            ? enmascarar(urlCompuesta)
                            : `La URL se arma sola · termina en ${RUTA_DIRECTA}`}
                    </Text>
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        style={enlace}
                        onClick={() => onManual(true)}
                    >
                        Personalizar
                    </Button>
                </Space>
            </>
        ) : editaConexion ? (
            <Form.Item
                name="rtsp_url"
                label="URL RTSP"
                rules={[
                    { required: true, message: 'Requerido' },
                    { pattern: /^rtsp:\/\//, message: 'Debe empezar con rtsp://' },
                ]}
            >
                <Input placeholder="rtsp://usuario:contrasena@host:554/ruta" />
            </Form.Item>
        ) : (
            <Form.Item label="Cómo se conecta">
                <Space size={8} wrap>
                    <Text type="secondary" style={{ fontSize: 12 }}>{enmascarar(urlActual)}</Text>
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        style={enlace}
                        onClick={onCambiar}
                    >
                        Cambiar
                    </Button>
                </Space>
            </Form.Item>
        )}
    </>
);

export default ConexionCamara;
