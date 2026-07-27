import { useState } from 'react';
import {
    Checkbox, DatePicker, Input, InputNumber, Radio, Select, Switch, Tooltip,
} from 'antd';
import { InboxOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { GRID_COLUMNS, unitsOfColSpan } from './fieldLayout';

function MateSlot({ mate }) {
    return (
        <div style={{
            flex: `${mate.units} 1 0`,
            minWidth: 0,
            minHeight: 56,
            borderRadius: 8,
            border: '1px dashed #d9d9d9',
            background: '#fff',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 8,
        }}>
            <span style={{
                fontWeight: 600,
                color: '#bbb',
                fontSize: 13,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }}>
                {mate.label}
            </span>
            <div style={{ height: 30, borderRadius: 6, background: '#f5f5f5' }} />
        </div>
    );
}

function FreeSlot({ units }) {
    return (
        <div style={{
            flex: `${units} 1 0`,
            minWidth: 0,
            minHeight: 56,
            borderRadius: 8,
            border: '1px dashed #e5e5e5',
            background: 'repeating-linear-gradient(45deg, #f2f2f2, #f2f2f2 6px, #fafafa 6px, #fafafa 12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#bbb',
            fontSize: 12,
            textAlign: 'center',
            padding: 4,
        }}>
            Espacio libre
        </div>
    );
}

export default function FieldPreview({ values, condition, tooltipActive = false, slots = [] }) {
    const [conditionMet, setConditionMet] = useState(true);
    const hidden = !!condition && !conditionMet;
    const {
        type, label, placeholder, required, tooltip,
        options_list, catalog, pattern, accept, maxSizeMB, minLength, maxLength, colSpan,
        openStart, openEnd, openCatalog,
    } = values || {};

    const selfUnits = unitsOfColSpan(colSpan ?? 1);
    const selfAt = slots.findIndex((s) => s.kind === 'self');
    const before = selfAt >= 0 ? slots.slice(0, selfAt) : [];
    const after = selfAt >= 0 ? slots.slice(selfAt + 1) : [];
    const mates = slots.filter((s) => s.kind === 'field');

    const options = (options_list ?? [])
        .filter((o) => o?.value)
        .map((o) => ({ value: String(o.value), label: o.label || String(o.value) }));
    const hasCatalog = !options.length && !!catalog;
    const ph = placeholder || label || '';
    const catalogPlaceholder = hasCatalog ? `Opciones del catálogo: ${catalog}` : 'Selecciona';

    const labelNode = (
        <span style={{ fontWeight: 600, color: '#191919' }}>
            {label || 'Etiqueta del campo'}
            {required && <span style={{ color: '#ff4d4f' }}> *</span>}
            {tooltip && (
                <Tooltip title={tooltip} open={tooltipActive || undefined}>
                    <QuestionCircleOutlined style={{ marginLeft: 6, color: '#999' }} />
                </Tooltip>
            )}
        </span>
    );

    let control;
    switch (type) {
    case 'textarea':
        control = <Input.TextArea disabled rows={3} placeholder={ph} />;
        break;
    case 'number':
        control = <InputNumber disabled style={{ width: '100%' }} placeholder={ph} />;
        break;
    case 'date':
        control = <DatePicker disabled style={{ width: '100%' }} />;
        break;
    case 'date_range':
        control = (openStart || openEnd) ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <DatePicker
                    disabled
                    style={{ flex: 1, minWidth: 120 }}
                    placeholder={openStart ? 'Fecha inicial o estatus' : 'Fecha inicial'}
                />
                <span style={{ color: '#888' }}>a</span>
                <DatePicker
                    disabled
                    style={{ flex: 1, minWidth: 120 }}
                    placeholder={openEnd ? 'Fecha final o estatus' : 'Fecha final'}
                />
            </div>
        ) : (
            <DatePicker.RangePicker disabled style={{ width: '100%' }} placeholder={['Fecha inicial', 'Fecha final']} />
        );
        break;
    case 'select':
        control = <Select disabled placeholder={catalogPlaceholder} options={options} style={{ width: '100%' }} />;
        break;
    case 'select_multiple':
        control = <Select disabled mode="multiple" placeholder={catalogPlaceholder} options={options} style={{ width: '100%' }} />;
        break;
    case 'radio':
        control = hasCatalog
            ? <span style={{ color: '#888' }}>Opciones del catálogo: {catalog}</span>
            : <Radio.Group disabled options={options} />;
        break;
    case 'checkbox':
        control = (
            <Checkbox disabled>
                {label || 'Casilla'}
                {tooltip && (
                    <Tooltip title={tooltip} open={tooltipActive || undefined}>
                        <QuestionCircleOutlined style={{ marginLeft: 6, color: '#999' }} />
                    </Tooltip>
                )}
            </Checkbox>
        );
        break;
    case 'file':
        control = (
            <div
                style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '22px 0', border: '1px dashed #c9a3d4', borderRadius: 8,
                    background: '#fff', color: '#5C2472',
                }}
            >
                <InboxOutlined style={{ fontSize: 28 }} />
                <span>Arrastra o selecciona un archivo</span>
            </div>
        );
        break;
    case 'info':
        control = <div style={{ color: '#7C7C7C', fontStyle: 'italic' }}>{label || 'Texto informativo'}</div>;
        break;
    default:
        control = <Input disabled placeholder={ph} />;
    }

    const hints = [];
    if (type === 'date_range' && (openStart || openEnd)) {
        const extremos = [openStart && 'inicial', openEnd && 'final'].filter(Boolean);
        hints.push(`Fecha ${extremos.join(' y ')}: el calendario incluye las opciones de «${openCatalog || 'estatus_fecha'}»`);
    }
    if (pattern) hints.push(`Patrón: ${pattern}`);
    if (minLength != null) hints.push(`Mín ${minLength} caracteres`);
    if (maxLength != null) hints.push(`Máx ${maxLength} caracteres`);
    if (type === 'file') {
        const exts = Array.isArray(accept) ? accept.filter(Boolean) : [];
        hints.push(exts.length ? `Formatos: ${exts.join(', ')}` : 'Todos los formatos');
        if (maxSizeMB) hints.push(`Máx ${maxSizeMB} MB`);
    }

    return (
        <div style={{ border: '1px dashed #d9d9d9', borderRadius: 8, padding: 16, background: '#fafafa' }}>
            {condition && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 8, flexWrap: 'wrap', marginBottom: 12, paddingBottom: 12,
                    borderBottom: '1px dashed #e5e5e5',
                }}>
                    <span style={{ fontSize: 12, color: '#888', minWidth: 0 }}>
                        «{condition.triggerLabel}» {condition.isMulti ? 'incluye' : '='}{' '}
                        <strong style={{ color: '#191919' }}>{condition.valueText}</strong>
                    </span>
                    <Switch
                        size="small"
                        checked={conditionMet}
                        onChange={setConditionMet}
                        checkedChildren="Se cumple"
                        unCheckedChildren="No se cumple"
                    />
                </div>
            )}
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
                {before.map((slot, i) => (
                    slot.kind === 'gap'
                        ? <FreeSlot key={`before-gap-${i}`} units={slot.units} />
                        : <MateSlot key={`before-${slot.name}-${i}`} mate={slot} />
                ))}
                <div style={{
                    flex: `${selfUnits} 1 0`,
                    minWidth: 0,
                    transition: 'flex-grow 0.2s ease, opacity 0.2s ease',
                    opacity: hidden ? 0.35 : 1,
                }}>
                    {type !== 'info' && type !== 'checkbox' && (
                        <div style={{ marginBottom: 8 }}>{labelNode}</div>
                    )}
                    {control}
                    {hidden && (
                        <div style={{ marginTop: 8, fontSize: 12, color: '#fa8c16' }}>
                            No se muestra al respondent.
                        </div>
                    )}
                    {!hidden && hints.length > 0 && (
                        <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>{hints.join(' · ')}</div>
                    )}
                </div>
                {after.map((slot, i) => (
                    slot.kind === 'gap'
                        ? <FreeSlot key={`after-gap-${i}`} units={slot.units} />
                        : <MateSlot key={`after-${slot.name}-${i}`} mate={slot} />
                ))}
            </div>
            {selfUnits < GRID_COLUMNS && (
                <div style={{ marginTop: 12, fontSize: 12, color: '#888' }}>
                    {mates.length > 0
                        ? <>Comparte línea con <strong style={{ color: '#191919' }}>{mates.map((m) => m.label).join(', ')}</strong>.</>
                        : 'Por ahora nada se acomoda a su lado: el espacio libre queda disponible para otro campo.'}
                </div>
            )}
        </div>
    );
}
