const storageKey = "tab-graveyard:v1";
const ancientDays = 30;
const hauntDays = 7;

const epitaphs = [
  "Opened with ambition, abandoned with dignity.",
  "A promising read, tragically outnumbered by other tabs.",
  "Gone unread, but not unloved.",
  "Here rests a rabbit hole with excellent posture.",
  "Its loading spinner knew too much.",
  "Bookmarked in spirit, buried in practice.",
  "A noble link, defeated by lunch.",
  "Too interesting to close, too doomed to read.",
  "May its cookies crumble in peace.",
  "One day became someday. Someday became this."
];

const state = {
  tabs: [],
  filter: "all",
  query: ""
};

const form = document.querySelector("#bury-form");
const urlInput = document.querySelector("#url-input");
const formNote = document.querySelector("#form-note");
const searchInput = document.querySelector("#search-input");
const filterButtons = document.querySelectorAll("[data-filter]");
const graveyard = document.querySelector("#graveyard");
const template = document.querySelector("#grave-template");
const massFuneralButton = document.querySelector("#mass-funeral");
const graveCount = document.querySelector("#grave-count");
const ancientCount = document.querySelector("#ancient-count");
const hauntCount = document.querySelector("#haunt-count");

function isValidTab(tab) {
  return (
    tab &&
    typeof tab === "object" &&
    typeof tab.id === "string" &&
    typeof tab.url === "string" &&
    typeof tab.buriedAt === "string"
  );
}

function loadTabs() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(storageKey));
  } catch {
    state.tabs = [];
    return;
  }

  if (!Array.isArray(saved)) {
    state.tabs = [];
    return;
  }

  const valid = saved.filter(isValidTab);
  state.tabs = dedupeTabs(valid);

  // Only re-write storage if we actually pruned or merged something.
  if (state.tabs.length !== saved.length) {
    saveTabs();
  }
}

function dedupeTabs(tabs) {
  const byUrl = new Map();

  tabs.forEach((tab) => {
    const existing = byUrl.get(tab.url);
    if (!existing) {
      byUrl.set(tab.url, tab);
      return;
    }

    const shouldReplace =
      (existing.archived && !tab.archived) ||
      (existing.archived === tab.archived && new Date(tab.buriedAt) > new Date(existing.buriedAt));

    if (shouldReplace) {
      byUrl.set(tab.url, tab);
    }
  });

  return [...byUrl.values()];
}

function saveTabs() {
  localStorage.setItem(storageKey, JSON.stringify(state.tabs));
}

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withProtocol = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(withProtocol);
  } catch {
    return null;
  }
}

function titleFromUrl(url) {
  const host = url.hostname.replace(/^www\./, "");
  const lastPath = url.pathname
    .split("/")
    .filter(Boolean)
    .at(-1);
  const fallback = host || url.href;

  if (!lastPath) return fallback;

  const readable = decodeURIComponent(lastPath)
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();

  return readable || fallback;
}

function daysSince(dateString) {
  const start = new Date(dateString);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today - start) / 86_400_000));
}

function formatBuried(tab) {
  const days = daysSince(tab.buriedAt);
  if (days === 0) return "buried today";
  if (days === 1) return "buried yesterday";
  return `buried since ${new Date(tab.buriedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  })}`;
}

function isAncient(tab) {
  return daysSince(tab.buriedAt) >= ancientDays;
}

function isHaunting(tab) {
  return Boolean(tab.hauntAt) && new Date(tab.hauntAt) <= new Date();
}

function matchesFilter(tab) {
  if (state.filter === "fresh") return !tab.archived && !isAncient(tab);
  if (state.filter === "ancient") return !tab.archived && isAncient(tab);
  if (state.filter === "archived") return tab.archived;
  return !tab.archived;
}

function matchesQuery(tab) {
  const query = state.query.trim().toLowerCase();
  if (!query) return true;
  return [tab.title, tab.url, tab.epitaph].some((value) =>
    value.toLowerCase().includes(query)
  );
}

function getVisibleTabs() {
  return state.tabs
    .filter(matchesFilter)
    .filter(matchesQuery)
    .sort((a, b) => new Date(b.buriedAt) - new Date(a.buriedAt));
}

function updateStats() {
  const active = state.tabs.filter((tab) => !tab.archived);
  graveCount.textContent = active.length;
  ancientCount.textContent = active.filter(isAncient).length;
  hauntCount.textContent = active.filter((tab) => tab.hauntAt).length;
}

function renderActions(container, tab) {
  const actions = tab.archived
    ? [
        { action: "restore", label: "Restore" },
        { action: "burn", label: "Burn" }
      ]
    : [
        { action: "resurrect", label: "Resurrect" },
        { action: "archive", label: "Archive" },
        { action: "haunt", label: "Haunt Me Later" }
      ];

  container.replaceChildren(
    ...actions.map(({ action, label }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.action = action;
      button.textContent = label;
      button.setAttribute("aria-label", `${label}: ${tab.title}`);
      return button;
    })
  );
}

function renderEmpty() {
  const copy =
    state.query || state.filter !== "all"
      ? "No graves match the current omen."
      : "The graveyard is empty. Paste a URL above and give a neglected tab a proper farewell.";
  graveyard.innerHTML = `<p class="empty-state">${copy}</p>`;
}

function renderTabs() {
  graveyard.innerHTML = "";
  const visibleTabs = getVisibleTabs();

  updateStats();

  if (!visibleTabs.length) {
    renderEmpty();
    return;
  }

  const fragment = document.createDocumentFragment();

  visibleTabs.forEach((tab) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const title = node.querySelector("h2");
    const link = node.querySelector(".grave-url");
    const epitaph = node.querySelector(".epitaph");
    const buried = node.querySelector(".buried");
    const hauntDate = node.querySelector(".haunt-date");
    const actions = node.querySelector(".grave-actions");

    node.dataset.id = tab.id;
    node.classList.toggle("archived", tab.archived);
    node.classList.toggle("haunting", !tab.archived && isHaunting(tab));
    title.textContent = tab.title;
    link.textContent = tab.url;
    link.href = tab.url;
    epitaph.textContent = tab.epitaph;
    buried.textContent = formatBuried(tab);

    if (!tab.hauntAt) {
      hauntDate.textContent = "";
    } else if (isHaunting(tab)) {
      hauntDate.textContent = "haunting now";
    } else {
      hauntDate.textContent = `will haunt on ${new Date(tab.hauntAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric"
      })}`;
    }

    renderActions(actions, tab);

    fragment.append(node);
  });

  graveyard.append(fragment);
}

function setNote(message) {
  formNote.textContent = message;
  window.clearTimeout(setNote.timeout);
  setNote.timeout = window.setTimeout(() => {
    formNote.textContent = "";
  }, 3200);
}

function addTab(rawUrl) {
  const url = normalizeUrl(rawUrl);
  if (!url) {
    setNote("That URL refused to be buried.");
    return;
  }

  const existingTab = state.tabs.find((tab) => tab.url === url.href);
  if (existingTab && !existingTab.archived) {
    setNote("That one is already resting here.");
    return;
  }

  if (existingTab?.archived) {
    state.tabs = state.tabs.map((tab) =>
      tab.id === existingTab.id
        ? {
            ...tab,
            title: titleFromUrl(url),
            buriedAt: new Date().toISOString(),
            archived: false,
            hauntAt: null
          }
        : tab
    );
    setNote("That grave has been restored from the archive.");
  } else {
    state.tabs.unshift({
      id: crypto.randomUUID(),
      url: url.href,
      title: titleFromUrl(url),
      buriedAt: new Date().toISOString(),
      epitaph: epitaphs[Math.floor(Math.random() * epitaphs.length)],
      archived: false,
      hauntAt: null
    });
    setNote("A fresh grave appears.");
  }

  saveTabs();
  renderTabs();
  urlInput.value = "";
}

function updateTab(id, updater) {
  state.tabs = state.tabs.map((tab) => (tab.id === id ? updater(tab) : tab));
  saveTabs();
  renderTabs();
}

function resurrect(tab) {
  window.open(tab.url, "_blank", "noopener,noreferrer");
  updateTab(tab.id, (current) => ({ ...current, archived: true, hauntAt: null }));
}

function archive(id) {
  updateTab(id, (tab) => ({ ...tab, archived: true, hauntAt: null }));
}

function restore(id) {
  updateTab(id, (tab) => ({ ...tab, archived: false }));
}

function burn(id) {
  const tab = state.tabs.find((item) => item.id === id);
  const titlePart = tab ? ` "${tab.title}"` : "";
  if (!window.confirm(`Burn${titlePart}? This cannot be undone.`)) return;

  const grave = [...document.querySelectorAll(".grave")].find((item) => item.dataset.id === id);
  if (grave) {
    grave.classList.add("burning");
    grave.style.pointerEvents = "none";
  }

  window.setTimeout(
    () => {
      state.tabs = state.tabs.filter((tab) => tab.id !== id);
      saveTabs();
      renderTabs();
      setNote("Ashes to cache, dust to disk.");
    },
    grave ? 900 : 0
  );
}

function hauntLater(id) {
  const hauntAt = new Date();
  hauntAt.setDate(hauntAt.getDate() + hauntDays);
  updateTab(id, (tab) => ({ ...tab, hauntAt: hauntAt.toISOString() }));
}

function massFuneral() {
  const ancientActive = state.tabs.filter((tab) => !tab.archived && isAncient(tab));
  if (!ancientActive.length) {
    setNote("No ancient tabs are ready for the procession.");
    return;
  }

  const ancientIds = new Set(ancientActive.map((tab) => tab.id));
  document.querySelectorAll(".grave").forEach((grave) => {
    if (ancientIds.has(grave.dataset.id)) {
      grave.classList.add("departing");
    }
  });

  window.setTimeout(() => {
    state.tabs = state.tabs.map((tab) =>
      ancientIds.has(tab.id) ? { ...tab, archived: true, hauntAt: null } : tab
    );
    saveTabs();
    renderTabs();
    setNote(`${ancientIds.size} ancient tab${ancientIds.size === 1 ? "" : "s"} archived.`);
  }, 720);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  addTab(urlInput.value);
});

function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), delay);
  };
}

const handleSearchInput = debounce((value) => {
  state.query = value;
  renderTabs();
}, 120);

searchInput.addEventListener("input", (event) => {
  handleSearchInput(event.target.value);
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    filterButtons.forEach((item) => {
      const isActive = item === button;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    renderTabs();
  });
});

graveyard.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const grave = button.closest(".grave");
  const tab = state.tabs.find((item) => item.id === grave.dataset.id);
  if (!tab) return;

  if (button.dataset.action === "resurrect") resurrect(tab);
  if (button.dataset.action === "archive") archive(tab.id);
  if (button.dataset.action === "restore") restore(tab.id);
  if (button.dataset.action === "burn") burn(tab.id);
  if (button.dataset.action === "haunt") hauntLater(tab.id);
});

massFuneralButton.addEventListener("click", massFuneral);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

loadTabs();
renderTabs();
