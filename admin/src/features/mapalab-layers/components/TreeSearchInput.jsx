import { useRef, useState } from 'react';
import { Input, Tooltip } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

export default function TreeSearchInput({ value, onChange, width = 210 }) {
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const inputRef = useRef(null);

    const abierto = hovered || focused || Boolean(value);

    return (
        <Tooltip title={abierto ? '' : 'Buscar capa'}>
            <span
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{ display: 'inline-block' }}
            >
                <Input
                    ref={inputRef}
                    size="small"
                    placeholder="Buscar capa"
                    prefix={<SearchOutlined onClick={() => inputRef.current?.focus()} />}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    allowClear={abierto}
                    aria-label="Buscar capa"
                    style={{
                        width: abierto ? width : 30,
                        transition: 'width .18s ease',
                        cursor: abierto ? 'text' : 'pointer',
                    }}
                    styles={{ input: { opacity: abierto ? 1 : 0, transition: 'opacity .12s ease' } }}
                />
            </span>
        </Tooltip>
    );
}
