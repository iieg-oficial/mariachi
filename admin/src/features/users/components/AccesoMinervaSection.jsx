import { Form, Select, Space, Tag, Tooltip, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';

const { Text } = Typography;

const AYUDA = 'Roles de mariachi en minerva. Al guardar, si la persona aún no tiene cuenta se le da de alta y aparece su enlace de invitación.';

export default function AccesoMinervaSection({ roles, persona, cargando, esPropio }) {
    const heredados = (persona?.roles || []).filter((r) => r.via === 'group');

    return (
        <>
            <Form.Item
                label="Acceso en minerva"
                name="minerva_role_ids"
                tooltip={AYUDA}
                style={{ marginTop: 8, marginBottom: heredados.length ? 8 : 24 }}
            >
                <Select
                    mode="multiple"
                    allowClear
                    loading={cargando}
                    disabled={esPropio}
                    placeholder={esPropio ? 'Tus roles los cambia otra persona' : 'Sin acceso'}
                    options={roles.map((r) => ({ label: r.name, value: r.id, title: r.description || r.name }))}
                    optionFilterProp="label"
                />
            </Form.Item>
            {heredados.length > 0 && (
                <Space size={4} wrap style={{ marginBottom: 24 }}>
                    {heredados.map((r) => (
                        <Tooltip key={r.id} title="Heredado de un grupo: se quita desde minerva">
                            <Tag icon={<LockOutlined />} style={{ marginInlineEnd: 0 }}>{r.name}</Tag>
                        </Tooltip>
                    ))}
                    <Text type="secondary" style={{ fontSize: 12 }}>por grupo</Text>
                </Space>
            )}
        </>
    );
}
