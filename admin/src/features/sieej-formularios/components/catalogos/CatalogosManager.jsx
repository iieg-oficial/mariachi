import { useCallback, useEffect, useState } from 'react';
import { Table, Tag, Tooltip, Typography } from 'antd';
import { message } from '@shared/services/message';
import { catalogosApi } from '../../services/formulariosAdminApi';
import CatalogoItems from './CatalogoItems';

const errorDetail = (err, fallback) => err?.response?.data?.detail || fallback;

const agruparPorFormulario = (campos) => {
    const grupos = new Map();
    campos.forEach((c) => {
        const grupo = grupos.get(c.formulario_id)
            ?? { id: c.formulario_id, formulario: c.formulario, campos: [] };
        grupo.campos.push(c);
        grupos.set(c.formulario_id, grupo);
    });
    return [...grupos.values()];
};

export default function CatalogosManager({ clave: claveInicial }) {
    const [catalogos, setCatalogos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(claveInicial ? [claveInicial] : []);

    const cargar = useCallback(() => {
        setLoading(true);
        catalogosApi.listar()
            .then(setCatalogos)
            .catch((err) => message.error(errorDetail(err, 'Error al cargar catálogos')))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    useEffect(() => {
        if (claveInicial) setExpanded([claveInicial]);
    }, [claveInicial]);

    const columns = [
        {
            title: 'Catálogo',
            dataIndex: 'label',
            render: (label, c) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{label}</div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }} copyable>
                        {c.clave}
                    </Typography.Text>
                </div>
            ),
        },
        {
            title: 'Opciones',
            dataIndex: 'total',
            width: 110,
            align: 'center',
            render: (total) => (total
                ? <Tag color="blue">{total}</Tag>
                : <Tag color="red">Vacío</Tag>),
        },
        {
            title: 'Campos enlazados',
            dataIndex: 'campos',
            render: (campos = []) => {
                if (campos.length === 0) {
                    return (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            Ningún campo lo usa
                        </Typography.Text>
                    );
                }
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {agruparPorFormulario(campos).map(({ id, formulario, campos: lista }) => (
                            <div key={id}>
                                <Typography.Text
                                    type="secondary"
                                    style={{ fontSize: 12, display: 'block' }}
                                >
                                    {formulario}
                                </Typography.Text>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 4,
                                    marginTop: 2,
                                }}>
                                    {lista.map((c) => (
                                        <Tooltip
                                            key={`${c.step_id}-${c.field_name}`}
                                            title={`Paso: ${c.step_id} · campo: ${c.field_name}`}
                                        >
                                            <Tag style={{ margin: 0 }}>
                                                {c.field_label || c.field_name}
                                            </Tag>
                                        </Tooltip>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            },
        },
    ];

    return (
        <Table
            size="small"
            rowKey="clave"
            loading={loading}
            columns={columns}
            dataSource={catalogos}
            pagination={false}
            expandable={{
                expandedRowKeys: expanded,
                onExpandedRowsChange: (keys) => setExpanded([...keys]),
                expandedRowRender: (c) => (
                    <CatalogoItems clave={c.clave} onChange={cargar} />
                ),
            }}
        />
    );
}
