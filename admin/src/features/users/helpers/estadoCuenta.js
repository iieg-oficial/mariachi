const DIAS_INACTIVA = 180;

const dias = (desde) => (Date.now() - new Date(desde).getTime()) / 86400000;

export const pendientesDe = (user, detalleVisible = true) => {
    const pendientes = [];

    if (!user.minerva_vinculado) {
        pendientes.push('Sin vincular a minerva: la cuenta existe pero nadie la ha reclamado');
    }
    if (user.must_change_password) {
        pendientes.push('Debe renovar su contraseña en el próximo ingreso');
    }
    if (!user.ultimo_acceso) {
        pendientes.push('Nunca ha iniciado sesión');
    } else if (dias(user.ultimo_acceso) > DIAS_INACTIVA) {
        pendientes.push(`Sin ingresar desde hace más de ${DIAS_INACTIVA / 30} meses`);
    }
    if (detalleVisible && user.role !== 'tetlamamakani' && (user.projects || []).length === 0) {
        pendientes.push('Sin proyectos asignados: no puede trabajar en nada');
    }
    if (user.role === 'externo' && !user.sieej_grupo) {
        pendientes.push('Externo sin dependencia: no hereda los formularios de su grupo');
    }

    return pendientes;
};

export const formatoFecha = (valor) => {
    if (!valor) return null;
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime())
        ? null
        : fecha.toLocaleDateString('es-MX', { dateStyle: 'medium' });
};
