import { Button, Col, DatePicker, Form, Input, Row, Select, Space, Switch } from 'antd';
import dayjs from 'dayjs';

import useCatalogo from '@features/vine/hooks/useCatalogo';

const aFecha = (v) => (v ? dayjs(v) : null);

const FormularioFicha = ({ fila, ficha, guardando, onGuardar }) => {
    const [form] = Form.useForm();
    const horarios = useCatalogo('horario');
    const vinculos = useCatalogo('vinculo');
    const tarjetas = useCatalogo('tarjeta');
    const areas = useCatalogo('area');

    const inicial = {
        nombre: ficha?.nombre ?? '',
        apellidos: ficha?.apellidos ?? '',
        email: ficha?.email ?? fila.email ?? '',
        telefono: ficha?.telefono ?? '',
        extension: ficha?.extension ?? '',
        puesto: ficha?.puesto ?? '',
        departamento: ficha?.departamento ?? fila.departamento ?? '',
        vinculo: ficha?.vinculo ?? fila.vinculo ?? undefined,
        horario: ficha?.horario ?? fila.horario ?? undefined,
        cumpleanos: aFecha(ficha?.cumpleanos),
        fecha_ingreso: aFecha(ficha?.fecha_ingreso),
        foto_url: ficha?.foto_url ?? '',
        tarjeta: ficha?.tarjeta ?? undefined,
        activo: ficha?.activo ?? true,
        notas: ficha?.notas ?? '',
    };

    const enviar = (valores) => {
        onGuardar({
            ...valores,
            cumpleanos: valores.cumpleanos ? valores.cumpleanos.format('YYYY-MM-DD') : null,
            fecha_ingreso: valores.fecha_ingreso ? valores.fecha_ingreso.format('YYYY-MM-DD') : null,
        });
    };

    return (
        <Form form={form} layout="vertical" size="small" initialValues={inicial} onFinish={enviar}>
            <Row gutter={12}>
                <Col xs={24} md={8}>
                    <Form.Item name="nombre" label="Nombre">
                        <Input placeholder={fila.nombre || 'Sin dato en el biométrico'} />
                    </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                    <Form.Item name="apellidos" label="Apellidos"><Input /></Form.Item>
                </Col>
                <Col xs={24} md={8}>
                    <Form.Item name="puesto" label="Puesto"><Input /></Form.Item>
                </Col>
                <Col xs={24} md={8}>
                    <Form.Item name="email" label="Correo">
                        <Input type="email" />
                    </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                    <Form.Item name="telefono" label="Teléfono"><Input /></Form.Item>
                </Col>
                <Col xs={24} md={8}>
                    <Form.Item name="extension" label="Extensión"><Input /></Form.Item>
                </Col>
                <Col xs={24} md={8}>
                    <Form.Item name="departamento" label="Área">
                        <Select
                            allowClear
                            showSearch
                            options={areas.opcionesNombre}
                            loading={areas.cargando}
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                    <Form.Item name="vinculo" label="Vínculo">
                        <Select allowClear options={vinculos.opcionesNombre} loading={vinculos.cargando} />
                    </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                    <Form.Item name="horario" label="Horario">
                        <Select allowClear options={horarios.opciones} loading={horarios.cargando} />
                    </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                    <Form.Item name="tarjeta" label="Tarjeta asignada">
                        <Select allowClear options={tarjetas.opciones} loading={tarjetas.cargando} placeholder="Sin tarjeta" />
                    </Form.Item>
                </Col>
                <Col xs={12} md={4}>
                    <Form.Item name="cumpleanos" label="Cumpleaños">
                        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                </Col>
                <Col xs={12} md={4}>
                    <Form.Item name="fecha_ingreso" label="Ingreso">
                        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                </Col>
                <Col xs={24} md={16}>
                    <Form.Item name="foto_url" label="Foto (URL)">
                        <Input placeholder="https://…" />
                    </Form.Item>
                </Col>
                <Col xs={12} md={4}>
                    <Form.Item name="activo" label="Activo" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Col>
                <Col xs={24}>
                    <Form.Item name="notas" label="Notas">
                        <Input.TextArea rows={2} maxLength={500} showCount />
                    </Form.Item>
                </Col>
            </Row>
            <Space>
                <Button type="primary" htmlType="submit" loading={guardando}>Guardar ficha</Button>
                <Button onClick={() => form.resetFields()}>Descartar cambios</Button>
            </Space>
        </Form>
    );
};

export default FormularioFicha;
