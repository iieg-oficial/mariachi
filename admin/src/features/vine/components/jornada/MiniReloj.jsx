import ColumnaReloj from '@features/vine/components/jornada/ColumnaReloj';
import { COLOR_REFERENCIA } from '@features/vine/constants/jornada';

const RANGO = [420, 1140];
const ALTO = 34;
const ANCHO = 7;

const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

const MiniReloj = ({
    dias = [], oficial = [], alto = ALTO, ancho = ANCHO, gap = 2, onElegir,
}) => {
    if (!dias.length) return null;
    const escala = alto / (RANGO[1] - RANGO[0]);
    return (
        <div style={{ position: 'relative', display: 'inline-flex', gap, height: alto }}>
            {oficial.filter((m) => m != null).map((m) => (
                <div
                    key={m}
                    style={{
                        position: 'absolute', left: -2, right: -2, top: (m - RANGO[0]) * escala, borderTop: `1px dashed ${COLOR_REFERENCIA}`, pointerEvents: 'none',
                    }}
                />
            ))}
            {dias.map((d) => (
                <ColumnaReloj
                    key={d.dia}
                    d={d}
                    rango={RANGO}
                    alto={alto}
                    ancho={ancho}
                    radio={1}
                    horaEntrada={oficial[0] != null ? hhmm(oficial[0]) : null}
                    onElegir={onElegir}
                />
            ))}
        </div>
    );
};

export default MiniReloj;
