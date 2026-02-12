# ast-grep Extension for Gemini CLI

This extension integrates [ast-grep](https://ast-grep.github.io/), a fast and polyglot tool for code structural search, linting, and rewriting, directly into the Gemini CLI agent. It empowers the agent to perform **syntax-aware** search and replace operations, which are far more powerful, safe, and robust than simple regex or string replacement.

This is one of a handful of extensions that Gemini CLI actually asked me to build for it, and it uses it frequently as the builtin "Replace" command seems to be pretty primitive.

## Why use this extension?

Standard text-based tools often fail when code formatting changes (indentation, newlines) or when patterns are complex. `ast-grep` understands the **Abstract Syntax Tree (AST)** of your code.

-   **Precision:** Match exactly what you intend (e.g., a function call) regardless of whitespace.
-   **Safety:** Avoid accidental replacements in comments or strings.
-   **Power:** Use metavariables (like `$MSG`) to capture and reuse parts of the matched code during rewrites.
-   **Efficiency:** Perform massive refactors or searches across a large codebase asynchronously.

## Features

-   **`ast_read`**: Read code structure. Great for inspecting a class or function without reading the whole file.
-   **`ast_write`**: Replace code structure. Safer than regex because it enforces syntactical validity.
-   **`ast_grep_search`**: Find code patterns.
-   **`ast_grep_rewrite`**: Advanced rewrite with full options.
-   **Asynchronous Execution**: Run long tasks in the background without blocking the agent.

## Tips for Success

1.  **Valid Code Snippets:** Patterns must be valid code in the target language. Use `$$$` as a wildcard for "anything".
    *   *Bad:* `release() { ... }` (Invalid TS/JS on its own)
    *   *Good:* `class $C { release() { $$$ } }` (Valid class member context)
2.  **Specify Language:** Always set the `lang` parameter (e.g., `ts`, `js`, `python`) to ensure correct parsing.
3.  **Metavariables:** Use `$NAME` to capture variables and `$$$` to ignore/keep blocks of code.

## Installation

To install this extension, use the Gemini CLI:

```bash
gemini extensions install https://github.com/stevenAthompson/ast-grep-extension
```

## The Tmux Async Mechanism

This extension includes a specialized asynchronous mode designed for the Gemini CLI agent environment.

### Why Async?
Large codebase searches or complex rewrites can take time. If the agent waits synchronously, the entire interface blocks.

### How it works
When the `async` flag is set to `true`:
1.  The `ast-grep` process is spawned in the background (detached).
2.  The tool immediately returns a "Task started" message, allowing the agent to continue working or accept new user input.
3.  **Output**: The full stdout/stderr of the command is written to a file in the `tmp/` directory within your project root (e.g., `tmp/ast-grep-<id>.txt`). The directory is created if it doesn't exist.
4.  **Notification**: Upon completion, the extension uses `tmux` to inject a notification into the user's terminal, pointing to the output file.
5.  **Safety**: It uses a "wait for stability" check to ensure it doesn't interrupt the user or the agent while they are typing. It waits for the screen to be static for a few seconds before sending the notification.

**Requirements:**
-   You must be running the Gemini CLI inside a `tmux` session.
-   The session name typically defaults to `gemini-cli` (configurable via `GEMINI_TMUX_SESSION_NAME`).

## Usage Examples

### Structural Read (Find a class)
```typescript
ast_read({
  pattern: "class FileLock { $$$ }",
  lang: "ts",
  paths: ["src/file_lock.ts"]
})
```

### Structural Write (Add logging)
```typescript
ast_write({
  pattern: "function test() { $BODY }",
  replacement: "function test() { console.log('Called'); $BODY }",
  lang: "ts",
  paths: ["src/test.ts"]
})
```

### Async Search
```typescript
ast_grep_search({
  pattern: "console.log($MSG)",
  lang: "js",
  paths: ["src/"],
  async: true
})
```
