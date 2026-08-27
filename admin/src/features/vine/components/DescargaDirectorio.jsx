import { DownloadOutlined } from '@ant-design/icons';
import { App, Button, Checkbox, Col, Modal, Radio, Row, Space, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';

import { triggerDownload } from '@shared/helpers/downloadFile';
import { exportarPersonal, getCamposExportables } from '@features/vine/api/vineService';

const { Text } = Typography;

const DescargaDirectorio = ({ pins, dias = 365 }) => {
    const { message } = App.useApp();
    const [abierto, setAbierto] = useState(false);
    const [campos, setCampos] = useState([]);
    const [elegidos, setElegidos] = useState([]);
    const [formato, setFormato] = useState('xlsx');
    const [bajando, setBajando] = useState(false);

    const cargar = useCallback(async () => {
        try {
            const datos = await getCamposExportables();
            setCampos(datos.campos ?? []);
            setElegidos(datos.por_omision ?? []);
        } catch {
            message.error('No se pudieron leer los campos exportables');
        }
    }, [message]);

    useEffect(() => { if (abierto && !campos.length) cargar(); }, [abierto, campos.length, cargar]);

    const descargar = async () => {
        setBajando(true);
        try {
            const res = await exportarPersonal({ formato, dias, campos: elegidos, pins });
            triggerDownload(res, `vine-personal.${formato}`);
            setAbierto(false);
        } catch {
            message.error('No se pudo generar el archivo');
        } finally {
            setBajando(false);
        }
    };

    const todos = elegidos.length === campos.length;

    return (
        <>
            <Button icon={<DownloadOutlined />} onClick={() => setAbierto(true)}>
                Descargar
            </Button>
            <Modal
                open={abierto}
                title="Descargar el directorio"
                onCancel={() => setAbierto(false)}
                okText={`Descargar ${pins.length}`}
                confirmLoading={bajando}
                okButtonProps={{ disabled: !elegidos.length || !pins.length }}
                onOk={descargar}
                width={640}
            >
                <Space orientation="vertical" size={16} style={{ width: '100%' }}>
                    <Text type="secondary">
                        {`Se descargan las ${pins.length} personas que estás viendo, con el filtro y la búsqueda ya aplicados.`}
                    </Text>

                    <Radio.Group
                        value={formato}
                        onChange={(e) => setFormato(e.target.value)}
                        optionType="button"
                        options={[
                            { value: 'xlsx', label: 'Excel' },
                            { value: 'csv', label: 'CSV' },
                        ]}
                    />

                    <div>
                        <Space style={{ marginBottom: 8 }}>
                            <Text strong>Campos</Text>
                            <Button
                                type="link"
                                size="small"
                                onClick={() => setElegidos(todos ? [] : campos.map((c) => c.clave))}
                            >
                                {todos ? 'Ninguno' : 'Todos'}
                            </Button>
                        </Space>
                        <Checkbox.Group value={elegidos} onChange={setElegidos} style={{ width: '100%' }}>
                            <Row gutter={[8, 8]}>
                                {campos.map((c) => (
                                    <Col xs={12} sm={8} key={c.clave}>
                                        <Checkbox value={c.clave}>{c.nombre}</Checkbox>
                                    </Col>
                                ))}
                            </Row>
                        </Checkbox.Group>
                    </div>
                </Space>
            </Modal>
        </>
    );
};

export default DescargaDirectorio;
