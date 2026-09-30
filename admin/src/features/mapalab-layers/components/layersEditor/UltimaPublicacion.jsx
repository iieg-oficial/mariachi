import { useCallback, useEffect, useState } from 'react';
import { Button, Popconfirm, Space, Typography } from 'antd';
import { UndoOutlined } from '@ant-design/icons';
import api from '@shared/services/api';
import { message } from '@shared/services/message';
import { describeValue, labelOf } from '@features/mapalab-layers/utils/layerDiff';

const { Text } = Typography;

const aCamel = (campo) => campo.replace(/_([a-z])/g, (_, letra) => letra.toUpperCase());
const etiqueta = (tipo, campo) => (tipo === 'layer' ? labelOf(aCamel(campo)) : labelOf(campo));

const comoUtc = (texto) => new Date(/([zZ]|[+-]\d\d:\d\d)$/.test(texto) ? texto : `${texto}Z`);

const haceCuanto = (fecha) => {
    const minutos = Math.round((Date.now() - comoUtc(fecha).getTime()) / 60000);
    if (minutos < 1) return 'hace un momento';
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.round(minutos / 60);
    if (horas < 24) return `hace ${horas} h`;
    return comoUtc(fecha).toLocaleDateString('es-MX');
};

export default function UltimaPublicacion({ layerId, layerKey, recarga, onDeshecha }) {
    const [ultima, setUltima] = useState(null);
    const [deshaciendo, setDeshaciendo] = useState(false);

    const cargar = useCallback(async () => {
        if (!layerId) {
            setUltima(null);
            return;
        }
        try {
            const res = await api.get('/publicaciones-capas/ultimas', {
                params: { layer_id: layerId, ...(layerKey ? { layer_key: layerKey } : {}) },
            });
            setUltima((res.data || [])[0] || null);
        } catch {
            setUltima(null);
        }
    }, [layerId, layerKey]);

    useEffect(() => { cargar(); }, [cargar, recarga]);

    if (!ultima || ultima.deshecha_en) return null;

    const campos = Object.keys(ultima.despues || {});
    const resumen = campos.map((c) => etiqueta(ultima.resource_type, c)).join(', ');

    const deshacer = async () => {
        setDeshaciendo(true);
        try {
            await api.post(`/publicaciones-capas/${ultima.id}/deshacer`);
            message.success('Publicación deshecha');
            await cargar();
            onDeshecha?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo deshacer');
        } finally {
            setDeshaciendo(false);
        }
    };

    const detalle = (
        <Space orientation="vertical" size={2} style={{ maxWidth: 360 }}>
            {campos.map((c) => (
                <Text key={c} style={{ fontSize: 12 }}>
                    <strong>{etiqueta(ultima.resource_type, c)}</strong>: {describeValue(ultima.despues[c])} → {describeValue(ultima.antes[c])}
                </Text>
            ))}
        </Space>
    );

    return (
        <Space size={6} wrap>
            <Text type="secondary" style={{ fontSize: 11 }}>
                {ultima.origen === 'deshacer' ? 'Se deshizo' : 'Publicado'} {resumen} · {ultima.usuario} · {haceCuanto(ultima.creado_en)}
            </Text>
            <Popconfirm
                title="¿Deshacer esta publicación?"
                description={detalle}
                okText="Deshacer"
                cancelText="Cancelar"
                onConfirm={deshacer}
            >
                <Button size="small" type="link" icon={<UndoOutlined />} loading={deshaciendo} style={{ padding: 0 }}>
                    Deshacer
                </Button>
            </Popconfirm>
        </Space>
    );
}
