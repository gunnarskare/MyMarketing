"use client";

import { useState } from "react";

type Props = {
  initialAnalysis: any; initialStatus: string; analyzedAt: string | null; websiteUrl: string | null;
  sourcePages: { url: string; depth: number }[]; model: string | null; approvedAt: string | null; organizationName: string;
};
const SECTIONS = [
  ["brandOverview","Bedriften"],["positioning","Posisjonering"],["offerings","Produkter og tjenester"],
  ["audiences","Målgrupper"],["brandPersonality","Personlighet og verdier"],["voiceAndTone","Tone og språk"],
  ["messagingPillars","Budskapspilarer"],["visualIdentity","Visuell identitet"],["contentStrategy","Innholdsstrategi"],
  ["seo","SEO"],["customerJourney","Kundereisen"],["strengths","Styrker"],["gaps","Forbedringsområder"],
  ["opportunities","Muligheter"],["risks","Risiko"],["evidence","Kildegrunnlag"],["quality","Kvalitet og sikkerhet"]
] as const;
const LABELS: Record<string,string> = {
  oneLiner:"Kort fortalt",category:"Bransje/kategori",businessModel:"Forretningsmodell",mission:"Formål",vision:"Visjon",companyStage:"Selskapsfase",summary:"Sammendrag",
  positioningStatement:"Posisjoneringssetning",valueProposition:"Kundeløfte",customerProblem:"Kundeproblem",promisedOutcome:"Ønsket resultat",differentiators:"Hva skiller dere",proofPoints:"Dokumentasjon",alternatives:"Alternativer",
  name:"Navn",description:"Beskrivelse",targetAudience:"Målgruppe",customerBenefits:"Kundefordeler",features:"Funksjoner",evidence:"Dokumentasjon",
  segment:"Segment",needs:"Behov",painPoints:"Utfordringer",motivations:"Motivasjon",objections:"Innvendinger",decisionCriteria:"Beslutningskriterier",messagingAngle:"Budskapsvinkel",
  traits:"Egenskaper",values:"Verdier",archetype:"Merkevarearketype",desiredPerception:"Ønsket oppfatning",avoidPerception:"Uønsket oppfatning",
  voiceDescription:"Beskrivelse av stemmen",toneAttributes:"Toneegenskaper",writingPrinciples:"Skriveregler",preferredVocabulary:"Foretrukne ord",avoidVocabulary:"Ord som bør unngås",sampleMessage:"Eksempel på budskap",
  pillar:"Pilar",coreMessage:"Kjernebudskap",supportingPoints:"Støttepunkter",proof:"Bevis",colorPalette:"Fargepalett",typography:"Typografi",logoObservations:"Logo",imageryStyle:"Bildestil",designCharacteristics:"Designkjennetegn",
  themes:"Innholdstemaer",recommendedFormats:"Anbefalte formater",relevantChannels:"Relevante kanaler",callsToAction:"Handlingsoppfordringer",editorialGuidelines:"Redaksjonelle retningslinjer",
  primaryTopics:"Hovedtemaer",keywordOpportunities:"Søkeordmuligheter",searchIntents:"Søkeintensjon",onPageObservations:"Observasjoner på siden",technicalObservations:"Tekniske observasjoner",
  stage:"Fase",customerQuestion:"Kundens spørsmål",contentNeed:"Innholdsbehov",recommendedAction:"Anbefalt handling",opportunity:"Mulighet",expectedImpact:"Forventet effekt",effort:"Innsats",priority:"Prioritet",firstStep:"Første steg",
  claim:"Påstand",sourceUrl:"Kilde-URL",confidence:"Sikkerhet",assumptions:"Antakelser",missingInformation:"Manglende informasjon",questionsForCustomer:"Spørsmål til kunden",completeness:"Fullstendighet",requiresHumanReview:"Krever gjennomgang"
};
function label(key:string) { return LABELS[key] || key.replace(/([A-Z])/g," $1").replace(/^./,s=>s.toUpperCase()); }
function updatePath(value:any,path:(string|number)[],next:any):any {
  if (!path.length) return next;
  const head=path[0],tail=path.slice(1);
  if (Array.isArray(value)) { const copy=[...value]; copy[Number(head)]=updatePath(copy[Number(head)],tail,next); return copy; }
  return {...value,[String(head)]:updatePath(value?.[String(head)],tail,next)};
}
function EditorField({value,path,onChange}:{value:any;path:(string|number)[];onChange:(path:(string|number)[],value:any)=>void}) {
  const key=String(path[path.length-1]);
  if (typeof value==="string" || typeof value==="number") return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{label(key)}</span>
      <textarea rows={String(value).length>100?4:2} value={String(value)} onChange={e=>onChange(path,typeof value==="number"?Number(e.target.value):e.target.value)} className="w-full resize-y rounded-xl border border-line bg-paper px-3 py-2.5 text-sm leading-relaxed text-ink focus:border-ink focus:outline-none" />
    </label>
  );
  if (Array.isArray(value)) {
    if (value.every(v=>typeof v==="string")) return (
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{label(key)} <span className="font-normal">(ett punkt per linje)</span></span>
        <textarea rows={Math.min(7,Math.max(3,value.length+1))} value={value.join("\n")} onChange={e=>onChange(path,e.target.value.split("\n").map(s=>s.trim()).filter(Boolean))} className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm leading-relaxed text-ink focus:border-ink focus:outline-none" />
      </label>
    );
    return (
      <div className="rounded-2xl border border-line p-4">
        <div className="mb-3 flex items-center justify-between gap-3"><h4 className="text-sm font-semibold">{label(key)}</h4><button type="button" onClick={()=>onChange(path,[...value, value[0] ? Object.fromEntries(Object.entries(value[0]).map(([k,v]:any)=>[k,Array.isArray(v)?[]:""])) : {}])} className="text-xs font-semibold underline underline-offset-4">Legg til</button></div>
        <div className="space-y-4">{value.map((item:any,i:number)=><div key={i} className="rounded-xl bg-mist/60 p-3"><div className="mb-3 flex justify-between"><span className="text-xs font-bold text-ink-soft">Element {i+1}</span><button type="button" onClick={()=>onChange(path,value.filter((_:any,j:number)=>j!==i))} className="text-xs text-spot underline underline-offset-4">Fjern</button></div><EditorField value={item} path={[...path,i]} onChange={onChange}/></div>)}</div>
      </div>
    );
  }
  if (value && typeof value==="object") return <div className="grid gap-4 sm:grid-cols-2">{Object.entries(value).map(([k,v])=><div key={k} className={v && typeof v==="object" && !Array.isArray(v) ? "sm:col-span-2" : ""}><EditorField value={v} path={[...path,k]} onChange={onChange}/></div>)}</div>;
  return null;
}

export function BrandAnalysisEditor({initialAnalysis,initialStatus,analyzedAt,websiteUrl,sourcePages,model,approvedAt,organizationName}:Props) {
  const [analysis,setAnalysis]=useState<any>(initialAnalysis);
  const [status,setStatus]=useState(initialStatus);
  const [active,setActive]=useState<string>("brandOverview");
  const [busy,setBusy]=useState(false);
  const [refreshBusy,setRefreshBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [dirty,setDirty]=useState(false);
  const [approvedDate,setApprovedDate]=useState(approvedAt);
  async function save(approved:boolean) {
    setBusy(true); setMessage("");
    try {
      const response=await fetch("/api/brand-analysis",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({analysis,approved})});
      const result=await response.json(); if(!response.ok) throw new Error(result.error || "Lagring feilet.");
      setStatus(result.status); setApprovedDate(result.approvedAt); setDirty(false);
      setMessage(approved?"Merkevaregrunnlaget er godkjent og lagret.":"Endringene er lagret som et utkast. Godkjenn når du er klar.");
    } catch(e) { setMessage(e instanceof Error?e.message:"Noe gikk galt."); }
    finally { setBusy(false); }
  }
  async function refresh() {
    if(!window.confirm("Dette lager en ny analyse fra nettsiden og erstatter den nåværende analysen. Fortsette?")) return;
    setRefreshBusy(true); setMessage("");
    try {
      const response=await fetch("/api/brand-analysis",{method:"POST"}); const result=await response.json();
      if(!response.ok) throw new Error(result.error || "Kunne ikke analysere nettsiden.");
      setAnalysis(result.analysis); setStatus(result.status); setApprovedDate(null); setDirty(false); setMessage("Ny merkevareanalyse er generert og lagret.");
    } catch(e) { setMessage(e instanceof Error?e.message:"Noe gikk galt."); }
    finally { setRefreshBusy(false); }
  }
  if(!analysis) return (
    <section className="rounded-3xl border border-line bg-white p-7 sm:p-10"><div className="mx-auto max-w-xl text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-spot/10 text-2xl text-spot">✳</span>
      <h2 className="mt-5 text-2xl font-semibold">Merkevaregrunnlaget er ikke opprettet ennå</h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">Legg inn nettsiden og litt informasjon om bedriften. Spott analyserer nettsiden og lager et strukturert grunnlag som lagres for senere bruk.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3"><a href="/profil" className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white">Fyll ut merkevareprofil</a><button onClick={refresh} disabled={refreshBusy} className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-semibold disabled:opacity-50">{refreshBusy?"Analyserer …":"Start analyse"}</button></div>
      {message?<p role="status" className="mt-4 text-sm">{message}</p>:null}
    </div></section>
  );
  const quality=analysis.quality || {};
  const approved=status==="approved";
  return <div className="space-y-5">
    <section className="rounded-3xl bg-ink p-6 text-white sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{approved?"Godkjent":status==="needs_review"?"Trenger gjennomgang":"Utkast"}</span><span className="text-xs text-white/60">{quality.completeness ?? 0}% fullstendig</span></div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">{analysis.brandOverview?.oneLiner || organizationName}</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70">{analysis.brandOverview?.summary}</p>
          <p className="mt-4 text-xs text-white/50">{websiteUrl || "Ingen nettside registrert"}{analyzedAt ? " · Analysert " + new Intl.DateTimeFormat("nb-NO",{dateStyle:"medium"}).format(new Date(analyzedAt)) : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={refresh} disabled={refreshBusy||busy} className="min-h-10 rounded-full border border-white/25 px-4 text-sm font-semibold hover:bg-white/10 disabled:opacity-50">{refreshBusy?"Analyserer …":"Analyser nettsiden på nytt"}</button>
          <button onClick={()=>save(false)} disabled={busy||!dirty} className="min-h-10 rounded-full border border-white/25 px-4 text-sm font-semibold hover:bg-white/10 disabled:opacity-40">{busy?"Lagrer …":"Lagre endringer"}</button>
          <button onClick={()=>save(true)} disabled={busy||(!dirty&&approved)} className="min-h-10 rounded-full bg-white px-4 text-sm font-bold text-ink hover:bg-mist disabled:opacity-40">{busy?"Lagrer …":approved?"Godkjent":"Godkjenn grunnlaget"}</button>
        </div>
      </div>
      {message?<p role="status" className="mt-5 rounded-xl bg-white/10 px-4 py-3 text-sm">{message}</p>:null}
      {dirty?<p className="mt-3 text-xs text-white/60">Du har ulagrede endringer.</p>:null}
    </section>
    {(quality.assumptions?.length || quality.missingInformation?.length) ? <section className="grid gap-4 md:grid-cols-2">
      {quality.assumptions?.length?<div className="rounded-2xl border border-amber-300 bg-amber-50 p-5"><h3 className="font-semibold text-amber-950">Antakelser å kontrollere</h3><ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-950">{quality.assumptions.map((x:string,i:number)=><li key={i}>{x}</li>)}</ul></div>:null}
      {quality.missingInformation?.length?<div className="rounded-2xl border border-line bg-white p-5"><h3 className="font-semibold">Informasjon som mangler</h3><ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-soft">{quality.missingInformation.map((x:string,i:number)=><li key={i}>{x}</li>)}</ul></div>:null}
    </section>:null}
    <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <nav aria-label="Analysekapitler" className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">{SECTIONS.map(([key,name])=><button key={key} onClick={()=>setActive(key)} className={"shrink-0 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors "+(active===key?"bg-ink text-white":"border border-line bg-white text-ink-soft hover:bg-mist")}>{name}</button>)}</nav>
      <section className="min-w-0 rounded-3xl border border-line bg-white p-5 shadow-[0_20px_55px_-48px_rgb(10_20_40/45%)] sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-[0.16em] text-spot uppercase">MERKEVAREANALYSE</p><h3 className="mt-2 text-2xl font-semibold">{SECTIONS.find(s=>s[0]===active)?.[1]}</h3></div><span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-ink-soft">Redigerbar</span></div>
        <EditorField value={analysis[active]} path={[active]} onChange={(path,next)=>{setAnalysis((old:any)=>updatePath(old,path,next));setDirty(true);setMessage("");}} />
        <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-line pt-5">
          <button onClick={()=>setActive(SECTIONS[Math.max(0,SECTIONS.findIndex(s=>s[0]===active)-1)][0])} disabled={active===SECTIONS[0][0]} className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold disabled:opacity-30">Forrige</button>
          <button onClick={()=>setActive(SECTIONS[Math.min(SECTIONS.length-1,SECTIONS.findIndex(s=>s[0]===active)+1)][0])} disabled={active===SECTIONS[SECTIONS.length-1][0]} className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold disabled:opacity-30">Neste kapittel</button>
        </div>
      </section>
    </div>
    <section className="rounded-2xl border border-line bg-white p-5">
      <h3 className="font-semibold">Kildegrunnlag</h3><p className="mt-1 text-sm text-ink-soft">Analysen ble laget fra {sourcePages.length} nettsider{model ? " med " + model : ""}.</p>
      <div className="mt-3 flex flex-wrap gap-2">{sourcePages.slice(0,12).map((p,i)=><a key={i} href={p.url} target="_blank" rel="noreferrer" className="max-w-full truncate rounded-full bg-mist px-3 py-1.5 text-xs font-medium text-ink underline underline-offset-2">{new URL(p.url).pathname || "/"}</a>)}</div>
      {approvedDate?<p className="mt-3 text-xs text-ink-soft">Godkjent {new Intl.DateTimeFormat("nb-NO",{dateStyle:"medium",timeStyle:"short"}).format(new Date(approvedDate))}</p>:null}
    </section>
  </div>;
}
