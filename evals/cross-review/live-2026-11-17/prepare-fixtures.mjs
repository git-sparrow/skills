import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { init, prepare } from '../../../skills/cross-review/scripts/protocol.mjs';
const root=mkdtempSync('/tmp/cross-review-eval-');
console.error('Fixture root: '+root);
const experts=[{id:'sol',model:'gpt-6.1-sol',provider:'OpenAI',harness:'native collaboration'},{id:'astra',model:'gpt-6-astra',provider:'OpenAI',harness:'native collaboration'}];
const cases={
 defect:{base:'export const allowed = (requested, available) => Math.min(requested, available);\n',head:'export const allowed = (requested, available) => Math.max(requested, available);\n',caller:'import { allowed } from "./change.mjs";\nexport const reserve = (stock, requested) => stock - allowed(requested, stock);\n',contract:'For nonnegative integer stock and requested quantities, reserve must never return negative stock and should fulfill as much as available. This change claims to improve reservation behavior. Examine correctness and affected callers. Release is excluded.'},
 clean:{base:'export const label = (name) => `Hello, ${name}`;\n',head:'export const label = (name) => `Hello, ${name.trim()}`;\n',contract:'Names are strings. Trim leading and trailing whitespace in the greeting; preserve internal whitespace and greeting punctuation. No default value or validation requested. Release is excluded.'},
 advisory:{base:'export const double = (values) => values.map(value => value * 2);\n',head:'export const double = (values) => {\n  const r = [];\n  for (const x of values) r.push(x * 2);\n  return r;\n};\n',contract:'Inputs are dense arrays of finite numbers. Return a fresh array of doubled values in order without mutating input. Sparse arrays and custom iterators are out of scope. Repository guidance: descriptive local names are preferred as advisory style guidance, never a behavioral blocking criterion. Release is excluded.'}
};
for(const [name,c] of Object.entries(cases)){
 const repo=`${root}/${name}-repo`,source=`${root}/${name}-source`,run=`${root}/${name}-run`;
 mkdirSync(repo);mkdirSync(source);
 const git=(...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8'}).trim();
 git('init','-q');git('config','user.name','Evaluation Fixture');git('config','user.email','fixture@example.invalid');
 writeFileSync(`${repo}/change.mjs`,c.base);if(c.caller)writeFileSync(`${repo}/caller.mjs`,c.caller);
 git('add','.');git('commit','-qm','base fixture');git('branch','base');
 writeFileSync(`${repo}/change.mjs`,c.head);git('commit','-qam','review fixture');git('branch','review-head');
 writeFileSync(`${source}/contract.md`,c.contract);
 init(run,{repo,source,base:'base',head:'review-head',experts,mode:name==='defect'?'repair':'review',minutes:30,callMinutes:10});
 for(const e of experts)console.log(JSON.stringify(prepare(run,e.id)));
}
