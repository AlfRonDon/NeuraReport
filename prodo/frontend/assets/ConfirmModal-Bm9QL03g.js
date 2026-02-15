import{e as v,j as e,H as T,B as y,aG as z,J as a,ak as R,p as t,al as B,T as h,o as W,k as s,aJ as E,am as Y,ao as P,s as w,as as F,K as l,r as j,S as M,ct as A,bz as H,cy as J}from"./index-B8Eu23bA.js";import{C as O}from"./CheckCircleOutline-BKKyaL-x.js";import{W as X}from"./WarningAmber-DtVJgAFk.js";const G=l`
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;l`
  from { opacity: 0; }
  to { opacity: 1; }
`;l`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;const K=a(R)(({theme:o})=>({"& .MuiBackdrop-root":{backgroundColor:t(o.palette.common.black,.6),backdropFilter:"blur(8px)"}})),N=a(y)(({theme:o})=>({backgroundColor:t(o.palette.background.paper,.95),backdropFilter:"blur(20px)",border:`1px solid ${t(o.palette.divider,.1)}`,borderRadius:8,boxShadow:`
    0 0 0 1px ${t(o.palette.common.white,.05)} inset,
    0 24px 64px ${t(o.palette.common.black,.25)},
    0 8px 32px ${t(o.palette.common.black,.15)}
  `,animation:`${G} 0.3s ease-out`,overflow:"hidden",position:"relative","&::before":{content:'""',position:"absolute",top:0,left:0,right:0,height:120,background:`linear-gradient(180deg, ${t(o.palette.text.primary,.02)} 0%, transparent 100%)`,pointerEvents:"none"}})),U=a(B)(({theme:o})=>({display:"flex",alignItems:"flex-start",justifyContent:"space-between",padding:o.spacing(3),position:"relative",zIndex:1})),_=a(h)(({theme:o})=>({fontSize:"1.25rem",fontWeight:600,color:o.palette.text.primary,letterSpacing:"-0.02em"})),q=a(h)(({theme:o})=>({fontSize:"0.875rem",color:o.palette.text.secondary,marginTop:o.spacing(.5)})),L=a(W)(({theme:o})=>({width:32,height:32,borderRadius:8,color:o.palette.text.secondary,transition:"all 0.2s ease","&:hover":{backgroundColor:o.palette.mode==="dark"?t(o.palette.text.primary,.1):s[300],color:o.palette.text.primary,transform:"rotate(90deg)"}})),Q=a(Y)(({theme:o})=>({padding:o.spacing(0,3,3),position:"relative",zIndex:1})),V=a(E)(({theme:o})=>({borderColor:t(o.palette.divider,.08),margin:o.spacing(0,3)})),Z=a(P)(({theme:o})=>({padding:o.spacing(2.5,3),gap:o.spacing(1.5),backgroundColor:t(o.palette.background.paper,.3),borderTop:`1px solid ${t(o.palette.divider,.06)}`})),oo=a(w)(({theme:o})=>({borderRadius:8,textTransform:"none",fontWeight:500,fontSize:"0.875rem",padding:o.spacing(1,2.5),color:o.palette.text.secondary,borderColor:t(o.palette.divider,.2),transition:"all 0.2s ease","&:hover":{borderColor:t(o.palette.text.primary,.3),backgroundColor:t(o.palette.text.primary,.04)}})),eo=a(w)(({theme:o})=>({borderRadius:8,textTransform:"none",fontWeight:600,fontSize:"0.875rem",padding:o.spacing(1,2.5),transition:"all 0.2s ease","&.primary":{background:o.palette.mode==="dark"?s[1100]:s[1200],color:"#fff",boxShadow:`0 4px 14px ${t(o.palette.common.black,.15)}`,"&:hover":{background:o.palette.mode==="dark"?s[1e3]:s[1100],boxShadow:`0 6px 20px ${t(o.palette.common.black,.2)}`,transform:"translateY(-1px)"},"&:active":{transform:"translateY(0)"}},"&.error":{background:o.palette.mode==="dark"?s[1100]:s[1200],color:"#fff",boxShadow:`0 4px 14px ${t(o.palette.common.black,.15)}`,"&:hover":{background:o.palette.mode==="dark"?s[1e3]:s[1100],boxShadow:`0 6px 20px ${t(o.palette.common.black,.2)}`,transform:"translateY(-1px)"}}})),to=a(F)(({theme:o})=>({color:"inherit"}));function ro({open:o,onClose:n,title:r,subtitle:i,children:c,actions:p,maxWidth:m="sm",fullWidth:f=!0,loading:g=!1,hideCloseButton:b=!1,dividers:u=!0,confirmLabel:k="Confirm",cancelLabel:C="Cancel",onConfirm:d,onCancel:x,confirmDisabled:S=!1,confirmColor:D="primary",confirmVariant:I="contained"}){v();const $=()=>{x?.(),n()};return e.jsxs(K,{open:o,onClose:n,maxWidth:m,fullWidth:f,TransitionComponent:T,TransitionProps:{timeout:200},PaperComponent:N,children:[e.jsxs(U,{children:[e.jsxs(y,{children:[e.jsx(_,{children:r}),i&&e.jsx(q,{children:i})]}),!b&&e.jsx(L,{onClick:n,size:"small","aria-label":"Close dialog",children:e.jsx(z,{sx:{fontSize:18}})})]}),u&&e.jsx(V,{}),e.jsx(Q,{children:c}),(p||d)&&e.jsx(Z,{children:p||e.jsxs(e.Fragment,{children:[e.jsx(oo,{variant:"outlined",onClick:$,disabled:g,children:C}),e.jsx(eo,{variant:I,className:D,onClick:d,disabled:S||g,startIcon:g?e.jsx(to,{size:16}):null,children:k})]})})]})}const ao=l`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
`,no=l`
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
`,io=l`
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 0.8; }
`,so=l`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`,lo=a(y,{shouldForwardProp:o=>!["severity","bgColor"].includes(o)})(({theme:o,severity:n,bgColor:r})=>({width:72,height:72,borderRadius:20,backgroundColor:r,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",animation:n==="error"?`${no} 0.5s ease-in-out`:`${ao} 0.5s ease-in-out`,"&::before":{content:'""',position:"absolute",inset:-8,borderRadius:28,background:r,opacity:.3,animation:`${io} 2s infinite ease-in-out`},"&::after":{content:'""',position:"absolute",inset:-1,borderRadius:21,padding:1,background:`linear-gradient(135deg, ${t(o.palette.common.white,.2)}, transparent)`,WebkitMask:"linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",WebkitMaskComposite:"xor",maskComposite:"exclude",pointerEvents:"none"}})),co=a(h)(({theme:o})=>({fontSize:"0.9375rem",color:o.palette.text.secondary,lineHeight:1.6,maxWidth:320,animation:`${so} 0.4s ease-out 0.1s both`})),po=(o,n)=>{const r=o.palette.text.secondary,i=o.palette.mode==="dark"?t(o.palette.text.primary,.08):s[300],c={warning:{icon:X,color:r,bgColor:i},error:{icon:J,color:r,bgColor:i},info:{icon:H,color:r,bgColor:i},success:{icon:O,color:r,bgColor:i},question:{icon:A,color:r,bgColor:i}};return c[n]||c.warning},fo="neurareport_preferences",go=()=>{if(typeof window>"u")return{confirmDelete:!0};try{const o=window.localStorage.getItem(fo);return o?{confirmDelete:JSON.parse(o)?.confirmDelete??!0}:{confirmDelete:!0}}catch{return{confirmDelete:!0}}};function bo({open:o,onClose:n,onConfirm:r,title:i="Confirm",message:c,confirmLabel:p="Confirm",cancelLabel:m="Cancel",severity:f="warning",loading:g=!1}){const b=v(),u=po(b,f),k=u.icon,C=f==="error"?"error":"primary",d=j.useRef(!1),x=`${i} ${p}`.toLowerCase().includes("delete");return j.useEffect(()=>{if(!o){d.current=!1;return}if(!x||d.current)return;go().confirmDelete===!1&&(d.current=!0,r?.(),n?.())},[o,x,r,n]),e.jsx(ro,{open:o,onClose:n,title:i,maxWidth:"xs",onConfirm:r,confirmLabel:p,cancelLabel:m,confirmColor:C,loading:g,dividers:!1,children:e.jsxs(M,{spacing:3,alignItems:"center",textAlign:"center",sx:{py:2},children:[e.jsx(lo,{severity:f,bgColor:u.bgColor,children:e.jsx(k,{sx:{fontSize:32,color:u.color,position:"relative",zIndex:1}})}),e.jsx(co,{children:c})]})})}export{bo as C};
