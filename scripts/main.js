const MODULE_ID = "lipatos-inspiration-lock";

function isPrivilegedUser() {
  // Foundry: game.user.isGM is true for Assistant GM and Gamemaster.
  return game.user?.isGM === true;
}

function changesInspiration(changes) {
  if (!changes || typeof changes !== "object") return false;

  // Flattened update: { "system.attributes.inspiration": true }
  if (Object.prototype.hasOwnProperty.call(changes, "system.attributes.inspiration")) return true;

  // Nested update: { system: { attributes: { inspiration: true } } }
  const attrs = changes.system?.attributes;
  return !!(attrs && Object.prototype.hasOwnProperty.call(attrs, "inspiration"));
}

// Hard protection at document level: even a macro / alternate UI cannot change it for a player.
Hooks.on("preUpdateActor", (actor, changes, options, userId) => {
  if (isPrivilegedUser()) return;
  if (userId !== game.user.id) return;
  if (!changesInspiration(changes)) return;

  ui.notifications?.warn("Вдохновение может изменять только ГМ.");
  console.warn(`${MODULE_ID} | Blocked player inspiration change for`, actor?.name);
  return false;
});

const INSPIRATION_SELECTORS = [
  '[data-action="toggleInspiration"]',
  '[data-action="inspiration"]',
  '[data-action*="inspiration" i]',
  'input[name="system.attributes.inspiration"]',
  '[data-tooltip*="inspiration" i]',
  '[aria-label*="inspiration" i]',
  '.inspiration'
].join(",");

function blockControlEvent(event) {
  if (isPrivilegedUser()) return;
  const target = event.target?.closest?.(INSPIRATION_SELECTORS);
  if (!target) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();

  if (event.type === "click") {
    ui.notifications?.warn("Вдохновение может изменять только ГМ.");
  }
}

function lockInspirationControls(root) {
  if (isPrivilegedUser() || !root) return;

  for (const el of root.querySelectorAll?.(INSPIRATION_SELECTORS) ?? []) {
    // Do NOT use disabled and do NOT change opacity/filter: the control must look exactly normal.
    el.classList.add("lipatos-inspiration-locked");
    el.setAttribute("aria-disabled", "true");
    if ("disabled" in el) el.disabled = false;
  }

  if (root.dataset?.lipatosInspirationGuard === "1") return;
  if (root.dataset) root.dataset.lipatosInspirationGuard = "1";

  // Capture phase prevents D&D5e handlers from firing while leaving the visual state untouched.
  root.addEventListener("pointerdown", blockControlEvent, true);
  root.addEventListener("mousedown", blockControlEvent, true);
  root.addEventListener("click", blockControlEvent, true);
  root.addEventListener("dblclick", blockControlEvent, true);
  root.addEventListener("contextmenu", blockControlEvent, true);
  root.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") blockControlEvent(event);
  }, true);
}

function getRootElement(app, html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  if (app?.element instanceof HTMLElement) return app.element;
  if (app?.element?.[0] instanceof HTMLElement) return app.element[0];
  return null;
}

function onRender(app, html) {
  const actor = app?.actor ?? app?.document;
  if (!actor || actor.documentName !== "Actor") return;
  lockInspirationControls(getRootElement(app, html));
}

Hooks.on("renderActorSheet", onRender);
Hooks.on("renderActorSheetV2", onRender);
Hooks.on("renderApplicationV2", (app, html) => {
  const actor = app?.actor ?? app?.document;
  if (actor?.documentName === "Actor") lockInspirationControls(getRootElement(app, html));
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Ready`);
});
