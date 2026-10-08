import { useCallback, useEffect, useState } from 'react';
import { Button, Form, Input, List, Popconfirm, Space, Tag, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';

const { Text } = Typography;

export default function LayerAliasesSection({ layerId, listAliases, createAlias, deleteAlias }) {
    const [aliases, setAliases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form] = Form.useForm();

    const reload = useCallback(async () => {
        if (!layerId) return;
        try {
            const data = await listAliases(layerId);
            setAliases(data || []);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudieron cargar los alias');
        } finally {
            setLoading(false);
        }
    }, [layerId, listAliases]);

    useEffect(() => {
        if (!layerId) return;
        let cancelled = false;
        listAliases(layerId)
            .then((data) => { if (!cancelled) setAliases(data || []); })
            .catch((err) => message.error(err?.response?.data?.detail || 'No se pudieron cargar los alias'))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [layerId, listAliases]);

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
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Form form={form} component={false}>
                <Space.Compact style={{ width: '100%', maxWidth: 360 }}>
                    <Form.Item
                        name="alias"
                        noStyle
                        rules={[
                            { required: true, message: 'Alias requerido' },
                            { pattern: /^[a-z0-9-]+$/, message: 'Solo minusculas, numeros y guiones' },
                            { max: 60 },
                        ]}
                    >
                        <Input placeholder="ejemplo: esalud" onPressEnter={handleAdd} />
                    </Form.Item>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        Agregar alias
                    </Button>
                </Space.Compact>
            </Form>

            {aliases.length > 0 && (
                <List
                    size="small"
                    bordered
                    loading={loading}
                    dataSource={aliases}
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
                            <Tag
                                color="#5C2472"
                                style={{
                                    fontSize: 14,
                                    color: '#262626',
                                    padding: '2px 10px',
                                    borderRadius: 6,
                                }}
                            >
                                {item.alias}
                            </Tag>
                            <Text type="secondary" style={{ marginLeft: 8 }}>
                            por {item.createdBy || '—'}
                            </Text>
                        </List.Item>
                    )}
                />
            )}
        </Space>
    );
}
