'use client'
import{useState,useEffect}from 'react'
export default function LanguageToggle({light=false}:{light?:boolean}){
const[locale,setLocale]=useState('fr')
useEffect(()=>{const m=document.cookie.match(/(?:^|;\s*)locale=([^;]+)/);setLocale(m?m[1]:'fr')},[])
const toggle=(lang:string)=>{document.cookie=`locale=${lang};path=/;max-age=${60*60*24*365}`;setLocale(lang);window.location.reload()}
const tc=light?'#2a2119':'#dfc9a6',ab=light?'rgba(42,33,25,0.12)':'rgba(190,154,86,0.18)',ac=light?'#2a2119':'#be9a56'
return(<div style={{display:'flex',alignItems:'center',gap:'0.125rem',background:light?'rgba(42,33,25,0.07)':'rgba(255,255,255,0.06)',borderRadius:'0.25rem',padding:'0.125rem',flexShrink:0}}>
{(['fr','en']as const).map(lang=>(<button key={lang} onClick={()=>toggle(lang)} style={{background:locale===lang?ab:'transparent',border:'none',color:locale===lang?ac:tc+'80',fontFamily:'var(--font-mono)',fontSize:'0.6875rem',letterSpacing:'0.08em',textTransform:'uppercase',padding:'0.3125rem 0.5rem',borderRadius:'0.1875rem',cursor:'pointer',transition:'all 0.2s',fontWeight:locale===lang?600:400}}>{lang.toUpperCase()}</button>))}
</div>)}