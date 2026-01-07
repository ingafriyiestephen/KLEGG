import{bh as i,bi as a,bj as c,bk as d,bl as l}from"./index-D8EdY7VT.js";/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */const h=()=>{const e=window;e.addEventListener("statusTap",()=>{i(()=>{const o=e.innerWidth,s=e.innerHeight,n=document.elementFromPoint(o/2,s/2);if(!n)return;const t=a(n);t&&new Promise(r=>c(t,r)).then(()=>{d(async()=>{t.style.setProperty("--overflow","hidden"),await l(t,300),t.style.removeProperty("--overflow")})})})})};export{h as startStatusTap};
