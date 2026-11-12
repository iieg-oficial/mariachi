import { useMemo, useState } from 'react';
import { Button, Empty, List, Modal, Space, Tooltip, Typography } from 'antd';
import { CalendarOutlined, CheckOutlined } from '@ant-design/icons';
import {
    CONTRACT_DATE_COLUMN,
    candidatasPorContrato,
} from '@features/mapalab-layers/utils/columnaFecha';

const { Text } = Typography;

const DESCRIPCION = 'Capas cuya tabla tiene fecha_periodo_seleccion de tipo fecha y aún no tienen columna '
    + 'de fecha configurada. Se marcan como cambios pendientes; se guardan con Guardar.';

export default function FechaPorContratoAction({ data, applyPatches, disabled }) {
    const [open, setOpen] = useState(false);
    const candidatas = useMemo(() => candidatasPorContrato(data), [data]);

    const marcar = () => {
        applyPatches(candidatas.map((row) => ({
            rowKey: row.id,
            column: 'date_column',
            value: CONTRACT_DATE_COLUMN,
        })));
        setOpen(false);
    };

    return (
        <>
            <Tooltip title={DESCRIPCION}>
                <Button
                    size="small"
                    shape="round"
                    icon={<CalendarOutlined />}
                    disabled={disabled}
                    onClick={() => setOpen(true)}
                >
                    Fecha por contrato
                </Button>
            </Tooltip>
            <Modal
                open={open}
                title="Columna de fecha por contrato"
                onCancel={() => setOpen(false)}
                width={560}
                footer={(
                    <Space>
                        <Button shape="round" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button
                            shape="round"
                            type="primary"
                            icon={<CheckOutlined />}
                            disabled={!candidatas.length}
                            onClick={marcar}
                        >
                            {`Marcar ${candidatas.length} ${candidatas.length === 1 ? 'celda' : 'celdas'}`}
                        </Button>
                    </Space>
                )}
            >
                <Text type="secondary">{DESCRIPCION}</Text>
                {candidatas.length ? (
                    <List
                        size="small"
                        style={{ marginTop: 12, maxHeight: 320, overflowY: 'auto' }}
                        dataSource={candidatas}
                        renderItem={(row) => (
                            <List.Item>
                                <Space direction="vertical" size={0}>
                                    <Text>{row.label || row.id}</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {`${row.workspace_alias || '—'} · ${row.geoserver_layer || '—'}`}
                                    </Text>
                                </Space>
                            </List.Item>
                        )}
                    />
                ) : (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Ninguna capa pendiente"
                        style={{ marginTop: 12 }}
                    />
                )}
            </Modal>
        </>
    );
}
