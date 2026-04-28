import { Typography } from 'antd';

const { Text } = Typography;


function renderInline(text, keyPrefix) {
    const out = [];
    let i = 0;
    let chunk = '';
    let idx = 0;

    const flushChunk = () => {
        if (chunk) {
            out.push(chunk);
            chunk = '';
        }
    };

    while (i < text.length) {
        if (text.startsWith('**', i)) {
            const end = text.indexOf('**', i + 2);
            if (end !== -1) {
                flushChunk();
                out.push(<strong key={`${keyPrefix}-b-${idx++}`}>{text.slice(i + 2, end)}</strong>);
                i = end + 2;
                continue;
            }
        }
        if (text[i] === '`') {
            const end = text.indexOf('`', i + 1);
            if (end !== -1) {
                flushChunk();
                out.push(
                    <code
                        key={`${keyPrefix}-c-${idx++}`}
                        style={{
                            background: '#f5f5f5',
                            padding: '1px 5px',
                            borderRadius: 3,
                            fontSize: '0.9em',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        }}
                    >
                        {text.slice(i + 1, end)}
                    </code>
                );
                i = end + 1;
                continue;
            }
        }
        chunk += text[i];
        i += 1;
    }
    flushChunk();
    return out;
}


export default function Markdown({ text }) {
    if (!text) return null;
    const lines = text.split('\n');
    const blocks = [];
    let currentList = null;

    lines.forEach((rawLine) => {
        const line = rawLine.trimEnd();
        const bullet = line.match(/^-\s+(.+)$/);
        if (bullet) {
            if (!currentList) {
                currentList = [];
                blocks.push({ type: 'list', items: currentList });
            }
            currentList.push(bullet[1]);
            return;
        }
        currentList = null;
        if (line.trim()) {
            blocks.push({ type: 'p', text: line });
        }
    });

    return (
        <div style={{ fontSize: 13 }}>
            {blocks.map((block, blockIdx) => {
                if (block.type === 'list') {
                    return (
                        <ul key={`l-${blockIdx}`} style={{ marginTop: 4, marginBottom: 8, paddingLeft: 20 }}>
                            {block.items.map((item, i) => (
                                <li key={`i-${blockIdx}-${i}`} style={{ marginBottom: 4 }}>
                                    {renderInline(item, `b${blockIdx}i${i}`)}
                                </li>
                            ))}
                        </ul>
                    );
                }
                return (
                    <Text key={`p-${blockIdx}`} type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                        {renderInline(block.text, `b${blockIdx}p`)}
                    </Text>
                );
            })}
        </div>
    );
}
