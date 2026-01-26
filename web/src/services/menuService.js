import api from './apiService';

export const getMenuItems = async () => {
    try {
        const response = await api.get('/menu-items/tree');
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
        submenu: item.children && item.children.length > 0
            ? item.children.map(child => ({
                name: child.label,
                path: child.url,
                icon: child.icon || '📄'
            }))
            : undefined
    }));
};
