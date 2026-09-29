import { useEffect, useRef, useState } from 'react';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { SEMANTIC } from '@app/providers/brand';

import { urlFoto } from '../api/framesService';
import Senal from './Senal';

const INTERVALO_MS = 2000;

const FotoCamara = ({ nombre, etiqueta, alto, version, llenar = false }) => {
    const [src, setSrc] = useState('');
    const [falla, setFalla] = useState(false);
    const temporizador = useRef(null);

    useEffect(() => {
        const actual = temporizador;
        setFalla(false);
        setSrc(urlFoto(nombre, { alto, t: Date.now() }));
        return () => clearTimeout(actual.current);
    }, [nombre, alto, version]);

    const programar = (huboFalla) => {
        setFalla(huboFalla);
        clearTimeout(temporizador.current);
        temporizador.current = setTimeout(() => {
            setSrc(urlFoto(nombre, { alto, t: Date.now() }));
        }, INTERVALO_MS);
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
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <Senal
                        icono={<ExclamationCircleOutlined />}
                        texto="sin imagen"
                        color={SEMANTIC.warningSoft}
                        ayuda="No llegó la imagen. Se reintenta solo cada pocos segundos."
                    />
                </div>
            ) : null}
        </div>
    );
};

export default FotoCamara;
