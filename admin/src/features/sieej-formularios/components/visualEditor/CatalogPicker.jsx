import { useCallback, useEffect, useState } from 'react';
import { Button, Form, Select, Tag } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { catalogosApi } from '../../services/formulariosAdminApi';
import useCatalogos from '../../hooks/useCatalogos';
import CatalogosDrawer from '../catalogos/CatalogosDrawer';

export default function CatalogPicker({
    form,
    name = 'catalog',
    label = 'Catálogo',
    extra,
    rules = [{ required: true, message: 'Elige un catálogo o cambia el origen a «Lista fija».' }],
}) {
    const [catalogos, setCatalogos] = useState([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { catalogos: bundle } = useCatalogos();
    const clave = Form.useWatch(name, form);

    const cargarCatalogos = useCallback(() => {
        catalogosApi.listar().then(setCatalogos).catch(() => setCatalogos([]));
    }, []);

    useEffect(() => { cargarCatalogos(); }, [cargarCatalogos]);

    const items = clave ? (bundle[clave] ?? []) : [];

    return (
        <>
            <Form.Item
                label={label}
                name={name}
                extra={extra}
                rules={rules}
            >
                <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Sin catálogo"
                    options={catalogos.map((c) => ({
                        value: c.clave,
                        label: `${c.label} (${c.total})`,
                    }))}
                />
            </Form.Item>

            {clave && (
                <div style={{ marginTop: -12, marginBottom: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                        {items.length > 0 ? items.map((it) => (
                            <Tag key={it.id ?? it.value} style={{ marginBottom: 4 }}>
                                {it.value}
                            </Tag>
                        )) : (
                            <span style={{ color: '#888', fontSize: 12 }}>
                                Este catálogo aún no tiene opciones.
                            </span>
                        )}
                    </div>
                    <Button
                        size="small"
                        icon={<SettingOutlined />}
                        onClick={() => setDrawerOpen(true)}
                    >
                        Administrar catálogo
                    </Button>
                </div>
            )}

            <CatalogosDrawer
                open={drawerOpen}
                clave={clave}
                onClose={() => {
                    setDrawerOpen(false);
                    cargarCatalogos();
                }}
            />
        </>
    );
}
