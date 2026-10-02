import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'My Research Diary',description:'날짜별 계획과 실제 활동을 기록하는 개인 연구 다이어리',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>;}
