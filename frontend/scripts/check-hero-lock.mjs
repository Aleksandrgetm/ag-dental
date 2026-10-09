import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = fileURLToPath(new URL("../../", import.meta.url));
const baseline = JSON.parse(
  readFileSync(resolve(root, "docs/HERO_LOCK.json"), "utf8"),
);
const changed = Object.entries(baseline)
  .filter(([file, expected]) => {
    try {
      let contents = readFileSync(resolve(root, file));
      // Phase 2 approval permits only this exact CTA destination change.
      // Normalize it for comparison; preserve the original 15-file baseline.
      if (file === "frontend/src/components/home/ScrollClinicHero.vue")
        contents = Buffer.from(
          contents
            .toString()
            .replace(
              '<RouterLink class="button button-light" to="/pieraksts"',
              '<RouterLink class="button button-light" to="/kontakti"',
            ),
        );
      return createHash("sha256").update(contents).digest("hex") !== expected;
    } catch {
      return true;
    }
  })
  .map(([file]) => file);
if (changed.length) {
  console.error("Approved Hero files changed:", changed);
  process.exitCode = 1;
} else
  console.log(
    `Hero lock verified: ${Object.keys(baseline).length} files match the approved baseline (Hero CTA destination exception only), including shared CSS, copy, fonts, video and poster.`,
  );
