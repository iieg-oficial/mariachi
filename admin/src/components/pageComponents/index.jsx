import TextComponent from './TextComponent';
import HeroBannerComponent from './HeroBannerComponent';
import CarouselComponent from './CarouselComponent';
import CardGridComponent from './CardGridComponent';
import InfoSectionComponent from './InfoSectionComponent';
import ProcurementListComponent from './ProcurementListComponent';
import ContactFormComponent from './ContactFormComponent';
import { BLOCK_TYPES } from '@constants/pageConstants';

export const BLOCK_COMPONENT_MAP = {
    [BLOCK_TYPES.HERO]: HeroBannerComponent,
    [BLOCK_TYPES.RICH_TEXT]: TextComponent,
    [BLOCK_TYPES.FEATURES_GRID]: CardGridComponent,
    [BLOCK_TYPES.MEDIA_GALLERY]: CarouselComponent,
    [BLOCK_TYPES.INFO_SECTION]: InfoSectionComponent,
    [BLOCK_TYPES.PROCUREMENT_LIST]: ProcurementListComponent,
    [BLOCK_TYPES.CONTACT_FORM]: ContactFormComponent
};

export const getBlockComponent = (type) => {
    return BLOCK_COMPONENT_MAP[type] || (() => <div>Componente no encontrado: {type}</div>);
};
