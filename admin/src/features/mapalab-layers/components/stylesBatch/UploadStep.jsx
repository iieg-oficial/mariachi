import { useState } from 'react';
import { Button, Space, Tooltip, Typography, Upload } from 'antd';
import { InboxOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';
import { emptyGrid, gridToTable } from '@features/mapalab-layers/utils/stylesBatchTable';
import PasteGrid from './PasteGrid';

const { Text } = Typography;

const ACCEPTED = /\.(xlsx|xlsm|csv|tsv|txt)$/i;
const PASTE_TIP = 'Selecciona en Excel desde la columna del nombre hasta la de cortes, copia y pega en la primera celda. Los encabezados se ignoran.';

export default function UploadStep({ loading, onFile, onSubmit }) {
    const [grid, setGrid] = useState(emptyGrid);
    const table = gridToTable(grid);

    const readFile = (file) => {
        if (ACCEPTED.test(file.name)) onFile(file);
        else message.error('Sube un Excel (.xlsx) o un CSV');
        return false;
    };

    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Upload.Dragger
                accept={{ format: '.xlsx,.xlsm,.csv,.tsv,.txt', filter: 'native' }}
                showUploadList={false}
                beforeUpload={readFile}
                disabled={loading}
                multiple={false}
            >
                <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                <p className="ant-upload-text">Arrastra aquí tu tabla de estilos</p>
                <p className="ant-upload-hint">Excel o CSV</p>
            </Upload.Dragger>
            <Space orientation="vertical" style={{ width: '100%' }}>
                <Space>
                    <Text strong>O pégala desde Excel</Text>
                    <Tooltip title={PASTE_TIP}>
                        <InfoCircleOutlined aria-label={PASTE_TIP} />
                    </Tooltip>
                </Space>
                <PasteGrid value={grid} onChange={setGrid} />
                <Space>
                    <Button
                        type="primary"
                        shape="round"
                        loading={loading}
                        disabled={!table}
                        onClick={() => onSubmit(table)}
                    >
                        Revisar tabla
                    </Button>
                    <Button shape="round" disabled={!table} onClick={() => setGrid(emptyGrid())}>
                        Vaciar
                    </Button>
                </Space>
            </Space>
        </Space>
    );
}
