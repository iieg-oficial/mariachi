import { BRAND } from '@app/providers/brand';

const VARIANTS = {
    beta: { label: 'BETA', color: BRAND.orange, bg: '#FFF2E5' },
    test: { label: 'TEST', color: BRAND.orange, bg: '#FFF2E5' },
    dev: { label: 'DEV', color: BRAND.purple, bg: '#F4EFF9' },
    info: { label: 'INFO', color: BRAND.numeralia, bg: '#EAF0FA' },
    new: { label: 'NUEVO', color: '#FF577D', bg: '#FFEBF1' },
};

const POSITION_STYLES = {
    'top-right': { position: 'absolute', top: 4, right: 4 },
    'top-left': { position: 'absolute', top: 4, left: 4 },
    'bottom-right': { position: 'absolute', bottom: 4, right: 4 },
    'bottom-left': { position: 'absolute', bottom: 4, left: 4 },
};

export default function StatusBadge({
    variant = 'beta',
    text,
    color,
    bg,
    size = 'md',
    position,
    offset = 4,
    style,
    className,
}) {
    const preset = VARIANTS[variant] || VARIANTS.beta;
    const finalColor = color || preset.color;
    const finalBg = bg || preset.bg;
    const finalText = text || preset.label;

    const sizeStyles = size === 'sm'
        ? { padding: '1px 6px', fontSize: 9, lineHeight: '14px' }
        : { padding: '2px 8px', fontSize: 10, lineHeight: '16px' };

    let positionStyles = null;
    if (position) {
        const base = POSITION_STYLES[position];
        if (base) {
            positionStyles = {
                ...base,
                ...(base.top !== undefined ? { top: offset } : {}),
                ...(base.bottom !== undefined ? { bottom: offset } : {}),
                ...(base.left !== undefined ? { left: offset } : {}),
                ...(base.right !== undefined ? { right: offset } : {}),
                zIndex: 1,
                pointerEvents: 'none',
            };
        }
    }

    return (
        <span
            className={className}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: 999,
                background: finalBg,
                color: finalColor,
                fontWeight: 700,
                letterSpacing: 0.3,
                textTransform: 'uppercase',
                userSelect: 'none',
                ...sizeStyles,
                ...positionStyles,
                ...style,
            }}
        >
            {finalText}
        </span>
    );
}
