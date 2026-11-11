import { useState } from 'react';
import { Button, Input, Space, Tooltip, Typography, Upload } from 'antd';
import { InboxOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { TABLE_COLUMNS } from '@features/mapalab-layers/utils/stylesBatchTable';

const { Text } = Typography;

const COLUMNS_TIP = `Columnas: ${TABLE_COLUMNS.join(', ')}. Las columnas tipo, numero_clases y severidad ya no hacen falta.`;

export default function UploadStep({ loading, onSubmit }) {
    const [pasted, setPasted] = useState('');

    const readFile = (file) => {
        file.text().then(onSubmit);
        return false;
    };

    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Upload.Dragger
                accept=".csv,.tsv,.txt"
                showUploadList={false}
                beforeUpload={readFile}
                disabled={loading}
            >
                <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                <p className="ant-upload-text">Arrastra aquí tu tabla de estilos</p>
                <p className="ant-upload-hint">CSV, la misma de siempre</p>
            </Upload.Dragger>
            <Space orientation="vertical" style={{ width: '100%' }}>
                <Space>
                    <Text strong>O pégala desde Excel</Text>
                    <Tooltip title={COLUMNS_TIP}>
                        <InfoCircleOutlined aria-label={COLUMNS_TIP} />
                    </Tooltip>
                </Space>
                <Input.TextArea
                    id="tabla-pegada"
                    value={pasted}
                    onChange={(e) => setPasted(e.target.value)}
                    autoSize={{ minRows: 4, maxRows: 10 }}
                    placeholder="Copia las celdas con encabezados y pégalas aquí"
                    style={{ fontFamily: 'monospace' }}
                />
                <Button
                    type="primary"
                    shape="round"
                    loading={loading}
                    disabled={!pasted.trim()}
                    onClick={() => onSubmit(pasted)}
                >
                    Revisar tabla
                </Button>
            </Space>
        </Space>
    );
}
