# User Logs

Live site: https://naeem-petiwala.github.io/UserLogs/

One website with several tools. Every page shares one look and one menu.

## Folder map

```
UserLogs/
├─ index.html                 Logs (home page)
├─ assets/                    things every page uses
│  ├─ css/theme.css           MASTER THEME: colors, spacing, header, buttons, forms, cards
│  ├─ js/site.js              the header, the page menu, the theme switch, the footer
│  ├─ js/theme-init.js        applies the saved theme before the page paints
│  └─ img/favicon.png
├─ data/                      content you edit (later this moves to Firebase)
│  ├─ config.js               clients, storages, log formats, Native Logs backend addresses
│  └─ links-data.js           the Important Links sections and links
└─ pages/                     one folder per page
   ├─ logs/                   logs.js (URL builder), logs-ui.js, logs.css
   ├─ native-logs/            index.html, native-logs.js, native-logs.css
   ├─ builds/                 index.html (Native Builds, uses Firebase)
   ├─ links/                  index.html, links.js, links.css
   ├─ json-viewer/            index.html, json-viewer.js (screen), jv-core.js (parser), jv-tools.js (find, query, compare, convert), json-viewer.css
   ├─ text-compare/           index.html, text-compare.js (diff engine + screen), text-compare.css
   ├─ sql/                    index.html, sql.css
   ├─ aes/                    index.html, aes.css
   └─ admin/                  index.html, admin.js, admin.css (demo for now)
```

## Everyday changes

| I want to... | Edit this |
|---|---|
| Change a color, font size or spacing everywhere | `assets/css/theme.css` (section 1 has the colors) |
| Add a client or change a log URL format | `data/config.js` |
| Add or change an Important Link | `data/links-data.js` |
| Add, rename or reorder a menu item | `assets/js/site.js` (the `PAGES` list) |
| Change the footer text or version | `assets/js/site.js` (the `SITE` line) |

## Add a new page (3 steps)

1. Make a folder `pages/my-tool/` and put an `index.html` in it using the template below.
2. Add one line to `PAGES` in `assets/js/site.js`:
   `{ id: 'my-tool', label: 'My Tool', href: 'pages/my-tool/index.html' },`
3. Done. The menu, theme switch and footer appear by themselves.

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>My Tool · User Logs</title>
<link rel="icon" href="../../assets/img/favicon.png" type="image/png">
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600&family=Syne:wght@500;600;700&display=swap" rel="stylesheet">
<script src="../../assets/js/theme-init.js"></script>
<link rel="stylesheet" href="../../assets/css/theme.css">
<link rel="stylesheet" href="my-tool.css">   <!-- only styles for this page -->
</head>
<body data-page="my-tool">
<script src="../../assets/js/site.js"></script>
<main class="page">
  <div class="page-head"><h1>My Tool</h1><p>What it does.</p></div>
  <section class="card">...</section>
</main>
<script src="my-tool.js"></script>
</body>
</html>
```

Ready-made parts in `theme.css`: `.page`, `.page-head`, `.card`, `.card-title`, `.field`, `.label-row`, inputs and selects,
`.btn` (`.primary`, `.danger`, `.sm`), `.segmented`, `.pill`, `.badge`, `.chip`, `.link-btn`, `.step-btn`, the `#alert` toast,
the colored foldable JSON tree (`.jrow`, `.jk`, `.js`, `.jv` ...), and the added/removed colors for diffs (`--add-fg`, `--add-bg`, `--del-fg` ... in section 11).
Tip: do not name a page class like a theme class (for example `.jv`), because both would apply.

## Rules of thumb
- Colors live only in `theme.css`. Page CSS files use `var(--primary)`, `var(--surface)` and so on, never a hex color.
- Use `.hidden` or the `hidden` attribute to hide things.
- Open the pages through a web server or GitHub Pages. Opening files straight from disk works for most pages too.
