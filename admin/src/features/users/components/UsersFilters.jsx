import { Col, Input, Row, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { ROLE_SELECT_OPTIONS } from '../constants/roles';
import { ORDEN_OPTIONS, SIN_PROYECTOS } from '../hooks/useFiltroUsuarios';

export default function UsersFilters({
    filtros,
    onBusqueda,
    onRol,
    onProyecto,
    onOrden,
    proyectos = [],
    mostrarProyecto = true,
}) {
    const opcionesProyecto = [
        ...proyectos.map((p) => ({ value: p.slug, label: p.name })),
        { value: SIN_PROYECTOS, label: 'Sin proyectos asignados' },
    ];

    return (
        <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
            <Col xs={24} md={mostrarProyecto ? 9 : 14}>
                <Input
                    allowClear
                    placeholder="Buscar por usuario, nombre, email, proyecto o dependencia"
                    prefix={<SearchOutlined />}
                    value={filtros.busqueda}
                    onChange={(e) => onBusqueda(e.target.value)}
                />
            </Col>
            <Col xs={12} md={5}>
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
                <Col xs={12} md={5}>
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
            <Col xs={24} md={5}>
                <Select
                    value={filtros.orden}
                    onChange={onOrden}
                    style={{ width: '100%' }}
                    options={ORDEN_OPTIONS}
                />
            </Col>
        </Row>
    );
}
