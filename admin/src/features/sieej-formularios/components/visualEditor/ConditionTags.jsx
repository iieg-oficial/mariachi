import { Dropdown, Tag, Tooltip } from 'antd';
import { ApiOutlined, BranchesOutlined, WarningOutlined } from '@ant-design/icons';
import { ISSUE_TEXT, colorOfTrigger } from './conditionLinks';

const clickable = { cursor: 'pointer', marginInlineEnd: 0 };

export function ConditionTag({ condition, issue, triggerName, onIr, onHover }) {
    if (!condition && !issue) return null;

    if (issue) {
        const texto = ISSUE_TEXT[issue];
        return (
            <Tooltip title={texto.detail(triggerName)}>
                <Tag color="error" icon={<WarningOutlined />} style={clickable} onClick={onIr}>
                    {texto.tag}
                </Tag>
            </Tooltip>
        );
    }

    return (
        <Tooltip title={`Solo se muestra si «${condition.triggerLabel}» ${condition.isMulti ? 'incluye' : 'es'} ${condition.valueText}. Clic para ir al campo.`}>
            <Tag
                color={colorOfTrigger(condition.triggerName)}
                icon={<ApiOutlined />}
                style={clickable}
                onClick={onIr}
                onMouseEnter={() => onHover?.(condition.triggerName)}
                onMouseLeave={() => onHover?.(null)}
            >
                Si {condition.triggerLabel} = {condition.valueText}
            </Tag>
        </Tooltip>
    );
}

export function DependentsTag({ name, dependents, labelOf, onIr, onHover }) {
    if (dependents.length === 0) return null;

    const items = dependents.map((dep) => ({
        key: dep,
        label: labelOf(dep),
        onClick: () => onIr?.(dep),
    }));

    return (
        <Dropdown menu={{ items }} trigger={['click']}>
            <Tooltip title={`${dependents.length} campo${dependents.length === 1 ? '' : 's'} de este paso aparecen según lo que se responda aquí. Clic para verlos.`}>
                <Tag
                    color={colorOfTrigger(name)}
                    icon={<BranchesOutlined />}
                    style={clickable}
                    onMouseEnter={() => onHover?.(name)}
                    onMouseLeave={() => onHover?.(null)}
                >
                    Activa {dependents.length}
                </Tag>
            </Tooltip>
        </Dropdown>
    );
}
