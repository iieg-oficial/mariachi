import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Form, Input, Modal, Space, Tooltip } from 'antd';
import { BoldOutlined, ItalicOutlined, LinkOutlined, StrikethroughOutlined } from '@ant-design/icons';
import SymbolInsertButton from '@features/mapalab-symbols/components/SymbolInsertButton';

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

const insertLinkAt = (value, start, end, text, url) => {
    const before = value.slice(0, start);
    const after = value.slice(end);
    const next = `${before}[${text}](${url})${after}`;
    const cursor = before.length + `[${text}](${url})`.length;
    return { next, selectionStart: cursor, selectionEnd: cursor };
};

const insertAt = (value, start, end, text) => {
    const before = value.slice(0, start);
    const after = value.slice(end);
    const next = `${before}${text}${after}`;
    const cursor = before.length + text.length;
    return { next, selectionStart: cursor, selectionEnd: cursor };
};

export default function MarkdownTextArea({
    value = '',
    onChange,
    features = ['bold', 'italic', 'strike', 'link', 'symbol'],
    disabled,
    rows = 3,
    extraActions = null,
    ...textAreaProps
}) {
    const textAreaRef = useRef(null);
    const selectionRef = useRef({ start: 0, end: 0 });
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [linkForm] = Form.useForm();

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

    const insertSymbol = useCallback((symbolValue) => {
        const el = textAreaRef.current?.resizableTextArea?.textArea;
        if (!el || !symbolValue) return;
        const start = el.selectionStart ?? value.length;
        const end = el.selectionEnd ?? value.length;
        const { next, selectionStart, selectionEnd } = insertAt(value, start, end, symbolValue);
        onChange?.(next);
        focusTextArea(selectionStart, selectionEnd);
    }, [value, onChange, focusTextArea]);

    const openLinkModal = useCallback(() => {
        const el = textAreaRef.current?.resizableTextArea?.textArea;
        const start = el?.selectionStart ?? value.length;
        const end = el?.selectionEnd ?? value.length;
        selectionRef.current = { start, end };
        linkForm.setFieldsValue({ text: value.slice(start, end) || '', url: '' });
        setLinkModalOpen(true);
    }, [value, linkForm]);

    const handleLinkOk = async () => {
        try {
            const { text, url } = await linkForm.validateFields();
            const { start, end } = selectionRef.current;
            const finalText = (text || '').trim() || url;
            const { next, selectionStart, selectionEnd } = insertLinkAt(value, start, end, finalText, url.trim());
            onChange?.(next);
            setLinkModalOpen(false);
            focusTextArea(selectionStart, selectionEnd);
        } catch {
            // validation error: form ya muestra el mensaje
        }
    };

    useEffect(() => {
        if (!linkModalOpen) linkForm.resetFields();
    }, [linkModalOpen, linkForm]);

    const onKeyDown = (e) => {
        if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
        const key = e.key.toLowerCase();
        if (key === 'b' && features.includes('bold')) {
            e.preventDefault();
            applyWrapper(WRAPPERS.bold);
        } else if (key === 'i' && features.includes('italic')) {
            e.preventDefault();
            applyWrapper(WRAPPERS.italic);
        } else if (key === 'k' && features.includes('link')) {
            e.preventDefault();
            openLinkModal();
        }
    };

    return (
        <Space orientation="vertical" size={4} style={{ width: '100%' }}>
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
                    <Tooltip title="Enlace (Ctrl/Cmd+K)">
                        <Button
                            size="small"
                            icon={<LinkOutlined />}
                            disabled={disabled}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={openLinkModal}
                            aria-label="Enlace"
                        />
                    </Tooltip>
                )}
                {features.includes('symbol') && (
                    <SymbolInsertButton
                        disabled={disabled}
                        onInsert={insertSymbol}
                        onMouseDown={(e) => e.preventDefault()}
                    />
                )}
                {extraActions && (
                    <>
                        <span style={{ width: 1, height: 18, background: '#d9d9d9', margin: '0 4px', display: 'inline-block' }} aria-hidden="true" />
                        {extraActions}
                    </>
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
            <Modal
                open={linkModalOpen}
                title="Insertar enlace"
                onCancel={() => setLinkModalOpen(false)}
                onOk={handleLinkOk}
                okText="Insertar"
                cancelText="Cancelar"
                destroyOnClose
            >
                <Form form={linkForm} layout="vertical" preserve={false}>
                    <Form.Item
                        label="Texto visible"
                        name="text"
                        extra="Lo que el usuario verá; si lo dejas vacío se usará la URL."
                    >
                        <Input placeholder="p. ej. Más información" />
                    </Form.Item>
                    <Form.Item
                        label="URL"
                        name="url"
                        rules={[
                            { required: true, message: 'La URL es obligatoria.' },
                            { pattern: /^https?:\/\/.+/i, message: 'Debe empezar con http:// o https://' },
                        ]}
                    >
                        <Input placeholder="https://" type="url" />
                    </Form.Item>
                </Form>
            </Modal>
        </Space>
    );
}
