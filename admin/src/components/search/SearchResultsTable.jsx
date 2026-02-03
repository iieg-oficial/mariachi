import { useNavigate } from 'react-router';
import { Table, Space, Typography, Button, Tooltip, Empty, Tag, Row, Col } from 'antd';
import {
    EditOutlined,
    EyeOutlined,
    FileTextOutlined,
    UserOutlined
} from '@ant-design/icons';
import { APPROVAL_STATUS } from '@constants/approvalConstants';

const { Text } = Typography;

const getStatusTag = (status) => {
    const statusConfig = {
        [APPROVAL_STATUS.DRAFT]: { color: 'default', text: 'Borrador' },
        [APPROVAL_STATUS.PENDING_APPROVAL]: { color: 'warning', text: 'Pendiente' },
        [APPROVAL_STATUS.APPROVED]: { color: 'processing', text: 'Aprobado' },
        [APPROVAL_STATUS.PUBLISHED]: { color: 'success', text: 'Publicado' },
        [APPROVAL_STATUS.REJECTED]: { color: 'error', text: 'Rechazado' }
    };

    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
};

export default function SearchResultsTable({
    results,
    loading,
    searchTerm,
    hasActiveFilters,
    onClearFilters
}) {
    const navigate = useNavigate();

    const columns = [
        {
            title: 'Título',
            dataIndex: 'title',
            key: 'title',
            width: '25%',
            render: (text, record) => (
                <Space orientation="vertical" size="small">
                    <Text strong>{text}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {record.slug}
                    </Text>
                </Space>
            ),
            sorter: (a, b) => a.title.localeCompare(b.title)
        },
        {
            title: 'Descripción',
            dataIndex: 'description',
            key: 'description',
            width: '25%',
            ellipsis: true
        },
        {
            title: 'Estado',
            dataIndex: 'status',
            key: 'status',
            width: '12%',
            render: (status) => getStatusTag(status),
            filters: [
                { text: 'Borrador', value: APPROVAL_STATUS.DRAFT },
                { text: 'Pendiente', value: APPROVAL_STATUS.PENDING_APPROVAL },
                { text: 'Aprobado', value: APPROVAL_STATUS.APPROVED },
                { text: 'Publicado', value: APPROVAL_STATUS.PUBLISHED }
            ],
            onFilter: (value, record) => record.status === value
        },
        {
            title: 'Autor',
            dataIndex: 'author',
            key: 'author',
            width: '12%',
            render: (text) => (
                <Space size="small">
                    <UserOutlined />
                    <Text>{text}</Text>
                </Space>
            ),
            sorter: (a, b) => a.author.localeCompare(b.author)
        },
        {
            title: 'Última modificación',
            dataIndex: 'lastModified',
            key: 'lastModified',
            width: '15%',
            render: (date) => {
                if (!date) return '-';
                const dateObj = typeof date === 'string' ? new Date(date) : date;
                return (
                    <Space orientation="vertical" size="small">
                        <Text>{dateObj.toLocaleDateString('es-ES')}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </Space>
                );
            },
            sorter: (a, b) => {
                const dateA = new Date(a.lastModified);
                const dateB = new Date(b.lastModified);
                return dateA - dateB;
            },
            defaultSortOrder: 'descend'
        },
        {
            title: 'Acciones',
            key: 'actions',
            width: '11%',
            render: (_, record) => (
                <Space>
                    <Tooltip title="Editar">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => navigate(`/pages/edit/${record.id}`)}
                        />
                    </Tooltip>
                    <Tooltip title="Vista previa">
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                        />
                    </Tooltip>
                </Space>
            )
        }
    ];

    return (
        <div>
            <Space style={{ marginBottom: 16 }}>
                <Text strong>
                    {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
                </Text>
                {searchTerm && (
                    <Text type="secondary">
                        para "{searchTerm}"
                    </Text>
                )}
            </Space>

            <Table
                columns={columns}
                dataSource={results}
                rowKey="id"
                loading={loading}
                locale={{
                    emptyText: (
                        <Empty
                            image={<FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                            description={
                                hasActiveFilters
                                    ? 'No se encontraron páginas que coincidan con los criterios de búsqueda'
                                    : 'No hay páginas disponibles'
                            }
                        >
                            {hasActiveFilters && (
                                <Button type="primary" onClick={onClearFilters}>
                                    Limpiar filtros
                                </Button>
                            )}
                        </Empty>
                    )
                }}
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} páginas`,
                    pageSizeOptions: ['10', '20', '50', '100']
                }}
                expandable={{
                    expandedRowRender: (record) => (
                        <div style={{ padding: '12px 24px' }}>
                            <Row gutter={[16, 8]}>
                                <Col span={12}>
                                    <Text type="secondary">Etiquetas:</Text>
                                    <div style={{ marginTop: 4 }}>
                                        {record.tags.map(tag => (
                                            <Tag key={tag}>{tag}</Tag>
                                        ))}
                                    </div>
                                </Col>
                                <Col span={12}>
                                    <Text type="secondary">Palabras:</Text>
                                    <div style={{ marginTop: 4 }}>
                                        <Text>{record.wordCount} palabras</Text>
                                    </div>
                                </Col>
                            </Row>
                        </div>
                    ),
                    rowExpandable: (record) => record.tags && record.tags.length > 0
                }}
            />
        </div>
    );
}
