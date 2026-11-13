import { Tooltip } from 'antd';

const ALTO = 48;

export default function SerieGolpes({ serie }) {
    const max = Math.max(1, ...serie.map((p) => p.golpes));
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: ALTO, width: '100%' }}>
            {serie.map((p) => (
                <Tooltip key={p.ts} title={`${new Date(p.ts).toLocaleTimeString()} · ${p.golpes}`}>
                    <div
                        style={{
                            flex: 1,
                            minWidth: 1,
                            height: p.golpes ? Math.max(3, (p.golpes / max) * ALTO) : 1,
                            background: p.golpes ? '#5C2472' : '#e5e5e5',
                            borderRadius: 1,
                        }}
                    />
                </Tooltip>
            ))}
        </div>
    );
}
