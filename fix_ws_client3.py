with open("integration-harness/helpers/ws-client.ts", "r") as f:
    content = f.read()

old_code = """    ws.on('message', (msg: any) => {"""
new_code = """    ws.on('message', (msg: WebSocket.RawData) => {"""

if old_code in content:
    with open("integration-harness/helpers/ws-client.ts", "w") as f:
        f.write(content.replace(old_code, new_code))
    print("Patched")
else:
    print("Not found")
