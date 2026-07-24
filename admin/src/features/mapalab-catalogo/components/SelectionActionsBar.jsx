import { useState } from 'react';
import { Button, Popconfirm, Segmented, Select, Space, Typography } from 'antd';
import { DeleteOutlined, TagsOutlined } from '@ant-design/icons';

const { Text } = Typography;

const SelectionActionsBar = ({
    count,
    instituciones = [],
    tagOptions = [],
    busy,
    onUpdate,
    onDelete,
    onCancel,
}) => {
    const [tags, setTags] = useState([]);
    const [tagsMode, setTagsMode] = useState('add');

    const aplicarTags = async () => {
        if (!tags.length) return;
        await onUpdate({ searchTags: tags, tagsMode });
        setTags([]);
    };

    return (
        <div
            style={{
                position: 'sticky',
                top: 64,
                zIndex: 9,
                background: '#fff',
                paddingTop: 12,
                marginBottom: 12,
            }}
        >
            <div
                style={{
                    padding: '10px 12px',
                    background: '#fff',
                    border: '1px solid #f0f0f0',
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0, 21, 41, 0.08)',
                }}
            >
                <Space wrap>
                    <Text strong>{count} seleccionada(s)</Text>

                    <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        style={{ width: 220 }}
                        placeholder="Asignar institución"
                        value={null}
                        disabled={busy || !instituciones.length}
                        options={[
                            ...instituciones.map((i) => ({ value: i.id, label: i.nombre })),
                            { value: null, label: 'Sin institución' },
                        ]}
                        onChange={(institucionId) => onUpdate({ institucionId: institucionId ?? null })}
                    />

                    <Select
                        style={{ width: 150 }}
                        placeholder="Habilitada"
                        value={null}
                        disabled={busy}
                        options={[
                            { value: true, label: 'Habilitar' },
                            { value: false, label: 'Deshabilitar' },
                        ]}
                        onChange={(enabled) => onUpdate({ enabled })}
                    />

                    <Space.Compact>
                        <Select
                            mode="tags"
                            tokenSeparators={[',']}
                            style={{ minWidth: 220 }}
                            placeholder="Etiquetas de búsqueda"
                            value={tags}
                            onChange={setTags}
                            disabled={busy}
                            options={tagOptions.map((t) => ({ value: t, label: t }))}
                        />
                        <Segmented
                            value={tagsMode}
                            onChange={setTagsMode}
                            disabled={busy}
                            options={[
                                { value: 'add', label: 'Sumar' },
                                { value: 'replace', label: 'Reemplazar' },
                            ]}
                        />
                        <Button
                            icon={<TagsOutlined />}
                            disabled={busy || !tags.length}
                            onClick={aplicarTags}
                        >
                            Aplicar
                        </Button>
                    </Space.Compact>

                    <Popconfirm
                        title={`¿Eliminar ${count} capa(s) del catálogo?`}
                        okText="Eliminar"
                        cancelText="Cancelar"
                        okButtonProps={{ danger: true }}
                        onConfirm={onDelete}
                    >
                        <Button danger icon={<DeleteOutlined />} loading={busy}>Eliminar</Button>
                    </Popconfirm>

                    <Button type="text" onClick={onCancel}>Cancelar selección</Button>
                </Space>
            </div>
        </div>
    );
};

export default SelectionActionsBar;
