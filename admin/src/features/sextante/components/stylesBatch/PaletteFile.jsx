import { useEffect, useState } from 'react';
import { Empty, Space, Spin, Switch, Typography } from 'antd';
import { batchErrorMessage, readTableFile } from '@features/sextante/api/stylesBatchService';
import { parsePaletteTable } from '@features/sextante/utils/paletteFile';
import ColorRamp from './ColorRamp';
import { PaletteGrid, PaletteTile } from './PaletteTile';

const { Text } = Typography;

export const PALETTE_FILE = /\.(xlsx|xlsm|csv|tsv|txt)$/i;

export default function PaletteFile({ file, classes, onChoose }) {
    const [result, setResult] = useState({ file: null, palettes: [], error: '' });
    const [onlyMatching, setOnlyMatching] = useState(true);
    const loading = result.file !== file;

    useEffect(() => {
        let active = true;
        readTableFile(file)
            .then((text) => {
                if (!active) return;
                const palettes = parsePaletteTable(text);
                setOnlyMatching(palettes.some((p) => p.colors.length === classes));
                setResult({ file, palettes, error: palettes.length ? '' : 'No encontré columnas palette_name y hex' });
            })
            .catch((err) => {
                if (active) setResult({ file, palettes: [], error: batchErrorMessage(err, 'No se pudo leer el archivo') });
            });
        return () => { active = false; };
    }, [file, classes]);

    if (loading) return <Spin />;

    const shown = result.palettes.filter((p) => !onlyMatching || p.colors.length === classes);

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap>
                <Text strong>{file.name}</Text>
                {result.palettes.length > 0 && (
                    <Space size={6}>
                        <Switch size="small" checked={onlyMatching} onChange={setOnlyMatching} aria-label="Solo las que caben" />
                        <Text type="secondary">Solo de {classes} colores</Text>
                    </Space>
                )}
            </Space>
            {result.error && <Text type="danger">{result.error}</Text>}
            {result.palettes.length > 0 && !shown.length && <Empty description={`Ninguna de ${classes} colores`} />}
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
