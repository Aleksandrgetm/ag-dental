<script setup lang="ts">
import { media } from "../../content/clinic";
</script>

<template>
  <section class="section clinic-about" lang="lv" aria-labelledby="clinic-about-title">
    <div class="container">
      <div class="clinic-about-spread">
        <header class="clinic-about-heading" data-reveal>
          <p class="eyebrow">PAR MUMS</p>
          <h2 id="clinic-about-title">
            Vairāk nekā<br />15 gadu pieredze<br /><em>un rūpes.</em>
          </h2>
        </header>

        <figure class="clinic-about-photo" data-reveal="image">
          <img
            :src="media.detail"
            alt="AG Zobārstniecības klīnikas gaišais gaitenis ar ārstniecības kabinetiem"
            loading="lazy"
            width="1280"
            height="720"
          />
        </figure>

        <div class="clinic-about-body" data-reveal data-delay="80">
          <p class="clinic-about-lead">
            AG Zobārstniecība — mierīga un iejūtīga zobārstniecība visai ģimenei
            Rīgā, Teikā.
          </p>
          <p>
            Vispirms radām vidi, kur varat justies droši. Uzklausām, izrunājam
            jūsu situāciju un kopā meklējam piemērotāko ārstēšanas risinājumu.
            Katram pacientam — individuāla pieeja un rūpīgi pārdomāta ārstēšana.
          </p>
          <RouterLink class="text-link clinic-about-link" to="/par-mums">
            Iepazīt klīniku
          </RouterLink>
        </div>

        <dl class="clinic-about-facts" data-reveal data-delay="120">
          <div>
            <dt class="clinic-about-years">15+</dt>
            <dd>gadu pieredze<span>Dr. Anda Gutovska</span></dd>
          </div>
          <div>
            <dt class="clinic-about-place">Rīga · Teika</dt>
            <dd>Ūnijas iela 25</dd>
          </div>
        </dl>
      </div>
    </div>
  </section>
</template>

<style scoped>
.clinic-about {
  background: var(--paper);
  color: var(--ink);
}
.clinic-about-spread {
  display: grid;
  grid-template-columns: 58% 42%;
  grid-template-rows: auto 1fr auto;
}
.clinic-about-heading,
.clinic-about-body,
.clinic-about-facts {
  grid-column: 2;
  margin-left: clamp(32px, 4vw, 64px);
}
.clinic-about-heading {
  grid-row: 1;
  padding-top: 8px;
  margin-bottom: 28px;
}
.clinic-about-heading .eyebrow {
  margin-bottom: 24px;
}
.content-design .clinic-about-heading h2 {
  font-size: clamp(42px, 4.3vw, 66px);
  line-height: 1.04;
  letter-spacing: -0.04em;
  text-wrap: initial;
}
.clinic-about-photo {
  grid-column: 1;
  grid-row: 1 / 4;
  min-height: 680px;
  overflow: hidden;
}
.clinic-about-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 48% center;
}
.clinic-about-body {
  grid-row: 2;
  margin-bottom: 52px;
}
.clinic-about-body p {
  max-width: 42ch;
  font-size: 15px;
  line-height: 1.85;
  color: var(--editorial-caption);
}
.clinic-about-body .clinic-about-lead {
  color: var(--ink);
  font-size: 17px;
  line-height: 1.7;
}
.clinic-about-body p + p {
  margin-top: 18px;
}
.clinic-about-link {
  margin-top: 28px;
  min-height: 44px;
  align-items: center;
}
.clinic-about-facts {
  grid-row: 3;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: baseline;
  gap: 24px;
  border-top: 1px solid var(--editorial-rule);
  padding-top: 22px;
}
.clinic-about-facts dt {
  font-family: var(--serif);
  font-weight: 400;
  letter-spacing: -0.035em;
  line-height: 1.1;
}
.clinic-about-years {
  font-size: 60px;
}
.clinic-about-place {
  font-size: 28px;
}
.clinic-about-facts dd {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.7;
}
.clinic-about-facts dd span {
  display: block;
  color: var(--editorial-caption);
  font-size: 12px;
}
@media (max-width: 1100px) {
  .clinic-about-spread {
    grid-template-columns: 54% 46%;
  }
  .clinic-about-body {
    margin-bottom: 36px;
  }
  .clinic-about-photo {
    min-height: 660px;
  }
}
@media (max-width: 800px) {
  .clinic-about-spread {
    grid-template-columns: minmax(0, 1fr);
  }
  .clinic-about-heading,
  .clinic-about-body,
  .clinic-about-facts,
  .clinic-about-photo {
    grid-column: 1;
    grid-row: auto;
    margin-left: 0;
  }
  .clinic-about-heading {
    padding-top: 0;
    margin-bottom: 32px;
  }
  .content-design .clinic-about-heading h2 {
    font-size: clamp(42px, 8vw, 64px);
  }
  .clinic-about-photo {
    min-height: 0;
    aspect-ratio: 4 / 3;
    margin-bottom: 32px;
  }
  .clinic-about-body {
    margin-bottom: 36px;
  }
  .clinic-about-body p {
    max-width: 56ch;
  }
  .clinic-about-facts {
    gap: 20px;
  }
}
@media (max-width: 420px) {
  .clinic-about-photo {
    aspect-ratio: 1 / 1;
  }
  .clinic-about-years {
    font-size: 54px;
  }
  .clinic-about-place {
    font-size: 26px;
  }
}
</style>
