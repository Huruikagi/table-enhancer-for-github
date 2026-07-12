# Store Demo Video

Run the following command from the repository root to rebuild the extension and record the store demo:

```powershell
pnpm demo:video
```

The command writes `github-table-enhancer-demo.webm` to this directory. The generated WebM file is ignored by Git because it is a large, reproducible artifact.

The recording uses a deterministic local GitHub-style fixture, loads the unpacked extension from `dist`, and demonstrates Freeze, Filter, Fit, Wrap, Focus mode, and Reset at 1280 x 720. Edit `e2e/demo-video.spec.ts` to change the copy, pacing, fixture data, or scenario.

Chrome Web Store does not accept this WebM file directly. Upload the reviewed recording to YouTube, then enter that YouTube URL in the store listing's promotional video field. Keep the local WebM as the reproducible source artifact.

## User guide screenshots

Run the following command to rebuild the extension and regenerate the PNG screenshots used by the English GitHub Pages user guide and the Chrome Web Store freeze-controls screenshot:

```powershell
pnpm guide:screenshots
```

Changed images are written to `docs/store-assets/screenshots/`, including `github-table-freeze-controls-1280x800.png`. Existing images whose rendered pixels are unchanged are left untouched, so the command does not create a Git change solely from PNG encoding differences. The tests use deterministic GitHub-style fixtures and the unpacked `dist` extension. Edit `e2e/user-guide-screenshots.spec.ts` to update the user guide fixture, the Chrome Web Store freeze-controls fixture, or the captured states.
