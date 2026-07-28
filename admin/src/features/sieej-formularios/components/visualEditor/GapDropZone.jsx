import { useDroppable } from '@dnd-kit/core';

export default function GapDropZone({ id, gap, activo }) {
    const { setNodeRef, isOver } = useDroppable({ id, disabled: !activo });

    return (
        <div
            ref={setNodeRef}
            style={{
                gridColumn: `${gap.col} / span ${gap.units}`,
                padding: 4,
                boxSizing: 'border-box',
                minHeight: activo ? 56 : 0,
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
        </div>
    );
}
