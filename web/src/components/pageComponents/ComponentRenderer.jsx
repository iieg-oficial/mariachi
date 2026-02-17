import TextComponent from './TextComponent';
import HeadingComponent from './HeadingComponent';
import ImageComponent from './ImageComponent';
import HeroBannerComponent from './HeroBannerComponent';
import CarouselComponent from './CarouselComponent';
import CardGridComponent from './CardGridComponent';
import InfoSectionComponent from './InfoSectionComponent';
import ProcurementListComponent from './ProcurementListComponent';
import ContactFormComponent from './ContactFormComponent';
import FeatureShowcaseComponent from './FeatureShowcaseComponent';

const COMPONENT_MAP = {
    'text': TextComponent,
    'heading': HeadingComponent,
    'image': ImageComponent,
    'hero-banner': HeroBannerComponent,
    'carousel': CarouselComponent,
    'card-grid': CardGridComponent,
    'info-section': InfoSectionComponent,
    'procurement-list': ProcurementListComponent,
    'contact-form': ContactFormComponent,
    'feature-showcase': FeatureShowcaseComponent
};

function ComponentRenderer({ component }) {
    const Component = COMPONENT_MAP[component.type];

    if (!Component) {
        return null;
    }

    return <Component {...component.props} />;
}

const GRID_COLS = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-4'
};

export default function SectionRenderer({ sections = [] }) {
    if (sections.length === 0) return null;

    return (
        <div className="space-y-8">
            {sections.map((section) => (
                <section key={section.id} className="w-full">
                    <div className={`grid ${GRID_COLS[section.columns] || 'grid-cols-1'} gap-6`}>
                        {(section.components || []).map((component) => (
                            <ComponentRenderer key={component.id} component={component} />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
