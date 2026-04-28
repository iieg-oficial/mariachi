import { useState } from 'react';
import { Form } from 'antd';
import { generateUrl, getItemLevel } from '@features/portal-menu/utils/menuUtils';
import { MAX_LEVEL } from '@features/portal-menu/constants/menuConstants';
import { message } from '@shared/services/message';

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
        form.setFieldsValue({ status: 'visible' });
        setModalVisible(true);
    };

    const handleAddChild = (parentItem) => {
        setEditingItem(null);
        setSelectedParent(parentItem);
        setUrlPreview(`${parentItem.url}/`);
        setIconType('none');
        form.resetFields();
        form.setFieldsValue({ parentId: parentItem.id, status: 'visible' });
        setModalVisible(true);
    };

    const getStatusFromItem = (item) => {
        if (item.disabled) return 'disabled';
        if (item.visible) return 'visible';
        return 'hidden';
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

        form.setFieldsValue({
            ...item,
            status: getStatusFromItem(item)
        });
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

        const { status, ...rest } = values;
        const payload = {
            ...rest,
            url,
            visible: status === 'visible' || status === 'disabled',
            disabled: status === 'disabled'
        };

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
