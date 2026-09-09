/* Stellar Tarot · Copyright (c) 2026 Lucky Media LLC. All rights reserved. Proprietary. */
/* ============================================================
   Part E: point the three live payment links back at the app.

   Sets only after_completion on each link. Nothing else on the link is
   touched. Run it once, read the printed after_completion blocks, done.

     node scripts/point-payment-links.js            # dry run, prints what it would send
     node scripts/point-payment-links.js --apply    # actually updates the links

   Needs STRIPE_SECRET_KEY in .env in the project root (or in the
   environment). The key is never printed.
   ============================================================ */

const fs = require("fs");
const path = require("path");

const REDIRECT = process.env.UNLOCK_REDIRECT_URL
  || "https://tarot.stellarastro.app/?session_id={CHECKOUT_SESSION_ID}";

const LINKS = [
  { id: "plink_1UDkzb6cHxuVOJjwIpj3l2r3", label: "Minor Arcana ($2.99/mo)" },
  { id: "plink_1UDl046cHxuVOJjwaeKmMi7D", label: "Major Arcana ($9.99/mo)" },
  { id: "plink_1UDl0k6cHxuVOJjwJ9qdqB5e", label: "Lifetime ($111 once)" }
];

function loadKey() {
  if (process.env.STRIPE_SECRET_KEY) return process.env.STRIPE_SECRET_KEY;
  for (const name of [".env", ".env.local"]) {
    const file = path.join(__dirname, "..", name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const m = /^\s*(?:export\s+)?STRIPE_SECRET_KEY\s*=\s*(.+?)\s*$/.exec(line);
      if (m) return m[1].replace(/^["']|["']$/g, "");
    }
  }
  return null;
}

async function main() {
  const key = loadKey();
  if (!key) {
    console.error("STRIPE_SECRET_KEY not found. Add it to .env in the project root:");
    console.error("  STRIPE_SECRET_KEY=sk_live_...");
    process.exit(1);
  }
  const apply = process.argv.includes("--apply");

  console.log("redirect target: " + REDIRECT);
  console.log(apply ? "mode: APPLY (updating the live links)\n" : "mode: dry run, pass --apply to write\n");

  for (const link of LINKS) {
    if (!apply) {
      console.log(link.label + "  " + link.id);
      console.log("  would set after_completion[type]=redirect");
      console.log("  would set after_completion[redirect][url]=" + REDIRECT + "\n");
      continue;
    }
    const body = new URLSearchParams();
    body.set("after_completion[type]", "redirect");
    body.set("after_completion[redirect][url]", REDIRECT);

    const res = await fetch("https://api.stripe.com/v1/payment_links/" + link.id, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    });
    const json = await res.json();
    if (!res.ok) {
      console.error(link.label + "  FAILED " + res.status + ": " + ((json.error && json.error.message) || ""));
      continue;
    }
    console.log(link.label + "  " + link.id);
    console.log("  after_completion: " + JSON.stringify(json.after_completion) + "\n");
  }
}

main().catch(function (e) { console.error(e.message); process.exit(1); });
