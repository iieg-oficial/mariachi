import { describe, expect, it } from 'vitest';
import { toAntTreeData } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';

const nodoDelVisor = {
    id: 'salud-hospitales',
    label: 'Establecimientos de salud',
    nodeType: 'leaf',
    geometryType: 'point',
    disabled: true,
    hiddenInMenu: true,
    wmsConfig: {
        workspace: 'salud',
        geoserverLayer: 'establecimientos_2024',
        cqlFilter: "nivel = 'SEGUNDO'",
    },
};

describe('toAntTreeData', () => {
    it('lee workspace y capa de GeoServer desde wmsConfig, que es donde el visor los anida', () => {
        const [nodo] = toAntTreeData([nodoDelVisor]);

        expect(nodo.workspaceAlias).toBe('salud');
        expect(nodo.geoserverLayer).toBe('establecimientos_2024');
        expect(nodo.cqlFilter).toBe("nivel = 'SEGUNDO'");
    });

    it('conserva el estado y la geometría que alimentan las señales de la fila', () => {
        const [nodo] = toAntTreeData([nodoDelVisor]);

        expect(nodo.disabled).toBe(true);
        expect(nodo.hiddenInMenu).toBe(true);
        expect(nodo.geometryType).toBe('point');
    });

    it('no inventa estado cuando el árbol no lo trae', () => {
        const [nodo] = toAntTreeData([{ id: 'tema-salud', label: 'Salud', nodeType: 'tema' }]);

        expect(nodo.disabled).toBe(false);
        expect(nodo.hiddenInMenu).toBe(false);
        expect(nodo.workspaceAlias).toBeNull();
    });

    it('deja el nombre intacto, sin el asterisco que ponía el visor', () => {
        const [nodo] = toAntTreeData([nodoDelVisor]);

        expect(nodo.title).toBe('Establecimientos de salud');
    });

    it('tolera el árbol viejo mientras mapalab no se despliega: asterisco fuera y estado deducido', () => {
        const [nodo] = toAntTreeData([{
            id: 'camaras',
            label: '*Cámaras C5',
            nodeType: 'leaf',
        }]);

        expect(nodo.title).toBe('Cámaras C5');
        expect(nodo.disabled).toBe(true);
    });

    it('propaga el tipo del padre para distinguir una propiedad de una capa suelta', () => {
        const [grupo] = toAntTreeData([{
            id: 'delitos',
            label: 'Delitos de alto impacto',
            nodeType: 'group',
            children: [{ id: 'homicidio', label: 'Homicidio doloso', nodeType: 'leaf' }],
        }]);

        expect(grupo.children[0].parentNodeType).toBe('group');
    });
});

describe('toAntTreeData con etiquetas intermedias', () => {
    const grupoConEtiqueta = [{
        id: 'salud.unidades',
        label: 'Establecimientos de salud',
        nodeType: 'group',
        children: [{
            id: 'salud.unidades.primer',
            label: 'Primer nivel',
            nodeType: 'label',
            children: [
                { id: 'salud.unidades.primer.imss', label: 'IMSS', nodeType: 'leaf' },
            ],
        }],
    }];

    it('la etiqueta no oculta al grupo: sus hojas siguen siendo propiedades', () => {
        const [grupo] = toAntTreeData(grupoConEtiqueta);
        const [etiqueta] = grupo.children;
        const [hoja] = etiqueta.children;

        expect(etiqueta.parentNodeType).toBe('group');
        expect(hoja.parentNodeType).toBe('group');
    });

    it('una etiqueta bajo una categoría no convierte a sus hijos en propiedades', () => {
        const [categoria] = toAntTreeData([{
            id: 'delitos', label: 'Delitos', nodeType: 'category',
            children: [{
                id: 'delitos.patrimonio', label: 'Contra el patrimonio', nodeType: 'label',
                children: [{ id: 'delitos.patrimonio.bancos', label: 'Robo a bancos', nodeType: 'group' }],
            }],
        }]);

        expect(categoria.children[0].children[0].parentNodeType).toBe('category');
    });
});
