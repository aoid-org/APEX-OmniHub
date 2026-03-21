const fs = require('node:fs');
const path = require('node:path');

const targetPaths = [
    path.join(__dirname, '..', 'node_modules', '@capacitor', 'cli', 'dist', 'util', 'template.js')
];

for (const targetPath of targetPaths) {
    if (fs.existsSync(targetPath)) {
        let content = fs.readFileSync(targetPath, 'utf8');
        if (content.includes('tar_1.default.extract(')) {
            content = content.replaceAll('tar_1.default.extract(', '(tar_1.default.x || tar_1.default.extract)(');
            fs.writeFileSync(targetPath, content);
            console.log(`Patched ${targetPath} for tar v7 compatibility.`);
        } else {
            console.log(`No patch needed for ${targetPath}.`);
        }
    } else {
        console.log(`File not found: ${targetPath}`);
    }
}
