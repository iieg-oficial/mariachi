import { Button, Collapse, Space, Tag, Typography } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { toPublicUrl, thumbVariant } from '@features/acervo/api/acervoService';
import { message } from '@shared/services/message';

const { Text, Paragraph } = Typography;

const CODE_BLOCK_STYLE = {
    background: '#1f1f1f',
    color: '#f5f5f5',
    padding: '12px 14px',
    borderRadius: 6,
    fontSize: 11,
    lineHeight: 1.5,
    overflow: 'auto',
    margin: 0,
};

function CodeBlock({ code, lang }) {
    return (
        <div>
            <pre style={CODE_BLOCK_STYLE}><code>{code}</code></pre>
            <Paragraph style={{ marginTop: 2, marginBottom: 0, fontSize: 11 }} copyable={{ text: code }}>
                <Text type="secondary">Copiar snippet {lang}</Text>
            </Paragraph>
        </div>
    );
}

function buildFileSnippets(file) {
    const alt = file.metadata?.alt || file.originalName || '';
    const directUrl = toPublicUrl(file.url);
    const isSvg = !!file.type?.includes('svg');
    const hasThumb = !!file.thumbnail && /[?&]w=\d+/.test(file.thumbnail);

    const thumb120 = toPublicUrl(thumbVariant(file, 120));
    const thumb400 = toPublicUrl(thumbVariant(file, 400));
    const thumb1280 = toPublicUrl(thumbVariant(file, 1280));
    const imgSrc = hasThumb ? thumb400 : directUrl;

    const snippets = [
        {
            key: 'direct',
            title: 'URL directa (<img>)',
            lang: 'html',
            code: `<img
    src="${directUrl}"
    loading="lazy"
    alt="${alt}"
/>`,
        },
    ];

    if (hasThumb) {
        snippets.push({
            key: 'thumb',
            title: 'Miniatura WebP (<img>, w=400)',
            lang: 'html',
            code: `<img
    src="${thumb400}"
    loading="lazy"
    alt="${alt}"
/>`,
        });
        snippets.push({
            key: 'srcset',
            title: 'Responsiva con srcSet (120 / 400 / 1280)',
            lang: 'html',
            code: `<img
    src="${thumb400}"
    srcSet="${thumb120} 120w,
            ${thumb400} 400w,
            ${thumb1280} 1280w"
    sizes="(max-width: 400px) 120px, (max-width: 800px) 400px, 1280px"
    loading="lazy"
    alt="${alt}"
/>`,
        });
    }

    snippets.push({
        key: 'react',
        title: 'Componente React (JSX)',
        lang: 'jsx',
        code: hasThumb
            ? `export function ImagenAcervo() {
    return (
        <img
            src="${thumb400}"
            srcSet="${thumb120} 120w,
                    ${thumb400} 400w,
                    ${thumb1280} 1280w"
            sizes="(max-width: 400px) 120px, (max-width: 800px) 400px, 1280px"
            loading="lazy"
            alt="${alt}"
        />
    );
}`
            : `export function ImagenAcervo() {
    return (
        <img
            src="${directUrl}"
            loading="lazy"
            alt="${alt}"
        />
    );
}`,
    });

    snippets.push({
        key: 'antd',
        title: hasThumb ? 'Ant Design <Image> con preview (zoom a w=1280)' : 'Ant Design <Image>',
        lang: 'jsx',
        code: hasThumb
            ? `import { Image } from 'antd';

<Image
    src="${thumb400}"
    preview={{ src: '${thumb1280}' }}
    alt="${alt}"
/>`
            : `import { Image } from 'antd';

<Image
    src="${imgSrc}"
    alt="${alt}"
/>`,
    });

    return { snippets, isSvg, hasThumb };
}

export default function FileSnippets({ file }) {
    if (!file) return null;
    const { snippets, isSvg, hasThumb } = buildFileSnippets(file);

    return (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                {hasThumb ? (
                    <><Tag color="blue">público</Tag> Rutas listas para pegar en cualquier frontend del ecosistema. La miniatura WebP se genera al vuelo.</>
                ) : isSvg ? (
                    <><Tag color="blue">público</Tag> Los SVG se sirven tal cual (sin miniatura WebP): usa la URL directa.</>
                ) : (
                    <><Tag>privado</Tag> Sin miniatura pública: la URL es el proxy autenticado (solo staff con sesión activa).</>
                )}
            </Paragraph>
            <Collapse
                size="small"
                defaultActiveKey={snippets[0]?.key}
                items={snippets.map((s) => ({
                    key: s.key,
                    label: <Text strong style={{ fontSize: 12 }}>{s.title}</Text>,
                    extra: (
                        <Button
                            type="text"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard?.writeText(s.code);
                                message.success('Código copiado');
                            }}
                        >
                            Copiar
                        </Button>
                    ),
                    children: <CodeBlock code={s.code} lang={s.lang} />,
                }))}
            />
        </Space>
    );
}
