import { useMemo } from 'react';
import { Breadcrumb, Button, Typography } from 'antd';

const { Text } = Typography;

export default function GeoserverPathBreadcrumb({ scopeName, currentPath, onRoot, onNavigate }) {
    const items = useMemo(() => {
        const raw = [{ title: 'Recursos', go: onRoot }];
        if (scopeName) {
            raw.push({ title: scopeName, go: () => onNavigate('') });
            let acc = '';
            for (const seg of currentPath ? currentPath.split('/') : []) {
                const path = acc ? `${acc}/${seg}` : seg;
                acc = path;
                raw.push({ title: seg, go: () => onNavigate(path) });
            }
        }
        return raw.map((c, idx) => ({
            title: idx === raw.length - 1
                ? <Text strong>{c.title}</Text>
                : (
                    <Button
                        type="link"
                        size="small"
                        onClick={c.go}
                        style={{ padding: 0, height: 'auto' }}
                    >
                        {c.title}
                    </Button>
                ),
        }));
    }, [scopeName, currentPath, onRoot, onNavigate]);

    return <Breadcrumb items={items} />;
}
