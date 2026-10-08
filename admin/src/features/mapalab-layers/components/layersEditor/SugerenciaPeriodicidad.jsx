import { useState } from 'react';
import { Button, Modal, Space, Typography } from 'antd';
import { BulbOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

export default function SugerenciaPeriodicidad({ campo, valor, sugerido, actualizadaEn, onAplicar }) {
    const [abierto, setAbierto] = useState(false);

    if (!sugerido || sugerido === valor) return null;

    const vacio = !valor;

    return (
        <>
            <Button
                type="text"
                size="small"
                icon={<BulbOutlined style={{ color: '#9E5200' }} />}
                onClick={() => setAbierto(true)}
                aria-label={`Sugerencia para ${campo}`}
                style={{ paddingInline: 4 }}
            />
            <Modal
                open={abierto}
                onCancel={() => setAbierto(false)}
                title={`Sugerencia para ${campo}`}
                footer={[
                    <Button key="no" onClick={() => setAbierto(false)}>Dejar como está</Button>,
                    <Button
                        key="si"
                        type="primary"
                        onClick={() => { onAplicar(sugerido); setAbierto(false); }}
                    >
                        Usar «{sugerido}»
                    </Button>,
                ]}
            >
                <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                    <Paragraph style={{ marginBottom: 0 }}>
                        La periodicidad calculada de esta capa indica <b>{sugerido}</b>
                        {vacio ? ' y este campo está vacío.' : <> , pero aquí dice <b>{valor}</b>.</>}
                    </Paragraph>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Sale de las fechas que existen en la tabla de origen, que un proceso recorre cada
                        noche. <b>No se aplica sola:</b> lo que está capturado a mano manda, porque puede
                        responder a una decisión que los datos no conocen.
                    </Text>
                    {actualizadaEn && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            Calculada el {new Date(actualizadaEn).toLocaleString()}.
                        </Text>
                    )}
                </Space>
            </Modal>
        </>
    );
}
