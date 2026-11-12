import { Button, Popconfirm, Tooltip } from 'antd';

export default function IconAction({ title, icon, onClick, confirm, danger, loading, active, disabled }) {
    const button = (
        <Button
            shape="circle"
            type={active ? 'primary' : 'default'}
            danger={danger}
            icon={icon}
            loading={loading}
            disabled={disabled}
            aria-label={title}
            aria-pressed={active}
            onClick={confirm ? undefined : onClick}
        />
    );
    const withTooltip = <Tooltip title={title}>{button}</Tooltip>;
    if (!confirm) return withTooltip;
    return (
        <Popconfirm title={confirm} onConfirm={onClick} okButtonProps={{ danger }}>
            <span>{withTooltip}</span>
        </Popconfirm>
    );
}
