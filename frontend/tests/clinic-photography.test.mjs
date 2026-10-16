import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {clinicPhoto,clinicPhotoMetadata,clinicPhotoReplacements,sectionPhoto,servicePhoto} from '../src/content/clinicPhotography.ts';
test('approved clinic photos have local responsive assets and complete alt translations',()=>{
 for(const name of ['room','reception','about','exterior','entrance','room-tall','consultation','hygiene','signage','equipment']) {
 const meta=clinicPhotoMetadata(clinicPhoto(name));
 for(const lang of ['lv','ru','en'])assert.ok(meta.alt[lang]);
 for(const width of [480,960,1600])assert.ok(existsSync(new URL(`../public/media/clinic/approved/${name}-${width}.webp`,import.meta.url)));
 assert.equal(meta.srcset.split(', ').length,3);
 }
 assert.equal(clinicPhotoMetadata('cms-media:custom'),undefined);
 assert.equal(clinicPhotoReplacements['/media/clinic/anda-gutovska.jpg'],undefined);
 assert.equal(clinicPhotoReplacements['cms-media:custom'],undefined);
});
test('approved Hero media is connected without replacing protected legacy media',()=>{
 const config=readFileSync(new URL('../src/content/heroMedia.ts',import.meta.url),'utf8');
 assert.match(config,/approved\/clinic-hero.mp4/);
 assert.match(config,/approved\/hero-first-frame.webp/);
 assert.ok(existsSync(new URL('../public/media/clinic/clinic-tour.mp4',import.meta.url)));
});

test('contextual choices diversify sections but never replace custom CMS images or portraits',()=>{
 const original=clinicPhoto('about');
 assert.equal(sectionPhoto(original,'consultation'),clinicPhoto('consultation'));
 assert.equal(servicePhoto(original,'zobu-higiena'),clinicPhoto('hygiene'));
 assert.equal(servicePhoto(clinicPhoto('room'),'zobu-arstesana','index'),clinicPhoto('equipment'));
 for(const custom of ['cms-media:published-id','https://example.invalid/published.webp','/media/clinic/anda-gutovska.jpg']) {
  assert.equal(sectionPhoto(custom,'signage'),custom);
  assert.equal(servicePhoto(custom,'zobu-higiena'),custom);
 }
});
