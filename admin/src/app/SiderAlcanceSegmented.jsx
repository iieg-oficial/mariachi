import { ConfigProvider, Segmented } from 'antd';
import { GlobalOutlined, HomeOutlined } from '@ant-design/icons';
import { ALCANCE_EN_LINEA, ALCANCE_LOCAL } from '@app/sider-alcance';

const OPCIONES = [
    { value: ALCANCE_EN_LINEA, label: 'En línea', icon: <GlobalOutlined /> },
    { value: ALCANCE_LOCAL, label: 'Local', icon: <HomeOutlined /> },
];

const TEMA = {
    components: {
        Segmented: {
            trackBg: '#25365b',
            itemColor: 'rgba(255, 255, 255, 0.7)',
            itemHoverColor: '#fff',
            itemHoverBg: 'rgba(255, 255, 255, 0.08)',
            itemActiveBg: 'rgba(255, 255, 255, 0.12)',
            itemSelectedBg: '#4a6494',
            itemSelectedColor: '#fff',
        },
    },
};

export default function SiderAlcanceSegmented({ value, onChange, collapsed }) {
    const opciones = collapsed
        ? OPCIONES.map(({ label, ...opcion }) => ({ ...opcion, tooltip: { title: label, placement: 'right' } }))
        : OPCIONES;

    return (
        <div style={{ padding: collapsed ? '0 12px 12px' : '0 16px 12px' }}>
            <ConfigProvider theme={TEMA}>
                <Segmented
                    block
                    vertical={collapsed}
                    value={value}
                    onChange={onChange}
                    options={opciones}
                    aria-label="Menú del panel"
                />
            </ConfigProvider>
        </div>
    );
}
