/* =============================================
   Utils — Helpers gerais
   ============================================= */
const Utils = (() => {
  const fmt = (n,d=2) => new Intl.NumberFormat('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n||0);
  const fmtBRL = n => 'R$ '+fmt(n);
  const fmtDate = s => { if(!s)return'—'; const [y,m,d]=s.split('-'); return `${d}/${m}/${y}`; };
  const fmtDateTime = s => { if(!s)return'—'; const dt=new Date(s); return dt.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); };
  const fmtDateFromISO = s => { if(!s)return'—'; return new Date(s).toLocaleDateString('pt-BR'); };
  const today = () => new Date().toISOString().slice(0,10);
  const thisMonth = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
  const initials = n => n ? n.split(' ').filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('') : '?';
  const age = dob => { if(!dob)return null; const b=new Date(dob),n=new Date(); let a=n.getFullYear()-b.getFullYear(); if(n<new Date(n.getFullYear(),b.getMonth(),b.getDate()))a--; return a; };

  function debounce(fn, ms=300){ let t; return (...a) => { clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; }

  function showToast(msg, type='success', dur=3000){
    let c=document.getElementById('toastContainer');
    if(!c){ c=document.createElement('div'); c.id='toastContainer'; c.className='toast-container'; document.body.appendChild(c); }
    const t=document.createElement('div');
    t.className=`toast ${type}`;
    const icons={success:'✓',error:'✗',info:'ℹ'};
    t.innerHTML=`<span>${icons[type]||'ℹ'}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateX(40px)'; t.style.transition='all .3s'; setTimeout(()=>t.remove(),300); },dur);
  }

  function openModal(id){ document.getElementById(id).classList.remove('hidden'); }
  function closeModal(id){ document.getElementById(id).classList.add('hidden'); }

  function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function getPctColor(pct){ if(pct>=100)return'green'; if(pct>=70)return'gold'; return'red'; }
  function getPctClass(pct){ if(pct>=100)return'badge-green'; if(pct>=70)return'badge-gold'; return'badge-red'; }

  function getMonthRange(ym){ // 'YYYY-MM'
    const [y,m]=ym.split('-').map(Number);
    const start=new Date(y,m-1,1).toISOString().slice(0,10);
    const end=new Date(y,m,0).toISOString().slice(0,10);
    return {start,end};
  }

  function filterByMonth(list, field, ym){
    const {start,end}=getMonthRange(ym);
    return list.filter(r=>r[field]>=start && r[field]<=end);
  }

  function buildSelect(el, items, valKey, labelKey, selected='', placeholder='Selecione...'){
    el.innerHTML=`<option value="">${placeholder}</option>`;
    items.forEach(it=>{ const opt=document.createElement('option'); opt.value=it[valKey]; opt.textContent=it[labelKey]; if(it[valKey]===selected)opt.selected=true; el.appendChild(opt); });
  }

  return { fmt, fmtBRL, fmtDate, fmtDateTime, fmtDateFromISO, today, thisMonth, initials, age, debounce, showToast, openModal, closeModal, escapeHtml, getPctColor, getPctClass, getMonthRange, filterByMonth, buildSelect };
})();
