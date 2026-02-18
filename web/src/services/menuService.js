import api from './apiService';

export const getPreviewMenu = async (token) => {
    try {
        const response = await api.get(`/preview/menu/${token}`)
        return transformMenuData(response.data.items || [])
    } catch {
        return null
    }
}

export const getMenuItems = async () => {
    try {
        const response = await api.get('/elementos-menu/arbol');
        return transformMenuData(response.data);
    } catch (error) {
        console.error('Error fetching menu items:', error);
        return [];
    }
};

const transformMenuData = (backendData) => {
    return backendData.map(item => ({
        id: item.id.toString(),
        name: item.label.toUpperCase(),
        path: item.url,
        icon: item.icon,
        disabled: item.disabled || false,
        submenu: item.children && item.children.length > 0
            ? item.children.map(child => ({
                name: child.label,
                path: child.url,
                icon: child.icon || '📄',
                disabled: child.disabled || false
            }))
            : undefined
    }));
};
