import api from '@shared/services/api';

export const actualizarPerfil = async (data) => {
    const res = await api.put('/autenticacion/perfil', data);
    return res.data;
};

export const subirAvatar = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/autenticacion/perfil/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
};
