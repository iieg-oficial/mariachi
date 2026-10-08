import { Button, Popconfirm, Tooltip } from 'antd';

const CORNERS = {
    topLeft: { top: 4, left: 4 },
    topRight: { top: 4, right: 4 },
    bottomLeft: { bottom: 4, left: 4 },
    bottomRight: { bottom: 4, right: 4 },
};

export default function CardCornerAction({
    corner,
    visible = true,
    title,
    icon,
    danger = false,
    loading = false,
    confirm,
    onClick,
}) {
    const boton = (
        <Button
            size="small"
            danger={danger}
            loading={loading}
            icon={icon}
            aria-label={title}
            onClick={(e) => {
                e.stopPropagation();
                if (!confirm) onClick?.();
            }}
            style={{
                position: 'absolute',
                ...CORNERS[corner],
                zIndex: 2,
                background: 'rgba(255, 255, 255, 0.85)',
                opacity: visible ? 1 : 0,
                pointerEvents: visible ? 'auto' : 'none',
                transition: 'opacity 0.15s',
            }}
        />
    );

    if (!confirm) return <Tooltip title={title}>{boton}</Tooltip>;

    return (
        <Popconfirm
            title={confirm.title}
            description={confirm.description}
            okText="Eliminar"
            okButtonProps={{ danger: true }}
            cancelText="Cancelar"
            onConfirm={onClick}
        >
            <Tooltip title={title}>{boton}</Tooltip>
        </Popconfirm>
    );
}
