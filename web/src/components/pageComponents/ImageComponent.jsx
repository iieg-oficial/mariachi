export default function ImageComponent({ src, alt, width, height }) {
    if (!src) return null;

    return (
        <img
            src={src}
            alt={alt || 'Imagen'}
            style={{
                width: width || '100%',
                height: height || 'auto',
                objectFit: 'cover',
                borderRadius: 4
            }}
        />
    );
}
