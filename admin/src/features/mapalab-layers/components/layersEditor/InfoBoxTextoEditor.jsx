import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Input, Space, Typography } from 'antd';
import { configATexto, textoAConfig } from '@features/mapalab-layers/constants/infoboxTexto';

const { Text } = Typography;

const AYUDA = `titulo      nombre
insignia    municipio naranja
renglon     Turno: turno
ubicacion   calle, "#"numero_ext, "Col. "colonia
telefono    telefono
cifra       Alumnos: alumnos
cifra       Total: hombres + mujeres
parrafo     Texto fijo`;

export default function InfoBoxTextoEditor({ value, onChange, onIrAJson }) {
    const { texto: textoDeConfig, razones } = useMemo(() => configATexto(value), [value]);
    const [borrador, setBorrador] = useState(textoDeConfig);
    const [errores, setErrores] = useState([]);

    useEffect(() => { setBorrador(textoDeConfig); }, [textoDeConfig]);

    if (razones.length > 0) {
        return (
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                <Alert
                    type="info"
                    showIcon
                    message="Esta tarjetita no se puede escribir en texto corto sin perder algo"
                    description={
                        <>
                            <ul style={{ margin: '6px 0 10px', paddingLeft: 18 }}>
                                {razones.map((r, i) => <li key={i} style={{ fontSize: 12 }}>{r}</li>)}
                            </ul>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                El texto corto solo escribe lo que puede volver a leer. Para esto usa el modo JSON,
                                que no pierde nada, o el lienzo.
                            </Text>
                        </>
                    }
                />
                {onIrAJson && <Button size="small" onClick={onIrAJson}>Abrir en JSON</Button>}
            </Space>
        );
    }

    const aplicar = () => {
        const { config, errores: fallos } = textoAConfig(borrador);
        setErrores(fallos);
        if (fallos.length === 0) onChange?.(config);
    };

    return (
        <Space orientation="vertical" size="small" style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
                Una línea por sección. Se pega entre entornos y se revisa en un diff sin contar corchetes.
            </Text>
            <Input.TextArea
                value={borrador}
                onChange={(e) => setBorrador(e.target.value)}
                onBlur={aplicar}
                autoSize={{ minRows: 8, maxRows: 24 }}
                spellCheck={false}
                style={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre' }}
                aria-label="Tarjetita en texto corto"
            />
            <Space size={8}>
                <Button size="small" type="primary" onClick={aplicar}>Aplicar</Button>
                <Button size="small" onClick={() => { setBorrador(textoDeConfig); setErrores([]); }}>Descartar</Button>
            </Space>
            {errores.length > 0 && (
                <Alert
                    type="error"
                    showIcon
                    message="No se aplicó: hay líneas que no entendí"
                    description={<ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                        {errores.map((e, i) => <li key={i} style={{ fontSize: 12 }}>{e}</li>)}
                    </ul>}
                />
            )}
            <details>
                <summary style={{ cursor: 'pointer', fontSize: 12, color: '#8c8c8c' }}>Palabras que entiende</summary>
                <pre style={{ fontFamily: 'monospace', fontSize: 11, color: '#595959', marginTop: 8 }}>{AYUDA}</pre>
            </details>
        </Space>
    );
}
