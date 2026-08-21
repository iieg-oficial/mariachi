import { describe, it, expect } from 'vitest';
import { pendientesDe } from '@features/users/helpers/estadoCuenta';

const alDia = {
    role: 'editora',
    minerva_vinculado: true,
    must_change_password: false,
    ultimo_acceso: new Date().toISOString(),
    projects: [{ slug: 'sieej', name: 'SIEEJ', project_role: 'editor' }],
};

describe('pendientesDe', () => {
    it('una cuenta completa no tiene pendientes', () => {
        expect(pendientesDe(alDia)).toEqual([]);
    });

    it('detecta la cuenta sin vincular a minerva', () => {
        expect(pendientesDe({ ...alDia, minerva_vinculado: false })[0]).toMatch(/Sin vincular a minerva/);
    });

    it('detecta la contrasena por renovar', () => {
        expect(pendientesDe({ ...alDia, must_change_password: true })[0]).toMatch(/renovar su contraseña/);
    });

    it('distingue nunca ingreso de inactiva', () => {
        expect(pendientesDe({ ...alDia, ultimo_acceso: null })[0]).toMatch(/Nunca ha iniciado sesión/);
        const viejo = new Date(Date.now() - 400 * 86400000).toISOString();
        expect(pendientesDe({ ...alDia, ultimo_acceso: viejo })[0]).toMatch(/Sin ingresar desde hace/);
    });

    it('la editora sin proyectos no puede trabajar en nada', () => {
        expect(pendientesDe({ ...alDia, projects: [] })[0]).toMatch(/Sin proyectos asignados/);
    });

    it('a la tetlamamakani no le exige proyectos', () => {
        expect(pendientesDe({ ...alDia, role: 'tetlamamakani', projects: [] })).toEqual([]);
    });

    it('el externo sin dependencia queda pendiente', () => {
        const externo = { ...alDia, role: 'externo' };
        expect(pendientesDe(externo).some((p) => /sin dependencia/.test(p))).toBe(true);
        expect(pendientesDe({ ...externo, sieej_grupo: { id: 1, nombre: 'IIEG' } })).toEqual([]);
    });

    it('sin detalle visible no acusa falta de proyectos que no puede ver', () => {
        expect(pendientesDe({ ...alDia, projects: [] }, false)).toEqual([]);
    });
});
