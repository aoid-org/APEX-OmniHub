import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonlPath = path.resolve(__dirname, '../tests/fixtures/prompt_injections.jsonl');

const content = fs.readFileSync(jsonlPath, 'utf-8');
const lines = content.trim().split('\n').map(line => {
    try {
        const parsed = JSON.parse(line);
        if (parsed.is_injection === true) {
            parsed.expected = 'block';
            delete parsed.is_injection;
        } else if (parsed.is_injection === false) {
            parsed.expected = 'allow';
            delete parsed.is_injection;
        }
        return JSON.stringify(parsed);
    } catch (e) {
        return line;
    }
});

fs.writeFileSync(jsonlPath, lines.join('\n') + '\n');
console.log('Fixed JSONL fixture');
