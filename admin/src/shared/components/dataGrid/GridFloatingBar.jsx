import { Badge } from 'antd';
import { SaveOutlined, UndoOutlined } from '@ant-design/icons';
import GridIconButton from '@shared/components/dataGrid/GridIconButton';

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
    dirtyCount,
    saving,
    onSave,
    onUndo,
    canUndo,
    search,
    children,
}) {
    return (
        <div className="mariachi-topbar" style={BARRA} role="toolbar" aria-label="Acciones de la tabla">
            <Badge count={dirtyCount} size="small" offset={[-4, 4]}>
                <GridIconButton
                    type="primary"
                    icon={<SaveOutlined />}
                    label={dirtyCount ? `Guardar ${dirtyCount}` : 'Sin cambios'}
                    loading={saving}
                    disabled={!dirtyCount}
                    onClick={onSave}
                />
            </Badge>
            <GridIconButton
                type="text"
                icon={<UndoOutlined />}
                label="Deshacer"
                onClick={onUndo}
                disabled={!canUndo}
                title="Ctrl+Z"
            />
            {search}
            {children}
        </div>
    );
}
