// Usage: node meta.mjs <claude|copilot> <outdir> <arm> <pluginDir>
// Reads transcript.jsonl and writes final.md (the agent's last message) and meta.json.
import fs from 'node:fs'; import path from 'node:path';
const [agent, out, arm, pd] = process.argv.slice(2);
const lines = fs.readFileSync(path.join(out, 'transcript.jsonl'), 'utf8').trim().split('\n')
  .map((l) => { try { return JSON.parse(l); } catch { return {}; } });
const skillName = (() => { try { return fs.readdirSync(path.join(pd, 'skills'))[0]; } catch { return ''; } })();
let meta, final;

if (agent === 'claude') {
  const res = lines.find((x) => x.type === 'result') || {}, init = lines.find((x) => x.subtype === 'init') || {};
  final = res.result || '';
  meta = {
    model: init.model, cli: `claude-code ${init.claude_code_version}`, cost: res.total_cost_usd, turns: res.num_turns, error: !!res.is_error,
    skillInvoked: lines.some((x) => x.type === 'assistant' && (x.message?.content || []).some((b) => b.type === 'tool_use' && b.name === 'Skill')),
  };
} else {
  // Copilot CLI --output-format json: one event per line. Field names vary by version, so match loosely.
  const text = (x) => x?.data?.content ?? x?.content ?? x?.message?.content ?? '';
  const assistant = lines.filter((x) => /assistant/.test(x.type || x.event || '') && typeof text(x) === 'string' && text(x).trim());
  final = assistant.length ? text(assistant[assistant.length - 1]) : '';
  const raw = JSON.stringify(lines);
  const err = lines.find((x) => /error/i.test(x.type || x.event || ''));
  meta = {
    model: lines.find((x) => x?.data?.model || x.model)?.data?.model || lines.find((x) => x.model)?.model || null,
    cli: 'copilot', error: !!err || !final,
    skillInvoked: !!skillName && /"(name|toolName|tool)":"skill"/i.test(raw) && raw.includes(skillName),
  };
}
if (arm === 'with') { try { meta.pluginVersion = JSON.parse(fs.readFileSync(path.join(pd, 'plugin.json'), 'utf8')).version; } catch {} }
fs.writeFileSync(path.join(out, 'final.md'), final);
fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify(meta, null, 1));
