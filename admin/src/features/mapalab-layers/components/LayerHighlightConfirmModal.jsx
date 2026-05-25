import { Modal, Typography } from 'antd';

const { Paragraph, Text } = Typography;

const formatColorLabel = (value) => {
    if (!value) return 'Default (morado + área)';
    return value;
};

export function HighlightApplyConfirm({ open, onCancel, onOk, loading, previewCount, color, shape, applyTo, themeIds }) {
    return (
        <Modal
            open={open}
            title="Confirmar aplicación masiva"
            onCancel={onCancel}
            onOk={onOk}
            okText={`Sí, aplicar a ${previewCount ?? 0}`}
            cancelText="Cancelar"
            confirmLoading={loading}
            okButtonProps={{ danger: applyTo === 'all' }}
        >
            <Paragraph>
                Vas a actualizar el resaltado de <Text strong>{previewCount}</Text> capa{previewCount === 1 ? '' : 's'}.
            </Paragraph>
            <ul style={{ paddingLeft: 16 }}>
                {color !== null && <li>Color: {formatColorLabel(color)}</li>}
                {shape !== null && <li>Forma: {shape}</li>}
                <li>Aplicar a: {applyTo === 'all' ? <Text type="danger">Sobrescribir todas (incluye overrides existentes)</Text> : 'Solo capas con default'}</li>
                {themeIds.length > 0 && <li>Temas: {themeIds.join(', ')}</li>}
            </ul>
        </Modal>
    );
}

export function HighlightResetConfirm({ open, onCancel, onOk, loading, themeIds }) {
    return (
        <Modal
            open={open}
            title="Restablecer resaltado a default"
            onCancel={onCancel}
            onOk={onOk}
            okText="Sí, restablecer"
            cancelText="Cancelar"
            confirmLoading={loading}
            okButtonProps={{ danger: true }}
        >
            <Paragraph>
                Esto pone <Text strong>color y forma en NULL</Text> en todas las hojas afectadas (vuelven a heredar o usar default).
            </Paragraph>
            {themeIds.length > 0
                ? <Paragraph>Acotado a los temas seleccionados: {themeIds.join(', ')}.</Paragraph>
                : <Paragraph type="warning">Sin filtro de tema: aplicará a <Text strong>todas las hojas</Text> del árbol.</Paragraph>
            }
        </Modal>
    );
}
