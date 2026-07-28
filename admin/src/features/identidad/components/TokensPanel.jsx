import { useMemo, useState } from 'react';
import { Button, ColorPicker, Input, Space, Table, Tag, Typography } from 'antd';

const { Text } = Typography;

const GRUPOS = {
    color: 'Color',
    dataviz: 'Visualización de datos',
    tipografia: 'Tipografía',
    espaciado: 'Espaciado',
    radio: 'Radios',
    sombra: 'Sombras',
    breakpoint: 'Breakpoints',
};

const esColor = (token) => token.tipo === 'color' && typeof token.valor === 'string';

const comoTexto = (valor) => (Array.isArray(valor) ? valor.join(', ') : String(valor ?? ''));

export default function TokensPanel({ tokens = [], onGuardar, guardando }) {
    const [edicion, setEdicion] = useState({});

    const grupos = useMemo(() => {
        const mapa = new Map();
        tokens.forEach((token) => {
            if (!mapa.has(token.grupo)) mapa.set(token.grupo, []);
            mapa.get(token.grupo).push(token);
        });
        return [...mapa.entries()];
    }, [tokens]);

    const valorDe = (token) => (
        token.id in edicion ? edicion[token.id] : comoTexto(token.valor)
    );

    const cambiar = (token, valor) => setEdicion((prev) => ({ ...prev, [token.id]: valor }));

    const guardar = async (token) => {
        const crudo = valorDe(token);
        const valor = Array.isArray(token.valor)
            ? crudo.split(',').map((parte) => parte.trim()).filter(Boolean)
            : crudo;
        await onGuardar(token, { valor });
        setEdicion((prev) => {
            const siguiente = { ...prev };
            delete siguiente[token.id];
            return siguiente;
        });
    };

    const columnas = [
        {
            title: 'Token',
            dataIndex: 'clave',
            key: 'clave',
            width: 220,
            render: (clave) => <Text code>{clave}</Text>,
        },
        {
            title: 'Valor',
            key: 'valor',
            width: 320,
            render: (_, token) => (
                <Space>
                    {esColor(token) && (
                        <ColorPicker
                            value={valorDe(token)}
                            onChangeComplete={(color) => cambiar(token, color.toHexString())}
                        />
                    )}
                    <Input
                        value={valorDe(token)}
                        onChange={(evento) => cambiar(token, evento.target.value)}
                        onPressEnter={() => guardar(token)}
                    />
                </Space>
            ),
        },
        {
            title: 'Uso',
            dataIndex: 'descripcion',
            key: 'descripcion',
            render: (texto) => <Text type='secondary'>{texto || '—'}</Text>,
        },
        {
            title: '',
            key: 'acciones',
            width: 100,
            render: (_, token) => (
                token.id in edicion ? (
                    <Button type='primary' size='small' loading={guardando} onClick={() => guardar(token)}>
                        Guardar
                    </Button>
                ) : null
            ),
        },
    ];

    return (
        <Space direction='vertical' size='large' style={{ width: '100%' }}>
            {grupos.map(([grupo, lista]) => (
                <div key={grupo}>
                    <Space style={{ marginBottom: 8 }}>
                        <Text strong>{GRUPOS[grupo] || grupo}</Text>
                        <Tag>{lista.length}</Tag>
                    </Space>
                    <Table
                        size='small'
                        rowKey='id'
                        columns={columnas}
                        dataSource={lista}
                        pagination={false}
                    />
                </div>
            ))}
        </Space>
    );
}
