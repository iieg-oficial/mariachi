import { useState } from 'react';
import { Segmented, Space } from 'antd';
import SymbolSnapshotField from './SymbolSnapshotField';

const OPCIONES = [
    { label: 'Dinámico', value: 'dinamico' },
    { label: 'Fijo', value: 'fijo' },
];

export default function IconoBotonField({ value, onChange }) {
    const [pidioFijo, setPidioFijo] = useState(false);
    const fijo = Boolean(value) || pidioFijo;

    const cambiarModo = (modo) => {
        setPidioFijo(modo === 'fijo');
        if (modo === 'dinamico') onChange?.(null);
    };

    return (
        <Space direction="vertical" size={8}>
            <Segmented options={OPCIONES} value={fijo ? 'fijo' : 'dinamico'} onChange={cambiarModo} />
            {fijo && <SymbolSnapshotField value={value} onChange={onChange} placeholder="Elige el ícono fijo" />}
        </Space>
    );
}
