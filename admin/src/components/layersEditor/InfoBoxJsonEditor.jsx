import { useState } from 'react';
import { Alert, Input, Typography } from 'antd';

const { Text } = Typography;

const stringify = (v) => (v ? JSON.stringify(v, null, 2) : '');


export default function InfoBoxJsonEditor({ value, onChange }) {
    const [text, setText] = useState(() => stringify(value));
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const raw = e.target.value;
        setText(raw);
        if (!raw.trim()) {
            setError(null);
            onChange(null);
            return;
        }
        try {
            const parsed = JSON.parse(raw);
            setError(null);
            onChange(parsed);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                Estructura libre de <code>infobox_config</code>. El frontend la consumirá tal como aquí.
            </Text>
            <Input.TextArea
                value={text}
                onChange={handleChange}
                rows={12}
                placeholder={'{\n  "headerField": "nombre",\n  "labelGroups": [...]\n}'}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
            {error && (
                <Alert
                    type="error"
                    message="JSON inválido"
                    description={error}
                    style={{ marginTop: 8 }}
                />
            )}
        </>
    );
}
