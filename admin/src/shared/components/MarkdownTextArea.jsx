import { useCallback, useRef } from 'react';
import { Button, Input, Space, Tooltip } from 'antd';
import { BoldOutlined, ItalicOutlined, LinkOutlined, StrikethroughOutlined } from '@ant-design/icons';

const WRAPPERS = {
    bold: { open: '**', close: '**', placeholder: 'texto en negrita', label: 'Negrita', icon: <BoldOutlined />, shortcut: 'Ctrl/Cmd+B' },
    italic: { open: '*', close: '*', placeholder: 'texto en cursiva', label: 'Cursiva', icon: <ItalicOutlined />, shortcut: 'Ctrl/Cmd+I' },
    strike: { open: '~~', close: '~~', placeholder: 'texto tachado', label: 'Tachado', icon: <StrikethroughOutlined /> },
};

const wrapSelection = (value, start, end, { open, close, placeholder }) => {
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);
    const inner = selected || placeholder;
    const next = `${before}${open}${inner}${close}${after}`;
    const innerStart = start + open.length;
    return { next, selectionStart: innerStart, selectionEnd: innerStart + inner.length };
};

const insertLink = (value, start, end) => {
    const selected = value.slice(start, end);
    const text = selected || 'texto';
    const before = value.slice(0, start);
    const after = value.slice(end);
    const next = `${before}[${text}](https://)${after}`;
    const urlStart = start + text.length + 3;
    const urlEnd = urlStart + 'https://'.length;
    return { next, selectionStart: urlStart, selectionEnd: urlEnd };
};

export default function MarkdownTextArea({
    value = '',
    onChange,
    features = ['bold', 'italic', 'strike', 'link'],
    disabled,
    rows = 3,
    ...textAreaProps
}) {
    const textAreaRef = useRef(null);

    const focusTextArea = useCallback((selectionStart, selectionEnd) => {
        const inst = textAreaRef.current;
        const el = inst?.resizableTextArea?.textArea;
        if (!el) return;
        requestAnimationFrame(() => {
            el.focus();
            el.setSelectionRange(selectionStart, selectionEnd);
        });
    }, []);

    const applyWrapper = useCallback((wrapper) => {
        const el = textAreaRef.current?.resizableTextArea?.textArea;
        if (!el) return;
        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? 0;
        const { next, selectionStart, selectionEnd } = wrapSelection(value, start, end, wrapper);
        onChange?.(next);
        focusTextArea(selectionStart, selectionEnd);
    }, [value, onChange, focusTextArea]);

    const applyLink = useCallback(() => {
        const el = textAreaRef.current?.resizableTextArea?.textArea;
        if (!el) return;
        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? 0;
        const { next, selectionStart, selectionEnd } = insertLink(value, start, end);
        onChange?.(next);
        focusTextArea(selectionStart, selectionEnd);
    }, [value, onChange, focusTextArea]);

    const onKeyDown = (e) => {
        if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
        const key = e.key.toLowerCase();
        if (key === 'b' && features.includes('bold')) {
            e.preventDefault();
            applyWrapper(WRAPPERS.bold);
        } else if (key === 'i' && features.includes('italic')) {
            e.preventDefault();
            applyWrapper(WRAPPERS.italic);
        }
    };

    return (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Space size={4} wrap>
                {features.filter((f) => WRAPPERS[f]).map((f) => {
                    const w = WRAPPERS[f];
                    const title = w.shortcut ? `${w.label} (${w.shortcut})` : w.label;
                    return (
                        <Tooltip key={f} title={title}>
                            <Button
                                size="small"
                                icon={w.icon}
                                disabled={disabled}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => applyWrapper(w)}
                                aria-label={w.label}
                            />
                        </Tooltip>
                    );
                })}
                {features.includes('link') && (
                    <Tooltip title="Enlace">
                        <Button
                            size="small"
                            icon={<LinkOutlined />}
                            disabled={disabled}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={applyLink}
                            aria-label="Enlace"
                        />
                    </Tooltip>
                )}
            </Space>
            <Input.TextArea
                ref={textAreaRef}
                rows={rows}
                disabled={disabled}
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                onKeyDown={onKeyDown}
                {...textAreaProps}
            />
        </Space>
    );
}
