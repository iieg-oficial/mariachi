import { useEffect, useMemo, useState } from 'react';
import { Card, DatePicker, Empty, Space, Tag, Timeline, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import { eventMeta } from '@features/monitoreo/constants';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const PAGE = 15;

const PRESETS = [
    { label: 'Hoy', value: [dayjs(), dayjs()] },
    { label: 'Ayer', value: [dayjs().subtract(1, 'day'), dayjs().subtract(1, 'day')] },
    { label: 'Últimos 7 días', value: [dayjs().subtract(6, 'day'), dayjs()] },
    { label: 'Últimos 30 días', value: [dayjs().subtract(29, 'day'), dayjs()] },
];

export default function EventosPanel({ eventos, isMobile }) {
    const [rango, setRango] = useState(null);
    const [visible, setVisible] = useState(PAGE);

    const filtrados = useMemo(() => {
        const [desde, hasta] = rango || [];
        if (!desde || !hasta) return eventos;
        const ini = desde.startOf('day');
        const fin = hasta.endOf('day');
        return eventos.filter((e) => {
            const t = dayjs(e.occurred_at);
            return !t.isBefore(ini) && !t.isAfter(fin);
        });
    }, [eventos, rango]);

    useEffect(() => { setVisible(PAGE); }, [rango]);

    const mostrados = filtrados.slice(0, visible);
    const hayMas = visible < filtrados.length;

    const onScroll = (e) => {
        if (!hayMas) return;
        const el = e.currentTarget;
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) {
            setVisible((v) => Math.min(v + PAGE, filtrados.length));
        }
    };

    const filtro = (
        <RangePicker
            size="small"
            allowClear
            value={rango}
            onChange={setRango}
            presets={PRESETS}
            format="DD/MM/YY"
            style={{ width: isMobile ? '100%' : 220 }}
        />
    );

    return (
        <Card
            size="small"
            title="Eventos"
            style={{ minWidth: 0 }}
            styles={{ body: { padding: 0 } }}
            extra={isMobile ? undefined : filtro}
        >
            {isMobile && (
                <div style={{ padding: '10px 12px 0' }}>{filtro}</div>
            )}
            <div
                onScroll={onScroll}
                style={{
                    minHeight: 220,
                    maxHeight: isMobile ? 'calc(100vh - 220px)' : 'calc(100vh - 240px)',
                    overflowY: 'auto',
                    padding: '12px 12px 4px',
                }}
            >
                {mostrados.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={rango ? 'Sin eventos en el rango' : 'Sin eventos registrados'}
                    />
                ) : (
                    <Timeline
                        items={mostrados.map((e, i) => {
                            const meta = eventMeta(e.kind);
                            return {
                                key: `${e.slug}-${e.occurred_at}-${i}`,
                                color: meta.color,
                                children: (
                                    <Space direction="vertical" size={0}>
                                        <Space size={6}>
                                            <Tag color={meta.color} style={{ marginInlineEnd: 0 }}>{meta.text}</Tag>
                                            <Text strong style={{ fontSize: 13 }}>{e.slug}</Text>
                                        </Space>
                                        {e.detail && <Text type="secondary" style={{ fontSize: 11 }}>{e.detail}</Text>}
                                        <Tooltip title={new Date(e.occurred_at).toLocaleString()}>
                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                {new Date(e.occurred_at).toLocaleString()}
                                                {e.notified === 0 && ' · no notificado'}
                                            </Text>
                                        </Tooltip>
                                    </Space>
                                ),
                            };
                        })}
                    />
                )}
            </div>
        </Card>
    );
}
