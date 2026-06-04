import { DatePicker, Segmented, Space } from 'antd';

const { RangePicker } = DatePicker;

const GRAIN_OPTIONS = [
    { value: 'day', label: 'Día' },
    { value: 'month', label: 'Mes' },
    { value: 'year', label: 'Año' },
];

const PICKER_BY_GRAIN = { day: undefined, month: 'month', year: 'year' };

const unitOf = (grain) => (grain === 'day' ? 'day' : grain);

export default function PeriodSelector({ grain, range, onChange, size = 'middle' }) {
    const handleGrain = (g) => {
        const u = unitOf(g);
        onChange({ grain: g, range: [range[0].startOf(u), range[1].endOf(u)] });
    };

    const handleRange = (vals) => {
        if (!vals || !vals[0] || !vals[1]) return;
        const u = unitOf(grain);
        onChange({ grain, range: [vals[0].startOf(u), vals[1].endOf(u)] });
    };

    return (
        <Space wrap size={12}>
            <Segmented options={GRAIN_OPTIONS} value={grain} onChange={handleGrain} size={size} />
            <RangePicker
                picker={PICKER_BY_GRAIN[grain]}
                value={range}
                onChange={handleRange}
                allowClear={false}
                size={size}
            />
        </Space>
    );
}
