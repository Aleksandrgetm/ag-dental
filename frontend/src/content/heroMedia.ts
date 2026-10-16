// Approved completed clinic montage; original retained outside the repository.
// Never use the rejected clinic-tour.mp4 or its extracted stills as a fallback.
export const approvedHeroVideo: string = '/media/clinic/approved/clinic-hero.mp4';
export const neutralHeroPoster = '/media/clinic/approved/hero-first-frame.webp';
// Only an isolated development server may serve a synthetic test fixture.
const fixture = import.meta.env.DEV && import.meta.env.VITE_HERO_TEST_VIDEO;
export const heroVideo = fixture === '/__hero-test.mp4' ? fixture : approvedHeroVideo;
