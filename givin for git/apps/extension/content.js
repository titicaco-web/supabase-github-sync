// ─────────────────────────────────────────────────────────────
// Givin · content script — the "companion launcher"
//
// Design rule (read the build plan §03): this script is deliberately
// dumb. It does ONE thing on an explicit click — read the name and
// headline VISIBLE on the profile the user is already viewing, then
// open the Givin web app pre-filled. It never:
//   • crawls or reads connections
//   • runs network requests in the background
//   • sends messages or takes any action inside LinkedIn
// That keeps users' accounts safe and keeps us on the right side of
// LinkedIn's terms.
// ─────────────────────────────────────────────────────────────

const WEB_URL = "https://givin.app"; // ← set to your deployed app (or http://localhost:5173 in dev)

function injectButton() {
  // Only on a member profile page.
  if (!location.pathname.startsWith("/in/")) return removeButton();
  if (document.getElementById("givin-launcher")) return;

  const btn = document.createElement("button");
  btn.id = "givin-launcher";
  btn.type = "button";
  btn.innerHTML = `
    <svg viewBox="0 0 100 58" width="22" height="13" style="flex:none"><path d="M16 18 Q50 50 84 18" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/></svg>
    <span>Send a gift</span>`;
  btn.addEventListener("click", onClick);
  document.body.appendChild(btn);
}

function removeButton() {
  document.getElementById("givin-launcher")?.remove();
}

// Read only what's plainly visible on this profile, on this click.
function readProfile() {
  const name =
    document.querySelector("h1")?.textContent?.trim() || "";
  // The headline sits just under the name; grab the first short line.
  const headline =
    document.querySelector("h1")?.closest("section")?.querySelector(".text-body-medium")?.textContent?.trim() ||
    document.querySelector(".text-body-medium")?.textContent?.trim() ||
    "";
  return { name, headline };
}

function onClick() {
  const { name, headline } = readProfile();
  const q = new URLSearchParams();
  if (name) q.set("name", name);
  if (headline) q.set("headline", headline);
  // Naive occasion hint from the headline; the app lets the user change it.
  if (/new|started|joined|promoted/i.test(headline)) q.set("occasion", "new_job");
  window.open(`${WEB_URL}/send?${q.toString()}`, "_blank", "noopener");
}

// LinkedIn is a single-page app; re-check on navigation.
let last = location.href;
new MutationObserver(() => {
  if (location.href !== last) {
    last = location.href;
    setTimeout(injectButton, 600);
  }
}).observe(document.body, { childList: true, subtree: true });

injectButton();
