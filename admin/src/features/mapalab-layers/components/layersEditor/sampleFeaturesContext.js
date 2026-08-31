import { createContext, useContext } from 'react';

export const SampleFeaturesContext = createContext({ features: [], samplesOf: () => [] });

export const useSampleFeatures = () => useContext(SampleFeaturesContext);
