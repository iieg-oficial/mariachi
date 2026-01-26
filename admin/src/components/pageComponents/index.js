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
import { COMPONENT_TYPES } from '@constants/pageConstants';

export const COMPONENT_MAP = {
    [COMPONENT_TYPES.TEXT]: TextComponent,
    [COMPONENT_TYPES.HEADING]: HeadingComponent,
    [COMPONENT_TYPES.IMAGE]: ImageComponent,
    [COMPONENT_TYPES.HERO_BANNER]: HeroBannerComponent,
    [COMPONENT_TYPES.CAROUSEL]: CarouselComponent,
    [COMPONENT_TYPES.CARD_GRID]: CardGridComponent,
    [COMPONENT_TYPES.INFO_SECTION]: InfoSectionComponent,
    [COMPONENT_TYPES.PROCUREMENT_LIST]: ProcurementListComponent,
    [COMPONENT_TYPES.CONTACT_FORM]: ContactFormComponent,
    [COMPONENT_TYPES.FEATURE_SHOWCASE]: FeatureShowcaseComponent
};

export const getComponentByType = (type) => {
    return COMPONENT_MAP[type] || null;
};

export {
    TextComponent,
    HeadingComponent,
    ImageComponent,
    HeroBannerComponent,
    CarouselComponent,
    CardGridComponent,
    InfoSectionComponent,
    ProcurementListComponent,
    ContactFormComponent,
    FeatureShowcaseComponent
};
