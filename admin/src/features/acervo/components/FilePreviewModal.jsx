import { Image, Modal } from 'antd';
import { esPrevisualizable, toPublicUrl } from '@features/acervo/api/acervoService';

export default function FilePreviewModal({ file, open, onClose, isMobile }) {
    const tipo = file?.isDir ? '' : file?.type || '';
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
            {abierto && (
                <iframe
                    src={url}
                    title={file?.originalName}
                    style={{ width: '100%', height: '75vh', border: 0 }}
                />
            )}
        </Modal>
    );
}
