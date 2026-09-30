"""PROTOTYPE Linux/WSL: JSON stdin controls, raw terminal bytes on stdout."""
import base64
import fcntl
import json
import os
import pty
import select
import signal
import struct
import sys
import termios

argv = sys.argv[1:]
pid, master = pty.fork()
if pid == 0:
    os.environ["TERM"] = "xterm-256color"
    os.environ["COLORTERM"] = "truecolor"
    fcntl.ioctl(0, termios.TIOCSWINSZ, struct.pack("HHHH", 30, 100, 0, 0))
    try:
        os.execvp(argv[0], argv)
    except OSError:
        os.write(2, b"Programme indisponible. Verifiez son installation.\r\n")
        os._exit(127)

def resize(cols, rows):
    fcntl.ioctl(master, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))

resize(100, 30)
pending = b""
status = None
try:
    while True:
        ready, _, _ = select.select([master, 0], [], [], 0.25)
        if master in ready:
            try:
                data = os.read(master, 65536)
            except OSError:
                break
            if not data:
                break
            sys.stdout.buffer.write(data)
            sys.stdout.buffer.flush()
        if 0 in ready:
            data = os.read(0, 65536)
            if not data:
                break
            pending += data
            while b"\n" in pending:
                line, pending = pending.split(b"\n", 1)
                message = json.loads(line)
                if message["type"] == "input":
                    payload = base64.b64decode(message["data"])
                    while payload:
                        written = os.write(master, payload)
                        payload = payload[written:]
                elif message["type"] == "resize":
                    resize(message["cols"], message["rows"])
        if status is None:
            child, child_status = os.waitpid(pid, os.WNOHANG)
            if child:
                status = child_status
                # Drain remaining output before the PTY reports EOF.
finally:
    os.close(master)
    if status is None:
        try:
            os.killpg(pid, signal.SIGHUP)
            for _ in range(20):
                child, child_status = os.waitpid(pid, os.WNOHANG)
                if child:
                    status = child_status
                    break
                select.select([], [], [], 0.05)
            if status is None:
                os.killpg(pid, signal.SIGKILL)
                _, status = os.waitpid(pid, 0)
        except (ProcessLookupError, ChildProcessError):
            pass
sys.exit(os.waitstatus_to_exitcode(status) if status is not None else 0)
