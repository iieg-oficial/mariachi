import { useEffect, useRef, useState } from 'react';
import { Button, Empty, Form, Input, Space, Switch, Tabs, Typography } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, LinkOutlined, PlusOutlined } from '@ant-design/icons';
import api from '@shared/services/api';
import ImageUrlField from '@features/mapalab-home/components/ImageUrlField';
import LayerIdsField from '@features/mapalab-home/components/LayerIdsField';
import { message } from '@shared/services/message';

const { Text } = Typography;

function extractShareId(link) {
    if (!link || typeof link !== 'string') return null;
    const m = link.match(/[?&]s=([a-zA-Z0-9]+)/);
    return m ? m[1] : null;
}

async function pinPermanente(shareId) {
    try {
        await api.post(`/mapalab-shares/${shareId}/pin-permanent`);
        return true;
    } catch (err) {
        message.error(err?.response?.data?.detail || 'No se pudo marcar como permanente');
        return false;
    }
}

async function unpinPermanente(shareId) {
    try {
        await api.delete(`/mapalab-shares/${shareId}/pin-permanent`);
        return true;
    } catch {
        return false;
    }
}

function newId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ItemListEditor({ name, label, addLabel, renderFields, tabKeyField = 'titulo', maxItems = null }) {
    const [activeKey, setActiveKey] = useState(null);

    return (
        <Form.List name={name}>
            {(fields, { add, remove, move }) => {
                const atCapacity = maxItems != null && fields.length >= maxItems;
                const handleAdd = () => {
                    if (atCapacity) return;
                    add({ id: newId(), orden: fields.length });
                };
                const handleRemove = (fieldKey, fieldName) => {
                    remove(fieldName);
                    if (String(activeKey) === String(fieldKey)) {
                        setActiveKey(null);
                    }
                };

                if (fields.length === 0) {
                    return (
                        <Space orientation="vertical" style={{ width: '100%', alignItems: 'center', padding: 16 }}>
                            <Empty description={`Sin ${label.toLowerCase()}s`} />
                            <Button type="dashed" icon={<PlusOutlined />} onClick={handleAdd}>{addLabel}</Button>
                        </Space>
                    );
                }

                const currentKey = activeKey != null && fields.some((f) => String(f.key) === String(activeKey))
                    ? String(activeKey)
                    : String(fields[0].key);

                const tabs = fields.map((field, index) => ({
                    key: String(field.key),
                    label: (
                        <Form.Item shouldUpdate noStyle>
                            {({ getFieldValue }) => {
                                const tabLabel = getFieldValue([name, field.name, tabKeyField]) || `${label} ${index + 1}`;
                                const truncated = String(tabLabel).slice(0, 22) + (String(tabLabel).length > 22 ? '…' : '');
                                return <span>{truncated}</span>;
                            }}
                        </Form.Item>
                    ),
                    children: (
                        <div style={{ padding: '8px 4px' }}>
                            <Space style={{ justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
                                <Space size={4}>
                                    <Button
                                        size="small"
                                        disabled={index === 0}
                                        onClick={() => { setActiveKey(String(field.key)); move(index, index - 1); }}
                                    >
                                         Mover ←
                                    </Button>
                                    <Button
                                        size="small"
                                        disabled={index === fields.length - 1}
                                        onClick={() => { setActiveKey(String(field.key)); move(index, index + 1); }}
                                    >
                                        Mover →
                                    </Button>
                                </Space>
                                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleRemove(field.key, field.name)}>
                                    Eliminar
                                </Button>
                            </Space>
                            {renderFields(field, index)}
                        </div>
                    ),
                }));

                return (
                    <Tabs
                        type="editable-card"
                        size="small"
                        hideAdd={atCapacity}
                        destroyOnHidden={false}
                        activeKey={currentKey}
                        onChange={(k) => setActiveKey(k)}
                        onEdit={(targetKey, action) => {
                            if (action === 'add') handleAdd();
                        }}
                        items={tabs.map((t) => ({ ...t, closable: false, forceRender: true }))}
                        addIcon={<span><PlusOutlined /> {addLabel}</span>}
                    />
                );
            }}
        </Form.List>
    );
}

export function BannerEditor() {
    return (
        <ItemListEditor
            name="items"
            label="Banner"
            addLabel="Agregar banner"
            renderFields={(field) => (
                <>
                    <Form.Item name={[field.name, 'id']} hidden><Input /></Form.Item>
                    <Form.Item name={[field.name, 'titulo']} label="Título"><Input /></Form.Item>
                    <Form.Item name={[field.name, 'descripcion']} label="Descripción"><Input.TextArea rows={3} /></Form.Item>
                    <Form.Item name={[field.name, 'imagen_url']} label="Imagen de fondo">
                        <ImageUrlField placeholder="URL de la imagen del banner" />
                    </Form.Item>
                    <Form.Item name={[field.name, 'logo_url']} label="Logo del visor (icono MapaLab)">
                        <ImageUrlField placeholder="URL del logo. Si vacío, se usa el logo bundled." />
                    </Form.Item>
                    <Form.Item name={[field.name, 'cta_label']} label="Texto del botón (CTA)"><Input placeholder="Ej: Explorar mapas" /></Form.Item>
                    <Form.Item name={[field.name, 'cta_href']} label="Enlace del botón"><Input placeholder="/mapa o https://…" /></Form.Item>
                    <Form.Item name={[field.name, 'activo']} label="Activo (solo el primero activo se muestra)" valuePropName="checked"><Switch /></Form.Item>
                </>
            )}
        />
    );
}

function SubtopicEditor({ parentName, subName, sIdx, total, onMove, onRemove }) {
    const form = Form.useFormInstance();
    const [syncing, setSyncing] = useState(false);

    const linkPath = ['items', parentName, 'subtopics', subName, 'link'];
    const currentLink = Form.useWatch(linkPath, form) ?? '';
    const lastSyncedShareIdRef = useRef(extractShareId(currentLink));

    useEffect(() => { lastSyncedShareIdRef.current = extractShareId(currentLink); }, [currentLink]);

    const syncShareIfNeeded = async (rawValue) => {
        const newId = extractShareId(rawValue);
        const prevId = lastSyncedShareIdRef.current;
        if (newId === prevId) return;
        setSyncing(true);
        try {
            if (prevId) await unpinPermanente(prevId);
            if (newId) {
                const ok = await pinPermanente(newId);
                if (!ok) {
                    lastSyncedShareIdRef.current = null;
                    return;
                }
                message.success(`Share ${newId} marcado como permanente`);
            } else if (prevId) {
                message.info(`Share ${prevId} ya no es permanente`);
            }
            lastSyncedShareIdRef.current = newId;
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div style={{ border: '1px dashed #d9d9d9', borderRadius: 6, padding: 8, background: '#fff' }}>
            <Space style={{ justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
                <Text style={{ fontSize: 11 }}>Subtema #{sIdx + 1}</Text>
                <Space size={2}>
                    <Button size="small" icon={<ArrowUpOutlined />} disabled={sIdx === 0} onClick={() => onMove(sIdx, sIdx - 1)} />
                    <Button size="small" icon={<ArrowDownOutlined />} disabled={sIdx === total - 1} onClick={() => onMove(sIdx, sIdx + 1)} />
                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => onRemove(subName)} />
                </Space>
            </Space>
            <Form.Item name={[subName, 'label']} label="Etiqueta" style={{ marginBottom: 8 }}>
                <Input size="small" />
            </Form.Item>
            <Form.Item
                name={[subName, 'layer_ids']}
                label="Capas"
                style={{ marginBottom: 8 }}
                getValueFromEvent={(value) => Array.isArray(value) ? value : []}
            >
                <LayerIdsField />
            </Form.Item>
            <Form.Item
                name={[subName, 'link']}
                label="Link (opcional)"
                extra="Si está vacío, el visor usa /mapa?layers=… con las capas de arriba. Si tiene un share del visor (?s=ABC) se marca permanente al guardar; si lo borras o cambias, se libera."
                style={{ marginBottom: 0 }}
            >
                <Input
                    size="small"
                    placeholder="/mapa?s=ABC123 · /mapa#zona · https://…"
                    prefix={<LinkOutlined style={{ color: '#999' }} />}
                    onBlur={(e) => syncShareIfNeeded(e.target.value)}
                    suffix={syncing ? <Text type="secondary" style={{ fontSize: 11 }}>sincronizando…</Text> : null}
                />
            </Form.Item>
        </div>
    );
}

function SubtopicsList({ parentName }) {
    return (
        <Form.List name={[parentName, 'subtopics']}>
            {(fields, { add, remove, move }) => (
                <Space orientation="vertical" style={{ width: '100%' }}>
                    <Text strong style={{ fontSize: 12 }}>Subtemas (links rápidos)</Text>
                    {fields.length === 0 && (
                        <Text type="secondary" style={{ fontSize: 12 }}>Sin subtemas.</Text>
                    )}
                    {fields.map((sub, sIdx) => (
                        <SubtopicEditor
                            key={sub.key}
                            parentName={parentName}
                            subName={sub.name}
                            sIdx={sIdx}
                            total={fields.length}
                            onMove={move}
                            onRemove={remove}
                        />
                    ))}
                    <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => add({ label: '', layer_ids: [], link: '' })} block>
                        Agregar subtema
                    </Button>
                </Space>
            )}
        </Form.List>
    );
}

export function TopicsEditor() {
    return (
        <ItemListEditor
            name="items"
            label="Tema"
            addLabel="Agregar tema"
            renderFields={(field) => (
                <>
                    <Form.Item name={[field.name, 'id']} hidden><Input /></Form.Item>
                    <Form.Item name={[field.name, 'titulo']} label="Título"><Input /></Form.Item>
                    <Form.Item name={[field.name, 'descripcion']} label="Descripción"><Input.TextArea rows={2} /></Form.Item>
                    <Form.Item name={[field.name, 'icon']} label="Sprite icon" extra="Nombre del icono bundled del visor (ej: demografia, salud). Si vacío, usa imagen.">
                        <Input />
                    </Form.Item>
                    <Form.Item name={[field.name, 'imagen_url']} label="Imagen (opcional)">
                        <ImageUrlField />
                    </Form.Item>
                    <Form.Item name={[field.name, 'link']} label="Enlace"><Input /></Form.Item>
                    <Form.Item name={[field.name, 'activo']} label="Activo" valuePropName="checked"><Switch /></Form.Item>
                    <SubtopicsList parentName={field.name} />
                </>
            )}
        />
    );
}

export function GuideEditor() {
    return (
        <ItemListEditor
            name="items"
            label="Paso"
            addLabel="Agregar paso"
            renderFields={(field) => (
                <>
                    <Form.Item name={[field.name, 'id']} hidden><Input /></Form.Item>
                    <Form.Item name={[field.name, 'titulo']} label="Título"><Input /></Form.Item>
                    <Form.Item name={[field.name, 'descripcion']} label="Descripción"><Input.TextArea rows={2} /></Form.Item>
                    <Form.Item name={[field.name, 'imagen_url']} label="Imagen">
                        <ImageUrlField />
                    </Form.Item>
                </>
            )}
        />
    );
}

export function SelectEditor() {
    return (
        <ItemListEditor
            name="items"
            label="Opción"
            addLabel="Agregar opción"
            renderFields={(field) => (
                <>
                    <Form.Item name={[field.name, 'id']} hidden><Input /></Form.Item>
                    <Form.Item name={[field.name, 'titulo']} label="Título"><Input /></Form.Item>
                    <Form.Item name={[field.name, 'descripcion']} label="Descripción"><Input.TextArea rows={2} /></Form.Item>
                    <Form.Item name={[field.name, 'imagen_url']} label="Imagen">
                        <ImageUrlField />
                    </Form.Item>
                    <Form.Item name={[field.name, 'color']} label="Color de fondo (hex)" extra="Ej: #FFB98E. Si vacío usa color por defecto.">
                        <Input placeholder="#FFB98E" />
                    </Form.Item>
                    <Form.Item name={[field.name, 'link']} label="Enlace"><Input /></Form.Item>
                </>
            )}
        />
    );
}

export function FaqEditor() {
    return (
        <ItemListEditor
            name="items"
            label="Pregunta"
            addLabel="Agregar pregunta"
            tabKeyField="pregunta"
            renderFields={(field) => (
                <>
                    <Form.Item name={[field.name, 'id']} hidden><Input /></Form.Item>
                    <Form.Item name={[field.name, 'pregunta']} label="Pregunta"><Input /></Form.Item>
                    <Form.Item name={[field.name, 'respuesta']} label="Respuesta"><Input.TextArea rows={4} /></Form.Item>
                </>
            )}
        />
    );
}

export function VideoEditor() {
    return (
        <Space orientation="vertical" style={{ width: '100%' }}>
            <Form.Item name="youtube_id" label="YouTube ID" extra="Solo el ID, ej: MzuImZuDM3E">
                <Input placeholder="MzuImZuDM3E" />
            </Form.Item>
            <Form.Item name="titulo" label="Título"><Input /></Form.Item>
            <Form.Item name="descripcion" label="Descripción"><Input.TextArea rows={3} /></Form.Item>
            <Form.Item name="activo" label="Activo" valuePropName="checked"><Switch /></Form.Item>
        </Space>
    );
}

export function FooterEditor() {
    return (
        <Space orientation="vertical" style={{ width: '100%' }}>
            <Form.Item name="copyright" label="Texto de copyright" extra="Ej: Instituto de Información Estadística y Geográfica de Jalisco ©">
                <Input />
            </Form.Item>
            <Form.Item name="privacy_policy_label" label="Etiqueta del aviso de privacidad">
                <Input placeholder="Aviso de Privacidad" />
            </Form.Item>
            <Form.Item name="privacy_policy_href" label="URL del aviso de privacidad">
                <Input placeholder="https://…" />
            </Form.Item>
            <Text strong style={{ display: 'block', marginTop: 16 }}>Logos (máximo 3)</Text>
            <ItemListEditor
                name="logos"
                label="Logo"
                addLabel="Agregar logo"
                tabKeyField="name"
                maxItems={3}
                renderFields={(field) => (
                    <>
                        <Form.Item name={[field.name, 'id']} hidden><Input /></Form.Item>
                        <Form.Item name={[field.name, 'name']} label="Nombre"><Input placeholder="MapaLab, IIEG, etc." /></Form.Item>
                        <Form.Item name={[field.name, 'imagen_url']} label="Imagen del logo">
                            <ImageUrlField />
                        </Form.Item>
                        <Form.Item name={[field.name, 'href']} label="Link al hacer click (opcional)">
                            <Input placeholder="https://…" />
                        </Form.Item>
                        <Space style={{ width: '100%' }}>
                            <Form.Item name={[field.name, 'width']} label="Width (CSS)" style={{ flex: 1 }}>
                                <Input placeholder="335px" />
                            </Form.Item>
                            <Form.Item name={[field.name, 'height']} label="Height (CSS)" style={{ flex: 1 }}>
                                <Input placeholder="57px" />
                            </Form.Item>
                        </Space>
                    </>
                )}
            />
        </Space>
    );
}

