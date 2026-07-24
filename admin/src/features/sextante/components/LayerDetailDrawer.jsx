import { useEffect, useState } from 'react';
import {
    Alert,
    Button,
    Drawer,
    Empty,
    Space,
    Spin,
    Table,
    Tabs,
    Tag,
    Typography,
} from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { listLayerFields, listLayerStyles } from '@features/sextante/api/sextanteService';
import { message } from '@shared/services/message';

const { Text } = Typography;

const TYPE_COLORS = {
    string: 'blue',
    integer: 'geekblue',
    number: 'geekblue',
    boolean: 'purple',
    date: 'cyan',
    geometry: 'green',
};

export default function LayerDetailDrawer({ open, alias, geoserverWorkspace, layer, onClose }) {
    const [fields, setFields] = useState([]);
    const [samples, setSamples] = useState({});
    const [styles, setStyles] = useState([]);
    const [isLayerGroup, setIsLayerGroup] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!open || !alias || !layer) return;
        let active = true;
        setLoading(true);
        setError(null);
        setFields([]);
        setSamples({});
        setStyles([]);
        setIsLayerGroup(false);
        Promise.all([
            listLayerFields(alias, layer, true).catch(() => null),
            listLayerStyles(alias, layer).catch(() => null),
        ])
            .then(([fieldsRes, stylesRes]) => {
                if (!active) return;
                if (!fieldsRes && !stylesRes) {
                    setError('No se pudo consultar la capa en GeoServer');
                    return;
                }
                setFields(fieldsRes?.fields || []);
                setSamples(fieldsRes?.sampleValues || {});
                setStyles(stylesRes?.styles || []);
                setIsLayerGroup(Boolean(stylesRes?.isLayerGroup));
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [open, alias, layer]);

    const qualifiedName = geoserverWorkspace ? `${geoserverWorkspace}:${layer}` : layer;

    const copyName = async () => {
        try {
            await navigator.clipboard.writeText(qualifiedName);
            message.success('Nombre copiado');
        } catch {
            message.error('No se pudo copiar');
        }
    };

    const fieldColumns = [
        {
            title: 'Campo',
            dataIndex: 'name',
            key: 'name',
            render: (name) => <Text code>{name}</Text>,
        },
        {
            title: 'Tipo',
            dataIndex: 'type',
            key: 'type',
            width: 110,
            render: (type) => <Tag color={TYPE_COLORS[type] || 'default'}>{type}</Tag>,
        },
        {
            title: 'Valores de muestra',
            key: 'samples',
            render: (_, row) => {
                const values = samples[row.name];
                if (!values?.length) return <Text type="secondary">—</Text>;
                return (
                    <Space size={[4, 4]} wrap>
                        {values.slice(0, 8).map((v) => (
                            <Tag key={String(v)} style={{ fontSize: 11 }}>{String(v)}</Tag>
                        ))}
                    </Space>
                );
            },
        },
    ];

    const tabItems = [
        {
            key: 'campos',
            label: `Campos (${fields.length})`,
            children: fields.length === 0
                ? (
                    <Empty
                        description={isLayerGroup
                            ? 'Un layer group no expone campos propios'
                            : 'GeoServer no devolvió campos para esta capa'}
                    />
                )
                : (
                    <Table
                        rowKey="name"
                        size="small"
                        dataSource={fields}
                        columns={fieldColumns}
                        pagination={false}
                    />
                ),
        },
        {
            key: 'estilos',
            label: `Estilos (${styles.length})`,
            children: styles.length === 0
                ? <Empty description="Sin estilos asignados" />
                : (
                    <Space size={[6, 6]} wrap>
                        {styles.map((name, idx) => (
                            <Tag key={name} color={idx === 0 ? 'purple' : 'default'}>
                                {name}{idx === 0 ? ' (por defecto)' : ''}
                            </Tag>
                        ))}
                    </Space>
                ),
        },
    ];

    return (
        <Drawer
            open={open}
            onClose={onClose}
            width={720}
            styles={{ wrapper: { maxWidth: '100vw' } }}
            title={
                <Space>
                    <Text code>{qualifiedName}</Text>
                    {isLayerGroup && <Tag color="orange">Layer group</Tag>}
                </Space>
            }
            extra={<Button size="small" icon={<CopyOutlined />} onClick={copyName}>Copiar nombre</Button>}
        >
            {loading && <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>}
            {error && <Alert type="error" showIcon message={error} />}
            {!loading && !error && <Tabs items={tabItems} />}
        </Drawer>
    );
}
