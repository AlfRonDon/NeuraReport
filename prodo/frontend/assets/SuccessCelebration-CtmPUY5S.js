import{r as s,j as o,B as n,k as l,K as c}from"./index-B8Eu23bA.js";const u=c`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
`;function x({trigger:a,onComplete:e}){const[r,t]=s.useState(!1);return s.useEffect(()=>{if(!a){t(!1);return}t(!0);const i=setTimeout(()=>{t(!1),e?.()},1500);return()=>clearTimeout(i)},[a,e]),r?o.jsx(n,{sx:{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%, -50%)",width:80,height:80,borderRadius:"50%",bgcolor:l[1200],display:"flex",alignItems:"center",justifyContent:"center",animation:`${u} 1.5s ease-out forwards`,zIndex:9999,pointerEvents:"none",boxShadow:"0 0 40px rgba(33, 32, 28, 0.4)"},children:o.jsx(n,{component:"svg",viewBox:"0 0 24 24",sx:{width:40,height:40,color:"white"},children:o.jsx("path",{fill:"currentColor",d:"M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"})})}):null}function m(){const[a,e]=s.useState(!1),r=s.useCallback(()=>{e(!0)},[]),t=s.useCallback(()=>{e(!1)},[]);return{celebrating:a,celebrate:r,onComplete:t}}export{x as S,m as u};
