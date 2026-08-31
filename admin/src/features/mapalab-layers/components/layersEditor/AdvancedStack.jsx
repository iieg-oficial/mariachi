import EditorSection from '@features/mapalab-layers/components/layersEditor/EditorSection';

export default function AdvancedStack({ sections }) {
    return sections.map((section, i) => (
        <EditorSection key={section.key} title={section.title} first={i === 0}>
            {section.children}
        </EditorSection>
    ));
}
