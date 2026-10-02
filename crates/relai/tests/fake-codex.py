#!/usr/bin/env python3
"""Protocol fixture. No inference or project commands; durable native turns survive restarts."""
import json, os, sys, threading, time, uuid
from pathlib import Path
if '--version' in sys.argv:
    print('codex-cli 0.159.0')
    sys.exit()
root=Path(os.environ['CODEX_HOME']);root.mkdir(parents=True,exist_ok=True)
state_file=root/'.fixture-state.json'
state=json.loads(state_file.read_text()) if state_file.exists() else {}
lock=threading.RLock();output_lock=threading.Lock();initialized=False;pending={}
def save():
    temp=state_file.with_suffix('.tmp');temp.write_text(json.dumps(state));temp.replace(state_file)
def emit(v):
    with output_lock:
        print(json.dumps(v),flush=True)
def event(method,params): emit({'method':method,'params':params})
def finish(tid,turn,status='completed'):
    with lock:
        t=next(t for t in state[tid]['turns'] if t['id']==turn)
        if t['status']!='inProgress': return
        if status=='completed':
            item={'id':str(uuid.uuid4()),'type':'agentMessage','text':'Fixture reply: '+t['items'][0]['content'][0]['text'],'phase':'final_answer'}
            t['items'].append(item);event('item/completed',{'threadId':tid,'turnId':turn,'item':item})
        t['status']=status
        if status=='failed':t['error']={'message':'Fixture failure'}
        save();event('turn/completed',{'threadId':tid,'turn':t})
def start(params):
    tid=params['threadId'];text=params['input'][0]['text'];turn=str(uuid.uuid4())
    user={'id':str(uuid.uuid4()),'type':'userMessage','content':params['input']}
    t={'id':turn,'status':'inProgress','items':[user]}
    state[tid]['turns'].append(t);save()
    if 'lost-ack' in text:
        t['status']='completed';save();os._exit(0)
    event('turn/started',{'threadId':tid,'turn':t})
    event('item/completed',{'threadId':tid,'turnId':turn,'item':user})
    if 'approval' in text or 'question' in text or 'permissions' in text:
        rid=str(uuid.uuid4());pending[rid]=(tid,turn)
        if 'question' in text:
            method='item/tool/requestUserInput';p={'isBlocking':True,'questions':[{'id':'choice','header':'Choice','question':'Which option?','options':[{'label':'A','description':'First'},{'label':'B','description':'Second'}]}]}
        elif 'permissions' in text:
            method='item/permissions/requestApproval';p={'permissions':{'network':{'enabled':True}},'cwd':state[tid]['cwd'],'startedAtMs':int(time.time()*1000)}
        else:
            method='item/commandExecution/requestApproval';p={'command':'echo fixture','cwd':state[tid]['cwd'],'startedAtMs':int(time.time()*1000)}
        p.update(threadId=tid,turnId=turn,itemId='request-item')
        emit({'id':rid,'method':method,'params':p})
    else:
        delay=3 if 'slow' in text else .2
        timer=threading.Timer(delay,finish,args=(tid,turn,'failed' if 'fail' in text else 'completed'));timer.daemon=True;timer.start()
    return {'turn':t}
for line in sys.stdin:
    try:
        v=json.loads(line)
        with lock:
            if 'method' not in v:
                rid=v.get('id')
                if rid in pending:
                    tid,turn=pending.pop(rid);event('serverRequest/resolved',{'threadId':tid,'requestId':rid});finish(tid,turn,'interrupted' if v.get('result',{}).get('decision')=='cancel' else 'completed')
                continue
            method=v['method'];p=v.get('params',{}) or {};result={}
            if method=='initialize':result={'userAgent':'fixture','platformFamily':'unix'}
            elif method=='initialized':
                assert 'id' not in v,'initialized must be a notification';initialized=True;continue
            else:
                assert initialized,'handshake missing'
                if method=='thread/start':
                    tid=str(uuid.uuid4());path=root/'sessions'/f'{tid}.jsonl';path.parent.mkdir(exist_ok=True)
                    path.write_text(json.dumps({'type':'session_meta','payload':{'id':tid,'cwd':p['cwd']}})+'\n')
                    state[tid]={'id':tid,'cwd':p['cwd'],'path':str(path),'name':None,'turns':[]};save();result={'thread':state[tid]}
                elif method in ('thread/resume','thread/read'):
                    tid=p['threadId']
                    if tid not in state:
                        path=root/'sessions'/f'{tid}.jsonl';state[tid]={'id':tid,'cwd':str(root.parent),'path':str(path),'name':'Detected chat','turns':[]}
                    result={'thread':state[tid]}
                elif method=='thread/name/set':
                    state[p['threadId']]['name']=p['name'];save()
                    with (root/'session_index.jsonl').open('a') as index:index.write(json.dumps({'id':p['threadId'],'thread_name':p['name']})+'\n')
                elif method=='turn/start':result=start(p)
                elif method=='turn/interrupt':finish(p['threadId'],p['turnId'],'interrupted')
                else:raise ValueError('unsupported fixture method '+method)
            emit({'id':v['id'],'result':result})
    except Exception as e:
        emit({'id':v.get('id'),'error':{'code':-32602,'message':str(e)}})
