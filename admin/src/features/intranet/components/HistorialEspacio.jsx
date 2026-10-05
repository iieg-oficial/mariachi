import { useCallback, useEffect, useState } from 'react';
import { Button, Drawer, Popconfirm, Space, Spin, Timeline, Typography, message } from 'antd';
import dayjs from 'dayjs';

import { historialEspacio, restaurarEspacio } from '../api/espaciosService';
import { CAMPOS_HISTORIAL, ORIGENES, TIPOS_ESPACIO } from '../constants/espacios';

const { Text } = Typography;

const valor = (campo, dato, pisos) => {
    if (campo === 'tipo') return TIPOS_ESPACIO[dato]?.texto ?? dato;
    if (campo === 'piso_id') return pisos.find((piso) => piso.id === dato)?.nombre ?? dato;
    if (typeof dato === 'boolean') return dato ? 'sí' : 'no';
    return String(dato ?? '—');
};

const cambios = (entrada, pisos) => {
    if (entrada.accion === 'insert') return ['Alta del espacio'];
    if (entrada.accion === 'delete') return ['Baja del espacio'];
    const lineas = Object.entries(CAMPOS_HISTORIAL)
        .filter(([campo]) => entrada.antes?.[campo] !== entrada.despues?.[campo])
        .map(([campo, etiqueta]) => `${etiqueta}: «${valor(campo, entrada.antes?.[campo], pisos)}» → «${valor(campo, entrada.despues?.[campo], pisos)}»`);
    if (entrada.cambio_trazo) lineas.push('Cambió el trazo');
    return lineas.length ? lineas : ['Sin cambios visibles'];
};

const HistorialEspacio = ({ espacio, pisos, puedeGestionar, onCerrar, onRestaurado }) => {
    const [entradas, setEntradas] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [restaurando, setRestaurando] = useState(null);

    const cargar = useCallback(async () => {
        if (!espacio) return;
        setCargando(true);
        try {
            setEntradas(await historialEspacio(espacio.fid));
        } catch {
            message.error('No se pudo consultar el historial');
        } finally {
            setCargando(false);
        }
    }, [espacio]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const restaurar = async (entrada) => {
        setRestaurando(entrada.id);
        try {
            await restaurarEspacio(espacio.fid, entrada.id);
            message.success('Se volvió a esa versión');
            await cargar();
            onRestaurado();
        } catch {
            message.error('No se pudo volver a esa versión');
        } finally {
            setRestaurando(null);
        }
    };

    const items = entradas.map((entrada, posicion) => ({
        key: entrada.id,
        color: posicion === 0 ? 'orange' : 'gray',
        children: (
            <Space direction="vertical" size={2}>
                {cambios(entrada, pisos).map((linea) => <Text key={linea}>{linea}</Text>)}
                <Text type="secondary">
                    {dayjs(entrada.cuando).format('DD/MM/YYYY HH:mm')} · {entrada.quien} · {ORIGENES[entrada.origen] ?? entrada.origen}
                </Text>
                {puedeGestionar && posicion > 0 && entrada.despues && (
                    <Popconfirm
                        title="¿Volver a como quedó en este cambio?"
                        okText="Volver"
                        cancelText="Cancelar"
                        onConfirm={() => restaurar(entrada)}
                    >
                        <Button size="small" shape="round" loading={restaurando === entrada.id}>
                            Volver a esta versión
                        </Button>
                    </Popconfirm>
                )}
            </Space>
        ),
    }));

    return (
        <Drawer open={Boolean(espacio)} onClose={onCerrar} width={420} title={espacio ? `Historial · ${espacio.nombre}` : ''}>
            {cargando ? <Spin /> : <Timeline items={items} />}
        </Drawer>
    );
};

export default HistorialEspacio;
