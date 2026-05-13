with open("integration-harness/helpers/ws-client.ts", "r") as f:
    content = f.read()

old_code = """    ws.on('message', (msg) => {
      try {
        const msgStr = Buffer.isBuffer(msg) ? msg.toString() :
                       Array.isArray(msg) ? Buffer.concat(msg).toString() :
                       msg instanceof ArrayBuffer ? Buffer.from(msg).toString() :
                       String(msg);
        const evt: JsonValue = JSON.parse(msgStr) as JsonValue;"""

new_code = """    ws.on('message', (msg: any) => {
      try {
        let msgStr = '';
        if (typeof msg === 'string') {
          msgStr = msg;
        } else if (Buffer.isBuffer(msg)) {
          msgStr = msg.toString('utf8');
        } else if (Array.isArray(msg)) {
          msgStr = Buffer.concat(msg).toString('utf8');
        } else if (msg instanceof ArrayBuffer) {
          msgStr = Buffer.from(msg).toString('utf8');
        } else {
          throw new Error('Unsupported message type');
        }
        const evt: JsonValue = JSON.parse(msgStr) as JsonValue;"""

if old_code in content:
    with open("integration-harness/helpers/ws-client.ts", "w") as f:
        f.write(content.replace(old_code, new_code))
    print("Patched")
else:
    print("Not found")
