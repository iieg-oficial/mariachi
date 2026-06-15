import { useState } from 'react';
import { Form, Select } from 'antd';

export default function DependenciaSelect({ form, grupos }) {
    const grupoId = Form.useWatch('sieej_grupo_id', form);
    const grupoNombre = Form.useWatch('sieej_grupo_nombre', form);
    const [search, setSearch] = useState('');

    const trimmed = search.trim();
    const existsByName = (name) => grupos.some((g) => g.nombre.toLowerCase() === name.toLowerCase());

    const options = grupos.map((g) => ({ value: g.id, label: g.nombre }));
    if (grupoNombre && !existsByName(grupoNombre)) {
        options.unshift({ value: `new:${grupoNombre}`, label: `${grupoNombre} (nueva)` });
    }
    if (trimmed && !existsByName(trimmed) && trimmed !== grupoNombre) {
        options.unshift({ value: `new:${trimmed}`, label: `Crear "${trimmed}"` });
    }

    const value = grupoId ?? (grupoNombre ? `new:${grupoNombre}` : undefined);

    const handleChange = (val) => {
        if (typeof val === 'string' && val.startsWith('new:')) {
            form.setFieldsValue({ sieej_grupo_id: undefined, sieej_grupo_nombre: val.slice(4) });
        } else {
            form.setFieldsValue({ sieej_grupo_id: val ?? undefined, sieej_grupo_nombre: undefined });
        }
        setSearch('');
    };

    return (
        <Select
            showSearch
            allowClear
            value={value}
            placeholder="Buscar o crear dependencia…"
            searchValue={search}
            onSearch={setSearch}
            onChange={handleChange}
            onClear={() => form.setFieldsValue({ sieej_grupo_id: undefined, sieej_grupo_nombre: undefined })}
            filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            options={options}
            style={{ width: '100%' }}
        />
    );
}
