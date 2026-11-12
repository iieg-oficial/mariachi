import { Button, Modal, Space } from 'antd';
import DraftPreview from './DraftPreview';

export default function SldDraftReviewModal({ borrador, onClose, onAprobar, onRechazar, aprobando, width = 860 }) {
    const footer = onAprobar
        ? (
            <Space>
                <Button shape="round" danger onClick={() => onRechazar(borrador)}>Rechazar</Button>
                <Button type="primary" shape="round" loading={aprobando} onClick={() => onAprobar(borrador)}>
                    Aprobar y publicar
                </Button>
            </Space>
        )
        : null;

    return (
        <Modal open title={borrador.data?.style_title || borrador.resource_id} onCancel={onClose} footer={footer} width={width} destroyOnHidden>
            <DraftPreview borrador={borrador} />
        </Modal>
    );
}
