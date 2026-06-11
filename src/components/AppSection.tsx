'use client'
import{useEffect,useRef}from 'react'
import{useTranslations}from 'next-intl'
const IMGS=['/images/gbenga-onalaja-bZC_VAVhoQE-unsplash.jpg','/images/paul-macallan-CFKksjYRSQ8-unsplash.jpg','/images/ed-wingate-ZMIdqdsbP2U-unsplash-min.jpg','/images/redcharlie-nf7W_hn6DKQ-unsplash-min.jpg','/images/priscilla-du-preez-W3SEyZODn8U-unsplash-min.jpg','/images/gilles-de-muynck-PtJDCD4fTI4-unsplash.jpg','/images/chaz-mcgregor-THXYw7ysYus-unsplash.jpg','/images/bas-van-den-eijkhof-w_O7qjB9ZVY-unsplash.jpg','/images/aliunix-NI265AcvQZs-unsplash-1.jpg','/images/ton-toan-dxwt8veyBzQ-unsplash.jpg','/images/konrad-bachusz--tpKv0goE94-unsplash.jpg','/images/haven-xie-IoTTc6Z5lTM-unsplash.jpg','/images/mike-swigunski-H9mQC5pNzP0-unsplash.jpg','/images/marek-okon-v2nO45qoGU0-unsplash.jpg','/images/bruno-ngarukiye-2qCs8eel2qI-unsplash.jpg','/images/bruno-ngarukiye-P7K8gBPNMUc-unsplash.jpg','/images/thomas-ashlock-RAjND0B3HDw-unsplash.jpg','/images/manuel-moreno-DGa0LQ0yDPc-unsplash.jpg','/images/tobias-tullius-XZOO6QHub60-unsplash.jpg','/images/upgraded-points-uu5Z7cx2PdA-unsplash.jpg']
export default function AppSection(){
const t=useTranslations('app')
const ringRef=useRef<HTMLDivElement>(null)
useEffect(()=>{
if(!ringRef.current)return
const ring=ringRef.current
const vw=window.innerWidth,vh=window.innerHeight
const radius=Math.min(vw*0.44,vh*0.44,520)
const imgSize=Math.round(radius*0.26)
Array.from(ring.querySelectorAll<HTMLElement>('.ci')).forEach((item,i)=>{
const a=((i/IMGS.length)*360-90)*Math.PI/180
item.style.width=imgSize+'px';item.style.height=imgSize+'px'
item.style.left=`calc(50% + ${Math.cos(a)*radius}px - ${imgSize/2}px)`
item.style.top=`calc(50% + ${Math.sin(a)*radius}px - ${imgSize/2}px)`
item.style.position='absolute'
})
const style=document.createElement('style')
style.textContent=`
@keyframes ringRotate{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes imgUpright{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}
.ring-active{animation:ringRotate 55s linear infinite}
.ci{animation:imgUpright 55s linear infinite}
`
document.head.appendChild(style)
setTimeout(()=>ring.classList.add('ring-active'),100)
return()=>{style.remove();ring.classList.remove('ring-active')}
},[])
return(<section id="signal" style={{background:'transparent',height:'120vh',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'}}>
<div ref={ringRef} style={{position:'absolute',inset:0,pointerEvents:'none'}}>
{IMGS.map((src,i)=>(<div key={i} className="ci" style={{borderRadius:'0.75rem',overflow:'hidden',boxShadow:'0 0.25rem 1.5rem rgba(42,33,25,0.2)'}}><img src={src} alt="" loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/></div>))}
</div>
<div style={{position:'relative',zIndex:2,textAlign:'center',maxWidth:'28rem',padding:'2rem 2.5rem',borderRadius:'1rem',background:'rgba(235,232,219,0.88)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)'}}>
<p style={{fontFamily:'var(--font-mono)',fontSize:'0.6875rem',letterSpacing:'0.18em',textTransform:'uppercase',color:'rgba(42,33,25,0.6)',marginBottom:'1rem'}}>{t('stepInside')}</p>
<h2 style={{fontFamily:'var(--font-serif)',fontSize:'clamp(2rem,5vw,3.5rem)',fontWeight:400,letterSpacing:'-0.1rem',lineHeight:1.1,color:'var(--color-dark)',marginBottom:'2rem'}}>{t('heading')}</h2>
<a href="https://form.typeform.com/to/xo1Bskym" target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:'0.75rem',padding:'0.875rem 2rem',background:'var(--color-dark)',color:'#ebe8db',textDecoration:'none',borderRadius:'0.25rem',fontFamily:'var(--font-mono)',fontSize:'0.75rem',letterSpacing:'0.12em',textTransform:'uppercase'}}>
{t('cta')}<svg width="18" height="18" viewBox="0 0 26 26" fill="none"><path d="M1.33594 12.9987H23.0026M13.0026 1.33203L24.6693 12.9987L13.0026 24.6654" stroke="#ebe8db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
</a>
</div>
</section>)}