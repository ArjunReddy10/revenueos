import Link from 'next/link'; import { ArrowUpRight } from 'lucide-react';
export function Header({eyebrow,title,children}:{eyebrow:string;title:string;children?:React.ReactNode}){return <header className="topbar"><div><div className="eyebrow">{eyebrow}</div><h1 className="title">{title}</h1></div>{children}</header>}
export function Status({value}:{value:string}){return <span className={`badge ${value.toLowerCase().replaceAll(' ','-')}`}>{value}</span>}
export function Empty({title,body}:{title:string;body:string}){return <div className="card card-pad" style={{textAlign:'center',padding:'48px 20px'}}><b>{title}</b><p className="sub">{body}</p></div>}
export function ViewLink({href,label='View all'}:{href:string;label?:string}){return <Link className="sub" style={{fontWeight:700,fontSize:12,display:'flex',gap:5,alignItems:'center'}} href={href}>{label}<ArrowUpRight size={14}/></Link>}
