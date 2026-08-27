import { useMemo } from 'react';
import { Alert, Modal, Select, Table, Typography } from 'antd';
import { FIELD_OPTIONS } from '@features/mapalab-layers/constants/bulkIngestFields';

const { Text } = Typography;

export default function MappingModal({ open, onClose, mapping, setMapping }) {
    const dataSource = useMemo(
        () => Object.keys(mapping).map((src) => ({ key: src, source: src, target: mapping[src] || '' })),
        [mapping]
    );

    const updateTarget = (src, target) => {
        setMapping({ ...mapping, [src]: target });
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            onOk={onClose}
            title="Mapeo columna → campo técnico"
            width={720}
            okText="Listo"
            cancelText="Cancelar"
        >
            <Alert
                type="info"
                title="Selecciona '— ignorar —' para columnas que no quieras importar. layer_key es obligatorio."
                showIcon
                style={{ marginBottom: 12 }}
                closable
            />
            <Table
                dataSource={dataSource}
                pagination={false}
                size="small"
                columns={[
                    {
                        title: 'Columna del archivo',
                        dataIndex: 'source',
                        key: 'source',
                        width: '50%',
                        render: (v) => <Text>{v}</Text>,
                    },
                    {
                        title: 'Campo destino',
                        dataIndex: 'target',
                        key: 'target',
                        render: (v, row) => (
                            <Select
                                value={v}
                                onChange={(val) => updateTarget(row.source, val)}
                                options={FIELD_OPTIONS}
                                style={{ width: '100%' }}
                                showSearch
                                optionFilterProp="label"
                            />
                        ),
                    },
                ]}
                scroll={{ y: 400 }}
            />
        </Modal>
    );
}
