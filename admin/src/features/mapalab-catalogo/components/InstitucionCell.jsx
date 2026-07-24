import { useEffect, useRef, useState } from 'react';
import { Select, Tag, Typography } from 'antd';

const { Text } = Typography;

const InstitucionCell = ({ capa, instituciones = [], onSave }) => {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(capa.institucionId ?? null);
    const [saving, setSaving] = useState(false);
    const selectRef = useRef(null);

    useEffect(() => {
        setValue(capa.institucionId ?? null);
    }, [capa.institucionId]);

    useEffect(() => {
        if (editing) selectRef.current?.focus();
    }, [editing]);

    const commit = async (next) => {
        setEditing(false);
        const target = next === undefined ? value : next;
        if ((target ?? null) === (capa.institucionId ?? null)) return;
        setSaving(true);
        try {
            await onSave(capa.id, target ?? null);
        } catch {
            setValue(capa.institucionId ?? null);
        } finally {
            setSaving(false);
        }
    };

    if (editing) {
        return (
            <Select
                ref={selectRef}
                size="small"
                allowClear
                defaultOpen
                showSearch
                optionFilterProp="label"
                style={{ width: '100%', minWidth: 180 }}
                value={value}
                onChange={(next) => { setValue(next ?? null); commit(next ?? null); }}
                onBlur={() => setEditing(false)}
                options={instituciones.map((i) => ({ value: i.id, label: i.nombre }))}
                placeholder="Sin institución"
                onClick={(e) => e.stopPropagation()}
            />
        );
    }

    const institucion = instituciones.find((i) => i.id === capa.institucionId);

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setEditing(true); } }}
            title="Clic para cambiar la institución"
            style={{ cursor: 'pointer', minHeight: 24, minWidth: 140, opacity: saving ? 0.5 : 1 }}
        >
            {institucion
                ? <Tag color="blue">{institucion.nombre}</Tag>
                : <Text type="secondary">+ institución</Text>}
        </div>
    );
};

export default InstitucionCell;
