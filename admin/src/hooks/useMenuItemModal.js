import { useState } from 'react';
import { Form, message } from 'antd';
import { generateUrl, getItemLevel } from '@utils/menuUtils';
import { MAX_LEVEL } from '@constants/menuConstants';

export const useMenuItemModal = (menuItems, createItem, updateItem) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [selectedParent, setSelectedParent] = useState(null);
    const [urlPreview, setUrlPreview] = useState('');
    const [iconType, setIconType] = useState('none');
    const [form] = Form.useForm();

    const handleCreate = () => {
        setEditingItem(null);
        setSelectedParent(null);
        setUrlPreview('/');
        setIconType('none');
        form.resetFields();
        setModalVisible(true);
    };

    const handleAddChild = (parentItem) => {
        setEditingItem(null);
        setSelectedParent(parentItem);
        setUrlPreview(`${parentItem.url}/`);
        setIconType('none');
        form.resetFields();
        form.setFieldsValue({ parentId: parentItem.id });
        setModalVisible(true);
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setSelectedParent(null);
        setUrlPreview(item.url);

        if (item.iconId) {
            setIconType('custom');
        } else if (item.icon) {
            setIconType('predefined');
        } else {
            setIconType('none');
        }

        form.setFieldsValue(item);
        setModalVisible(true);
    };

    const handleLabelChange = (e) => {
        const label = e.target.value;
        if (label) {
            const parentId = form.getFieldValue('parentId') || selectedParent?.id;
            const generatedUrl = generateUrl(label, parentId, menuItems);
            setUrlPreview(generatedUrl);
        } else {
            const parentId = form.getFieldValue('parentId') || selectedParent?.id;
            if (parentId) {
                const parent = menuItems.find(item => item.id === parentId);
                setUrlPreview(parent ? `${parent.url}/` : '/');
            } else {
                setUrlPreview('/');
            }
        }
    };

    const handleIconTypeChange = (e) => {
        const newIconType = e.target.value;
        setIconType(newIconType);

        if (newIconType === 'none') {
            form.setFieldsValue({ icon: undefined, iconId: undefined });
        } else if (newIconType === 'predefined') {
            form.setFieldsValue({ iconId: undefined });
        } else if (newIconType === 'custom') {
            form.setFieldsValue({ icon: undefined });
        }
    };

    const handleSubmit = (values) => {
        if (values.parentId) {
            const parentLevel = getItemLevel(values.parentId, menuItems);
            if (parentLevel >= MAX_LEVEL) {
                message.error(`No se puede crear un submenú. El nivel máximo es ${MAX_LEVEL}`);
                return;
            }
        }

        const url = generateUrl(values.label, values.parentId, menuItems);

        const payload = { ...values, url };
        if (iconType === 'none') {
            delete payload.icon;
            delete payload.iconId;
        } else if (iconType === 'predefined') {
            delete payload.iconId;
        } else if (iconType === 'custom') {
            delete payload.icon;
        }

        if (editingItem) {
            updateItem(editingItem.id, payload);
        } else {
            createItem(payload);
        }

        setModalVisible(false);
    };

    const handleCancel = () => {
        setModalVisible(false);
    };

    return {
        modalVisible,
        editingItem,
        selectedParent,
        urlPreview,
        iconType,
        form,
        handleCreate,
        handleAddChild,
        handleEdit,
        handleLabelChange,
        handleIconTypeChange,
        handleSubmit,
        handleCancel
    };
};
