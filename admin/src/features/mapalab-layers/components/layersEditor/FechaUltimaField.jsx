import { useMemo } from 'react';
import { Button, DatePicker, Segmented, Space, Typography } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;

const ES_ANIO = /^\d{4}$/;
const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export default function FechaUltimaField({ value, onChange, sugerida }) {
    const modo = ES_FECHA.test(value || '') ? 'fecha' : 'anio';

    const valorDayjs = useMemo(() => {
        if (ES_FECHA.test(value || '')) return dayjs(value, 'YYYY-MM-DD');
        if (ES_ANIO.test(value || '')) return dayjs(value, 'YYYY');
        return null;
    }, [value]);

    const cambiarModo = (siguiente) => {
        if (!valorDayjs) return;
        onChange(siguiente === 'anio' ? valorDayjs.format('YYYY') : valorDayjs.format('YYYY-MM-DD'));
    };

    return (
        <Space orientation="vertical" size={8} style={{ width: '100%' }}>
            <Space size={8} wrap>
                <Segmented
                    size="small"
                    value={modo}
                    onChange={cambiarModo}
                    options={[
                        { value: 'anio', label: 'Solo año' },
                        { value: 'fecha', label: 'Fecha exacta' },
                    ]}
                />
                <DatePicker
                    picker={modo === 'anio' ? 'year' : 'date'}
                    value={valorDayjs}
                    onChange={(d) => onChange(
                        d ? d.format(modo === 'anio' ? 'YYYY' : 'YYYY-MM-DD') : null,
                    )}
                    placeholder={modo === 'anio' ? 'Elige el año' : 'Elige la fecha'}
                />
            </Space>

            {sugerida && sugerida !== value && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Último dato registrado:{' '}
                    <Button type="link" size="small" style={{ padding: 0 }} onClick={() => onChange(sugerida)}>
                        {sugerida}
                    </Button>
                </Text>
            )}
        </Space>
    );
}
