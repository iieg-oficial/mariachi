import { DatePicker, Form, Select } from 'antd';
import { DATE_LIMIT_MODES, DATE_LIMIT_MODES_FIJOS } from '../../constants/definitionTypes';

const LIMITES = [
    {
        modeName: 'minDateMode',
        valueName: 'minDateValue',
        label: 'Fecha mínima permitida',
        modes: DATE_LIMIT_MODES_FIJOS,
    },
    {
        modeName: 'maxDateMode',
        valueName: 'maxDateValue',
        label: 'Fecha máxima permitida',
        modes: DATE_LIMIT_MODES,
        todayExtra: 'No se podrán capturar fechas futuras.',
    },
];

const Limite = ({ form, modeName, valueName, label, modes, todayExtra }) => {
    const mode = Form.useWatch(modeName, form);

    return (
        <>
            <Form.Item
                label={label}
                name={modeName}
                style={{ marginBottom: mode === 'fixed' ? 8 : 12 }}
                extra={mode === 'today' ? todayExtra : undefined}
            >
                <Select options={mode === 'today' ? DATE_LIMIT_MODES : modes} />
            </Form.Item>
            {mode === 'fixed' && (
                <Form.Item
                    name={valueName}
                    style={{ marginBottom: 12 }}
                    rules={[{ required: true, message: 'Elige la fecha del límite.' }]}
                >
                    <DatePicker style={{ width: '100%' }} placeholder="Selecciona la fecha" />
                </Form.Item>
            )}
        </>
    );
};

export default function DateLimitsConfig({ form }) {
    return (
        <div style={{
            border: '1px solid #f0f0f0',
            borderRadius: 8,
            background: '#fafafa',
            padding: 12,
            marginBottom: 16,
        }}>
            <div style={{ fontWeight: 500, marginBottom: 4, color: '#191919' }}>
                Límites de fecha
            </div>
            <div style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>
                El calendario deshabilita los días fuera del rango y el servidor los
                rechaza al guardar. «Fecha de llenado» se evalúa el día en que responden,
                no el día en que configuras el formulario, así que avanza sola.
            </div>
            {LIMITES.map((limite) => (
                <Limite key={limite.modeName} form={form} {...limite} />
            ))}
        </div>
    );
}
