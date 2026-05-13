with open("integration-harness/helpers/ws-client.ts", "r") as f:
    content = f.read()

old_code = """        const msgStr = Buffer.isBuffer(msg)
          ? msg.toString()
          : Array.isArray(msg)
            ? Buffer.concat(msg).toString()
            : Buffer.from(msg as ArrayBuffer).toString();"""

# Let's simplify and make it pass SonarQube.
# "ws" library Data type can be String, Buffer, ArrayBuffer, Buffer[].
new_code = """        const msgStr = Buffer.isBuffer(msg) ? msg.toString() :
                       Array.isArray(msg) ? Buffer.concat(msg).toString() :
                       msg instanceof ArrayBuffer ? Buffer.from(msg).toString() :
                       String(msg);"""

if old_code in content:
    with open("integration-harness/helpers/ws-client.ts", "w") as f:
        f.write(content.replace(old_code, new_code))
    print("Patched")
else:
    print("Not found")
