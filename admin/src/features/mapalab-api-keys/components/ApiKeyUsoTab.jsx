import { useMemo, useState } from 'react';
import { Button, Card, Col, Row, Segmented, Space, Statistic, Table, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import TituloConAyuda from '@shared/components/TituloConAyuda';
import { useApiKeyUso } from '@features/mapalab-api-keys/hooks/useApiKeyUso';
import { formatoBytes, porcentaje } from '@features/mapalab-api-keys/hooks/usoHelpers';
import BarraCalidad from '@features/mapalab-api-keys/components/BarraCalidad';
import UsoPorDiaChart from '@features/mapalab-api-keys/components/UsoPorDiaChart';

const { Text } = Typography;

const PERIODOS = [
    { value: 7, label: '7 días' },
    { value: 30, label: '30 días' },
    { value: 90, label: '90 días' },
];

const UMBRALES = {
    LCP: 'Buena ≤ 2.5 s · regular ≤ 4 s · mala > 4 s',
    INP: 'Buena ≤ 200 ms · regular ≤ 500 ms · mala > 500 ms',
};

const numero = (valor) => (valor ?? 0).toLocaleString('es-MX');

const titulo = (texto, ayuda) => <TituloConAyuda titulo={texto} ayuda={ayuda} />;

const CIFRAS = [
    {
        clave: 'cargas',
        titulo: 'Cargas',
        ayuda: 'Veces que un sitio abrió el mapa con esta llave y fue permitido.',
        valor: (t) => numero(t.cargas),
    },
    {
        clave: 'pctListo',
        titulo: 'Llegó a listo',
        ayuda: 'Porcentaje de cargas en que el mapa terminó de mostrarse. Lo que falta son mapas que nunca terminaron de cargar.',
        valor: (t) => (t.pctListo === null ? '—' : `${t.pctListo}%`),
    },
    {
        clave: 'erroresJs',
        titulo: 'Errores JS',
        ayuda: 'Fallos del visor reportados desde el mapa incrustado o, si el mapa no abrió, desde el sitio anfitrión.',
        valor: (t) => numero(t.erroresJs),
    },
    {
        clave: 'timeouts',
        titulo: 'Sin respuesta',
        ayuda: 'Veces que el sitio anfitrión se cansó de esperar a que el mapa cargara.',
        valor: (t) => numero(t.timeouts),
    },
    {
        clave: 'bytes',
        titulo: 'Datos servidos',
        ayuda: 'Volumen de imágenes de mapa (WMS) entregadas con esta llave.',
        valor: (t) => formatoBytes(t.bytes),
    },
];


export default function ApiKeyUsoTab({ apiKey }) {
    const [dias, setDias] = useState(30);
    const { totales, porSitio, porDia, loading, error, recargar } = useApiKeyUso(apiKey?.id, dias);

    const columnas = useMemo(() => [
        {
            title: 'Sitio',
            dataIndex: 'origen',
            ellipsis: true,
            render: (o) => <Text style={{ fontSize: 11 }} code>{o}</Text>,
        },
        {
            title: 'Cargas',
            dataIndex: 'cargas',
            width: 80,
            align: 'right',
            render: numero,
        },
        {
            title: titulo('% listo', 'Cargas que terminaron de mostrar el mapa.'),
            key: 'pctListo',
            width: 90,
            align: 'right',
            render: (_, s) => {
                const pct = porcentaje(s.listos, s.cargas);
                return pct === null ? <Text type="secondary">—</Text> : `${pct}%`;
            },
        },
        {
            title: titulo('LCP', 'Tiempo hasta que se pinta lo principal del mapa. La barra reparte las visitas en buena, regular y mala experiencia.'),
            key: 'lcp',
            width: 150,
            render: (_, s) => <BarraCalidad metrica="LCP" vital={s.vitals.LCP} umbral={UMBRALES.LCP} />,
        },
        {
            title: titulo('INP', 'Qué tan rápido responde el mapa a clics y toques. La barra reparte las visitas en buena, regular y mala experiencia.'),
            key: 'inp',
            width: 150,
            render: (_, s) => <BarraCalidad metrica="INP" vital={s.vitals.INP} umbral={UMBRALES.INP} />,
        },
        {
            title: 'Errores JS',
            dataIndex: 'erroresJs',
            width: 90,
            align: 'right',
            render: numero,
        },
        {
            title: titulo('Sin respuesta', 'Avisos de tiempo agotado enviados por el sitio anfitrión.'),
            dataIndex: 'timeouts',
            width: 120,
            align: 'right',
            render: numero,
        },
        {
            title: titulo('Bloqueados', 'Peticiones rechazadas para este sitio (origen no autorizado, capa no permitida, llave suspendida).'),
            dataIndex: 'denegados',
            width: 110,
            align: 'right',
            render: numero,
        },
    ], []);

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text strong>
                    {titulo('Uso del mapa incrustado', 'Cifras diarias que manda mapalab por cada sitio que usa esta llave. Se conservan un año.')}
                </Text>
                <Space wrap>
                    <Segmented options={PERIODOS} value={dias} onChange={setDias} />
                    <Button icon={<ReloadOutlined />} onClick={recargar} loading={loading}>Actualizar</Button>
                </Space>
            </div>

            {error && <Text type="danger">{error}</Text>}

            <Row gutter={[16, 16]}>
                {CIFRAS.map((c) => (
                    <Col key={c.clave} flex="1 1 160px">
                        <Card size="small" loading={loading}>
                            <Statistic title={titulo(c.titulo, c.ayuda)} value={c.valor(totales)} />
                        </Card>
                    </Col>
                ))}
            </Row>

            <Card size="small" title="Por sitio">
                <Table
                    rowKey="origen"
                    columns={columnas}
                    dataSource={porSitio}
                    pagination={porSitio.length > 10 ? { pageSize: 10, size: 'small' } : false}
                    size="small"
                    loading={loading}
                    tableLayout="fixed"
                    scroll={{ x: 900 }}
                    locale={{ emptyText: 'Ningún sitio usó esta llave en el periodo' }}
                />
            </Card>

            <UsoPorDiaChart serie={porDia} loading={loading} />
        </Space>
    );
}
