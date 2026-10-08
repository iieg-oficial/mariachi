export const BADGE_PRESETS = {
    new: { label: 'Nueva', color: '#1F9D55', detalle: 'Esta capa se publicó recientemente' },
    updated: { label: 'Actualizada', color: '#2563EB', detalle: 'Esta capa recibió una actualización' },
    soon: { label: 'Próximamente', color: '#FF8300', detalle: 'Esta capa está por publicarse' },
};

export const VARIANT_OPTIONS = [
    { value: 'new', label: 'Nueva' },
    { value: 'updated', label: 'Actualizada' },
    { value: 'soon', label: 'Próximamente' },
    { value: 'custom', label: 'Personalizado' },
];

export const softBg = (hex) => (/^#[0-9a-fA-F]{6}$/.test(hex || '') ? `${hex}1A` : 'transparent');

export const resolveBadge = (badge) => {
    if (!badge) return null;
    const preset = BADGE_PRESETS[badge.variant];
    const color = badge.variant === 'custom' ? badge.color : preset?.color;
    const label = badge.label || preset?.label;
    if (!color || !label) return null;
    return {
        label,
        inicial: label.trim().charAt(0).toUpperCase(),
        detalle: preset?.detalle || null,
        desde: badge.validFrom || null,
        hasta: badge.validUntil || null,
        color,
        bg: softBg(color),
    };
};

export const isBadgeInValidityWindow = (badge, now = new Date()) => {
    if (!badge) return false;
    const { validFrom, validUntil } = badge;
    const hoy = now.toISOString().slice(0, 10);
    if (validFrom && hoy < validFrom) return false;
    if (validUntil && hoy > validUntil) return false;
    return true;
};
