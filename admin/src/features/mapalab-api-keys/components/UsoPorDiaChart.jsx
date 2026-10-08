import { Card, Empty, Tooltip, Typography } from 'antd';
import { BRAND, SEMANTIC } from '@app/providers/brand';
import TituloConAyuda from '@shared/components/TituloConAyuda';

const { Text } = Typography;

const ALTO = 160;

const SERIES = [
    { campo: 'cargas', nombre: 'Cargas', color: BRAND.purple },
    { campo: 'erroresJs', nombre: 'Errores JS', color: SEMANTIC.danger },
    { campo: 'erroresWms', nombre: 'Errores de mapa (WMS)', color: BRAND.orange },
];

const Leyenda = () => (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
        {SERIES.map((s) => (
            <span key={s.campo} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, display: 'inline-block' }} />
                <Text style={{ fontSize: 12 }}>{s.nombre}</Text>
            </span>
        ))}
    </div>
);


export default function UsoPorDiaChart({ serie = [], loading }) {
    const titulo = (
        <TituloConAyuda
            titulo="Cargas y errores por día"
            ayuda="Cargas: veces que un sitio abrió el mapa con esta llave. Errores JS: fallos del visor dentro del sitio. Errores de mapa: imágenes WMS que respondieron con error."
        />
    );
    const hayDatos = serie.some((d) => d.cargas || d.erroresJs || d.erroresWms);

    if (!loading && !hayDatos) {
        return (
            <Card size="small" title={titulo}>
                <Empty description="Sin uso registrado en el periodo" />
            </Card>
        );
    }

    const maximo = Math.max(1, ...serie.flatMap((d) => SERIES.map((s) => d[s.campo])));
    const paso = Math.ceil(serie.length / 10);

    return (
        <Card size="small" title={titulo} loading={loading}>
            <Leyenda />
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: ALTO, overflowX: 'auto' }}>
                {serie.map((d, indice) => (
                    <Tooltip
                        key={d.dia}
                        title={`${d.dia} · ${d.cargas} cargas · ${d.erroresJs} errores JS · ${d.erroresWms} errores WMS`}
                    >
                        <div style={{ flex: '1 1 0', minWidth: 8, height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                                {SERIES.map((s) => (
                                    <div
                                        key={s.campo}
                                        style={{
                                            flex: 1,
                                            height: `${(d[s.campo] / maximo) * 100}%`,
                                            minHeight: d[s.campo] ? 2 : 0,
                                            background: s.color,
                                            borderRadius: '2px 2px 0 0',
                                        }}
                                    />
                                ))}
                            </div>
                            <div style={{ fontSize: 10, color: 'rgba(0, 0, 0, 0.45)', textAlign: 'center', paddingTop: 4, whiteSpace: 'nowrap' }}>
                                {indice % paso === 0 ? d.dia.slice(5) : ' '}
                            </div>
                        </div>
                    </Tooltip>
                ))}
            </div>
        </Card>
    );
}
