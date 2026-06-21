#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(__dirname, '../src/i18n/locales');
const CANONICAL = 'en-US.json';
const EXPECTED = ['en-US.json', 'fr-FR.json', 'es-ES.json', 'de-DE.json', 'ja-JP.json', 'zh-CN.json', 'pt-BR.json'];
const SAME_AS_ENGLISH_ALLOWLIST = new Set([
  'hero.headline.line2','capabilities.items.1.title','capabilities.items.2.title','capabilities.items.3.title','capabilities.items.6.title','capabilities.items.7.title','maestro.headline.line1','reversible.policyRules.3.name','layout.footer.copyright'
]);

function compare(a,b){return a < b ? -1 : a > b ? 1 : 0;}
function readJson(file){return JSON.parse(readFileSync(join(LOCALES_DIR,file),'utf8'));}
function typeOf(v){return Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;}
function flatten(value, prefix='', out=new Map()){
  out.set(prefix || '$', { type:typeOf(value), value });
  if(Array.isArray(value)) value.forEach((v,i)=>flatten(v, prefix ? `${prefix}.${i}` : String(i), out));
  else if(value && typeof value==='object') Object.keys(value).sort(compare).forEach(k=>flatten(value[k], prefix ? `${prefix}.${k}` : k, out));
  return out;
}
function isRawKeyLike(s){return /^[a-z][a-z0-9]*(\.[a-z0-9]+){1,}$/i.test(s.trim());}

let failed=false;
const present = new Set(readdirSync(LOCALES_DIR).filter((file)=>file.endsWith('.json')));
for(const file of EXPECTED){ if(!present.has(file)){ console.error(`Missing locale file: ${file}`); failed=true; }}
if(failed) process.exit(1);

const en = readJson(CANONICAL);
const enFlat = flatten(en);
const enKeys = [...enFlat.keys()].sort(compare);
console.log(`Canonical ${CANONICAL}: ${enKeys.length} paths`);

for(const file of EXPECTED.filter(f=>f!==CANONICAL)){
  const locale = readJson(file);
  const flat = flatten(locale);
  const report={missing:[],extra:[],type:[],blank:[],raw:[],same:[]};
  for(const key of enKeys){
    if(!flat.has(key)){ report.missing.push(key); continue; }
    const expected=enFlat.get(key); const actual=flat.get(key);
    if(expected.type!==actual.type) report.type.push(`${key} (${actual.type} !== ${expected.type})`);
    if(actual.type==='string'){
      const value=actual.value.trim();
      if(value.length===0) report.blank.push(key);
      if(isRawKeyLike(value)) report.raw.push(key);
      if(expected.value===actual.value && !SAME_AS_ENGLISH_ALLOWLIST.has(key)) report.same.push(key);
    }
  }
  for(const key of [...flat.keys()].sort(compare)) if(!enFlat.has(key)) report.extra.push(key);
  const sameLimit = Math.max(8, Math.floor(enKeys.filter(k=>enFlat.get(k)?.type==='string').length * 0.08));
  const sameFail = report.same.length > sameLimit;
  const bad = report.missing.length||report.extra.length||report.type.length||report.blank.length||report.raw.length||sameFail;
  console.log(`\n${file}: missing=${report.missing.length} extra=${report.extra.length} typeMismatch=${report.type.length} blank=${report.blank.length} rawKey=${report.raw.length} sameAsEnglish=${report.same.length}`);
  for(const [name,items] of Object.entries(report)){
    if(items.length) console.log(`  ${name}: ${items.slice(0,10).join(', ')}`);
  }
  if(sameFail) console.log(`  sameAsEnglish limit exceeded (${report.same.length} > ${sameLimit})`);
  if(bad) failed=true;
}
if(failed){ console.error('\ni18n check failed.'); process.exit(1); }
console.log('\ni18n check passed.');
