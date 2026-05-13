import { Input, Modal } from 'antd';

export default function SldRejectModal({ open, onOk, onCancel, loading, comment, onCommentChange }) {
    return (
        <Modal
            title="Rechazar borrador"
            open={open}
            onOk={onOk}
            onCancel={onCancel}
            confirmLoading={loading}
            okText="Rechazar"
            okType="danger"
            cancelText="Cancelar"
        >
            <Input.TextArea
                placeholder="Motivo del rechazo (opcional)"
                rows={3}
                value={comment}
                onChange={(e) => onCommentChange(e.target.value)}
            />
        </Modal>
    );
}
