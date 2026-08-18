import { Card, Collapse, Empty, Table, Tooltip, Typography } from 'antd';
import { useMemo } from 'react';

import TituloConAyuda from '@shared/components/TituloConAyuda';
import { EJE_TEXTO } from '@features/vine/constants';

const { Text } = Typography;

const ALTO = 170;

const Leyenda = ({ series }) => (
    <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        {series.map((s) => (
            <span key={s.nombre} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                    width: 10, height: 10, borderRadius: 2, background: s.color, display: 'inline-block',
                }}
                />
                <Text style={{ fontSize: 12 }}>{s.nombre}</Text>
            </span>
        ))}
    </div>
);

const TablaDatos = ({ datos, series }) => {
    const columnas = [
        { title: 'Categoría', dataIndex: 'etiqueta', key: 'etiqueta' },
        ...series.map((s, i) => ({
            title: s.nombre,
            key: s.nombre,
            align: 'right',
            render: (_, fila) => (fila.valores[i] ?? 0).toLocaleString('es-MX'),
        })),
    ];
    return (
        <Table
            size="small"
            pagination={false}
            rowKey="etiqueta"
            columns={columnas}
            dataSource={datos}
            scroll={{ y: 240 }}
        />
    );
};

const ChartBarras = ({ title, ayuda, extra, datos = [], series = [], loading, sufijo = '', tabla = false }) => {
    const maximo = useMemo(
        () => Math.max(1, ...datos.flatMap((d) => d.valores.map((v) => v ?? 0))),
        [datos],
    );

    const titulo = <TituloConAyuda titulo={title} ayuda={ayuda} />;

    if (!loading && datos.length === 0) {
        return (
            <Card title={titulo} extra={extra} size="small">
                <Empty description="Sin datos en el periodo" />
            </Card>
        );
    }

    const mostrarValores = datos.length <= 8 && series.length === 1;
    const pasoEtiqueta = Math.ceil(datos.length / 12);

    return (
        <Card title={titulo} extra={extra} size="small" loading={loading}>
            {series.length > 1 && <Leyenda series={series} />}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: ALTO, overflowX: 'auto' }}>
                {datos.map((d, indice) => (
                    <div
                        key={d.etiqueta}
                        style={{ flex: '1 1 0', minWidth: 18, display: 'flex', flexDirection: 'column', height: '100%' }}
                    >
                        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                            {d.valores.map((valor, i) => (
                                <Tooltip
                                    key={series[i]?.nombre ?? i}
                                    title={`${d.etiqueta} · ${series[i]?.nombre ?? ''} ${(valor ?? 0).toLocaleString('es-MX')}${sufijo}`}
                                >
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                                        {mostrarValores && (
                                            <Text style={{ fontSize: 11, textAlign: 'center' }}>
                                                {(valor ?? 0).toLocaleString('es-MX')}
                                            </Text>
                                        )}
                                        <div style={{
                                            height: `${((valor ?? 0) / maximo) * 100}%`,
                                            background: series[i]?.color,
                                            borderRadius: '4px 4px 0 0',
                                            minHeight: valor ? 2 : 0,
                                        }}
                                        />
                                    </div>
                                </Tooltip>
                            ))}
                        </div>
                        <div style={{ ...EJE_TEXTO, textAlign: 'center', paddingTop: 6, whiteSpace: 'nowrap' }}>
                            {indice % pasoEtiqueta === 0 ? d.etiqueta : '\u00A0'}
                        </div>
                    </div>
                ))}
            </div>
            {tabla && (
                <Collapse
                    ghost
                    size="small"
                    style={{ marginTop: 8 }}
                    items={[{
                        key: 'tabla',
                        label: <Text style={{ fontSize: 12 }}>Ver los datos en tabla</Text>,
                        children: <TablaDatos datos={datos} series={series} />,
                    }]}
                />
            )}
        </Card>
    );
};

export default ChartBarras;
