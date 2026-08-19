import { FilterOutlined } from '@ant-design/icons';
import { Badge, Button, Card, Col, Row, Select, Space, Switch, Typography } from 'antd';
import { useMemo } from 'react';

import useCatalogo from '@features/vine/hooks/useCatalogo';
import {
    contarActivos,
    DIMENSIONES,
    etiquetaValor,
    SIN_FILTROS,
} from '@features/vine/constants/filtros';

const { Text } = Typography;

export const BotonFiltros = ({ abierto, onAbrir, valores }) => {
    const activos = contarActivos(valores);
    return (
        <Badge count={activos} size="small" offset={[-4, 2]}>
            <Button
                icon={<FilterOutlined />}
                type={abierto ? 'primary' : 'default'}
                onClick={() => onAbrir(!abierto)}
            >
                Filtros
            </Button>
        </Badge>
    );
};

const FiltrosPersonal = ({ filas = [], valores, onCambio }) => {
    const { items } = useCatalogo('vinculo');

    const opciones = useMemo(() => {
        const orden = items.map((i) => i.nombre);
        const vivas = filas.filter((f) => valores.bajas || !f.baja);

        return Object.fromEntries(DIMENSIONES.map(({ campo }) => {
            const conteo = vivas.reduce((acc, f) => {
                const v = f[campo] ?? '';
                acc[v] = (acc[v] ?? 0) + 1;
                return acc;
            }, {});

            // El catalogo manda el orden del vinculo; lo demas va alfabetico. Lo
            // que aparece en los datos sin estar en el catalogo se agrega al final
            // para que nadie quede sin forma de filtrarse.
            const claves = Object.keys(conteo);
            const ordenadas = campo === 'vinculo'
                ? [
                    ...orden.filter((n) => conteo[n]),
                    ...claves.filter((n) => !orden.includes(n)).sort(),
                ]
                : claves.sort();

            return [campo, ordenadas.map((v) => ({
                value: v,
                label: `${etiquetaValor(campo, v)} · ${conteo[v]}`,
            }))];
        }));
    }, [items, filas, valores.bajas]);

    const bajas = filas.filter((f) => f.baja).length;

    return (
        <Card size="small" style={{ marginBottom: 16 }}>
            <Row gutter={[12, 12]} align="bottom">
                {DIMENSIONES.map(({ campo, etiqueta }) => (
                    <Col xs={24} sm={12} lg={6} key={campo}>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                            {etiqueta}
                        </Text>
                        <Select
                            mode="multiple"
                            allowClear
                            maxTagCount="responsive"
                            placeholder={`Todos · ${opciones[campo]?.length ?? 0}`}
                            style={{ width: '100%' }}
                            value={valores[campo]}
                            options={opciones[campo]}
                            onChange={(v) => onCambio({ ...valores, [campo]: v })}
                        />
                    </Col>
                ))}
                <Col xs={24} sm={12} lg={6}>
                    <Space align="center" size={10} style={{ height: 32 }}>
                        <Switch
                            size="small"
                            checked={valores.bajas}
                            onChange={(v) => onCambio({ ...valores, bajas: v })}
                        />
                        <div>
                            <Text style={{ display: 'block', lineHeight: 1.2 }}>Ver bajas</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                {`${bajas} de ${filas.length}`}
                            </Text>
                        </div>
                        {contarActivos(valores) > 0 && (
                            <Button type="link" size="small" onClick={() => onCambio(SIN_FILTROS)}>
                                Limpiar
                            </Button>
                        )}
                    </Space>
                </Col>
            </Row>
        </Card>
    );
};

export default FiltrosPersonal;
