import { useEffect, useMemo, useState } from 'react';
import { Alert, Form, Select, Spin } from 'antd';
import { MUNICIPIO_FIELD_TYPE_OPTIONS } from '@features/mapalab-layers/constants/nodeTypes';

const CLAVE_PATTERN = /^14\d{3}$/;
const NAME_PATTERN = /[A-Za-zÁÉÍÓÚÑáéíóúñ]/;

const findNodeInTree = (tree, layerId) => {
    if (!Array.isArray(tree)) return null;
    for (const node of tree) {
        if (node?.id === layerId) return node;
        const found = findNodeInTree(node?.children, layerId);
        if (found) return found;
    }
    return null;
};

const collectDescendantLeavesWithWms = (node, acc = []) => {
    if (!node) return acc;
    const ws = node.wmsConfig?.workspace || node.workspaceAlias;
    const gs = node.wmsConfig?.geoserverLayer || node.geoserverLayer;
    if (ws && gs) acc.push({ workspaceAlias: ws, geoserverLayer: gs, id: node.id });
    (node.children || []).forEach(c => collectDescendantLeavesWithWms(c, acc));
    return acc;
};

const detectFieldKind = (samples) => {
    if (!Array.isArray(samples) || samples.length === 0) {
        return { type: null, confidence: 0, reason: 'sin-muestras' };
    }
    const cleaned = samples
        .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
        .map(v => String(v).trim());
    if (cleaned.length === 0) return { type: null, confidence: 0, reason: 'todas-vacias' };

    const claveMatches = cleaned.filter(v => CLAVE_PATTERN.test(v)).length;
    const nameMatches = cleaned.filter(v => NAME_PATTERN.test(v) && !/^\d+$/.test(v)).length;

    const claveRatio = claveMatches / cleaned.length;
    const nameRatio = nameMatches / cleaned.length;

    if (claveRatio >= 0.8) return { type: 'clave', confidence: claveRatio, reason: 'patrón 14NNN dominante' };
    if (nameRatio >= 0.8) return { type: 'nombre', confidence: nameRatio, reason: 'texto alfabético dominante' };
    return { type: null, confidence: Math.max(claveRatio, nameRatio), reason: 'no encaja en patrón conocido' };
};

const MunicipioFieldPicker = ({
    workspaceAlias,
    geoserverLayer,
    listFields,
    form,
    rawTree = null,
    layerId = null,
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fields, setFields] = useState([]);
    const [samples, setSamples] = useState({});

    const resolved = useMemo(() => {
        if (workspaceAlias && geoserverLayer) {
            return { workspaceAlias, geoserverLayer, descendantCount: 0, inheritedFrom: null };
        }
        if (!rawTree || !layerId) return null;
        const node = findNodeInTree(rawTree, layerId);
        if (!node) return null;
        const leaves = collectDescendantLeavesWithWms(node);
        if (leaves.length === 0) return null;
        const first = leaves[0];
        return {
            workspaceAlias: first.workspaceAlias,
            geoserverLayer: first.geoserverLayer,
            descendantCount: leaves.length,
            inheritedFrom: first.id,
        };
    }, [workspaceAlias, geoserverLayer, rawTree, layerId]);

    useEffect(() => {
        if (!resolved || !listFields) {
            setFields([]);
            setSamples({});
            return undefined;
        }
        let cancelled = false;
        setLoading(true);
        setError(null);
        listFields(resolved.workspaceAlias, resolved.geoserverLayer, { includeSamples: true })
            .then(data => {
                if (cancelled) return;
                setFields(Array.isArray(data?.fields) ? data.fields : []);
                setSamples(data?.sampleValues || {});
            })
            .catch(err => {
                if (cancelled) return;
                setError(err?.response?.data?.detail || err?.message || 'No se pudieron cargar columnas');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [resolved, listFields]);

    const fieldOptions = useMemo(() => {
        return fields
            .filter(f => f.name && ['string', 'integer', 'number'].includes(f.type))
            .map(f => ({ value: f.name, label: `${f.name} (${f.type})` }));
    }, [fields]);

    const currentField = Form.useWatch('municipioField', form);
    const detection = useMemo(() => {
        if (!currentField || !samples[currentField]) {
            return { type: null, confidence: 0, reason: null };
        }
        return detectFieldKind(samples[currentField]);
    }, [currentField, samples]);

    useEffect(() => {
        if (!currentField || !detection.type) return;
        const currentType = form.getFieldValue('municipioFieldType');
        if (!currentType) {
            form.setFieldsValue({ municipioFieldType: detection.type });
        }
    }, [currentField, detection.type, form]);

    const sampleList = currentField && Array.isArray(samples[currentField])
        ? samples[currentField].slice(0, 5)
        : [];

    return (
        <>
            {resolved?.descendantCount > 0 && (
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    title={`Este nodo no tiene capa propia. La configuración aplicará a ${resolved.descendantCount} capa(s) descendiente(s) que heredan la metadata vía el árbol.`}
                    description={`Columnas detectadas leyendo el feature type de '${resolved.workspaceAlias}:${resolved.geoserverLayer}' (primer descendiente con WMS). Asume que todas las propiedades hijas comparten el mismo schema de columnas.`}
                />
            )}
            {!resolved && (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                    title="No se puede inferir la capa WMS"
                    description="Este nodo no tiene workspace/geoserver_layer propio ni descendientes con uno. Asigna primero una capa WMS o configura este filtro en una hoja descendiente."
                />
            )}
            <Form.Item
                label="Campo de municipio"
                name="municipioField"
                rules={[{ required: true, message: 'Selecciona la columna' }]}
                extra={
                    loading
                        ? 'Cargando columnas de la tabla…'
                        : error
                            ? `No se pudieron cargar columnas: ${error}. Puedes escribir el nombre manualmente.`
                            : 'Columna de la tabla en PostGIS que identifica al municipio. Se infiere el tipo según los valores leídos.'
                }
            >
                {fieldOptions.length > 0 ? (
                    <Select
                        options={fieldOptions}
                        placeholder="Selecciona una columna"
                        showSearch
                        allowClear
                        loading={loading}
                        optionFilterProp="label"
                    />
                ) : (
                    <Select
                        mode="tags"
                        maxTagCount={1}
                        placeholder={loading ? 'Cargando…' : 'Escribe el nombre del campo'}
                        loading={loading}
                        notFoundContent={loading ? <Spin size="small" /> : null}
                    />
                )}
            </Form.Item>
            {currentField && sampleList.length > 0 && (
                <div style={{ marginTop: -12, marginBottom: 16, fontSize: 12, color: '#8c8c8c' }}>
                    Muestra: <code>{sampleList.map(v => String(v)).join(', ')}</code>
                </div>
            )}
            {currentField && detection.type === null && !loading && (
                <Alert
                    type="warning"
                    showIcon
                    closable
                    style={{ marginBottom: 16 }}
                    title="Esta columna no parece ser de municipio"
                    description={`Los valores leídos (${sampleList.slice(0, 3).map(v => `'${v}'`).join(', ')}…) no coinciden con el patrón de clave INEGI (14NNN) ni con nombres de municipio. Verifica que la columna sea la correcta o ajusta el tipo manualmente.`}
                />
            )}
            {currentField && detection.type && (
                <Alert
                    type="success"
                    showIcon
                    closable
                    style={{ marginBottom: 16 }}
                    title={`Tipo detectado: ${detection.type === 'clave' ? 'Clave INEGI' : 'Nombre'}`}
                    description={`${Math.round(detection.confidence * 100)}% de las muestras encajan (${detection.reason}). El tipo se preseleccionó; puedes cambiarlo abajo si es necesario.`}
                />
            )}
            <Form.Item
                label="Tipo de valor del campo"
                name="municipioFieldType"
                rules={[{ required: true, message: 'Selecciona el tipo' }]}
                extra="El visor genera CQL distinto según esto: 'clave' produce `<field> IN ('14039',…)`; 'nombre' produce `<field> IN ('Guadalajara',…)`."
            >
                <Select options={MUNICIPIO_FIELD_TYPE_OPTIONS} placeholder="Selecciona tipo" />
            </Form.Item>
        </>
    );
};

export default MunicipioFieldPicker;
