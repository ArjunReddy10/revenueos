'use client';
import dynamic from 'next/dynamic';
const Galaxy=dynamic(()=>import('./galaxy'),{ssr:false,loading:()=> <div className="sub" style={{height:260,display:'grid',placeItems:'center'}}>Loading revenue galaxy…</div>});
export function GalaxyPanel(){return <Galaxy/>}
