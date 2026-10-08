import { useEffect, useState } from 'react';
import { Input, Modal, Space, Spin, Typography } from 'antd';
import {
    moveGeoserverResource,
    readGeoserverTextFile,
    uploadGeoserverFile,
} from '@features/sextante/api/geoserverFilesService';
import {
    FOLDER_NAME_RE,
    basename,
    isEditableText,
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

const tituloDe = (resource, esTexto) => {
    if (esTexto) return 'Editar archivo';
    return resource?.isDir ? 'Renombrar carpeta' : 'Renombrar archivo';
};

export default function RenameResourceModal({ resource, workspace = '', onClose, onRenamed }) {
    const [nombre, setNombre] = useState('');
    const [contenido, setContenido] = useState('');
    const [original, setOriginal] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [saving, setSaving] = useState(false);

    const open = Boolean(resource);
    const esTexto = isEditableText(resource);
    const sourcePath = resource ? (resource.isDir ? resource.path : resource.name) : '';
    const [stem, ext] = resource && !resource.isDir ? splitFileName(sourcePath) : [basename(sourcePath), ''];

    useEffect(() => {
        if (open) setNombre(stem);
    }, [open, stem]);

    useEffect(() => {
        setContenido('');
        setOriginal(null);
        if (!open || !esTexto) return undefined;
        let active = true;
        setCargando(true);
        readGeoserverTextFile(sourcePath, workspace)
            .then((texto) => {
                if (!active) return;
                setContenido(texto);
                setOriginal(texto);
            })
            .catch(() => { if (active) message.error('No se pudo leer el archivo'); })
            .finally(() => { if (active) setCargando(false); });
        return () => { active = false; };
    }, [open, esTexto, sourcePath, workspace]);

    const handleSave = async () => {
        const limpio = nombre.trim();
        if (!limpio || !FOLDER_NAME_RE.test(limpio)) {
            message.error('Nombre inválido: solo letras, números, guion, guion bajo y punto');
            return;
        }
        const parent = parentOf(sourcePath);
        const target = parent ? `${parent}/${limpio}${ext}` : `${limpio}${ext}`;
        const cambiaNombre = target !== sourcePath;
        const cambiaTexto = esTexto && original !== null && contenido !== original;
        if (!cambiaNombre && !cambiaTexto) {
            onClose?.();
            return;
        }
        setSaving(true);
        try {
            if (cambiaTexto) {
                const file = new File([contenido], basename(sourcePath), { type: 'text/plain' });
                await uploadGeoserverFile({ file, name: sourcePath, workspace });
            }
            if (cambiaNombre) {
                await moveGeoserverResource({ source: sourcePath, target, workspace, isDir: resource.isDir });
            }
            message.success(cambiaNombre ? `Guardado como ${limpio}${ext}` : 'Archivo guardado');
            onRenamed?.(target);
            onClose?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            title={tituloDe(resource, esTexto)}
            width={esTexto ? 720 : undefined}
            okText={esTexto ? 'Guardar' : 'Renombrar'}
            okButtonProps={{ loading: saving, disabled: cargando }}
            cancelText="Cancelar"
            onOk={handleSave}
            onCancel={onClose}
            destroyOnHidden
        >
            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Actual: <Text code>{workspaceLabel(workspace)}{sourcePath}</Text>
                </Text>
                <Input
                    value={nombre}
                    aria-label="Nombre"
                    onChange={(e) => setNombre(e.target.value)}
                    onPressEnter={esTexto ? undefined : handleSave}
                    addonAfter={ext || undefined}
                    maxLength={120}
                />
                {esTexto && (cargando ? <Spin /> : (
                    <Input.TextArea
                        value={contenido}
                        aria-label="Contenido"
                        onChange={(e) => setContenido(e.target.value)}
                        autoSize={{ minRows: 8, maxRows: 24 }}
                        spellCheck={false}
                        disabled={original === null}
                        style={{ fontFamily: 'monospace', fontSize: 12 }}
                    />
                ))}
                {!resource?.isDir && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {esTexto
                            ? 'Los cambios de un mosaico aplican al reindexarlo.'
                            : 'La extensión no se puede cambiar. Si algún SLD apunta a este archivo, actualiza su xlink:href.'}
                    </Text>
                )}
            </Space>
        </Modal>
    );
}
