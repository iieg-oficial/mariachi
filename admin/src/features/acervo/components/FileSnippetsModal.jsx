import { Modal } from 'antd';
import FileSnippets from '@features/acervo/components/FileSnippets';

export default function FileSnippetsModal({ file, open, onClose }) {
    return (
        <Modal
            open={open}
            onCancel={onClose}
            title={file ? `Snippets de ${file.originalName}` : 'Snippets'}
            footer={null}
            width={640}
        >
            <FileSnippets file={file} />
        </Modal>
    );
}
