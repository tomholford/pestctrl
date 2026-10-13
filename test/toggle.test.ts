import { expect, test } from "bun:test";
import {
  createController,
  outlineInjection,
  type OutlineInjection,
  type PestctrlChrome,
} from "../src/toggle.ts";

type Call =
  | { op: "get" }
  | { op: "insert"; injection: OutlineInjection }
  | { op: "remove"; injection: OutlineInjection }
  | { op: "badge"; text: string };

function fakeApi(options?: { failInsert?: boolean; insertGate?: Promise<void> }) {
  const badges = new Map<number, string>();
  const calls: Call[] = [];
  let onClicked: ((tab: { id?: number }) => void) | undefined;
  let onUpdated: ((tabId: number, changeInfo: { status?: string }) => void) | undefined;

  const api: PestctrlChrome = {
    action: {
      onClicked: {
        addListener(callback) {
          onClicked = callback;
        },
      },
      async getBadgeText(details) {
        calls.push({ op: "get" });
        return badges.get(details.tabId) ?? "";
      },
      async setBadgeText(details) {
        calls.push({ op: "badge", text: details.text });
        badges.set(details.tabId, details.text);
      },
    },
    scripting: {
      async insertCSS(injection) {
        calls.push({ op: "insert", injection });
        await options?.insertGate;
        if (options?.failInsert) throw new Error("Cannot access contents of the page");
      },
      async removeCSS(injection) {
        calls.push({ op: "remove", injection });
      },
    },
    tabs: {
      onUpdated: {
        addListener(callback) {
          onUpdated = callback;
        },
      },
    },
  };

  return {
    api,
    calls,
    badge: (tabId: number) => badges.get(tabId) ?? "",
    click: (tab: { id?: number }) => onClicked?.(tab),
    update: (tabId: number, changeInfo: { status?: string }) => onUpdated?.(tabId, changeInfo),
  };
}

test("a click inserts the stylesheet and then sets the badge", async () => {
  const chrome = fakeApi();
  const controller = createController();
  await controller.toggle(chrome.api, { id: 4 });

  expect(chrome.calls.map((call) => call.op)).toEqual(["get", "insert", "badge"]);
  expect(chrome.badge(4)).toBe("ON");
  expect(chrome.calls[1]).toEqual({ op: "insert", injection: outlineInjection(4) });
});

test("a second click removes the same injection and clears the badge", async () => {
  const chrome = fakeApi();
  const controller = createController();
  await controller.toggle(chrome.api, { id: 4 });
  await controller.toggle(chrome.api, { id: 4 });

  expect(chrome.calls.map((call) => call.op)).toEqual([
    "get",
    "insert",
    "badge",
    "get",
    "remove",
    "badge",
  ]);
  expect(chrome.calls[4]).toEqual({ op: "remove", injection: outlineInjection(4) });
  expect(chrome.badge(4)).toBe("");
});

test("a rejected insert leaves the badge empty", async () => {
  const chrome = fakeApi({ failInsert: true });
  const original = console.error;
  console.error = () => {};
  try {
    await createController().toggle(chrome.api, { id: 4 });
  } finally {
    console.error = original;
  }

  expect(chrome.calls.map((call) => call.op)).toEqual(["get", "insert", "badge"]);
  expect(chrome.badge(4)).toBe("");
});

test("a second click while the first is in flight does not insert twice", async () => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chrome = fakeApi({ insertGate: gate });
  const controller = createController();

  const first = controller.toggle(chrome.api, { id: 4 });
  const second = controller.toggle(chrome.api, { id: 4 });
  release();
  await Promise.all([first, second]);

  expect(chrome.calls.filter((call) => call.op === "insert")).toHaveLength(1);
  expect(chrome.badge(4)).toBe("ON");
});

test("two tabs toggle independently", async () => {
  const chrome = fakeApi();
  const controller = createController();
  await controller.toggle(chrome.api, { id: 1 });
  await controller.toggle(chrome.api, { id: 2 });

  expect(chrome.calls.filter((call) => call.op === "insert")).toHaveLength(2);
});

test("a tab without an id is ignored", async () => {
  const chrome = fakeApi();
  await createController().toggle(chrome.api, {});
  expect(chrome.calls).toHaveLength(0);
});

test("the action listener toggles and a loading tab clears the badge", async () => {
  const chrome = fakeApi();
  createController().register(chrome.api);

  chrome.click({ id: 9 });
  await Bun.sleep(0);
  expect(chrome.badge(9)).toBe("ON");

  chrome.update(9, { status: "complete" });
  await Bun.sleep(0);
  expect(chrome.badge(9)).toBe("ON");

  chrome.update(9, { status: "loading" });
  await Bun.sleep(0);
  expect(chrome.badge(9)).toBe("");
});
