import { Tooltip } from 'antd';

import { SEGMENTOS_JORNADA } from '@features/vine/constants/jornada';
import {
    ORDEN_REPARTO, TARDE, detalleReparto, fondo,
} from '@features/vine/components/jornada/piezas';


const BarraReparto = ({ reparto, escala, alto = 12, sufijo = '' }) => {
    if (!reparto) return null;
    const pct = (m) => `${(m / Math.max(1, escala)) * 100}%`;
    const segmentos = ORDEN_REPARTO
        .map((clave) => SEGMENTOS_JORNADA.find((s) => s.clave === clave))
        .filter((s) => reparto[s.clave] > 0);
    return (
        <Tooltip title={detalleReparto(reparto, sufijo)}>
            <div style={{ display: 'flex', alignItems: 'center', height: alto, width: '100%', cursor: 'default' }}>
                {reparto.tarde > 0 && (
                    <div style={{ width: pct(reparto.tarde), height: '100%', borderRadius: 2, marginRight: 3, ...TARDE }} />
                )}
                {segmentos.map((s, i) => (
                    <div
                        key={s.clave}
                        style={{
                            width: pct(reparto[s.clave]),
                            height: '100%',
                            borderRadius: `${i === 0 ? 2 : 0}px ${i === segmentos.length - 1 ? 2 : 0}px ${i === segmentos.length - 1 ? 2 : 0}px ${i === 0 ? 2 : 0}px`,
                            ...fondo(s),
                        }}
                    />
                ))}
            </div>
        </Tooltip>
    );
};

export default BarraReparto;
