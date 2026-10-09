const LIVE = "https://brand-deal-inbox.vercel.app/email";

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url?.startsWith("https://mail.google.com/")) {
    await chrome.tabs.create({ url: LIVE });
    return;
  }

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const subject = document.querySelector("h2.hP")?.textContent?.trim() || "";
      const bodies = Array.from(document.querySelectorAll(".a3s"))
        .map((node) => node.textContent?.trim() || "")
        .filter(Boolean);
      return { subject, text: bodies.join("\n\n").slice(0, 20000) };
    },
  });

  const opened = await chrome.tabs.create({ url: LIVE });
  if (!opened.id) return;
  const payload = result || { subject: "", text: "" };

  const fill = (details) => {
    if (details.tabId !== opened.id || details.status !== "complete") return;
    chrome.tabs.onUpdated.removeListener(fill);
    setTimeout(() => chrome.scripting.executeScript({
      target: { tabId: opened.id },
      args: [payload],
      func: ({ subject, text }) => {
        const boxes = document.querySelectorAll("input, textarea");
        const subjectBox = boxes[1];
        const emailBox = document.querySelector("textarea");
        const setValue = (node, value) => {
          if (!(node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement)) return;
          const prototype = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
          setter?.call(node, value);
          node.dispatchEvent(new Event("input", { bubbles: true }));
        };
        setValue(subjectBox, subject);
        setValue(emailBox, text);
      },
    }).catch(() => undefined), 800);
  };
  chrome.tabs.onUpdated.addListener(fill);
});
