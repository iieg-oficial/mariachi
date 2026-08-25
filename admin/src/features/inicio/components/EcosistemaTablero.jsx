import { useMemo } from 'react';
import { Link } from 'react-router';
import { Card, Empty, Grid, Space, Spin, Typography } from 'antd';
import { ClusterOutlined } from '@ant-design/icons';
import { SEMANTIC } from '@app/providers/brand';
import { CAPAS } from '@features/inicio/api/inicioService';
import FilaServicio, { ANCHO_ENLACES } from '@features/inicio/components/FilaServicio';

const { Text } = Typography;
const { useBreakpoint } = Grid;

const COLUMNAS = `212px 1fr 50px ${ANCHO_ENLACES}px`;
const PADDING_CARD = 16;
const HORAS_EJE = 4;

const LEYENDA = [
    { texto: 'Operativo', fondo: SEMANTIC.successSoft, trama: null },
    {
        texto: 'Degradado',
        fondo: SEMANTIC.warningSoft,
        trama: `repeating-linear-gradient(45deg, ${SEMANTIC.warning} 0 2px, transparent 2px 6px)`,
    },
    {
        texto: 'Caído',
        fondo: SEMANTIC.dangerSoft,
        trama: `repeating-linear-gradient(45deg, ${SEMANTIC.danger} 0 2px, transparent 2px 5px)`,
    },
    {
        texto: 'Sin datos',
        fondo: SEMANTIC.neutralSoft,
        trama: `repeating-linear-gradient(90deg, ${SEMANTIC.neutral} 0 1px, transparent 1px 6px)`,
    },
];

const etiquetasEje = (tramos) => {
    if (!tramos?.desde) return [];
    const inicio = new Date(tramos.desde).getTime();
    const fin = new Date(tramos.hasta).getTime();
    const salto = (fin - inicio) / HORAS_EJE;
    return Array.from({ length: HORAS_EJE + 1 }, (_, i) => new Date(inicio + salto * i)
        .toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }));
};

export default function EcosistemaTablero({ plataformas, loading, onReportar }) {
    const pantalla = useBreakpoint();
    const compacta = !pantalla.md;

    const { operativas, eje } = useMemo(() => ({
        operativas: plataformas.filter((p) => p.status === 'ok').length,
        eje: etiquetasEje(plataformas.find((p) => p.tramos)?.tramos),
    }), [plataformas]);

    const encabezado = (
        <Space size={8} wrap style={{ width: '100%' }}>
            <ClusterOutlined style={{ color: SEMANTIC.info }} />
            <Text strong>Estatus de ecosistema</Text>
            <Text
                style={{
                    fontSize: 12,
                    padding: '0 8px',
                    borderRadius: 10,
                    color: operativas === plataformas.length ? SEMANTIC.success : SEMANTIC.danger,
                    background: operativas === plataformas.length ? SEMANTIC.successSoft : SEMANTIC.dangerSoft,
                }}
            >
                {`${operativas} / ${plataformas.length}`}
            </Text>
            {!compacta && <Link to="/huachicol/observabilidad">Ver observabilidad</Link>}
        </Space>
    );

    if (loading) {
        return <Card size="small" title={encabezado}><div style={{ textAlign: 'center', padding: 24 }}><Spin /></div></Card>;
    }

    if (!plataformas.length) {
        return (
            <Card size="small" title={encabezado}>
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="El monitor no reportó servicios" />
            </Card>
        );
    }

    return (
        <Card size="small" title={encabezado} styles={{ body: { padding: '8px 16px 16px' } }}>
            {!compacta && (
                <div style={{ display: 'grid', gridTemplateColumns: COLUMNAS, gap: 8, paddingBottom: 8 }}>
                    <span />
                    <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                        {eje.map((etiqueta, indice) => (
                            <Text key={indice} type="secondary" style={{ fontSize: 10 }}>{etiqueta}</Text>
                        ))}
                    </span>
                </div>
            )}

            {CAPAS.map((capa) => {
                const servicios = plataformas.filter((p) => p.capa === capa.key);
                if (!servicios.length) return null;
                const arriba = servicios.filter((p) => p.status === 'ok').length;
                return (
                    <div key={capa.key}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingTop: 16 }}>
                            <Text type="secondary" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                {capa.nombre}
                            </Text>
                            {!compacta && <Text type="secondary" style={{ fontSize: 11 }}>{capa.nota}</Text>}
                            <Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto' }}>
                                {`${arriba}/${servicios.length}`}
                            </Text>
                        </div>
                        {servicios.map((plataforma) => (
                            <FilaServicio
                                key={plataforma.slug}
                                plataforma={plataforma}
                                columnas={COLUMNAS}
                                onReportar={onReportar ? () => onReportar(plataforma) : null}
                            />
                        ))}
                    </div>
                );
            })}

            <Space
                size={16}
                wrap
                style={{
                    display: 'flex',
                    marginTop: 16,
                    marginInline: -PADDING_CARD,
                    marginBottom: -PADDING_CARD,
                    paddingInline: PADDING_CARD,
                    paddingBlock: 12,
                    borderTop: '1px solid #f0f0f0',
                    width: `calc(100% + ${PADDING_CARD * 2}px)`,
                }}
            >
                {LEYENDA.map((item) => (
                    <Space key={item.texto} size={6}>
                        <span style={{
                            width: 16,
                            height: 9,
                            borderRadius: 2,
                            display: 'block',
                            backgroundColor: item.fondo,
                            backgroundImage: item.trama || 'none',
                        }} />
                        <Text type="secondary" style={{ fontSize: 11 }}>{item.texto}</Text>
                    </Space>
                ))}
            </Space>
        </Card>
    );
}
