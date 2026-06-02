import { Slider, Switch, Typography } from 'antd';
import { ZOOM_MIN, ZOOM_MAX, ZOOM_MARKS, zoomLevelLabel, clampZoom } from '@shared/utils/zoomScale';

const { Text } = Typography;

function RangeSlider({ value, onChange, defaultZoom }) {
    const hasRange = value?.min != null || value?.max != null;

    const enable = () => {
        const center = clampZoom(defaultZoom, 13);
        onChange?.({
            min: clampZoom(center - 3, ZOOM_MIN),
            max: clampZoom(center + 3, ZOOM_MAX),
        });
    };

    if (!hasRange) {
        return (
            <div>
                <Switch checked={false} onChange={enable} />
                <Text type="secondary" style={{ marginLeft: 12 }}>
                    Sin límite: hereda el rango de zoom de la capa. Actívalo para mostrar el aviso
                    sólo en cierto nivel de acercamiento.
                </Text>
            </div>
        );
    }

    const rawMin = clampZoom(value?.min, ZOOM_MIN);
    const rawMax = clampZoom(value?.max, ZOOM_MAX);
    const min = Math.min(rawMin, rawMax);
    const max = Math.max(rawMin, rawMax);

    return (
        <div>
            <Switch checked onChange={() => onChange?.(null)} />
            <Text type="secondary" style={{ marginLeft: 12 }}>
                Limitar a un rango de acercamiento.
            </Text>
            <div style={{ padding: '0 12px', marginTop: 24 }}>
                <Slider
                    range
                    min={ZOOM_MIN}
                    max={ZOOM_MAX}
                    step={1}
                    marks={ZOOM_MARKS}
                    value={[min, max]}
                    onChange={([a, b]) => onChange?.({ min: a, max: b })}
                    tooltip={{ formatter: (z) => `Nivel ${z} · ${zoomLevelLabel(z)}` }}
                />
            </div>
            <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                Visible desde <Text strong>{zoomLevelLabel(min)}</Text> (más alejado, nivel {min})
                {' '}hasta <Text strong>{zoomLevelLabel(max)}</Text> (más acercado, nivel {max}).
            </Text>
        </div>
    );
}

function SingleSlider({ value, onChange }) {
    const current = clampZoom(value, 13);
    return (
        <div style={{ padding: '0 12px', marginTop: 24 }}>
            <Slider
                min={ZOOM_MIN}
                max={ZOOM_MAX}
                step={1}
                marks={ZOOM_MARKS}
                value={current}
                onChange={(z) => onChange?.(z)}
                tooltip={{ formatter: (z) => `Nivel ${z} · ${zoomLevelLabel(z)}` }}
            />
            <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                Nivel <Text strong>{current}</Text> · {zoomLevelLabel(current)}.
                {' '}A mayor nivel, más acercado al detalle.
            </Text>
        </div>
    );
}

export default function ZoomRangeField({ mode = 'range', value, onChange, defaultZoom }) {
    if (mode === 'single') {
        return <SingleSlider value={value} onChange={onChange} />;
    }
    return <RangeSlider value={value} onChange={onChange} defaultZoom={defaultZoom} />;
}
