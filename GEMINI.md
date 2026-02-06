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


## IMPORTANT NOTES
- Gemini extensions are distributed via Github and must include all requirements. Do NOT gitignore dist folder or prevent modules from being pushed to github. If you do this the output will be unusable. We can NOT require end users to "npm install" a list of things. 
- You have a number of extenstion tools installed. Familiarize yourself with them before beginning work.
- Always gitignore any secrets, keys, or other sensitive information.
- Exclude the "reference" folder from any git pushes. That code is for reference only. 
