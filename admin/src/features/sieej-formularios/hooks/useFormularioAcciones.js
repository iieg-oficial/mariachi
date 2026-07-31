import { Modal } from 'antd';
import { message } from '@shared/services/message';
import { formulariosApi } from '../services/formulariosAdminApi';

const vigenciaVencida = (formulario) => (
    !!formulario.vigencia_fin && new Date(formulario.vigencia_fin) < new Date()
);

export default function useFormularioAcciones(onDone) {
    const ejecutar = (accion, exito, errorMsg) => async () => {
        try {
            const resultado = await accion();
            message.success(exito);
            onDone?.(resultado);
        } catch (err) {
            message.error(err?.response?.data?.detail || errorMsg);
        }
    };

    const publicar = (formulario) => Modal.confirm({
        title: '¿Publicar formulario?',
        content: 'Los usuarios asignados podrán verlo y responderlo a partir de este momento. Asegúrate de que la definición y las asignaciones estén listas.',
        okText: 'Publicar',
        cancelText: 'Cancelar',
        onOk: ejecutar(
            () => formulariosApi.publicar(formulario.id),
            'Formulario publicado',
            'Error al publicar',
        ),
    });

    const cerrar = (formulario) => Modal.confirm({
        title: '¿Cerrar formulario?',
        content: 'Los respondents ya no podrán enviarlo. Los envíos existentes se mantienen.',
        okText: 'Cerrar',
        cancelText: 'Cancelar',
        onOk: ejecutar(
            () => formulariosApi.cerrar(formulario.id),
            'Formulario cerrado',
            'Error al cerrar',
        ),
    });

    const reabrir = (formulario) => Modal.confirm({
        title: '¿Reabrir formulario?',
        content: vigenciaVencida(formulario)
            ? 'Volverá a estar activo y se quitará la vigencia vencida, así que quedará abierto sin fecha de cierre hasta que configures una nueva.'
            : 'Volverá a estar activo y las dependencias asignadas podrán enviarlo de nuevo.',
        okText: 'Reabrir',
        cancelText: 'Cancelar',
        onOk: ejecutar(
            () => formulariosApi.reabrir(formulario.id),
            'Formulario reabierto',
            'Error al reabrir',
        ),
    });

    return { publicar, cerrar, reabrir };
}
