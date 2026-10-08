import { Button, Tooltip } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

export default function UserFormFooter({
    editingUser,
    puedeEliminar,
    esPropio,
    onDelete,
    onCancel,
    onSubmit,
}) {
    const mostrarEliminar = Boolean(editingUser) && puedeEliminar;

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <div>
                {mostrarEliminar && (
                    <Tooltip title={esPropio ? 'No puedes eliminar tu propio usuario' : undefined}>
                        <span style={{ display: 'inline-block' }}>
                            <Button
                                danger
                                icon={<DeleteOutlined />}
                                disabled={esPropio}
                                onClick={() => onDelete(editingUser)}
                            >
                                Eliminar usuario
                            </Button>
                        </span>
                    </Tooltip>
                )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={onCancel}>Cancelar</Button>
                <Button type="primary" onClick={onSubmit}>
                    {editingUser ? 'Actualizar' : 'Crear'}
                </Button>
            </div>
        </div>
    );
}
