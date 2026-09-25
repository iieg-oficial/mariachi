import { useEffect, useState } from 'react';
import { Button, Empty, Image, Modal, Spin } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { esPrevisualizable, toPublicUrl } from '@features/acervo/api/acervoService';

const FRAME_STYLE = { width: '100%', height: '75vh', border: 0 };

function usePdfBlobUrl(url, activo) {
    const [estado, setEstado] = useState({ url: null, error: false });

    useEffect(() => {
        if (!activo || !url) return undefined;
        let objectUrl = null;
        let cancelado = false;
        setEstado({ url: null, error: false });
        fetch(url)
            .then((response) => {
                if (!response.ok) throw new Error(String(response.status));
                return response.arrayBuffer();
            })
            .then((buffer) => {
                if (cancelado) return;
                objectUrl = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
                setEstado({ url: objectUrl, error: false });
            })
            .catch(() => { if (!cancelado) setEstado({ url: null, error: true }); });
        return () => {
            cancelado = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [url, activo]);

    return estado;
}

function PdfPreview({ url, title, activo }) {
    const { url: blobUrl, error } = usePdfBlobUrl(url, activo);
    if (error) {
        return (
            <Empty description="No se pudo previsualizar el PDF" style={{ padding: 24 }}>
                <Button shape="round" icon={<DownloadOutlined />} href={url} download>
                    Descargar
                </Button>
            </Empty>
        );
    }
    if (!blobUrl) return <Spin style={{ display: 'block', padding: 48 }} />;
    return <iframe src={blobUrl} title={title} style={FRAME_STYLE} />;
}

export default function FilePreviewModal({ file, open, onClose, isMobile }) {
    const tipo = file?.isDir ? '' : (file?.type || '').toLowerCase();
    const url = toPublicUrl(file?.url);
    const abierto = open && esPrevisualizable(file);

    if (tipo.startsWith('image/')) {
        return (
            <Image
                style={{ display: 'none' }}
                src={url}
                alt={file?.metadata?.alt || file?.originalName}
                preview={{
                    open: abierto,
                    src: url,
                    onOpenChange: (visible) => { if (!visible) onClose(); },
                }}
            />
        );
    }

    const esPdf = tipo.startsWith('application/pdf');

    return (
        <Modal
            title={file?.originalName}
            open={abierto}
            onCancel={onClose}
            footer={null}
            width={isMobile ? '100%' : 900}
            centered
            styles={{ body: { padding: 0 } }}
            destroyOnHidden
        >
            {abierto && esPdf && <PdfPreview url={url} title={file?.originalName} activo={abierto} />}
            {abierto && !esPdf && (
                <iframe
                    src={url}
                    title={file?.originalName}
                    sandbox=""
                    referrerPolicy="no-referrer"
                    style={FRAME_STYLE}
                />
            )}
        </Modal>
    );
}
