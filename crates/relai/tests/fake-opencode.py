#!/usr/bin/env python3
"""OpenCode HTTP/SSE + native attach fixture. No inference or project commands."""
import base64, json, os, queue, sqlite3, sys, threading, time, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

sid = "ses_fixture"
secret = os.environ["OPENCODE_SERVER_PASSWORD"]
authorization = "Basic " + base64.b64encode(("opencode:" + secret).encode()).decode()
if "attach" in sys.argv:
    url = sys.argv[2]
    assert sys.argv[sys.argv.index("--session") + 1] == sid
    def api(path, body=None):
        request = urllib.request.Request(url + path, data=json.dumps(body).encode() if body is not None else None, headers={"Authorization": authorization,"Content-Type":"application/json"})
        return json.load(urllib.request.urlopen(request))
    print("Attached exact native session", flush=True)
    api("/fixture/start", {})
    for line in sys.stdin:
        if line.strip() == "native-allow":
            api("/permission/per_fixture/reply", {"reply":"once"})
            print("Native permission answered", flush=True)
        else:
            print("Native input: " + line.strip(), flush=True)
    sys.exit()

assert "serve" in sys.argv
events = queue.Queue()
pending = False
lock = threading.Lock()
permission = {"id":"per_fixture","sessionID":sid,"permission":"bash","patterns":["echo fixture"],"metadata":{},"always":[]}
def emit(kind, properties):
    events.put({"id":"evt_fixture","type":kind,"properties":properties})

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_): pass
    def respond(self, body, status=200):
        self.send_response(status);self.send_header("Content-Type","application/json");self.end_headers();self.wfile.write(json.dumps(body).encode())
    def authenticated(self):
        if self.headers.get("Authorization") != authorization:
            self.respond({},401);return False
        return True
    def do_GET(self):
        if not self.authenticated(): return
        path=urlparse(self.path).path
        if path=="/global/health":self.respond({"healthy":True,"version":"1.18.34"})
        elif path=="/doc":self.respond({"paths":{"/permission/{requestID}/reply":{}}})
        elif path=="/session/"+sid:self.respond({"id":sid,"directory":os.getcwd()})
        elif path=="/permission":self.respond([permission] if pending else [])
        elif path=="/session/"+sid+"/message/msg_fixture":self.respond({"info":{"id":"msg_fixture","role":"assistant","sessionID":sid},"parts":[{"type":"text","text":"OpenCode native fixture reply"}]})
        elif path=="/event":
            self.send_response(200);self.send_header("Content-Type","text/event-stream");self.end_headers();self.wfile.write(b": connected\n\n");self.wfile.flush()
            try:
                while True:
                    event=events.get(timeout=60);self.wfile.write(("data: "+json.dumps(event)+"\n\n").encode());self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError, queue.Empty):pass
        else:self.respond({},404)
    def do_POST(self):
        global pending
        if not self.authenticated():return
        path=urlparse(self.path).path
        body=json.loads(self.rfile.read(int(self.headers.get("Content-Length",0))) or "{}")
        if path=="/fixture/start":
            pending=True;emit("session.status",{"sessionID":sid,"status":{"type":"busy"}});emit("permission.asked",permission);self.respond(True)
        elif path=="/permission/per_fixture/reply":
            with lock:
                if not pending:self.respond({},404);return
                pending=False
            assert body["reply"] in ["once","reject"]
            emit("permission.replied",{"sessionID":sid,"requestID":"per_fixture","reply":body["reply"]})
            db=sqlite3.connect(os.environ["RELAI_FIXTURE_DB"])
            db.execute("INSERT OR IGNORE INTO message VALUES('msg_fixture',?,?,?)",(sid,int(time.time()*1000),json.dumps({"role":"assistant"})))
            db.execute("INSERT OR IGNORE INTO part VALUES('part_fixture','msg_fixture',?,?)",(int(time.time()*1000),json.dumps({"type":"text","text":"OpenCode native fixture reply"})))
            db.commit();db.close()
            emit("message.updated",{"sessionID":sid,"info":{"id":"msg_fixture","role":"assistant","sessionID":sid,"time":{"completed":int(time.time()*1000)}}})
            emit("session.status",{"sessionID":sid,"status":{"type":"idle"}});self.respond(True)
        else:self.respond({},404)

ThreadingHTTPServer(("127.0.0.1",int(sys.argv[sys.argv.index("--port")+1])),Handler).serve_forever()
