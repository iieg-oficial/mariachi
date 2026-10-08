import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Input, Space, Typography } from 'antd';
import { CopyOutlined, FormatPainterOutlined } from '@ant-design/icons';
import { message } from '@shared/services/message';

const { TextArea } = Input;
const { Text } = Typography;

const KNOWN_KEYS = [
    'headerField',
    'headerTransform',
    'labelGroups',
    'labels',
    'list',
    'iconText',
    'text',
    'cards',
    'cardsColumns',
    'blockOrder',
];

const PLACEHOLDER = `{
  "headerField": "nombre",
  "list": [
    { "label": "Municipio", "field": "municipio" }
  ]
}`;

const toText = (value) =>
    (value && typeof value === 'object' && Object.keys(value).length ? JSON.stringify(value, null, 2) : '');

const parseConfig = (raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return { config: null };
    let parsed;
    try {
        parsed = JSON.parse(trimmed);
    } catch (err) {
        return { error: `JSON inválido: ${err.message}` };
    }
    if (parsed === null) return { config: null };
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { error: 'La tarjeta tiene que ser un objeto {...}, no una lista ni un valor suelto.' };
    }
    return { config: Object.keys(parsed).length ? parsed : null };
};

export default function InfoBoxJsonEditor({ value, onChange, inherited = null }) {
    const [text, setText] = useState(() => toText(value));
    const [error, setError] = useState(null);
    const emittedRef = useRef(toText(value));

    useEffect(() => {
        const incoming = toText(value);
        if (incoming === emittedRef.current) return;
        emittedRef.current = incoming;
        setText(incoming);
        setError(null);
    }, [value]);

    const handleText = (next) => {
        setText(next);
        const { config, error: parseError } = parseConfig(next);
        if (parseError) {
            setError(parseError);
            return;
        }
        setError(null);
        emittedRef.current = toText(config);
        onChange?.(config);
    };

    const handleFormat = () => {
        const { config, error: parseError } = parseConfig(text);
        if (parseError) {
            setError(parseError);
            return;
        }
        setText(toText(config));
    };

    const handleCopy = async () => {
        const payload = text.trim();
        if (!payload) {
            message.info('No hay nada que copiar: esta capa no tiene tarjeta propia.');
            return;
        }
        try {
            await navigator.clipboard.writeText(payload);
            message.success('JSON de la tarjeta copiado');
        } catch {
            message.error('El navegador bloqueó el portapapeles. Selecciona el texto y copia con Ctrl+C.');
        }
    };

    const unknownKeys = !error && value ? Object.keys(value).filter((k) => !KNOWN_KEYS.includes(k)) : [];
    const inheriting = !value || Object.keys(value).length === 0;

    return (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
                type="info"
                showIcon
                title="Copiar y pegar entre entornos"
                description={
                    <span>
                        Copia el JSON desde la capa de pruebas y pégalo aquí en la de producción (o al revés).
                        El pegado <b>reemplaza la tarjeta completa</b> y se aplica al guardar, no al escribir.
                        Los nombres de los campos tienen que existir en la capa destino.
                    </span>
                }
            />

            <Space size={8} wrap>
                <Button size="small" icon={<CopyOutlined />} onClick={handleCopy}>
                    Copiar JSON
                </Button>
                <Button size="small" icon={<FormatPainterOutlined />} onClick={handleFormat} disabled={!text.trim()}>
                    Formatear
                </Button>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {text.length} caracteres
                </Text>
            </Space>

            {error && <Alert type="error" showIcon title={error} description="Mientras el JSON no sea válido no se aplica ningún cambio a la tarjeta." />}

            {unknownKeys.length > 0 && (
                <Alert
                    type="warning"
                    showIcon
                    title={`Claves que el visor no lee: ${unknownKeys.join(', ')}`}
                    description="Se guardan tal cual, pero mapalab las ignora al dibujar la tarjeta."
                />
            )}

            {inheriting && inherited && (
                <Alert
                    type="success"
                    showIcon
                    title={`Esta capa hereda la tarjeta del grupo ${inherited.label}`}
                    description={
                        <Space orientation="vertical" size={6} style={{ width: '100%' }}>
                            <span>Está vacía porque no tiene tarjeta propia. Si escribes o pegas aquí, creas una personalizada.</span>
                            <Button size="small" onClick={() => handleText(toText(inherited.config))}>
                                Partir del JSON heredado
                            </Button>
                        </Space>
                    }
                />
            )}

            <TextArea
                value={text}
                onChange={(e) => handleText(e.target.value)}
                placeholder={PLACEHOLDER}
                rows={22}
                spellCheck={false}
                status={error ? 'error' : undefined}
                style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre' }}
            />
        </Space>
    );
}
