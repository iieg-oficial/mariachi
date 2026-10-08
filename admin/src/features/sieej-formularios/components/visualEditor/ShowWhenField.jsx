import { useMemo } from 'react';
import { Alert, Form, Select, Tag } from 'antd';
import useCatalogos from '../../hooks/useCatalogos';
import { conditionValueOptions, describeCondition, dependentsOf } from './fieldUtils';

const ShowWhenField = ({ form, availableFields = [] }) => {
    const watchField = Form.useWatch('showWhen_field', form);
    const watchEquals = Form.useWatch('showWhen_equals', form);
    const watchName = Form.useWatch('name', form);
    const { catalogos, loading: catalogosLoading } = useCatalogos();

    const sources = useMemo(
        () => availableFields.map((f) => (typeof f === 'string' ? { name: f } : f)),
        [availableFields],
    );

    if (sources.length === 0) return null;

    const fieldOptions = sources.map((f) => ({
        value: f.name,
        label: f.label ? `${f.label} — ${f.name}` : f.name,
    }));

    const source = sources.find((f) => f.name === watchField) ?? null;
    const isMultiSource = source?.type === 'select_multiple';
    const usesCatalog = !!source?.catalog && (source?.options ?? []).length === 0;
    const valueOptions = conditionValueOptions(source, catalogos);

    const condition = describeCondition(
        { field: watchField, equals: watchEquals },
        sources,
        catalogos,
    );

    const dependents = dependentsOf(sources, watchName);

    return (
        <div style={{
            border: '1px solid #f0f0f0',
            borderRadius: 8,
            background: '#fafafa',
            padding: 12,
            marginBottom: 16,
        }}>
            <div style={{ fontWeight: 500, marginBottom: 4, color: '#191919' }}>
                Visibilidad condicional
            </div>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>
                Por defecto el campo siempre se muestra. Elige un campo para que aparezca
                solo cuando ese campo tenga cierto valor.
            </div>
            <Form.Item
                label="Mostrar solo cuando el campo…"
                name="showWhen_field"
                style={{ marginBottom: 12 }}
            >
                <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Siempre visible"
                    options={fieldOptions}
                    onChange={() => form.setFieldsValue({ showWhen_equals: undefined })}
                />
            </Form.Item>
            {watchField && (
                <Form.Item
                    label={isMultiSource ? '…incluya alguna de estas opciones' : '…tenga alguno de estos valores'}
                    name="showWhen_equals"
                    style={{ marginBottom: 12 }}
                    rules={[{ required: true, message: 'Elige al menos un valor que active este campo.' }]}
                    extra={usesCatalog
                        ? `Opciones del catálogo «${source.catalog}». El campo aparece si coincide con cualquiera.`
                        : (valueOptions
                            ? 'El campo aparece si coincide con cualquiera de los valores elegidos.'
                            : 'Este campo es de texto libre: escribe uno o varios valores exactos (Enter para agregar).')}
                >
                    {valueOptions || usesCatalog ? (
                        <Select
                            mode="multiple"
                            showSearch
                            optionFilterProp="label"
                            loading={usesCatalog && catalogosLoading}
                            placeholder={usesCatalog && catalogosLoading
                                ? 'Cargando catálogo…'
                                : 'Elige una o varias opciones'}
                            options={valueOptions ?? []}
                        />
                    ) : (
                        <Select
                            mode="tags"
                            open={false}
                            placeholder="Escribe un valor y Enter"
                            suffixIcon={null}
                        />
                    )}
                </Form.Item>
            )}
            {condition && (
                <Alert
                    type="info"
                    showIcon
                    title={`Este campo solo se mostrará cuando «${condition.triggerLabel}» `
                        + `${condition.isMulti ? 'incluya' : 'sea'} ${condition.valueText}.`}
                />
            )}
            {dependents.length > 0 && (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginTop: condition ? 8 : 0 }}
                    title={`Otros ${dependents.length} campo${dependents.length === 1 ? '' : 's'} dependen de este`}
                    description={(
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: 12, color: '#888' }}>
                                Si cambias su nombre interno, tipo u opciones, estas reglas dejan de funcionar.
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {dependents.map((d) => {
                                    const dc = describeCondition(d.showWhen, sources, catalogos);
                                    return (
                                        <Tag key={d.name} color="purple">
                                            {d.label || d.name}
                                            {dc ? ` · si ${dc.isMulti ? 'incluye' : '='} ${dc.valueText}` : ''}
                                        </Tag>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                />
            )}
        </div>
    );
};

export default ShowWhenField;
