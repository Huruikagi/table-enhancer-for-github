# Chrome Web Store Listing Draft

## Short Description

An unofficial extension that makes wide tables easier to read in GitHub Markdown file previews.

## Detailed Description

Wide GitHub Markdown tables should not turn review into a scrolling exercise.

Table Enhancer for GitHub adds compact controls directly above tables on Markdown file preview pages. Keep your place, find the rows that matter, and copy the result—without editing the source file.

Stay oriented

- Freeze header rows and leading columns while you scroll.
- Save Freeze defaults by repository and heading for the tables you revisit.

Find what matters

- Filter rows by text or regular expression.
- Sort by any column, or hide rows and columns you do not need.

Shape the view around your task

- Fit, wrap, or resize columns for easier reading.
- Open one table in full-window Focus mode when you need more space.

Take the useful part with you

- Copy the visible view as Markdown, CSV, or TSV. Hidden and filtered content stays out of the copy.
- Reset temporary changes whenever you want to return to the original view.

The extension works only on GitHub Markdown file preview pages (`github.com/.../blob/...`). It does not alter your files or run on issues, pull requests, discussions, or repository landing pages.

Freeze defaults are stored locally in Chrome. No user data is collected, transmitted, sold, or shared.

Table Enhancer for GitHub is an independent project and is not affiliated with, sponsored by, or endorsed by GitHub.

## Japanese Listing

### Name

GitHub Table Enhancer

### Short Description

GitHubのMarkdownファイルプレビューにある横長の表を読みやすくする非公式の拡張機能です。

### Detailed Description

GitHubの横長なMarkdown表。読むたびに、横スクロールを何度も往復していませんか？

GitHub Table Enhancerは、Markdownファイルプレビューの表にコンパクトな操作バーを追加します。元ファイルを書き換えることなく、位置を見失わずに読み、必要な行を見つけ、その結果をすぐに活用できます。

位置を見失わずに読む

- 見出し行や左端の列を固定したままスクロール。
- よく見る表の固定設定を、リポジトリと見出しごとに保存。

必要な情報だけに絞る

- テキストまたは正規表現で行をフィルター。
- 列ごとの並べ替えや、不要な行・列の一時非表示。

用途に合わせて読みやすくする

- 列幅の自動調整、折り返し、ドラッグによる幅変更。
- 1つの表を広い画面で確認できるフォーカスモード。

見えている内容をそのまま活用する

- 表示中の範囲だけをMarkdown、CSV、TSV形式でコピー。非表示や絞り込みの結果もそのまま反映。
- 一時的な変更はいつでもリセットして、元の表示へ。

動作するのは、GitHubのMarkdownファイルプレビューページ（`github.com/.../blob/...`）だけです。ファイル自体は変更せず、Issue、Pull Request、Discussion、リポジトリトップページでは動作しません。

固定設定はChrome内にローカル保存されます。ユーザーデータの収集、送信、販売、共有は行いません。

GitHub Table Enhancerは独立したプロジェクトであり、GitHubとの提携、GitHubによるスポンサーまたは承認を受けたものではありません。

### Japanese Localization Checklist

- Chrome Web Storeのストア掲載情報で日本語ロケールを追加する。
- 名前、短い説明、詳細説明に上記の日本語文言を設定する。
- サポートURLは <https://github.com/Huruikagi/table-enhancer-for-github/issues> を使用する。
- プライバシーポリシーURLは <https://huruikagi.github.io/table-enhancer-for-github/privacy-policy/> を維持する。
- 日本語ロケールのプレビューで改行、箇条書き、説明の省略がないことを確認する。
- 現在のストア画像を共通で使用する場合は、日本語UIの説明と画像内の英語UIが混在することを確認する。日本語版画像の作成は別の更新として扱える。

## v1.3.0 Update Checklist

For the v1.3.0 update:

- Upload `table-enhancer-for-github-v1.3.0.zip` from the [v1.3.0 GitHub Release](https://github.com/Huruikagi/table-enhancer-for-github/releases/tag/v1.3.0).
- Confirm the uploaded package reports version `1.3.0` before submitting it for review.
- Replace the existing detailed description with the draft above. The current public description does not yet mention regular expression filtering, sorting, Focus mode, or repository-specific Freeze defaults.
- Keep the short description unchanged; it still matches the extension's purpose and manifest description.
- Use the canonical support URL: <https://github.com/Huruikagi/table-enhancer-for-github/issues>.
- Keep the privacy policy URL set to <https://huruikagi.github.io/table-enhancer-for-github/privacy-policy/>.
- Recheck the Privacy tab against [chrome-web-store-privacy.md](chrome-web-store-privacy.md). v1.3.0 does not add permissions, remote code, network requests, or data collection.
- Preview the listing and verify the version, description, screenshots, support URL, and privacy policy before submitting the update.

## Store Media

Chrome Web Store screenshots must be 1280 x 800 pixels. The current repository assets that meet that requirement are:

- `docs/store-assets/screenshots/github-table-freeze-annotated-1280x800.png`
- `docs/store-assets/screenshots/github-table-freeze-controls-1280x800.png`
- `docs/store-assets/screenshots/user-guide-overview.png`
- `docs/store-assets/screenshots/user-guide-freeze.png`
- `docs/store-assets/screenshots/user-guide-filter.png`
- `docs/store-assets/screenshots/user-guide-hide-and-restore.png`
- `docs/store-assets/screenshots/user-guide-fit-and-wrap.png`
- `docs/store-assets/screenshots/user-guide-focus-mode.png`

The store accepts up to five screenshots. For v1.3.0, prioritize images that show the toolbar overview, filtering, Freeze controls, Fit/Wrap, and Focus mode. Do not upload `github-table-freeze-annotated.png`; its 1294 x 1081 dimensions do not meet the store screenshot requirement.

Use `docs/store-assets/promo/small-promo-tile-440x280.png` for the required 440 x 280 small promotional tile. The repository does not currently include the optional 1400 x 560 marquee promotional tile.

Chrome Web Store promotional videos are supplied as YouTube URLs. The reproducible local WebM and upload workflow are documented in [store-assets/videos/README.md](store-assets/videos/README.md).
