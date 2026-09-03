import { Tag, Tooltip, Typography } from 'antd';
import { CaretDownOutlined, CaretRightOutlined, EditOutlined, HolderOutlined } from '@ant-design/icons';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { isPropertyOfGroup, labelForNode } from '@features/mapalab-layers/constants/nodeTypes';
import {
    INDENT_STEP,
    INDENT_STEP_MOBILE,
    STATE_PILLS,
    isOrganizer,
    nodeIcon,
    shapeOf,
    TARJETITA_MARCA,
} from '@features/mapalab-layers/constants/nodeVisuals';
import { resolveAcervoUrl } from '@shared/utils/acervoUrl';

const { Text } = Typography;

function StatePills({ node }) {
    return STATE_PILLS.filter((p) => node[p.key]).map(({ key, label, color, Icon, title }) => (
        <Tooltip key={key} title={title}>
            <Tag color={color} className="tree-pill">
                <Icon />
                {label}
            </Tag>
        </Tooltip>
    ));
}

function TarjetitaDot({ node }) {
    const marca = TARJETITA_MARCA[node.tarjetita];
    if (!marca || isOrganizer(node.nodeType)) return null;
    return (
        <Tooltip title={marca.titulo}>
            <span
                aria-label={marca.titulo}
                style={{
                    width: 7, height: 7, borderRadius: '50%', flex: '0 0 auto',
                    display: 'inline-block', marginLeft: 6, ...marca.estilo,
                }}
            />
        </Tooltip>
    );
}

function TitleBlock({ node, isMobile }) {
    const isProperty = isPropertyOfGroup(node.nodeType, node.parentNodeType);
    const showThemeIcon = (node.nodeType === 'tema' || node.nodeType === 'evento') && node.iconUrl;
    const iconSrc = showThemeIcon ? resolveAcervoUrl(node.iconUrl) : null;

    return (
        <>
            {iconSrc ? (
                <img
                    src={iconSrc}
                    alt=""
                    width={18}
                    height={18}
                    className="tree-theme-icon"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
            ) : (
                nodeIcon({ ...node, isProperty }, { className: 'tree-glyph' })
            )}
            <Text className="tree-name" ellipsis={{ tooltip: node.title }}>{node.title}</Text>
            {isProperty && node.cqlFilter && !isMobile && (
                <code className="tree-cql">{node.cqlFilter}</code>
            )}
            {node.nodeType === 'category' && node.children?.length > 0 && (
                <Tag className="tree-pill tree-pill-count">{node.children.length}</Tag>
            )}
            {node.nodeType === 'group' && (
                <Tag className="tree-pill tree-pill-count">
                    grupo · {node.children?.length || 0} {node.children?.length === 1 ? 'variante' : 'variantes'}
                </Tag>
            )}
            <TarjetitaDot node={node} />
            <StatePills node={node} />
        </>
    );
}

function NodeRow({ node, depth, expanded, selected, isMobile, onToggle, onSelect, onEdit, dragHandle }) {
    const shape = shapeOf(node.nodeType);
    const organizer = isOrganizer(node.nodeType);
    const step = isMobile ? INDENT_STEP_MOBILE : INDENT_STEP;
    const indent = shape === 'band' ? 0 : depth * step;
    const hasChildren = (node.children?.length || 0) > 0;

    if (shape === 'rule') {
        return (
            <div className="tree-row tree-row-rule" style={{ paddingLeft: 14 + indent }}>
                <span className="tree-rule-text">{node.title}</span>
                <span className="tree-rule-line" />
            </div>
        );
    }

    const classes = [
        'tree-row',
        `tree-row-${shape}`,
        selected ? 'is-selected' : '',
        node.disabled ? 'is-off' : '',
    ].filter(Boolean).join(' ');

    return (
        <div
            role="button"
            tabIndex={0}
            className={classes}
            style={{ paddingLeft: 14 + indent }}
            onClick={() => (organizer ? onToggle(node.key) : onSelect(node.key))}
            onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                if (organizer) onToggle(node.key); else onSelect(node.key);
            }}
        >
            {dragHandle}
            {organizer && (
                <span className="tree-caret" aria-hidden="true">
                    {hasChildren ? (expanded ? <CaretDownOutlined /> : <CaretRightOutlined />) : null}
                </span>
            )}
            <TitleBlock node={node} isMobile={isMobile} />
            {organizer && onEdit && (
                <Tooltip title={`Editar ${labelForNode(node.nodeType, node.parentNodeType).toLowerCase()}`}>
                    <span
                        role="button"
                        tabIndex={0}
                        className="tree-edit"
                        aria-label={`Editar ${node.title}`}
                        onClick={(e) => { e.stopPropagation(); onEdit(node.key); }}
                        onKeyDown={(e) => {
                            if (e.key !== 'Enter' && e.key !== ' ') return;
                            e.preventDefault();
                            e.stopPropagation();
                            onEdit(node.key);
                        }}
                    >
                        <EditOutlined />
                    </span>
                </Tooltip>
            )}
        </div>
    );
}

export default function LayersTreeBranch(props) {
    const { node, depth, expanded, selectedKey, isMobile, toggleExpanded, onSelect, onEdit, onReorder, dragHandle } = props;
    const isExpanded = expanded.has(node.key);
    const isGroup = shapeOf(node.nodeType) === 'box';

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
        onReorder(node.key, arrayMove(children, oldIndex, newIndex).map((c) => c.key));
    };

    const childProps = (child) => ({
        ...props,
        key: child.key,
        node: child,
        depth: depth + 1,
        dragHandle: undefined,
    });

    const renderChildren = (children) => {
        if (!children || children.length === 0) return null;
        if (!onReorder) {
            return children.map((child) => <LayersTreeBranch {...childProps(child)} />);
        }
        return (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={children.map((c) => c.key)} strategy={verticalListSortingStrategy}>
                    {children.map((child) => <SortableTreeBranch {...childProps(child)} />)}
                </SortableContext>
            </DndContext>
        );
    };

    const row = (
        <NodeRow
            node={node}
            depth={depth}
            expanded={isExpanded}
            selected={node.key === selectedKey}
            isMobile={isMobile}
            onToggle={toggleExpanded}
            onSelect={onSelect}
            onEdit={onEdit}
            dragHandle={dragHandle}
        />
    );

    if (isGroup) {
        const step = isMobile ? INDENT_STEP_MOBILE : INDENT_STEP;
        return (
            <div className="tree-group" style={{ marginLeft: 14 + depth * step }}>
                {row}
                <div className="tree-group-kids">{renderChildren(node.children)}</div>
            </div>
        );
    }

    return (
        <>
            {row}
            {isExpanded && renderChildren(node.children)}
        </>
    );
}

export function SortableTreeBranch(props) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.node.key });

    if (shapeOf(props.node.nodeType) === 'rule') {
        return <LayersTreeBranch {...props} />;
    }

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    const dragHandle = (
        <span {...attributes} {...listeners} className="tree-grip" aria-label="Arrastrar para reordenar">
            <HolderOutlined />
        </span>
    );

    return (
        <div ref={setNodeRef} style={style}>
            <LayersTreeBranch {...props} dragHandle={dragHandle} />
        </div>
    );
}
