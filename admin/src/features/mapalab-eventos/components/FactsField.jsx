import { Button, Empty, Select, Space, Tooltip, Typography } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import MarkdownTextArea from '@shared/components/MarkdownTextArea';
import SymbolSnapshotField from './SymbolSnapshotField';
import DestinoField from './DestinoField';
import { ANIMACIONES } from '@features/mapalab-eventos/constants/diversion';

const { Text } = Typography;

const MAX_LENGTH = 500;
const EMPTY_FACT = { text: '', symbol: null, animacion: null, destino: null };
const ANIMACION_OPTIONS = [
    { value: '', label: 'Animación del evento' },
    ...ANIMACIONES.map(({ value, label }) => ({ value, label })),
];

const normalizeFact = (f) => {
    if (!f) return { ...EMPTY_FACT };
    if (typeof f === 'string') return { ...EMPTY_FACT, text: f };
    return { text: f.text || '', symbol: f.symbol || null, animacion: f.animacion || null, destino: f.destino || null };
};

const FactsField = ({ value, onChange, animacionEvento }) => {
    const facts = Array.isArray(value) ? value.map(normalizeFact) : [];

    const update = (next) => onChange?.(next);

    const handleAdd = () => update([...facts, { ...EMPTY_FACT }]);
    const handleRemove = (idx) => update(facts.filter((_, i) => i !== idx));
    const handleChangeText = (idx, text) => {
        const next = [...facts];
        next[idx] = { ...next[idx], text };
        update(next);
    };
    const handleChangeSymbol = (idx, symbol) => {
        const next = [...facts];
        next[idx] = { ...next[idx], symbol };
        update(next);
    };
    const handleChangeAnimacion = (idx, animacion) => {
        const next = [...facts];
        next[idx] = { ...next[idx], animacion: animacion || null };
        update(next);
    };
    const handleChangeDestino = (idx, destino) => {
        const next = [...facts];
        next[idx] = { ...next[idx], destino };
        update(next);
    };
    const handleMove = (idx, delta) => {
        const target = idx + delta;
        if (target < 0 || target >= facts.length) return;
        const next = [...facts];
        [next[idx], next[target]] = [next[target], next[idx]];
        update(next);
    };

    if (facts.length === 0) {
        return (
            <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<Text type="secondary">Sin datos curiosos</Text>}
                style={{ padding: 16 }}
            >
                <Button type="dashed" onClick={handleAdd} icon={<PlusOutlined />}>
                    Agregar el primero
                </Button>
            </Empty>
        );
    }

    return (
        <div>
            {facts.map((fact, idx) => (
                <div
                    key={idx}
                    style={{
                        marginBottom: 24,
                        padding: 12,
                        background: '#FAFAFA',
                        borderRadius: 6,
                        border: '1px solid #F0F0F0',
                    }}
                >
                    <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Dato curioso #{idx + 1}
                        </Text>
                        <Space size={8} wrap>
                            <Select
                                size="small"
                                value={fact.animacion ?? ''}
                                onChange={(v) => handleChangeAnimacion(idx, v)}
                                options={ANIMACION_OPTIONS}
                                style={{ width: 170 }}
                                aria-label={`Animación del dato curioso ${idx + 1}`}
                            />
                            <SymbolSnapshotField
                                value={fact.symbol}
                                onChange={(symbol) => handleChangeSymbol(idx, symbol)}
                                size={20}
                                placeholder="Sin símbolo (usa el del evento)"
                            />
                        </Space>
                    </div>
                    <MarkdownTextArea
                        value={fact.text}
                        onChange={(v) => handleChangeText(idx, v)}
                        rows={3}
                        maxLength={MAX_LENGTH}
                        showCount
                        placeholder="Texto del dato curioso. Puedes usar **negrita**, *cursiva* y enlaces."
                        extraActions={
                            <>
                                <Tooltip title="Subir">
                                    <Button
                                        size="small"
                                        icon={<ArrowUpOutlined />}
                                        disabled={idx === 0}
                                        onClick={() => handleMove(idx, -1)}
                                        aria-label="Subir"
                                    />
                                </Tooltip>
                                <Tooltip title="Bajar">
                                    <Button
                                        size="small"
                                        icon={<ArrowDownOutlined />}
                                        disabled={idx === facts.length - 1}
                                        onClick={() => handleMove(idx, 1)}
                                        aria-label="Bajar"
                                    />
                                </Tooltip>
                                <Tooltip title="Eliminar">
                                    <Button
                                        size="small"
                                        icon={<DeleteOutlined />}
                                        danger
                                        onClick={() => handleRemove(idx)}
                                        aria-label="Eliminar"
                                    />
                                </Tooltip>
                            </>
                        }
                    />
                    {(fact.animacion || animacionEvento) === 'aguilas' && (
                        <div style={{ marginTop: 10 }}>
                            <DestinoField value={fact.destino} onChange={(destino) => handleChangeDestino(idx, destino)} />
                        </div>
                    )}
                </div>
            ))}
            <Button type="dashed" onClick={handleAdd} icon={<PlusOutlined />} block>
                Agregar dato curioso
            </Button>
        </div>
    );
};

export default FactsField;
