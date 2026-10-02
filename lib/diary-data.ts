export type Slot = { hour: number; id?: string; start?: string; end?: string; archived?: boolean; plan: string; actual: string; status: 'planned'|'progress'|'done' };
export const noteColors = ['yellow','pink','mint','blue'] as const;
export type NoteColor = typeof noteColors[number];
export type StickyNote = { id: string; text: string; color: NoteColor; deleted?: boolean };
export type Diary = { slots: Slot[]; notes: string; notesColor?: NoteColor; notesArchived?: boolean; stickyNotes?: StickyNote[]; summary: string; improvement: string; next: string };
export function emptyDay(): Diary { return {slots:Array.from({length:13},(_,i)=>({hour:i+9,plan:'',actual:'',status:'planned'})),notes:'',summary:'',improvement:'',next:''}; }
// Every new date starts empty. Never include real schedules or activity history here.
export function initialDay(date:string):Diary { void date; return emptyDay(); }
export function validDate(s:unknown):s is string {if(typeof s!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(s))return false; const d=new Date(s+'T00:00:00Z');return !isNaN(d.getTime())&&d.toISOString().slice(0,10)===s;}
export function slotId(s:Slot){return s.id||'legacy-'+s.hour;}
export function slotStart(s:Slot){return s.start??String(s.hour).padStart(2,'0')+':00';}
export function slotEnd(s:Slot){return s.end??String(s.hour+1).padStart(2,'0')+':00';}
export function validTime(t:unknown):t is string{return typeof t==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t);}
export function minutes(t:string){const [h,m]=t.split(':').map(Number);return h*60+m;}
export function validSlotTime(s:Slot){return validTime(slotStart(s))&&validTime(slotEnd(s))&&minutes(slotStart(s))<minutes(slotEnd(s));}
export function validDiary(x:unknown):x is Diary {
 if(!x||typeof x!=='object')return false; const d=x as Diary;
 return (d.notesArchived===undefined||typeof d.notesArchived==='boolean')&&(d.notesColor===undefined||noteColors.includes(d.notesColor))&&(d.stickyNotes===undefined||(Array.isArray(d.stickyNotes)&&d.stickyNotes.length<=20&&new Set(d.stickyNotes.map(n=>n?.id)).size===d.stickyNotes.length&&d.stickyNotes.every(n=>n&&(n.deleted===undefined||typeof n.deleted==='boolean')&&typeof n.id==='string'&&n.id.length>0&&n.id.length<=80&&typeof n.text==='string'&&n.text.length<=2000&&noteColors.includes(n.color))))&&Array.isArray(d.slots)&&d.slots.length<=48&&new Set(d.slots.map(s=>s&&slotId(s))).size===d.slots.length&&d.slots.every(s=>s&&Number.isInteger(s.hour)&&s.hour>=0&&s.hour<=10000&&(s.id===undefined||(typeof s.id==='string'&&s.id.length>0&&s.id.length<=80))&&(s.archived===undefined||typeof s.archived==='boolean')&&validSlotTime(s)&&['planned','progress','done'].includes(s.status)&&typeof s.plan==='string'&&s.plan.length<=2000&&typeof s.actual==='string'&&s.actual.length<=4000)&&['notes','summary','improvement','next'].every(k=>typeof (d as any)[k]==='string'&&(d as any)[k].length<=12000);
}
