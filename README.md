# relai

A local, open-source interface for managing coding AI agents like an inbox. Each conversation is backed by a real coding harness working on a repository.

The interface runs in a browser. Agent replies, questions, and approval requests appear as inbox messages, with file changes presented as attachments.

## Status

**In development — product design and architecture exploration.** No application or API is available yet.

The first integration targets Codex and the initial user's WSL environment. Relai is intended to use harnesses already installed on the user's machine. Docker packaging and the host execution bridge are still being designed; broader harness and operating-system support remain product goals.

See [product direction](docs/product-direction.md) for confirmed requirements and open decisions, and [CONTEXT.md](CONTEXT.md) for the project glossary.

## Security

Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md). Never post credentials, private messages, or customer data in issues or pull requests.

## License

Apache License 2.0. See [LICENSE](LICENSE).
