# Chrome Web Store Listing

Chrome Web Store copy is split by locale so each translation can be reviewed and updated
independently. The localized name and short description in each file must stay identical to
`extensionName` and `extensionDescription` in the corresponding extension locale.

## Locale Drafts

| Language | Extension locale | Store listing draft |
| --- | --- | --- |
| English | `en` | [English](chrome-web-store-listings/en.md) |
| Japanese | `ja` | [Japanese](chrome-web-store-listings/ja.md) |
| Simplified Chinese | `zh_CN` | [Simplified Chinese](chrome-web-store-listings/zh_CN.md) |
| Korean | `ko` | [Korean](chrome-web-store-listings/ko.md) |
| Brazilian Portuguese | `pt_BR` | [Brazilian Portuguese](chrome-web-store-listings/pt_BR.md) |
| Spanish | `es` | [Spanish](chrome-web-store-listings/es.md) |

The Chrome Web Store makes localized listing fields available for locales included in the
extension package. See Chrome's official guidance for
[localizing a listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing/#localize-your-listing)
and [creating a high-quality listing page](https://developer.chrome.com/docs/webstore/best-listing).

## Shared Listing Settings

- Support URL: <https://github.com/Huruikagi/table-enhancer-for-github/issues>
- Privacy policy URL:
  <https://huruikagi.github.io/table-enhancer-for-github/privacy-policy/>
- Keep the primary category consistent across all locales.
- Use the same feature set, scope, privacy statement, and GitHub affiliation disclaimer in every
  detailed description.

## Localization Checklist

- Build the production package and confirm all six `public/_locales` directories are present in
  the uploaded extension.
- Select each available language in the Store listing tab.
- Confirm the displayed name and short description match the corresponding locale draft.
- Paste the locale's detailed description without changing paragraph breaks or list structure.
- Preview every locale and check for truncation, broken line breaks, or missing list items.
- Confirm that shared screenshots with English UI are acceptable for each localized listing.
  Locale-specific screenshots can be added separately later.
- Keep the support and privacy policy URLs identical across all locales.
- Recheck that localized descriptions do not add unsupported features or omit material privacy or
  scope details.

## v1.3.0 Update Checklist

For the v1.3.0 update:

- Upload `table-enhancer-for-github-v1.3.0.zip` from the
  [v1.3.0 GitHub Release](https://github.com/Huruikagi/table-enhancer-for-github/releases/tag/v1.3.0).
- Confirm the uploaded package reports version `1.3.0` before submitting it for review.
- Replace the existing English and Japanese detailed descriptions with the locale drafts, then add
  the four new localized listings.
- Keep each locale's name and short description aligned with the packaged manifest messages.
- Recheck the Privacy tab against [chrome-web-store-privacy.md](chrome-web-store-privacy.md).
  v1.3.0 does not add permissions, remote code, network requests, or data collection.
- Preview the listing and verify the version, descriptions, screenshots, support URL, and privacy
  policy before submitting the update.

## Store Media

Chrome Web Store screenshots must be 1280 x 800 pixels. The current repository assets that meet
that requirement are:

- `docs/store-assets/screenshots/github-table-freeze-annotated-1280x800.png`
- `docs/store-assets/screenshots/github-table-freeze-controls-1280x800.png`
- `docs/store-assets/screenshots/user-guide-overview.png`
- `docs/store-assets/screenshots/user-guide-freeze.png`
- `docs/store-assets/screenshots/user-guide-filter.png`
- `docs/store-assets/screenshots/user-guide-hide-and-restore.png`
- `docs/store-assets/screenshots/user-guide-fit-and-wrap.png`
- `docs/store-assets/screenshots/user-guide-focus-mode.png`

The store accepts up to five screenshots. For v1.3.0, prioritize images that show the toolbar
overview, filtering, Freeze controls, Fit/Wrap, and Focus mode. Do not upload
`github-table-freeze-annotated.png`; its 1294 x 1081 dimensions do not meet the store screenshot
requirement.

Use `docs/store-assets/promo/small-promo-tile-440x280.png` for the required 440 x 280 small
promotional tile. The repository does not currently include the optional 1400 x 560 marquee
promotional tile.

Chrome Web Store promotional videos are supplied as YouTube URLs. The reproducible local WebM and
upload workflow are documented in
[store-assets/videos/README.md](store-assets/videos/README.md).
