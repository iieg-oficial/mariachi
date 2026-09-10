import { useState } from 'react';
import { InputNumber, Space, Switch, Typography } from 'antd';
import NoticeAnchorField from '@shared/components/NoticeAnchorField';
import { DESTINO_ZOOM } from '@features/mapalab-eventos/constants/diversion';

const { Text } = Typography;

export default function DestinoField({ value, onChange }) {
    const [pidio, setPidio] = useState(false);
    const activo = Boolean(value) || pidio;

    const alternar = (encendido) => {
        setPidio(encendido);
        if (!encendido) onChange?.(null);
    };

    const fijarPunto = (coord) => {
        if (!coord) setPidio(true);
        onChange?.(coord ? { ...coord, zoom: value?.zoom ?? DESTINO_ZOOM.porDefecto } : null);
    };

    const fijarZoom = (zoom) => {
        if (value) onChange?.({ ...value, zoom: zoom ?? DESTINO_ZOOM.porDefecto });
    };

    return (
        <Space orientation="vertical" size={6} style={{ width: '100%' }}>
            <Space size={8} wrap>
                <Switch size="small" checked={activo} onChange={alternar} aria-label="Llevar a un lugar" />
                <Text style={{ fontSize: 12 }}>Las águilas te llevan a un lugar</Text>
                {activo && (
                    <>
                        <Text type="secondary" style={{ fontSize: 12 }}>Zoom</Text>
                        <InputNumber
                            size="small"
                            min={DESTINO_ZOOM.min}
                            max={DESTINO_ZOOM.max}
                            value={value?.zoom ?? DESTINO_ZOOM.porDefecto}
                            onChange={fijarZoom}
                            disabled={!value}
                            style={{ width: 64 }}
                            aria-label="Zoom del lugar"
                        />
                    </>
                )}
            </Space>
            {activo && (
                <NoticeAnchorField
                    value={value}
                    onChange={fijarPunto}
                    height={240}
                    layerHint={false}
                    hint="Haz clic en el mapa para fijar el lugar."
                    defaultZoom={value ? { lon: value.lon, lat: value.lat, zoom: 11 } : undefined}
                />
            )}
        </Space>
    );
}
