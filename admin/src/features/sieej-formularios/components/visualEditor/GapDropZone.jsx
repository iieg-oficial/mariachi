import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Button, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

export default function GapDropZone({ id, gap, activo, clickable = false, onAddInGap }) {
    const { setNodeRef, isOver } = useDroppable({ id, disabled: !activo });
    const [destacado, setDestacado] = useState(false);

    const invitaClic = clickable && !activo && !!onAddInGap;

    return (
        <div
            ref={setNodeRef}
            onMouseEnter={() => setDestacado(true)}
            onMouseLeave={() => setDestacado(false)}
            onFocus={() => setDestacado(true)}
            onBlur={() => setDestacado(false)}
            style={{
                gridColumn: `${gap.col} / span ${gap.units}`,
                padding: 4,
                boxSizing: 'border-box',
                minHeight: activo ? 56 : (invitaClic ? 48 : 0),
                transition: 'min-height 120ms ease',
            }}
        >
            {activo && (
                <div style={{
                    height: '100%',
                    minHeight: 48,
                    borderRadius: 8,
                    border: `1px dashed ${isOver ? '#5C2472' : '#d9d9d9'}`,
                    background: isOver ? '#F6F0F9' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    color: isOver ? '#5C2472' : '#bbb',
                    textAlign: 'center',
                    padding: 4,
                }}>
                    {isOver ? 'Soltar aquí' : 'Espacio libre'}
                </div>
            )}
            {invitaClic && (
                <Tooltip title="Agregar un campo en este espacio">
                    <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={onAddInGap}
                        aria-label="Agregar un campo en este espacio libre"
                        style={{
                            width: '100%',
                            height: '100%',
                            minHeight: 40,
                            borderRadius: 8,
                            color: destacado ? '#5C2472' : '#bbb',
                            borderColor: destacado ? '#5C2472' : '#e5e5e5',
                            background: destacado ? '#F6F0F9' : 'transparent',
                            opacity: destacado ? 1 : 0.35,
                            transition: 'opacity 120ms ease, color 120ms ease, border-color 120ms ease',
                        }}
                    />
                </Tooltip>
            )}
        </div>
    );
}
