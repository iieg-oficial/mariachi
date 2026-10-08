import { useEffect, useState } from 'react';
import { Alert, DatePicker, Select, Space, Typography } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;

const StatsPreviewContext = ({ value, onChange, listMunicipios }) => {
    const [municipios, setMunicipios] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        listMunicipios()
            .then((data) => { if (!cancelled) setMunicipios(data || []); })
            .catch(() => { if (!cancelled) setError('No se pudo cargar la lista de municipios'); });
        return () => { cancelled = true; };
    }, [listMunicipios]);

    const set = (patch) => onChange({ ...value, ...patch });
    const { municipio = [], fechaInicio = null, fechaFin = null } = value || {};
    const activo = municipio.length > 0 || fechaInicio || fechaFin;

    return (
        <Space orientation="vertical" size={6} style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
                Simula lo que mandaría el visor. Sólo afecta la vista previa: no cambia lo que se guarda
                ni lo que recalcula el cron.
            </Text>
            <Space.Compact style={{ width: '100%' }}>
                <Select
                    size="small"
                    mode="multiple"
                    style={{ width: '55%' }}
                    placeholder="Municipio (ninguno = estatal)"
                    value={municipio}
                    onChange={(v) => set({ municipio: v })}
                    options={municipios.map((m) => ({ value: m.clave, label: m.nombre }))}
                    optionFilterProp="label"
                    maxTagCount={2}
                    allowClear
                    showSearch
                />
                <DatePicker.RangePicker
                    size="small"
                    style={{ width: '45%' }}
                    value={fechaInicio && fechaFin ? [dayjs(fechaInicio), dayjs(fechaFin)] : null}
                    onChange={(dates) => set({
                        fechaInicio: dates ? dates[0].format('YYYY-MM-DD') : null,
                        fechaFin: dates ? dates[1].format('YYYY-MM-DD') : null,
                    })}
                />
            </Space.Compact>
            {error && <Alert type="warning" showIcon title={error} />}
            {!activo && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Sin contexto: las condiciones que dependen del visor se omiten y el valor sale estatal
                    e histórico, igual que lo que persiste el cron.
                </Text>
            )}
        </Space>
    );
};

export default StatsPreviewContext;
