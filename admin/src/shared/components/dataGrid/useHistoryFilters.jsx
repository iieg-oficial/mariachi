import { useMemo, useState } from 'react';
import { DatePicker, Select } from 'antd';
import SearchWithFilters, { FilterField } from '@shared/components/SearchWithFilters';

const { RangePicker } = DatePicker;

const opcionesDe = (entries, campo, etiqueta) => [...new Set(entries.map((e) => e[campo]).filter(Boolean))]
    .map((valor) => ({ value: valor, label: etiqueta(valor) }))
    .sort((a, b) => String(a.label).localeCompare(String(b.label)));

const dia = (valor) => (valor ? String(valor).slice(0, 10) : '');

export default function useHistoryFilters(entries, { titles, sourceLabel }) {
    const [search, setSearch] = useState('');
    const [campos, setCampos] = useState([]);
    const [origenes, setOrigenes] = useState([]);
    const [personas, setPersonas] = useState([]);
    const [rango, setRango] = useState(null);

    const opciones = useMemo(() => ({
        campos: opcionesDe(entries, 'column_key', (k) => titles[k] || k),
        origenes: opcionesDe(entries, 'source', sourceLabel),
        personas: opcionesDe(entries, 'changed_by', (p) => p),
    }), [entries, titles, sourceLabel]);

    const visibles = useMemo(() => {
        const needle = search.trim().toLowerCase();
        const desde = rango?.[0]?.format('YYYY-MM-DD');
        const hasta = rango?.[1]?.format('YYYY-MM-DD');
        return entries.filter((e) => {
            if (campos.length && !campos.includes(e.column_key)) return false;
            if (origenes.length && !origenes.includes(e.source)) return false;
            if (personas.length && !personas.includes(e.changed_by)) return false;
            if (desde && dia(e.changed_at) < desde) return false;
            if (hasta && dia(e.changed_at) > hasta) return false;
            if (!needle) return true;
            return [e.row_key, titles[e.column_key] || e.column_key, e.from_value, e.to_value, e.changed_by]
                .some((v) => String(v || '').toLowerCase().includes(needle));
        });
    }, [entries, search, campos, origenes, personas, rango, titles]);

    const activos = [campos.length, origenes.length, personas.length, rango ? 1 : 0].filter(Boolean).length;

    const limpiar = () => {
        setCampos([]);
        setOrigenes([]);
        setPersonas([]);
        setRango(null);
    };

    const multiple = (label, value, onChange, options) => (
        <FilterField label={label}>
            <Select mode="multiple" allowClear maxTagCount="responsive" value={value} onChange={onChange} options={options} placeholder="Todos" />
        </FilterField>
    );

    const searchBar = (
        <SearchWithFilters
            value={search}
            onChange={setSearch}
            placeholder="Buscar capa, campo, valor o persona"
            ariaLabel="Buscar en el historial"
            width="100%"
            activeFilters={activos}
            onClearFilters={limpiar}
            filters={(
                <>
                    {multiple('Campo', campos, setCampos, opciones.campos)}
                    {multiple('Origen', origenes, setOrigenes, opciones.origenes)}
                    {multiple('Quién', personas, setPersonas, opciones.personas)}
                    <FilterField label="Fecha">
                        <RangePicker value={rango} onChange={setRango} format="DD/MM/YYYY" allowEmpty={[true, true]} placeholder={['Desde', 'Hasta']} />
                    </FilterField>
                </>
            )}
        />
    );

    return { visibles, searchBar };
}
