import { useState } from 'react';
import { Button, Input, Space, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined, TagsOutlined } from '@ant-design/icons';

const { Text } = Typography;

const aFilas = (mapa) => Object.entries(mapa || {}).map(([valor, alias]) => ({ valor, alias }));

const aMapa = (filas) => {
    const pares = filas.filter((f) => f.valor.trim() && f.alias).map((f) => [f.valor.trim(), f.alias]);
    return pares.length ? Object.fromEntries(pares) : undefined;
};

const mismoMapa = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export default function ValueAliasField({ value, onChange }) {
    const [filas, setFilas] = useState(() => aFilas(value));
    const [abierto, setAbierto] = useState(false);
    const vigentes = filas.filter((f) => f.valor.trim() && f.alias).length;

    if (!mismoMapa(aMapa(filas), aMapa(aFilas(value)))) setFilas(aFilas(value));

    const cambiar = (siguientes) => {
        setFilas(siguientes);
        const mapa = aMapa(siguientes);
        if (!mismoMapa(mapa, value)) onChange(mapa);
    };
    const editar = (idx, patch) => cambiar(filas.map((f, i) => (i === idx ? { ...f, ...patch } : f)));

    return (
        <Space orientation="vertical" size={4} style={{ width: '100%' }}>
            <Button
                type="text"
                size="small"
                icon={<TagsOutlined />}
                aria-expanded={abierto}
                onClick={() => setAbierto((v) => !v)}
            >
                {vigentes ? `Alias de valores (${vigentes})` : 'Alias de valores'}
            </Button>
            {abierto && (
                <>
                    {filas.map((fila, idx) => (
                        <Space.Compact key={idx} style={{ width: '100%', minWidth: 0 }}>
                            <Input
                                style={{ width: 100 }}
                                value={fila.valor}
                                aria-label="Valor"
                                placeholder="Valor"
                                onChange={(e) => editar(idx, { valor: e.target.value })}
                            />
                            <Input
                                value={fila.alias}
                                aria-label="Mostrar como"
                                placeholder="Mostrar como"
                                onChange={(e) => editar(idx, { alias: e.target.value })}
                            />
                            <Button
                                danger
                                icon={<DeleteOutlined />}
                                aria-label="Quitar alias"
                                onClick={() => cambiar(filas.filter((_, i) => i !== idx))}
                            />
                        </Space.Compact>
                    ))}
                    <Button
                        type="dashed"
                        size="small"
                        icon={<PlusOutlined />}
                        block
                        onClick={() => setFilas([...filas, { valor: '', alias: '' }])}
                    >
                        Agregar alias
                    </Button>
                    {!filas.length && (
                        <Text type="secondary" style={{ fontSize: 11 }}>Muestra un texto en lugar del valor exacto.</Text>
                    )}
                </>
            )}
        </Space>
    );
}
