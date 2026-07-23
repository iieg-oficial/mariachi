import { useEffect, useRef, useState } from 'react';
import { Select, Spin, Tag, Typography } from 'antd';

const { Text } = Typography;

const TagsCell = ({ capa, tagOptions = [], onSave }) => {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(capa.searchTags || []);
    const [saving, setSaving] = useState(false);
    const selectRef = useRef(null);

    useEffect(() => {
        setValue(capa.searchTags || []);
    }, [capa.searchTags]);

    useEffect(() => {
        if (editing) selectRef.current?.focus();
    }, [editing]);

    const commit = async () => {
        setEditing(false);
        const current = capa.searchTags || [];
        const unchanged = current.length === value.length && current.every((t) => value.includes(t));
        if (unchanged) return;
        setSaving(true);
        try {
            await onSave(capa.id, value);
        } catch {
            setValue(current);
        } finally {
            setSaving(false);
        }
    };

    if (editing) {
        return (
            <Select
                ref={selectRef}
                mode="tags"
                size="small"
                defaultOpen
                style={{ width: '100%', minWidth: 220 }}
                value={value}
                onChange={setValue}
                onBlur={commit}
                options={tagOptions.map((t) => ({ value: t, label: t }))}
                placeholder="Escribe y Enter"
                onClick={(e) => e.stopPropagation()}
            />
        );
    }

    const tags = capa.searchTags || [];

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setEditing(true); } }}
            title="Clic para editar etiquetas"
            style={{ cursor: 'pointer', minHeight: 24, minWidth: 160 }}
        >
            {saving && <Spin size="small" style={{ marginRight: 6 }} />}
            {tags.length
                ? tags.map((t) => <Tag key={t}>{t}</Tag>)
                : <Text type="secondary">+ etiquetas</Text>}
        </div>
    );
};

export default TagsCell;
