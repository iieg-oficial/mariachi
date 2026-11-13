import { useMemo, useState } from 'react';
import { Button, Input, Tree, Typography } from 'antd';
import { DownOutlined, SearchOutlined } from '@ant-design/icons';
import { NODE_TYPE_LABELS } from '@features/mapalab-layers/constants/nodeTypes';
import { RAIZ, rutaDeNodo } from '@features/mapalab-layers/utils/treeSelect';
import { findPath } from '@features/mapalab-layers/utils/treeSearch';

const { Text } = Typography;
const PADRES = ['tema', 'category', 'group'];

const podar = (nodos, q) => (nodos || []).flatMap((n) => {
    if (!PADRES.includes(n.nodeType)) return [];
    const hijos = podar(n.children, q);
    const coincide = !q || String(n.title || '').toLowerCase().includes(q);
    if (!coincide && !hijos.length) return [];
    return [{ key: n.key, title: n.title, tipo: NODE_TYPE_LABELS[n.nodeType], children: hijos.length ? hijos : undefined }];
});

const claves = (nodos) => nodos.flatMap((n) => [n.key, ...claves(n.children || [])]);

const ancestros = (treeData, id) => (findPath(treeData, id) || []).map((n) => n.key);

export default function ParentTreePicker({ value, onChange, treeData }) {
    const [abierto, setAbierto] = useState(false);
    const [q, setQ] = useState('');
    const [expandidos, setExpandidos] = useState([]);
    const padreId = value && value !== RAIZ ? value : null;
    const ruta = rutaDeNodo(treeData, padreId) || 'la raíz del árbol';

    const datos = useMemo(() => [
        { key: RAIZ, title: 'Raíz del árbol', tipo: 'Sin padre' },
        ...podar(treeData, q.trim().toLowerCase()),
    ], [treeData, q]);

    const alternar = () => {
        if (!abierto) setExpandidos(ancestros(treeData, padreId));
        setAbierto((v) => !v);
    };

    const buscar = (texto) => {
        setQ(texto);
        const limpio = texto.trim().toLowerCase();
        setExpandidos(limpio ? claves(podar(treeData, limpio)) : ancestros(treeData, padreId));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <Text type="secondary" style={{ fontSize: 12.5 }}>Dentro de <strong>{ruta}</strong></Text>
                <Button type="link" size="small" style={{ padding: 0 }} onClick={alternar} aria-expanded={abierto}>
                    Cambiar ubicación <DownOutlined rotate={abierto ? 180 : 0} style={{ fontSize: 10 }} />
                </Button>
            </div>
            {abierto && (
                <div style={{ background: '#F7F8FA', borderRadius: 10, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Input
                        allowClear
                        prefix={<SearchOutlined />}
                        placeholder="Buscar nodo"
                        value={q}
                        onChange={(e) => buscar(e.target.value)}
                    />
                    <Tree
                        blockNode
                        height={260}
                        treeData={datos}
                        selectedKeys={[padreId || RAIZ]}
                        expandedKeys={expandidos}
                        onExpand={(keys) => setExpandidos(keys)}
                        onSelect={(keys) => { if (keys[0]) onChange?.(keys[0]); }}
                        style={{ background: 'transparent' }}
                        titleRender={(n) => (
                            <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                <span>{n.title}</span>
                                <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>{n.tipo}</Text>
                            </span>
                        )}
                    />
                </div>
            )}
        </div>
    );
}
