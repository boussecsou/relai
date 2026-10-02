import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";

async function request(sessionId: string, action?: string) {
  const response = await fetch(`/api/v1/sessions/${sessionId}/terminal`, {
    method: action ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: action ? JSON.stringify({ action }) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Terminal is unavailable.");
  return result;
}

export function TerminalPanel({
  sessionId,
  agent,
  onRelease,
}: {
  sessionId: string;
  agent: string;
  onRelease: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const socket = useRef<WebSocket | null>(null);
  const search = useRef<SearchAddon | null>(null);
  const [status, setStatus] = useState("Connecting…");
  const [error, setError] = useState("");
  const [control, setControl] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [find, setFind] = useState("");
  useEffect(() => {
    let disposed = false;
    const terminal = new Terminal({
      fontFamily: '"IBM Plex Mono", monospace',
      fontSize: 14,
      cursorBlink: true,
      scrollback: 3000,
      screenReaderMode: true,
      theme: { background: "#111315", foreground: "#ECEDEF" },
    });
    const fit = new FitAddon();
    const finder = new SearchAddon();
    terminal.loadAddon(fit);
    terminal.loadAddon(finder);
    terminal.loadAddon(
      new WebLinksAddon((_event, uri) => {
        if (/^https?:\/\//.test(uri))
          window.open(uri, "_blank", "noopener,noreferrer");
      }),
    );
    search.current = finder;
    terminal.open(host.current!);
    const send = (value: unknown) => {
      if (socket.current?.readyState === WebSocket.OPEN)
        socket.current.send(JSON.stringify(value));
    };
    const resize = () => {
      fit.fit();
      send({ type: "resize", cols: terminal.cols, rows: terminal.rows });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host.current!);
    const input = terminal.onData((data) => send({ type: "input", data }));
    const binary = terminal.onBinary((data) =>
      send({ type: "binary", data: btoa(data) }),
    );
    // Browser/application shortcuts are scoped outside this region.
    terminal.attachCustomKeyEventHandler((event) => {
      if (event.type === "keydown" && event.key === "Escape" && event.ctrlKey) {
        panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
        return false;
      }
      return true;
    });
    request(sessionId, "open")
      .then(() => {
        if (disposed) return;
        const ws = new WebSocket(
          `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/api/v1/sessions/${sessionId}/terminal/stream`,
        );
        socket.current = ws;
        ws.onopen = () => {
          setError("");
          resize();
        };
        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          if (message.type === "output" || message.type === "snapshot") {
            const bytes = Uint8Array.from(atob(message.data), (c) =>
              c.charCodeAt(0),
            );
            if (message.type === "snapshot") terminal.reset();
            terminal.write(bytes, () =>
              send({ type: "ack", sequence: message.sequence }),
            );
          }
          if (message.type === "state") {
            setControl(message.control);
            terminal.options.disableStdin = !message.control;
            setStatus(
              message.exited
                ? "Process stopped · history preserved"
                : message.control
                  ? "You control this terminal"
                  : "Observing · take control to type",
            );
          }
          if (message.type === "error") setError(message.message);
        };
        ws.onclose = () => {
          if (!disposed) {
            setControl(false);
            setStatus("Disconnected · reconnect to restore the terminal");
          }
        };
        ws.onerror = () => {
          if (!disposed) setError("The terminal connection was lost.");
        };
      })
      .catch((e) => {
        if (!disposed) {
          setError(e.message);
          setStatus("Unavailable");
        }
      });
    return () => {
      disposed = true;
      socket.current?.close();
      socket.current = null;
      observer.disconnect();
      input.dispose();
      binary.dispose();
      terminal.dispose();
    };
  }, [sessionId, generation]);
  async function action(name: string) {
    try {
      await request(sessionId, name);
      setError("");
      if (name === "release") onRelease();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section
      className="terminal-panel"
      ref={panel}
      aria-label={`${agent} terminal`}
    >
      <div className="terminal-toolbar">
        <span className="small" role="status">
          {status}
        </span>
        {!control && (
          <button
            className="secondary"
            onClick={() =>
              socket.current?.send(JSON.stringify({ type: "claim" }))
            }
          >
            Take control
          </button>
        )}
        <button
          className="secondary"
          onClick={() => setGeneration((g) => g + 1)}
        >
          Reconnect
        </button>
        <button
          className="secondary"
          onClick={() => void panel.current?.requestFullscreen()}
        >
          Focus
        </button>
        <button className="secondary" onClick={() => void action("release")}>
          Return to automatic sending
        </button>
        <button className="secondary" onClick={() => void action("stop")}>
          Close terminal process
        </button>
      </div>
      {error && (
        <div className="banner error" role="alert">
          {error}
        </div>
      )}
      <label className="terminal-find">
        Find in terminal{" "}
        <input
          value={find}
          onChange={(e) => {
            setFind(e.target.value);
            search.current?.findNext(e.target.value);
          }}
        />
      </label>
      <div className="terminal-screen" ref={host} />
      <p className="small muted">
        Automatic sends for this chat are paused. Native commands and
        permissions stay active. Hiding this panel keeps the process running.
        Press Ctrl+Escape to leave terminal input.
      </p>
    </section>
  );
}
