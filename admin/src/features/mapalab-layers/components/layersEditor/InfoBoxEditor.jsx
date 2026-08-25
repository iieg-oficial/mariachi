import InfoBoxBlocksEditor from '@features/mapalab-layers/components/layersEditor/InfoBoxBlocksEditor';
import InfoBoxJsonEditor from '@features/mapalab-layers/components/layersEditor/InfoBoxJsonEditor';

export default function InfoBoxEditor({
    value,
    onChange,
    mode = 'visual',
    availableFields = [],
    inherited = null,
    nodeType = null,
}) {
    if (mode === 'json') {
        return (
            <InfoBoxJsonEditor
                value={value}
                onChange={onChange}
                inherited={inherited}
            />
        );
    }

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
