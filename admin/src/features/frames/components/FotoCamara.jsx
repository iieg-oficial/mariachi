import { useEffect, useRef, useState } from 'react';
import { Button } from 'antd';
import { ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { SEMANTIC } from '@app/providers/brand';

import { urlFoto } from '../api/framesService';
import Senal from './Senal';

const INTERVALO_MS = 2000;
const LENTO_MS = 30 * 60 * 1000;
const MAX_FALLOS = 3;

const FotoCamara = ({
    nombre,
    etiqueta,
    alto,
    version,
    enLinea,
    llenar = false,
    intervalo = INTERVALO_MS,
}) => {
    const [src, setSrc] = useState('');
    const [falla, setFalla] = useState(false);
    const [lento, setLento] = useState(false);
    const intentos = useRef(0);
    const temporizador = useRef(null);

    const umbral = enLinea === false ? 1 : MAX_FALLOS;

    useEffect(() => {
        intentos.current = 0;
        setLento(false);
        setFalla(false);
        setSrc(urlFoto(nombre, { alto, t: Date.now() }));
        return () => clearTimeout(temporizador.current);
    }, [nombre, alto, version]);

    const programar = (huboFalla) => {
        intentos.current = huboFalla ? intentos.current + 1 : 0;
        const enEspera = huboFalla && intentos.current >= umbral;
        setFalla(huboFalla);
        setLento(enEspera);
        clearTimeout(temporizador.current);
        temporizador.current = setTimeout(() => {
            setSrc(urlFoto(nombre, { alto, t: Date.now() }));
        }, enEspera ? LENTO_MS : intervalo);
    };

    const reintentarYa = () => {
        intentos.current = 0;
        setLento(false);
        setFalla(false);
        clearTimeout(temporizador.current);
        setSrc(urlFoto(nombre, { alto, t: Date.now() }));
    };

    return (
        <div style={{ position: 'relative', height: llenar ? '100%' : undefined }}>
            <img
                src={src || undefined}
                onLoad={() => programar(false)}
                onError={() => programar(true)}
                alt={`Vista de ${etiqueta}`}
                style={{
                    width: '100%',
                    height: llenar ? '100%' : undefined,
                    display: 'block',
                    background: '#000',
                    aspectRatio: llenar ? undefined : '16 / 9',
                    objectFit: 'contain',
                }}
            />
            {falla ? (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <Senal
                        icono={<ExclamationCircleOutlined />}
                        texto="sin imagen"
                        color={SEMANTIC.warningSoft}
                        ayuda={lento
                            ? 'No respondió tras varios intentos. Se reintenta solo cada media hora.'
                            : 'No llegó la imagen. Se reintenta solo en unos segundos.'}
                    />
                    {lento ? (
                        <Button
                            size="small"
                            type="text"
                            icon={<ReloadOutlined />}
                            onClick={reintentarYa}
                            style={{ color: '#fff' }}
                        >
                            Reintentar
                        </Button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
};

export default FotoCamara;
