import { Button, Empty, Form, Input, Space, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import TituloConAyuda from '@shared/components/TituloConAyuda';

const { Text } = Typography;

export function EditorPares({ pares = [], onChange, etiqueta = 'Etiqueta', valor = 'Valor', agregar }) {
    const actualizar = (i, campo, texto) => onChange(pares.map((p, j) => (j === i ? { ...p, [campo]: texto } : p)));
    return (
        <Space direction="vertical" style={{ width: '100%' }}>
            {pares.map((par, i) => (
                <Space.Compact key={i} style={{ width: '100%' }}>
                    <Input style={{ width: '35%' }} placeholder={etiqueta} value={par.etiqueta} onChange={(e) => actualizar(i, 'etiqueta', e.target.value)} />
                    <Input placeholder={valor} value={par.valor} onChange={(e) => actualizar(i, 'valor', e.target.value)} />
                    <Button icon={<DeleteOutlined />} aria-label="Quitar" onClick={() => onChange(pares.filter((_, j) => j !== i))} />
                </Space.Compact>
            ))}
            <Button shape="round" icon={<PlusOutlined />} onClick={() => onChange([...pares, { etiqueta: '', valor: '' }])}>{agregar}</Button>
        </Space>
    );
}

export function EditorFuente({ contenido, onChange }) {
    const descargas = contenido.descargas || [];
    const pares = descargas.map((d) => ({ etiqueta: d.variable, valor: d.url }));
    return (
        <Form layout="vertical">
            <Form.Item label="Ficha de la fuente">
                <EditorPares
                    pares={contenido.caracteristicas}
                    onChange={(caracteristicas) => onChange({ ...contenido, caracteristicas })}
                    agregar="Agregar dato"
                />
            </Form.Item>
            <Form.Item label="Fuente general">
                <Input
                    value={contenido.fuente_general || ''}
                    placeholder="https://…"
                    onChange={(e) => onChange({ ...contenido, fuente_general: e.target.value || null })}
                />
            </Form.Item>
            <Form.Item label="Descargas">
                <EditorPares
                    pares={pares}
                    etiqueta="Variable"
                    valor="URL"
                    onChange={(nuevas) => onChange({
                        ...contenido,
                        descargas: nuevas.map((p) => ({ variable: p.etiqueta, url: p.valor })),
                    })}
                    agregar="Agregar descarga"
                />
            </Form.Item>
        </Form>
    );
}

export function EditorVariables({ contenido, onChange }) {
    return (
        <EditorPares
            pares={contenido.variables}
            etiqueta="Variable"
            valor="Descripción"
            onChange={(variables) => onChange({ ...contenido, variables })}
            agregar="Agregar variable"
        />
    );
}

export function EditorNotas({ contenido, onChange, objetos, tipo }) {
    if (!objetos.length) {
        return <Empty description={`El sincronizador aún no reporta ${tipo} para este pipeline`} />;
    }
    const notas = contenido.notas || {};
    const actualizar = (nombre, texto) => {
        const siguiente = { ...notas, [nombre]: texto };
        if (!texto) delete siguiente[nombre];
        onChange({ ...contenido, notas: siguiente });
    };
    return (
        <Form layout="vertical">
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                <TituloConAyuda
                    titulo="Las filas, columnas y tipos los pone el sincronizador"
                    ayuda="Aquí solo se sobrescribe la descripción. Vacío usa el comentario de la BD o el README."
                />
            </Text>
            {objetos.map((obj) => (
                <Form.Item key={obj.nombre} label={<Text code>{obj.nombre}</Text>}>
                    <Input.TextArea
                        value={notas[obj.nombre] || ''}
                        placeholder={obj.descripcion || 'Sin descripción'}
                        autoSize={{ minRows: 2 }}
                        onChange={(e) => actualizar(obj.nombre, e.target.value)}
                    />
                </Form.Item>
            ))}
        </Form>
    );
}
