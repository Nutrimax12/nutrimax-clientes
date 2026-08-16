const SUPABASE_URL="https://fajnnxahxxtnmjvhyqej.supabase.co";
const SUPABASE_KEY="sb_publishable_3upfkXAjSy2gYE6BqVaWhQ_tu_3lfcX";
const KEY="nutrimax_clientes_v1";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let clients=[];
let deferredPrompt=null;
const $=id=>document.getElementById(id);

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("installBtn").classList.remove("hidden")});
$("installBtn").onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("installBtn").classList.add("hidden")};

async function save(){
const {error}=await sb.from("Clientes").upsert(clients.map(c=>({
  client_id:c.id,
  buyerName:c.buyerName,
  phone:c.phone,
  businessName:c.businessName,
  ciudad:c.city,
  address:c.address,
  neighborhood:c.neighborhood
})), { onConflict: 'client_id', ignoreDuplicates: false });
  if(error){console.error(error);toast("Error al guardar en Supabase");return}
  render();
}
async function loadClients(){
  const {data,error}=await sb
    .from("Clientes")
    .select("client_id,buyerName,phone,businessName,ciudad,address,neighborhood")
    .order("created_at",{ascending:false});

  if(error){
    console.error(error);
    toast("Error al cargar clientes");
    render();
    return;
  }

  clients=(data||[]).map(c=>({
    id:c.client_id,
    buyerName:c.buyerName||"",
    phone:c.phone||"",
    businessName:c.businessName||"",
    city:c.ciudad||"",
    address:c.address||"",
    neighborhood:c.neighborhood||""
  }));

  render();
}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function render(){
  const q=$("searchInput").value.trim().toLowerCase(), city=$("cityFilter").value;
  const cities=[...new Set(clients.map(c=>c.city.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
  $("cityFilter").innerHTML='<option value="">Todas las ciudades</option>'+cities.map(c=>`<option>${esc(c)}</option>`).join("");
  $("cityFilter").value=city;
  $("totalClients").textContent=clients.length;
  $("cityCount").textContent=cities.length;
  const filtered=clients.filter(c=>(!city||c.city===city)&&(!q||Object.values(c).some(v=>String(v).toLowerCase().includes(q))));
  $("emptyState").classList.toggle("hidden",clients.length>0);
  $("clientList").innerHTML=filtered.length?filtered.map(card).join(""):(clients.length?"<div class='empty'><h2>No encontramos resultados</h2><p>Prueba otra búsqueda.</p></div>":"");
}
function card(c){
 return `<article class="client-card">
   <div class="client-head"><h3>${esc(c.businessName)}</h3></div>
   <div class="client-meta">
     <b>Compras:</b> ${esc(c.buyerName)}<br>
     <b>Teléfono:</b> ${esc(c.phone)}<br>
     <b>Dirección:</b> ${esc(c.address)}<br>
     <b>Ubicación:</b> ${esc(c.city)}${c.neighborhood?" · "+esc(c.neighborhood):""}
   </div>
   <div class="client-actions">
     <button class="action call" onclick="callClient('${c.id}')">☎ Llamar</button>
     <button class="action edit" onclick="editClient('${c.id}')">✎ Editar</button>
     <button class="action delete" onclick="deleteClient('${c.id}')">Eliminar</button>
   </div>
 </article>`
}
function openModal(c=null){
 $("modalTitle").textContent=c?"Editar cliente":"Nuevo cliente";
 $("clientId").value=c?.id||"";
 $("businessName").value=c?.businessName||"";
 $("buyerName").value=c?.buyerName||"";
 $("phone").value=c?.phone||"";
 $("address").value=c?.address||"";
 $("city").value=c?.city||"";
 $("neighborhood").value=c?.neighborhood||"";
 $("modal").classList.remove("hidden");$("modal").setAttribute("aria-hidden","false");$("businessName").focus()
}
function closeModal(){$("modal").classList.add("hidden");$("modal").setAttribute("aria-hidden","true")}
$("newClientBtn").onclick=()=>openModal();$("emptyNewBtn").onclick=()=>openModal();$("closeModal").onclick=closeModal;$("cancelBtn").onclick=closeModal;
$("modal").addEventListener("click",e=>{if(e.target===$("modal"))closeModal()});
$("clientForm").onsubmit=e=>{
 e.preventDefault();
 const id=$("clientId").value||crypto.randomUUID();
 const data={id,businessName:$("businessName").value.trim(),buyerName:$("buyerName").value.trim(),phone:$("phone").value.trim(),address:$("address").value.trim(),city:$("city").value.trim(),neighborhood:$("neighborhood").value.trim()};
 const i=clients.findIndex(c=>c.id===id); if(i>=0) clients[i]=data; else clients.unshift(data);
 save();closeModal();toast(i>=0?"Cliente actualizado":"Cliente guardado");
};
function editClient(id){const c=clients.find(x=>x.id===id);if(c)openModal(c)}
async function deleteClient(id){
  const c=clients.find(x=>x.id===id);
  if(!c) return;

  if(!confirm(`¿Eliminar a ${c.businessName}?`)) return;

  const {data,error}=await sb
    .from("Clientes")
  .delete()
  .eq("client_id",id)
  .select();

  if(error){
    console.error(error);
    toast("Error al eliminar en Supabase");
    return;
  }
if(!data || data.length===0){
  console.error("No se encontró el cliente para eliminar. client_id:",id);
  toast("Supabase no encontró el cliente");
  return;
}
  clients=clients.filter(x=>x.id!==id);
  render();
  toast("Cliente eliminado");
}
function callClient(id){const c=clients.find(x=>x.id===id);if(c)window.location.href="tel:"+c.phone.replace(/[^\d+]/g,"")}
function toast(t){const el=$("toast");el.textContent=t;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2200)}
$("searchInput").oninput=render;$("cityFilter").onchange=render;
if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));
loadClients();
