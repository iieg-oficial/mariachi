import { Alert, Button, Descriptions, Popconfirm, Space, Tag } from 'antd';
import { CloudUploadOutlined, ReloadOutlined } from '@ant-design/icons';

const EstadoPanel = ({ estado, cargando, aplicando, onRecargar, onAplicar }) => {
    if (!estado) return null;

    if (!estado.disponible) {
        return (
            <Alert
                type="error"
                showIcon
                title="wacha no responde"
                description={
                    <Space orientation="vertical" size="small">
                        <span>
                            No se pudo hablar con la API de wacha. Si el módulo está apagado en este
                            entorno es lo esperado; si no, revisa que el servicio esté arriba.
                        </span>
                        {estado.detalle ? <code>{estado.detalle}</code> : null}
                    </Space>
                }
                action={
                    <Button size="small" icon={<ReloadOutlined />} onClick={onRecargar} loading={cargando}>
                        Reintentar
                    </Button>
                }
            />
        );
    }

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 4 }}>
                <Descriptions.Item label="Versión de wacha">{estado.version}</Descriptions.Item>
                <Descriptions.Item label="Cámaras en mariachi">
                    {estado.camaras_en_mariachi}
                </Descriptions.Item>
                <Descriptions.Item label="Cámaras en wacha">
                    {estado.camaras_en_wacha.length}
                </Descriptions.Item>
                <Descriptions.Item label="Sincronizado">
                    {estado.sincronizado
                        ? <Tag color="green">al día</Tag>
                        : <Tag color="orange">hay cambios sin aplicar</Tag>}
                </Descriptions.Item>
            </Descriptions>

            {!estado.sincronizado ? (
                <Alert
                    type="warning"
                    showIcon
                    title="Lo que ves aquí todavía no está en wacha"
                    description="Aplicar reinicia el servicio para tomar la configuración, así que la grabación se corta unos segundos."
                />
            ) : null}

            <Space>
                <Button icon={<ReloadOutlined />} onClick={onRecargar} loading={cargando}>
                    Actualizar
                </Button>
                <Popconfirm
                    title="Aplicar en wacha"
                    description="wacha se reinicia y la grabación se corta unos segundos. ¿Continuar?"
                    okText="Aplicar"
                    cancelText="Cancelar"
                    onConfirm={onAplicar}
                >
                    <Button type="primary" icon={<CloudUploadOutlined />} loading={aplicando}>
                        Aplicar en wacha
                    </Button>
                </Popconfirm>
            </Space>
        </Space>
    );
};

export default EstadoPanel;
