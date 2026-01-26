import { Card, Select, DatePicker, Row, Col, Typography, Space, Button } from 'antd';
import { FilterOutlined, ClearOutlined, CalendarOutlined } from '@ant-design/icons';
import { APPROVAL_STATUS } from '@constants/approvalConstants';

const { Text } = Typography;
const { RangePicker } = DatePicker;

export default function AdvancedFilters({
    statusFilter,
    onStatusChange,
    authorFilter,
    onAuthorChange,
    authors,
    dateRange,
    onDateRangeChange,
    onClearFilters
}) {
    return (
        <Card
            size="small"
            title={
                <Space>
                    <FilterOutlined />
                    <Text strong>Filtros Avanzados</Text>
                </Space>
            }
            extra={
                <Button
                    size="small"
                    icon={<ClearOutlined />}
                    onClick={onClearFilters}
                >
                    Limpiar todo
                </Button>
            }
        >
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                        Estado
                    </Text>
                    <Select
                        style={{ width: '100%' }}
                        value={statusFilter}
                        onChange={onStatusChange}
                    >
                        <Select.Option value="all">Todos los estados</Select.Option>
                        <Select.Option value={APPROVAL_STATUS.DRAFT}>Borrador</Select.Option>
                        <Select.Option value={APPROVAL_STATUS.PENDING_APPROVAL}>
                            Pendiente de aprobación
                        </Select.Option>
                        <Select.Option value={APPROVAL_STATUS.APPROVED}>Aprobado</Select.Option>
                        <Select.Option value={APPROVAL_STATUS.PUBLISHED}>Publicado</Select.Option>
                        <Select.Option value={APPROVAL_STATUS.REJECTED}>Rechazado</Select.Option>
                    </Select>
                </Col>

                <Col xs={24} sm={12} md={8}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                        Autor
                    </Text>
                    <Select
                        style={{ width: '100%' }}
                        value={authorFilter}
                        onChange={onAuthorChange}
                    >
                        <Select.Option value="all">Todos los autores</Select.Option>
                        {authors.map(author => (
                            <Select.Option key={author} value={author}>
                                {author}
                            </Select.Option>
                        ))}
                    </Select>
                </Col>

                <Col xs={24} sm={24} md={8}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                        <CalendarOutlined /> Rango de fechas
                    </Text>
                    <RangePicker
                        style={{ width: '100%' }}
                        value={dateRange}
                        onChange={onDateRangeChange}
                        format="DD/MM/YYYY"
                    />
                </Col>
            </Row>
        </Card>
    );
}
