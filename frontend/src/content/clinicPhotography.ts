// Approved local presentation assets. Never modify CMS records or specialist portraits.
const base = '/media/clinic/approved/';
export const clinicPhotography = {
  signage: { alt: { lv: 'AG Zobārstniecības izkārtne pie klīnikas', ru: 'Вывеска AG Zobārstniecība у клиники', en: 'AG Zobārstniecība sign outside the clinic' } },
  'room-tall': { alt: { lv: 'AG klīnikas ārstniecības kabinets dienas gaismā', ru: 'Лечебный кабинет клиники AG при дневном свете', en: 'AG clinic treatment room in daylight' } },
  consultation: { alt: { lv: 'Darba galds AG klīnikas kabinetā', ru: 'Рабочий стол в кабинете клиники AG', en: 'Desk in an AG clinic room' } },
  hygiene: { alt: { lv: 'Mutes kopšanas līdzekļu paraugi AG klīnikā', ru: 'Образцы средств ухода за полостью рта в клинике AG', en: 'Oral care product samples at AG clinic' } },
  equipment: { alt: { lv: 'Zobārstniecības iekārta AG klīnikas kabinetā', ru: 'Стоматологическое оборудование в кабинете клиники AG', en: 'Dental equipment in an AG clinic room' } },
  room: { alt: { lv: 'AG Zobārstniecības ārstniecības kabinets', ru: 'Лечебный кабинет AG Zobārstniecība', en: 'AG Zobārstniecība treatment room' } },
  reception: { alt: { lv: 'AG Zobārstniecības reģistratūra', ru: 'Регистратура AG Zobārstniecība', en: 'AG Zobārstniecība reception' } },
  about: { alt: { lv: 'Pacientu uzņemšana AG Zobārstniecībā', ru: 'Приём пациентов в AG Zobārstniecība', en: 'Patient reception at AG Zobārstniecība' } },
  exterior: { alt: { lv: 'AG Zobārstniecības ēka un piekļuve klīnikai', ru: 'Здание AG Zobārstniecība и подход к клинике', en: 'AG Zobārstniecība building and access to the clinic' } },
  entrance: { alt: { lv: 'Ieeja AG Zobārstniecības klīnikā', ru: 'Вход в клинику AG Zobārstniecība', en: 'Entrance to AG Zobārstniecība' } },
};
export type ClinicPhoto = keyof typeof clinicPhotography;
export const clinicPhoto = (name: ClinicPhoto) => `${base}${name}-1600.webp`;
export function clinicPhotoMetadata(value: string) {
  const name = (Object.keys(clinicPhotography) as ClinicPhoto[]).find(name => value === clinicPhoto(name));
  return name ? { ...clinicPhotography[name], srcset: [480,960,1600].map(width => `${base}${name}-${width}.webp ${width}w`).join(', ') } : undefined;
}
// Match only legacy local references: published custom media remains authoritative.
export const clinicPhotoReplacements: Record<string,string> = {
  '/media/clinic/tour-room.jpg': clinicPhoto('room'),
  '/media/clinic/tour-detail.jpg': clinicPhoto('room'),
  '/media/clinic/clinic-original.jpg': clinicPhoto('about'),
  '/media/clinic/location.jpg': clinicPhoto('exterior'),
};

// Context-specific selection applies only to our legacy presentation replacements.
// A custom CMS URL and every specialist portrait always pass through unchanged.
export function sectionPhoto(value: string, name: ClinicPhoto) {
  return Object.values(clinicPhotoReplacements).includes(value) ? clinicPhoto(name) : value;
}
export function servicePhoto(value: string, slug = '', context: 'index' | 'detail' = 'detail') {
  const name: ClinicPhoto = slug === 'zobu-higiena' ? 'hygiene'
    : slug === 'zobu-balinasana' ? 'equipment'
    : slug === 'zobu-protezesana' ? 'consultation'
    : context === 'index' ? 'equipment' : 'room';
  return sectionPhoto(value, name);
}
