import { useMemo, useState } from 'react';
import { Button, Drawer, Space, Tooltip, Typography } from 'antd';
import { InfoCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { DataSheetGrid, checkboxColumn, intColumn, keyColumn, textColumn } from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';
import SelectCell from '@shared/components/dataGrid/cells/SelectCell';
import { NODE_TYPE_OPTIONS } from '@features/mapalab-layers/constants/nodeTypes';
import api from '@shared/services/api';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';

const { Text } = Typography;

const FILAS_INICIALES = 20;

const AYUDA = 'Pega desde Excel a partir de cualquier celda; las filas se agregan solas. '
    + 'El padre es el «ID de la capa» del nodo que las contiene y puede ser una fila de este mismo lote '
    + 'si está más arriba. El ID se arma solo con padre y nombre. Se crean todas o ninguna.';

const GRID_STYLES = `
    .alta-capas-grid .dsg-cell-header { font-size: 12px; }
    .alta-capas-grid .alta-capas-error { background-color: #fff1f0; }
`;

const slug = (texto) => String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const filaVacia = () => ({
    parent_id: null,
    label: null,
    id: null,
    idManual: false,
    node_type: 'category',
    sort_order: null,
    hidden_in_menu: false,
    workspace_alias: null,
    geoserver_layer: null,
});

const filasIniciales = () => Array.from({ length: FILAS_INICIALES }, filaVacia);

const tieneNombre = (fila) => Boolean(String(fila.label || '').trim());

const asignarIds = (filas) => {
    const tomados = new Set(filas.filter((f) => f.idManual && f.id).map((f) => f.id));
    return filas.map((fila) => {
        if (fila.idManual || !tieneNombre(fila)) return fila.idManual ? fila : { ...fila, id: null };
        const base = slug([fila.parent_id, fila.label].filter(Boolean).join('-')).slice(0, 100);
        let candidato = base;
        for (let n = 2; tomados.has(candidato); n += 1) {
            const cola = `-${n}`;
            candidato = base.slice(0, 100 - cola.length) + cola;
        }
        tomados.add(candidato);
        return { ...fila, id: candidato };
    });
};

const textoONulo = (valor) => String(valor ?? '').trim() || null;

const nodeTypeColumn = {
    component: SelectCell,
    columnData: { options: NODE_TYPE_OPTIONS },
    disableKeys: true,
    keepFocus: true,
    deleteValue: () => null,
    copyValue: ({ rowData }) => rowData ?? '',
    pasteValue: ({ value }) => {
        const texto = String(value).trim().toLowerCase();
        const match = NODE_TYPE_OPTIONS.find(
            (o) => o.value === texto || o.label.toLowerCase() === texto,
        );
        return match ? match.value : null;
    },
};

const columna = (key, tipo, title, width) => ({
    ...keyColumn(key, tipo),
    title,
    minWidth: width,
    basis: width,
    grow: 0,
});

export default function AltaCapasDrawer({ open, onClose, onCreated }) {
    const { isMobile } = useIsMobile();
    const [filas, setFilas] = useState(filasIniciales);
    const [errores, setErrores] = useState({});
    const [enviando, setEnviando] = useState(false);

    const conNombre = useMemo(() => filas.filter(tieneNombre).length, [filas]);

    const columns = useMemo(() => {
        const errorClass = ({ rowIndex }) => (errores[rowIndex] ? 'alta-capas-error' : undefined);
        return [
            columna('parent_id', textColumn, 'Padre (ID)', 200),
            columna('label', textColumn, 'Nombre', 240),
            columna('id', textColumn, 'ID de la capa', 260),
            columna('node_type', nodeTypeColumn, 'Tipo de nodo', 130),
            columna('sort_order', intColumn, 'Orden', 80),
            columna('hidden_in_menu', checkboxColumn, 'Oculta en menu', 120),
            columna('workspace_alias', textColumn, 'Workspace', 140),
            columna('geoserver_layer', textColumn, 'Capa de GeoServer', 220),
            {
                ...columna('error', textColumn, 'Error', 320),
                disabled: true,
                cellClassName: errorClass,
            },
        ].map((col) => ({ cellClassName: errorClass, ...col }));
    }, [errores]);

    const filasConError = useMemo(
        () => filas.map((fila, i) => ({ ...fila, error: errores[i] || null })),
        [filas, errores],
    );

    const handleChange = (siguientes) => {
        const marcadas = siguientes.map((fila, i) => {
            const previa = filas[i];
            if (previa && fila.id !== previa.id) return { ...fila, idManual: Boolean(fila.id) };
            return fila;
        });
        setFilas(asignarIds(marcadas));
    };

    const cerrar = () => {
        setFilas(filasIniciales());
        setErrores({});
        onClose();
    };

    const crear = async () => {
        const indices = filas.map((fila, i) => (tieneNombre(fila) ? i : null)).filter((i) => i !== null);
        const capas = indices.map((i, orden) => {
            const fila = filas[i];
            return {
                id: fila.id,
                parent_id: textoONulo(fila.parent_id),
                label: fila.label.trim(),
                node_type: fila.node_type || 'category',
                sort_order: fila.sort_order ?? orden,
                hidden_in_menu: Boolean(fila.hidden_in_menu),
                workspace_alias: textoONulo(fila.workspace_alias),
                geoserver_layer: textoONulo(fila.geoserver_layer),
            };
        });
        setEnviando(true);
        setErrores({});
        try {
            const res = await api.post('/layers/lote', { capas });
            message.success(`${res.data.creadas} nodos creados`);
            onCreated?.();
            cerrar();
        } catch (err) {
            const detail = err.response?.data?.detail;
            if (detail?.errores) {
                const porFila = {};
                detail.errores.forEach((e) => { porFila[indices[e.fila]] = e.detail; });
                setErrores(porFila);
                message.error(`${detail.errores.length} filas con error; no se creó ninguna`);
            } else {
                message.error(typeof detail === 'string' ? detail : 'No se pudieron crear los nodos');
            }
        } finally {
            setEnviando(false);
        }
    };

    return (
        <Drawer
            title={(
                <Space size={6}>
                    Agregar nodos
                    <Tooltip title={AYUDA}>
                        <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                    </Tooltip>
                </Space>
            )}
            placement={isMobile ? 'bottom' : 'right'}
            styles={{ wrapper: isMobile ? { width: '100%', height: '92%' } : { width: 'min(1200px, 92vw)' } }}
            open={open}
            onClose={cerrar}
            destroyOnHidden
            extra={(
                <Space size={8}>
                    <Button
                        shape="round"
                        icon={<PlusOutlined />}
                        onClick={() => setFilas((prev) => [...prev, ...Array.from({ length: 10 }, filaVacia)])}
                    >
                        10 filas
                    </Button>
                    <Button
                        shape="round"
                        type="primary"
                        loading={enviando}
                        disabled={!conNombre}
                        onClick={crear}
                    >
                        {conNombre ? `Crear ${conNombre}` : 'Crear'}
                    </Button>
                </Space>
            )}
        >
            <style>{GRID_STYLES}</style>
            <DataSheetGrid
                className="alta-capas-grid"
                value={filasConError}
                columns={columns}
                onChange={handleChange}
                createRow={filaVacia}
                duplicateRow={({ rowData }) => ({ ...rowData, id: null, idManual: false })}
                addRowsComponent={false}
                height={isMobile ? 420 : 640}
            />
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                Las filas sin nombre se ignoran.
            </Text>
        </Drawer>
    );
}
