import { useMemo } from 'react';
import { Button, Dropdown, Modal, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import {
    AuditOutlined,
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    KeyOutlined,
    MoreOutlined,
    PauseCircleOutlined,
    PlayCircleOutlined,
    StopOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const ESTADO_TAGS = {
    active: { color: 'green', label: 'Activa' },
    suspended: { color: 'orange', label: 'Suspendida' },
    revoked: { color: 'red', label: 'Revocada' },
};

const VISIBILITY_TAGS = {
    public: { color: 'blue', label: 'Pública' },
    private: { color: 'purple', label: 'Privada' },
};


export default function ApiKeysTable({
    items,
    isMobile,
    actingId,
    expandedRowId,
    expandedTab,
    expandable,
    onEdit,
    onPreview,
    onAudit,
    onRotate,
    onSuspend,
    onReactivate,
    onRevoke,
    onDelete,
}) {
    const columns = useMemo(() => [
        {
            title: 'Institución',
            dataIndex: 'institucionNombre',
            ellipsis: true,
            render: (nombre, record) => (
                <Space orientation="vertical" size={0} style={{ minWidth: 0 }}>
                    <Text strong ellipsis>{nombre}</Text>
                    {record.institucionEmailContacto && (
                        <Text type="secondary" style={{ fontSize: 11 }} ellipsis>{record.institucionEmailContacto}</Text>
                    )}
                </Space>
            ),
        },
        {
            title: 'Llave (resumen)',
            dataIndex: 'keyPrefix',
            width: 160,
            ellipsis: true,
            render: (prefix) => <Text code ellipsis>{prefix}…</Text>,
        },
        {
            title: 'Tipo',
            dataIndex: 'visibility',
            width: 95,
            render: (v) => {
                const tag = VISIBILITY_TAGS[v] || { color: 'default', label: v };
                return <Tag color={tag.color}>{tag.label}</Tag>;
            },
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            width: 110,
            render: (e) => {
                const tag = ESTADO_TAGS[e] || { color: 'default', label: e };
                return <Tag color={tag.color}>{tag.label}</Tag>;
            },
        },
        {
            title: 'Sitios autorizados',
            dataIndex: 'dominiosPermitidos',
            responsive: ['lg'],
            width: 200,
            ellipsis: true,
            render: (list) => (
                list?.length ? (
                    <Tooltip title={list.join(', ')}>
                        <Space size={4} style={{ maxWidth: '100%' }}>
                            <Tag style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{list[0]}</Tag>
                            {list.length > 1 && <Tag>+{list.length - 1}</Tag>}
                        </Space>
                    </Tooltip>
                ) : <Text type="secondary">—</Text>
            ),
        },
        {
            title: 'Capas',
            dataIndex: 'capasPermitidas',
            responsive: ['xl'],
            width: 80,
            render: (list) => (
                list?.length ? <Tag>{list.length}</Tag> : <Text type="secondary">Todas</Text>
            ),
        },
        {
            title: 'Acciones',
            key: 'acciones',
            width: 205,
            render: (_, record) => {
                const isRevoked = record.estado === 'revoked';
                const isSuspended = record.estado === 'suspended';
                const isExpanded = expandedRowId === record.id;
                const activeTab = isExpanded ? expandedTab : null;
                const menuItems = [];
                if (!isRevoked) {
                    menuItems.push({
                        key: 'rotate',
                        icon: <KeyOutlined />,
                        label: 'Generar contraseña nueva',
                        onClick: () => Modal.confirm({
                            title: '¿Generar una contraseña nueva?',
                            icon: <ExclamationCircleOutlined />,
                            content: 'La contraseña anterior deja de funcionar. Cualquier sitio que ya esté usándola va a fallar hasta que actualicen el código en su página.',
                            okText: 'Sí, generar nueva',
                            cancelText: 'Cancelar',
                            onOk: () => onRotate(record),
                        }),
                    });
                }
                if (!isRevoked && !isSuspended) {
                    menuItems.push({
                        key: 'suspend',
                        icon: <PauseCircleOutlined />,
                        label: 'Pausar temporalmente',
                        onClick: () => Modal.confirm({
                            title: '¿Pausar esta llave temporalmente?',
                            icon: <ExclamationCircleOutlined />,
                            content: 'Los sitios que usan esta llave dejarán de mostrar el mapa mientras esté pausada. La puedes reactivar en cualquier momento.',
                            okText: 'Sí, pausar',
                            cancelText: 'Cancelar',
                            onOk: () => onSuspend(record),
                        }),
                    });
                }
                if (isSuspended) {
                    menuItems.push({
                        key: 'reactivate',
                        icon: <PlayCircleOutlined />,
                        label: 'Reactivar',
                        onClick: () => onReactivate(record),
                    });
                }
                if (!isRevoked) {
                    menuItems.push({
                        key: 'revoke',
                        icon: <StopOutlined />,
                        danger: true,
                        label: 'Cancelar permanentemente',
                        onClick: () => Modal.confirm({
                            title: '¿Cancelar esta llave para siempre?',
                            icon: <ExclamationCircleOutlined />,
                            content: 'No se puede deshacer. La llave dejará de funcionar para todos los sitios y tendrás que crear una nueva si se necesita restablecer el servicio.',
                            okText: 'Sí, cancelar para siempre',
                            okButtonProps: { danger: true },
                            cancelText: 'Cancelar',
                            onOk: () => onRevoke(record),
                        }),
                    });
                }
                if (isRevoked) {
                    menuItems.push({
                        key: 'delete',
                        icon: <DeleteOutlined />,
                        danger: true,
                        label: 'Eliminar del listado',
                        onClick: () => Modal.confirm({
                            title: '¿Eliminar esta llave del listado?',
                            icon: <ExclamationCircleOutlined />,
                            content: 'Solo se puede eliminar una llave que ya esté cancelada. El historial de uso se conserva para auditoría.',
                            okText: 'Sí, eliminar',
                            okButtonProps: { danger: true },
                            cancelText: 'Cancelar',
                            onOk: () => onDelete(record),
                        }),
                    });
                }
                return (
                    <Space size={4}>
                        <Tooltip title={activeTab === 'edit' ? 'Cerrar el editor' : 'Editar los datos de la llave'}>
                            <Button
                                size="small"
                                type={activeTab === 'edit' ? 'primary' : 'default'}
                                icon={<EditOutlined />}
                                disabled={isRevoked}
                                onClick={() => onEdit(record)}
                            />
                        </Tooltip>
                        {onPreview && (
                            <Tooltip title={activeTab === 'playground' ? 'Cerrar la previsualización' : 'Previsualizar y armar mapas para embeber'}>
                                <Button
                                    size="small"
                                    type={activeTab === 'playground' ? 'primary' : 'default'}
                                    icon={<EyeOutlined />}
                                    disabled={isRevoked}
                                    onClick={() => onPreview(record)}
                                />
                            </Tooltip>
                        )}
                        {onAudit && (
                            <Tooltip title={activeTab === 'auditoria' ? 'Cerrar la auditoría' : 'Ver historial de accesos al mapa con esta llave'}>
                                <Button
                                    size="small"
                                    type={activeTab === 'auditoria' ? 'primary' : 'default'}
                                    icon={<AuditOutlined />}
                                    onClick={() => onAudit(record)}
                                />
                            </Tooltip>
                        )}
                        <Tooltip title="Más acciones (pausar, generar contraseña nueva, cancelar…)">
                            <Dropdown
                                menu={{ items: menuItems }}
                                placement="bottomRight"
                                trigger={['click']}
                            >
                                <Button size="small" icon={<MoreOutlined />} loading={actingId === record.id} />
                            </Dropdown>
                        </Tooltip>
                    </Space>
                );
            },
        },
    ], [actingId, expandedRowId, expandedTab, onEdit, onPreview, onAudit, onRotate, onSuspend, onReactivate, onRevoke, onDelete]);

    return (
        <Table
            rowKey="id"
            columns={columns}
            dataSource={items}
            pagination={false}
            size={isMobile ? 'small' : 'middle'}
            tableLayout="fixed"
            scroll={isMobile ? { x: 'max-content' } : undefined}
            expandable={expandable}
        />
    );
}
