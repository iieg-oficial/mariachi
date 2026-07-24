import { isIconUrl } from '@features/mapalab-symbols/utils/categoryIcon';

export default function CategoryIcon({ icon, name, size = 18, fallback = '·' }) {
    if (!icon) {
        return <span style={{ fontSize: size, lineHeight: 1 }}>{fallback}</span>;
    }

    if (isIconUrl(icon)) {
        return (
            <img
                src={icon}
                alt={name || 'ícono de categoría'}
                style={{ width: size, height: size, objectFit: 'contain', verticalAlign: 'middle' }}
            />
        );
    }

    return (
        <span
            style={{
                fontSize: size,
                lineHeight: 1,
                fontFamily: '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif',
            }}
        >
            {icon}
        </span>
    );
}
