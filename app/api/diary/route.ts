import { getChatGPTUser } from '@/app/chatgpt-auth';
import { diaryDB } from '@/lib/diary-store';
import { initialDay, validDate, validDiary } from '@/lib/diary-data';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers});
export async function GET(request:Request){
 const user=await getChatGPTUser();if(!user)return reply({error:'로그인이 필요합니다.'},401);
 const date=new URL(request.url).searchParams.get('date');if(!validDate(date))return reply({error:'날짜를 확인해주세요.'},400);
 try{const row=await diaryDB().prepare('SELECT content, revision, updated_at FROM diary_days WHERE owner = ? AND date = ?').bind(user.userId,date).first<{content:string;revision:number;updated_at:string}>();
 return reply(row?{date,diary:JSON.parse(row.content),revision:row.revision,updatedAt:row.updated_at,saved:true}:{date,diary:initialDay(date),revision:0,updatedAt:null,saved:false});
 }catch(e){console.error('diary_read_failed',e);return reply({error:'기록을 불러오지 못했어요. 다시 불러오기를 눌러주세요.'},503);}
}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return reply({error:'로그인이 필요합니다.'},401);
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'이 사이트에서 저장해주세요.'},403);
 if(!request.headers.get('content-type')?.includes('application/json'))return reply({error:'잘못된 요청입니다.'},415);
 const raw=await request.text();if(raw.length>450000)return reply({error:'기록이 너무 길어요.'},413);
 let body:any;try{body=JSON.parse(raw);}catch{return reply({error:'잘못된 요청입니다.'},400);}
 if(!validDate(body.date)||!validDiary(body.diary)||!Number.isInteger(body.revision)||body.revision<0)return reply({error:'날짜와 기록 형식을 확인해주세요.'},400);
 try{const db=diaryDB();const content=JSON.stringify(body.diary);const now=new Date().toISOString();
 const result=body.revision===0 ? await db.prepare('INSERT INTO diary_days (owner, date, content, revision, updated_at) VALUES (?, ?, ?, 1, ?) ON CONFLICT(owner, date) DO NOTHING').bind(user.userId,body.date,content,now).run() : await db.prepare('UPDATE diary_days SET content = ?, revision = revision + 1, updated_at = ? WHERE owner = ? AND date = ? AND revision = ?').bind(content,now,user.userId,body.date,body.revision).run();
 if(result.meta.changes!==1)return reply({error:'다른 화면에서 기록이 바뀌었어요. 입력한 내용을 복사해두고 다시 불러온 뒤 반영해주세요.'},409);
 return reply({saved:true,revision:body.revision+1,updatedAt:now});
 }catch(e){console.error('diary_save_failed',e);return reply({error:'저장 결과를 확인하지 못했어요. 입력은 유지됩니다. 다시 불러오기 전에 내용을 복사해주세요.'},503);}
}
