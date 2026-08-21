import { Col, Input, Row, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { ROLE_SELECT_OPTIONS } from '../constants/roles';
import { SIN_PROYECTOS } from '../hooks/useFiltroUsuarios';

export default function UsersFilters({
    filtros,
    onBusqueda,
    onRol,
    onProyecto,
    proyectos = [],
    mostrarProyecto = true,
}) {
    const opcionesProyecto = [
        ...proyectos.map((p) => ({ value: p.slug, label: p.name })),
        { value: SIN_PROYECTOS, label: 'Sin proyectos asignados' },
    ];

    return (
        <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
            <Col xs={24} md={mostrarProyecto ? 12 : 16}>
                <Input
                    allowClear
                    placeholder="Buscar por usuario, nombre, email, proyecto o dependencia"
                    prefix={<SearchOutlined />}
                    value={filtros.busqueda}
                    onChange={(e) => onBusqueda(e.target.value)}
                />
            </Col>
            <Col xs={12} md={6}>
                <Select
                    allowClear
                    placeholder="Rol"
                    value={filtros.rol || undefined}
                    onChange={(v) => onRol(v || '')}
                    style={{ width: '100%' }}
                    options={ROLE_SELECT_OPTIONS}
                />
            </Col>
            {mostrarProyecto && (
                <Col xs={12} md={6}>
                    <Select
                        allowClear
                        placeholder="Proyecto"
                        value={filtros.proyecto || undefined}
                        onChange={(v) => onProyecto(v || '')}
                        style={{ width: '100%' }}
                        options={opcionesProyecto}
                    />
                </Col>
            )}
        </Row>
    );
}
