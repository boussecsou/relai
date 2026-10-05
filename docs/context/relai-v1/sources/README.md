# relai

A local, open-source interface for managing coding AI agents like an inbox. Messages target an existing harness session or start a new one in a selected working directory.

The interface runs in a browser. Agent replies, questions, and approval requests appear as inbox messages, with file changes presented as attachments.

New session uses a destination, chat title, and Markdown prompt; Reply continues an existing session with a Markdown prompt. Available harnesses and active sessions should be discovered automatically; discovery and control capabilities vary by harness and remain under design. See the [compose draft](docs/sdd/0001-compose-message.md).

## Status

**In development — product design and architecture exploration.** No application or API is available yet.

The first integration targets Codex and the initial user's WSL environment. Relai is intended to use harnesses already installed on the user's machine. The chosen architecture is a native local Rust service with a TypeScript/React browser UI, SQLite storage, and Git CLI. UI and API share application operations that a future MCP adapter can reuse; MCP implementation is deferred. Distribution targets Linux/WSL first, with independent installations on multiple machines. Broader platform support and Docker distribution remain future options. See the [installation draft](docs/sdd/0004-local-installation-and-api.md).

An interactive [inbox design mockup](design/README.md) uses fictitious data to explore the UI/UX. It is separate from the future production app. See the [visual direction draft](docs/sdd/0005-inbox-ui-ux.md).

See [product direction](docs/product-direction.md) for confirmed requirements and open decisions, and [CONTEXT.md](CONTEXT.md) for the project glossary.

## Security

Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md). Never post credentials, private messages, or customer data in issues or pull requests.

## License

Apache License 2.0. See [LICENSE](LICENSE).
