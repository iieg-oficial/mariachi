import { AppstoreOutlined, EnvironmentOutlined, FolderOutlined, GroupOutlined, TagOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { BRAND } from '@app/providers/brand';
import { NODE_TYPE_HELP, NODE_TYPE_LABELS, NODE_TYPE_OPTIONS } from '@features/mapalab-layers/constants/nodeTypes';

const ICONOS = {
    tema: <AppstoreOutlined />,
    category: <FolderOutlined />,
    label: <TagOutlined />,
    group: <GroupOutlined />,
    leaf: <EnvironmentOutlined />,
};

const RESUMEN = {
    tema: 'Agrupa',
    category: 'Subgrupo',
    label: 'Separador',
    group: 'Capa con hijas',
    leaf: 'Se enciende',
};

const SOLO_CAPAS = 'Bajo un grupo solo caben capas, que cuentan como sus propiedades.';

const cardStyle = (activa, bloqueada) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '10px 4px 8px',
    borderRadius: 10,
    border: `1px solid ${activa ? BRAND.numeralia : '#E2E4EA'}`,
    background: activa ? '#EAEFFA' : '#fff',
    color: bloqueada ? 'rgba(0,0,0,0.35)' : '#191919',
    cursor: bloqueada ? 'not-allowed' : 'pointer',
    opacity: bloqueada ? 0.55 : 1,
    width: '100%',
});

export default function NodeTypeCards({ value, onChange, parentNodeType }) {
    const soloCapas = parentNodeType === 'group';

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {NODE_TYPE_OPTIONS.map((opcion) => {
                const bloqueada = soloCapas && opcion.value !== 'leaf';
                const activa = value === opcion.value;
                const ayuda = bloqueada ? SOLO_CAPAS : NODE_TYPE_HELP[opcion.value]?.body;
                return (
                    <Tooltip key={opcion.value} title={ayuda} styles={{ root: { maxWidth: 280 } }}>
                        <button
                            type="button"
                            disabled={bloqueada}
                            aria-pressed={activa}
                            aria-label={NODE_TYPE_LABELS[opcion.value]}
                            onClick={() => onChange?.(opcion.value)}
                            style={cardStyle(activa, bloqueada)}
                        >
                            <span style={{ fontSize: 18, color: activa ? BRAND.numeralia : '#7385ab' }}>
                                {ICONOS[opcion.value]}
                            </span>
                            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{opcion.label}</span>
                            <span style={{ fontSize: 10.5, color: '#667085', lineHeight: 1.2 }}>
                                {RESUMEN[opcion.value]}
                            </span>
                        </button>
                    </Tooltip>
                );
            })}
        </div>
    );
}
