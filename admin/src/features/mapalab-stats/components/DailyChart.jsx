import { Card, Empty } from 'antd';
import { useMemo } from 'react';

const DailyChart = ({ rows = [], loading }) => {
    const series = useMemo(() => {
        const grouped = {};
        for (const row of rows) {
            if (!grouped[row.dia]) grouped[row.dia] = { dia: row.dia, sessions: 0, events: 0 };
            grouped[row.dia].sessions += row.sessions;
            grouped[row.dia].events += row.events;
        }
        return Object.values(grouped).sort((a, b) => a.dia.localeCompare(b.dia));
    }, [rows]);

    if (!loading && series.length === 0) {
        return (
            <Card title="Sesiones por día" size="small">
                <Empty description="Sin datos aún" />
            </Card>
        );
    }

    const max = Math.max(...series.map((d) => d.sessions), 1);

    return (
        <Card title="Sesiones por día" size="small" loading={loading}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 160, paddingTop: 8 }}>
                {series.map((d) => (
                    <div
                        key={d.dia}
                        title={`${d.dia}: ${d.sessions} sesiones · ${d.events} eventos`}
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            gap: 4,
                            minWidth: 4,
                        }}
                    >
                        <div
                            style={{
                                width: '100%',
                                background: '#5C2472',
                                borderRadius: 2,
                                height: `${(d.sessions / max) * 100}%`,
                                minHeight: d.sessions > 0 ? 2 : 0,
                                transition: 'height 0.3s',
                            }}
                        />
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#888' }}>
                <span>{series[0]?.dia}</span>
                <span>{series[series.length - 1]?.dia}</span>
            </div>
        </Card>
    );
};

export default DailyChart;
