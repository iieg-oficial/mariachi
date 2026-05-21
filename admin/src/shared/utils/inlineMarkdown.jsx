const TOKEN_PATTERN = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(\*\*([^*]+)\*\*)|(~~([^~]+)~~)|(\*([^*]+)\*)/g;

export function renderInlineMarkdown(text) {
    if (!text) return null;
    const re = new RegExp(TOKEN_PATTERN.source, 'g');
    const out = [];
    let lastIndex = 0;
    let keyCounter = 0;
    const pushText = (slice) => {
        if (slice) out.push(<span key={`t-${keyCounter++}`}>{slice}</span>);
    };
    let match = re.exec(text);
    while (match) {
        if (match.index > lastIndex) pushText(text.slice(lastIndex, match.index));
        if (match[1]) {
            out.push(
                <a
                    key={`l-${keyCounter++}`}
                    href={match[3]}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'underline' }}
                >
                    {match[2]}
                </a>,
            );
        } else if (match[4]) {
            out.push(<strong key={`b-${keyCounter++}`} style={{ fontWeight: 700 }}>{match[5]}</strong>);
        } else if (match[6]) {
            out.push(<s key={`s-${keyCounter++}`} style={{ textDecoration: 'line-through' }}>{match[7]}</s>);
        } else if (match[8]) {
            out.push(<em key={`i-${keyCounter++}`} style={{ fontStyle: 'italic' }}>{match[9]}</em>);
        }
        lastIndex = match.index + match[0].length;
        match = re.exec(text);
    }
    if (lastIndex < text.length) pushText(text.slice(lastIndex));
    return out;
}
