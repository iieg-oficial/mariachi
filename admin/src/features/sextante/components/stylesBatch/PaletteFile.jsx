import { useState } from 'react';
import { Button, Empty, Space, Spin, Switch, Typography, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { batchErrorMessage, readTableFile } from '@features/sextante/api/stylesBatchService';
import { parsePaletteTable } from '@features/sextante/utils/paletteFile';
import ColorRamp from './ColorRamp';
import { PaletteGrid, PaletteTile } from './PaletteTile';

const { Text } = Typography;

const ACCEPTED = /\.(xlsx|xlsm|csv|tsv|txt)$/i;

export default function PaletteFile({ classes, onChoose }) {
    const [palettes, setPalettes] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [onlyMatching, setOnlyMatching] = useState(true);

    const read = async (file) => {
        if (!ACCEPTED.test(file.name)) {
            setError('Sube un Excel (.xlsx) o un CSV');
            return false;
        }
        setLoading(true);
        setError('');
        try {
            const found = parsePaletteTable(await readTableFile(file));
            setPalettes(found);
            setOnlyMatching(found.some((p) => p.colors.length === classes));
            if (!found.length) setError('No encontré columnas palette_name y hex');
        } catch (err) {
            setError(batchErrorMessage(err, 'No se pudo leer el archivo'));
        } finally {
            setLoading(false);
        }
        return false;
    };

    const shown = (palettes || []).filter((p) => !onlyMatching || p.colors.length === classes);

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap>
                <Upload accept={{ format: '.xlsx,.xlsm,.csv,.tsv,.txt', filter: 'native' }} showUploadList={false} beforeUpload={read}>
                    <Button shape="round" icon={<UploadOutlined />} loading={loading}>Elegir archivo</Button>
                </Upload>
                {palettes?.length > 0 && (
                    <Space size={6}>
                        <Switch size="small" checked={onlyMatching} onChange={setOnlyMatching} aria-label="Solo las que caben" />
                        <Text type="secondary">Solo de {classes} colores</Text>
                    </Space>
                )}
            </Space>
            {error && <Text type="danger">{error}</Text>}
            {loading && <Spin />}
            {palettes?.length > 0 && !shown.length && <Empty description={`Ninguna de ${classes} colores`} />}
            <PaletteGrid>
                {shown.map((palette) => (
                    <PaletteTile key={palette.name} label={palette.name} onClick={() => onChoose(palette.colors)}>
                        <ColorRamp colors={palette.colors} stretch />
                    </PaletteTile>
                ))}
            </PaletteGrid>
        </Space>
    );
}
