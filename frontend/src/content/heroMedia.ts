// Deliberately empty until real AG Dental footage has been explicitly approved.
// Never use the rejected clinic-tour.mp4 or its extracted stills as a fallback.
export const approvedHeroVideo: string = '';
export const neutralHeroPoster = '/media/clinic/neutral-brand.svg';
// Only an isolated development server may serve a synthetic test fixture.
const fixture = import.meta.env.DEV && import.meta.env.VITE_HERO_TEST_VIDEO;
export const heroVideo = fixture === '/__hero-test.mp4' ? fixture : approvedHeroVideo;
