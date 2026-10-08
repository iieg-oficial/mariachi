import { Button, Form, Input, Radio, Space } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import TituloConAyuda from '@shared/components/TituloConAyuda';

const AYUDA_MARKDOWN = 'Admite **negritas**, `código` y enlaces [texto](https://…). Las URL sueltas se enlazan solas.';

export function ListaTextos({ valores = [], onChange, placeholder, agregar, filas = 3 }) {
    const actualizar = (i, texto) => onChange(valores.map((v, j) => (j === i ? texto : v)));
    return (
        <Space direction="vertical" style={{ width: '100%' }}>
            {valores.map((valor, i) => (
                <Space.Compact key={i} style={{ width: '100%' }}>
                    <Input.TextArea
                        value={valor}
                        autoSize={{ minRows: filas }}
                        placeholder={placeholder}
                        onChange={(e) => actualizar(i, e.target.value)}
                    />
                    <Button
                        icon={<DeleteOutlined />}
                        aria-label="Quitar"
                        onClick={() => onChange(valores.filter((_, j) => j !== i))}
                    />
                </Space.Compact>
            ))}
            <Button shape="round" icon={<PlusOutlined />} onClick={() => onChange([...valores, ''])}>{agregar}</Button>
        </Space>
    );
}

export function EditorDescripcion({ contenido, onChange }) {
    return (
        <Form layout="vertical">
            <Form.Item label={<TituloConAyuda titulo="Párrafos" ayuda={AYUDA_MARKDOWN} />}>
                <ListaTextos
                    valores={contenido.parrafos}
                    onChange={(parrafos) => onChange({ ...contenido, parrafos })}
                    agregar="Agregar párrafo"
                />
            </Form.Item>
            <Form.Item label={<TituloConAyuda titulo="Avisos" ayuda="Se muestran en el icono de información junto al título de la sección." />}>
                <ListaTextos
                    valores={contenido.avisos}
                    filas={2}
                    onChange={(avisos) => onChange({ ...contenido, avisos })}
                    agregar="Agregar aviso"
                />
            </Form.Item>
        </Form>
    );
}

export function EditorTexto({ contenido, onChange }) {
    return (
        <Form layout="vertical">
            <Form.Item label={<TituloConAyuda titulo="Contenido" ayuda={AYUDA_MARKDOWN} />}>
                <Input.TextArea
                    value={contenido.markdown}
                    autoSize={{ minRows: 8 }}
                    maxLength={20000}
                    showCount
                    onChange={(e) => onChange({ ...contenido, markdown: e.target.value })}
                />
            </Form.Item>
        </Form>
    );
}

export function EditorEjecucion({ contenido, onChange }) {
    return (
        <Form layout="vertical">
            <Form.Item label={<TituloConAyuda titulo="Nota" ayuda="Los estados de los DAG los pone el sincronizador; aquí solo va una aclaración opcional." />}>
                <Input.TextArea
                    value={contenido.nota || ''}
                    autoSize={{ minRows: 3 }}
                    onChange={(e) => onChange({ ...contenido, nota: e.target.value || null })}
                />
            </Form.Item>
        </Form>
    );
}

export function EditorDiagrama({ contenido, onChange }) {
    return (
        <Form layout="vertical">
            <Form.Item label="Origen del diagrama">
                <Radio.Group
                    value={contenido.origen}
                    onChange={(e) => onChange({ ...contenido, origen: e.target.value })}
                    options={[
                        { value: 'auto', label: 'Automático' },
                        { value: 'bd', label: 'Llaves foráneas de la BD' },
                        { value: 'repo', label: 'erd.svg de ETL-SIEEJ' },
                    ]}
                />
            </Form.Item>
        </Form>
    );
}
