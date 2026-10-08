import { useEffect, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Empty,
    Layout,
    List,
    Popconfirm,
    Space,
    Spin,
    Typography,
} from 'antd';
import {
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import {
    deleteCategory,
    deleteSymbol,
    useSymbolCategories,
    useSymbolsByCategory,
} from '@features/mapalab-symbols/hooks/useSymbolsAdmin';
import CategoryFormModal from '@features/mapalab-symbols/components/CategoryFormModal';
import CategoryIcon from '@features/mapalab-symbols/components/CategoryIcon';
import SymbolFormModal from '@features/mapalab-symbols/components/SymbolFormModal';
import SymbolGrid from '@features/mapalab-symbols/components/SymbolGrid';
import useIsMobile from '@shared/hooks/useIsMobile';
import { message } from '@shared/services/message';

const { Content } = Layout;
const { Title, Text } = Typography;


export default function SymbolsPage() {
    const { items: categories, loading: catLoading, error: catError, reload: reloadCats } =
        useSymbolCategories();
    const [selectedId, setSelectedId] = useState(null);
    const { items: symbols, loading: symLoading, reload: reloadSymbols } =
        useSymbolsByCategory(selectedId);
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [categoryToEdit, setCategoryToEdit] = useState(null);
    const [symbolModalOpen, setSymbolModalOpen] = useState(false);
    const [symbolToEdit, setSymbolToEdit] = useState(null);
    const [deletingSymbolId, setDeletingSymbolId] = useState(null);
    const { isMobile } = useIsMobile();

    useEffect(() => {
        if (selectedId == null && categories.length > 0) {
            setSelectedId(categories[0].id);
        }
        if (selectedId != null && categories.length > 0 && !categories.some((c) => c.id === selectedId)) {
            setSelectedId(categories[0].id);
        }
    }, [categories, selectedId]);

    const selectedCategory = categories.find((c) => c.id === selectedId);

    const handleEditCategory = (cat) => {
        setCategoryToEdit(cat);
        setCategoryModalOpen(true);
    };

    const handleDeleteCategory = async (cat) => {
        try {
            await deleteCategory(cat.id);
            message.success(`Categoría "${cat.name}" eliminada`);
            await reloadCats();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al eliminar categoría');
        }
    };

    const handleEditSymbol = (sym) => {
        setSymbolToEdit(sym);
        setSymbolModalOpen(true);
    };

    const handleDeleteSymbol = async (sym) => {
        setDeletingSymbolId(sym.id);
        try {
            await deleteSymbol(sym.id);
            message.success('Símbolo eliminado');
            await reloadSymbols();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al eliminar símbolo');
        } finally {
            setDeletingSymbolId(null);
        }
    };

    return (
        <Content style={{ padding: isMobile ? 6 : 24, width: '100%' }}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                <div>
                    <Title level={isMobile ? 4 : 3} style={{ marginBottom: 4 }}>
                        Catálogo de símbolos
                    </Title>
                    <Text type="secondary">
                        Administra emojis, SVGs e imágenes disponibles en el panel de mediciones de
                        MapaLab y en la simbología de capas SLD.
                    </Text>
                </div>

                {catError && <Alert type="error" title={catError} showIcon closable />}

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : '280px 1fr',
                        gap: 16,
                        alignItems: 'start',
                    }}
                >
                    <Card
                        title={`Categorías (${categories.length})`}
                        size="small"
                        extra={
                            <Button
                                type="primary"
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => { setCategoryToEdit(null); setCategoryModalOpen(true); }}
                            >
                                Nueva
                            </Button>
                        }
                    >
                        {catLoading ? (
                            <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
                        ) : (
                            <List
                                dataSource={categories}
                                size="small"
                                locale={{ emptyText: 'Sin categorías' }}
                                renderItem={(cat) => (
                                    <List.Item
                                        onClick={() => setSelectedId(cat.id)}
                                        style={{
                                            cursor: 'pointer',
                                            background: cat.id === selectedId ? '#fff7e6' : 'transparent',
                                            borderRadius: 4,
                                            padding: '6px 8px',
                                        }}
                                        actions={[
                                            <Button
                                                key="edit"
                                                size="small"
                                                type="text"
                                                icon={<EditOutlined />}
                                                onClick={(e) => { e.stopPropagation(); handleEditCategory(cat); }}
                                            />,
                                            <Popconfirm
                                                key="del"
                                                title={`¿Eliminar "${cat.name}"?`}
                                                description="Se borrarán también todos sus símbolos."
                                                okText="Eliminar"
                                                cancelText="Cancelar"
                                                okButtonProps={{ danger: true }}
                                                onConfirm={(e) => { e?.stopPropagation?.(); handleDeleteCategory(cat); }}
                                                onCancel={(e) => e?.stopPropagation?.()}
                                            >
                                                <Button
                                                    size="small"
                                                    type="text"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </Popconfirm>,
                                        ]}
                                    >
                                        <Space size={6}>
                                            <CategoryIcon icon={cat.icon} name={cat.name} size={18} />
                                            <Text strong={cat.id === selectedId}>{cat.name}</Text>
                                        </Space>
                                    </List.Item>
                                )}
                            />
                        )}
                    </Card>

                    <Card
                        title={
                            selectedCategory
                                ? (
                                    <Space size={6}>
                                        <CategoryIcon
                                            icon={selectedCategory.icon}
                                            name={selectedCategory.name}
                                            size={18}
                                            fallback=""
                                        />
                                        <span>{selectedCategory.name}</span>
                                    </Space>
                                )
                                : 'Símbolos'
                        }
                        extra={
                            selectedCategory && (
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={() => { setSymbolToEdit(null); setSymbolModalOpen(true); }}
                                >
                                    Nuevo símbolo
                                </Button>
                            )
                        }
                    >
                        {!selectedCategory ? (
                            <Empty description="Selecciona o crea una categoría" />
                        ) : symLoading ? (
                            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                        ) : (
                            <SymbolGrid
                                symbols={symbols}
                                onEdit={handleEditSymbol}
                                onDelete={handleDeleteSymbol}
                                deletingId={deletingSymbolId}
                                onReorderSaved={reloadSymbols}
                            />
                        )}
                    </Card>
                </div>
            </Space>

            <CategoryFormModal
                open={categoryModalOpen}
                category={categoryToEdit}
                onClose={() => setCategoryModalOpen(false)}
                onSaved={reloadCats}
            />
            <SymbolFormModal
                open={symbolModalOpen}
                categoryId={selectedId}
                symbol={symbolToEdit}
                onClose={() => setSymbolModalOpen(false)}
                onSaved={reloadSymbols}
            />
        </Content>
    );
}
