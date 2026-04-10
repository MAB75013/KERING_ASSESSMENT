import { useState, useEffect, useCallback } from "react";

// ─── Storage ──────────────────────────────────────────────────────────────────
const MEM = {};
async function storeSave(key, val) {
  const s = JSON.stringify(val); MEM[key] = val;
  try { sessionStorage.setItem(key, s); } catch {}
  try { if (window.storage) await window.storage.set(key, s, true); } catch {}
}
async function storeLoad(key) {
  if (MEM[key]) return MEM[key];
  try { const v = sessionStorage.getItem(key); if (v) { MEM[key] = JSON.parse(v); return MEM[key]; } } catch {}
  try { if (window.storage) { const r = await window.storage.get(key, true); if (r) { MEM[key] = JSON.parse(r.value); return MEM[key]; } } } catch {}
  return null;
}
async function storageStatus() {
  try { if (window.storage) { await window.storage.set("__p__","1",true); const r = await window.storage.get("__p__",true); if (r?.value==="1") return "cloud"; } } catch {}
  try { sessionStorage.setItem("__p__","1"); if (sessionStorage.getItem("__p__")==="1") return "session"; } catch {}
  return "memory";
}
// Clear all local data for a given key
async function clearMaisonData(key) {
  MEM[key] = null;
  try { sessionStorage.removeItem(key); } catch {}
  try { if (window.storage) await window.storage.delete(key, true); } catch {}
}

async function exportData(maisons) {
  const out = {};
  for (const k of maisons.flatMap(m=>[`pre_${m}`,`atelier_${m}`]).concat(["synthese_group"])) {
    const v = await storeLoad(k); if (v) out[k] = v;
  }
  return JSON.stringify(out, null, 2);
}
async function importData(json) {
  const obj = JSON.parse(json);
  for (const [k,v] of Object.entries(obj)) await storeSave(k,v);
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MAISONS   = ["Gucci","Balenciaga","Saint Laurent","Bottega Veneta","Brioni","Alexander McQueen"];
const DIVISIONS = ["Leather Goods","Shoes","Ready-to-Wear"];

const FLOW_STEPS = [
  {id:"design",     label:"Design & Development",      hint:"PLM, design tools — from collection concept to final specifications"},
  {id:"sourcing",   label:"Sourcing & Materials",       hint:"Supplier portals, purchasing ERP, raw material certifications, EUDR traceability"},
  {id:"prod",       label:"Production & Manufacturing", hint:"MES, production ERP, quality control, assembly, finishing processes"},
  {id:"packaging",  label:"Packaging",                 hint:"Packaging design & sourcing, materials composition, recycled content, eco-score"},
  {id:"logistics",  label:"Logistics & Distribution",  hint:"WMS, TMS, serialization, labelling, import/export, DDP delivery"},
  {id:"sale",       label:"Sale",                      hint:"PIM, e-commerce, CRM, POS — inc. DPP tag activation and product passport display at point of sale"},
  {id:"aftersales", label:"After Sales & Usage",        hint:"Repair service, warranty management, spare parts, customer care, care instructions"},
  {id:"eol",        label:"End of Life",               hint:"Take-back programs, recycling, re-sale, donation, destruction tracking"},
];

const GRANULARITY = ["Brand","Collection","Style / Reference","SKU (size/color)","Serial ID","Lot / Batch"];
// Mode field removed — covered by tech maturity scale and integration modes
const FREQ        = ["Real-time","Daily","Weekly","Per collection","Ad hoc (manual trigger)"];
const INTEGRATION_MODES = ["REST API","GraphQL API","SOAP API","SFTP","Event streaming","Other"];

const TRANSFER_METHODS = ["REST API","SOAP API","SFTP","EDI","Kafka stream","ETL / Middleware","Manual export","Direct DB link","Other"];
const RECONCILIATION_KEYS = ["GTIN","SKU (size/color)","Style / Reference","Serial ID","Lot / Batch","Manual mapping","No reconciliation"];
const CONFIDENCE_LEVELS = [
  {v:"reliable", label:"Automatic & reliable", col:"#3a5e3e"},
  {v:"partial",  label:"Partial / manual checks", col:"#7a5e28"},
  {v:"none",     label:"Not reconciled", col:"#7a3428"},
];
const INITIATIVE_REGS   = ["ESPR / DPP","AGEC / French Law","EUDR","PEF / Ecoscore","Voluntary","Multiple","Other"];
const INITIATIVE_TYPES  = ["Regulatory compliance","Consumer experience","Supply chain traceability","Product authentication","Environmental performance","Manufacturing intelligence","Other"];
const INITIATIVE_STATUS = [
  {v:"exploration",label:"Exploration", col:"#bdaba0"},
  {v:"poc",        label:"POC",         col:"#4A90D9"},
  {v:"pilot",      label:"Pilot",       col:"#D4A843"},
  {v:"deployed",   label:"Deployed",    col:"#3a5e3e"},
  {v:"abandoned",  label:"Abandoned",   col:"#7a3428"},
];
const SCALABILITY_OPTS = [
  {v:"yes",     label:"Yes — ready to replicate",          col:"#3a5e3e"},
  {v:"partial", label:"Partial — conditions needed",       col:"#7a5e28"},
  {v:"no",      label:"No — too Maison-specific",          col:"#7a3428"},
];

const DPP_CATS = [
  {id:"company",   label:"Company & Brand",            points:5, hint:"SIRET/SIREN, legal entity, contact info, EORI, product range, certified repair service"},
  {id:"identity",  label:"Product Identification",     points:5, hint:"GTIN, unique product ID, TARIC code, digital tag carrier (QR / RFID / NFC / Data Matrix)"},
  {id:"compo",     label:"Composition & Basic Info",   points:7, hint:"Sub-category, weight, price, material % breakdown, recycled content, trims & accessories, user manuals"},
  {id:"manuf",     label:"Manufacturing & Processes",  points:8, hint:"Production processes (spinning, weaving, dyeing…), country per process stage, manufacturing country, upcycled"},
  {id:"supply",    label:"Operators & Suppliers",      points:4, hint:"Unique ID and info for each operator and facility across the value chain (Tier 1, 2, 3)"},
  {id:"transport", label:"Transport & Distribution",   points:6, hint:"Transport types & share (%), air cargo %, distances per leg, distribution losses, warehouse energy consumption"},
  {id:"health",    label:"Health Impact",              points:5, hint:"Substances of concern (SVHC), microfibers, hazardous substances, health & environmental impact assessment"},
  {id:"usecare",   label:"Use & Care",                 points:7, hint:"Repairability, warranty, care instructions, washing/drying scenarios, recyclability, collectability & sortability in France"},
  {id:"certif",    label:"Certifications & Labels",    points:3, hint:"GOTS, GRS, FSC, PEFC, Refashion, EUDR — certification name + number"},
  {id:"pkgcomp",   label:"Packaging – Composition",    points:5, hint:"Packaging name, materials & format (B2C + intermediate), recycled content %, hazardous substances in packaging"},
  {id:"pkgeol",    label:"Packaging – End of Life",    points:3, hint:"Collectability in France, sortability in France, elements disrupting sorting or recycling"},
];

const AMBITION_PILLARS = [
  {id:"reg",   label:"Regulatory Compliance", desc:"ESPR/DPP, AGEC, EUDR mandatory compliance"},
  {id:"twin",  label:"Digital Twin",          desc:"Production optimization, quality, manufacturing intelligence"},
  {id:"client",label:"Client & Commerce",     desc:"Storytelling, authentication, after-sales experience"},
];

const DEPLOY_OPTS = [
  {id:"platform",label:"Group Platform",        desc:"Centralized DPP infrastructure managed at Group level — maximum economies of scale"},
  {id:"contract",label:"Group-led Contractual", desc:"Group negotiation & standards, local deployment and operations per Maison"},
  {id:"mix",     label:"Hybrid Group / Local",  desc:"Shared Group data layer + Maison-specific business applications"},
  {id:"local",   label:"Full Maison Autonomy",  desc:"Each Maison manages its own DPP independently — minimal Group coordination"},
];

const BUSINESS_TEAMS    = [{id:"product",label:"Product / Design"},{id:"sustain",label:"Sustainability"},{id:"legal",label:"Legal / Compliance"},{id:"it",label:"IT / Data"},{id:"supply",label:"Supply Chain"},{id:"retail",label:"Retail / CX"},{id:"marketing",label:"Marketing"},{id:"aftersales",label:"After-Sales"}];
const BUSINESS_USECASES = [{id:"compliance",label:"Regulatory"},{id:"consumer",label:"Consumer comm."},{id:"auth",label:"Authentication"},{id:"aftersales",label:"After-sales"},{id:"twin",label:"Prod. optim."},{id:"traceability",label:"Traceability"},{id:"marketing",label:"Marketing"}];
const GOV_DIMS           = [{id:"owner",label:"Identified data owner"},{id:"process",label:"Documented collection process"},{id:"quality",label:"Quality validation in place"},{id:"version",label:"Versioning & change history"},{id:"supplier",label:"Structured supplier management"},{id:"kpi",label:"Data quality KPIs defined"}];
const FREINS             = [{id:"budget",label:"Budget & funding"},{id:"data",label:"Incomplete / unstructured data"},{id:"systems",label:"Fragmented / non-integrated systems"},{id:"supplier",label:"Non-compliant suppliers"},{id:"skills",label:"Insufficient internal skills"},{id:"governance",label:"Unclear governance & ownership"},{id:"priority",label:"Not a leadership priority yet"},{id:"std",label:"Lack of Group-level standards"}];
const MAT_DIMS           = ["Data availability","Quality / reliability","Flow automation","DPP coverage","Data governance","DPP ambition"];
const DECISION_CRITERIA  = [{label:"System heterogeneity across Maisons",w:.20},{label:"Median data maturity",w:.15},{label:"Shared regulatory pressure",w:.25},{label:"Willingness to converge",w:.20},{label:"DPP data coverage gaps",w:.10},{label:"ROI of a mutualized approach",w:.10}];
const DOCS               = [{id:"roadmap",label:"Regulatory / Sustainability roadmap",hint:"Maison strategy on ESPR, AGEC, DPP"},{id:"archi",label:"Product IT architecture",hint:"System landscape, integrations, APIs"},{id:"bom",label:"Bill of Materials (BOM)",hint:"Component structure — Leather / Shoes / RTW"},{id:"qr",label:"QR / NFC / DPP solution",hint:"Technology, deployment scope, % tagged"},{id:"initiatives",label:"Labelling / footprint initiatives",hint:"POC, MVP, deployed — current status"},{id:"governance",label:"Product data governance documentation",hint:"RACI, roles, responsibilities"},{id:"epl",label:"EP&L Audit",hint:"EP&L data collection process review"},{id:"excel",label:"DPP Assessment Excel Toolkit",hint:"Pre-filled Excel workbook — DPP_Assessment_Kering_Group_v2.xlsx — to be completed and returned before the workshop"}];

// ─── Kering palette ───────────────────────────────────────────────────────────
const K = {
  bg:       "#f8f2ed",
  panel:    "#f1e4d8",
  card:     "#ffffff",
  alt:      "#f4ede5",
  border:   "#e3c8b6",
  border2:  "#bdaba0",
  text:     "#342c28",
  sub:      "#66554b",
  muted:    "#a38780",
  accent:   "#342c28",
  mid:      "#66554b",
  taupe:    "#a38780",
  green:    "#3a5e3e",
  gold:     "#7a5e28",
  red:      "#7a3428",
  divLG:    "#66554b",
  divSh:    "#a38780",
  divRTW:   "#bdaba0",
};

const divCol = {"Leather Goods": K.divLG, "Shoes": K.divSh, "Ready-to-Wear": K.divRTW};
const modeCol = {auto: K.green, semi: K.gold, manual: K.red};

const PHASES = [
  {id:"pre",      label:"01 · Pre-Assessment", sub:"Async · D-10",    col: K.mid},
  {id:"atelier",  label:"02 · Maison Workshop", sub:"On-site · ~2h",  col: K.accent},
  {id:"synthese", label:"03 · Group Synthesis",  sub:"Internal · D+5", col: K.green},
];

const f  = `'Gill Sans','Trebuchet MS',Calibri,system-ui,sans-serif`;
const fs = `Georgia,'Times New Roman',serif`;

// ─── UI primitives ────────────────────────────────────────────────────────────
const Tag = ({c=K.muted,children}) => (
  <span style={{background:c+"1a",color:c,border:`1px solid ${c}55`,borderRadius:3,padding:"2px 7px",fontSize:9,fontWeight:600,letterSpacing:.3,fontFamily:f}}>{children}</span>
);

const SecHead = ({children,col=K.accent,timing}) => (
  <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:13}}>
    <div style={{width:2,height:16,background:col,flexShrink:0}}/>
    <span style={{color:col,fontSize:10,fontWeight:600,letterSpacing:1.6,textTransform:"uppercase",fontFamily:f,flex:1}}>{children}</span>
    {timing && <Tag c={K.muted}>{timing}</Tag>}
  </div>
);

const Card = ({children,s={},left}) => (
  <div style={{background:K.card,border:`1px solid ${K.border}`,borderRadius:8,padding:"18px 20px",borderLeft:left?`3px solid ${left}`:undefined,...s}}>{children}</div>
);

const Lbl = ({children,col=K.text,size=11,bold=false,italic=false,s={}}) => (
  <span style={{color:col,fontSize:size,fontWeight:bold?600:400,fontStyle:italic?"italic":"normal",fontFamily:f,...s}}>{children}</span>
);

const Pill = ({label,active,col,onClick}) => (
  <button onClick={onClick} style={{padding:"4px 11px",borderRadius:20,fontSize:10,fontWeight:active?600:400,cursor:"pointer",background:active?col+"1a":"transparent",border:`1px solid ${active?col:K.border}`,color:active?col:K.muted,transition:"all .15s",fontFamily:f}}>
    {label}
  </button>
);

const Btn = ({children,onClick,solid,col=K.accent,s={}}) => (
  <button onClick={onClick} style={{padding:"6px 14px",borderRadius:5,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:f,letterSpacing:.3,transition:"all .15s",background:solid?col:"transparent",border:`1px solid ${solid?col:K.border2}`,color:solid?"#fff":K.sub,...s}}>
    {children}
  </button>
);

const Inp = ({value,onChange,placeholder,s={}}) => (
  <input value={value} onChange={onChange} placeholder={placeholder}
    style={{background:K.card,border:`1px solid ${K.border}`,borderRadius:5,color:K.text,fontSize:10,padding:"6px 9px",fontFamily:f,outline:"none",...s}}
    onFocus={e=>e.target.style.borderColor=K.border2}
    onBlur={e=>e.target.style.borderColor=K.border}
  />
);

const Sel = ({value,onChange,children,s={}}) => (
  <select value={value} onChange={onChange}
    style={{background:K.card,border:`1px solid ${K.border}`,borderRadius:5,color:value?K.text:K.muted,fontSize:10,padding:"6px 7px",fontFamily:f,outline:"none",cursor:"pointer",...s}}>
    {children}
  </select>
);

const Tx = ({value,onChange,placeholder,h=80}) => (
  <textarea value={value} onChange={onChange} placeholder={placeholder}
    style={{width:"100%",height:h,background:K.bg,border:`1px solid ${K.border}`,borderRadius:6,color:K.text,fontSize:11,padding:"9px 12px",fontFamily:f,resize:"vertical",outline:"none",boxSizing:"border-box",lineHeight:1.7}}
    onFocus={e=>e.target.style.borderColor=K.border2}
    onBlur={e=>e.target.style.borderColor=K.border}
  />
);

const Stars = ({val,onChange,n=5,col=K.accent}) => (
  <div style={{display:"flex",gap:3}}>
    {Array.from({length:n},(_,i)=>i+1).map(v=>(
      <button key={v} onClick={()=>onChange(val===v?0:v)}
        style={{width:26,height:26,borderRadius:4,background:val>=v?col+"1a":"transparent",border:`1px solid ${val>=v?col:K.border}`,color:val>=v?col:K.muted,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:f,transition:"all .1s"}}>
        {v}
      </button>
    ))}
  </div>
);

// Tech maturity tooltip definitions
const TECH_MAT_LABELS = [
  {score:1, col:"#7A3428", label:"Manual entry",         example:"Data is typed or entered entirely by hand — no system involved"},
  {score:2, col:"#7A5E28", label:"Manual export",        example:"Human intervention required on a system, with or without manual modification of exported data (e.g. CSV download & upload)"},
  {score:3, col:"#66554B", label:"Basic integration",    example:"Scheduled batch, API calls, or file retrieval from SFTP — automated, no manual step needed"},
  {score:4, col:"#3A5E3E", label:"Advanced integration", example:"Real-time data retrieval — data is always current and immediately available"},
];

function TechMatTooltip(){
  const [show,setShow]=useState(false);
  return(
    <div style={{position:"relative",display:"inline-flex",alignItems:"center"}}>
      <button
        onMouseEnter={()=>setShow(true)}
        onMouseLeave={()=>setShow(false)}
        onClick={()=>setShow(s=>!s)}
        style={{width:18,height:18,borderRadius:"50%",background:K.panel,border:`1px solid ${K.border2}`,color:K.muted,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:f,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        ?
      </button>
      {show&&(
        <div style={{position:"absolute",left:"calc(100% + 8px)",top:"50%",transform:"translateY(-50%)",zIndex:200,background:K.card,border:`1px solid ${K.border2}`,borderRadius:8,padding:14,width:340,boxShadow:"0 4px 20px rgba(52,44,40,.12)",pointerEvents:"none"}}>
          <div style={{color:K.text,fontSize:11,fontWeight:600,fontFamily:fs,marginBottom:10}}>Tech Maturity Scale — 1 to 5</div>
          <div style={{color:K.muted,fontSize:9,fontFamily:f,fontStyle:"italic",marginBottom:10,lineHeight:1.5}}>
            "If I need a product's material composition created this week — how long and how many manual steps before it's available in your target system?"
          </div>
          {TECH_MAT_LABELS.map(({score,label,example})=>{
            const col=score>=4?K.green:score>=3?K.mid:score>=2?K.gold:K.red;
            return(
              <div key={score} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}>
                <div style={{width:22,height:22,borderRadius:4,background:col+"1a",border:`1px solid ${col}`,color:col,fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:f}}>
                  {score}
                </div>
                <div>
                  <div style={{color:K.text,fontSize:10,fontWeight:600,fontFamily:f}}>{label}</div>
                  <div style={{color:K.muted,fontSize:9,fontFamily:f,fontStyle:"italic",marginTop:1,lineHeight:1.4}}>"{example}"</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SaveBadge({status,saved}){
  const cfg={cloud:{dot:K.green,label:"Synced"},session:{dot:K.gold,label:"Session only"},memory:{dot:K.red,label:"Export to save"}};
  const {dot,label}=cfg[status]||cfg.memory;
  return(
    <span style={{display:"flex",alignItems:"center",gap:5,color:saved?dot:K.muted,fontSize:9,fontFamily:f}}>
      <span style={{width:6,height:6,borderRadius:"50%",background:saved?dot:K.muted,display:"inline-block"}}/>
      {label}
    </span>
  );
}

function DataPanel({onImported}){
  const [open,setOpen]=useState(false);
  const [mode,setMode]=useState(null); // null | "export" | "import"
  const [json,setJson]=useState("");
  const [msg,setMsg]=useState("");
  const [showConfirm,setShowConfirm]=useState(false);
  const flash=m=>{setMsg(m);setTimeout(()=>setMsg(""),5000);};

  // ── Generate JSON from all stored data ────────────────────────────────────
  const generateJSON=async()=>{
    const out={};
    for(const k of MAISONS.flatMap(m=>[`pre_${m}`,`atelier_${m}`]).concat(["synthese_group"])){
      const v=await storeLoad(k); if(v) out[k]=v;
    }
    if(Object.keys(out).length===0){ flash("No data to export yet"); return; }
    const str=JSON.stringify(out,null,2);
    setJson(str);
    setMode("export");
    try{
      await navigator.clipboard.writeText(str);
      flash(`✓ JSON ready — also copied to clipboard (${Object.keys(out).length} entries)`);
    }catch{
      flash(`✓ JSON ready — select all and copy manually`);
    }
  };

  // ── Import from pasted JSON ───────────────────────────────────────────────
  const doImport=async()=>{
    if(!json.trim()){ flash("Paste your JSON first"); return; }
    try{
      const obj=JSON.parse(json);
      let count=0;
      for(const [k,v] of Object.entries(obj)){ await storeSave(k,v); count++; }
      flash(`✓ ${count} entries imported — navigate to each section to see data`);
      setJson("");
      setMode(null);
      onImported?.();
    }catch{
      flash("✗ Invalid JSON — make sure you copied the full export");
    }
  };

  // ── Clear all local data ──────────────────────────────────────────────────
  const doClear=async()=>{
    if(!showConfirm){ setShowConfirm(true); setTimeout(()=>setShowConfirm(false),4000); return; }
    for(const k of MAISONS.flatMap(m=>[`pre_${m}`,`atelier_${m}`]).concat(["synthese_group"]))
      await clearMaisonData(k);
    setShowConfirm(false);
    setJson(""); setMode(null);
    flash("✓ All local data cleared");
    onImported?.();
  };

  const copyToClipboard=async()=>{
    try{ await navigator.clipboard.writeText(json); flash("✓ Copied to clipboard"); }
    catch{ flash("Select all text in the box and copy manually (Ctrl+A, Ctrl+C)"); }
  };

  return(
    <div style={{position:"relative"}}>
      <Btn onClick={()=>{setOpen(o=>!o);if(open){setMode(null);setJson("");}}}
        s={{borderColor:open?K.mid:K.border2,color:open?K.mid:K.sub}}>
        {open?"Close":"Export / Import"}
      </Btn>
      {open&&(
        <div style={{position:"absolute",right:0,top:38,zIndex:100,background:K.card,border:`1px solid ${K.border2}`,borderRadius:8,padding:18,width:360,boxShadow:"0 4px 20px rgba(52,44,40,.10)"}}>
          <div style={{color:K.text,fontSize:13,fontFamily:fs,marginBottom:3}}>Workshop data</div>
          <div style={{color:K.muted,fontSize:10,fontFamily:f,marginBottom:14,lineHeight:1.6}}>
            Save your data before closing. Copy the JSON and keep it somewhere safe. Paste it back to restore.
          </div>

          {/* Mode selector */}
          <div style={{display:"flex",gap:6,marginBottom:14}}>
            <button onClick={generateJSON}
              style={{flex:1,padding:"10px",borderRadius:6,border:`1px solid ${mode==="export"?K.green:K.border2}`,background:mode==="export"?K.green+"1a":"transparent",color:mode==="export"?K.green:K.sub,fontSize:11,fontFamily:f,cursor:"pointer",fontWeight:600,transition:"all .15s"}}>
              ↓ Export
            </button>
            <button onClick={()=>{setMode("import");setJson("");}}
              style={{flex:1,padding:"10px",borderRadius:6,border:`1px solid ${mode==="import"?K.mid:K.border2}`,background:mode==="import"?K.mid+"1a":"transparent",color:mode==="import"?K.mid:K.sub,fontSize:11,fontFamily:f,cursor:"pointer",fontWeight:600,transition:"all .15s"}}>
              ↑ Import
            </button>
          </div>

          {/* Export panel */}
          {mode==="export"&&json&&(
            <div style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{color:K.muted,fontSize:9,fontFamily:f}}>Select all → Copy → Save in a .json or .txt file</span>
                <button onClick={copyToClipboard}
                  style={{padding:"4px 10px",borderRadius:4,border:`1px solid ${K.green}`,background:K.green+"1a",color:K.green,fontSize:9,fontFamily:f,cursor:"pointer",fontWeight:600}}>
                  Copy all
                </button>
              </div>
              <textarea readOnly value={json} onClick={e=>e.target.select()}
                style={{width:"100%",height:140,background:"#fff",border:`1.5px solid ${K.green}`,borderRadius:6,color:K.text,fontSize:9,padding:"8px 10px",fontFamily:"monospace",resize:"vertical",outline:"none",boxSizing:"border-box",lineHeight:1.5,cursor:"text"}}/>
              <div style={{color:K.muted,fontSize:9,fontFamily:f,marginTop:4,fontStyle:"italic"}}>
                Click the text box to select all automatically
              </div>
            </div>
          )}

          {/* Import panel */}
          {mode==="import"&&(
            <div style={{marginBottom:12}}>
              <div style={{color:K.muted,fontSize:9,fontFamily:f,marginBottom:6}}>Paste your JSON backup below, then click Import</div>
              <textarea value={json} onChange={e=>setJson(e.target.value)}
                placeholder="Paste JSON here…"
                style={{width:"100%",height:140,background:"#fff",border:`1.5px solid ${K.mid}`,borderRadius:6,color:K.text,fontSize:9,padding:"8px 10px",fontFamily:"monospace",resize:"vertical",outline:"none",boxSizing:"border-box",lineHeight:1.5}}
                onFocus={e=>e.target.style.borderColor=K.accent}
                onBlur={e=>e.target.style.borderColor=K.mid}/>
              <button onClick={doImport}
                style={{width:"100%",marginTop:8,padding:"9px",borderRadius:6,border:`1px solid ${K.mid}`,background:K.mid,color:"#fff",fontSize:11,fontFamily:f,cursor:"pointer",fontWeight:600,boxSizing:"border-box"}}>
                Import data
              </button>
            </div>
          )}

          {/* Divider */}
          <div style={{height:1,background:K.border,margin:"4px 0 10px"}}/>

          {/* Clear */}
          <button onClick={doClear}
            style={{width:"100%",padding:"7px",borderRadius:5,border:`1px solid ${showConfirm?K.red:K.border}`,background:showConfirm?K.red+"14":"transparent",color:showConfirm?K.red:K.muted,fontSize:9,fontFamily:f,cursor:"pointer",transition:"all .2s",fontWeight:showConfirm?700:400,boxSizing:"border-box"}}>
            {showConfirm?"⚠️ Click again to confirm — irreversible":"Clear all local data (export first)"}
          </button>

          {msg&&(
            <div style={{color:msg.startsWith("✗")?K.red:K.green,fontSize:10,fontFamily:f,marginTop:10,fontWeight:600,lineHeight:1.5}}>
              {msg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function useStore(key,init){
  const [data,setData]=useState(init);
  const [saved,setSaved]=useState(false);
  const [status,setStatus]=useState("memory");
  useEffect(()=>{
    setData(init); setSaved(false);
    storageStatus().then(s=>setStatus(s));
    storeLoad(key).then(d=>{ if(d) setData(d); });
  },[key]);
  const persist=useCallback(async next=>{setData(next);await storeSave(key,next);setSaved(true);setTimeout(()=>setSaved(false),2e3);},[key]);
  return{data,persist,saved,status};
}

// ─── PHASE 1 ─────────────────────────────────────────────────────────────────
function Phase1({maison,col}){
  const {data,persist,saved,status}=useStore(`pre_${maison}`,{docs:{},divisions:{}});
  const upd=p=>persist({...data,...p});
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Card left={col}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <Lbl col={K.sub} italic>Async document tracking before the on-site workshop.</Lbl>
          <SaveBadge status={status} saved={saved}/>
        </div>
      </Card>
      <Card>
        <SecHead col={col}>Documents to collect</SecHead>
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          {DOCS.map((doc,i)=>{
            const v=data.docs[doc.id]||"pending";
            return(
              <div key={doc.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:i%2===0?K.alt:K.card,borderRadius:6,border:`1px solid ${K.border}`}}>
                <div style={{flex:1}}>
                  <div style={{color:K.text,fontSize:11,fontWeight:600,fontFamily:f}}>{doc.label}</div>
                  <div style={{color:K.muted,fontSize:10,fontFamily:f,marginTop:2,fontStyle:"italic"}}>{doc.hint}</div>
                </div>
                <div style={{display:"flex",gap:5,flexShrink:0}}>
                  {[{val:"ok",label:"✓ Received",c:K.green},{val:"partial",label:"⚡ Partial",c:K.gold},{val:"pending",label:"Pending",c:K.muted}].map(opt=>(
                    <Pill key={opt.val} label={opt.label} active={v===opt.val} col={opt.c} onClick={()=>upd({docs:{...data.docs,[doc.id]:opt.val}})}/>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card>
        <SecHead col={col}>Division scope</SecHead>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {DIVISIONS.map(d=>{
            const active=data.divisions?.[d];
            return(
              <button key={d} onClick={()=>upd({divisions:{...data.divisions,[d]:!active}})}
                style={{padding:"8px 18px",borderRadius:5,background:active?col+"1a":"transparent",border:`1px solid ${active?col:K.border2}`,color:active?col:K.sub,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:f,transition:"all .15s"}}>
                {active?"✓  ":""}{d}
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ─── PHASE 2 ─────────────────────────────────────────────────────────────────
const INIT_A = {
  flowEntries:{},techMat:{},techMatOverride:null,flowNote:"",
  dppCoverage:{},dppSource:{},dppNote:"",
  ambitionPriority:{},ambitionNote:{},ambitionHorizon:{},
  bizNeeds:{},govMat:{},freins:{},freinOther:"",freinNotes:{},govNote:"",
  deployOpen:"",quickwins:["","",""],groupNeeds:"",
  initiatives:[],archNote:"",archSchemaRef:"",
};

function emptyFlow(){return{divisions:[],system:"",granularity:"",freq:"",integrationModes:[],integrationOther:"",difficulty:""};}

function Phase2({maison,col}){
  const {data,persist,saved,status}=useStore(`atelier_${maison}`,INIT_A);
  const [sec,setSec]=useState("A");
  const [step,setStep]=useState("design");
  const [dppDiv,setDppDiv]=useState("Leather Goods");
  const upd=p=>persist({...data,...p});

  const getE=id=>data.flowEntries[id]||[];
  const addE=id=>upd({flowEntries:{...data.flowEntries,[id]:[...getE(id),emptyFlow()]}});
  const updE=(id,idx,patch)=>upd({flowEntries:{...data.flowEntries,[id]:getE(id).map((e,i)=>i===idx?{...e,...patch}:e)}});
  const remE=(id,idx)=>upd({flowEntries:{...data.flowEntries,[id]:getE(id).filter((_,i)=>i!==idx)}});

  const dk=(c,d)=>`${c}__${d.replace(/ /g,"_")}`;
  const stp=FLOW_STEPS.find(s=>s.id===step);

  const SECS=[{id:"B",label:"Data Landscape",t:"25 min"},{id:"C",label:"DPP Data Coverage",t:"15 min"},{id:"D",label:"DPP Ambitions",t:"20 min"},{id:"E",label:"Business Needs",t:"10 min"},{id:"F",label:"Barriers & Gov.",t:"15 min"},{id:"G",label:"Deployment",t:"15 min"},{id:"H",label:"Initiatives",t:"20 min"}];

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Nav card */}
      <Card left={col}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
          <Lbl col={K.sub} italic>The Excel covers the <em>what</em>. This workshop captures the <em>how</em>, ambitions, and decisions.</Lbl>
          <SaveBadge status={status} saved={saved}/>
        </div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:12}}>
          {SECS.map(s=>(
            <button key={s.id} onClick={()=>setSec(s.id)}
              style={{padding:"5px 11px",borderRadius:20,fontSize:9,fontWeight:sec===s.id?600:400,cursor:"pointer",background:sec===s.id?col+"1a":"transparent",border:`1px solid ${sec===s.id?col:K.border}`,color:sec===s.id?col:K.muted,fontFamily:f,transition:"all .15s"}}>
              {s.id} · {s.label} <span style={{opacity:.6}}>{s.t}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* B — Data Landscape */}
      {sec==="B"&&(
        <Card>
          <SecHead col={col} timing="25 min">B · Data Landscape & System Maturity</SecHead>
          <div style={{color:K.muted,fontSize:10,fontFamily:f,fontStyle:"italic",marginBottom:14}}>"For each lifecycle stage: which division, which system, what granularity, how does data flow, where does it break?"</div>

          {/* Step tabs */}
          <div style={{display:"flex",borderRadius:6,overflow:"hidden",border:`1px solid ${K.border}`,marginBottom:14}}>
            {FLOW_STEPS.map((st,idx)=>{
              const n=getE(st.id).filter(e=>e.system).length;
              const pain=getE(st.id).some(e=>e.difficulty);
              const isA=step===st.id;
              return(
                <button key={st.id} onClick={()=>setStep(st.id)}
                  style={{flex:1,padding:"10px 4px",background:isA?col+"14":K.card,border:"none",borderRight:idx<5?`1px solid ${K.border}`:"none",cursor:"pointer",fontFamily:f}}>
                  <div style={{color:isA?col:K.border2,fontSize:11,fontWeight:700}}>{String(idx+1).padStart(2,"0")}</div>
                  <div style={{color:isA?col:K.muted,fontSize:8,marginTop:3,lineHeight:1.3,fontWeight:isA?600:400}}>{st.label.split(" & ")[0].split(" / ")[0]}</div>
                  <div style={{display:"flex",gap:3,justifyContent:"center",marginTop:4}}>
                    {n>0&&<Tag c={col}>{n}</Tag>}
                    {pain&&<Tag c={K.red}>!</Tag>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pipeline breadcrumb */}
          <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:14,overflowX:"auto",paddingBottom:4}}>
            {FLOW_STEPS.map((st,idx)=>(
              <div key={st.id} style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                <div onClick={()=>setStep(st.id)} style={{padding:"3px 9px",borderRadius:4,background:step===st.id?col+"14":K.bg,border:`1px solid ${step===st.id?col:K.border}`,fontSize:9,color:step===st.id?col:K.muted,cursor:"pointer",fontFamily:f,fontWeight:step===st.id?600:400}}>
                  {st.label.split(" & ")[0].split(" / ")[0]}
                </div>
                {idx<5&&<span style={{color:K.border2,fontSize:11}}>›</span>}
              </div>
            ))}
          </div>

          {/* Active step content */}
          <div style={{background:K.bg,borderRadius:7,border:`1px solid ${col}44`,padding:16,marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
              <div>
                <span style={{color:col,fontSize:13,fontWeight:600,fontFamily:fs}}>{stp?.label}</span>
                <span style={{color:K.muted,fontSize:9,display:"block",marginTop:2,fontFamily:f,fontStyle:"italic"}}>{stp?.hint}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <Lbl col={K.muted} size={10}>Tech maturity for this stage:</Lbl>
                <TechMatTooltip/>
                <Stars val={data.techMat[step]||0} onChange={v=>upd({techMat:{...data.techMat,[step]:v}})} n={4} col={col}/>
              </div>
            </div>

            {getE(step).length===0
              ? <div style={{textAlign:"center",padding:"20px 0",color:K.muted,fontSize:10,fontFamily:f,fontStyle:"italic"}}>No system added yet — click "Add system" to start</div>
              : (
                <div style={{overflowX:"auto"}}>
                  {/* Column headers */}
                  <div style={{display:"grid",gridTemplateColumns:"140px 1fr 110px 90px 130px 1fr 28px",gap:5,marginBottom:5,minWidth:900}}>
                    {["Divisions","System / Tool","Data granularity","Frequency","Integration modes","Pain point / Difficulty",""].map(h=>(
                      <span key={h} style={{color:K.muted,fontSize:8,fontFamily:f,letterSpacing:.5,textTransform:"uppercase"}}>{h}</span>
                    ))}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:5,minWidth:860}}>
                    {getE(step).map((entry,idx)=>{
                      const dc=(entry.divisions&&entry.divisions.length>0)?divCol[entry.divisions[0]]||K.mid:K.border;
                      return(
                        <div key={idx} style={{display:"grid",gridTemplateColumns:"140px 1fr 110px 90px 130px 1fr 28px",gap:5,alignItems:"start"}}>
                          {/* Divisions — multi-select pills */}
                          <div style={{background:K.card,border:`1px solid ${K.border}`,borderRadius:5,padding:"4px 5px",minHeight:34}}>
                            <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:3}}>
                              {DIVISIONS.map(d=>{
                                const divs=entry.divisions||[];
                                const active=divs.includes(d);
                                const dc2=divCol[d];
                                return(<button key={d} onClick={()=>{
                                  const next=active?divs.filter(x=>x!==d):[...divs,d];
                                  updE(step,idx,{divisions:next});
                                }} style={{padding:"2px 6px",borderRadius:10,fontSize:8,cursor:"pointer",background:active?dc2+"1a":"transparent",border:`1px solid ${active?dc2:K.border}`,color:active?dc2:K.muted,fontFamily:f,fontWeight:active?600:400,transition:"all .1s"}}>
                                  {d.split(" ")[0]}
                                </button>);
                              })}
                            </div>
                            <button onClick={()=>{
                              const allActive=DIVISIONS.every(d=>(entry.divisions||[]).includes(d));
                              updE(step,idx,{divisions:allActive?[]:DIVISIONS});
                            }} style={{fontSize:7,color:K.muted,background:"transparent",border:"none",cursor:"pointer",fontFamily:f,padding:0}}>
                              {DIVISIONS.every(d=>(entry.divisions||[]).includes(d))?"Clear all":"All"}
                            </button>
                          </div>
                          {/* System */}
                          <Inp value={entry.system} onChange={e=>updE(step,idx,{system:e.target.value})} placeholder="SAP, Lectra PLM, PIM…" s={{width:"100%",boxSizing:"border-box"}}/>
                          {/* Granularity */}
                          <Sel value={entry.granularity} onChange={e=>updE(step,idx,{granularity:e.target.value})} s={{width:"100%",borderColor:entry.granularity?col+"88":K.border,color:entry.granularity?col:K.muted}}>
                            <option value="">Granularity…</option>
                            {GRANULARITY.map(g=><option key={g} value={g}>{g}</option>)}
                          </Sel>
                          {/* Frequency */}
                          <Sel value={entry.freq} onChange={e=>updE(step,idx,{freq:e.target.value})} s={{width:"100%"}}>
                            <option value="">Freq…</option>
                            {FREQ.map(f2=><option key={f2} value={f2}>{f2}</option>)}
                          </Sel>
                          {/* Integration modes — multi-select */}
                          <div style={{background:K.card,border:`1px solid ${K.border}`,borderRadius:5,padding:"4px 5px",minHeight:34}}>
                            <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:2}}>
                              {INTEGRATION_MODES.map(m=>{
                                const modes=entry.integrationModes||[];
                                const active=modes.includes(m);
                                return(<button key={m} onClick={()=>{
                                  const next=active?modes.filter(x=>x!==m):[...modes,m];
                                  updE(step,idx,{integrationModes:next});
                                }} style={{padding:"2px 5px",borderRadius:10,fontSize:7.5,cursor:"pointer",background:active?col+"1a":"transparent",border:`1px solid ${active?col:K.border}`,color:active?col:K.muted,fontFamily:f,fontWeight:active?600:400,transition:"all .1s"}}>
                                  {m}
                                </button>);
                              })}
                            </div>
                            {(entry.integrationModes||[]).includes("Other")&&(
                              <input value={entry.integrationOther||""} onChange={e=>updE(step,idx,{integrationOther:e.target.value})} placeholder="Specify…" style={{width:"100%",fontSize:8,border:"none",borderTop:`1px solid ${K.border}`,padding:"2px 4px",fontFamily:f,outline:"none",background:K.bg,boxSizing:"border-box"}}/>
                            )}
                          </div>
                          {/* Pain point */}
                          <Inp value={entry.difficulty} onChange={e=>updE(step,idx,{difficulty:e.target.value})} placeholder="Gap, blocker, limitation…" s={{width:"100%",boxSizing:"border-box",borderColor:entry.difficulty?K.red+"88":K.border}}/>
                          {/* Delete */}
                          <button onClick={()=>remE(step,idx)} style={{background:"transparent",border:`1px solid ${K.border}`,borderRadius:4,color:K.muted,cursor:"pointer",fontSize:12,padding:"4px 6px",lineHeight:1,fontFamily:f}}>×</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            }
            <Btn onClick={()=>addE(step)} solid col={col} s={{marginTop:12}}>+ Add system</Btn>
          </div>

          {/* Division coverage summary */}
          <div style={{background:K.panel,borderRadius:6,border:`1px solid ${K.border}`,padding:"10px 14px",marginBottom:12}}>
            <div style={{color:K.muted,fontSize:9,letterSpacing:.8,textTransform:"uppercase",marginBottom:8,fontFamily:f}}>Division coverage across all stages</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {DIVISIONS.map(div=>{
                const dc=divCol[div];const key=div;const label=div;
                const total=FLOW_STEPS.flatMap(st=>getE(st.id)).filter(e=>(e.divisions||[]).includes(div)&&e.system).length;
                const pains=FLOW_STEPS.flatMap(st=>getE(st.id)).filter(e=>(e.divisions||[]).includes(div)&&e.difficulty).length;
                return(
                  <div key={key} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:5,background:K.card,border:`1px solid ${total>0?dc:K.border}`}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:dc,flexShrink:0}}/>
                    <span style={{color:K.text,fontSize:10,fontFamily:f,fontWeight:600}}>{label}</span>
                    {total>0&&<Tag c={dc}>{total} sys.</Tag>}
                    {pains>0&&<Tag c={K.red}>{pains} pain{pains>1?"s":""}</Tag>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tech maturity summary + overall score */}
          {(()=>{
            const stageMats=FLOW_STEPS.map(st=>data.techMat[st.id]||0).filter(v=>v>0);
            const autoScore=stageMats.length>0?parseFloat((stageMats.reduce((a,b)=>a+b,0)/stageMats.length).toFixed(1)):null;
            const override=data.techMatOverride;
            const displayed=override!==null&&override!==undefined?override:autoScore;
            const mc=displayed>=4?K.green:displayed>=3?K.mid:displayed>=2?K.gold:displayed>0?K.red:K.muted;
            const isManual=override!==null&&override!==undefined;
            return(
              <div style={{background:K.panel,borderRadius:6,border:`1px solid ${K.border}`,padding:"14px 16px"}}>
                {/* Overall score row */}
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,paddingBottom:12,borderBottom:`1px solid ${K.border}`}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                  <div style={{color:K.muted,fontSize:9,letterSpacing:.8,textTransform:"uppercase",fontFamily:f}}>Overall Tech Maturity</div>
                  <TechMatTooltip/>
                </div>
                    <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                      <span style={{color:mc,fontSize:26,fontWeight:700,fontFamily:"Georgia,serif",lineHeight:1}}>{displayed!==null?displayed.toFixed(1):"—"}</span>
                      <span style={{color:K.muted,fontSize:10,fontFamily:f}}>/5</span>
                      <Tag c={isManual?K.mid:K.green}>{isManual?"Manual override":"Auto-calculated"}</Tag>
                      {isManual&&autoScore!==null&&(
                        <span style={{color:K.muted,fontSize:9,fontFamily:f,fontStyle:"italic"}}>Auto would be {autoScore.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{color:K.muted,fontSize:9,fontFamily:f}}>{isManual?"Override:":"Set override:"}</span>
                      <Stars val={override||0} onChange={v=>upd({techMatOverride:v===override?null:v})} n={4} col={K.mid}/>
                    </div>
                    {isManual&&(
                      <button onClick={()=>upd({techMatOverride:null})}
                        style={{background:"transparent",border:`1px solid ${K.border}`,borderRadius:4,color:K.muted,cursor:"pointer",fontSize:9,padding:"3px 8px",fontFamily:f}}>
                        Reset to auto
                      </button>
                    )}
                  </div>
                </div>
                {/* Per-stage breakdown */}
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                  <div style={{color:K.muted,fontSize:9,letterSpacing:.8,textTransform:"uppercase",fontFamily:f}}>Maturity by lifecycle stage</div>
                  <TechMatTooltip/>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {FLOW_STEPS.map((st,idx)=>{
                    const mat=data.techMat[st.id]||0;
                    const n=getE(st.id).filter(e=>e.system).length;
                    const mc2=mat>=4?K.green:mat>=2?K.gold:mat>0?K.red:K.muted;
                    return(
                      <div key={st.id} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:5,background:K.card,border:`1px solid ${mat>0?mc2+"66":K.border}`}}>
                        <span style={{color:K.taupe,fontSize:10,fontWeight:700,fontFamily:f}}>{String(idx+1).padStart(2,"0")}</span>
                        <span style={{color:K.text,fontSize:9,fontFamily:f}}>{st.label.split(" & ")[0].split(" / ")[0]}</span>
                        {mat>0&&<Tag c={mc2}>{mat}/5</Tag>}
                        {n>0&&<Tag c={col}>{n}</Tag>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          <div style={{marginTop:12}}>
            <Tx value={data.flowNote} onChange={e=>upd({flowNote:e.target.value})} placeholder="Overall observations on data architecture & systems…" h={60}/>
          </div>
        </Card>
      )}

      {/* C — DPP Coverage */}
      {sec==="C"&&(
        <Card>
          <SecHead col={col} timing="15 min">C · DPP Data Coverage</SecHead>
          <div style={{color:K.muted,fontSize:10,fontFamily:f,fontStyle:"italic",marginBottom:12}}>"Estimate coverage per category per product division, and identify the source system."</div>
          {/* Division tabs */}
          <div style={{display:"flex",gap:6,marginBottom:16}}>
            {DIVISIONS.map(div=>(
              <button key={div} onClick={()=>setDppDiv(div)}
                style={{padding:"8px 18px",borderRadius:5,background:dppDiv===div?divCol[div]+"1a":"transparent",border:`1.5px solid ${dppDiv===div?divCol[div]:K.border}`,color:dppDiv===div?divCol[div]:K.sub,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:f,transition:"all .15s"}}>
                {div}
              </button>
            ))}
          </div>
          {/* Summary strip */}
          <div style={{display:"flex",gap:10,marginBottom:16,padding:"10px 14px",background:K.panel,borderRadius:6,border:`1px solid ${K.border}`}}>
            {DIVISIONS.map(div=>{
              const vals=DPP_CATS.map(cat=>data.dppCoverage[dk(cat.id,div)]||0).filter(v=>v>0);
              const avg=vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/DPP_CATS.length):0;
              const dc=divCol[div];
              return(
                <div key={div} style={{flex:1,textAlign:"center"}}>
                  <div style={{color:dc,fontSize:20,fontWeight:700,fontFamily:fs}}>{avg}%</div>
                  <div style={{color:K.muted,fontSize:9,marginTop:1,fontFamily:f}}>{div}</div>
                  <div style={{width:"100%",height:3,background:K.border,borderRadius:2,marginTop:5,overflow:"hidden"}}>
                    <div style={{width:`${avg}%`,height:"100%",background:dc}}/>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Categories */}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {DPP_CATS.map((cat,i)=>{
              const cov=data.dppCoverage[dk(cat.id,dppDiv)]||0;
              const src=data.dppSource[dk(cat.id,dppDiv)]||"";
              const cc=cov>=75?K.green:cov>=40?K.gold:cov>0?K.red:K.muted;
              const dc=divCol[dppDiv];
              return(
                <div key={cat.id} style={{background:i%2===0?K.alt:K.card,borderRadius:7,border:`1px solid ${K.border}`,overflow:"hidden"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px"}}>
                    <div style={{flex:1}}>
                      <div style={{color:K.text,fontSize:11,fontWeight:600,fontFamily:f}}>{cat.label}</div>
                      <div style={{color:K.muted,fontSize:9,fontFamily:f,marginTop:2,fontStyle:"italic"}}>{cat.hint} · <span style={{color:col}}>{cat.points} data points</span></div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <Lbl col={K.muted} size={9}>Coverage:</Lbl>
                      <div style={{display:"flex",gap:3}}>
                        {[0,25,50,75,100].map(v=>(
                          <button key={v} onClick={()=>upd({dppCoverage:{...data.dppCoverage,[dk(cat.id,dppDiv)]:cov===v?0:v}})}
                            style={{padding:"3px 7px",borderRadius:3,background:cov===v?cc+"1a":"transparent",border:`1px solid ${cov===v?cc:K.border}`,color:cov===v?cc:K.muted,fontSize:9,fontWeight:cov===v?600:400,cursor:"pointer",fontFamily:f}}>
                            {v}%
                          </button>
                        ))}
                      </div>
                      {cov>0&&<div style={{width:44,height:4,background:K.border,borderRadius:2,overflow:"hidden"}}><div style={{width:`${cov}%`,height:"100%",background:cc}}/></div>}
                    </div>
                  </div>
                  <div style={{padding:"0 14px 10px",display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:2,height:14,background:dc,flexShrink:0}}/>
                    <Inp value={src} onChange={e=>upd({dppSource:{...data.dppSource,[dk(cat.id,dppDiv)]:e.target.value}})} placeholder={`Source system(s) for ${dppDiv}…`} s={{flex:1,boxSizing:"border-box"}}/>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{marginTop:12}}><Tx value={data.dppNote} onChange={e=>upd({dppNote:e.target.value})} placeholder="Notes on DPP coverage — hardest data points, key gaps per division…" h={60}/></div>
        </Card>
      )}

      {/* D — DPP Ambitions */}
      {sec==="D"&&(
        <Card>
          <SecHead col={col} timing="20 min">D · DPP Ambitions — 3 Pillars</SecHead>
          <div style={{color:K.muted,fontSize:10,fontFamily:f,fontStyle:"italic",marginBottom:14}}>"Which pillar creates the most value for your Maison? At what time horizon?"</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {AMBITION_PILLARS.map((pillar,pi)=>{
              const prio=data.ambitionPriority[pillar.id]||0;
              const horizon=data.ambitionHorizon[pillar.id]||"";
              const note=data.ambitionNote[pillar.id]||"";
              const pc=[K.accent,K.mid,K.taupe][pi];
              return(
                <div key={pillar.id} style={{background:K.bg,borderRadius:8,border:`1.5px solid ${prio>=4?pc:K.border}`,overflow:"hidden",transition:"border-color .2s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px"}}>
                    <div style={{width:32,height:32,borderRadius:"50%",background:pc+"1a",border:`1px solid ${pc}`,display:"flex",alignItems:"center",justifyContent:"center",color:pc,fontSize:12,fontWeight:700,fontFamily:fs,flexShrink:0}}>{pi+1}</div>
                    <div style={{flex:1}}>
                      <div style={{color:pc,fontSize:13,fontWeight:600,fontFamily:fs}}>{pillar.label}</div>
                      <div style={{color:K.muted,fontSize:10,fontFamily:f,marginTop:2,fontStyle:"italic"}}>{pillar.desc}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <Lbl col={K.muted} size={9}>Priority:</Lbl>
                        <Stars val={prio} onChange={v=>upd({ambitionPriority:{...data.ambitionPriority,[pillar.id]:v}})} col={pc}/>
                      </div>
                      <div style={{display:"flex",gap:4}}>
                        {["Short-term","Mid-term","Long-term"].map(h=>(
                          <Pill key={h} label={h} active={horizon===h} col={pc} onClick={()=>upd({ambitionHorizon:{...data.ambitionHorizon,[pillar.id]:horizon===h?"":h}})}/>
                        ))}
                      </div>
                    </div>
                  </div>
                  {prio>=3&&(
                    <div style={{borderTop:`1px solid ${K.border}`,padding:"9px 16px"}}>
                      <Inp value={note} onChange={e=>upd({ambitionNote:{...data.ambitionNote,[pillar.id]:e.target.value}})} placeholder={`Concrete use cases for "${pillar.label}"…`} s={{width:"100%",boxSizing:"border-box"}}/>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* E — Business Needs */}
      {sec==="E"&&(
        <Card>
          <SecHead col={col} timing="10 min">E · Business Needs</SecHead>
          <div style={{color:K.muted,fontSize:10,fontFamily:f,fontStyle:"italic",marginBottom:12}}>"Which teams need DPP data, and for which use case?"</div>
          <div style={{overflowX:"auto"}}>
            <table style={{borderCollapse:"collapse",width:"100%",fontSize:10,minWidth:640}}>
              <thead>
                <tr>
                  <th style={{color:K.muted,padding:"6px 10px",textAlign:"left",borderBottom:`1px solid ${K.border}`,fontSize:9,fontFamily:f,fontWeight:600,letterSpacing:.5,textTransform:"uppercase",minWidth:130}}>Team</th>
                  {BUSINESS_USECASES.map(u=>(
                    <th key={u.id} style={{color:col,padding:"6px 6px",textAlign:"center",borderBottom:`1px solid ${K.border}`,fontSize:8,fontFamily:f,fontWeight:600,minWidth:72}}>{u.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BUSINESS_TEAMS.map((team,ri)=>(
                  <tr key={team.id} style={{background:ri%2===0?K.alt:K.card}}>
                    <td style={{padding:"6px 10px",color:K.text,fontSize:10,fontWeight:600,fontFamily:f}}>{team.label}</td>
                    {BUSINESS_USECASES.map(uc=>{
                      const v=data.bizNeeds[`${team.id}_${uc.id}`];
                      return(
                        <td key={uc.id} style={{padding:"4px 5px",textAlign:"center"}}>
                          <button onClick={()=>upd({bizNeeds:{...data.bizNeeds,[`${team.id}_${uc.id}`]:v==="high"?"":v==="low"?"high":"low"}})}
                            style={{width:58,height:24,borderRadius:4,background:v==="high"?col+"1a":v==="low"?col+"0a":K.card,border:`1px solid ${v==="high"?col:v==="low"?col+"55":K.border}`,color:v==="high"?col:v==="low"?col+"88":K.muted,fontSize:8,fontWeight:600,cursor:"pointer",fontFamily:f,transition:"all .12s"}}>
                            {v==="high"?"★ High":v==="low"?"Low":"·"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{color:K.muted,fontSize:9,fontFamily:f,marginTop:6,fontStyle:"italic"}}>Click to cycle: · → Low → High → ·</div>
        </Card>
      )}

      {/* F — Barriers & Governance */}
      {sec==="F"&&(
        <Card>
          <SecHead col={col} timing="15 min">F · Barriers & Governance Maturity</SecHead>
          <div style={{color:K.muted,fontSize:10,fontFamily:f,fontStyle:"italic",marginBottom:12}}>"What are the real blockers? Where do you stand on product data governance?"</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:12}}>
            <div>
              <div style={{color:K.muted,fontSize:9,letterSpacing:.8,textTransform:"uppercase",fontFamily:f,marginBottom:8}}>Identified barriers</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {FREINS.map(fr=>{
                  const active=data.freins[fr.id];
                  const note=data.freinNotes[fr.id]||"";
                  return(
                    <div key={fr.id} style={{borderRadius:6,border:`1px solid ${active?K.red+"66":K.border}`,overflow:"hidden",transition:"border-color .2s"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:active?K.red+"08":K.card,cursor:"pointer"}} onClick={()=>upd({freins:{...data.freins,[fr.id]:!active}})}>
                        <span style={{width:8,height:8,borderRadius:"50%",background:active?K.red:K.border,flexShrink:0}}/>
                        <span style={{color:active?K.text:K.muted,fontSize:10,fontFamily:f,flex:1,fontWeight:active?600:400}}>{fr.label}</span>
                      </div>
                      {active&&(
                        <input value={note} onChange={e=>upd({freinNotes:{...data.freinNotes,[fr.id]:e.target.value}})} placeholder="Add context…"
                          style={{width:"100%",background:K.bg,border:"none",borderTop:`1px solid ${K.border}`,color:K.text,fontSize:9,padding:"7px 10px",fontFamily:f,outline:"none",boxSizing:"border-box"}}/>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div style={{color:K.muted,fontSize:9,letterSpacing:.8,textTransform:"uppercase",fontFamily:f,marginBottom:8}}>Data governance maturity</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {GOV_DIMS.map(dim=>{
                  const v=data.govMat[dim.id]||0;
                  const gc=v>=3?K.green:v>=2?K.gold:v>0?K.red:K.muted;
                  return(
                    <div key={dim.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:K.card,borderRadius:6,border:`1px solid ${K.border}`}}>
                      <span style={{color:K.text,fontSize:10,fontFamily:f,flex:1}}>{dim.label}</span>
                      <Stars val={v} onChange={nv=>upd({govMat:{...data.govMat,[dim.id]:nv}})} n={4} col={gc}/>
                      <Tag c={gc}>{v>=3?"Mature":v>=2?"In progress":v>0?"Initial":"—"}</Tag>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div style={{marginBottom:10}}>
            <div style={{color:K.muted,fontSize:9,fontFamily:f,letterSpacing:.5,textTransform:"uppercase",marginBottom:5}}>Other barriers (free text)</div>
            <Tx value={data.freinOther||""} onChange={e=>upd({freinOther:e.target.value})} placeholder="Any other barrier not listed above — specific context, technical constraints, political dynamics…" h={50}/>
          </div>
          <Tx value={data.govNote} onChange={e=>upd({govNote:e.target.value})} placeholder="Governance observations — context, history, internal dynamics…" h={60}/>
        </Card>
      )}

      {/* G — Deployment */}
      {sec==="G"&&(
        <Card>
          <SecHead col={col} timing="15 min">G · Deployment Model</SecHead>
          <div style={{color:K.muted,fontSize:10,fontFamily:f,fontStyle:"italic",marginBottom:14}}>"Given what you know about your current architecture and the Group's direction towards shared infrastructure — how do you see your Maison participating in a Group DPP initiative?"</div>

          {/* Reference models — for context only */}
          <div style={{background:K.panel,borderRadius:6,border:`1px solid ${K.border}`,padding:"12px 14px",marginBottom:14}}>
            <div style={{color:K.muted,fontSize:9,letterSpacing:.8,textTransform:"uppercase",fontFamily:f,marginBottom:10}}>Reference models (for context)</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[
                {col:K.green, label:"Group Data Layer",       desc:"Group operates a central data repository (MDM or middleware) + sets tag encoding standards and approved vendor list"},
                {col:K.mid,   label:"Group-led Contractual",  desc:"Group negotiates master contract — each Maison deploys its own instance on its own timeline"},
                {col:K.gold,  label:"Group Standards Only",   desc:"Group defines common data schema and minimum tag specs only — no shared infrastructure or contract"},
                {col:K.red,   label:"Full Maison Autonomy",   desc:"No Group intervention — each Maison fully independent. High risk of incompatibility over time."},
              ].map((opt,i)=>(
                <div key={i} style={{padding:"10px 12px",borderRadius:6,background:K.card,border:`1px solid ${opt.col}33`}}>
                  <div style={{color:opt.col,fontSize:10,fontWeight:600,fontFamily:f,marginBottom:4}}>{opt.label}</div>
                  <div style={{color:K.muted,fontSize:9,fontFamily:f,lineHeight:1.5}}>{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Open question */}
          <div style={{marginBottom:10}}>
            <div style={{color:K.text,fontSize:10,fontWeight:600,fontFamily:f,marginBottom:6}}>Your Maison's perspective</div>
            <Tx value={data.deployOpen||""} onChange={e=>upd({deployOpen:e.target.value})} placeholder="How do you see your Maison participating? What conditions or prerequisites would be needed? What concerns do you have about a Group approach? What would you want the Group to own vs. your Maison to own?…" h={100}/>
          </div>

          <div style={{borderTop:`1px solid ${K.border}`,paddingTop:14,marginTop:4}}>
            <div style={{color:K.muted,fontSize:10,fontFamily:f,fontStyle:"italic",marginBottom:10}}>"3 actions your Maison could take in the next 90 days — with or without the Group."</div>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
              {(data.quickwins||["","",""]).map((qw,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{color:col,fontSize:13,fontWeight:700,minWidth:18,fontFamily:fs}}>›</span>
                  <Inp value={qw} onChange={e=>{const next=[...(data.quickwins||["","",""])];next[i]=e.target.value;upd({quickwins:next});}} placeholder={`Action ${i+1}…`} s={{flex:1,boxSizing:"border-box"}}/>
                </div>
              ))}
            </div>
            <Tx value={data.groupNeeds||""} onChange={e=>upd({groupNeeds:e.target.value})} placeholder="What requires a Group-level decision to unblock your Maison…" h={50}/>
          </div>
        </Card>
      )}

      {/* H — Initiatives & Architecture */}
      {sec==="H"&&(
        <Card>
          <SecHead col={col} timing="20 min">H · Initiatives & Architecture</SecHead>
          <div style={{color:K.muted,fontSize:10,fontFamily:f,fontStyle:"italic",marginBottom:14}}>"What DPP-related projects has your Maison already run or explored? For key initiatives, what does the data architecture look like?"</div>

          {/* Initiative cards */}
          <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
            {(data.initiatives||[]).map((init,idx)=>{
              const st=INITIATIVE_STATUS.find(s=>s.v===init.status);
              const sc=SCALABILITY_OPTS.find(s=>s.v===init.scalability);
              const expanded=init._expanded;
              const setExpanded=v=>{const n=[...data.initiatives];n[idx]={...n[idx],_expanded:v};upd({initiatives:n});};
              return(
                <div key={idx} style={{background:K.bg,borderRadius:8,border:`1.5px solid ${st?.col||K.border}`,overflow:"hidden",transition:"border-color .2s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",cursor:"pointer"}} onClick={()=>setExpanded(!expanded)}>
                    <div style={{flex:1}}>
                      <input value={init.name||""} onChange={e=>{const n=[...data.initiatives];n[idx]={...n[idx],name:e.target.value};upd({initiatives:n});}} onClick={e=>e.stopPropagation()} placeholder="Initiative name…"
                        style={{width:"100%",fontWeight:600,fontSize:12,border:"none",background:"transparent",padding:0,color:K.text,fontFamily:f,outline:"none"}}/>
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                      <Sel value={init.status||""} onChange={e=>{const n=[...data.initiatives];n[idx]={...n[idx],status:e.target.value};upd({initiatives:n});}} s={{borderColor:st?.col||K.border,color:st?.col||K.muted,fontWeight:600,fontSize:10}} onClick={e=>e.stopPropagation()}>
                        <option value="">Status…</option>
                        {INITIATIVE_STATUS.map(s=><option key={s.v} value={s.v}>{s.label}</option>)}
                      </Sel>
                      {sc&&<Tag c={sc.col}>{sc.label.split(" —")[0]}</Tag>}
                      <span style={{color:K.muted,fontSize:14}}>{expanded?"▲":"▼"}</span>
                    </div>
                    <button onClick={e=>{e.stopPropagation();upd({initiatives:data.initiatives.filter((_,i)=>i!==idx)});}} style={{background:"transparent",border:`1px solid ${K.border}`,borderRadius:4,color:K.muted,cursor:"pointer",fontSize:12,padding:"3px 6px",fontFamily:f,lineHeight:1}}>×</button>
                  </div>
                  {expanded&&(
                    <div style={{borderTop:`1px solid ${K.border}`,padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                        <div>
                          <div style={{color:K.muted,fontSize:9,fontFamily:f,marginBottom:4,letterSpacing:.5,textTransform:"uppercase"}}>Regulation</div>
                          <Sel value={init.regulation||""} onChange={e=>{const n=[...data.initiatives];n[idx]={...n[idx],regulation:e.target.value};upd({initiatives:n});}} s={{width:"100%"}}>
                            <option value="">Select…</option>
                            {INITIATIVE_REGS.map(r=><option key={r} value={r}>{r}</option>)}
                          </Sel>
                        </div>
                        <div>
                          <div style={{color:K.muted,fontSize:9,fontFamily:f,marginBottom:4,letterSpacing:.5,textTransform:"uppercase"}}>Type</div>
                          <Sel value={init.type||""} onChange={e=>{const n=[...data.initiatives];n[idx]={...n[idx],type:e.target.value};upd({initiatives:n});}} s={{width:"100%"}}>
                            <option value="">Select…</option>
                            {INITIATIVE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                          </Sel>
                        </div>
                        <div>
                          <div style={{color:K.muted,fontSize:9,fontFamily:f,marginBottom:4,letterSpacing:.5,textTransform:"uppercase"}}>Product scope</div>
                          <Sel value={init.scope||""} onChange={e=>{const n=[...data.initiatives];n[idx]={...n[idx],scope:e.target.value};upd({initiatives:n});}} s={{width:"100%"}}>
                            <option value="">Select…</option>
                            {["Leather Goods","Shoes","Ready-to-Wear","All divisions"].map(s=><option key={s} value={s}>{s}</option>)}
                          </Sel>
                        </div>
                      </div>
                      <div>
                        <div style={{color:K.muted,fontSize:9,fontFamily:f,marginBottom:4,letterSpacing:.5,textTransform:"uppercase"}}>Business objective</div>
                        <Inp value={init.objective||""} onChange={e=>{const n=[...data.initiatives];n[idx]={...n[idx],objective:e.target.value};upd({initiatives:n});}} placeholder="What business problem does this solve or value does it create?" s={{width:"100%",boxSizing:"border-box"}}/>
                      </div>
                      <div>
                        <div style={{color:K.muted,fontSize:9,fontFamily:f,marginBottom:4,letterSpacing:.5,textTransform:"uppercase"}}>Project description</div>
                        <Tx value={init.description||""} onChange={e=>{const n=[...data.initiatives];n[idx]={...n[idx],description:e.target.value};upd({initiatives:n});}} placeholder="Describe the initiative — context, approach, what was built or tested…" h={70}/>
                      </div>
                      <div>
                        <div style={{color:K.muted,fontSize:9,fontFamily:f,marginBottom:4,letterSpacing:.5,textTransform:"uppercase"}}>Solution used (platform / tool / vendor)</div>
                        <Inp value={init.solution||""} onChange={e=>{const n=[...data.initiatives];n[idx]={...n[idx],solution:e.target.value};upd({initiatives:n});}} placeholder="Ex: Circularise, Eon, Intertek, in-house…" s={{width:"100%",boxSizing:"border-box"}}/>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                        <div>
                          <div style={{color:K.green,fontSize:9,fontFamily:f,marginBottom:4,letterSpacing:.5,textTransform:"uppercase"}}>Advantages</div>
                          <Tx value={init.pros||""} onChange={e=>{const n=[...data.initiatives];n[idx]={...n[idx],pros:e.target.value};upd({initiatives:n});}} placeholder="What worked well…" h={60}/>
                        </div>
                        <div>
                          <div style={{color:K.red,fontSize:9,fontFamily:f,marginBottom:4,letterSpacing:.5,textTransform:"uppercase"}}>Limitations</div>
                          <Tx value={init.cons||""} onChange={e=>{const n=[...data.initiatives];n[idx]={...n[idx],cons:e.target.value};upd({initiatives:n});}} placeholder="What didn't work or is missing…" h={60}/>
                        </div>
                        <div>
                          <div style={{color:K.mid,fontSize:9,fontFamily:f,marginBottom:4,letterSpacing:.5,textTransform:"uppercase"}}>Lessons learned</div>
                          <Tx value={init.lessons||""} onChange={e=>{const n=[...data.initiatives];n[idx]={...n[idx],lessons:e.target.value};upd({initiatives:n});}} placeholder="What would you do differently…" h={60}/>
                        </div>
                      </div>
                      {/* Architecture for this initiative */}
                      <div style={{background:K.panel,borderRadius:6,padding:"10px 14px",border:`1px solid ${K.border}`}}>
                        <div style={{color:K.mid,fontSize:9,fontFamily:f,marginBottom:6,letterSpacing:.5,textTransform:"uppercase"}}>Architecture / Data flows for this initiative</div>
                        <Tx value={init.archDesc||""} onChange={e=>{const n=[...data.initiatives];n[idx]={...n[idx],archDesc:e.target.value};upd({initiatives:n});}} placeholder="Describe the data architecture: which systems are involved, how data flows, key integrations. Attach a Miro/diagram link below if available." h={60}/>
                        <Inp value={init.archLink||""} onChange={e=>{const n=[...data.initiatives];n[idx]={...n[idx],archLink:e.target.value};upd({initiatives:n});}} placeholder="Miro / Confluence / SharePoint link to architecture diagram (optional)…" s={{width:"100%",boxSizing:"border-box",marginTop:8}}/>
                      </div>
                      {/* Scalability */}
                      <div style={{background:K.panel,borderRadius:6,padding:"10px 14px",border:`1px solid ${K.border}`}}>
                        <div style={{color:K.muted,fontSize:9,fontFamily:f,marginBottom:8,letterSpacing:.5,textTransform:"uppercase"}}>Scalability to other Group Maisons</div>
                        <div style={{display:"flex",gap:6,marginBottom:8}}>
                          {SCALABILITY_OPTS.map(opt=>(
                            <button key={opt.v} onClick={()=>{const n=[...data.initiatives];n[idx]={...n[idx],scalability:opt.v};upd({initiatives:n});}}
                              style={{flex:1,padding:"7px",borderRadius:5,border:`1px solid ${(init.scalability||"")===(opt.v)?opt.col:K.border}`,background:(init.scalability||"")===(opt.v)?opt.col+"1a":"transparent",color:(init.scalability||"")===(opt.v)?opt.col:K.muted,fontSize:9,fontFamily:f,cursor:"pointer",fontWeight:(init.scalability||"")===(opt.v)?700:400,transition:"all .15s"}}>
                              {opt.label.split(" —")[0]}
                            </button>
                          ))}
                        </div>
                        {(init.scalability==="yes"||init.scalability==="partial")&&(
                          <Inp value={init.scaleConditions||""} onChange={e=>{const n=[...data.initiatives];n[idx]={...n[idx],scaleConditions:e.target.value};upd({initiatives:n});}} placeholder="Conditions to replicate — prerequisites, adaptations needed, estimated effort…" s={{width:"100%",boxSizing:"border-box"}}/>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <Btn onClick={()=>upd({initiatives:[...(data.initiatives||[]),{name:"",regulation:"",type:"",scope:"",status:"",objective:"",description:"",solution:"",pros:"",cons:"",lessons:"",scalability:"",scaleConditions:"",archDesc:"",archLink:"",_expanded:true}]})} solid col={col} s={{marginBottom:16}}>+ Add initiative</Btn>

          {/* General architecture note */}
          <div style={{borderTop:`1px solid ${K.border}`,paddingTop:14}}>
            <div style={{color:K.text,fontSize:10,fontWeight:600,fontFamily:f,marginBottom:6}}>Overall data architecture notes</div>
            <div style={{color:K.muted,fontSize:9,fontFamily:f,fontStyle:"italic",marginBottom:8}}>Any additional context on how systems interact at Maison level — outside of specific initiatives above.</div>
            <Tx value={data.archNote||""} onChange={e=>upd({archNote:e.target.value})} placeholder="General observations on data architecture, system landscape, known constraints…" h={70}/>
            <div style={{marginTop:8}}>
              <Inp value={data.archSchemaRef||""} onChange={e=>upd({archSchemaRef:e.target.value})} placeholder="Link to overall architecture diagram (Miro, Confluence, SharePoint…)" s={{width:"100%",boxSizing:"border-box"}}/>
            </div>
          </div>
        </Card>
      )}


    </div>
  );
}

// ─── PHASE 3 ─────────────────────────────────────────────────────────────────
function Phase3({col}){
  const {data,persist,saved,status}=useStore("synthese_group",{heatmap:{},decision:{},synthesis:""});
  const [allAtelier,setAllAtelier]=useState({});
  const upd=p=>persist({...data,...p});

  // ── Compute decision scores from Phase 2 data ─────────────────────────────
  const computeDecision=(atel)=>{
    const loaded=Object.keys(atel).length;
    if(loaded===0)return null;

    // 1. System heterogeneity — spread of tech maturity scores
    const techScores=MAISONS.map(m=>{
      const d=atel[m];if(!d)return null;
      const mats=FLOW_STEPS.map(st=>d.techMat?.[st.id]||0).filter(v=>v>0);
      const ov=d.techMatOverride;
      return ov!=null?ov:(mats.length?mats.reduce((a,b)=>a+b,0)/mats.length:null);
    }).filter(v=>v!==null);
    const spread=techScores.length>1?Math.max(...techScores)-Math.min(...techScores):0;
    const s1=Math.min(5,Math.max(1,Math.round(1+(spread/3)*4)));

    // 2. Median data maturity
    const sorted=[...techScores].sort((a,b)=>a-b);
    const median=sorted.length?sorted[Math.floor(sorted.length/2)]:3;
    const s2=Math.min(5,Math.max(1,Math.round(median*(5/4))));

    // 3. Shared regulatory pressure — reg ambition × inverse DPP coverage
    const regPrios=MAISONS.map(m=>atel[m]?.ambitionPriority?.reg||0).filter(v=>v>0);
    const avgReg=regPrios.length?regPrios.reduce((a,b)=>a+b,0)/regPrios.length:3;
    const covVals=[];
    MAISONS.forEach(m=>DPP_CATS.forEach(cat=>DIVISIONS.forEach(div=>{
      const v=atel[m]?.dppCoverage?.[`${cat.id}__${div.replace(/ /g,"_")}`]||0;
      if(v>0)covVals.push(v);
    })));
    const avgCov=covVals.length?covVals.reduce((a,b)=>a+b,0)/covVals.length:50;
    const s3=Math.min(5,Math.max(1,Math.round((avgReg+(5-(avgCov/25)))/2)));

    // 4. Willingness to converge — from Section G open text length (more text = more engagement)
    // Since G is now open-ended, we estimate based on response length as a proxy
    const deployTexts=MAISONS.map(m=>atel[m]?.deployOpen||"").filter(t=>t.length>0);
    const avgTextLen=deployTexts.length?deployTexts.reduce((a,b)=>a+b.length,0)/deployTexts.length:0;
    // Short response (<50 chars) = low engagement = 2, long (>200) = high = 4
    const s4=Math.min(5,Math.max(1,avgTextLen>200?4:avgTextLen>100?3:avgTextLen>30?2:2));

    // 5. DPP coverage gaps — inverse of avg coverage
    const s5=Math.min(5,Math.max(1,Math.round(5-(avgCov/25))));

    // 6. ROI mutualized approach — shared barriers across Maisons
    const barrierCounts=FREINS.map(fr=>MAISONS.filter(m=>atel[m]?.freins?.[fr.id]).length);
    const maxShared=barrierCounts.length?Math.max(...barrierCounts):0;
    const s6=Math.min(5,Math.max(1,Math.round(1+(maxShared/Math.max(loaded,1))*4)));

    return{0:s1,1:s2,2:s3,3:s4,4:s5,5:s6};
  };

  // ── Load all Maison data + auto-compute matrix ────────────────────────────
  const loadAll=useCallback(()=>{
    Promise.all(MAISONS.map(m=>storeLoad(`atelier_${m}`).then(d=>[m,d]))).then(pairs=>{
      const obj={};pairs.forEach(([m,d])=>{if(d)obj[m]=d;});
      setAllAtelier(obj);
      const scores=computeDecision(obj);
      if(scores) persist({...data,decision:scores});
    });
  },[]);
  useEffect(()=>{loadAll();},[]);

  // ── Aggregations ──────────────────────────────────────────────────────────
  const ragCols=[K.red,K.gold,K.green];
  const ragLabels=["Low","Medium","Advanced"];
  const decScore=DECISION_CRITERIA.reduce((acc,crit,i)=>acc+(data.decision[i]||3)*crit.w,0);
  const reco=decScore>=4?0:decScore>=2.8?1:2;
  const recoOpts=[
    {label:"Strong Group ambition", desc:"Shared DPP platform",               c:K.green},
    {label:"Light coordination",    desc:"Common standards, local deployment", c:K.gold},
    {label:"Maison autonomy",       desc:"Minimal Group framework",            c:K.red},
  ];
  const dk=(catId,div)=>`${catId}__${div.replace(/ /g,"_")}`;
  const aggCov=DPP_CATS.map(cat=>{
    const byDiv=DIVISIONS.map(div=>{
      const vals=MAISONS.map(m=>allAtelier[m]?.dppCoverage?.[dk(cat.id,div)]||0).filter(v=>v>0);
      return{div,avg:vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0,n:vals.length};
    });
    return{...cat,byDiv};
  });
  const aggAmb=AMBITION_PILLARS.map((p,pi)=>{
    const vals=MAISONS.map(m=>allAtelier[m]?.ambitionPriority?.[p.id]||0);
    const avg=vals.filter(v=>v>0).length?(vals.reduce((a,b)=>a+b,0)/vals.filter(v=>v>0).length).toFixed(1):"—";
    return{...p,avg,pc:[K.accent,K.mid,K.taupe][pi]};
  });
  // aggDeploy removed — Section G is now open-ended text
  const aggFreins=FREINS.map(fr=>({...fr,count:MAISONS.filter(m=>allAtelier[m]?.freins?.[fr.id]).length})).sort((a,b)=>b.count-a.count);

  // ── Auto-heatmap ──────────────────────────────────────────────────────────
  const autoRag=(val,hi=4,mid=3)=>val>=hi?2:val>=mid?1:val>0?0:-1;
  const computeAutoRow=(m)=>{
    const d=allAtelier[m];if(!d)return{};
    const stageMats=FLOW_STEPS.map(st=>d.techMat?.[st.id]||0).filter(v=>v>0);
    const techAvg=stageMats.length?stageMats.reduce((a,b)=>a+b,0)/stageMats.length:0;
    const techVal=d.techMatOverride!=null?d.techMatOverride:(stageMats.length?techAvg:0);
    const stagesFilled=FLOW_STEPS.filter(st=>(d.flowEntries?.[st.id]||[]).some(e=>e.system)).length;
    const qualVals=["quality","kpi"].map(id=>d.govMat?.[id]||0).filter(v=>v>0);
    const qualAvg=qualVals.length?qualVals.reduce((a,b)=>a+b,0)/qualVals.length:0;
    const govVals=GOV_DIMS.map(dim=>d.govMat?.[dim.id]||0).filter(v=>v>0);
    const govAvg=govVals.length?govVals.reduce((a,b)=>a+b,0)/govVals.length:0;
    const covV=[];
    DPP_CATS.forEach(cat=>DIVISIONS.forEach(div=>{
      const v=d.dppCoverage?.[`${cat.id}__${div.replace(/ /g,"_")}`]||0;
      if(v>0)covV.push(v);
    }));
    const covAvg=covV.length?covV.reduce((a,b)=>a+b,0)/covV.length:0;
    const ambMax=Math.max(...AMBITION_PILLARS.map(p=>d.ambitionPriority?.[p.id]||0),0);
    return{
      "Data availability":    autoRag(stagesFilled,4,2),
      "Quality / reliability":autoRag(qualAvg,3.5,2),
      "Flow automation":      autoRag(techVal,4,3),
      "DPP coverage":         autoRag(covAvg,75,40),
      "Data governance":      autoRag(govAvg,3.5,2),
      "DPP ambition":         autoRag(ambMax,4,3),
    };
  };
  const applyAutoRow=(m)=>{
    const row=computeAutoRow(m);
    const filtered=Object.fromEntries(Object.entries(row).filter(([,v])=>v>=0));
    if(Object.keys(filtered).length===0)return;
    upd({heatmap:{...data.heatmap,[m]:{...(data.heatmap[m]||{}),...filtered}}});
  };
  const applyAllAuto=()=>{
    const newHeatmap={...data.heatmap};
    MAISONS.forEach(m=>{
      const row=computeAutoRow(m);
      const filtered=Object.fromEntries(Object.entries(row).filter(([,v])=>v>=0));
      if(Object.keys(filtered).length>0)newHeatmap[m]={...(newHeatmap[m]||{}),...filtered};
    });
    upd({heatmap:newHeatmap});
  };

  // ── Maison completion ─────────────────────────────────────────────────────
  const maisonStatus=MAISONS.map(m=>{
    const d=allAtelier[m];
    if(!d)return{m,done:0,pct:0};
    const checks=[
      FLOW_STEPS.some(st=>(d.flowEntries?.[st.id]||[]).some(e=>e.system)),
      Object.keys(d.dppCoverage||{}).some(k=>d.dppCoverage[k]>0),
      Object.keys(d.ambitionPriority||{}).some(k=>d.ambitionPriority[k]>0),
      Object.values(d.bizNeeds||{}).some(v=>v==="high"||v==="low"),
      Object.values(d.freins||{}).some(Boolean)||Object.values(d.govMat||{}).some(v=>v>0),
      (d.deployOpen||"").length>5,
      (d.initiatives||[]).some(i=>i.name),
    ];
    const done=checks.filter(Boolean).length;
    return{m,done,pct:Math.round(done/7*100),checks};
  });

  const CRITERION_SOURCES=[
    "Section B — spread of tech maturity across Maisons",
    "Section B — median overall tech maturity score",
    "Sections C+D — regulatory ambition priority \u00d7 DPP coverage gaps",
    "Section G — deployment preferences (Group Platform=5 \u2026 Local=1)",
    "Section C — inverse of avg DPP coverage across Maisons",
    "Section F — frequency of shared barriers across Maisons",
  ];

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>

      {/* Header + completion */}
      <Card left={col}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8,marginBottom:14}}>
          <div>
            <div style={{color:K.text,fontSize:13,fontWeight:600,fontFamily:fs,marginBottom:2}}>Group Synthesis</div>
            <Lbl col={K.sub} italic size={10}>{Object.keys(allAtelier).length}/{MAISONS.length} Maisons loaded · decision matrix auto-computed from workshop data</Lbl>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <SaveBadge status={status} saved={saved}/>
            <Btn onClick={loadAll} s={{fontSize:9}}>↻ Refresh all</Btn>
          </div>
        </div>
        <div style={{borderTop:`1px solid ${K.border}`,paddingTop:12}}>
          <div style={{color:K.muted,fontSize:9,letterSpacing:.8,textTransform:"uppercase",fontFamily:f,marginBottom:8}}>Workshop completion by Maison</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {maisonStatus.map(({m,done,pct,checks})=>{
              const sc=pct>=80?K.green:pct>=40?K.gold:pct>0?K.mid:K.muted;
              const sections=["B","C","D","E","F","G","H"];
              return(
                <div key={m} style={{background:K.bg,borderRadius:6,padding:"10px 12px",border:`1px solid ${pct>0?sc+"55":K.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <span style={{color:K.text,fontSize:10,fontWeight:600,fontFamily:f}}>{m}</span>
                    <Tag c={sc}>{pct}%</Tag>
                  </div>
                  <div style={{width:"100%",height:3,background:K.border,borderRadius:2,overflow:"hidden",marginBottom:7}}>
                    <div style={{width:`${pct}%`,height:"100%",background:sc,transition:"width .4s"}}/>
                  </div>
                  <div style={{display:"flex",gap:3}}>
                    {sections.map((s,i)=>(
                      <div key={s} style={{flex:1,height:18,borderRadius:3,background:checks?.[i]?sc+"22":K.card,border:`1px solid ${checks?.[i]?sc:K.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <span style={{color:checks?.[i]?sc:K.muted,fontSize:7,fontWeight:600,fontFamily:f}}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {Object.keys(allAtelier).length>0&&(
        <>
          {/* DPP Coverage */}
          <Card>
            <SecHead col={col}>DPP Coverage · By Category & Division</SecHead>
            <div style={{overflowX:"auto"}}>
              <table style={{borderCollapse:"collapse",width:"100%",fontSize:10,minWidth:640}}>
                <thead><tr>
                  <th style={{color:K.muted,padding:"6px 10px",textAlign:"left",borderBottom:`1px solid ${K.border}`,fontSize:9,fontFamily:f,fontWeight:600,minWidth:180}}>Category</th>
                  <th style={{color:K.muted,padding:"6px 6px",textAlign:"center",borderBottom:`1px solid ${K.border}`,fontSize:8,fontFamily:f}}>Pts</th>
                  {DIVISIONS.map(div=><th key={div} style={{color:divCol[div],padding:"6px 10px",textAlign:"center",borderBottom:`1px solid ${K.border}`,fontSize:9,fontFamily:f,fontWeight:600,minWidth:110}}>{div}</th>)}
                </tr></thead>
                <tbody>
                  {aggCov.map((cat,ri)=>(
                    <tr key={cat.id} style={{background:ri%2===0?K.alt:K.card}}>
                      <td style={{padding:"8px 10px",color:K.text,fontSize:10,fontFamily:f,fontWeight:600}}>{cat.label}</td>
                      <td style={{padding:"8px 6px",textAlign:"center"}}><Tag c={col}>{cat.points}</Tag></td>
                      {cat.byDiv.map(({div,avg})=>{
                        const cc=avg>=75?K.green:avg>=40?K.gold:avg>0?K.red:K.muted;
                        return(<td key={div} style={{padding:"8px 10px",textAlign:"center"}}>
                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                            <div style={{width:70,height:5,background:K.border,borderRadius:2,overflow:"hidden"}}><div style={{width:`${avg}%`,height:"100%",background:cc}}/></div>
                            <Tag c={cc}>{avg>0?`${avg}%`:"—"}</Tag>
                          </div>
                        </td>);
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Ambition + Deployment */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Card>
              <SecHead col={col}>DPP Ambition · Priority</SecHead>
              {aggAmb.map(p=>(
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:p.pc+"1a",border:`1px solid ${p.pc}`,display:"flex",alignItems:"center",justifyContent:"center",color:p.pc,fontSize:12,fontWeight:700,fontFamily:fs,flexShrink:0}}>{p.label[0]}</div>
                  <div style={{flex:1}}>
                    <div style={{color:p.pc,fontSize:11,fontWeight:600,fontFamily:f}}>{p.label}</div>
                    <div style={{width:"100%",height:4,background:K.border,borderRadius:2,marginTop:6,overflow:"hidden"}}><div style={{width:`${(parseFloat(p.avg)||0)*20}%`,height:"100%",background:p.pc}}/></div>
                  </div>
                  <Tag c={p.pc}>{p.avg}/5</Tag>
                </div>
              ))}
            </Card>
            <Card>
              <SecHead col={col}>Deployment — Open Responses</SecHead>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {MAISONS.map(m=>{
                  const txt=allAtelier[m]?.deployOpen||"";
                  if(!txt)return null;
                  return(<div key={m} style={{padding:"10px 12px",background:K.alt,borderRadius:6,border:`1px solid ${K.border}`}}>
                    <div style={{color:K.text,fontSize:10,fontWeight:600,fontFamily:f,marginBottom:4}}>{m}</div>
                    <div style={{color:K.sub,fontSize:10,fontFamily:f,lineHeight:1.6}}>{txt}</div>
                  </div>);
                }).filter(Boolean)}
                {!MAISONS.some(m=>allAtelier[m]?.deployOpen)&&<div style={{color:K.muted,fontSize:10,fontFamily:f,fontStyle:"italic"}}>No responses yet</div>}
              </div>
            </Card>
          </div>

          {/* Barriers */}
          <Card>
            <SecHead col={col}>Barriers · Group Frequency</SecHead>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {aggFreins.map(fr=>{
                const fc=fr.count>=3?K.red:fr.count>=2?K.gold:K.muted;
                return(<div key={fr.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:K.alt,borderRadius:5,border:`1px solid ${fr.count>=3?K.red+"44":K.border}`}}>
                  <div style={{width:Math.min(fr.count*10,40),height:4,background:fc,borderRadius:2,minWidth:4,flexShrink:0}}/>
                  <Lbl col={K.text} size={10} s={{flex:1}}>{fr.label}</Lbl>
                  <Tag c={fc}>{fr.count}/{MAISONS.length}</Tag>
                </div>);
              })}
            </div>
          </Card>
        </>
      )}

      {/* System Interactions aggregation */}
      {Object.keys(allAtelier).some(m=>(allAtelier[m]?.systemFlows||[]).length>0)&&(
        <Card>
          <SecHead col={col}>System Interactions · Consolidated</SecHead>
          <div style={{overflowX:"auto"}}>
            <table style={{borderCollapse:"collapse",width:"100%",fontSize:10,minWidth:800}}>
              <thead><tr>
                <th style={{color:K.muted,padding:"6px 8px",textAlign:"left",borderBottom:`1px solid ${K.border}`,fontSize:9,fontFamily:f,fontWeight:600,minWidth:90}}>Maison</th>
                <th style={{color:col,padding:"6px 8px",textAlign:"left",borderBottom:`1px solid ${K.border}`,fontSize:9,fontFamily:f,fontWeight:600,minWidth:120}}>Project context</th>
                <th style={{color:col,padding:"6px 8px",textAlign:"left",borderBottom:`1px solid ${K.border}`,fontSize:9,fontFamily:f,fontWeight:600,minWidth:100}}>Source</th>
                <th style={{color:col,padding:"6px 8px",textAlign:"left",borderBottom:`1px solid ${K.border}`,fontSize:9,fontFamily:f,fontWeight:600,minWidth:100}}>Target</th>
                <th style={{color:col,padding:"6px 8px",textAlign:"left",borderBottom:`1px solid ${K.border}`,fontSize:9,fontFamily:f,fontWeight:600,minWidth:90}}>Method</th>
                <th style={{color:col,padding:"6px 8px",textAlign:"left",borderBottom:`1px solid ${K.border}`,fontSize:9,fontFamily:f,fontWeight:600,minWidth:80}}>Recon. key</th>
                <th style={{color:col,padding:"6px 8px",textAlign:"center",borderBottom:`1px solid ${K.border}`,fontSize:9,fontFamily:f,fontWeight:600,minWidth:80}}>Confidence</th>
                <th style={{color:K.red,padding:"6px 8px",textAlign:"left",borderBottom:`1px solid ${K.border}`,fontSize:9,fontFamily:f,fontWeight:600,minWidth:140}}>Blockers</th>
              </tr></thead>
              <tbody>
                {MAISONS.flatMap(m=>(allAtelier[m]?.systemFlows||[]).filter(f=>f.sourceSystem||f.targetSystem).map((flow,i)=>{
                  const conf=CONFIDENCE_LEVELS.find(l=>l.v===flow.confidence);
                  return(
                    <tr key={`${m}-${i}`} style={{background:i%2===0?K.alt:K.card,borderBottom:`1px solid ${K.border}`}}>
                      <td style={{padding:"6px 8px",color:K.text,fontSize:10,fontFamily:f,fontWeight:600,whiteSpace:"nowrap"}}>{m}</td>
                      <td style={{padding:"6px 8px",color:K.sub,fontSize:10,fontFamily:f,fontStyle:"italic"}}>{flow.project||"—"}</td>
                      <td style={{padding:"6px 8px",color:K.text,fontSize:10,fontFamily:f,fontWeight:600}}>{flow.sourceSystem||"—"}</td>
                      <td style={{padding:"6px 8px",color:K.text,fontSize:10,fontFamily:f,fontWeight:600}}>{flow.targetSystem||"—"}</td>
                      <td style={{padding:"6px 8px",color:K.sub,fontSize:10,fontFamily:f}}>{flow.method||"—"}</td>
                      <td style={{padding:"6px 8px",color:K.sub,fontSize:10,fontFamily:f}}>{flow.reconciliationKey||"—"}</td>
                      <td style={{padding:"6px 8px",textAlign:"center"}}>{conf?<Tag c={conf.col}>{conf.label.split(" &")[0].split(" /")[0]}</Tag>:<span style={{color:K.muted,fontSize:10}}>—</span>}</td>
                      <td style={{padding:"6px 8px",color:flow.blockers?K.red:K.muted,fontSize:10,fontFamily:f}}>{flow.blockers||"—"}</td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
          {/* Confidence summary */}
          <div style={{display:"flex",gap:10,marginTop:12,flexWrap:"wrap"}}>
            {CONFIDENCE_LEVELS.map(lvl=>{
              const count=MAISONS.flatMap(m=>allAtelier[m]?.systemFlows||[]).filter(f=>f.confidence===lvl.v).length;
              return(<div key={lvl.v} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:5,background:K.card,border:`1px solid ${count>0?lvl.col+"55":K.border}`}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:lvl.col}}/>
                <span style={{color:K.text,fontSize:10,fontFamily:f}}>{lvl.label}</span>
                <Tag c={lvl.col}>{count}</Tag>
              </div>);
            })}
          </div>
        </Card>
      )}

      {/* Initiatives library */}
      {Object.keys(allAtelier).some(m=>(allAtelier[m]?.initiatives||[]).length>0)&&(
        <Card>
          <SecHead col={col}>Initiatives Library · All Maisons</SecHead>
          {/* Scalable initiatives first */}
          {MAISONS.flatMap(m=>(allAtelier[m]?.initiatives||[]).map(init=>({...init,maison:m}))).filter(init=>init.scalability==="yes"||init.scalability==="partial").length>0&&(
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <div style={{width:2,height:14,background:K.green}}/>
                <span style={{color:K.green,fontSize:10,fontWeight:600,fontFamily:f,letterSpacing:1,textTransform:"uppercase"}}>Scalable to Group — priority for replication</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {MAISONS.flatMap(m=>(allAtelier[m]?.initiatives||[]).map(init=>({...init,maison:m}))).filter(init=>init.scalability==="yes"||init.scalability==="partial").map((init,i)=>{
                  const st=INITIATIVE_STATUS.find(s=>s.v===init.status);
                  const sc=SCALABILITY_OPTS.find(s=>s.v===init.scalability);
                  return(
                    <div key={i} style={{background:K.bg,borderRadius:8,border:`1.5px solid ${K.green}`,padding:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                        <div>
                          <div style={{color:K.text,fontSize:12,fontWeight:700,fontFamily:fs,marginBottom:3}}>{init.name||"Unnamed initiative"}</div>
                          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                            <Tag c={col}>{init.maison}</Tag>
                            {st&&<Tag c={st.col}>{st.label}</Tag>}
                            {init.regulation&&<Tag c={K.muted}>{init.regulation}</Tag>}
                          </div>
                        </div>
                        {sc&&<Tag c={sc.col}>{sc.label.split(" —")[0]}</Tag>}
                      </div>
                      {init.objective&&<div style={{color:K.sub,fontSize:10,fontFamily:f,marginBottom:6,fontStyle:"italic"}}>{init.objective}</div>}
                      {init.solution&&<div style={{color:K.text,fontSize:10,fontFamily:f,marginBottom:6}}><strong>Solution:</strong> {init.solution}</div>}
                      {init.scaleConditions&&(
                        <div style={{background:K.green+"14",borderRadius:5,padding:"6px 10px",border:`1px solid ${K.green}44`}}>
                          <div style={{color:K.green,fontSize:9,fontFamily:f,fontWeight:600,marginBottom:2}}>Conditions to replicate</div>
                          <div style={{color:K.text,fontSize:10,fontFamily:f}}>{init.scaleConditions}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* All other initiatives */}
          <div style={{borderTop:`1px solid ${K.border}`,paddingTop:14}}>
            <div style={{color:K.muted,fontSize:9,letterSpacing:.8,textTransform:"uppercase",fontFamily:f,marginBottom:10}}>All initiatives by Maison</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {MAISONS.flatMap(m=>(allAtelier[m]?.initiatives||[]).map(init=>({...init,maison:m}))).filter(init=>init.name||init.description).map((init,i)=>{
                const st=INITIATIVE_STATUS.find(s=>s.v===init.status);
                const sc=SCALABILITY_OPTS.find(s=>s.v===init.scalability);
                return(
                  <div key={i} style={{display:"flex",gap:10,padding:"10px 12px",background:i%2===0?K.alt:K.card,borderRadius:6,border:`1px solid ${K.border}`,flexWrap:"wrap"}}>
                    <div style={{flex:"0 0 90px"}}><Tag c={col}>{init.maison}</Tag></div>
                    <div style={{flex:2,minWidth:180}}>
                      <div style={{color:K.text,fontSize:11,fontWeight:600,fontFamily:f,marginBottom:2}}>{init.name||"—"}</div>
                      {init.description&&<div style={{color:K.muted,fontSize:9,fontFamily:f,fontStyle:"italic",lineHeight:1.4}}>{init.description.slice(0,120)}{init.description.length>120?"…":""}</div>}
                    </div>
                    <div style={{flex:1,minWidth:120,display:"flex",flexDirection:"column",gap:4}}>
                      {st&&<Tag c={st.col}>{st.label}</Tag>}
                      {init.regulation&&<Tag c={K.muted}>{init.regulation}</Tag>}
                      {init.solution&&<div style={{color:K.sub,fontSize:9,fontFamily:f}}>{init.solution}</div>}
                    </div>
                    {sc&&<div style={{flex:"0 0 80px"}}><Tag c={sc.col}>{sc.label.split(" —")[0]}</Tag></div>}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Heatmap */}
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
          <div style={{color:col,fontSize:10,fontWeight:600,letterSpacing:1.6,textTransform:"uppercase",fontFamily:f}}>Maturity Heatmap</div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <span style={{color:K.muted,fontSize:9,fontFamily:f,fontStyle:"italic"}}>Auto-suggested from Phase 2</span>
            <Btn onClick={applyAllAuto} solid col={K.mid} s={{fontSize:9}}>Apply all auto-suggestions</Btn>
          </div>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{borderCollapse:"collapse",width:"100%",fontSize:10,minWidth:700}}>
            <thead><tr>
              <th style={{color:K.muted,padding:"6px 10px",textAlign:"left",borderBottom:`1px solid ${K.border}`,fontSize:9,fontFamily:f,fontWeight:600,minWidth:130}}>Maison</th>
              {MAT_DIMS.map(d=><th key={d} style={{color:col,padding:"6px 7px",textAlign:"center",borderBottom:`1px solid ${K.border}`,fontSize:9,fontFamily:f,fontWeight:600,minWidth:84}}>{d}</th>)}
              <th style={{color:K.muted,padding:"6px 7px",textAlign:"center",borderBottom:`1px solid ${K.border}`,fontSize:9,fontFamily:f,minWidth:40}}>Avg</th>
              <th style={{color:K.muted,padding:"6px 7px",textAlign:"center",borderBottom:`1px solid ${K.border}`,fontSize:9,fontFamily:f,minWidth:56}}>Auto</th>
            </tr></thead>
            <tbody>
              {MAISONS.map((m,ri)=>{
                const row=data.heatmap[m]||{};
                const autoRow=computeAutoRow(m);
                const vals=MAT_DIMS.map(d=>row[d]??-1);
                const filled=vals.filter(v=>v>=0);
                const avg=filled.length?(filled.reduce((a,b)=>a+b,0)/filled.length).toFixed(1):"—";
                const hasAuto=Object.values(autoRow).some(v=>v>=0);
                return(
                  <tr key={m} style={{background:ri%2===0?K.alt:K.card}}>
                    <td style={{padding:"7px 10px",color:K.text,fontWeight:600,fontSize:10,fontFamily:f,whiteSpace:"nowrap"}}>{m}</td>
                    {MAT_DIMS.map(d=>{
                      const v=row[d]??-1;
                      const av=autoRow[d]??-1;
                      const rc=v>=0?ragCols[v]:K.border;
                      const arc=av>=0?ragCols[av]:null;
                      return(<td key={d} style={{padding:"4px 4px",textAlign:"center"}}>
                        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                          <button onClick={()=>{const next={...data.heatmap,[m]:{...(data.heatmap[m]||{}),[d]:v<2?v+1:-1}};upd({heatmap:next});}}
                            style={{width:72,height:26,borderRadius:4,background:v>=0?rc+"1a":K.card,border:`1.5px solid ${rc}`,color:v>=0?rc:K.muted,fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:f,transition:"all .12s"}}>
                            {v>=0?ragLabels[v]:"·"}
                          </button>
                          {arc&&v<0&&(
                            <span style={{color:arc,fontSize:7,fontFamily:f,cursor:"pointer"}} onClick={()=>{const next={...data.heatmap,[m]:{...(data.heatmap[m]||{}),[d]:av}};upd({heatmap:next});}}>
                              → {ragLabels[av]}
                            </span>
                          )}
                        </div>
                      </td>);
                    })}
                    <td style={{padding:"4px 7px",textAlign:"center",color:parseFloat(avg)>=2?K.green:parseFloat(avg)>=1?K.gold:K.muted,fontWeight:700,fontSize:13,fontFamily:fs}}>{avg}</td>
                    <td style={{padding:"4px 7px",textAlign:"center"}}>
                      {hasAuto?(<button onClick={()=>applyAutoRow(m)} style={{background:"transparent",border:`1px solid ${K.mid}`,borderRadius:4,color:K.mid,cursor:"pointer",fontSize:8,padding:"3px 7px",fontFamily:f,whiteSpace:"nowrap"}}>Apply</button>)
                        :<span style={{color:K.muted,fontSize:9}}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{color:K.muted,fontSize:9,fontFamily:f,marginTop:8,fontStyle:"italic"}}>
          Click cell to cycle · → Low → Medium → Advanced → · &nbsp;|&nbsp; Arrows = auto-suggested, click to apply
        </div>
      </Card>

      {/* Decision matrix */}
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
          <div style={{color:col,fontSize:10,fontWeight:600,letterSpacing:1.6,textTransform:"uppercase",fontFamily:f}}>Decision Matrix · Group Ambition</div>
          <Btn onClick={()=>{const scores=computeDecision(allAtelier);if(scores)upd({decision:scores});}} s={{fontSize:9,borderColor:K.mid,color:K.mid}}>
            Recalculate from data
          </Btn>
        </div>
        <div style={{padding:"8px 12px",background:K.panel,borderRadius:6,border:`1px solid ${K.border}`,marginBottom:12}}>
          <div style={{color:K.muted,fontSize:9,fontFamily:f,fontStyle:"italic",lineHeight:1.6}}>
            Scores are auto-computed from Phase 2 workshop answers. You can override any score manually. Click "Recalculate" to re-sync with latest data.
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
          {DECISION_CRITERIA.map((crit,i)=>(
            <div key={crit.label} style={{background:K.bg,borderRadius:6,padding:"8px 10px",border:`1px solid ${K.border}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <Lbl col={K.text} size={10} s={{flex:1}}>{crit.label}</Lbl>
                <Tag c={K.mid}>{Math.round(crit.w*100)}%</Tag>
                <Stars val={data.decision[i]||3} onChange={v=>upd({decision:{...data.decision,[i]:v}})} col={col}/>
              </div>
              <div style={{color:K.muted,fontSize:8,fontFamily:f,marginTop:4,fontStyle:"italic"}}>
                {CRITERION_SOURCES[i]}
              </div>
            </div>
          ))}
        </div>
        <div style={{background:K.panel,borderRadius:6,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,border:`1px solid ${K.border}`}}>
          <Lbl col={K.muted}>Weighted score</Lbl>
          <span style={{color:col,fontSize:20,fontWeight:700,fontFamily:fs}}>{decScore.toFixed(2)} <span style={{color:K.muted,fontSize:12,fontFamily:f}}>/ 5</span></span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
          {recoOpts.map((opt,idx)=>(
            <div key={opt.label} style={{padding:14,borderRadius:7,background:idx===reco?opt.c+"0f":K.bg,border:`1.5px solid ${idx===reco?opt.c:K.border}`,transition:"all .3s"}}>
              <div style={{color:idx===reco?opt.c:K.muted,fontSize:11,fontWeight:600,fontFamily:fs,marginBottom:3}}>{opt.label}</div>
              <div style={{color:K.muted,fontSize:9,fontFamily:f}}>{opt.desc}</div>
              {idx===reco&&<div style={{color:opt.c,fontSize:10,marginTop:8,fontWeight:600}}>← Recommended</div>}
            </div>
          ))}
        </div>
        <Tx value={data.synthesis} onChange={e=>upd({synthesis:e.target.value})} placeholder="Synthesis note: key findings, recommendations, Group next steps…" h={90}/>
      </Card>
    </div>
  );
}


// ─── ROOT ────────────────────────────────────────────────────────────────────
export default function App(){
  const [phase,setPhase]=useState("pre");
  const [maison,setMaison]=useState("Gucci");
  const [key,setKey]=useState(0);
  const cur=PHASES.find(p=>p.id===phase);

  return(
    <div style={{minHeight:"100vh",background:K.bg,fontFamily:f,color:K.text}}>
      {/* Header */}
      <div style={{background:K.card,borderBottom:`1px solid ${K.border}`,padding:"14px 24px"}}>
        <div style={{maxWidth:980,margin:"0 auto",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          {/* Logo area */}
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{display:"flex",flexDirection:"column"}}>
              <span style={{color:K.text,fontSize:14,fontWeight:600,letterSpacing:3,fontFamily:f,textTransform:"uppercase"}}>Kering</span>
              <span style={{color:K.muted,fontSize:9,letterSpacing:1.5,fontFamily:f,textTransform:"uppercase",marginTop:1}}>DPP Assessment</span>
            </div>
            <div style={{width:1,height:28,background:K.border}}/>
            <span style={{color:K.sub,fontSize:11,fontFamily:f}}>Product Regulatory Maturity</span>
          </div>
          <div style={{flex:1}}/>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            {PHASES.map(p=>(
              <button key={p.id} onClick={()=>setPhase(p.id)}
                style={{padding:"6px 14px",borderRadius:20,fontSize:10,fontWeight:600,cursor:"pointer",background:phase===p.id?p.col+"1a":"transparent",border:`1px solid ${phase===p.id?p.col:K.border}`,color:phase===p.id?p.col:K.muted,transition:"all .15s",fontFamily:f,letterSpacing:.3}}>
                {p.label}
              </button>
            ))}
            <DataPanel onImported={()=>setKey(k=>k+1)}/>
          </div>
        </div>
      </div>

      {/* Sub-header */}
      <div style={{background:K.panel,borderBottom:`1px solid ${K.border}`,padding:"8px 24px"}}>
        <div style={{maxWidth:980,margin:"0 auto",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{color:cur.col,fontSize:10,fontWeight:600,fontFamily:f,letterSpacing:.3}}>{cur.sub}</span>
          <div style={{width:1,height:12,background:K.border}}/>
          {phase!=="synthese"?(
            <>
              <span style={{color:K.muted,fontSize:10,fontFamily:f}}>Maison:</span>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {MAISONS.map(m=>(
                  <button key={m} onClick={()=>setMaison(m)}
                    style={{padding:"3px 10px",borderRadius:12,fontSize:9,fontWeight:maison===m?600:400,cursor:"pointer",background:maison===m?cur.col+"1a":"transparent",border:`1px solid ${maison===m?cur.col:K.border}`,color:maison===m?cur.col:K.muted,fontFamily:f,transition:"all .12s"}}>
                    {m}
                  </button>
                ))}
              </div>
            </>
          ):(
            <span style={{color:K.muted,fontSize:10,fontFamily:f,fontStyle:"italic"}}>Consolidated view — workshop data aggregated across all Maisons</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div key={key} style={{maxWidth:980,margin:"0 auto",padding:"24px 16px 48px"}}>
        {phase==="pre"&&<Phase1 key={maison} maison={maison} col={cur.col}/>}
        {phase==="atelier"&&<Phase2 key={maison} maison={maison} col={cur.col}/>}
        {phase==="synthese"&&<Phase3 col={cur.col}/>}

        <div style={{display:"flex",justifyContent:"space-between",marginTop:24,paddingTop:16,borderTop:`1px solid ${K.border}`}}>
          {PHASES.findIndex(p=>p.id===phase)>0&&(
            <Btn onClick={()=>setPhase(PHASES[PHASES.findIndex(p=>p.id===phase)-1].id)}>← Previous</Btn>
          )}
          <div style={{flex:1}}/>
          {PHASES.findIndex(p=>p.id===phase)<PHASES.length-1&&(
            <Btn onClick={()=>setPhase(PHASES[PHASES.findIndex(p=>p.id===phase)+1].id)} solid col={cur.col}>Next →</Btn>
          )}
        </div>
      </div>
    </div>
  );
}
