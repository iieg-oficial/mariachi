import { useState } from 'react';
import { Switch } from 'antd';

const EnabledCell = ({ capa, onSave }) => {
    const [saving, setSaving] = useState(false);

    const handleChange = async (checked) => {
        setSaving(true);
        try {
            await onSave(capa.id, checked);
        } catch {
            /* el padre revierte el estado y avisa */
        } finally {
            setSaving(false);
        }
    };

    return (
        <Switch
            size="small"
            checked={!!capa.enabled}
            loading={saving}
            onChange={handleChange}
            onClick={(_, e) => e.stopPropagation()}
            checkedChildren="Sí"
            unCheckedChildren="No"
        />
    );
};

export default EnabledCell;
