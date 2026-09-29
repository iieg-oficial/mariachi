import { Tooltip } from 'antd';

import { COLOR_REFERENCIA } from '@features/vine/constants/jornada';
import { detalle, estiloTramo } from '@features/vine/components/jornada/piezas';

const ColumnaReloj = ({ d, rango, alto, horaEntrada, ancho, radio = 2 }) => {
    const [ini, fin] = rango;
    const escala = alto / Math.max(1, fin - ini);
    const tramos = (d.tramos ?? []).filter(([, desde, hasta]) => hasta > ini && desde < fin);
    return (
        <Tooltip title={detalle(d, horaEntrada)}>
            <div style={{
                position: 'relative', height: alto, flex: ancho ? `0 0 ${ancho}px` : '1 1 0', minWidth: ancho ?? 8, cursor: 'default',
            }}
            >
                {d.estado === 'inhabil' && (
                    <div style={{
                        position: 'absolute', top: 0, bottom: 0, left: '50%', borderLeft: `1px dashed ${COLOR_REFERENCIA}`,
                    }}
                    />
                )}
                {tramos.map(([tipo, desde, hasta]) => (
                    <div
                        key={`${tipo}${desde}`}
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: (Math.max(desde, ini) - ini) * escala,
                            height: Math.max(1, (Math.min(hasta, fin) - Math.max(desde, ini)) * escala),
                            borderRadius: radio,
                            ...estiloTramo(tipo),
                        }}
                    />
                ))}
            </div>
        </Tooltip>
    );
};

export default ColumnaReloj;
