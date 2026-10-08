import { Card, Empty, Tooltip, Typography } from 'antd';

import TituloConAyuda from '@shared/components/TituloConAyuda';
import { AYUDAS } from '@features/vine/constants/ayudas';
import {
    COLOR_ENTRADA,
    COLOR_SALIDA,
    COLOR_SIN_LECTOR,
    PUERTAS,
    PUERTA_ACCESIBLE,
    PUNTOS_RETIRADOS,
} from '@features/vine/constants';
import {
    ALTO,
    ANCHO,
    Y,
    anchoVano,
    centroMuro,
    miles,
    xMuro,
    xVano,
} from '@features/vine/components/planta/geometria';
import {
    Flecha,
    HojaAbatible,
    Hojas,
    Lector,
    Pilar,
    SimboloAccesible,
    Tubo,
} from '@features/vine/components/planta/piezas';

const EJE = 40;

const Puerta = ({ puerta, indice, lecturas }) => {
    const x = xVano(indice);
    const ancho = anchoVano(indice);
    const eje = (i) => (i === 0 ? x + EJE : x + ancho - EJE);
    const detalle = lecturas
        .map((l) => `${miles(l.valor)} ${l.sentido === 'entrada' ? 'entradas' : 'salidas'} por ${l.punto}`)
        .join(' y ');

    return (
        <Tooltip title={`${puerta.nombre}: ${detalle}`} styles={{ root: { maxWidth: 340 } }}>
            <g style={{ cursor: 'help' }}>
                <rect x={x} y={0} width={ancho} height={ALTO} fill="transparent" />
                {lecturas.map((l, i) => (
                    <Flecha
                        key={l.punto}
                        x={eje(i)}
                        valor={l.valor}
                        entrando={l.sentido === 'entrada'}
                    />
                ))}
                <Hojas x={x} ancho={ancho} color="#1F3A6E" />
                {lecturas.map((l, i) => {
                    const entrando = l.sentido === 'entrada';
                    return (
                        <g key={l.punto}>
                            <text
                                x={eje(i)} y={entrando ? Y.cifraEntrada : Y.cifraSalida}
                                textAnchor="middle" fontSize={12} fontWeight={600}
                                fill={entrando ? COLOR_ENTRADA : COLOR_SALIDA}
                            >
                                {miles(l.valor)}
                            </text>
                            <text
                                x={eje(i)} y={entrando ? Y.lectorEntrada : Y.lectorSalida}
                                textAnchor="middle" fontSize={9.5} fill="rgba(0,0,0,0.45)"
                            >
                                {l.punto}
                            </text>
                        </g>
                    );
                })}
                <text x={x + ancho / 2} y={Y.nombre} textAnchor="middle" fontSize={12} fontWeight={600} fill="#262626">
                    {puerta.nombre}
                </text>
            </g>
        </Tooltip>
    );
};

const Accesible = ({ indice }) => {
    const x = xVano(indice);
    const ancho = anchoVano(indice);
    const xBisagra = centroMuro(indice);
    const riel = xMuro(indice + 1) - xBisagra;

    return (
        <Tooltip title={PUERTA_ACCESIBLE.nota} styles={{ root: { maxWidth: 340 } }}>
            <g style={{ cursor: 'help' }}>
                <rect x={x} y={0} width={ancho} height={ALTO} fill="transparent" />
                <SimboloAccesible x={xBisagra + riel / 2} y={228} color={COLOR_SIN_LECTOR} />
                <HojaAbatible xBisagra={xBisagra} largo={riel} color={COLOR_SIN_LECTOR} />
                <text x={xBisagra + riel / 2} y={Y.cifraEntrada} textAnchor="middle" fontSize={11.5} fontWeight={600} fill={COLOR_SIN_LECTOR}>
                    sin registro
                </text>
                <text x={xBisagra + riel / 2} y={Y.lectorEntrada} textAnchor="middle" fontSize={9.5} fill="rgba(0,0,0,0.45)">
                    acercamiento o clave
                </text>
                <text x={xBisagra + riel / 2} y={Y.nombre} textAnchor="middle" fontSize={12} fontWeight={600} fill="#595959">
                    {PUERTA_ACCESIBLE.nombre}
                </text>
            </g>
        </Tooltip>
    );
};

const PlantaAccesos = ({ puntos = [], loading }) => {
    const dato = (nombre, campo) => puntos.find((p) => p.punto === nombre)?.[campo] ?? 0;

    const puertas = PUERTAS.map((p) => ({
        puerta: p,
        lecturas: p.lectores.map((l) => ({
            punto: l.punto,
            sentido: l.sentido,
            valor: dato(l.punto, l.sentido === 'entrada' ? 'entradas' : 'salidas'),
        })),
    }));

    const retirados = puntos
        .filter((p) => PUNTOS_RETIRADOS.includes(p.punto))
        .reduce((suma, p) => suma + (p.total ?? 0), 0);

    if (!loading && !puertas.some((p) => p.lecturas.some((l) => l.valor))) {
        return (
            <Card title="Cómo se usa cada puerta" size="small">
                <Empty description="Sin registros en el periodo" />
            </Card>
        );
    }

    return (
        <Card
            size="small"
            loading={loading}
            title={<TituloConAyuda titulo="Cómo se usa cada puerta" ayuda={AYUDAS.accesos} ancho={420} />}
        >
            <div style={{ overflowX: 'auto' }}>
                <svg
                    viewBox={`0 0 ${ANCHO} ${ALTO}`}
                    style={{ width: '100%', minWidth: 620, height: 'auto', display: 'block' }}
                    role="img"
                    aria-label="Planta de los accesos: una puerta de salida, una de entrada y una puerta accesible sin registro, con el volumen de cada lector"
                >
                    <defs>
                        <linearGradient id="vidrio" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#C6D8EC" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#93B2D6" stopOpacity={0.65} />
                        </linearGradient>
                        <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#F0F0F0" />
                            <stop offset="55%" stopColor="#C9C9C9" />
                            <stop offset="100%" stopColor="#9E9E9E" />
                        </linearGradient>
                    </defs>

                    <text x={14} y={110} fontSize={11} fill="rgba(0,0,0,0.45)">Afuera</text>
                    <text x={14} y={218} fontSize={11} fill="rgba(0,0,0,0.45)">Adentro</text>

                    <Tubo x={centroMuro(0)} />
                    {[1, 2, 3].map((i) => <Pilar key={i} x={xMuro(i)} />)}

                    <Accesible indice={0} />
                    {puertas.map((p, i) => (
                        <Puerta
                            key={p.puerta.id}
                            puerta={p.puerta}
                            indice={i + 1}
                            lecturas={p.lecturas}
                        />
                    ))}

                    <Lector xPilar={xMuro(1)} lado="izquierdo" entrando apagado />
                    {puertas.map((p, i) => (
                        <g key={p.puerta.id}>
                            <Lector xPilar={xMuro(i + 1)} lado="derecho" entrando={false} />
                            <Lector xPilar={xMuro(i + 2)} lado="izquierdo" entrando />
                        </g>
                    ))}
                </svg>
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
                {[['Entradas', COLOR_ENTRADA], ['Salidas', COLOR_SALIDA], ['Sin registro', COLOR_SIN_LECTOR]].map(([nombre, color]) => (
                    <span key={nombre} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
                        <Typography.Text style={{ fontSize: 12 }}>{nombre}</Typography.Text>
                    </span>
                ))}
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Los rectángulos en los pilares son los lectores; aceptan huella o tarjeta.
                </Typography.Text>
            </div>

            {retirados > 0 && (
                <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                    {`${miles(retirados)} registros más quedaron en lectores retirados en septiembre de 2023, cuando cada lector pasó a tener un solo sentido.`}
                </Typography.Text>
            )}
        </Card>
    );
};

export default PlantaAccesos;
