import { TreeSelect } from 'antd';
import { useLayerTree } from '@features/mapalab-api-keys/hooks/useLayerTree';


export default function LayerTreeSelect({
    value,
    onChange,
    placeholder = 'Selecciona capas',
    disabled = false,
    allowGroups = false,
}) {
    const { treeData, loading } = useLayerTree();

    const filterValue = Array.isArray(value)
        ? value.filter((v) => allowGroups || !String(v).startsWith('__group_'))
        : [];

    return (
        <TreeSelect
            value={filterValue}
            onChange={onChange}
            treeData={treeData}
            loading={loading}
            disabled={disabled}
            placeholder={placeholder}
            multiple
            treeCheckable
            showCheckedStrategy="SHOW_CHILD"
            treeDefaultExpandAll={false}
            allowClear
            showSearch
            treeNodeFilterProp="title"
            style={{ width: '100%' }}
            maxTagCount="responsive"
            popupMatchSelectWidth={false}
            dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
        />
    );
}
