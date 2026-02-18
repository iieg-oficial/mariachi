import { useState, useEffect } from 'react';
import { Table, Card, Typography, Tag, Space, Button, Modal, Form, Input, Select, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons';
import api from '@services/api';

const { Title, Text } = Typography;

const roleColors = {
    tetlamamakani: 'red',
    editora: 'blue'
};

const roleLabels = {
    tetlamamakani: 'Tetlamamakani',
    editora: 'Editora'
};

export default function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/usuarios');
            setUsers(response.data);
        } catch {
            message.error('Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingUser(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingUser(record);
        form.setFieldsValue(record);
        setModalVisible(true);
    };

    const handleDelete = (record) => {
        Modal.confirm({
            title: '¿Está seguro de eliminar este usuario?',
            content: `Se eliminará el usuario: ${record.name}`,
            okText: 'Eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await api.delete(`/usuarios/${record.id}`);
                    message.success('Usuario eliminado exitosamente');
                    fetchUsers();
                } catch {
                    message.error('Error al eliminar usuario');
                }
            }
        });
    };

    const handleResetPassword = (record) => {
        Modal.confirm({
            title: '¿Resetear contraseña?',
            content: (
                <div>
                    <p>Se generará una nueva contraseña temporal para <strong>{record.name}</strong>.</p>
                    <p>El usuario deberá cambiarla en su próximo inicio de sesión.</p>
                </div>
            ),
            okText: 'Resetear',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    const response = await api.post(`/usuarios/${record.id}/restablecer-contrasena`);
                    Modal.info({
                        title: 'Contraseña Reseteada',
                        content: (
                            <div>
                                <p>La nueva contraseña temporal es:</p>
                                <Title level={4} copyable>{response.data.temp_password}</Title>
                                <p>Por favor compártela con el usuario de forma segura.</p>
                            </div>
                        ),
                        width: 400
                    });
                } catch (error) {
                    message.error('Error al resetear contraseña');
                }
            }
        });
    };

    const handleSubmit = async (values) => {
        try {
            if (editingUser) {
                await api.put(`/usuarios/${editingUser.id}`, values);
                message.success('Usuario actualizado exitosamente');
            } else {
                await api.post('/usuarios', values);
                message.success('Usuario creado exitosamente');
            }
            setModalVisible(false);
            fetchUsers();
        } catch {
            message.error(editingUser ? 'Error al actualizar usuario' : 'Error al crear usuario');
        }
    };

    const columns = [
        {
            title: 'Usuario',
            dataIndex: 'username',
            key: 'username',
            sorter: (a, b) => a.username.localeCompare(b.username)
        },
        {
            title: 'Nombre',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name)
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email'
        },
        {
            title: 'Rol',
            dataIndex: 'role',
            key: 'role',
            render: (role) => (
                <Tag color={roleColors[role]}>
                    {roleLabels[role]}
                </Tag>
            ),
            filters: Object.keys(roleLabels).map(key => ({
                text: roleLabels[key],
                value: key
            })),
            onFilter: (value, record) => record.role === value
        },
        {
            title: 'Fecha de Creación',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => new Date(date).toLocaleDateString('es-MX'),
            sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    >
                        Editar
                    </Button>
                    <Button
                        type="link"
                        icon={<LockOutlined />}
                        onClick={() => handleResetPassword(record)}
                    >
                        Resetear
                    </Button>
                    <Button
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record)}
                    >
                        Eliminar
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Administración de Usuarios</Title>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleCreate}
                >
                    Nuevo Usuario
                </Button>
            </div>

            <Card>
                <Table
                    columns={columns}
                    dataSource={users}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total) => `Total ${total} usuarios`
                    }}
                />
            </Card>

            <Modal
                title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={() => form.submit()}
                okText={editingUser ? 'Actualizar' : 'Crear'}
                cancelText="Cancelar"
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        label="Usuario"
                        name="username"
                        rules={[{ required: true, message: 'Por favor ingrese el usuario' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Nombre"
                        name="name"
                        rules={[{ required: true, message: 'Por favor ingrese el nombre' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                            { required: true, message: 'Por favor ingrese el email' },
                            { type: 'email', message: 'Email no válido' }
                        ]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Rol"
                        name="role"
                        rules={[{ required: true, message: 'Por favor seleccione el rol' }]}
                    >
                        <Select>
                            <Select.Option value="tetlamamakani">Tetlamamakani</Select.Option>
                            <Select.Option value="editora">Editora</Select.Option>
                        </Select>
                    </Form.Item>

                    {!editingUser && (
                        <Form.Item
                            label="Contraseña"
                            name="password"
                            rules={[{ required: true, message: 'Por favor ingrese la contraseña' }]}
                        >
                            <Input.Password />
                        </Form.Item>
                    )}
                </Form>
            </Modal>
        </div>
    );
}
