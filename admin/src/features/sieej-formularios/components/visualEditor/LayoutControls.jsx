import { Form, Segmented, Select, Switch, Tooltip } from 'antd';
import { GRID_COLUMNS, colChoicesFor, unitsOfColSpan } from './fieldLayout';
import { COLSPAN_CHOICES, colSpanHint, positionLabels } from './layoutOptions';

export function WidthGlyph({ colSpan = 1, col = 1, width = 34, height = 10 }) {
    const units = unitsOfColSpan(colSpan);
    return (
        <span
            aria-hidden
            style={{
                display: 'inline-flex',
                width,
                height,
                flexShrink: 0,
                border: '1px solid currentColor',
                borderRadius: 2,
                opacity: 0.7,
                overflow: 'hidden',
                verticalAlign: 'middle',
            }}
        >
            <span style={{
                marginLeft: `${((col - 1) / GRID_COLUMNS) * 100}%`,
                width: `${(units / GRID_COLUMNS) * 100}%`,
                background: 'currentColor',
            }} />
        </span>
    );
}

const withGlyph = (text, glyph) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {glyph}
        {text}
    </span>
);

const widthOptions = (textKey, glyphWidth) => COLSPAN_CHOICES.map((c) => ({
    value: c.value,
    label: withGlyph(c[textKey], <WidthGlyph colSpan={c.value} width={glyphWidth} />),
}));

const positionOptions = (colSpan, glyphWidth) => {
    const cols = colChoicesFor(colSpan);
    const labels = positionLabels(cols.length);
    return cols.map((col, i) => ({
        value: col,
        label: withGlyph(labels[i], <WidthGlyph colSpan={colSpan} col={col} width={glyphWidth} />),
    }));
};

export function ColSpanSegmented({ value, onChange, onPick }) {
    return (
        <Segmented
            block
            value={value}
            options={widthOptions('label', 34)}
            onChange={(next) => {
                onPick?.(next);
                onChange?.(next);
            }}
        />
    );
}

export function ColSegmented({ value, onChange, colSpan }) {
    return (
        <Segmented block value={value} options={positionOptions(colSpan, 34)} onChange={onChange} />
    );
}

export function ColSpanSelect({ value, onChange }) {
    return (
        <Tooltip title="Cuánto ocupa el campo en su línea. También puedes arrastrar el borde derecho de la tarjeta.">
            <Select
                size="small"
                variant="borderless"
                value={value}
                options={widthOptions('short', 22)}
                onChange={onChange}
                onClick={(e) => e.stopPropagation()}
                style={{ minWidth: 120 }}
            />
        </Tooltip>
    );
}

export function ColSelect({ value, colSpan, onChange }) {
    return (
        <Tooltip title="En qué parte de la línea se coloca el campo.">
            <Select
                size="small"
                variant="borderless"
                value={value}
                options={positionOptions(colSpan, 22)}
                onChange={onChange}
                onClick={(e) => e.stopPropagation()}
                style={{ minWidth: 130 }}
            />
        </Tooltip>
    );
}

export function LayoutSection({ colSpan, col, alone, previousLabel, sharesLine, onPickColSpan }) {
    const isFullRow = colSpan === 1;

    let placementHint;
    if (isFullRow) placementHint = 'Ocupa la línea completa, así que siempre empieza una línea nueva.';
    else if (alone) placementHint = 'Tiene su línea para él solo: ningún otro campo se acomoda a su lado, aunque quepa.';
    else if (col === 1) placementHint = 'Empieza una línea nueva, pegado a la izquierda.';
    else if (sharesLine) placementHint = `Se coloca en la misma línea que «${previousLabel}».`;
    else placementHint = 'Empieza una línea nueva y deja libre el espacio a su izquierda.';

    return (
        <Form.Item label="¿Cómo se acomoda el campo?">
            <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Ancho</div>
                <Form.Item name="colSpan" noStyle>
                    <ColSpanSegmented onPick={onPickColSpan} />
                </Form.Item>
                <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>{colSpanHint(colSpan)}</div>
                {!isFullRow && (
                    <>
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #f0f0f0' }}>
                            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
                                Posición en la línea
                            </div>
                            <Form.Item name="col" noStyle>
                                <ColSegmented colSpan={colSpan} />
                            </Form.Item>
                        </div>
                        <div style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: '1px dashed #f0f0f0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}>
                            <Form.Item name="alone" valuePropName="checked" noStyle>
                                <Switch size="small" />
                            </Form.Item>
                            <span>Reservar la línea solo para este campo</span>
                        </div>
                    </>
                )}
                <div style={{ marginTop: 10, fontSize: 12, color: '#888' }}>{placementHint}</div>
            </div>
        </Form.Item>
    );
}

export function ResizeHandle({ handleRef, active, onPointerDown }) {
    return (
        <Tooltip title="Arrastra para cambiar el ancho">
            <span
                ref={handleRef}
                role="separator"
                aria-label="Ajustar ancho del campo"
                onPointerDown={onPointerDown}
                style={{
                    position: 'absolute',
                    top: 0,
                    right: -2,
                    width: 10,
                    height: '100%',
                    cursor: 'col-resize',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    touchAction: 'none',
                }}
            >
                <span style={{
                    width: 3,
                    height: 26,
                    borderRadius: 2,
                    background: active ? '#5C2472' : '#e5e5e5',
                }} />
            </span>
        </Tooltip>
    );
}

export function RowDivider({ index, free, showFree = true }) {
    return (
        <div style={{
            gridColumn: '1 / -1',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 4px 2px',
        }}>
            <span style={{ fontSize: 12, color: '#999', whiteSpace: 'nowrap' }}>Línea {index + 1}</span>
            <div style={{ flex: 1, borderTop: '1px dashed #e5e5e5' }} />
            {free > 0 && showFree && (
                <span style={{ fontSize: 12, color: '#bbb', whiteSpace: 'nowrap' }}>espacio libre</span>
            )}
        </div>
    );
}

export function ColumnGuides() {
    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)`,
            pointerEvents: 'none',
        }}>
            {Array.from({ length: GRID_COLUMNS }, (_, i) => (
                <div key={i} style={{ borderLeft: i === 0 ? 'none' : '1px dashed #d9d9d9' }} />
            ))}
        </div>
    );
}
