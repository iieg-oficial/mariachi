import { useEffect, useState } from 'react';
import { Input, Modal, Space, Typography } from 'antd';
import { moveGeoserverResource } from '@features/sextante/api/geoserverFilesService';
import {
    FOLDER_NAME_RE,
    basename,
    workspaceLabel,
} from '@features/sextante/utils/geoserverFiles';
import { message } from '@shared/services/message';

const { Text } = Typography;

const parentOf = (path) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');

const splitFileName = (path) => {
    const base = basename(path);
    const dot = base.lastIndexOf('.');
    return dot > 0 ? [base.slice(0, dot), base.slice(dot)] : [base, ''];
};

export default function RenameResourceModal({ resource, workspace = '', onClose, onRenamed }) {
    const [nombre, setNombre] = useState('');
    const [saving, setSaving] = useState(false);

    const open = Boolean(resource);
    const sourcePath = resource ? (resource.isDir ? resource.path : resource.name) : '';
    const [stem, ext] = resource && !resource.isDir ? splitFileName(sourcePath) : [basename(sourcePath), ''];

    useEffect(() => {
        if (open) setNombre(stem);
    }, [open, stem]);

    const handleRename = async () => {
        const limpio = nombre.trim();
        if (!limpio || !FOLDER_NAME_RE.test(limpio)) {
            message.error('Nombre inválido: solo letras, números, guion, guion bajo y punto');
            return;
        }
        const parent = parentOf(sourcePath);
        const target = parent ? `${parent}/${limpio}${ext}` : `${limpio}${ext}`;
        if (target === sourcePath) {
            onClose?.();
            return;
        }
        setSaving(true);
        try {
            await moveGeoserverResource({
                source: sourcePath,
                target,
                workspace,
                isDir: resource.isDir,
            });
            message.success(`Renombrado a ${limpio}${ext}`);
            onRenamed?.(target);
            onClose?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al renombrar');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            title={resource?.isDir ? 'Renombrar carpeta' : 'Renombrar archivo'}
            okText="Renombrar"
            okButtonProps={{ loading: saving }}
            cancelText="Cancelar"
            onOk={handleRename}
            onCancel={onClose}
            destroyOnHidden
        >
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Actual: <Text code>{workspaceLabel(workspace)}{sourcePath}</Text>
                </Text>
                <Input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    onPressEnter={handleRename}
                    addonAfter={ext || undefined}
                    maxLength={120}
                />
                {!resource?.isDir && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        La extensión no se puede cambiar. Si algún SLD apunta a este archivo, actualiza
                        su <Text code>xlink:href</Text>.
                    </Text>
                )}
            </Space>
        </Modal>
    );
}
