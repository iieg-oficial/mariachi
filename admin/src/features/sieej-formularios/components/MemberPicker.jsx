import { Transfer } from 'antd';

export default function MemberPicker({ usuarios = [], value, onChange }) {
    const handleChange = (keys) => {
        onChange?.(keys);
    };

    const dataSource = usuarios.map((u) => ({
        key: u.id,
        title: u.name || u.username,
        description: u.email
            ? `${u.username}${u.name ? ` — ${u.email}` : ` · ${u.email}`}`
            : u.username,
    }));

    return (
        <Transfer
            dataSource={dataSource}
            titles={['Disponibles', 'Seleccionados']}
            targetKeys={value ?? []}
            onChange={handleChange}
            render={(item) => (
                <div>
                    <div>{item.title}</div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{item.description}</div>
                </div>
            )}
            showSearch
            filterOption={(inputValue, item) => {
                const q = inputValue.toLowerCase();
                return item.title.toLowerCase().includes(q)
                    || item.description.toLowerCase().includes(q);
            }}
            listStyle={{ width: 240, height: 320 }}
            selectAllLabels={[
                ({ selectedCount, totalCount }) => `${selectedCount}/${totalCount}`,
                ({ selectedCount, totalCount }) => `${selectedCount}/${totalCount}`,
            ]}
        />
    );
}
