import { useState, useEffect } from 'react';
import { message } from 'antd';
import api from '@services/api';

export const useMenuIcons = () => {
    const [customIcons, setCustomIcons] = useState([]);

    useEffect(() => {
        fetchCustomIcons();
    }, []);

    const fetchCustomIcons = async () => {
        try {
            const response = await api.get('/icons');
            setCustomIcons(response.data);
        } catch {
            message.error('Error al cargar iconos personalizados');
        }
    };

    return { customIcons };
};
