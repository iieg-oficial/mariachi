import { Button, ColorPicker, Select, Space, Tooltip } from 'antd';
import { DeleteOutlined, EllipsisOutlined } from '@ant-design/icons';
import { COLOR_PROYECTO } from '@features/inicio/constants/roadmapModelo';

const TIPOS = ['mayor', 'lanzamiento', 'joven', 'feature', 'momento', 'muerto', 'legacy', 'porllegar'];

const PROYECTOS = Object.keys(COLOR_PROYECTO).map((v) => ({ value: v, label: v }));

export default function RoadmapBarrita({ item, tipo, posicion, onCambiar, onEliminar, onMas }) {
    if (!item || !posicion) return null;

    const detener = (accion) => (evento) => {
        evento.stopPropagation();
        accion();
    };

    return (
        <div
            style={{
                position: 'absolute',
                left: posicion.x,
                top: posicion.y,
                zIndex: 6,
                background: '#fff',
                border: '1px solid rgba(5,5,5,0.1)',
                borderRadius: 8,
                boxShadow: '0 6px 18px -6px rgba(25,19,32,0.4)',
                padding: 5,
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="toolbar"
            tabIndex={-1}
            aria-label={`Acciones de ${item.txt || item.nombre}`}
        >
            <Space size={4}>
                {tipo === 'ciclos' ? (
                    <ColorPicker
                        size="small"
                        value={item.color}
                        onChangeComplete={(color) => onCambiar({ color: color.toHexString() })}
                    />
                ) : (
                    <Select
                        size="small"
                        value={item.proy}
                        options={PROYECTOS}
                        style={{ width: 128 }}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(proy) => onCambiar({ proy })}
                    />
                )}

                {tipo === 'hitos' && (
                    <>
                        <Select
                            size="small"
                            value={item.tipo}
                            options={TIPOS.map((v) => ({ value: v, label: v }))}
                            style={{ width: 112 }}
                            onChange={(valor) => onCambiar({ tipo: valor })}
                        />
                        <Tooltip title="Marcar como en desarrollo">
                            <Button
                                size="small"
                                type={item.beta ? 'primary' : 'default'}
                                onClick={detener(() => onCambiar({ beta: !item.beta }))}
                            >
                                Beta
                            </Button>
                        </Tooltip>
                    </>
                )}

                <Tooltip title="Todos los campos">
                    <Button size="small" icon={<EllipsisOutlined />} aria-label="Abrir todos los campos" onClick={detener(onMas)} />
                </Tooltip>
                <Tooltip title="Eliminar">
                    <Button size="small" danger icon={<DeleteOutlined />} aria-label="Eliminar" onClick={detener(onEliminar)} />
                </Tooltip>
            </Space>
        </div>
    );
}
