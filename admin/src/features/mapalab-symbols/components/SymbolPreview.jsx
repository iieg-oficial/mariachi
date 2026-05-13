import { useMemo } from 'react';


export default function SymbolPreview({ symbol, size = 32 }) {
    const innerHtml = useMemo(() => {
        if (symbol?.kind === 'svg' && symbol.value) {
            return { __html: symbol.value };
        }
        return null;
    }, [symbol]);

    if (!symbol) return null;

    if (symbol.kind === 'emoji') {
        return (
            <span
                style={{
                    fontSize: size,
                    lineHeight: 1,
                    fontFamily: '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif',
                    display: 'inline-block',
                }}
                aria-label={symbol.name || symbol.value}
            >
                {symbol.value}
            </span>
        );
    }

    if (symbol.kind === 'svg') {
        return (
            <span
                style={{ display: 'inline-block', width: size, height: size }}
                dangerouslySetInnerHTML={innerHtml}
            />
        );
    }

    if (symbol.kind === 'image') {
        return (
            <img
                src={symbol.imageUrl || symbol.image_url}
                alt={symbol.name || 'símbolo'}
                style={{ width: size, height: size, objectFit: 'contain' }}
            />
        );
    }

    return null;
}
