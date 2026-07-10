import {
    Checkbox, DatePicker, Input, InputNumber, Radio, Select, Tooltip,
} from 'antd';
import { InboxOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { parseOptions } from './fieldUtils';

export default function FieldPreview({ values }) {
    const {
        type, label, placeholder, required, tooltip,
        options_text, catalog, pattern, accept, maxSizeMB, minLength, maxLength,
    } = values || {};

    const options = parseOptions(options_text);
    const hasCatalog = !options.length && !!catalog;
    const ph = placeholder || label || '';
    const catalogPlaceholder = hasCatalog ? `Opciones del catálogo: ${catalog}` : 'Selecciona';

    const labelNode = (
        <span style={{ fontWeight: 600, color: '#191919' }}>
            {label || 'Etiqueta del campo'}
            {required && <span style={{ color: '#ff4d4f' }}> *</span>}
            {tooltip && (
                <Tooltip title={tooltip}>
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
    case 'email':
        control = <Input disabled placeholder={placeholder || 'correo@ejemplo.com'} />;
        break;
    case 'tel':
        control = <Input disabled placeholder={placeholder || '10 dígitos'} />;
        break;
    case 'date':
        control = <DatePicker disabled style={{ width: '100%' }} />;
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
        control = <Checkbox disabled>{label || 'Casilla'}</Checkbox>;
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
    if (type === 'tel' && !pattern) hints.push('Formato: 10 dígitos');
    if (type === 'email' && !pattern) hints.push('Formato de correo válido');
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
            {type !== 'info' && type !== 'checkbox' && (
                <div style={{ marginBottom: 8 }}>{labelNode}</div>
            )}
            {control}
            {hints.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>{hints.join(' · ')}</div>
            )}
        </div>
    );
}
