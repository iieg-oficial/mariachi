import { Alert, Table, Tag, Typography } from 'antd';

const { Text } = Typography;

const columnas = [
    { title: 'Combinación', dataIndex: 'descripcion', key: 'descripcion' },
    {
        title: 'Contraste',
        dataIndex: 'ratio',
        key: 'ratio',
        width: 110,
        render: (valor) => <Text strong>{valor}:1</Text>,
    },
    {
        title: 'WCAG AA',
        dataIndex: 'cumple_aa',
        key: 'cumple_aa',
        width: 190,
        render: (cumple, fila) => {
            if (cumple) return <Tag color='green'>Cumple</Tag>;
            if (fila.cumple_aa_texto_grande) {
                return <Tag color='orange'>Solo texto grande</Tag>;
            }
            return <Tag color='red'>No cumple</Tag>;
        },
    },
];

export default function ContrasteAlert({ contraste = [] }) {
    if (!contraste.length) return null;

    const fallos = contraste.filter((c) => !c.cumple_aa);

    return (
        <>
            {fallos.length > 0 && (
                <Alert
                    type='warning'
                    showIcon
                    style={{ marginBottom: 16 }}
                    message={`${fallos.length} combinación(es) no alcanzan el contraste AA`}
                    description='Se necesita 4.5:1 para texto normal y 3:1 para texto grande. Un color que no cumple puede usarse como acento o fondo, pero no como color de texto.'
                />
            )}
            <Table
                size='small'
                rowKey={(fila) => `${fila.frente}-${fila.fondo}`}
                columns={columnas}
                dataSource={contraste}
                pagination={false}
            />
        </>
    );
}
