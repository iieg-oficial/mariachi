import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import UserAvatar from '@features/users/components/UserAvatar';
import { AVATAR_COLORS, colorDe, inicialesDe } from '@features/users/helpers/avatar';

describe('inicialesDe', () => {
    it('toma la inicial del nombre y la del apellido', () => {
        expect(inicialesDe('María López')).toBe('ML');
    });

    it('con nombre y dos apellidos usa el primer apellido', () => {
        expect(inicialesDe('María López García')).toBe('ML');
    });

    it('con dos nombres y dos apellidos salta al primer apellido', () => {
        expect(inicialesDe('María del Carmen López García')).toBe('ML');
    });

    it('ignora las particulas', () => {
        expect(inicialesDe('Juan de la Cruz')).toBe('JC');
    });

    it('con un solo nombre devuelve una letra', () => {
        expect(inicialesDe('Prensa')).toBe('P');
    });

    it('sin nombre no truena', () => {
        expect(inicialesDe('')).toBe('?');
        expect(inicialesDe(undefined)).toBe('?');
    });
});

describe('colorDe', () => {
    it('siempre cae en la paleta', () => {
        ['ana', 'beto', 'carla', 'dani', 'eva'].forEach((semilla) => {
            expect(AVATAR_COLORS).toContain(colorDe(semilla));
        });
    });

    it('es estable para la misma semilla', () => {
        expect(colorDe('maria.lopez')).toBe(colorDe('maria.lopez'));
    });

    it('reparte distinto entre usuarios distintos', () => {
        expect(colorDe('maria.lopez')).not.toBe(colorDe('juan.perez'));
    });
});

describe('UserAvatar', () => {
    it('sin imagen pinta las iniciales', () => {
        render(<UserAvatar user={{ name: 'María López', username: 'maria.lopez' }} />);
        expect(screen.getByText('ML')).toBeInTheDocument();
    });

    it('con imagen no pinta iniciales', () => {
        render(<UserAvatar user={{ name: 'María López', username: 'maria.lopez', avatarUrl: 'https://x/a.webp' }} />);
        expect(screen.queryByText('ML')).not.toBeInTheDocument();
    });
});
