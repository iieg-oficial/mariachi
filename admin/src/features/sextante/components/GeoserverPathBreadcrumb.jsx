import { useMemo } from 'react';
import { Breadcrumb, Button, Typography } from 'antd';

const { Text } = Typography;

export default function GeoserverPathBreadcrumb({ currentPath, onNavigate }) {
    const items = useMemo(() => {
        const raw = [{ title: 'Raíz', path: '' }];
        let acc = '';
        for (const seg of currentPath ? currentPath.split('/') : []) {
            acc = acc ? `${acc}/${seg}` : seg;
            raw.push({ title: seg, path: acc });
        }
        return raw.map((c, idx) => ({
            title: idx === raw.length - 1
                ? <Text strong>{c.title}</Text>
                : (
                    <Button
                        type="link"
                        size="small"
                        onClick={() => onNavigate(c.path)}
                        style={{ padding: 0, height: 'auto' }}
                    >
                        {c.title}
                    </Button>
                ),
        }));
    }, [currentPath, onNavigate]);

    return <Breadcrumb items={items} />;
}
