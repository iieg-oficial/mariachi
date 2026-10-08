import { FileExcelOutlined, FileTextOutlined, HistoryOutlined } from '@ant-design/icons';

export const EXPORT_ITEMS = [
    { key: 'xlsx', icon: <FileExcelOutlined />, label: 'Excel (datos + historial)' },
    { key: 'csv-metadatos', icon: <FileTextOutlined />, label: 'CSV de datos' },
    { key: 'csv-historial', icon: <HistoryOutlined />, label: 'CSV de historial' },
];
