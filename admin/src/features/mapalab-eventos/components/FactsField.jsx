import { Button, Empty, Input, Space, Typography } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';

const { Text } = Typography;

const MAX_LENGTH = 500;

const FactsField = ({ value, onChange }) => {
    const facts = Array.isArray(value) ? value : [];

    const update = (next) => onChange?.(next);

    const handleAdd = () => update([...facts, '']);
    const handleRemove = (idx) => update(facts.filter((_, i) => i !== idx));
    const handleChange = (idx, text) => {
        const next = [...facts];
        next[idx] = text;
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
        <Space direction="vertical" style={{ width: '100%' }} size="small">
            {facts.map((text, idx) => (
                <Space.Compact key={idx} style={{ width: '100%' }} block>
                    <Input.TextArea
                        value={text}
                        onChange={(e) => handleChange(idx, e.target.value)}
                        placeholder={`Dato curioso #${idx + 1}`}
                        rows={2}
                        maxLength={MAX_LENGTH}
                        showCount
                    />
                    <Button
                        onClick={() => handleMove(idx, -1)}
                        disabled={idx === 0}
                        icon={<ArrowUpOutlined />}
                        title="Subir"
                    />
                    <Button
                        onClick={() => handleMove(idx, 1)}
                        disabled={idx === facts.length - 1}
                        icon={<ArrowDownOutlined />}
                        title="Bajar"
                    />
                    <Button
                        onClick={() => handleRemove(idx)}
                        icon={<DeleteOutlined />}
                        danger
                        title="Eliminar"
                    />
                </Space.Compact>
            ))}
            <Button type="dashed" onClick={handleAdd} icon={<PlusOutlined />} block>
                Agregar dato curioso
            </Button>
        </Space>
    );
};

export default FactsField;
