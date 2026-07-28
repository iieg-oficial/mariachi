import { Modal, Table, Tag, Typography } from 'antd';

const { Paragraph, Text } = Typography;

const SHORTCUTS = [
    { keys: '↑ ↓ ← →', action: 'Moverte entre celdas' },
    { keys: 'Tab / Enter', action: 'Avanzar a la siguiente celda o fila' },
    { keys: 'Shift + flechas', action: 'Seleccionar un rango de celdas' },
    { keys: 'Ctrl + C / Ctrl + V', action: 'Copiar y pegar; el pegado admite bloques completos desde Excel' },
    { keys: 'Escribir directo', action: 'Reemplaza el contenido de la celda activa' },
    { keys: 'F2 o doble clic', action: 'Editar sin borrar lo que ya había' },
    { keys: 'Esc', action: 'Cancelar la edición de la celda' },
    { keys: 'Supr / Backspace', action: 'Vaciar las celdas seleccionadas' },
    { keys: 'Arrastrar la esquina', action: 'Rellenar hacia abajo con el valor de la selección' },
    { keys: 'Ctrl + Z', action: 'Deshacer el último cambio' },
];

const COLUMNS = [
    {
        title: 'Atajo',
        dataIndex: 'keys',
        width: 190,
        render: (value) => <Text code>{value}</Text>,
    },
    { title: 'Qué hace', dataIndex: 'action' },
];

export default function GridShortcutsModal({ open, onClose, extraNotes = null }) {
    return (
        <Modal
            open={open}
            onCancel={onClose}
            onOk={onClose}
            title="Atajos y cosas que conviene saber"
            width={720}
            footer={null}
        >
            <Paragraph type="secondary" style={{ marginBottom: 12 }}>
                La tabla se maneja como una hoja de cálculo. Puedes pegar directamente un bloque
                copiado desde Excel y caerá en las celdas a partir de donde estés parado.
            </Paragraph>

            <Table
                size="small"
                rowKey="keys"
                columns={COLUMNS}
                dataSource={SHORTCUTS}
                pagination={false}
            />

            <Paragraph style={{ marginTop: 16, marginBottom: 6 }}>
                <Text strong>Lo que no se ve a simple vista</Text>
            </Paragraph>
            <ul style={{ paddingInlineStart: 18, marginBottom: 0 }}>
                <li>
                    <Tag color="orange">Celda ámbar</Tag> tiene cambios que todavía no se guardan.
                    Nada se envía hasta que presionas <Text strong>Guardar</Text>.
                </li>
                <li>
                    <Tag color="red">Celda roja</Tag> alguien más la cambió mientras la editabas.
                    Tu valor sigue ahí; revisa el actual antes de volver a guardar.
                </li>
                <li>
                    Si cierras la pestaña con cambios sin guardar, se conservan en este navegador y
                    al volver te preguntamos si los retomas.
                </li>
                <li>
                    <Text strong>Dejar una celda vacía borra el dato</Text> en la base cuando guardas.
                </li>
                <li>
                    El avatar junto al nombre de la fila indica que otra persona está parada ahí en
                    este momento.
                </li>
                <li>
                    Las celdas en gris no se pueden editar aquí (se calculan solas o se editan en la
                    ficha de la capa).
                </li>
            </ul>
            {extraNotes}
        </Modal>
    );
}
