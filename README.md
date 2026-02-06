# ast-grep Extension for Gemini CLI

This extension integrates [ast-grep](https://ast-grep.github.io/), a fast and polyglot tool for code structural search, linting, and rewriting, directly into the Gemini CLI agent. It allows the agent to perform syntax-aware search and replace operations that are far more powerful and safe than regex-based methods.

## Features

-   **Structural Search**: Find code based on AST patterns, not just text matching.
-   **Structural Replace**: Rewrite code intelligently using pattern variables.
-   **Asynchronous Execution**: Run long-running searches or rewrites in the background without blocking the agent's interaction loop.
-   **Full Power**: Access all `ast-grep` capabilities via `extra_args`.

## Installation

To install this extension, use the Gemini CLI:

```bash
gemini extensions install https://github.com/steven-thompson/ast-grep-extension
```
*(Replace the URL with the actual repository URL if different)*

## The Tmux Async Mechanism

This extension includes a specialized asynchronous mode designed for the Gemini CLI agent environment.

### Why?
Large codebase searches or complex rewrites can take time. If the agent waits synchronously, the entire interface blocks.

### How it works
When the `async` flag is set to `true`:
1.  The `ast-grep` process is spawned in the background (detached).
2.  The tool immediately returns a "Task started" message, allowing the agent to continue working or accept new user input.
3.  Upon completion, the extension uses `tmux` to inject a notification into the user's terminal.
4.  **Safety**: It uses a "wait for stability" check to ensure it doesn't interrupt the user or the agent while they are typing. It waits for the screen to be static for a few seconds before sending the notification.

**Requirements:**
-   You must be running the Gemini CLI inside a `tmux` session.
-   The session name typically defaults to `gemini-cli` (configurable via `GEMINI_TMUX_SESSION_NAME`).

## Usage Examples

### Search
```typescript
ast_grep_search({
  pattern: "console.log($MSG)",
  lang: "js",
  paths: ["src/"]
})
```

### Async Rewrite
```typescript
ast_grep_rewrite({
  pattern: "var $A = $B",
  rewrite: "const $A = $B",
  lang: "js",
  async: true
})
```