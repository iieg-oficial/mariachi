import { Button, Popconfirm, Space, Tooltip } from 'antd';
import {
    CloseOutlined, PlusOutlined, SnippetsOutlined,
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

const addLabel = (hasTabs, activeTabTitle, isMobile) => {
    if (isMobile) return 'Agregar campo';
    if (hasTabs) return `Agregar campo en nueva línea a «${activeTabTitle}»`;
    return 'Agregar campo en nueva línea';
};

export default function AddFieldBar({
    hasTabs, activeTabTitle, isMobile, clipboard, clipboardField,
    onAdd, onPaste, onClearClipboard,
}) {
    const clipboardLabel = clipboardField?.label || clipboardField?.name;
    return (
        <Space.Compact block style={{ marginTop: 8 }}>
            <Tooltip title="El campo empieza su propia línea. Para agregarlo junto a otro, usa el botón + del espacio libre de una línea.">
                <Button type="dashed" icon={<PlusOutlined />} style={{ flex: 1 }} onClick={onAdd}>
                    {addLabel(hasTabs, activeTabTitle, isMobile)}
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
