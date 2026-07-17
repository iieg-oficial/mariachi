import { Descriptions, Typography } from 'antd';

export function SeccionContenido({ sec }) {
    if (sec.repeater) {
        if (sec.items.length === 0) {
            return <Typography.Text type="secondary">Sin elementos</Typography.Text>;
        }
        return sec.items.map((item, idx) => (
            <Descriptions
                key={item.key}
                size="small"
                bordered
                column={1}
                title={`#${idx + 1}`}
                style={{ marginBottom: 12 }}
                items={item.entries.map((e) => ({ key: e.key, label: e.label, children: e.value }))}
            />
        ));
    }
    return (
        <Descriptions
            size="small"
            bordered
            column={1}
            items={sec.entries.map((e) => ({ key: e.key, label: e.label, children: e.value }))}
        />
    );
}
