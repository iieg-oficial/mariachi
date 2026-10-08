import { useCallback, useEffect, useState } from 'react';
import { TreeSelect } from 'antd';
import { browseGeoserverFiles } from '@features/sextante/api/geoserverFilesService';
import { workspaceLabel } from '@features/sextante/utils/geoserverFiles';

const SIMPLE_MODE = { id: 'value', pId: 'parent', rootPId: null };

const rootNode = (workspace) => ({
    value: '',
    parent: null,
    title: workspaceLabel(workspace),
    isLeaf: false,
});

export default function FolderTreeSelect({ workspace = '', value, onChange, blockedPaths = [] }) {
    const [nodes, setNodes] = useState([rootNode(workspace)]);

    useEffect(() => {
        setNodes([rootNode(workspace)]);
    }, [workspace]);

    const isBlocked = useCallback(
        (path) => blockedPaths.some((blocked) => path === blocked || path.startsWith(`${blocked}/`)),
        [blockedPaths],
    );

    const loadChildren = useCallback(async ({ value: parent }) => {
        const data = await browseGeoserverFiles(parent, workspace);
        const children = data.folders.map((folder) => ({
            value: folder.path,
            parent,
            title: folder.name,
            isLeaf: false,
            disabled: isBlocked(folder.path),
        }));
        setNodes((prev) => {
            const known = new Set(prev.map((n) => n.value));
            const nuevos = children.filter((n) => !known.has(n.value));
            return nuevos.length ? [...prev, ...nuevos] : prev;
        });
    }, [workspace, isBlocked]);

    return (
        <TreeSelect
            style={{ width: '100%' }}
            value={value}
            onChange={onChange}
            treeData={nodes}
            treeDataSimpleMode={SIMPLE_MODE}
            loadData={loadChildren}
            placeholder="Selecciona la carpeta destino"
            treeDefaultExpandedKeys={['']}
        />
    );
}
