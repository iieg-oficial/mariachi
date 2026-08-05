import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Dropdown, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

export default function GridSearchDropdown({
    value = '',
    onChange,
    placeholder = 'Buscar',
    label = 'Buscar',
    width = 280,
    open,
    onOpenChange,
}) {
    const inputRef = useRef(null);
    const [draft, setDraft] = useState(value);

    useEffect(() => {
        if (!open) return undefined;
        const timer = setTimeout(() => inputRef.current?.focus({ cursor: 'all' }), 0);
        return () => clearTimeout(timer);
    }, [open]);

    const handleChange = useCallback((event) => {
        const next = event.target.value;
        setDraft(next);
        onChange?.(next);
    }, [onChange]);

    const handleKeyDown = useCallback((event) => {
        if (event.key === 'Escape' || event.key === 'Enter') {
            event.preventDefault();
            onOpenChange?.(false);
        }
    }, [onOpenChange]);

    return (
        <Dropdown
            placement="bottomRight"
            trigger={['click']}
            menu={{ items: [] }}
            open={open}
            onOpenChange={onOpenChange}
            destroyOnHidden
            popupRender={() => (
                <div
                    style={{
                        padding: 8,
                        background: '#fff',
                        borderRadius: 8,
                        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)',
                    }}
                >
                    <Input
                        ref={inputRef}
                        allowClear
                        placeholder={placeholder}
                        value={draft}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        style={{ width }}
                    />
                </div>
            )}
        >
            <Button
                size="small"
                type={draft ? 'default' : 'text'}
                icon={<SearchOutlined />}
                title={label}
            >
                {draft ? 'Buscando' : label}
            </Button>
        </Dropdown>
    );
}
