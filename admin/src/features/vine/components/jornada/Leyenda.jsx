import { Tooltip, Typography } from 'antd';

import { SEGMENTOS_JORNADA } from '@features/vine/constants/jornada';
import {
    MINIMO, TARDE, VISITA, fondo,
} from '@features/vine/components/jornada/piezas';

const { Text } = Typography;

const POR_QUE = {
    dentro: 'Estuvo adentro entre su hora de entrada y su hora de salida.',
    antes: 'Estuvo adentro antes de su hora de entrada. Suele ser llegar temprano o adelantar pendientes.',
    despues: 'Siguió adentro después de su hora de salida. Suele ser tiempo extra, cerrar pendientes o esperar transporte.',
    afuera: 'Marcó salida y luego entrada: comida, trámites, una comisión corta o salir un momento.',
    sin_marca: 'Hay dos entradas o dos salidas seguidas: falta una marca en medio. Casi siempre es que alguien le abrió, '
        + 'pasó detrás de otra persona, usó la puerta accesible —que no tiene lector conectado— o la tarjeta no leyó.',
    minimo: 'No hay salida después de su última entrada, así que solo se dibuja lo que consta. Pasa al salir detrás de '
        + 'alguien, por la puerta accesible o cuando la tarjeta no lee. La huella casi nunca lo deja pasar.',
    visita: 'Menos de una hora en el edificio: pasó por algo, a firmar o a una reunión breve. No cuenta como jornada.',
    tarde: 'Tiempo entre su hora de entrada y su primera marca. Casi siempre es llegar tarde; a veces entró sin marcar '
        + 'porque alguien le abrió y su primera marca es de más tarde.',
    retardo: 'Llegó más de 15 minutos después de su hora de entrada.',
    no_cerro: 'Falta la salida de ese día; ver «Al menos».',
    incidencia: 'Tiene capturadas vacaciones, un permiso u otra incidencia ese día.',
    inhabil: 'Festivo o inhábil del instituto: no se esperaba que viniera y, si vino, no cuenta retardo.',
};

const Muestra = ({ estilo }) => (
    <span style={{
        width: 10, height: 10, borderRadius: 2, display: 'inline-block', ...estilo,
    }}
    />
);

const Elemento = ({ clave, children }) => (
    <Tooltip title={POR_QUE[clave]}>
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'help',
        }}
        >
            {children}
        </span>
    </Tooltip>
);

const Leyenda = ({ compacta = false }) => (
    <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginBottom: 12,
    }}
    >
        {SEGMENTOS_JORNADA.map((s) => (
            <Elemento key={s.clave} clave={s.clave}>
                <Muestra estilo={fondo(s)} />
                <Text style={{ fontSize: 12 }}>{s.nombre}</Text>
            </Elemento>
        ))}
        {!compacta && (
            <>
                <Elemento clave="minimo">
                    <Muestra estilo={MINIMO} />
                    <Text style={{ fontSize: 12 }}>Al menos (no cerró)</Text>
                </Elemento>
                <Elemento clave="visita">
                    <Muestra estilo={VISITA} />
                    <Text style={{ fontSize: 12 }}>Visita corta</Text>
                </Elemento>
            </>
        )}
        <Elemento clave="tarde">
            <Muestra estilo={TARDE} />
            <Text style={{ fontSize: 12 }}>No llegó a su hora</Text>
        </Elemento>
        {!compacta && (
            <>
                <Elemento clave="retardo"><Text style={{ fontSize: 12 }}>● retardo</Text></Elemento>
                <Elemento clave="no_cerro"><Text style={{ fontSize: 12 }}>○ no cerró</Text></Elemento>
                <Elemento clave="incidencia"><Text style={{ fontSize: 12 }}>◆ incidencia</Text></Elemento>
                <Elemento clave="inhabil"><Text style={{ fontSize: 12 }}>✕ inhábil</Text></Elemento>
            </>
        )}
    </div>
);

export default Leyenda;
