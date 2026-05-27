# Fetch a Page

Fetches a live webpage and saves it to `page/index.html` with assets injected. Ensures the preview server is running, starting it if needed. **Never** touches `page/changes.js` or `page/changes.css`.

`$ARGUMENTS` is the URL to fetch.

## Steps

1. **Validate input.** If `$ARGUMENTS` is empty or doesn't look like a URL, ask the user for the URL and stop.

1a. **Check that Node and npm are installed.** Run `command -v node >/dev/null && command -v npm >/dev/null && echo ok || echo missing`. If `missing`, stop and tell the user:

    > Node.js (and npm) aren't installed on this machine. Install Node 20+ before running `/fetch`. Easiest options:
    > - macOS: `brew install node@20`
    > - Linux: `sudo apt install nodejs npm` (Debian/Ubuntu) or use [nvm](https://github.com/nvm-sh/nvm)
    > - Windows: download from https://nodejs.org/
    >
    > Then re-run `/fetch`.

    Do NOT attempt to install Node yourself — that's a system-level change requiring sudo and is the user's call.

2. **Install deps if missing.** If `app/node_modules` doesn't exist, run `npm install --prefix app` and wait for it to finish. Tell the user "first-time setup — this downloads Playwright + Chromium (~115 MB) and takes 30–90 seconds depending on connection."

3. **Ensure preview server is running.** Run `pgrep -f 'browser-sync start' > /dev/null && echo running || echo stopped`. If `stopped`, start it:

   ```bash
   ./app/node_modules/.bin/browser-sync start --server page --files 'page/**/*' --no-notify --no-snippet > /tmp/bs-out.txt 2>&1 &
   ```

   Then poll for it to bind a port instead of sleeping a fixed amount — it's usually ready in under a second, and a fixed wait sometimes isn't long enough on a slow machine. Loop until the localhost URL appears in `/tmp/bs-out.txt`, capped at ~8s:

   ```bash
   for i in $(seq 1 40); do
     grep -q 'http://localhost:[0-9]' /tmp/bs-out.txt 2>/dev/null && break
     sleep 0.2
   done
   ```

   If the loop finishes with no URL in the file, report that browser-sync failed to start (point the user at `/tmp/bs-out.txt`) and stop — don't continue to fetch.

   `--no-snippet` suppresses browser-sync's auto-injected client script (it's injected manually before `<base>` to avoid URL rewriting). Omitting `--port` lets browser-sync auto-assign a free port.

4. **Fetch and process in one Bash command.** Run the following, substituting `$ARGUMENTS` for `URL`:

   ```bash
   curl -sL \
     -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
     "URL" | node -e "
   const fs = require('fs');
   const url = new URL('URL');
   const origin = url.origin;
   let html = '';
   process.stdin.setEncoding('utf8');
   process.stdin.on('data', d => html += d);
   process.stdin.on('end', () => {
     html = html.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');
     const injection = '<script>(()=>{const h=\`\${location.protocol}//\${location.host}\`;const l=document.createElement(\"link\");l.rel=\"stylesheet\";l.href=\`\${h}/changes.css\`;document.head.appendChild(l);const s=document.createElement(\"script\");s.src=\`\${h}/changes.js\`;document.head.appendChild(s);const bs=document.createElement(\"script\");bs.src=\`\${h}/browser-sync/browser-sync-client.js\`;document.head.appendChild(bs);})()</script>\n<base href=\"' + origin + '/\">';
     html = html.replace(/(<head\b[^>]*>)/i, '\$1\n' + injection);
     fs.writeFileSync('page/index.html', html);
   });
   "
   ```

   If curl or node exits non-zero, report the error and stop.

   **CRITICAL — DO NOT touch `page/changes.js` or `page/changes.css` under any circumstances.** These are committed repo files the user writes their experiment code into. Overwriting them destroys their work. Only `page/index.html` is ever written by this command.

5. **Find the URL.** Run `grep -o 'http://localhost:[0-9]*' /tmp/bs-out.txt | head -1`.

6. **Report.** One line: "Ready at <url> — tell me what you want to change."

## Notes

- `page/changes.js` and `page/changes.css` are committed repo files. Never overwrite, truncate, or delete them — not even to write "empty" stubs.
- Never edit `page/index.html` after writing it.
- If the server is already running, this command leaves it alone — it just updates the snapshot.
- See `CLAUDE.md` for the full Optimizely JS rules.
