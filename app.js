const app = document.getElementById("app");
let state = { aos:[], institutions:[], ao:null, page:"login", step:1, form:{}, photos:[], gps:null, visits:[], query:"", detail:null };

const esc = s => String(s??"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const api = async (url, opts={}) => {
  const r = await fetch(url, opts);
  const d = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error||"Terjadi kesalahan.");
  return d;
};
const fmtDate = d => d ? new Date(d+"T00:00:00").toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}) : "-";

function shell(content, title="Visit AO"){
  return `<div class="shell"><header class="topbar"><div class="brand">Visit AO <small>Internal Bank • PNS/ASN</small></div>
    <div class="actions">
      ${state.ao ? `<span class="small muted">${esc(state.ao.name)}</span>`:""}
      <button class="iconbtn" onclick="toggleTheme()" title="Mode terang/gelap">☼/☾</button>
      ${state.ao ? `<button class="secondary" onclick="logout()">Keluar</button>`:""}
    </div></header><main class="container">${content}</main></div>`;
}
function render(){ app.innerHTML = state.page==="login" ? loginView() : shell(state.page==="dashboard"?dashboardView():state.page==="history"?historyView():state.page==="detail"?detailView():state.page==="form"?formView():state.page==="success"?successView():ownerView()); }

function loginView(){
  return `<div class="container"><div class="hero"><h1>Visit AO</h1><p>Dokumentasi, monitoring, dan pengelolaan kunjungan calon debitur PNS/ASN.</p></div>
  <div class="card"><h2>Pilih akun AO</h2><p class="muted small">12 akun dummy untuk uji coba. Tidak ada data nasabah asli.</p><div class="grid ao-grid">
    ${state.aos.map(a=>`<div class="card ao-card"><div><div class="ao-name">${esc(a.name)}</div><div class="ao-branch">${esc(a.branch)}</div><div class="small muted">${esc(a.id)}</div></div><button class="primary" onclick="selectAO('${a.id}')">Masuk</button></div>`).join("")}
  </div></div>
  <a class="primary wide" style="display:block;text-align:center;text-decoration:none" href="/api/export/all">Unduh Excel SEMUA AO</a>
  <button class="secondary wide" onclick="state.page='owner';render()">Pemilik Aplikasi</button>
  </div>`;
}
async function selectAO(id){ state.ao=state.aos.find(a=>a.id===id); state.page="dashboard"; await refreshDashboard(); render(); }
function logout(){ state.ao=null;state.page="login";state.detail=null;render(); }
function toggleTheme(){ document.documentElement.dataset.theme = document.documentElement.dataset.theme==="dark"?"light":"dark"; localStorage.theme=document.documentElement.dataset.theme; }
if(localStorage.theme) document.documentElement.dataset.theme=localStorage.theme;

async function refreshDashboard(){ state.dashboard=await api(`/api/dashboard/${state.ao.id}`); }
function dashboardView(){
  const d=state.dashboard||{total:0,month:0,success:0,fail:0,latest:[]};
  return `<div class="hero"><h1>Beranda</h1><p>${esc(state.ao.name)} • ${esc(state.ao.branch)}</p></div>
  <div class="nav"><button class="primary" onclick="openForm()">+ Kunjungan Baru</button><button class="secondary" onclick="goHistory()">Riwayat</button></div>
  <div class="grid dashboard-grid">
    ${[['Total kunjungan',d.total],['Kunjungan bulan ini',d.month],['Berhasil booking',d.success],['Tidak berhasil booking',d.fail]].map(x=>`<div class="card stat"><div class="label">${x[0]}</div><div class="value">${x[1]}</div></div>`).join("")}
  </div>
  <div class="card" style="margin-top:14px"><h3>Kunjungan terakhir</h3>${d.latest.length?`<div class="list">${d.latest.map(v=>`<div class="listitem" onclick="openDetail('${v.visit_id}')"><div><b>${esc(v.debtor_name)}</b><div class="small muted">${fmtDate(v.visit_date)} • ${esc(v.institution||"-")}</div></div><span class="badge">${esc(v.booking_status)}</span></div>`).join("")}</div>`:`<div class="empty">Belum ada kunjungan.</div>`}</div>`;
}

function openForm(){ state.page="form";state.step=1;state.form={ao_id:state.ao.id,ao_name:state.ao.name,branch:state.ao.branch};state.photos=[];state.gps=null;render(); }
function formView(){
 const f=state.form, s=state.step;
 const steps=["Informasi kunjungan","Calon debitur","Dinas/instansi","Kebutuhan & potensi","Foto & GPS","Hasil & follow-up","Review"];
 return `<div class="hero"><h1>Form Kunjungan</h1><p>Lengkapi 7 langkah. Data tersimpan permanen setelah Submit.</p></div>
 <div class="stepper">${steps.map((x,i)=>`<div class="step ${i+1<=s?'active':''}" title="${x}"></div>`).join("")}</div>
 <div class="progress-text">Langkah ${s} dari 7 — ${steps[s-1]}</div>
 <form id="visitForm" class="card" onsubmit="event.preventDefault();nextStep()">
 ${stepContent(s)}
 </form><div class="footerbar"><button class="secondary" onclick="${s===1?'logout()':'prevStep()'}">${s===1?'Batal':'Kembali'}</button><button class="primary" onclick="nextStep()">${s===7?'Submit':'Lanjut'}</button></div>`;
}
function input(name,label,type="text",required=false,extra=""){
 return `<div class="field"><label>${label}${required?` <span class="required">*</span>`:""}</label><input name="${name}" type="${type}" ${required?"required":""} value="${esc(state.form[name]||"")}" ${extra}></div>`;
}
function select(name,label,opts,required=false){
 return `<div class="field"><label>${label}${required?` <span class="required">*</span>`:""}</label><select name="${name}" ${required?"required":""}><option value="">Pilih...</option>${opts.map(o=>`<option ${state.form[name]===o?'selected':''}>${esc(o)}</option>`).join("")}</select></div>`;
}
function stepContent(s){
 const f=state.form;
 if(s===1) return `<div class="form-grid two">${input("visit_date","Tanggal kunjungan","date",true)}${input("visit_time","Jam","time")}${input("purpose","Tujuan kunjungan","text",true)}${input("notes","Catatan awal","text")}</div><button type="button" class="secondary wide" onclick="fillDummy()">Isi data dummy</button>`;
 if(s===2) return `<div class="form-grid two">${input("debtor_name","Nama calon debitur","text",true)}${input("nik","NIK","text",false,'inputmode="numeric" maxlength="16"')}${input("debtor_address","Alamat","text",true)}${input("debtor_position","Jabatan","text",true)}${input("phone","No. HP","tel",false)}</div>`;
 if(s===3) return `<div class="form-grid two"><div class="field"><label>Dinas/instansi <span class="required">*</span></label><input list="institutions" name="institution" value="${esc(f.institution||"")}" required placeholder="Ketik untuk mencari"><datalist id="institutions">${state.institutions.map(x=>`<option value="${esc(x)}">`).join("")}</datalist></div>${select("institution_type","Jenis instansi",["Pemerintah daerah","Kementerian/lembaga","BUMN/BUMD","Lainnya"],false)}</div>`;
 if(s===4) return `<div class="form-grid two">${input("need","Kebutuhan utama","text",true)}${select("potential","Potensi debitur",["Rendah","Sedang","Tinggi"],true)}${select("product","Produk yang diminati",["Kredit Multiguna","Kredit Konsumtif","Kredit Payroll","Kredit Investasi","Tabungan","Lainnya"],true)}${input("funds","Estimasi dana/kebutuhan","text")}</div>`;
 if(s===5) return `<div class="field"><label>Foto kunjungan <span class="required">*</span> (1–3 foto JPG/PNG)</label><input id="photos" type="file" accept="image/jpeg,image/png" capture="environment" multiple onchange="previewPhotos(event)"><div id="photoPreview" class="photo-grid" style="margin-top:8px">${state.photos.map(p=>`<img src="${p.preview}">`).join("")}</div><div class="small muted">Kamera diprioritaskan di HP. Foto dikompresi otomatis sebelum dikirim.</div></div>
 <div class="card" style="margin-top:14px"><b>Lokasi GPS</b><p class="small muted">Lokasi wajib. Jika izin ditolak, data tidak boleh dilanjutkan dan tidak dibuat lokasi palsu.</p><div id="gpsBox">${state.gps?`<div class="alert ok">GPS tersimpan: ${state.gps.latitude.toFixed(6)}, ${state.gps.longitude.toFixed(6)}</div>`:`<div class="alert">Belum ada lokasi.</div>`}</div><button type="button" class="secondary" onclick="getGPS()">Ambil lokasi saya</button></div>`;
 if(s===6) return `<div class="form-grid two">${select("visit_status","Status hasil kunjungan",["Prospek tertarik","Prospek perlu pertimbangan","Tidak tertarik","Tidak bertemu"],true)}${select("interest","Tingkat ketertarikan",["Tinggi","Sedang","Rendah","Tidak tertarik"],true)}${input("follow_up","Rencana follow-up","text",true)}${input("follow_up_date","Tanggal follow-up","date")}</div><div class="field" style="margin-top:12px"><label>Catatan</label><textarea name="notes">${esc(f.notes||"")}</textarea></div>`;
 if(s===7) return `<div class="alert">Periksa seluruh data sebelum submit. Setelah Submit, data masuk database permanen.</div>${reviewBlock()}`;
}
function reviewBlock(){
 const f=state.form;
 const pairs=[["AO",f.ao_name],["Cabang",f.branch],["Tanggal",f.visit_date],["Calon debitur",f.debtor_name],["NIK",f.nik?maskNik(f.nik):"-"],["Alamat",f.debtor_address],["Jabatan",f.debtor_position],["Dinas/instansi",f.institution],["Kebutuhan",f.need],["Potensi",f.potential],["Produk",f.product],["Dana",f.funds],["Status kunjungan",f.visit_status],["Ketertarikan",f.interest],["Follow-up",f.follow_up],["GPS",state.gps?`${state.gps.latitude.toFixed(6)}, ${state.gps.longitude.toFixed(6)}`:"Belum ada"]];
 return `<dl class="detail">${pairs.map(x=>`<div><dt>${x[0]}</dt><dd>${esc(x[1]||"-")}</dd></div>`).join("")}</dl><div class="small muted" style="margin-top:10px">Foto: ${state.photos.length} file</div>`;
}
function maskNik(n){let d=String(n).replace(/\D/g,"");return d.length>=6?`${d.slice(0,2)}********${d.slice(-4)}`:"••••••";}
function collectForm(){ const fd=new FormData(document.getElementById("visitForm")); for(const [k,v] of fd.entries()) state.form[k]=v; }
function validateStep(){
 const f=state.form;
 if(state.step===2 && (!f.debtor_name||!f.debtor_address||!f.debtor_position)) return "Nama, alamat, dan jabatan wajib diisi.";
 if(state.step===3 && !f.institution) return "Dinas/instansi wajib dipilih.";
 if(state.step===4 && (!f.need||!f.potential||!f.product)) return "Kebutuhan, potensi, dan produk wajib diisi.";
 if(state.step===5 && (state.photos.length<1||state.photos.length>3)) return "Foto kunjungan wajib 1–3.";
 if(state.step===5 && !state.gps) return "GPS wajib direkam.";
 if(state.step===6 && (!f.visit_status||!f.interest||!f.follow_up)) return "Hasil, ketertarikan, dan follow-up wajib diisi.";
 return null;
}
function nextStep(){
 collectForm(); const err=validateStep(); if(err){alert(err);return;}
 if(state.step<7){state.step++;render();} else submitVisit();
}
function prevStep(){collectForm();state.step--;render();}
function fillDummy(){
 const today=new Date().toISOString().slice(0,10);
 Object.assign(state.form,{visit_date:today,visit_time:"09:30",purpose:"Penjajakan kebutuhan pembiayaan ASN",
 debtor_name:"Budi Setiawan (DUMMY)",nik:"3273010101900001",debtor_address:"Jl. Contoh No. 10, Bandung",
 debtor_position:"Analis Kepegawaian",phone:"081234567890",institution:state.institutions[0],
 institution_type:"Pemerintah daerah",need:"Kebutuhan pembiayaan renovasi rumah",
 potential:"Tinggi",product:"Kredit Multiguna",funds:"Rp250.000.000",visit_status:"Prospek tertarik",
 interest:"Tinggi",follow_up:"Kirim simulasi dan jadwal follow-up",follow_up_date:today});
 render();
}
function previewPhotos(e){
 const files=[...e.target.files].slice(0,3);
 if(e.target.files.length>3) alert("Maksimal 3 foto. Hanya 3 pertama yang dipakai.");
 state.photos=[];
 files.forEach(file=>{
   const img=new Image(), reader=new FileReader();
   reader.onload=ev=>{img.onload=()=>{const max=1280,scale=Math.min(1,max/img.width),c=document.createElement("canvas");c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext("2d").drawImage(img,0,0,c.width,c.height);c.toBlob(blob=>{state.photos.push({blob,preview:URL.createObjectURL(blob),name:file.name,type:"image/jpeg"});document.getElementById("photoPreview").innerHTML=state.photos.map(p=>`<img src="${p.preview}">`).join("")},"image/jpeg",.78)};img.src=ev.target.result};reader.readAsDataURL(file);
 });
}
function getGPS(){
 if(!navigator.geolocation){alert("Perangkat/browser tidak mendukung GPS.");return;}
 const box=document.getElementById("gpsBox"); box.innerHTML=`<div class="alert">Meminta izin lokasi…</div>`;
 navigator.geolocation.getCurrentPosition(pos=>{state.gps={latitude:pos.coords.latitude,longitude:pos.coords.longitude};box.innerHTML=`<div class="alert ok">GPS tersimpan: ${state.gps.latitude.toFixed(6)}, ${state.gps.longitude.toFixed(6)}</div>`},err=>{box.innerHTML=`<div class="alert error">Izin lokasi ditolak/gagal. Tidak ada lokasi palsu yang dibuat. Aktifkan izin lokasi lalu coba lagi.</div>`},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}
async function submitVisit(){
 try{
   if(!state.gps||state.photos.length<1){alert("GPS dan minimal 1 foto wajib.");return;}
   const fd=new FormData();
   Object.entries(state.form).forEach(([k,v])=>fd.append(k,v??""));
   fd.append("latitude",state.gps.latitude);fd.append("longitude",state.gps.longitude);
   state.photos.forEach((p,i)=>fd.append("photos",p.blob,`kunjungan-${i+1}.jpg`));
   const r=await api("/api/visits",{method:"POST",body:fd});state.lastSubmitted=r;state.page="success";render();
 }catch(e){alert(e.message)}
}
function successView(){
 return `<div class="success card"><div style="font-size:46px">✓</div><h1>Submit berhasil</h1><p class="muted">Data kunjungan sudah tersimpan permanen.</p><div class="visitid">${esc(state.lastSubmitted.visit_id)}</div><span class="badge">Submitted</span><p class="small muted">Timestamp: ${new Date(state.lastSubmitted.created_at).toLocaleString("id-ID")}</p><button class="primary" onclick="goHistory()">Buka Riwayat</button> <button class="secondary" onclick="selectAO('${state.ao.id}')">Kembali ke Beranda</button></div>`;
}
async function goHistory(){state.page="history";state.query="";await loadHistory();render();}
async function loadHistory(){state.visits=await api(`/api/visits?aoId=${encodeURIComponent(state.ao.id)}&q=${encodeURIComponent(state.query)}`);}
function historyView(){
 return `<div class="hero"><h1>Riwayat Kunjungan</h1><p>Hanya kunjungan milik ${esc(state.ao.name)}.</p></div>
 <div class="nav"><button class="secondary" onclick="selectAO('${state.ao.id}')">Beranda</button><a class="primary" style="text-decoration:none" href="/api/export/ao/${encodeURIComponent(state.ao.id)}">Unduh Excel AO</a></div>
 <div class="card"><div class="searchrow"><input id="q" placeholder="Cari Visit ID, nama, dinas, produk…" value="${esc(state.query)}"><button class="primary" onclick="doSearch()">Cari</button></div>
 ${state.visits.length?`<div class="tablewrap"><table class="table"><thead><tr><th>Visit ID</th><th>Tanggal</th><th>Calon debitur</th><th>Dinas</th><th>Produk</th><th>Booking</th></tr></thead><tbody>${state.visits.map(v=>`<tr onclick="openDetail('${v.visit_id}')" style="cursor:pointer"><td>${esc(v.visit_id)}</td><td>${fmtDate(v.visit_date)}</td><td>${esc(v.debtor_name)}</td><td>${esc(v.institution)}</td><td>${esc(v.product)}</td><td>${esc(v.booking_status)}</td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">Belum ada data.</div>`}</div>`;
}
async function doSearch(){state.query=document.getElementById("q").value;await loadHistory();render();}
async function openDetail(id){state.detail=await api(`/api/visits/${encodeURIComponent(id)}`);state.page="detail";render();}
function detailView(){
 const v=state.detail;
 const pairs=[["Visit ID",v.visit_id],["Status", "Submitted"],["Timestamp",new Date(v.created_at).toLocaleString("id-ID")],["AO",v.ao_name],["Cabang",v.branch],["Tanggal",fmtDate(v.visit_date)],["Jam",v.visit_time],["Tujuan",v.purpose],["Calon debitur",v.debtor_name],["NIK",v.nik_masked],["Alamat",v.debtor_address],["Jabatan",v.debtor_position],["HP",v.phone],["Dinas/instansi",v.institution],["Jenis instansi",v.institution_type],["Kebutuhan",v.need],["Potensi",v.potential],["Produk",v.product],["Dana",v.funds],["Status kunjungan",v.visit_status],["Ketertarikan",v.interest],["Follow-up",v.follow_up],["Tanggal follow-up",v.follow_up_date],["Catatan",v.notes]];
 return `<div class="hero"><h1>Detail Kunjungan</h1><p>${esc(v.visit_id)}</p></div><div class="card"><dl class="detail">${pairs.map(x=>`<div><dt>${x[0]}</dt><dd>${esc(x[1]||"-")}</dd></div>`).join("")}</dl>
 <div style="margin-top:14px"><b>Foto kunjungan</b><div class="photo-grid" style="margin-top:8px">${(v.photos||[]).map(p=>`<img src="/uploads/${encodeURIComponent(p.filename)}" alt="Foto kunjungan">`).join("")}</div></div>
 <div style="margin-top:14px"><b>Lokasi</b><p>${v.latitude}, ${v.longitude}</p><a href="${esc(v.maps_url)}" target="_blank" rel="noopener">Buka Google Maps</a></div>
 <div class="card" style="margin-top:14px"><b>Status booking</b><p><span class="badge">${esc(v.booking_status)}</span></p>
 <div class="nav"><button class="primary" onclick="setBooking('Berhasil booking')">Ya, jadi</button><button class="danger" onclick="setBooking('Tidak berhasil booking')">Tidak jadi</button></div></div>
 </div><div class="footerbar"><button class="secondary" onclick="goHistory()">Kembali ke Riwayat</button></div>`;
}
async function setBooking(status){try{await api(`/api/visits/${encodeURIComponent(state.detail.visit_id)}/booking`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});state.detail=await api(`/api/visits/${encodeURIComponent(state.detail.visit_id)}`);render();}catch(e){alert(e.message)}}
function ownerView(){
 return `<div class="hero"><h1>Pemilik Aplikasi</h1><p>Area administrasi untuk mengosongkan database setelah data diunduh.</p></div>
 <div class="card"><div class="alert error"><b>Perhatian:</b> Reset akan menghapus seluruh kunjungan dan foto dari database aplikasi. Tindakan ini tidak dapat dibatalkan.</div>
 <div class="field"><label>Kunci pemilik</label><input id="ownerKey" type="password" placeholder="OWNER-2026 (ubah di environment)"></div>
 <div class="field" style="margin-top:10px"><label>Ketik RESET untuk konfirmasi</label><input id="resetConfirm" placeholder="RESET"></div>
 <button class="danger wide" onclick="resetAll()">Reset semua data</button><button class="secondary wide" onclick="state.page='login';render()">Kembali</button></div>`;
}
async function resetAll(){if(!confirm("Yakin menghapus SEMUA data?"))return;try{await api("/api/reset",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ownerKey:document.getElementById("ownerKey").value,confirmation:document.getElementById("resetConfirm").value})});alert("Semua data berhasil dihapus.");state.page="login";render();}catch(e){alert(e.message)}}

(async()=>{try{const b=await api("/api/bootstrap");state.aos=b.aos;state.institutions=b.institutions;render();}catch(e){app.innerHTML=`<div class="container"><div class="alert error">${esc(e.message)}</div></div>`}})();
