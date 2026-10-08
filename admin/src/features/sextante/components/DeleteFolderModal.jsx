import { useEffect, useState } from 'react';
import { Alert, Input, Modal, Space, Spin, Typography } from 'antd';
import {
    deleteGeoserverFolder,
    getGeoserverFolderInfo,
} from '@features/sextante/api/geoserverFilesService';
import { workspaceLabel } from '@features/sextante/utils/geoserverFiles';
import { message } from '@shared/services/message';

const { Text } = Typography;

export default function DeleteFolderModal({ folder, workspace = '', onClose, onDeleted }) {
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [typed, setTyped] = useState('');

    const open = Boolean(folder);

    useEffect(() => {
        if (!open) {
            setInfo(null);
            setTyped('');
            return undefined;
        }
        let active = true;
        setLoading(true);
        getGeoserverFolderInfo(folder.path, workspace)
            .then((data) => { if (active) setInfo(data); })
            .catch(() => { if (active) setInfo(null); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [open, folder, workspace]);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deleteGeoserverFolder(folder.path, workspace);
            message.success(`Carpeta eliminada: ${folder.name}`);
            onDeleted?.(folder);
            onClose?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al eliminar la carpeta');
        } finally {
            setDeleting(false);
        }
    };

    const vacia = info && info.fileCount === 0 && info.folderCount === 0;

    return (
        <Modal
            open={open}
            title="Eliminar carpeta"
            okText="Eliminar"
            okButtonProps={{ danger: true, disabled: typed !== folder?.name, loading: deleting }}
            cancelText="Cancelar"
            onOk={handleDelete}
            onCancel={onClose}
            destroyOnHidden
        >
            {loading ? <Spin /> : (
                <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                    <Text>
                        Se eliminará <Text code>{workspaceLabel(workspace)}{folder?.path}</Text> y todo
                        lo que contiene. No hay papelera: lo borrado no se recupera.
                    </Text>
                    {info && !vacia && (
                        <Alert
                            type="warning"
                            showIcon
                            message={`${info.fileCount} archivo(s) y ${info.folderCount} subcarpeta(s) se perderán`}
                            description="Si algún SLD referencia estos archivos, sus capas dejarán de renderearse."
                        />
                    )}
                    <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Escribe <Text strong>{folder?.name}</Text> para confirmar:
                        </Text>
                        <Input
                            value={typed}
                            onChange={(e) => setTyped(e.target.value)}
                            placeholder={folder?.name}
                            onPressEnter={() => typed === folder?.name && handleDelete()}
                            style={{ marginTop: 4 }}
                        />
                    </div>
                </Space>
            )}
        </Modal>
    );
}
