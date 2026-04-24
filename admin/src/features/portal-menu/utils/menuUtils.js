import { ICON_MAP } from '@features/portal-menu/constants/menuConstants';

export const generateSlug = (text) => {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

export const generateUrl = (label, parentId, menuItems) => {
    const slug = generateSlug(label);

    if (!parentId) {
        return `/${slug}`;
    }

    const parent = menuItems.find(item => item.id === parentId);
    if (!parent) {
        return `/${slug}`;
    }

    return `${parent.url}/${slug}`;
};

export const getItemLevel = (itemId, menuItems) => {
    const item = menuItems.find(i => i.id === itemId);
    if (!item || !item.parentId) return 1;
    return 1 + getItemLevel(item.parentId, menuItems);
};

export const findAllChildren = (itemId, menuItems) => {
    const idsToDelete = [itemId];
    const itemsToDelete = [menuItems.find(i => i.id === itemId)];

    const findChildren = (parentId) => {
        menuItems.forEach(i => {
            if (i.parentId === parentId) {
                idsToDelete.push(i.id);
                itemsToDelete.push(i);
                findChildren(i.id);
            }
        });
    };
    findChildren(itemId);

    return { idsToDelete, itemsToDelete };
};

export const getIconComponent = (iconName) => {
    const IconComponent = ICON_MAP[iconName];
    return IconComponent ? IconComponent : null;
};
