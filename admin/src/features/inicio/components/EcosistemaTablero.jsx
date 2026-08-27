import { useMemo } from 'react';
import { Link } from 'react-router';
import { Card, Empty, Grid, Space, Spin, Typography } from 'antd';
import { ClusterOutlined } from '@ant-design/icons';
import { SEMANTIC } from '@app/providers/brand';
import SectionHeader from '@shared/components/SectionHeader';
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

export default function EcosistemaTablero({
    plataformas,
    loading,
    onReportar,
    contador,
    sinEncabezado = false,
}) {
    const pantalla = useBreakpoint();
    const compacta = !pantalla.md;

    const { operativas, eje, primeraCapa } = useMemo(() => ({
        operativas: plataformas.filter((p) => p.status === 'ok').length,
        eje: etiquetasEje(plataformas.find((p) => p.tramos)?.tramos),
        primeraCapa: CAPAS.find((capa) => plataformas.some((p) => p.capa === capa.key))?.key,
    }), [plataformas]);

    const todas = operativas === plataformas.length;

    const insignia = contador ?? (plataformas.length > 0 && (
        <Text
            style={{
                fontSize: 13,
                padding: '0 8px',
                borderRadius: 10,
                color: todas ? SEMANTIC.success : SEMANTIC.danger,
                background: todas ? SEMANTIC.successSoft : SEMANTIC.dangerSoft,
            }}
        >
            {`${operativas} / ${plataformas.length}`}
        </Text>
    ));

    const encabezado = sinEncabezado ? null : (
        <SectionHeader
            icon={<ClusterOutlined />}
            title="Huachicol"
            subtitle="Estatus de ecosistema"
            badge={insignia}
            to="/huachicol/observabilidad"
            actionLabel="Ver observabilidad"
        />
    );

    if (loading) {
        return (
            <div>
                {encabezado}
                <Card size="small"><div style={{ textAlign: 'center', padding: 24 }}><Spin /></div></Card>
            </div>
        );
    }

    if (!plataformas.length) {
        return (
            <div>
                {encabezado}
                <Card size="small">
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="El monitor no reportó servicios" />
                </Card>
            </div>
        );
    }

    return (
        <div>
            {encabezado}
            <Card size="small" styles={{ body: { padding: '8px 16px 16px' } }}>
                {!compacta && (
                    <div style={{ display: 'grid', gridTemplateColumns: COLUMNAS, gap: 8, paddingTop: 12 }}>
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
                    const primera = capa.key === primeraCapa;
                    return (
                        <div key={capa.key}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, paddingTop: primera ? 2 : 14 }}>
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
                    {sinEncabezado && insignia && (
                        <span style={{ marginLeft: 'auto' }}>{insignia}</span>
                    )}
                </Space>
            </Card>
        </div>
    );
}
