import { useCallback, useState } from 'react';
import { Button, InputNumber, Segmented, Space, Switch, Typography } from 'antd';
import { ClearOutlined, DragOutlined, EditOutlined } from '@ant-design/icons';
import NoticeAnchorField from '@shared/components/NoticeAnchorField';
import { DESTINO_RUTA_MAX, DESTINO_ZOOM } from '@features/mapalab-eventos/constants/diversion';

const { Text } = Typography;

export default function DestinoField({ value, onChange }) {
    const [pidio, setPidio] = useState(false);
    const [modo, setModo] = useState('punto');
    const [trazando, setTrazando] = useState(false);
    const [editando, setEditando] = useState(false);
    const activo = Boolean(value) || pidio;
    const ruta = Array.isArray(value?.ruta) ? value.ruta : [];

    const alternar = (encendido) => {
        setPidio(encendido);
        setTrazando(false);
        if (!encendido) onChange?.(null);
    };

    const fijarPunto = (coord) => {
        if (!coord) setPidio(true);
        onChange?.(coord ? { ...value, ...coord, zoom: value?.zoom ?? DESTINO_ZOOM.porDefecto } : null);
    };

    const guardarPuntos = useCallback((puntos) => {
        if (!puntos || puntos.length === 0) return;
        const final = puntos[puntos.length - 1];
        onChange?.({
            ...value,
            ...final,
            zoom: value?.zoom ?? DESTINO_ZOOM.porDefecto,
            ruta: puntos.slice(0, -1),
        });
    }, [onChange, value]);

    const recibirTrazo = useCallback((puntos) => {
        setTrazando(false);
        guardarPuntos(puntos);
    }, [guardarPuntos]);

    const borrarTrazo = () => {
        setEditando(false);
        onChange?.({ ...value, ruta: null });
    };

    const fijarZoom = (zoom) => {
        if (value) onChange?.({ ...value, zoom: zoom ?? DESTINO_ZOOM.porDefecto });
    };

    const pista = (() => {
        if (modo !== 'trazo') {
            return value
                ? 'Haz clic en el mapa para mover el lugar donde termina el vuelo.'
                : 'Haz clic en el mapa para fijar el lugar donde termina el vuelo.';
        }
        if (editando) return 'Arrastra los puntos del trazo para moverlos; también puedes jalar la línea para agregar uno.';
        if (trazando) {
            return 'Haz clic en cada punto del avance y doble clic para terminar; con Shift arrastras a mano alzada. '
                + `Se guardan hasta ${DESTINO_RUTA_MAX + 1} puntos y el último es donde termina el vuelo.`;
        }
        if (ruta.length > 0) return `El trazo tiene ${ruta.length + 1} puntos. Vuelve a dibujar para reemplazarlo.`;
        return 'Dibuja el avance sobre el mapa: el visor encuadra el recorrido completo.';
    })();

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
                            onChange={(v) => { setModo(v); setTrazando(false); }}
                            options={[
                                { value: 'punto', label: 'Lugar' },
                                { value: 'trazo', label: ruta.length ? `Trazo (${ruta.length + 1})` : 'Trazo' },
                            ]}
                        />
                        {modo === 'trazo' && (
                            <>
                                <Button
                                    size="small"
                                    type={trazando ? 'primary' : 'default'}
                                    icon={<EditOutlined />}
                                    onClick={() => { setEditando(false); setTrazando((t) => !t); }}
                                >
                                    {trazando ? 'Cancelar el dibujo' : 'Dibujar el trazo'}
                                </Button>
                                <Button
                                    size="small"
                                    type={editando ? 'primary' : 'default'}
                                    icon={<DragOutlined />}
                                    onClick={() => { setTrazando(false); setEditando((e) => !e); }}
                                    disabled={ruta.length === 0}
                                >
                                    {editando ? 'Terminar de mover' : 'Mover los puntos'}
                                </Button>
                                <Button size="small" icon={<ClearOutlined />} onClick={borrarTrazo} disabled={ruta.length === 0}>
                                    Borrar el trazo
                                </Button>
                            </>
                        )}
                    </Space>
                    <NoticeAnchorField
                        value={value}
                        onChange={fijarPunto}
                        ruta={ruta}
                        trazando={trazando}
                        editandoTrazo={editando}
                        maxTrazo={DESTINO_RUTA_MAX + 1}
                        alTrazar={recibirTrazo}
                        alEditarTrazo={guardarPuntos}
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
