import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Input, List, Modal, Space, Tag, Typography } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

const refsBlock = (references) => {
    if (!references) return null;
    const items = [];
    if (references.childrenCount > 0) {
        items.push({
            key: 'children',
            color: 'red',
            label: `${references.childrenCount} hijo(s) activo(s) — debes vaciar o mover los hijos antes`,
        });
    }
    if (references.inInitialOrder) {
        items.push({
            key: 'initial',
            color: 'orange',
            label: 'Está en las capas iniciales del visor (orden por defecto al cargar)',
        });
    }
    (references.eventos || []).forEach((e) => {
        items.push({
            key: `evento-${e.id}`,
            color: 'orange',
            label: `Usada por evento "${e.titulo}"${e.activo ? '' : ' (inactivo)'}`,
        });
    });
    if (items.length === 0) return null;
    return (
        <List
            size="small"
            bordered
            dataSource={items}
            renderItem={(it) => (
                <List.Item><Tag color={it.color}>{it.color === 'red' ? 'bloquea' : 'advertencia'}</Tag> {it.label}</List.Item>
            )}
            style={{ marginBottom: 12 }}
        />
    );
};

export default function DeleteLayerModal({
    open,
    onClose,
    layer,
    isAdmin,
    references,
    referencesLoading,
    onConfirmAdmin,
    onConfirmEditor,
    submitting,
}) {
    const [typed, setTyped] = useState('');

    useEffect(() => { if (!open) setTyped(''); }, [open]);

    const expectedName = layer?.label || layer?.id || '';
    const matches = typed.trim() === expectedName.trim();
    const blocking = (references?.childrenCount || 0) > 0;
    const hasWarnings = !blocking && (
        references?.inInitialOrder
        || (references?.eventos && references.eventos.length > 0)
    );

    const buttonLabel = isAdmin
        ? (hasWarnings ? 'Archivar de todos modos' : 'Archivar capa')
        : 'Solicitar archivado a un admin';

    const onConfirm = () => {
        if (isAdmin) onConfirmAdmin({ force: hasWarnings });
        else onConfirmEditor();
    };

    const helpText = isAdmin
        ? 'Esto archiva la capa (queda en Papelera). Puedes restaurarla después. Las capas archivadas desaparecen del visor en cuanto se refresque el árbol.'
        : 'Como editor, tu solicitud queda en revisión. Un admin debe aprobarla para que la capa se archive.';

    const titleConfirm = useMemo(() => (
        <Space>
            <ExclamationCircleOutlined style={{ color: '#fa8c16' }} />
            {isAdmin ? 'Archivar capa' : 'Solicitar archivado de capa'}
        </Space>
    ), [isAdmin]);

    return (
        <Modal
            title={titleConfirm}
            open={open}
            onCancel={submitting ? undefined : onClose}
            maskClosable={!submitting}
            footer={null}
            destroyOnHidden
        >
            <Paragraph>
                Vas a {isAdmin ? 'archivar' : 'solicitar el archivado de'} la capa:
            </Paragraph>
            <Space direction="vertical" style={{ width: '100%', marginBottom: 12 }} size={4}>
                <Text strong style={{ fontSize: 16 }}>{layer?.label}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>id: <code>{layer?.id}</code></Text>
            </Space>

            <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
                {helpText}
            </Paragraph>

            {referencesLoading ? (
                <Alert type="info" message="Verificando referencias..." showIcon style={{ marginBottom: 12 }} />
            ) : refsBlock(references)}

            {blocking && (
                <Alert
                    type="error"
                    showIcon
                    message="No se puede archivar"
                    description="La capa tiene hijos activos. Elimínalos o muévelos primero."
                    style={{ marginBottom: 12 }}
                />
            )}

            <Paragraph style={{ marginBottom: 6 }}>
                Para confirmar, escribe el nombre exacto de la capa:
                <br />
                <Text code copyable={{ text: expectedName }}>{expectedName}</Text>
            </Paragraph>
            <Input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="Escribe el nombre tal cual aparece arriba"
                disabled={submitting || blocking}
                status={typed && !matches ? 'warning' : undefined}
            />

            <Space style={{ width: '100%', justifyContent: 'flex-end', marginTop: 16 }}>
                <Button onClick={onClose} disabled={submitting}>Cancelar</Button>
                <Button
                    type="primary"
                    danger
                    disabled={!matches || blocking || submitting}
                    loading={submitting}
                    onClick={onConfirm}
                >
                    {buttonLabel}
                </Button>
            </Space>
        </Modal>
    );
}
