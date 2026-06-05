import { Tag, Typography } from 'antd';
import { CaretDownOutlined, CaretRightOutlined, DownOutlined, HolderOutlined, UpOutlined } from '@ant-design/icons';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { isPropertyOfGroup, labelForNode } from '@features/mapalab-layers/constants/nodeTypes';
import { resolveAcervoUrl } from '@shared/utils/acervoUrl';

const { Text } = Typography;

const NODE_TAG_COLORS = {
    tema: 'purple',
    category: 'blue',
    label: 'default',
    group: 'gold',
    leaf: 'green',
    'evento-root': 'magenta',
    evento: 'magenta',
    'evento-categoria': 'blue',
    'evento-etiqueta': 'default',
    'evento-capa': 'green',
};

function TitleBlock({ node, selected, isMobile }) {
    const tagColor = NODE_TAG_COLORS[node.nodeType] || 'default';
    const isProperty = isPropertyOfGroup(node.nodeType, node.parentNodeType);
    const { workspaceAlias, geoserverLayer, disabled, hiddenInMenu } = node;
    const showIcon = (node.nodeType === 'tema' || node.nodeType === 'evento') && node.iconUrl;
    const iconSrc = showIcon ? resolveAcervoUrl(node.iconUrl) : null;
    return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: isMobile ? 'nowrap' : 'wrap', minWidth: 0, flex: '1 1 auto', overflow: 'hidden' }}>
            {iconSrc && (
                <img
                    src={iconSrc}
                    alt=""
                    width={18}
                    height={18}
                    style={{ flexShrink: 0, objectFit: 'contain', borderRadius: 2 }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
            )}
            <Text strong={selected} style={{
                minWidth: 0,
                flex: '1 1 auto',
                display: '-webkit-box',
                WebkitLineClamp: isMobile ? 1 : 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                wordBreak: 'break-word',
                lineHeight: '18px',
            }}>
                {node.title}
            </Text>
            <Tag color={isProperty ? 'cyan' : tagColor} style={{ marginRight: 0, fontSize: 10, flexShrink: 0 }}>
                {labelForNode(node.nodeType, node.parentNodeType)}
            </Tag>
            {workspaceAlias && !isMobile && (
                <Tag color="blue" style={{ fontSize: 10, marginRight: 0, flexShrink: 0 }}>{workspaceAlias}</Tag>
            )}
            {geoserverLayer && !isMobile && (
                <Text type="secondary" style={{ fontSize: 11 }}>{geoserverLayer}</Text>
            )}
            {hiddenInMenu && (
                <Tag color="orange" style={{ fontSize: 10, marginRight: 0, flexShrink: 0 }}>oculto</Tag>
            )}
            {disabled && (
                <Tag color="red" style={{ fontSize: 10, marginRight: 0, flexShrink: 0 }}>disabled</Tag>
            )}
        </span>
    );
}

function NodeRow({ node, depth, expanded, selected, editorOpen, onToggle, onSelect, onToggleEditor, canShowEditorToggle, actionButtons, isMobile, dragHandle }) {
    const hasChildren = (node.children?.length || 0) > 0;
    const indentStep = isMobile ? 12 : 18;
    const stackOnMobile = isMobile && selected && (actionButtons || canShowEditorToggle);
    const ExpandToggle = (
        <button
            type="button"
            onClick={(e) => { if (hasChildren) { e.stopPropagation(); onToggle(node.key); } }}
            aria-label={hasChildren ? (expanded ? 'Colapsar rama' : 'Expandir rama') : ''}
            style={{ width: 22, height: 22, marginTop: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: hasChildren ? '#8c8c8c' : 'transparent', background: 'transparent', border: 0, padding: 0, cursor: hasChildren ? 'pointer' : 'default' }}
        >
            {hasChildren ? (expanded ? <CaretDownOutlined /> : <CaretRightOutlined />) : <CaretRightOutlined style={{ visibility: 'hidden' }} />}
        </button>
    );
    const ActionsBlock = selected && (actionButtons || canShowEditorToggle) ? (
        <span
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, justifyContent: stackOnMobile ? 'flex-end' : undefined }}
        >
            {actionButtons}
            {canShowEditorToggle && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggleEditor(); }}
                    aria-label={editorOpen ? 'Colapsar editor' : 'Expandir editor'}
                    title={editorOpen ? 'Colapsar editor' : 'Expandir editor'}
                    style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#1677ff', background: 'transparent', border: 0, padding: 0, cursor: 'pointer' }}
                >
                    {editorOpen ? <UpOutlined /> : <DownOutlined />}
                </button>
            )}
        </span>
    ) : null;
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onSelect(node.key)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(node.key); } }}
            style={{
                display: 'flex',
                flexDirection: stackOnMobile ? 'column' : 'row',
                alignItems: stackOnMobile ? 'stretch' : 'flex-start',
                gap: stackOnMobile ? 4 : 6,
                padding: isMobile ? '6px 4px' : '8px 8px',
                paddingLeft: (isMobile ? 4 : 8) + depth * indentStep,
                cursor: 'pointer',
                background: selected ? '#E6F4FF' : 'transparent',
                borderLeft: selected ? '3px solid #1677ff' : '3px solid transparent',
                opacity: node.disabled ? 0.5 : 1,
                minHeight: 36,
            }}
        >
            {stackOnMobile ? (
                <>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, minWidth: 0 }}>
                        {dragHandle}
                        {ExpandToggle}
                        <TitleBlock node={node} selected={selected} isMobile={isMobile} />
                    </div>
                    {ActionsBlock}
                </>
            ) : (
                <>
                    {dragHandle}
                    {ExpandToggle}
                    <TitleBlock node={node} selected={selected} isMobile={isMobile} />
                    {ActionsBlock}
                </>
            )}
        </div>
    );
}

export default function LayersTreeBranch({ node, depth, expanded, selectedKey, editorOpen, editorContent, actionButtons, isMobile, toggleExpanded, onSelect, onToggleEditor, enableDrag, onReorder, dragHandle }) {
    const isExpanded = expanded.has(node.key);
    const isSelected = node.key === selectedKey;
    const canShowEditorToggle = Boolean(editorContent) && isSelected;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const children = node.children || [];
        const oldIndex = children.findIndex((c) => c.key === active.id);
        const newIndex = children.findIndex((c) => c.key === over.id);
        if (oldIndex < 0 || newIndex < 0) return;
        const reordered = arrayMove(children, oldIndex, newIndex);
        onReorder(node.key, reordered.map((c) => c.key));
    };

    const renderChildren = (children) => {
        if (!children || children.length === 0) return null;
        if (!onReorder || !enableDrag) {
            return children.map((child) => (
                <LayersTreeBranch
                    key={child.key}
                    node={child}
                    depth={depth + 1}
                    expanded={expanded}
                    selectedKey={selectedKey}
                    editorOpen={editorOpen}
                    editorContent={editorContent}
                    actionButtons={actionButtons}
                    isMobile={isMobile}
                    toggleExpanded={toggleExpanded}
                    onSelect={onSelect}
                    onToggleEditor={onToggleEditor}
                    enableDrag={enableDrag}
                    onReorder={onReorder}
                />
            ));
        }
        return (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={children.map((c) => c.key)} strategy={verticalListSortingStrategy}>
                    {children.map((child) => (
                        <SortableTreeBranch
                            key={child.key}
                            node={child}
                            depth={depth + 1}
                            expanded={expanded}
                            selectedKey={selectedKey}
                            editorOpen={editorOpen}
                            editorContent={editorContent}
                            actionButtons={actionButtons}
                            isMobile={isMobile}
                            toggleExpanded={toggleExpanded}
                            onSelect={onSelect}
                            onToggleEditor={onToggleEditor}
                            enableDrag={enableDrag}
                            onReorder={onReorder}
                        />
                    ))}
                </SortableContext>
            </DndContext>
        );
    };

    return (
        <>
            <NodeRow
                node={node}
                depth={depth}
                expanded={isExpanded}
                selected={isSelected}
                editorOpen={editorOpen}
                canShowEditorToggle={canShowEditorToggle}
                actionButtons={isSelected ? actionButtons : null}
                isMobile={isMobile}
                onToggle={toggleExpanded}
                onSelect={onSelect}
                onToggleEditor={onToggleEditor}
                dragHandle={dragHandle}
            />
            {isSelected && editorContent && editorOpen && (
                <div style={{ borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0', padding: isMobile ? '8px 4px' : '12px 16px' }}>
                    {editorContent}
                </div>
            )}
            {isExpanded && renderChildren(node.children)}
        </>
    );
}

export function SortableTreeBranch(props) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: props.node.key, disabled: !props.enableDrag });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    const dragHandle = props.enableDrag ? (
        <span
            {...attributes}
            {...listeners}
            style={{ cursor: 'grab', color: '#8c8c8c', fontSize: 14, flexShrink: 0, padding: '0 2px', lineHeight: 0 }}
        >
            <HolderOutlined />
        </span>
    ) : null;

    return (
        <div ref={setNodeRef} style={style}>
            <LayersTreeBranch {...props} dragHandle={dragHandle} />
        </div>
    );
}
