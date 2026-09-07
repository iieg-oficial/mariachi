import { useEffect, useState } from 'react';
import { Alert, Modal, Space, Typography } from 'antd';
import FolderTreeSelect from '@features/sextante/components/FolderTreeSelect';
import { moveGeoserverResource } from '@features/sextante/api/geoserverFilesService';
import { basename } from '@features/sextante/utils/geoserverFiles';
import { message } from '@shared/services/message';

const { Text } = Typography;

const parentOf = (path) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');

export default function MoveResourcesModal({ items = [], workspace = '', onClose, onMoved }) {
    const [destino, setDestino] = useState('');
    const [saving, setSaving] = useState(false);

    const open = items.length > 0;

    useEffect(() => {
        if (open) setDestino('');
    }, [open]);

    const carpetas = items.filter((it) => it.isDir).map((it) => it.path);

    const handleMove = async () => {
        setSaving(true);
        const errores = [];
        let movidos = 0;
        for (const item of items) {
            const source = item.isDir ? item.path : item.name;
            if (parentOf(source) === destino) continue;
            const target = destino ? `${destino}/${basename(source)}` : basename(source);
            try {
                await moveGeoserverResource({ source, target, workspace, isDir: item.isDir });
                movidos += 1;
            } catch (err) {
                errores.push(`${basename(source)}: ${err?.response?.data?.detail || 'error'}`);
            }
        }
        setSaving(false);
        if (movidos) message.success(`${movidos} recurso(s) movido(s)`);
        if (errores.length) message.warning(`${errores.length} no se movieron: ${errores.slice(0, 2).join(' · ')}`);
        onMoved?.();
        onClose?.();
    };

    return (
        <Modal
            open={open}
            title={`Mover ${items.length} recurso(s)`}
            okText="Mover"
            okButtonProps={{ loading: saving }}
            cancelText="Cancelar"
            onOk={handleMove}
            onCancel={onClose}
            destroyOnHidden
        >
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                {carpetas.length > 0 && (
                    <Alert
                        type="warning"
                        showIcon
                        message="La selección incluye carpetas"
                        description="Se mueven con todo su contenido. Su carpeta destino no puede estar dentro de ellas."
                    />
                )}
                <FolderTreeSelect
                    workspace={workspace}
                    value={destino}
                    onChange={setDestino}
                    blockedPaths={carpetas}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Mover un archivo rompe los <Text code>xlink:href</Text> de los SLD que lo
                    referencian por su ruta anterior.
                </Text>
            </Space>
        </Modal>
    );
}
