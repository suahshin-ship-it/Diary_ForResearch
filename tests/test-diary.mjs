import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
// Dates and activity text in this suite are invented test fixtures.
const testDir=fs.mkdtempSync(path.join(os.tmpdir(),'research-diary-test-'));
const routeModule=path.join(testDir,'route.mjs');
const mcpModule=path.join(testDir,'mcp.mjs');
const dbPath=path.join(testDir,'diary.sqlite');
let sqlite=new DatabaseSync(dbPath);sqlite.exec(fs.readFileSync('drizzle/0000_familiar_chameleon.sql','utf8'));
globalThis.__testUser={userId:'test-owner',email:'test@example.invalid'};
globalThis.__testDB = {
 prepare(sql) {
  let args=[];
  return {
   bind(...a){args=a;return this;},
   async first(){return sqlite.prepare(sql).get(...args)||null;},
   async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};}
  };
 }
};
await build({entryPoints:['app/api/diary/route.ts'],outfile:routeModule,platform:'node',format:'esm',bundle:true,plugins:[{name:'test-dependencies',setup(b){b.onResolve({filter:/^@\/app\/chatgpt-auth$/},()=>({path:'auth',namespace:'mock'}));b.onResolve({filter:/^@\/lib\/diary-store$/},()=>({path:'db',namespace:'mock'}));b.onResolve({filter:/^@\/lib\/diary-data$/},()=>({path:process.cwd()+'/lib/diary-data.ts'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='auth'?'export async function getChatGPTUser(){return globalThis.__testUser}':'export function diaryDB(){return globalThis.__testDB}',loader:'js'}))}}]});
await build({entryPoints:['app/mcp/route.ts'],outfile:mcpModule,platform:'node',format:'esm',bundle:true,plugins:[{name:'test-dependencies',setup(b){b.onResolve({filter:/^@\/app\/chatgpt-auth$/},()=>({path:'auth',namespace:'mock'}));b.onResolve({filter:/^@\/lib\/diary-store$/},()=>({path:'db',namespace:'mock'}));b.onResolve({filter:/^@\/lib\/diary-data$/},()=>({path:process.cwd()+'/lib/diary-data.ts'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='auth'?'export async function getChatGPTUser(){return globalThis.__testUser}':'export function diaryDB(){return globalThis.__testDB}',loader:'js'}))}}]});
const {GET,POST}=await import(pathToFileURL(routeModule).href);const get=d=>GET(new Request('https://diary.test/api/diary?date='+d));const post=(x,origin='https://diary.test')=>POST(new Request('https://diary.test/api/diary',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(x)}));
let x=await(await get('2040-01-15')).json();assert.equal(x.revision,0);assert.equal(x.diary.slots.length,13);assert.ok(x.diary.slots.every(s=>s.plan===''&&s.actual===''));assert.equal(x.diary.notes,'');assert.equal(x.diary.next,'');
x.diary.slots[6].plan='합성 테스트 작업';
x.diary.slots[0].actual='테스트 작업을 마침';x.diary.slots[0].status='done';x.diary.summary='테스트 요약';assert.equal((await post({date:x.date,diary:x.diary,revision:0})).status,200);
sqlite.close();sqlite=new DatabaseSync(dbPath);let saved=await(await get(x.date)).json();assert.equal(saved.diary.slots[0].actual,'테스트 작업을 마침');assert.equal(saved.revision,1);
assert.equal((await post({date:x.date,diary:x.diary,revision:0})).status,409);
assert.equal((await post({date:x.date,diary:x.diary,revision:1},'https://evil.test')).status,403);
assert.equal((await get('2040-02-30')).status,400);
const blank=await(await get('2040-01-16')).json();assert.ok(blank.diary.slots.every(s=>!s.plan&&!s.actual));
// A legacy row remains intact; adding cards must not replace its notes or plans.
const legacyText='첫 번째 기록\n  원문 공백 유지\n';
saved.diary.notes=legacyText;
assert.equal((await post({date:x.date,diary:saved.diary,revision:1})).status,200);
let legacy=await(await get(x.date)).json();assert.equal(legacy.diary.notes,legacyText);assert.equal(legacy.diary.stickyNotes,undefined);
legacy.diary.notesColor='mint';legacy.diary.stickyNotes=[{id:'note-1',text:'테스트 메모 첫 줄\n두 번째 줄',color:'pink'},{id:'note-2',text:'합성 메모',color:'blue'}];
assert.equal((await post({date:x.date,diary:legacy.diary,revision:2})).status,200);
sqlite.close();sqlite=new DatabaseSync(dbPath);
const cards=await(await get(x.date)).json();assert.equal(cards.diary.notes,legacyText);assert.deepEqual(cards.diary.stickyNotes,legacy.diary.stickyNotes);assert.equal(cards.diary.notesColor,'mint');assert.equal(cards.diary.slots[0].actual,'테스트 작업을 마침');
assert.equal((await post({date:x.date,diary:legacy.diary,revision:2})).status,409);
for(const stickyNotes of [null,[{id:'a',text:'ok',color:'invalid'}],[{id:'',text:'ok',color:'pink'}],[{id:'a',text:1,color:'pink'}],[{id:'a',text:'x'.repeat(2001),color:'pink'}],[{id:'a',text:'ok',color:'pink'},{id:'a',text:'duplicate',color:'blue'}],Array.from({length:21},(_,i)=>({id:String(i),text:'',color:'mint'}))]){
 assert.equal((await post({date:x.date,diary:{...cards.diary,stickyNotes},revision:3})).status,400);
}
assert.equal((await post({date:x.date,diary:{...cards.diary,notesColor:'unknown'},revision:3})).status,400);
const anotherBlank=await(await get('2040-01-14')).json();assert.equal(anotherBlank.diary.notes,'');assert.ok(anotherBlank.diary.slots.every(s=>s.plan===''&&s.actual===''));
const {POST:mcp}=await import(pathToFileURL(mcpModule).href);
const call=async(name,args)=>{const r=await mcp(new Request('https://diary.test/mcp',{method:'POST',body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})}));return {status:r.status,body:await r.json()};};
const beforePlan=await(await get(x.date)).json();
const changed=await call('update_diary_plans',{date:x.date,revision:beforePlan.revision,plans:[{hour:10,plan:'계획 갱신 테스트'}]});assert.equal(changed.body.result.isError,false);
const afterPlan=await(await get(x.date)).json();const expected=structuredClone(beforePlan.diary);expected.slots[1].plan='계획 갱신 테스트';assert.deepEqual(afterPlan.diary,expected);
assert.equal((await call('update_diary_plans',{date:x.date,revision:beforePlan.revision,plans:[{hour:10,plan:'stale'}]})).body.result.isError,true);
assert.equal((await call('update_diary_plans',{date:x.date,revision:afterPlan.revision,plans:[{hour:22,plan:'invalid'}]})).body.result.isError,true);
assert.equal(JSON.parse((await call('read_diary_day',{date:x.date})).body.result.content[0].text).revision,afterPlan.revision);
// Deletions stay recoverable after reopening and never erase note text.
const archived=structuredClone(afterPlan.diary);archived.notesArchived=true;archived.stickyNotes[0].deleted=true;
assert.equal((await post({date:x.date,diary:archived,revision:afterPlan.revision})).status,200);
sqlite.close();sqlite=new DatabaseSync(dbPath);
const deletedDay=await(await get(x.date)).json();assert.equal(deletedDay.diary.notesArchived,true);assert.equal(deletedDay.diary.notes,legacyText);assert.equal(deletedDay.diary.stickyNotes[0].deleted,true);assert.equal(deletedDay.diary.stickyNotes[0].text,archived.stickyNotes[0].text);
deletedDay.diary.notesArchived=false;deletedDay.diary.stickyNotes[0].deleted=false;
assert.equal((await post({date:x.date,diary:deletedDay.diary,revision:deletedDay.revision})).status,200);
const restored=await(await get(x.date)).json();assert.equal(restored.diary.notesArchived,false);assert.equal(restored.diary.stickyNotes[0].deleted,false);
assert.equal((await post({date:x.date,diary:{...restored.diary,notesArchived:'yes'},revision:restored.revision})).status,400);
// Flexible rows preserve identity and payload through time edits, archival and plan updates.
const flex=structuredClone(restored.diary);flex.slots[0].start='09:00';flex.slots[0].end='11:00';flex.slots[1].archived=true;flex.slots.push({id:'afternoon-block',hour:22,start:'12:00',end:'14:00',plan:'두 시간 테스트 작업',actual:'활동 원문',status:'progress'});
assert.equal((await post({date:x.date,diary:flex,revision:restored.revision})).status,200);
const flexSaved=await(await get(x.date)).json();assert.deepEqual(flexSaved.diary,flex);
const planFlex=await call('update_diary_plans',{date:x.date,revision:flexSaved.revision,plans:[{slotId:'afternoon-block',plan:'수정한 테스트 계획'}]});assert.equal(planFlex.body.result.isError,false);
const flexAfter=await(await get(x.date)).json();assert.equal(flexAfter.diary.slots.at(-1).end,'14:00');assert.equal(flexAfter.diary.slots.at(-1).actual,'활동 원문');assert.equal(flexAfter.diary.slots[1].archived,true);
assert.equal((await call('update_diary_plans',{date:x.date,revision:flexAfter.revision,plans:[{hour:12,plan:'ambiguous'}]})).body.result.isError,true);
for(const patch of [{start:'15:00',end:'14:00'},{start:'25:00',end:'26:00'},{start:'12:xx'},{id:'legacy-9'}]){const bad=structuredClone(flexAfter.diary);Object.assign(bad.slots.at(-1),patch);assert.equal((await post({date:x.date,diary:bad,revision:flexAfter.revision})).status,400);}
globalThis.__testUser={userId:'different-user',email:'other@example.invalid'};assert.equal((await(await get(x.date)).json()).revision,0);
globalThis.__testUser=null;assert.equal((await call('read_diary_day',{date:x.date})).status,401);assert.equal((await get(x.date)).status,401);
sqlite.close();fs.rmSync(testDir,{recursive:true,force:true});console.log('PASS: draft, persisted save/reopen, revision conflict, origin protection, date validation, blank day, user isolation, auth rejection, legacy note preservation, sticky-note save/reopen/colors, invalid card rejection, MCP plan-only preservation, MCP conflicts and authentication, delete/reopen/restore, flexible ranges/IDs, preserved content and ambiguous-target rejection.');
