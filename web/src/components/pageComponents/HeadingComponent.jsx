const HEADING_SIZES = {
    1: 'text-4xl',
    2: 'text-3xl',
    3: 'text-2xl',
    4: 'text-xl',
    5: 'text-lg',
    6: 'text-base'
};

export default function HeadingComponent({ content, level = 2, color }) {
    const Tag = `h${level}`;
    return (
        <Tag
            className={`${HEADING_SIZES[level] || 'text-3xl'} font-bold`}
            style={{ color: color || '#000000', margin: 0 }}
        >
            {content}
        </Tag>
    );
}
