import { Button, Space, Typography } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { SEMANTIC } from '@app/providers/brand';
import { colorDe, esMuerto } from '@features/inicio/helpers/roadmapLayout';

const { Text } = Typography;

export default function RoadmapTip({ tip, fijado, tipRef, onCerrar }) {
    const item = tip.item;
    const color = item.color || (esMuerto(item) ? SEMANTIC.danger : colorDe(item));

    return (
        <div
            ref={tipRef}
            style={{
                position: 'absolute',
                left: tip.x,
                top: tip.y,
                zIndex: 5,
                width: 320,
                pointerEvents: fijado ? 'auto' : 'none',
                background: '#fff',
                border: '1px solid rgba(5,5,5,0.1)',
                borderRadius: 8,
                boxShadow: '0 6px 20px -6px rgba(25,19,32,0.35)',
                padding: '10px 12px',
            }}
        >
            {fijado && (
                <Button
                    type="text"
                    size="small"
                    icon={<CloseOutlined />}
                    aria-label="Cerrar el detalle"
                    style={{ position: 'absolute', top: 4, right: 4 }}
                    onClick={onCerrar}
                />
            )}
            <Space orientation="vertical" size={2}>
                {item.antes && (
                    <Text type="secondary" style={{ fontSize: 11, textDecoration: 'line-through' }}>
                        {item.antes}
                    </Text>
                )}
                <Text strong style={{ fontSize: 15, color, paddingRight: fijado ? 22 : 0 }}>
                    {item.nombre || item.txt}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.fecha || item.nota}
                </Text>
                <Text style={{ fontSize: 13 }}>{item.motivo}</Text>
            </Space>
        </div>
    );
}
