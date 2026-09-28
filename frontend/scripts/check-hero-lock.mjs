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
      return (
        createHash("sha256")
          .update(readFileSync(resolve(root, file)))
          .digest("hex") !== expected
      );
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
    `Hero lock verified: ${Object.keys(baseline).length} files unchanged, including shared CSS, copy, fonts, video and poster.`,
  );
