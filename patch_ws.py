with open("integration-harness/helpers/ws-client.ts", "r") as f:
    content = f.read()

old_code = """    ws.on('message', (msg) => {
      try {
        const evt: JsonValue = JSON.parse(msg.toString()) as JsonValue;
        if (pred(evt)) { clearTimeout(timer); ws.close(); resolve(evt); }
      } catch { /* ignore non-json */ }
    });"""

new_code = """    ws.on('message', (msg) => {
      try {
        const msgStr = Buffer.isBuffer(msg)
          ? msg.toString()
          : Array.isArray(msg)
            ? Buffer.concat(msg).toString()
            : Buffer.from(msg as ArrayBuffer).toString();
        const evt: JsonValue = JSON.parse(msgStr) as JsonValue;
        if (pred(evt)) { clearTimeout(timer); ws.close(); resolve(evt); }
      } catch { /* ignore non-json */ }
    });"""

if old_code in content:
    with open("integration-harness/helpers/ws-client.ts", "w") as f:
        f.write(content.replace(old_code, new_code))
    print("Patched ws-client.ts")
else:
    print("Could not find old code")
