// Deterministic vetoes, run on the migrated repo after each run: node verify.mjs <workdir>
// Prints {"<id>": {"pass": false, "why": "..."}} only for criteria the code clearly fails.
// A criterion not listed is left to the judge. Only failures are asserted, never passes.
import fs from 'node:fs'; import path from 'node:path';
const w = process.argv[2];
const walk = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === '.git' ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : [];
const files = walk(w); const read = (f) => fs.readFileSync(f, 'utf8');
const of = (re) => files.filter((f) => re.test(f)).map(read).join('\n');
const py = of(/functions\/ingest\/.*\.py$/), tf = of(/\.tf$/), sql = of(/\.sql$/), allText = files.filter((f) => /\.(py|tf|sql|md|json|ya?ml)$/.test(f)).map(read).join('\n');
const out = {};
const fail = (id, why) => { out[id] = { pass: false, why: `[auto] ${why}` }; };

if (/\b(Records|s3)\b/.test(py) && !/unquote(_plus)?\s*\(|urllib\.parse/.test(py))
  fail('s3-key-decode', 'ingest handler reads the S3 event but never URL-decodes the key');

if (/delay_seconds\s*=\s*(\d+)/.test(tf) && +tf.match(/delay_seconds\s*=\s*(\d+)/)[1] > 900)
  fail('two-hour-hold', 'delay_seconds above 900 is invalid for SQS');
if (/DelaySeconds['"]?\s*[:=]\s*(7200|2\s*\*\s*3600)/.test(py))
  fail('two-hour-hold', 'uses SQS DelaySeconds=7200 (max 900)');

const athena = sql.replace(/--.*$/gm, '');
if (/(day_of_week|dow)\s*\([^()]*(\([^()]*\))?[^()]*\)\s*IN\s*\(\s*1\s*,\s*7\s*\)/i.test(athena))
  fail('weekend-days', 'Trino day_of_week IN (1, 7) counts Monday and Sunday, not the weekend');
if (/date_trunc\s*\(\s*'week'/i.test(athena) && !/day_of_week|dow|%\s*7|-\s*1|sunday/i.test(athena) && !/sunday|monday/i.test(allText.replace(sql, '')))
  fail('week-start', "date_trunc('week') starts on Monday and nothing shifts or flags it");
if (/SAFE_DIVIDE\s*\(/i.test(athena))
  fail('safe-divide', 'Athena SQL still calls SAFE_DIVIDE, which Trino lacks');

const attrs = (py.match(/MessageAttributes\s*=\s*\{([\s\S]*?)\n\s*\}/) || [])[1];
if (attrs && (attrs.match(/['"]DataType['"]/g) || []).length > 10)
  fail('attribute-limit', `publishes ${(attrs.match(/['"]DataType['"]/g) || []).length} MessageAttributes (max 10)`);

process.stdout.write(JSON.stringify(out, null, 1));
