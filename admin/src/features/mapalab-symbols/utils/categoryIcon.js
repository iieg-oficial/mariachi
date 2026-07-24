export const isIconUrl = (icon) => (
    typeof icon === 'string' && /^(https?:\/\/|\/)/.test(icon.trim())
);
