import { Typography } from 'antd';

import { SEGMENTOS_JORNADA } from '@features/vine/constants/jornada';
import {
    MINIMO, TARDE, VISITA, fondo,
} from '@features/vine/components/jornada/piezas';

const { Text } = Typography;

const Leyenda = ({ compacta = false }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginBottom: 12 }}>
        {SEGMENTOS_JORNADA.map((s) => (
            <span key={s.clave} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, display: 'inline-block', ...fondo(s) }} />
                <Text style={{ fontSize: 12 }}>{s.nombre}</Text>
            </span>
        ))}
        {!compacta && (
            <>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, display: 'inline-block', ...MINIMO }} />
                    <Text style={{ fontSize: 12 }}>Al menos (no cerró)</Text>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, display: 'inline-block', ...VISITA }} />
                    <Text style={{ fontSize: 12 }}>Visita corta</Text>
                </span>
            </>
        )}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, display: 'inline-block', ...TARDE }} />
            <Text style={{ fontSize: 12 }}>No llegó a su hora</Text>
        </span>
        {!compacta && (
            <>
                <Text style={{ fontSize: 12 }}>● retardo</Text>
                <Text style={{ fontSize: 12 }}>○ no cerró</Text>
                <Text style={{ fontSize: 12 }}>◆ incidencia</Text>
                <Text style={{ fontSize: 12 }}>✕ inhábil</Text>
            </>
        )}
    </div>
);

export default Leyenda;
