# CLAUDE.md - Project Guidelines for Claude Code

## Token Hygiene & Context Efficiency
- Keep context lean: do not load or query unnecessary heavy external tools, large datasets, or unneeded MCP servers unless specifically requested.
- Process logs and large outputs silently using scratch commands rather than printing long outputs into the conversation history.

## Project Structure & Architecture
- Workspace: ZP Website (`index.html`, `worlds.html`, `assets/`)
- Canvas & WebGL/2D Scene: `assets/js/zp-worlds.js`
- Design Tokens: `assets/css/`
- Always test local web changes using `python3 -m http.server 8080`.
