import { Empty, Spin, Typography } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';

const { Text } = Typography;
const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|svg|bmp|avif)$/i;

export default function BucketFileGrid({ records, loading, onPick }) {
    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                <Spin />
            </div>
        );
    }
    if (records.length === 0) {
        return (
            <Empty
                image={<FolderOpenOutlined style={{ fontSize: 48, color: '#8c8c8c' }} />}
                description={<Text type="secondary">Sin archivos en esta carpeta</Text>}
                style={{ padding: 48 }}
            />
        );
    }
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 12,
            padding: '12px 0',
        }}>
            {records.map((record) => {
                const basename = record.name.split('/').pop();
                const isImage = IMAGE_EXTENSIONS.test(basename);
                return (
                    <button
                        key={record.name}
                        type="button"
                        onClick={() => onPick(record)}
                        style={{
                            border: '1px solid #f0f0f0',
                            borderRadius: 8,
                            background: '#fff',
                            padding: 8,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'border-color .15s, box-shadow .15s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#1890ff';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(24,144,255,0.15)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#f0f0f0';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <div style={{
                            width: '100%',
                            aspectRatio: '1 / 1',
                            background: '#fafafa',
                            borderRadius: 6,
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            {isImage && record.url ? (
                                <img
                                    src={record.url}
                                    alt={basename}
                                    loading="lazy"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <FolderOpenOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />
                            )}
                        </div>
                        <Text style={{ fontSize: 11, textAlign: 'center', wordBreak: 'break-all' }} ellipsis={{ tooltip: basename }}>
                            {basename}
                        </Text>
                    </button>
                );
            })}
        </div>
    );
}
