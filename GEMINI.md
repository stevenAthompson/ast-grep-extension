# ast-grep

Allows Gemini CLI to grep through code bases and perform more efficient syntax aware find/replace operations than the built-in, limited, "Replace" function using ast-grep which is a fast and polyglot tool for code structural search, lint, rewriting at large scale.

## Tools

### ast_grep_search
Search for code patterns using ast-grep structural search.
- `pattern`: AST pattern to match.
- `lang`: (Optional) The language of the pattern (e.g., ts, js, python).
- `paths`: (Optional) The paths to search.
- `globs`: (Optional) Include or exclude file paths using glob patterns.
- `context`: (Optional) Show NUM lines around each match (equivalent to -C).
- `strictness`: (Optional) The strictness of the pattern (cst, smart, ast, relaxed, signature, template).
- `json`: (Optional) Output matches in structured JSON format.
- `async`: (Optional) Run asynchronously in the background and notify via tmux. Defaults to false.
- `extra_args`: (Optional) Additional command line arguments to pass to ast-grep (e.g. "--debug-query=ast").

### ast_grep_rewrite
Rewrite code patterns using ast-grep structural replace.
- `pattern`: AST pattern to match.
- `rewrite`: String to replace the matched AST node.
- `lang`: (Optional) The language of the pattern.
- `paths`: (Optional) The paths to rewrite.
- `update_all`: (Optional) Apply all rewrites without confirmation (defaults to true).
- `async`: (Optional) Run asynchronously in the background and notify via tmux. Defaults to false.
- `extra_args`: (Optional) Additional command line arguments to pass to ast-grep.

### ast_grep_scan
Scan and rewrite code by configuration or inline rules.
- `config`: (Optional) Path to ast-grep root config.
- `json`: (Optional) Output matches in structured JSON format.
- `async`: (Optional) Run asynchronously in the background and notify via tmux. Defaults to false.
- `extra_args`: (Optional) Additional command line arguments to pass to ast-grep.

### ast_read
Reads code structurally. Use this to find specific functions, classes, or patterns without reading the entire file. More efficient and precise than `read_file` for locating code.
- `paths`: The paths to the files to read.
- `pattern`: (Optional) The AST pattern to match. Defaults to "$$$" (match everything).
- `lang`: (Optional) The language of the file (e.g., ts, js, python).
- `context`: (Optional) Show NUM lines around each match.
- `async`: (Optional) Run asynchronously in the background.

### ast_write
Replaces code structurally. Safer and more robust than standard replace. Requires an exact AST pattern match. Will only modify existing files.
- `paths`: The paths to the files to modify. Files must exist.
- `pattern`: The old code structure/pattern to find.
- `replacement`: The new code structure to insert.
- `lang`: (Optional) The language of the file.
- `async`: (Optional) Run asynchronously in the background.

## Agent Guidelines for Asynchronous Execution

When performing large codebase searches or complex rewrites, use the `async: true` flag.

### 1. File Output
When `async: true` is used, the tool will:
- Return immediately with a unique **Request ID** (e.g., `[A1B2]`).
- Return the path to an output file: `tmp/ast-grep-<ID>.txt`.
- Spawn a detached worker process to execute the command.

### 2. Notifications & Stability
Once the background task completes, the extension uses `tmux` to inject a completion notification into the terminal.
- **CRITICAL**: The notification system waits for **screen stability** (no changes for ~10 seconds) before typing.
- This ensures the notification does not interrupt your (the agent's) or the user's active typing.

### 3. Yielding Turn (MANDATORY)
After triggering an `async` operation, you **MUST yield your turn immediately**.
- If the `yield_turn` tool is available (from the `self-command` extension), use it.
- Otherwise, simply end your response.
- **DO NOT POLL**: Do not try to `ls` or `read_file` the `tmp` file repeatedly. Polling prevents the screen from becoming stable, which will **block the notification from ever arriving**.

### 4. Processing Results
Once the notification arrives, it will wake the system up. You can then use `read_file` on the `tmp/ast-grep-<ID>.txt` path provided in the initial response to see the full results.

## IMPORTANT NOTES
- Gemini extensions are distributed via Github and must include all requirements. Do NOT gitignore dist folder or prevent modules from being pushed to github. If you do this the output will be unusable. We can NOT require end users to "npm install" a list of things. 
- You have a number of extension tools installed. Familiarize yourself with them before beginning work.
- Always gitignore any secrets, keys, or other sensitive information.
- Exclude the "reference" folder from any git pushes. That code is for reference only.