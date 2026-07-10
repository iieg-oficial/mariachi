import { Modal } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import AcervoTopic from '@features/documentacion/topics/AcervoTopic';

export default function AcervoHelpModal({ open, tab = 'uso', onClose }) {
    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width={900}
            title={<><BookOutlined /> Documentación · Acervo</>}
            styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
        >
            {open && <AcervoTopic key={tab} defaultActiveTab={tab} showHeader={false} />}
        </Modal>
    );
}
