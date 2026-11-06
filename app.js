const CATEGORIES=["Bonés","Acessórios","Camisetas","Caravanas","Calças","Shorts","Regatas","Sócio","Corta-vento","Moletons","Baby look — Tropa Feminina","Outros"];
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}, save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
let products=load("fm2_products",[]),cart=load("fm2_cart",[]),orders=load("fm2_orders",[]),settings=load("fm2_settings",{whatsapp:"",pickup:"Retirada a combinar em Maringá"});
let selectedProduct=null;
let memberDiscountActive=false;
let favorites=load("fm2_favorites",[]);
let showFavoritesOnly=false;
const money=n=>Number(n||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
function subtotalAmount(){return cart.reduce((a,x)=>a+Number(x.price||0)*Number(x.qty||0),0)}
function eligibleSubtotal(){return cart.filter(x=>!["Caravanas","Sócio"].includes(x.category)).reduce((a,x)=>a+Number(x.price||0)*Number(x.qty||0),0)}
function discountAmount(){return memberDiscountActive?eligibleSubtotal()*.10:0}
function totalAmount(){return Math.max(0,subtotalAmount()-discountAmount())}
function validCPF(value){
 const cpf=String(value||"").replace(/\D/g,"");
 if(cpf.length!==11||/^([0-9])\1{10}$/.test(cpf))return false;
 let sum=0;for(let i=0;i<9;i++)sum+=Number(cpf[i])*(10-i);
 let d1=(sum*10)%11;if(d1===10)d1=0;if(d1!==Number(cpf[9]))return false;
 sum=0;for(let i=0;i<10;i++)sum+=Number(cpf[i])*(11-i);
 let d2=(sum*10)%11;if(d2===10)d2=0;
 return d2===Number(cpf[10]);
}
function formatCPF(value){return value.replace(/\D/g,"").slice(0,11).replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2")}
function refreshTotals(){
 const subtotal=subtotalAmount(),discount=discountAmount(),total=totalAmount();
 $("#subtotal").textContent=money(subtotal);
 $("#discountValue").textContent="-"+money(discount);
 $("#discountRow").classList.toggle("hidden",!memberDiscountActive||discount<=0);
 $("#grandTotal").textContent=money(total);
 const summary=$("#checkoutSummary");
 if(summary)summary.innerHTML=`<span>${memberDiscountActive?"Desconto de sócio aplicado: 10%":"Total do pedido"}</span><strong>${money(total)}</strong>`;
}
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function notify(t){const x=$("#toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2600)}
function closeAll(){$$(".modal").forEach(x=>x.classList.remove("show"));$("#cartDrawer").classList.remove("open");$("#scrim").classList.remove("show")}
function showModal(id){closeAll();$("#scrim").classList.add("show");$("#"+id).classList.add("show")}
function showCart(){closeAll();$("#scrim").classList.add("show");$("#cartDrawer").classList.add("open");renderCart()}
function renderCategories(){
 $("#categoryGrid").innerHTML=CATEGORIES.map((c,i)=>`<button class="category-card" data-cat="${esc(c)}"><small>0${i+1} / FM</small><strong>${esc(c)}</strong><span>↗</span></button>`).join("");
 $("#filterCategory").innerHTML='<option value="">Todas as categorias</option>'+CATEGORIES.map(c=>`<option>${esc(c)}</option>`).join("");
 $("#adminCategory").innerHTML=CATEGORIES.map(c=>`<option>${esc(c)}</option>`).join("");
}
function photo(p){return p.image?`<img src="${p.image}" alt="${esc(p.name)}">`:'<div class="image-placeholder">FM</div>'}
function renderProducts(){
 let q=$("#search").value.toLowerCase().trim(),cat=$("#filterCategory").value,sort=$("#sortProducts").value;
 let list=products.filter(p=>(!cat||p.category===cat)&&(!q||(p.name+" "+p.category+" "+(p.description||"")).toLowerCase().includes(q)));
 if(showFavoritesOnly)list=list.filter(p=>favorites.includes(p.id));
 if(sort==="low")list.sort((a,b)=>a.price-b.price);if(sort==="high")list.sort((a,b)=>b.price-a.price);if(sort==="name")list.sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
 $("#favoriteCount").textContent=favorites.length===1?"1 item":`${favorites.length} itens`;
 $("#headerFavorites").classList.toggle("active",showFavoritesOnly);
 $("#productCountSummary").textContent=`${list.length} ${list.length===1?"ITEM":"ITENS"}`;
 $("#products").innerHTML=list.length?list.map(p=>`<article class="product-card" data-product="${p.id}"><div class="product-image">${photo(p)}<button class="favorite-toggle ${favorites.includes(p.id)?"is-favorite":""}" type="button" data-fav="${p.id}" aria-label="Favoritar ${esc(p.name)}">${favorites.includes(p.id)?"♥":"♡"}</button></div><div class="product-copy"><small class="product-category">${esc(p.category)}</small><h3>${esc(p.name)}</h3><div class="product-pricing"><b>${money(p.price)}</b><small>PRODUTO OFICIAL</small></div></div></article>`).join(""):`<div class="empty-products"><div class="symbol">✳</div><h3>${showFavoritesOnly?"Você ainda não favoritou produtos.":products.length?"Não encontramos esse produto.":"A coleção está sendo preparada."}</h3><p>${showFavoritesOnly?"Toque no coração de um produto para guardá-lo aqui.":products.length?"Tente outra busca ou categoria.":"Os produtos aparecerão aqui assim que forem cadastrados pela administração."}</p></div>`;
 renderAdminProducts();
}
function renderCart(){
 let count=cart.reduce((a,x)=>a+x.qty,0);
 $("#cartCount").textContent=count===1?"1 item":`${count} itens`;
 $("#headerCartTotal").textContent=money(subtotalAmount());
 $("#cartLines").innerHTML=cart.length?cart.map(x=>`<div class="cart-line"><div><b>${esc(x.name)}</b><small>${esc(x.variant||"Único")} · ${money(x.price)}</small></div><div class="qty"><button data-qty="${x.key}" data-d="-1">−</button><span>${x.qty}</span><button data-qty="${x.key}" data-d="1">+</button></div></div>`).join(""):'<p class="muted">Sua sacola está vazia.</p>';
 save("fm2_cart",cart);refreshTotals();
}
function addCart(p,variant,qty=1){let key=p.id+"_"+variant,old=cart.find(x=>x.key===key);if(old)old.qty+=qty;else cart.push({key,id:p.id,name:p.name,category:p.category||"",price:Number(p.price),variant,qty});renderCart();notify("Produto adicionado à sacola.")}
function showProduct(id){
 const p=products.find(x=>x.id===id);if(!p)return;selectedProduct=p;$("#modalProductName").textContent=p.name;
 let vars=(p.sizes||"Único").split(",").map(x=>x.trim()).filter(Boolean);
 $("#productDetail").innerHTML=`<div class="product-detail"><div class="product-image">${photo(p)}</div><div><h3>${esc(p.name)}</h3><b>${money(p.price)}</b><p>${esc(p.description||"Produto oficial Força Maringaense.")}</p><label>Escolha a variação<select id="variant">${vars.map(v=>`<option>${esc(v)}</option>`).join("")}</select></label><label>Quantidade<input id="quantity" type="number" min="1" max="${Math.max(1,Number(p.stock)||99)}" value="1"></label><button class="btn btn-dark full" id="addToBag">Adicionar à sacola</button></div></div>`;
 showModal("productModal");
}
function renderAdminProducts(){
 if(!$("#adminProducts"))return;
 $("#adminProducts").innerHTML=products.length?products.map(p=>`<div class="admin-row"><div><b>${esc(p.name)}</b><small>${esc(p.category)} · ${money(p.price)} · Estoque: ${p.stock}</small></div><div class="row-actions"><button data-edit="${p.id}">Editar</button><button data-delete="${p.id}">Excluir</button></div></div>`).join(""):'<p class="muted">Nenhum produto cadastrado ainda.</p>';
}
function resetProductForm(){let f=$("#productForm");f.reset();f.elements.id.value="";f.classList.add("hidden")}
function editProduct(id){let p=products.find(x=>x.id===id);if(!p)return;let f=$("#productForm");f.classList.remove("hidden");["id","name","category","price","stock","sizes","description"].forEach(k=>f.elements[k].value=p[k]??"");f.scrollIntoView({behavior:"smooth",block:"center"})}
function compressImage(file,cb){
 const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const max=1100,scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement("canvas");canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);cb(canvas.toDataURL("image/jpeg",.78))};img.src=reader.result};reader.readAsDataURL(file)
}
function renderOrders(){
 $("#adminOrders").innerHTML=orders.length?orders.map(o=>`<div class="admin-row"><div><b>${esc(o.id)} · ${esc(o.customer.name)}</b><small>${esc(o.created)} · ${money(o.total)}${o.discount>0?" · Sócio -10%":""}</small><small>${o.items.map(i=>`${i.qty}x ${esc(i.name)}`).join(" · ")}</small></div><select data-status="${o.id}" aria-label="Status do pedido"><option ${o.status==="Recebido"?"selected":""}>Recebido</option><option ${o.status==="Em separação"?"selected":""}>Em separação</option><option ${o.status==="Enviado"?"selected":""}>Enviado</option><option ${o.status==="Concluído"?"selected":""}>Concluído</option><option ${o.status==="Cancelado"?"selected":""}>Cancelado</option></select></div>`).join(""):'<p class="muted">Nenhum pedido registrado nesta demonstração.</p>';
}
function orderText(){
 let f=$("#checkoutForm"),d=Object.fromEntries(new FormData(f).entries());
 let lines=cart.map(x=>`• ${x.qty}x ${x.name} (${x.variant}) — ${money(x.price*x.qty)}`).join("\n");
 return `Olá! Quero fazer um pedido na Loja Força Maringaense.\n\nNome: ${d.name}\nWhatsApp: ${d.phone}\n\n${lines}\n\nSubtotal: ${money(subtotalAmount())}\n${memberDiscountActive?"Desconto de sócio (10%): -"+money(discountAmount())+"\n":""}Total: ${money(totalAmount())}\nEntrega: ${d.delivery}\n${d.address?"Endereço: "+d.address+"\n":""}Pagamento: ${d.payment}`;
}
function sendWhats(){
 if(!cart.length){notify("Sua sacola está vazia.");return}
 if(!settings.whatsapp){notify("Cadastre o WhatsApp oficial nas configurações.");return}
 if(!$("#checkoutForm").reportValidity())return;
 window.open("https://wa.me/"+settings.whatsapp+"?text="+encodeURIComponent(orderText()),"_blank","noopener");
}
function checkout(){if(!cart.length){notify("Adicione produtos à sacola primeiro.");return}showModal("checkoutModal")}
function saveOrder(e){
 e.preventDefault();if(!cart.length)return;
 const data=Object.fromEntries(new FormData(e.target).entries());
 const order={id:"FM-"+Date.now().toString().slice(-7),created:new Date().toLocaleString("pt-BR"),customer:data,items:[...cart],subtotal:subtotalAmount(),discount:discountAmount(),total:totalAmount(),memberDiscountApplied:memberDiscountActive,status:"Recebido"};
 orders.unshift(order);save("fm2_orders",orders);cart=[];memberDiscountActive=false;save("fm2_cart",cart);renderCart();renderOrders();e.target.reset();$("#memberCpf").value="";$("#memberStatus").textContent="O CPF será usado apenas para validação nesta demonstração.";$("#memberStatus").className="member-status";closeAll();notify("Pedido de demonstração registrado.");
}
function tab(name){$$(".tabs button").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));["products","orders","settings"].forEach(x=>$("#pane"+x[0].toUpperCase()+x.slice(1)).classList.toggle("hidden",x!==name))}
function init(){
 $("#year").textContent=new Date().getFullYear();renderCategories();renderProducts();renderCart();renderOrders();$("#whatsappNumber").value=settings.whatsapp||"";$("#pickupText").value=settings.pickup||"";
 $("#memberCpf").addEventListener("input",e=>{e.target.value=formatCPF(e.target.value)});
 $("#validateMember").addEventListener("click",()=>{
   const cpf=$("#memberCpf").value;
   if(!validCPF(cpf)){memberDiscountActive=false;$("#memberStatus").textContent="CPF inválido. Confira os números digitados.";$("#memberStatus").className="member-status error";refreshTotals();return}
   memberDiscountActive=true;
   $("#memberStatus").textContent="CPF com dígitos verificadores válidos. Desconto demonstrativo de 10% aplicado. Na loja publicada, o servidor confirmará se o CPF pertence a um sócio ativo e emitirá o benefício individual.";
   $("#memberStatus").className="member-status success";refreshTotals();
 });
 $("#floatingWhatsApp").addEventListener("click",()=>{
   if(!settings.whatsapp){notify("Informe o WhatsApp oficial em Administração → Configurações.");showModal("adminModal");tab("settings");return}
   window.open("https://wa.me/"+settings.whatsapp,"_blank","noopener");
 });
 $("#categoryGrid").addEventListener("click",e=>{let b=e.target.closest("[data-cat]");if(b){$("#filterCategory").value=b.dataset.cat;renderProducts();$("#colecao").scrollIntoView({behavior:"smooth"})}});
 $("#products").addEventListener("click",e=>{
   const fav=e.target.closest("[data-fav]");
   if(fav){e.stopPropagation();const id=fav.dataset.fav;favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];save("fm2_favorites",favorites);renderProducts();return;}
   let p=e.target.closest("[data-product]");if(p)showProduct(p.dataset.product);
 });
 $("#headerFavorites").addEventListener("click",()=>{
   showFavoritesOnly=!showFavoritesOnly;
   $("#filterCategory").value="";$("#search").value="";
   renderProducts();$("#colecao").scrollIntoView({behavior:"smooth"});
 });
 $("#search").addEventListener("input",renderProducts);$("#filterCategory").addEventListener("change",renderProducts);$("#sortProducts").addEventListener("change",renderProducts);
 $("#openCart").addEventListener("click",showCart);$("#checkoutButton").addEventListener("click",checkout);$("#cartWhatsapp").addEventListener("click",checkout);
 $("#scrim").addEventListener("click",closeAll);$$("[data-close]").forEach(b=>b.addEventListener("click",closeAll));
 $("#cartLines").addEventListener("click",e=>{let b=e.target.closest("[data-qty]");if(!b)return;let item=cart.find(x=>x.key===b.dataset.qty);if(!item)return;item.qty+=Number(b.dataset.d);if(item.qty<1)cart=cart.filter(x=>x!==item);renderCart()});
 $("#productDetail").addEventListener("click",e=>{if(e.target.id==="addToBag"&&selectedProduct){addCart(selectedProduct,$("#variant").value,Math.max(1,Number($("#quantity").value)||1));closeAll()}});
 $("#checkoutForm").addEventListener("submit",saveOrder);$("#sendWhatsApp").addEventListener("click",sendWhats);
 $("#openAdmin").addEventListener("click",()=>{showModal("adminModal");renderAdminProducts();renderOrders()});
 $("#addProduct").addEventListener("click",()=>{$("#productForm").classList.remove("hidden");$("#productForm").scrollIntoView({behavior:"smooth",block:"center"})});
 $("#cancelProduct").addEventListener("click",resetProductForm);
 $("#productForm").addEventListener("submit",e=>{
   e.preventDefault();let f=e.target,old=products.find(p=>p.id===f.elements.id.value),file=f.elements.image.files[0];
   const commit=image=>{let p={id:old?old.id:"fm"+Date.now(),name:f.elements.name.value.trim(),category:f.elements.category.value,price:Number(f.elements.price.value),stock:Number(f.elements.stock.value||0),sizes:f.elements.sizes.value.trim()||"Único",description:f.elements.description.value.trim(),image:image||old?.image||""};if(old)products=products.map(x=>x.id===old.id?p:x);else products.push(p);save("fm2_products",products);resetProductForm();renderProducts();notify("Produto salvo neste navegador.")};
   if(file)compressImage(file,commit);else commit("");
 });
 $("#adminProducts").addEventListener("click",e=>{let ed=e.target.closest("[data-edit]"),del=e.target.closest("[data-delete]");if(ed)editProduct(ed.dataset.edit);if(del&&confirm("Excluir este produto do catálogo?")){products=products.filter(p=>p.id!==del.dataset.delete);favorites=favorites.filter(id=>id!==del.dataset.delete);save("fm2_favorites",favorites);save("fm2_products",products);renderProducts();notify("Produto excluído.")}});
 $$(".tabs button").forEach(b=>b.addEventListener("click",()=>tab(b.dataset.tab)));
 $("#adminOrders").addEventListener("change",e=>{let id=e.target.dataset.status;if(!id)return;let o=orders.find(x=>x.id===id);if(o){o.status=e.target.value;save("fm2_orders",orders);notify("Status atualizado.")}});
 $("#saveSettings").addEventListener("click",()=>{settings={whatsapp:$("#whatsappNumber").value.replace(/\D/g,""),pickup:$("#pickupText").value.trim()};save("fm2_settings",settings);notify("Configurações salvas.")});
 $("#menuToggle").addEventListener("click",()=>$("#nav").classList.toggle("open"));
 $("#nav").addEventListener("click",e=>{
   const cat=e.target.closest("[data-nav-cat]");
   if(cat){$("#filterCategory").value=cat.dataset.navCat;renderProducts();$("#colecao").scrollIntoView({behavior:"smooth"});$("#nav").classList.remove("open");}
   if(e.target.closest("a"))$("#nav").classList.remove("open");
 });
 $("#headerSupport").addEventListener("click",()=>{
   if(!settings.whatsapp){notify("Configure o WhatsApp oficial em Administração → Configurações.");showModal("adminModal");tab("settings");return;}
   window.open("https://wa.me/"+settings.whatsapp,"_blank","noopener");
 });
 const heroSlides=[
   {eyebrow:"LOJA OFICIAL DA TORCIDA",title:"VISTA AS CORES.<br><em>CARREGUE A FORÇA.</em>",description:"A identidade da arquibancada acompanha você dentro e fora dos estádios. Encontre os produtos da Força Maringaense."},
   {eyebrow:"HONRA • RAÇA • COLETIVIDADE",title:"MAIS QUE UMA TORCIDA.<br><em>UMA IDENTIDADE.</em>",description:"Use as cores que representam nossa caminhada. Escolha suas peças e leve a Força com você."},
   {eyebrow:"VANTAGEM DE QUEM É DA FORÇA",title:"É SÓCIO?<br><em>VOCÊ TEM 10% OFF.</em>",description:"Associados ativos têm benefício especial nos produtos elegíveis. Consulte sua condição na área do sócio."}
 ];
 let activeHeroSlide=0;
 function setHeroSlide(index){
   activeHeroSlide=(index+heroSlides.length)%heroSlides.length;
   const slide=heroSlides[activeHeroSlide];
   $("#heroEyebrow").textContent=slide.eyebrow;
   $("#heroTitle").innerHTML=slide.title;
   $("#heroDescription").textContent=slide.description;
   $$("[data-slide-index]").forEach((b,i)=>b.classList.toggle("active",i===activeHeroSlide));
 }
 $$("[data-slide-step]").forEach(b=>b.addEventListener("click",()=>setHeroSlide(activeHeroSlide+Number(b.dataset.slideStep))));
 $$("[data-slide-index]").forEach(b=>b.addEventListener("click",()=>setHeroSlide(Number(b.dataset.slideIndex))));
 $$("[data-feature]").forEach(b=>b.addEventListener("click",()=>notify(b.dataset.feature==="caravanas"?"A área de caravanas será configurada com as próximas viagens.":"A área de associação será configurada com as modalidades de sócio.")));
}
init();
