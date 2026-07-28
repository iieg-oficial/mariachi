import { Button, Card, Dropdown, Modal, Popconfirm, Select, Space, Tag, Tooltip } from 'antd';
import {
    BlockOutlined, CloseOutlined, CopyOutlined, DeleteOutlined, DownOutlined,
    EditOutlined, MoreOutlined, SaveOutlined, UpOutlined,
} from '@ant-design/icons';
import SortableItem from './SortableItem';
import FieldForm from './FieldForm';
import { tabOf } from './fieldUtils';
import {
    colChoicesFor, isAlone, startColOf, unitsOfColSpan,
} from './fieldLayout';
import { ColSelect, ColSpanSelect, ResizeHandle, WidthGlyph } from './LayoutControls';
import useColSpanResize from './useColSpanResize';
import { colSpanLabel, positionLabel } from './layoutOptions';
import { fieldTypeLabel } from '../../constants/definitionTypes';

export default function FieldCard({
    id, field, placement, isEditing, isMobile, showTabs, tabs, tabOptions, dependentsCount = 0,
    canMoveUp, canMoveDown, onMove, onToggleEdit, onDelete, onCopy, onDuplicate,
    onAssignTab, onAssignColSpan, onAssignCol, onResizeChange, layoutOverride,
    resolveSlots, previousField, defaultCol, onLayoutDraft,
    fieldForm, availableShowWhenFields, onSaveField, onCancelEdit,
}) {
    const layout = layoutOverride ?? field.layout;
    const saved = layout?.colSpan ?? 1;
    const { handleRef, draggedColSpan, startResize } = useColSpanResize({
        colSpan: saved,
        onResizeChange,
        onCommit: onAssignColSpan,
    });

    const cs = draggedColSpan ?? saved;
    const span = placement?.units ?? unitsOfColSpan(cs);
    const alone = isAlone({ layout });
    const col = placement?.col ?? startColOf({ layout });
    const gridColumn = isEditing || isMobile
        ? '1 / -1'
        : (col == null ? `span ${span}` : `${col} / span ${span}`);
    const isCompact = isMobile || cs >= 2;
    const useMoreMenu = cs >= 2 && !isMobile;
    const canResize = !isMobile && !isEditing;

    const confirmDelete = () => {
        Modal.confirm({
            title: '¿Eliminar este campo?',
            content: `Se quitará «${field.label || field.name}» de este paso.`,
            okText: 'Eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: onDelete,
        });
    };

    const moreMenu = {
        items: [
            { key: 'copy', icon: <CopyOutlined />, label: 'Copiar campo' },
            { key: 'duplicate', icon: <BlockOutlined />, label: 'Duplicar aquí' },
            { type: 'divider' },
            { key: 'delete', icon: <DeleteOutlined />, label: 'Eliminar', danger: true },
        ],
        onClick: ({ key, domEvent }) => {
            domEvent.stopPropagation();
            if (key === 'copy') onCopy();
            else if (key === 'duplicate') onDuplicate();
            else if (key === 'delete') confirmDelete();
        },
    };

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
            {!useMoreMenu && (
                <>
                    <Tooltip title="Copiar campo (para pegarlo en otro paso o formulario)" placement="left">
                        <Button type="link" size="small" icon={<CopyOutlined />} onClick={onCopy} />
                    </Tooltip>
                    <Tooltip title="Duplicar aquí" placement="left">
                        <Button type="link" size="small" icon={<BlockOutlined />} onClick={onDuplicate} />
                    </Tooltip>
                </>
            )}
            <Tooltip title={isEditing ? 'Cerrar edición' : 'Editar'} placement="left">
                <Button
                    type="link"
                    size="small"
                    icon={isEditing ? <CloseOutlined /> : <EditOutlined />}
                    onClick={onToggleEdit}
                />
            </Tooltip>
            {useMoreMenu ? (
                <Tooltip title="Más opciones (copiar, duplicar, eliminar)" placement="left">
                    <Dropdown menu={moreMenu} placement="bottomRight" trigger={['click']}>
                        <Button type="link" size="small" icon={<MoreOutlined />} />
                    </Dropdown>
                </Tooltip>
            ) : (
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
            )}
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

    const layoutTag = (
        <Tag color="geekblue">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <WidthGlyph colSpan={cs} col={col ?? 1} width={22} />
                {colSpanLabel(cs)}
                {cs !== 1 && col != null && ` · ${positionLabel(cs, colChoicesFor(cs), col)}`}
            </span>
        </Tag>
    );

    const aloneTag = alone && cs !== 1 && (
        <Tooltip title="Ningún otro campo se acomoda a su lado, aunque quepa">
            <Tag color="cyan">Línea reservada</Tag>
        </Tooltip>
    );

    const layoutPickers = isMobile && !isEditing ? (
        <>
            <ColSpanSelect value={cs} onChange={onAssignColSpan} />
            {cs !== 1 && (
                <ColSelect value={col ?? 1} colSpan={cs} onChange={onAssignCol} />
            )}
        </>
    ) : layoutTag;

    const resizeHandle = canResize && (
        <ResizeHandle handleRef={handleRef} active={!!draggedColSpan} onPointerDown={startResize} />
    );

    const metaTags = (
        <>
            <Tag color="blue">{fieldTypeLabel(field.type)}</Tag>
            {field.required && <Tag color="red">Requerido</Tag>}
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
            {layoutPickers}
            {aloneTag}
        </>
    );

    return (
        <SortableItem
            id={id}
            dragHandle={!isMobile}
            wrapperStyle={{
                gridColumn,
                padding: 4,
                boxSizing: 'border-box',
                minWidth: 0,
                zIndex: draggedColSpan ? 2 : undefined,
            }}
            wrapperProps={{ 'data-field-wrapper': '' }}
            gripFooter={isCompact && !isMobile ? actionButtons : null}
        >
            <Card
                size="small"
                style={{ position: 'relative', borderColor: draggedColSpan ? '#5C2472' : undefined }}
                styles={{ body: { padding: isCompact ? '8px' : '4px 8px' } }}
            >
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
                        resolveSlots={resolveSlots}
                        previousField={previousField}
                        defaultCol={defaultCol}
                        onLayoutDraft={onLayoutDraft}
                        onSave={onSaveField}
                        onCancel={onCancelEdit}
                    />
                )}
                {resizeHandle}
            </Card>
        </SortableItem>
    );
}
