import { Alert, Empty, List, Space, Switch, Tag, Typography } from 'antd';

const { Text } = Typography;

export default function MiembrosConRol({
    usuarios = [], miembros = [], coordinadores = [], onChange,
}) {
    const seleccionados = usuarios.filter((u) => miembros.includes(u.id));

    if (!seleccionados.length) {
        return (
            <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Elige al menos un miembro para poder nombrar coordinador"
            />
        );
    }

    const alternar = (id, esCoordinador) => {
        onChange(esCoordinador
            ? [...coordinadores, id]
            : coordinadores.filter((x) => x !== id));
    };

    const sinCoordinador = !seleccionados.some((u) => coordinadores.includes(u.id));

    return (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {sinCoordinador && (
                <Alert
                    type="warning"
                    showIcon
                    message="Este grupo no tiene coordinador"
                    description={
                        'En los formularios con captura colaborativa nadie podrá enviar el '
                        + 'envío del grupo hasta que nombres a alguien.'
                    }
                />
            )}
            <List
                size="small"
                bordered
                dataSource={seleccionados}
                renderItem={(u) => {
                    const esCoordinador = coordinadores.includes(u.id);
                    return (
                        <List.Item
                            actions={[
                                <Space key="rol" size={6}>
                                    <Switch
                                        size="small"
                                        checked={esCoordinador}
                                        onChange={(v) => alternar(u.id, v)}
                                    />
                                    <Text type={esCoordinador ? undefined : 'secondary'} style={{ fontSize: 12 }}>
                                        Coordinador
                                    </Text>
                                </Space>,
                            ]}
                        >
                            <List.Item.Meta
                                title={
                                    <Space size={6}>
                                        <Text style={{ fontSize: 13 }}>{u.name || u.username}</Text>
                                        {esCoordinador && <Tag color="purple">Coordinador</Tag>}
                                    </Space>
                                }
                                description={
                                    <Text type="secondary" style={{ fontSize: 12 }}>{u.username}</Text>
                                }
                            />
                        </List.Item>
                    );
                }}
            />
        </Space>
    );
}
