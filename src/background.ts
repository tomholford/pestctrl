import { createController, type PestctrlChrome } from "./toggle.ts";

const api = (globalThis as { chrome?: PestctrlChrome }).chrome;
if (api) createController().register(api);
