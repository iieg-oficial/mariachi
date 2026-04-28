import api from '@shared/services/api';

export const actualizarPerfil = async (data) => {
    const res = await api.put('/autenticacion/perfil', data);
    return res.data;
};
