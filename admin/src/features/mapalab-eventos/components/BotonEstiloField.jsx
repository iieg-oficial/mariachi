import { Button, ColorPicker, Segmented, Space, Typography } from 'antd';
import { BRAND } from '@app/providers/brand';
import {
    BORDE_PRESETS,
    FONDO_PRESETS,
    FONDOS_PALETA,
    FORMAS_TRAMOS,
    tramosDeForma,
} from '@features/mapalab-eventos/constants/diversion';

const { Text } = Typography;

const ESTILO_BASE = {
    fondo: { forma: 'solido', colores: ['blanco'] },
    borde: { forma: 'ninguno', colores: [] },
};
const NOMBRES_TRAMO = [[], ['Color'], ['Izquierda', 'Derecha'], ['Izquierda', 'Centro', 'Derecha']];
const RELLENO_FONDO = ['blanco', 'blanco', 'blanco'];
const RELLENO_BORDE = [BRAND.orange, '#FFFFFF', BRAND.purple];

const colorDeFondo = (id) => FONDOS_PALETA.find((p) => p.value === id)?.color || '#FFFFFF';

const ajustar = (tramo, forma, relleno) => ({
    forma,
    colores: Array.from({ length: tramosDeForma(forma) }, (_, i) => tramo.colores[i] ?? relleno[i]),
});

const coincide = (tramo, preset) => tramo.forma === preset.forma
    && preset.colores.every((c, i) => (tramo.colores[i] || '').toUpperCase() === c.toUpperCase());

const franjas = (colores) => (colores.length > 1
    ? `linear-gradient(90deg, ${colores.map((c, i) => `${c} ${(i / colores.length) * 100}% ${((i + 1) / colores.length) * 100}%`).join(', ')})`
    : colores[0]);

const Punto = ({ colores }) => (
    <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', border: '1px solid rgba(0,0,0,.15)', background: franjas(colores) }} />
);

const opcionesForma = (sin) => FORMAS_TRAMOS.map(({ value, label }) => ({ value, label: value === 'ninguno' ? sin : label }));

const Plantillas = ({ presets, tramo, colorDe, onPick }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0 10px' }}>
        {presets.map((p) => (
            <Button
                key={p.value}
                size="small"
                type={coincide(tramo, p) ? 'primary' : 'default'}
                icon={<Punto colores={p.colores.map(colorDe)} />}
                onClick={() => onPick({ forma: p.forma, colores: [...p.colores] })}
            >
                {p.label}
            </Button>
        ))}
    </div>
);

export default function BotonEstiloField({ value, onChange }) {
    const estilo = value || ESTILO_BASE;
    const setFondo = (fondo) => onChange?.({ ...estilo, fondo });
    const setBorde = (borde) => onChange?.({ ...estilo, borde });
    const setColorFondo = (i, id) => setFondo({ ...estilo.fondo, colores: estilo.fondo.colores.map((c, j) => (j === i ? id : c)) });
    const setColorBorde = (i, hex) => setBorde({ ...estilo.borde, colores: estilo.borde.colores.map((c, j) => (j === i ? hex : c)) });

    return (
        <Space orientation="vertical" size={18} style={{ width: '100%' }}>
            <div>
                <Text strong>Fondo</Text>
                <Plantillas presets={FONDO_PRESETS} tramo={estilo.fondo} colorDe={colorDeFondo} onPick={setFondo} />
                <Segmented
                    size="small"
                    options={opcionesForma('Sin fondo')}
                    value={estilo.fondo.forma}
                    onChange={(forma) => setFondo(ajustar(estilo.fondo, forma, RELLENO_FONDO))}
                />
                {NOMBRES_TRAMO[tramosDeForma(estilo.fondo.forma)].map((nombre, i) => (
                    <div key={nombre} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <Text type="secondary" style={{ width: 70, fontSize: 12 }}>{nombre}</Text>
                        {FONDOS_PALETA.map((p) => {
                            const activo = estilo.fondo.colores[i] === p.value;
                            return (
                                <button
                                    key={p.value}
                                    type="button"
                                    title={p.label}
                                    aria-label={`${nombre}: ${p.label}`}
                                    aria-pressed={activo}
                                    onClick={() => setColorFondo(i, p.value)}
                                    style={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: '50%',
                                        cursor: 'pointer',
                                        background: p.color,
                                        border: '1px solid #D9D9D9',
                                        outline: activo ? `2px solid ${BRAND.orange}` : 'none',
                                        outlineOffset: 2,
                                    }}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
            <div>
                <Text strong>Borde</Text>
                <Plantillas presets={BORDE_PRESETS} tramo={estilo.borde} colorDe={(c) => c} onPick={setBorde} />
                <Segmented
                    size="small"
                    options={opcionesForma('Sin borde')}
                    value={estilo.borde.forma}
                    onChange={(forma) => setBorde(ajustar(estilo.borde, forma, RELLENO_BORDE))}
                />
                <Space wrap size={14} style={{ display: 'flex', marginTop: 8 }}>
                    {NOMBRES_TRAMO[tramosDeForma(estilo.borde.forma)].map((nombre, i) => (
                        <Space key={nombre} size={6}>
                            <ColorPicker
                                size="small"
                                disabledAlpha
                                value={estilo.borde.colores[i]}
                                onChange={(color) => setColorBorde(i, color.toHexString().toUpperCase())}
                            />
                            <Text type="secondary" style={{ fontSize: 12 }}>{nombre}</Text>
                        </Space>
                    ))}
                </Space>
                <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
                    El fondo usa la paleta institucional; el borde admite cualquier color.
                </Text>
            </div>
        </Space>
    );
}
