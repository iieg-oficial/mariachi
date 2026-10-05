import { useState } from 'react';
import { Button, InputNumber, Segmented, Space, Switch, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import NoticeAnchorField from '@shared/components/NoticeAnchorField';
import { DESTINO_RUTA_MAX, DESTINO_ZOOM } from '@features/mapalab-eventos/constants/diversion';

const { Text } = Typography;

export default function DestinoField({ value, onChange }) {
    const [pidio, setPidio] = useState(false);
    const [modo, setModo] = useState('punto');
    const activo = Boolean(value) || pidio;
    const ruta = Array.isArray(value?.ruta) ? value.ruta : [];
    const lleno = ruta.length >= DESTINO_RUTA_MAX;
    const enRuta = modo === 'ruta' && Boolean(value) && !lleno;

    const alternar = (encendido) => {
        setPidio(encendido);
        if (!encendido) onChange?.(null);
    };

    const fijarPunto = (coord) => {
        if (!coord) setPidio(true);
        onChange?.(coord ? { ...value, ...coord, zoom: value?.zoom ?? DESTINO_ZOOM.porDefecto } : null);
    };

    const fijarRuta = (puntos) => onChange?.({ ...value, ruta: puntos.slice(0, DESTINO_RUTA_MAX) });

    const quitarUltimo = () => onChange?.({ ...value, ruta: ruta.slice(0, -1) });

    const fijarZoom = (zoom) => {
        if (value) onChange?.({ ...value, zoom: zoom ?? DESTINO_ZOOM.porDefecto });
    };

    const pista = !value
        ? 'Haz clic en el mapa para fijar el lugar donde termina el vuelo.'
        : enRuta
            ? `Haz clic para agregar un punto de avance. Van ${ruta.length} de ${DESTINO_RUTA_MAX}.`
            : lleno && modo === 'ruta'
                ? `Ya tiene los ${DESTINO_RUTA_MAX} puntos de avance. Quita uno para agregar otro.`
                : 'Haz clic en el mapa para mover el lugar donde termina el vuelo.';

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
                <>
                    <Space size={8} wrap>
                        <Segmented
                            size="small"
                            value={modo}
                            onChange={setModo}
                            disabled={!value}
                            options={[
                                { value: 'punto', label: 'Lugar' },
                                { value: 'ruta', label: `Ruta (${ruta.length})` },
                            ]}
                        />
                        {modo === 'ruta' && (
                            <Button size="small" icon={<DeleteOutlined />} onClick={quitarUltimo} disabled={ruta.length === 0}>
                                Quitar el último
                            </Button>
                        )}
                    </Space>
                    <NoticeAnchorField
                        value={value}
                        onChange={fijarPunto}
                        ruta={ruta}
                        onRutaChange={fijarRuta}
                        enRuta={enRuta}
                        height={260}
                        layerHint={false}
                        hint={pista}
                        defaultZoom={value ? { lon: value.lon, lat: value.lat, zoom: 10 } : undefined}
                    />
                </>
            )}
        </Space>
    );
}
