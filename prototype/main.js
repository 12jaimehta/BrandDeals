import {
  CONVERSATIONS,
  DEFAULT_RULES,
  extractDeal,
  buildAdvice,
  recommendedWaitDays,
  suggestedReply,
  formatINR,
  formatDate,
  formatWhen,
  daysUntil,
  addDays,
  toISODate,
} from "../lib/read-deal.mjs";

function emptyAction() {
  return { seen: false, followUpAt: null, followUpDays: null, followedUp: false, dismissed: false };
}

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

const state = {
  selectedId: "samsung-galaxy-ai",
  filter: "deals",
  rulesOpen: false,
  rules: { ...DEFAULT_RULES },
  actions: {},
};

function actionFor(id) {
  return { ...emptyAction(), ...(state.actions[id] || {}) };
}

function saveRules() {
  localStorage.setItem(STORAGE_RULES, JSON.stringify(state.rules));
}

function saveActions() {
  localStorage.setItem(STORAGE_ACTIONS, JSON.stringify(state.actions));
}

function visibleConversations() {
  return CONVERSATIONS
    .filter((conversation) => {
      const extraction = extractDeal(conversation);
      const action = actionFor(conversation.id);
      if (state.filter === "deals") return extraction.isBrandOpportunity && !action.dismissed;
      if (state.filter === "followups") return action.followUpAt && !action.followedUp && !action.dismissed;
      if (state.filter === "aside") return action.dismissed;
      return true;
    })
    .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
}

function followUpLabel(action) {
  const left = daysUntil(action.followUpAt);
  if (left === 0) return "FOLLOW UP TODAY";
  if (left === 1) return "FOLLOW UP IN 1 DAY";
  if (left > 1) return `FOLLOW UP IN ${left} DAYS`;
  return "FOLLOW UP OVERDUE";
}

function deadlineHint(iso) {
  const days = daysUntil(iso);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1) return `${days} days from today`;
  if (days === -1) return "Yesterday";
  return `${Math.abs(days)} days ago`;
}

function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (value == null || value === false) return;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else node.setAttribute(key, String(value));
  });
  children.flat().forEach((child) => {
    if (child == null || child === false) return;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return node;
}

function preview(conversation) {
  const line = (conversation.messages[0]?.text || "").replace(/\s+/g, " ").trim();
  return line.length > 88 ? `${line.slice(0, 88).trim()}…` : line;
}

function listTitle(conversation, extraction) {
  if (!extraction.isBrandOpportunity) return conversation.fromName;
  return extraction.brand || extraction.campaign || conversation.fromName;
}

function listSubtitle(conversation, extraction) {
  if (!extraction.isBrandOpportunity) return conversation.subject || "Direct message";
  if (extraction.brand && extraction.campaign) return extraction.campaign;
  if (!extraction.brand) return "Sender did not name the brand";
  return conversation.subject || "Direct message";
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.hidden = true;
  }, 2800);
}

function render() {
  const positions = ["rail", "thread", "deal"].map((id) => document.getElementById(id)?.scrollTop || 0);
  renderRail();
  renderThread();
  renderDeal();
  ["rail", "thread", "deal"].forEach((id, index) => {
    const node = document.getElementById(id);
    if (node) node.scrollTop = positions[index];
  });
}

function renderRail() {
  const counts = {
    deals: CONVERSATIONS.filter((conversation) => extractDeal(conversation).isBrandOpportunity && !actionFor(conversation.id).dismissed).length,
    followups: CONVERSATIONS.filter((conversation) => {
      const action = actionFor(conversation.id);
      return action.followUpAt && !action.followedUp && !action.dismissed;
    }).length,
  };

  const filters = [
    ["deals", `Brand deals ${counts.deals}`],
    ["followups", `Follow-ups ${counts.followups}`],
    ["all", "All"],
    ["aside", "Set aside"],
  ].map(([id, label]) => h("button", {
    class: `filter${state.filter === id ? " is-active" : ""}`,
    type: "button",
    "data-action": "filter",
    "data-filter": id,
    text: label,
  }));

  const items = visibleConversations().map((conversation) => {
    const extraction = extractDeal(conversation);
    const action = actionFor(conversation.id);
    const classes = ["item"];
    if (conversation.id === state.selectedId) classes.push("is-selected");
    if (!action.seen && extraction.isBrandOpportunity) classes.push("is-unread");
    return h("button", {
      class: classes.join(" "),
      type: "button",
      "data-action": "select",
      "data-id": conversation.id,
    },
      h("span", { class: "item-top" },
        h("span", { class: `source ${conversation.source}`, text: conversation.source === "gmail" ? "Gmail" : "Instagram" }),
        h("span", { class: "when", text: formatDate(conversation.receivedAt) })),
      h("span", { class: "item-title", text: listTitle(conversation, extraction) }),
      h("span", { class: "item-sub", text: listSubtitle(conversation, extraction) }),
      h("span", { class: "item-preview", text: preview(conversation) }),
      action.followUpAt && !action.followedUp ? h("span", { class: "flag", text: followUpLabel(action) }) : null);
  });

  const list = items.length
    ? h("div", { class: "list" }, ...items)
    : h("div", { class: "empty" },
      h("h2", { text: "Nothing in this view" }),
      h("p", { class: "empty-copy", text: "Brand deals and follow-ups will collect here." }));

  document.getElementById("rail").replaceChildren(
    h("div", { class: "lockup" },
      h("p", { class: "eyebrow", text: "Conversation to deal" }),
      h("h1", { class: "product-name" }, "Brand Deal ", h("em", { text: "Inbox" })),
      h("p", { class: "lede", text: "Reads the conversation and manages the next step on the deal." })),
    h("div", { class: "banner" },
      "Sample inbox. A rules reader is standing in until a model is connected. Gmail and Instagram are not live.",
      h("div", { class: "connect-row" },
        h("button", { class: "connect", type: "button", "data-action": "connect", "data-channel": "Gmail", text: "Gmail" }),
        h("button", { class: "connect", type: "button", "data-action": "connect", "data-channel": "Instagram", text: "Instagram" }),
        h("button", { class: "connect", type: "button", "data-action": "reset", text: "Reset sample" }))),
    h("div", { class: "filters" }, ...filters),
    list,
  );
}

function renderThread() {
  const conversation = CONVERSATIONS.find((item) => item.id === state.selectedId) || visibleConversations()[0];
  const mount = document.getElementById("thread");
  if (!conversation) {
    mount.replaceChildren(h("div", { class: "empty" }, h("h2", { text: "Pick a conversation" })));
    return;
  }
  state.selectedId = conversation.id;
  const extraction = extractDeal(conversation);
  mount.replaceChildren(
    h("header", { class: "thread-head" },
      h("button", { class: "back", type: "button", "data-action": "back", text: "Back to inbox" }),
      h("p", { class: "kicker", text: conversation.source === "gmail" ? "Gmail thread" : "Instagram DM" }),
      h("h2", { class: "who", text: conversation.fromName }),
      h("p", { class: "channel", text: conversation.fromHandle }),
      conversation.subject ? h("p", { class: "subject", text: conversation.subject }) : null),
    h("div", { class: "bubbles" },
      ...conversation.messages.map((message) => h("article", { class: "bubble" },
        h("p", { text: message.text }),
        h("div", { class: "meta", text: formatWhen(message.at) }))),
      h("p", { class: "reason", text: extraction.detectionReason })),
  );
}

function fieldRow(label, value, missing) {
  return h("div", { class: "field" },
    h("span", { text: label }),
    h("strong", { class: missing ? "missing" : "", text: missing ? "Not in the conversation" : value }));
}

function renderDeal() {
  const conversation = CONVERSATIONS.find((item) => item.id === state.selectedId);
  const mount = document.getElementById("deal");
  if (!conversation) {
    mount.replaceChildren();
    return;
  }
  const extraction = extractDeal(conversation);
  const action = actionFor(conversation.id);
  if (!extraction.isBrandOpportunity) {
    mount.replaceChildren(
      h("header", { class: "deal-head" },
        h("p", { class: "kicker", text: "Reader" }),
        h("h2", { class: "who", text: "No brand deal here" })),
      h("p", { class: "reason", text: extraction.detectionReason }),
    );
    return;
  }

  const advice = buildAdvice(extraction, state.rules);
  const waitDays = recommendedWaitDays(conversation);
  const offerLabel = extraction.offerAmount == null
    ? null
    : `${extraction.offerApproximate ? "≈ " : ""}${formatINR(extraction.offerAmount)}`;

  const adviceBlock = adviceCard(extraction, advice);
  const followBlock = followCard(conversation, action, waitDays);

  const fields = h("div", { class: "fields" },
    fieldRow("Brand", extraction.brand, !extraction.brand),
    fieldRow("Campaign", extraction.campaign, !extraction.campaign),
    fieldRow("Offer", offerLabel, extraction.offerAmount == null),
    fieldRow("Deliverables", extraction.deliverables.join(" + "), extraction.deliverables.length === 0),
    extraction.deadline
      ? h("div", { class: "field" },
        h("span", { text: "Deadline" }),
        h("strong", { text: `${formatDate(extraction.deadline)} · ${deadlineHint(extraction.deadline)}` }))
      : fieldRow("Deadline", "", true),
    fieldRow("Usage rights", extraction.usageRightsDays == null ? "" : `${extraction.usageRightsDays} days`, extraction.usageRightsDays == null),
    fieldRow("Exclusivity", extraction.exclusivityDays === 0 ? "None" : extraction.exclusivityDays == null ? "" : `${extraction.exclusivityDays} days`, extraction.exclusivityDays == null),
    fieldRow("Payment", extraction.payment, !extraction.payment));

  const gapBlock = extraction.gaps.length
    ? h("div", { class: "gaps" },
      h("h3", { text: "Still to confirm" }),
      h("ul", {}, ...extraction.gaps.map((gap) => h("li", { text: gap }))))
    : h("p", { class: "reason", text: "Every term in the brief was stated." });

  const rules = h("details", { class: "rules" },
    h("summary", { text: "Your rate rules" }),
    ruleInput("Usage you already include, in days", "usageIncludedDays"),
    ruleInput("Add this for each extra 30 days of usage", "usageUpliftPer30Days"),
    ruleInput("Add this for each 30 days of exclusivity", "exclusivityUpliftPer30Days"));
  if (state.rulesOpen) rules.open = true;

  mount.replaceChildren(
    h("header", { class: "deal-head" },
      h("p", { class: "kicker", text: "The deal" }),
      h("h2", { class: "who", text: extraction.brand || extraction.campaign || "Untitled deal" })),
    adviceBlock,
    followBlock,
    fields,
    extraction.notes.length ? h("ul", { class: "notes" }, ...extraction.notes.map((note) => h("li", { text: note }))) : null,
    gapBlock,
    h("p", { class: "reason", text: extraction.detectionReason }),
    rules,
    h("div", { class: "draft" },
      h("h3", { text: "Suggested reply" }),
      h("pre", { id: "suggested-reply", text: suggestedReply(conversation, extraction, advice) }),
      h("div", { class: "actions" },
        h("button", { class: "quiet", type: "button", "data-action": "copy", text: "Copy reply" }),
        h("button", { class: "quiet", type: "button", "data-action": "aside", "data-id": conversation.id, text: "Set aside" }))),
  );
}

function adviceCard(extraction, advice) {
  let lead = "Usage rights were not stated.";
  let main = "Ask for the window before you accept a fee.";
  if (advice.usageAmount > 0) {
    lead = `They're asking for ${extraction.usageRightsDays}-day usage rights.`;
    main = `Your normal rate should increase by ${formatINR(advice.usageAmount)}.`;
  } else if (extraction.usageRightsDays != null && advice.blocks === 0) {
    lead = `They're asking for ${extraction.usageRightsDays}-day usage rights.`;
    main = `That sits inside the ${state.rules.usageIncludedDays} days you already include.`;
  } else if (advice.blocks > 0 && advice.usageAmount === 0) {
    lead = `They're asking for ${extraction.usageRightsDays}-day usage rights.`;
    main = "Your rate rules add nothing for the extra days.";
  }

  const children = [
    h("p", { class: "advice-lead", text: lead }),
    h("p", { class: "advice-main", text: main }),
  ];

  if (advice.suggestedOffer != null && advice.usageAmount > 0) {
    children.push(h("p", { class: "counter", text: `Suggested counter ${formatINR(advice.suggestedOffer)}` }));
  }
  if (extraction.exclusivityDays > 0 && advice.exclusivityAmount > 0) {
    children.push(h("p", { class: "fine", text: `${extraction.exclusivityDays}-day exclusivity adds ${formatINR(advice.exclusivityAmount)}.` }));
  } else if (extraction.exclusivityDays > 0) {
    children.push(h("p", { class: "fine", text: `${extraction.exclusivityDays}-day exclusivity is in the ask. Your rate rules do not add a fee for it yet.` }));
  }
  if (advice.blocks > 0) {
    const math = h("details", { class: "math" },
      h("summary", { text: "How this was counted" }),
      h("p", { text: `${extraction.usageRightsDays} days asked, ${state.rules.usageIncludedDays} days included.` }),
      h("p", { text: `${advice.extraDays} extra days = ${advice.blocks} × ${formatINR(state.rules.usageUpliftPer30Days)} = ${formatINR(advice.usageAmount)}.` }));
    children.push(math);
  }
  return h("section", { class: "advice" }, ...children);
}

function followCard(conversation, action, waitDays) {
  if (action.followUpAt && !action.followedUp) {
    return h("section", { class: "follow" },
      h("p", { class: "follow-label", text: followUpLabel(action) }),
      h("p", { class: "follow-date", text: formatDate(action.followUpAt) }),
      h("p", { class: "fine", text: "Reminder on this device. Nothing is sent." }),
      h("div", { class: "follow-actions" },
        h("button", { class: "primary", type: "button", "data-action": "done", "data-id": conversation.id, text: "Mark followed up" }),
        h("button", { class: "ghost", type: "button", "data-action": "clear-follow", "data-id": conversation.id, text: "Clear" })));
  }

  const when = formatDate(toISODate(addDays(waitDays)));
  const noun = waitDays === 1 ? "DAY" : "DAYS";
  return h("section", { class: "follow" },
    h("p", { class: "follow-label", text: `FOLLOW UP IN ${waitDays} ${noun}` }),
    h("p", { class: "follow-date", text: when }),
    h("p", { class: "fine", text: action.followedUp ? "You marked the last reminder done." : "A reminder on this device. Nothing is sent." }),
    h("div", { class: "follow-actions" },
      h("button", { class: "primary", type: "button", "data-action": "follow", "data-id": conversation.id, text: "Set reminder" })));
}

function ruleInput(label, key) {
  return h("label", { class: "rule" },
    label,
    h("input", {
      type: "number",
      min: "0",
      step: "1",
      "data-rule": key,
      value: String(state.rules[key]),
    }));
}

function setAction(id, patch) {
  state.actions[id] = { ...actionFor(id), ...patch };
  saveActions();
}

function selectConversation(id) {
  state.selectedId = id;
  setAction(id, { seen: true });
  if (window.matchMedia("(max-width: 720px)").matches) document.body.dataset.pane = "thread";
  render();
}

function onClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, id, channel, filter } = button.dataset;
  if (action === "filter") {
    state.filter = filter;
    const visible = visibleConversations();
    if (visible.length && !visible.some((conversation) => conversation.id === state.selectedId)) {
      state.selectedId = visible[0].id;
      setAction(state.selectedId, { seen: true });
    }
    render();
    return;
  }
  if (action === "select") {
    selectConversation(id);
    return;
  }
  if (action === "back") {
    document.body.dataset.pane = "list";
    return;
  }
  if (action === "connect") {
    showToast(`${channel} is not connected. That integration is waiting on the tech stack.`);
    return;
  }
  if (action === "reset") {
    state.rules = { ...DEFAULT_RULES };
    state.actions = {};
    state.selectedId = "samsung-galaxy-ai";
    state.filter = "deals";
    saveRules();
    saveActions();
    setAction("samsung-galaxy-ai", { seen: true });
    showToast("Sample inbox reset.");
    render();
    return;
  }
  if (action === "follow") {
    const conversation = CONVERSATIONS.find((item) => item.id === id);
    const days = recommendedWaitDays(conversation);
    const followUpAt = toISODate(addDays(days));
    setAction(id, { followUpAt, followUpDays: days, followedUp: false, dismissed: false });
    showToast(`Reminder set for ${formatDate(followUpAt)}.`);
    render();
    return;
  }
  if (action === "done") {
    setAction(id, { followedUp: true });
    showToast("Marked as followed up.");
    render();
    return;
  }
  if (action === "clear-follow") {
    setAction(id, { followUpAt: null, followUpDays: null, followedUp: false });
    render();
    return;
  }
  if (action === "aside") {
    setAction(id, { dismissed: true });
    showToast("Set aside.");
    const visible = visibleConversations();
    if (visible[0]) state.selectedId = visible[0].id;
    render();
    return;
  }
  if (action === "copy") {
    const draft = document.getElementById("suggested-reply")?.textContent || "";
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(draft).then(
        () => showToast("Follow-up copied."),
        () => showToast("Select the draft and copy it."),
      );
    } else {
      showToast("Select the draft and copy it.");
    }
  }
}

function onChange(event) {
  const input = event.target.closest("[data-rule]");
  if (!input) return;
  const value = Number(input.value);
  if (!Number.isFinite(value) || value < 0) return;
  state.rules[input.dataset.rule] = value;
  state.rulesOpen = true;
  saveRules();
  render();
}

function onToggle(event) {
  if (event.target.classList && event.target.classList.contains("rules")) {
    state.rulesOpen = event.target.open;
  }
}

function init() {
  const storedRules = loadJson(STORAGE_RULES, {});
  state.rules = { ...DEFAULT_RULES, ...storedRules };
  state.actions = loadJson(STORAGE_ACTIONS, {});
  setAction("samsung-galaxy-ai", { seen: true });
  document.body.addEventListener("click", onClick);
  document.body.addEventListener("change", onChange);
  document.body.addEventListener("toggle", onToggle, true);
  const narrow = window.matchMedia("(max-width: 720px)");
  const syncPane = () => {
    if (!narrow.matches) document.body.dataset.pane = "thread";
  };
  if (narrow.addEventListener) narrow.addEventListener("change", syncPane);
  syncPane();
  render();
}

init();
