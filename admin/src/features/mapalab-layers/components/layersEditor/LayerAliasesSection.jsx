import { useEffect, useState } from 'react';
import { Button, Form, Input, List, Popconfirm, Space, Tag, Typography, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function LayerAliasesSection({ layerId, listAliases, createAlias, deleteAlias }) {
    const [aliases, setAliases] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const reload = async () => {
        if (!layerId) return;
        setLoading(true);
        try {
            const data = await listAliases(layerId);
            setAliases(data || []);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudieron cargar los aliases');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        reload();
    }, [layerId]);

    const handleAdd = async () => {
        const values = await form.validateFields();
        try {
            await createAlias(layerId, values.alias);
            message.success(`Alias "${values.alias}" creado`);
            form.resetFields();
            reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al crear alias');
        }
    };

    const handleDelete = async (alias) => {
        try {
            await deleteAlias(layerId, alias);
            message.success(`Alias "${alias}" eliminado`);
            reload();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al eliminar alias');
        }
    };

    return (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Text type="secondary">
                Aliases cortos opcionales que tambien resuelven a esta capa via{' '}
                <code>?layer=&lt;alias&gt;</code>. El slug canonico siempre funciona; los aliases son atajos
                memorizables (ejemplo: <code>esalud</code> -&gt; <code>establecimientos-salud</code>).
            </Text>

            <Form form={form} layout="inline" onFinish={handleAdd}>
                <Form.Item
                    name="alias"
                    rules={[
                        { required: true, message: 'Alias requerido' },
                        { pattern: /^[a-z0-9-]+$/, message: 'Solo minusculas, numeros y guiones' },
                        { max: 60 },
                    ]}
                >
                    <Input placeholder="esalud" style={{ width: 240 }} />
                </Form.Item>
                <Form.Item>
                    <Button type="primary" icon={<PlusOutlined />} htmlType="submit">
                        Agregar alias
                    </Button>
                </Form.Item>
            </Form>

            <List
                size="small"
                bordered
                loading={loading}
                dataSource={aliases}
                locale={{ emptyText: 'Sin aliases. El slug canonico sigue funcionando.' }}
                renderItem={(item) => (
                    <List.Item
                        actions={[
                            <Popconfirm
                                key="del"
                                title={`Eliminar alias "${item.alias}"?`}
                                onConfirm={() => handleDelete(item.alias)}
                                okText="Si"
                                cancelText="No"
                            >
                                <Button type="text" danger icon={<DeleteOutlined />} />
                            </Popconfirm>,
                        ]}
                    >
                        <Tag color="blue">{item.alias}</Tag>
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                            por {item.createdBy || '—'}
                        </Text>
                    </List.Item>
                )}
            />
        </Space>
    );
}
