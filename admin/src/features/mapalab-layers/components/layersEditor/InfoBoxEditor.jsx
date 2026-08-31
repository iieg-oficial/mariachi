import InfoBoxBlocksEditor from '@features/mapalab-layers/components/layersEditor/InfoBoxBlocksEditor';
import InfoBoxJsonEditor from '@features/mapalab-layers/components/layersEditor/InfoBoxJsonEditor';
import InfoBoxLienzo from '@features/mapalab-layers/components/layersEditor/InfoBoxLienzo';

export default function InfoBoxEditor({
    value,
    onChange,
    mode = 'lienzo',
    availableFields = [],
    inherited = null,
    nodeType = null,
}) {
    if (mode === 'json') {
        return <InfoBoxJsonEditor value={value} onChange={onChange} inherited={inherited} />;
    }

    if (mode === 'visual') {
        return (
            <InfoBoxBlocksEditor
                value={value}
                onChange={onChange}
                availableFields={availableFields}
                inherited={inherited}
                nodeType={nodeType}
            />
        );
    }

    return (
        <InfoBoxLienzo
            value={value}
            onChange={onChange}
            availableFields={availableFields}
            inherited={inherited}
        />
    );
}
