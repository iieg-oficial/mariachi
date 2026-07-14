import { Button, Card, Popconfirm, Select, Space, Tag, Tooltip } from 'antd';
import {
    CloseOutlined, ColumnWidthOutlined, DeleteOutlined, DownOutlined, EditOutlined, SaveOutlined, UpOutlined,
} from '@ant-design/icons';
import SortableItem from './SortableItem';
import FieldForm from './FieldForm';
import { isOrphanTab, tabOf } from './fieldUtils';
import { fieldTypeLabel } from '../../constants/definitionTypes';

const COLSPAN_LABEL = { 3: 'Chico', 2: 'Mediano', 1: 'Grande' };

const COLSPAN_OPTIONS = [
    { value: 1, label: 'Grande' },
    { value: 2, label: 'Mediano' },
    { value: 3, label: 'Chico' },
];

export default function FieldCard({
    id, field, isEditing, isMobile, showTabs, tabs, tabOptions, dependentsCount = 0,
    canMoveUp, canMoveDown, onMove, onToggleEdit, onDelete, onAssignTab, onAssignColSpan,
    fieldForm, availableShowWhenFields, onSaveField, onCancelEdit,
}) {
    const cs = field.layout?.colSpan ?? 1;
    const widthPct = isEditing ? 100 : (cs === 2 ? 50 : cs === 3 ? 33.333 : 100);
    const isCompact = isMobile || cs >= 2;

    const actionButtons = (
        <Space size="small" direction={isCompact && !isMobile ? 'vertical' : 'horizontal'}>
            {isMobile && (
                <>
                    <Tooltip title="Subir">
                        <Button
                            type="link"
                            size="small"
                            icon={<UpOutlined />}
                            disabled={!canMoveUp}
                            onClick={() => onMove(-1)}
                        />
                    </Tooltip>
                    <Tooltip title="Bajar">
                        <Button
                            type="link"
                            size="small"
                            icon={<DownOutlined />}
                            disabled={!canMoveDown}
                            onClick={() => onMove(1)}
                        />
                    </Tooltip>
                </>
            )}
            {isEditing && (
                <Tooltip title="Guardar cambios" placement="left">
                    <Button
                        type={isCompact ? 'link' : 'primary'}
                        size="small"
                        icon={<SaveOutlined />}
                        onClick={() => fieldForm.submit()}
                    >
                        {!isCompact && 'Guardar'}
                    </Button>
                </Tooltip>
            )}
            <Tooltip title={isEditing ? 'Cerrar edición' : 'Editar'} placement="left">
                <Button
                    type="link"
                    size="small"
                    icon={isEditing ? <CloseOutlined /> : <EditOutlined />}
                    onClick={onToggleEdit}
                />
            </Tooltip>
            <Popconfirm
                title="¿Eliminar este campo?"
                okText="Eliminar"
                okButtonProps={{ danger: true }}
                cancelText="Cancelar"
                onConfirm={onDelete}
            >
                <Tooltip title="Eliminar" placement="left">
                    <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                </Tooltip>
            </Popconfirm>
        </Space>
    );

    const tabPicker = showTabs && !isEditing && (
        <Select
            size="small"
            variant="borderless"
            value={tabOf(field, tabs)}
            options={tabOptions}
            onChange={onAssignTab}
            onClick={(e) => e.stopPropagation()}
            style={{ minWidth: 140 }}
        />
    );

    const colSpanPicker = isEditing ? (
        <Tag icon={<ColumnWidthOutlined />} color="geekblue">{COLSPAN_LABEL[cs] ?? 'Grande'}</Tag>
    ) : (
        <Tooltip title="Ancho en columnas">
            <Select
                size="small"
                variant="borderless"
                value={cs}
                options={COLSPAN_OPTIONS}
                onChange={onAssignColSpan}
                onClick={(e) => e.stopPropagation()}
                prefix={<ColumnWidthOutlined style={{ color: '#999' }} />}
                style={{ minWidth: 110 }}
            />
        </Tooltip>
    );

    const metaTags = (
        <>
            <Tag color="blue">{fieldTypeLabel(field.type)}</Tag>
            {field.required && <Tag color="red">Requerido</Tag>}
            {isOrphanTab(field, tabs) && <Tag color="volcano">Tab «{field.tab}» no existe</Tag>}
            {field.showWhen && (
                <Tooltip title={`Solo se muestra si «${field.showWhen.field}» = «${field.showWhen.equals}»`}>
                    <Tag color="purple">Condicionado</Tag>
                </Tooltip>
            )}
            {dependentsCount > 0 && (
                <Tooltip title={`${dependentsCount} campo${dependentsCount === 1 ? '' : 's'} de este paso aparecen según el valor de este campo.`}>
                    <Tag color="magenta">Activa {dependentsCount}</Tag>
                </Tooltip>
            )}
            {colSpanPicker}
        </>
    );

    return (
        <SortableItem
            id={id}
            dragHandle={!isMobile}
            wrapperStyle={{
                width: isMobile ? '100%' : `${widthPct}%`,
                padding: 4,
                boxSizing: 'border-box',
            }}
            gripFooter={isCompact && !isMobile ? actionButtons : null}
        >
            <Card size="small" styles={{ body: { padding: isCompact ? '8px' : '4px 8px' } }}>
                {isCompact ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <strong>{field.label || field.name}</strong>
                                <code style={{ fontSize: 12 }}>{field.name}</code>
                            </div>
                            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                                {metaTags}
                                {tabPicker}
                            </div>
                        </div>
                        {isMobile && actionButtons}
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <strong>{field.label || field.name}</strong>
                        <code style={{ fontSize: 12 }}>{field.name}</code>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                            {metaTags}
                            {tabPicker}
                        </div>
                        <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                            {actionButtons}
                        </div>
                    </div>
                )}
                {isEditing && (
                    <FieldForm
                        form={fieldForm}
                        field={field}
                        availableTabs={tabs}
                        availableShowWhenFields={availableShowWhenFields}
                        onSave={onSaveField}
                        onCancel={onCancelEdit}
                    />
                )}
            </Card>
        </SortableItem>
    );
}
