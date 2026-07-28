import { Button, Popconfirm, Space, Tooltip } from 'antd';
import {
    CloseOutlined, EnterOutlined, PlusOutlined, SnippetsOutlined,
} from '@ant-design/icons';
import { fieldTypeLabel } from '../../constants/definitionTypes';

const pasteDescription = (field, clipboard, hasTabs, activeTabTitle) => {
    const partes = [`Tipo ${fieldTypeLabel(field.type)}`];
    if (field.validation?.pattern) partes.push('con patrón de validación');
    if (field.catalog) partes.push(`catálogo «${field.catalog}»`);
    if (field.options?.length) partes.push(`${field.options.length} opciones`);
    const origen = clipboard?.from?.step ? ` · copiado de «${clipboard.from.step}»` : '';
    const destino = hasTabs ? ` Se agregará a «${activeTabTitle}».` : '';
    return `${partes.join(', ')}${origen}.${destino}`;
};

export default function AddFieldBar({
    hasTabs, activeTabTitle, isMobile, clipboard, clipboardField,
    onAdd, onAddEnLinea, onPaste, onClearClipboard,
}) {
    const clipboardLabel = clipboardField?.label || clipboardField?.name;
    return (
        <Space.Compact block style={{ marginTop: 8 }}>
            <Button type="dashed" icon={<PlusOutlined />} style={{ flex: 1 }} onClick={onAdd}>
                {hasTabs ? `Agregar campo a «${activeTabTitle}»` : 'Agregar campo'}
            </Button>
            <Tooltip title="Agregar un campo que empiece su propia línea, aunque lo dejes angosto.">
                <Button type="dashed" icon={<EnterOutlined />} onClick={onAddEnLinea}>
                    {isMobile ? null : 'En línea nueva'}
                </Button>
            </Tooltip>
            {clipboardField && (
                <>
                    <Popconfirm
                        title={`Pegar «${clipboardLabel}»`}
                        description={pasteDescription(clipboardField, clipboard, hasTabs, activeTabTitle)}
                        okText="Pegar"
                        cancelText="Cancelar"
                        onConfirm={onPaste}
                    >
                        <Tooltip title="Pegar el campo copiado">
                            <Button type="dashed" icon={<SnippetsOutlined />}>
                                {isMobile ? null : `Pegar «${clipboardLabel}»`}
                            </Button>
                        </Tooltip>
                    </Popconfirm>
                    <Tooltip title={`Sacar «${clipboardLabel}» del portapapeles`}>
                        <Button
                            type="dashed"
                            icon={<CloseOutlined />}
                            onClick={onClearClipboard}
                            aria-label="Vaciar el portapapeles"
                        />
                    </Tooltip>
                </>
            )}
        </Space.Compact>
    );
}
