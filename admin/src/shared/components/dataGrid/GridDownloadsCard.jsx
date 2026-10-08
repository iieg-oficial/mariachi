import { useState } from 'react';
import { Button, Card, Segmented, Space, Typography } from 'antd';
import { EXPORT_ITEMS } from '@shared/components/dataGrid/exportItems';
import useGridExport from '@shared/components/dataGrid/useGridExport';

const { Text } = Typography;

export default function GridDownloadsCard({ resources = [], style }) {
    const [activo, setActivo] = useState(resources[0]?.value);
    const { exporting, runExport } = useGridExport();

    const rejilla = resources.find((r) => r.value === activo) || resources[0];
    if (!rejilla) return null;

    return (
        <Card size="small" title="Descargas" style={style}>
            <Space orientation="vertical" size={10} style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    El Excel trae los datos y el historial en dos pestañas; los CSV bajan por separado.
                </Text>
                {resources.length > 1 && (
                    <Segmented
                        size="small"
                        value={rejilla.value}
                        onChange={setActivo}
                        options={resources.map((r) => ({ label: r.label, value: r.value }))}
                    />
                )}
                <Space wrap size={8}>
                    {EXPORT_ITEMS.map((item) => (
                        <Button
                            key={item.key}
                            icon={item.icon}
                            loading={exporting === item.key}
                            disabled={exporting !== null && exporting !== item.key}
                            onClick={() => runExport(rejilla.value, item.key, {
                                fileName: rejilla.fileName || rejilla.value,
                            })}
                        >
                            {item.label}
                        </Button>
                    ))}
                </Space>
            </Space>
        </Card>
    );
}
