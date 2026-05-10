#!/usr/bin/env python3
import argparse, json, os, sys, urllib.request
from fnmatch import fnmatch

PROTECTED=[
'.github/workflows/**','terraform/**','contracts/**','supabase/migrations/**','hardhat.config.cts',
'orchestrator/workflows/**','orchestrator/activities/**','orchestrator/security/**','src/security/**','src/zero-trust/**','src/guardian/**'
]
MODERATE=['supabase/functions/platform-health/**','supabase/functions/ops-voice-health/**','supabase/functions/test-integration/**']

def is_match(path,pat):
    return fnmatch(path, pat.replace('**','*')) or fnmatch(path, pat)

def classify(path):
    if any(is_match(path,p) for p in PROTECTED): return 'critical'
    if path.startswith('supabase/functions/') and not any(is_match(path,p) for p in MODERATE): return 'critical'
    return 'normal'

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--dry-run',action='store_true')
    ap.add_argument('--evidence',default='')
    args=ap.parse_args()

    result={"summary":"RSI model gateway offline evaluation","risk":"low","abort":False,
            "changed_paths":[],"protected_path_hits":[],"proposed_tests":[],"proposed_edits":[],"rationale":"dry-run default"}

    if args.evidence:
        data=json.loads(open(args.evidence,'r',encoding='utf-8').read())
        required=['changed_paths','git diff','inventory summary','policy path class','test plan']
        missing=[k for k in required if k not in data]
        if missing:
            print(json.dumps({**result,"abort":True,"risk":"high","rationale":f"missing evidence keys: {missing}"}))
            return 1
        if any(k in data for k in ['repo_dump','source_tree','raw_repo']):
            print(json.dumps({**result,"abort":True,"risk":"high","rationale":"raw repo dump rejected"}))
            return 1
        result['changed_paths']=data['changed_paths']
        result['proposed_tests']=data.get('test plan',[])
        result['proposed_edits']=data.get('proposed_edits',[])

    hits=[p for p in result['proposed_edits'] if classify(p)=='critical']
    result['protected_path_hits']=hits
    if hits:
        result['abort']=True; result['risk']='critical'; result['rationale']='proposed_edits include critical/protected paths'
        print(json.dumps(result)); return 2

    use_hosted=(os.getenv('RSI_ENABLE_HOSTED_MODEL','').lower()=='true' or bool(os.getenv('RSI_MODEL_BASE_URL')))
    if not args.dry_run and use_hosted:
        url=os.getenv('RSI_MODEL_BASE_URL','').rstrip('/')+'/v1/chat/completions'
        payload={"model":os.getenv('RSI_MODEL_NAME','local-model'),"messages":[{"role":"user","content":"Evaluate RSI evidence bundle."}],"temperature":0}
        req=urllib.request.Request(url,data=json.dumps(payload).encode(),headers={"Content-Type":"application/json","Authorization":f"Bearer {os.getenv('RSI_MODEL_API_KEY','')}"})
        try:
            with urllib.request.urlopen(req,timeout=20) as r:
                _=json.loads(r.read().decode())
            result['summary']='Hosted model endpoint reachable via OpenAI-compatible contract'
            result['rationale']=f"provider={os.getenv('RSI_MODEL_PROVIDER','unset')}"
        except Exception as e:
            result['abort']=True; result['risk']='high'; result['rationale']=f"model call failed: {e}"
            print(json.dumps(result)); return 3

    print(json.dumps(result))
    return 0

if __name__=='__main__':
    sys.exit(main())
