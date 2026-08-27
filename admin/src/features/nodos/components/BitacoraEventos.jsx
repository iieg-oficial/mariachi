import { Empty, Timeline, Typography } from 'antd';
import { SEMANTIC } from '@app/providers/brand';

const { Text } = Typography;

const COLOR_EVENTO = {
    down: SEMANTIC.danger,
    unreachable: SEMANTIC.danger,
    degraded: SEMANTIC.warning,
    ok: SEMANTIC.success,
};

const LEYENDA = {
    down: 'cayó',
    unreachable: 'dejó de responder',
    degraded: 'se degradó',
    ok: 'volvió a operar',
};

const cuando = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
};

export default function BitacoraEventos({ eventos }) {
    if (!eventos?.length) {
        return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin transiciones registradas" />;
    }

    const items = eventos.map((evento) => ({
        color: COLOR_EVENTO[evento.to_status] || SEMANTIC.neutral,
        children: (
            <div>
                <Text strong style={{ fontFamily: 'monospace' }}>{evento.slug}</Text>
                {' '}
                <Text>{LEYENDA[evento.to_status] || evento.to_status}</Text>
                {evento.from_status && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{` (venía de ${evento.from_status})`}</Text>
                )}
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>{cuando(evento.occurred_at)}</Text>
                {evento.detail && (
                    <>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>{evento.detail}</Text>
                    </>
                )}
            </div>
        ),
    }));

    return <Timeline items={items} style={{ marginTop: 8 }} />;
}
