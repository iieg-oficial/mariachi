import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Empty, Segmented, Space, Tag, Tooltip } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

import { useFullscreenHeader } from '@app/fullscreenHeader';
import useIsMobile from '@shared/hooks/useIsMobile';
import FotoCamara from '../components/FotoCamara';
import useCamarasEnVivo from '../hooks/useCamarasEnVivo';
import { CALIDADES } from '../constants/calidades';

const VIVO_PATH = '/frames/vivo';
const ALTA = CALIDADES[CALIDADES.length - 1].value;

const rutaDe = (nombre) => `/frames/vivo/pantalla/${encodeURIComponent(nombre)}`;

const CamaraPantallaPage = () => {
    const { nombre } = useParams();
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const [alto, setAlto] = useState(ALTA);
    const { camaras, estados, cargando } = useCamarasEnVivo();

    const indice = camaras.findIndex((c) => c.nombre === nombre);
    const camara = indice >= 0 ? camaras[indice] : null;
    const estado = camara ? estados[camara.nombre] : null;

    const ir = useCallback((paso) => {
        if (camaras.length < 2 || indice < 0) return;
        const siguiente = camaras[(indice + paso + camaras.length) % camaras.length];
        navigate(rutaDe(siguiente.nombre), { replace: true });
    }, [camaras, indice, navigate]);

    useEffect(() => {
        const alTeclear = (evento) => {
            if (evento.key === 'ArrowLeft') ir(-1);
            if (evento.key === 'ArrowRight') ir(1);
        };
        window.addEventListener('keydown', alTeclear);
        return () => window.removeEventListener('keydown', alTeclear);
    }, [ir]);

    const extra = useMemo(() => (
        <Space wrap>
            {estado ? (
                estado.en_linea
                    ? <Tag color="green">{estado.camera_fps} fps</Tag>
                    : <Tag color="red">sin señal</Tag>
            ) : null}
            <Segmented options={CALIDADES} value={alto} onChange={setAlto} size="small" />
            {camaras.length > 1 ? (
                <>
                    <Tooltip title="Anterior (←)">
                        <Button
                            size="small"
                            icon={<LeftOutlined />}
                            aria-label="Cámara anterior"
                            onClick={() => ir(-1)}
                        />
                    </Tooltip>
                    <Tooltip title="Siguiente (→)">
                        <Button
                            size="small"
                            icon={<RightOutlined />}
                            aria-label="Cámara siguiente"
                            onClick={() => ir(1)}
                        />
                    </Tooltip>
                </>
            ) : null}
        </Space>
    ), [estado, alto, camaras.length, ir]);

    const posicion = indice >= 0 ? ` · ${indice + 1} de ${camaras.length}` : '';
    useFullscreenHeader({
        title: camara ? `${camara.etiqueta}${isMobile ? '' : posicion}` : 'Cámara',
        backTo: VIVO_PATH,
        extra,
    });

    return (
        <div style={{ height: '100%', background: '#000', padding: 12 }}>
            {camara ? (
                <FotoCamara nombre={camara.nombre} etiqueta={camara.etiqueta} alto={alto} llenar />
            ) : (
                !cargando && (
                    <Empty
                        description="Esa cámara no existe o está apagada"
                        style={{ color: '#fff', paddingTop: 64 }}
                    />
                )
            )}
        </div>
    );
};

export default CamaraPantallaPage;
