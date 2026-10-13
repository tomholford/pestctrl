/** Subset of the Chrome extension API this service worker calls. */
export interface PestctrlChrome {
  action: {
    onClicked: {
      addListener(callback: (tab: { id?: number }) => void): void;
    };
    getBadgeText(details: { tabId: number }): Promise<string>;
    setBadgeText(details: { tabId: number; text: string }): Promise<void>;
  };
  scripting: {
    insertCSS(injection: OutlineInjection): Promise<void>;
    removeCSS(injection: OutlineInjection): Promise<void>;
  };
  tabs: {
    onUpdated: {
      addListener(
        callback: (tabId: number, changeInfo: { status?: string }) => void,
      ): void;
    };
  };
}

export interface OutlineInjection {
  files: string[];
  target: { tabId: number; allFrames: true };
}

export const OUTLINES_FILE = "outlines.css";

export function outlineInjection(tabId: number): OutlineInjection {
  return {
    files: [OUTLINES_FILE],
    target: { tabId, allFrames: true },
  };
}

export function createController() {
  const inflight = new Set<number>();

  async function toggle(api: PestctrlChrome, tab: { id?: number }): Promise<void> {
    const tabId = tab.id;
    if (tabId === undefined || inflight.has(tabId)) return;

    inflight.add(tabId);
    try {
      const prev = await api.action.getBadgeText({ tabId });
      if (prev === "ON") {
        await api.scripting.removeCSS(outlineInjection(tabId));
        await api.action.setBadgeText({ tabId, text: "" });
        return;
      }

      // Badge text is the on/off bit, and it survives the service worker
      // being killed. Set it only after insertCSS resolves so a rejected
      // insert (chrome://, the Web Store, the New Tab page) does not claim
      // the outlines are on.
      try {
        await api.scripting.insertCSS(outlineInjection(tabId));
      } catch (error) {
        console.error("pestctrl: could not outline this page", error);
        await api.action.setBadgeText({ tabId, text: "" });
        return;
      }
      await api.action.setBadgeText({ tabId, text: "ON" });
    } finally {
      inflight.delete(tabId);
    }
  }

  function handleUpdated(
    api: PestctrlChrome,
    tabId: number,
    changeInfo: { status?: string },
  ): void {
    // Navigation drops the injected stylesheet. activeTab does not allow
    // injecting again until the next click, so clear the badge and stop.
    if (changeInfo.status !== "loading") return;
    void api.action.setBadgeText({ tabId, text: "" });
  }

  function register(api: PestctrlChrome): void {
    api.action.onClicked.addListener((tab) => {
      void toggle(api, tab);
    });
    api.tabs.onUpdated.addListener((tabId, changeInfo) => {
      handleUpdated(api, tabId, changeInfo);
    });
  }

  return { toggle, handleUpdated, register };
}
