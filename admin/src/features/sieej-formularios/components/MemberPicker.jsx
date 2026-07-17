import { Select, Transfer } from 'antd';
import useIsMobile from '@shared/hooks/useIsMobile';

export default function MemberPicker({ usuarios = [], value, onChange }) {
    const { isMobile } = useIsMobile();

    const dataSource = usuarios.map((u) => ({
        key: u.id,
        title: u.name || u.username,
        description: u.email
            ? `${u.username}${u.name ? ` — ${u.email}` : ` · ${u.email}`}`
            : u.username,
    }));

    if (isMobile) {
        return (
            <Select
                mode="multiple"
                style={{ width: '100%' }}
                placeholder="Buscar usuarios"
                value={value ?? []}
                onChange={onChange}
                filterOption={(input, option) =>
                    option.label.toLowerCase().includes(input.toLowerCase())
                }
                options={usuarios.map((u) => ({
                    value: u.id,
                    label: u.name || u.username,
                }))}
            />
        );
    }

    return (
        <Transfer
            dataSource={dataSource}
            titles={['Disponibles', 'Seleccionados']}
            targetKeys={value ?? []}
            onChange={onChange}
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
            listStyle={{ flex: 1, height: 320 }}
            selectAllLabels={[
                ({ selectedCount, totalCount }) => `${selectedCount}/${totalCount}`,
                ({ selectedCount, totalCount }) => `${selectedCount}/${totalCount}`,
            ]}
        />
    );
}
