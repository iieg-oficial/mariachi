import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PresenciaCampos from '@shared/components/PresenciaCampos';
import { rutaMenciona } from '@shared/services/cambios';

describe('PresenciaCampos', () => {
    it('marca el campo enfocado con el nombre de quien escribe', () => {
        const { container } = render(
            <PresenciaCampos contenedor=".f" editores={[{ username: 'mr', name: 'María Ruiz', campo: 'label' }]} />,
        );
        const css = container.querySelector('style').textContent;
        expect(css).toContain('[id="label"]');
        expect(css).toContain('"María escribiendo"');
    });

    it('ignora campos y nombres que podrían romper el CSS', () => {
        const { container } = render(
            <PresenciaCampos
                contenedor=".f"
                editores={[
                    { username: 'a', name: 'x', campo: 'a"]{}' },
                    { username: 'b', name: 'Eve"}body{', campo: 'slug' },
                ]}
            />,
        );
        const css = container.querySelector('style').textContent;
        expect(css).not.toContain('a"]');
        expect(css).toContain('"Evebody escribiendo"');
    });

    it('no pinta nada sin campo', () => {
        const { container } = render(<PresenciaCampos contenedor=".f" editores={[{ username: 'a', name: 'A' }]} />);
        expect(container.querySelector('style')).toBeNull();
    });
});

describe('rutaMenciona', () => {
    it('encuentra el id como segmento completo', () => {
        expect(rutaMenciona('/layers/capa%201/aliases', 'capa 1')).toBe(true);
        expect(rutaMenciona('/layers/capa-10', 'capa-1')).toBe(false);
    });
});
