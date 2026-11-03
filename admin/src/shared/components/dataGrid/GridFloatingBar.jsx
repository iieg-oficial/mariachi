import { Badge, Button, Tooltip } from 'antd';
import { SaveOutlined, UndoOutlined } from '@ant-design/icons';
import GridBarSeparator from '@shared/components/dataGrid/GridBarSeparator';
import GridSearchDropdown from '@shared/components/dataGrid/GridSearchDropdown';

const BARRA = {
    position: 'absolute',
    left: '50%',
    bottom: 16,
    transform: 'translateX(-50%)',
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: 6,
    borderRadius: 28,
    background: '#001529',
    color: '#fff',
    boxShadow: '0 8px 28px rgba(0, 21, 41, 0.35)',
    width: 'max-content',
    maxWidth: 'calc(100% - 24px)',
    flexWrap: 'wrap',
    justifyContent: 'center',
};

export default function GridFloatingBar({
    iconOnly,
    dirtyCount,
    saving,
    onSave,
    onUndo,
    canUndo,
    search,
    onSearchChange,
    searchPlaceholder,
    searchOpen,
    onSearchOpenChange,
    children,
}) {
    const guardarTexto = dirtyCount ? `Guardar ${dirtyCount}` : 'Sin cambios';

    return (
        <div className="mariachi-topbar" style={BARRA} role="toolbar" aria-label="Acciones de la tabla">
            {iconOnly ? (
                <Tooltip title={guardarTexto}>
                    <Badge count={dirtyCount} size="small" offset={[-4, 4]}>
                        <Button
                            shape="circle"
                            type="primary"
                            icon={<SaveOutlined />}
                            loading={saving}
                            disabled={!dirtyCount}
                            onClick={onSave}
                            aria-label={guardarTexto}
                        />
                    </Badge>
                </Tooltip>
            ) : (
                <Button
                    shape="round"
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={saving}
                    disabled={!dirtyCount}
                    onClick={onSave}
                >
                    {guardarTexto}
                </Button>
            )}
            <Tooltip title="Deshacer (Ctrl+Z)">
                <Button
                    shape="circle"
                    type="text"
                    icon={<UndoOutlined />}
                    onClick={onUndo}
                    disabled={!canUndo}
                    aria-label="Deshacer"
                />
            </Tooltip>
            <GridSearchDropdown
                value={search}
                onChange={onSearchChange}
                placeholder={searchPlaceholder}
                open={searchOpen}
                onOpenChange={onSearchOpenChange}
                placement="top"
                iconOnly={iconOnly}
            />
            {children ? <GridBarSeparator /> : null}
            {children}
        </div>
    );
}
