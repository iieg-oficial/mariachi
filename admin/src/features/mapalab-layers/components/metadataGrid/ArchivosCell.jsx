import { Typography } from 'antd';
import { PaperClipOutlined } from '@ant-design/icons';
import ArchivosModal from '@features/mapalab-layers/components/metadataGrid/ArchivosModal';

const { Text } = Typography;

export default function ArchivosCell({ rowData, setRowData, focus, stopEditing }) {
    const total = rowData?.length || 0;
    const cerrar = () => setTimeout(() => stopEditing({ nextRow: false }), 0);
    return (
        <>
            <Text type={total ? undefined : 'secondary'} style={{ padding: '0 10px', fontSize: 13 }}>
                {total ? <><PaperClipOutlined /> {total} {total === 1 ? 'archivo' : 'archivos'}</> : '—'}
            </Text>
            <ArchivosModal
                open={focus}
                archivos={rowData}
                onCancel={cerrar}
                onApply={(lista) => {
                    setRowData(lista.length ? lista : null);
                    cerrar();
                }}
            />
        </>
    );
}
