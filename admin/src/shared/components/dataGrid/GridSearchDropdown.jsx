import { useCallback, useRef, useState } from 'react';
import { Button, Dropdown, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

export default function GridSearchDropdown({
    value = '',
    onChange,
    placeholder = 'Buscar',
    label = 'Buscar',
    width = 280,
}) {
    const inputRef = useRef(null);
    const [draft, setDraft] = useState(value);

    const handleOpenChange = useCallback((open) => {
        if (open) setTimeout(() => inputRef.current?.focus(), 0);
    }, []);

    const handleChange = useCallback((event) => {
        const next = event.target.value;
        setDraft(next);
        onChange?.(next);
    }, [onChange]);

    return (
        <Dropdown
            placement="bottomRight"
            trigger={['click']}
            menu={{ items: [] }}
            onOpenChange={handleOpenChange}
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
