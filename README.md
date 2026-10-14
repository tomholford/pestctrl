# pestctrl

Outline every element on the current page.

Click the toolbar icon. Each element gets a colored outline. Click again and the outlines go away. A reload clears them too.

![Hacker News with outlines on](images/hacker-news.png)

Outlines use the CSS `outline` property, so the page's box model stays as it was. Colors follow the element type: a `div` and a `p` are different colors, and anything not in the named list uses one fallback color.

## Install

Download `pestctrl-<version>.zip` from [Releases](https://github.com/tomholford/pestctrl/releases) and unzip it. In Chrome, open `chrome://extensions`, turn on Developer mode, choose Load unpacked, and select the unzipped folder.

To build from source, run `bun install`, then `bun run build`, and load the `extension/` directory the same way.

The source of the service worker is TypeScript in `src/`. The build writes `extension/background.js`. Chrome loads that file. It is generated and gitignored.

## Behavior

- The click affects the active tab, including its iframes.
- The toolbar badge reads `ON` while the outlines are applied.
- Pages Chrome will not let an extension modify (`chrome://`, the Chrome Web Store, the New Tab page) stay unchanged, and the badge stays empty.
- A navigation drops the outlines. Click the icon again on the new page.
- Elements inside a shadow tree are left alone.

## Permissions

`activeTab` and `scripting`. There is no host permission, so the extension cannot see a tab until you click the icon. It does not make network requests.

There is no popup, keyboard shortcut, hover inspector, or settings page.

## Develop

```sh
bun test
bun run typecheck
bun run build
bun run package
```

`bun run package` writes `dist/pestctrl-<version>.zip` with `manifest.json` at the root of the archive.

`fixtures/page.html` is a static page for a manual check: nested regions, an iframe, and an open shadow root.

## Release

Bump `version` in `extension/manifest.json` and the same string in `test/manifest.test.ts`. Merge that to `master`, then tag the commit. The tag has to match the manifest version:

```sh
git tag v0.1.0
git push origin v0.1.0
```

The release workflow runs the tests, builds the zip, and attaches it to the GitHub release. That zip is also the package to upload to the Chrome Web Store. Store upload is not set up.

## Credit

The idea comes from [Pesticide](https://github.com/mrmrs/pesticide) by Adam Morse. pestctrl is a new extension.
