const API='https://siteflowa.onrender.com'
let currentWebsite=null,setupFee=299,monthlyFee=49,discountApplied=false,siteSettings={},demoStep=0,demoAnswers={}
var sentEmailsLog = []

// ── PASSWORD RESET — checked immediately before anything else ──
;(function(){
  // Support both hash-based (#reset?token=) and query-based (?token=) URLs
  var hashParams = window.location.hash.indexOf('reset?token=') !== -1
    ? new URLSearchParams(window.location.hash.split('?')[1] || '')
    : null
  var queryParams = new URLSearchParams(window.location.search)
  var t = (hashParams && hashParams.get('token')) || queryParams.get('token')
  if (!t) return
  window._resetToken = t
  // Run immediately and repeatedly until the DOM is ready
  function activate() {
    var pages = document.querySelectorAll('.page-section')
    if (!pages.length) return // DOM not ready yet
    pages.forEach(function(p){ p.classList.remove('active') })
    var rp = document.getElementById('page-reset')
    if (rp) { rp.classList.add('active'); rp.style.display='block' }
    var modal = document.getElementById('login-modal')
    if (modal) { modal.classList.remove('open'); modal.style.display='none' }
  }
  activate()
  document.addEventListener('DOMContentLoaded', activate)
  window.addEventListener('load', activate)
  setInterval(function(){
    if (window._resetToken) activate()
  }, 300)
})()

const SECTIONS=['gallery','hours','contact','services','menu','team']
const SECTION_LABELS={gallery:'🖼️ Gallery',hours:'🕐 Hours',contact:'📞 Contact',services:'🔧 Services',menu:'🍽️ Menu',team:'👥 Team'}
const DEMO_QS=[
  {q:"What type of business are you?",d:"Helps us pick the right layout.",opts:["Trades & construction","Restaurant / cafe","Retail shop","Health & beauty","Professional services","Other"]},
  {q:"Main goal of your website?",d:"We'll make the most important thing stand out.",opts:["Get people to call me","Show off my work","Take bookings or orders","Just have an online presence","Attract new customers","Share my menu / services"]},
  {q:"Which sections would you like?",d:"Pick everything that applies.",opts:["Gallery / photos","Business hours","Menu or services list","Online booking link","Meet the team","Customer reviews","Contact form","Map & directions"],multi:true},
  {q:"Style preference?",d:"We'll match the design to your brand.",opts:["Clean & professional","Bold & modern","Warm & friendly","Minimal & elegant","Fun & colourful","Dark & dramatic"]},
  {q:"Your business name and email?",d:"We'll send your demo link here within 24 hours.",isContact:true}
]
const DEMO_Q_LABELS=["Business type","Main goal","Sections wanted","Style preference"]

function getToken(){return localStorage.getItem('wc_token')}
function getRole(){return localStorage.getItem('wc_role')}

function showPage(n){
  document.querySelectorAll('.page-section').forEach(s=>s.classList.remove('active'))
  document.getElementById('page-'+n).classList.add('active')
  window.scrollTo({top:0,behavior:'smooth'})
  if(n==='admin')loadAdminData()
  if(n==='manager')loadManagerData()
  if(n==='inquiry')initDemo()
}
function openLogin(){
  // Don't open login modal if we're in the password reset flow
  if(window._resetToken) return
  document.getElementById('login-modal').classList.add('open')
}
function closeLogin(){document.getElementById('login-modal').classList.remove('open')}
function switchTab(t){
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'))
  document.querySelectorAll('.modal-tab').forEach(x=>x.classList.remove('active'))
  document.getElementById('tab-'+t).classList.add('active')
  if(t==='login')document.querySelectorAll('.modal-tab')[0].classList.add('active')
  if(t==='signup')document.querySelectorAll('.modal-tab')[1].classList.add('active')
}
function showForgotPassword(){ switchTab('forgot') }
function showError(id,msg){const el=document.getElementById(id);el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),5000)}
function switchInquiryTab(tab,el){
  document.querySelectorAll('.inquiry-tab').forEach(t=>t.classList.remove('active'))
  document.querySelectorAll('.inquiry-panel').forEach(p=>p.classList.remove('active'))
  document.getElementById('inquiry-'+tab).classList.add('active')
  el.classList.add('active')
}

async function loadSiteSettings(){
  try{const res=await fetch(API+'/site-settings');const s=await res.json();siteSettings=s;applySettings(s)}
  catch(e){console.error(e)}
}
function applySettings(s){
  if(!s)return
  const name=s.company_name||'Siteflowa'
  document.title=name+' - Professional Websites for Small Business'
  document.getElementById('footer-copy').textContent='\u00a9 2026 '+name+'. All rights reserved.'
  if(s.main_title){var mt=document.getElementById('hero-main-title');if(mt)mt.textContent=s.main_title}
  if(s.tagline){var ht=document.getElementById('hero-tagline');if(ht)ht.textContent=s.tagline}
  if(s.plan_basic_price){
    document.getElementById('home-stat-price').textContent='$'+s.plan_basic_price
    // Update inquiry page plan dropdown with real prices
    var inqBasic=document.getElementById('inq-opt-basic')
    var inqStd=document.getElementById('inq-opt-standard')
    var inqPrem=document.getElementById('inq-opt-premium')
    if(inqBasic)inqBasic.textContent='Basic — $'+s.plan_basic_setup+' setup + $'+s.plan_basic_price+'/mo'
    if(inqStd)inqStd.textContent='Standard — $'+s.plan_standard_setup+' setup + $'+s.plan_standard_price+'/mo'
    if(inqPrem)inqPrem.textContent='Premium — $'+s.plan_premium_setup+' setup + $'+s.plan_premium_price+'/mo'
    document.getElementById('plan-basic-price').innerHTML='$'+s.plan_basic_price+'<span>/mo</span>'
    document.getElementById('plan-standard-price').innerHTML='$'+s.plan_standard_price+'<span>/mo</span>'
    document.getElementById('plan-premium-price').innerHTML='$'+s.plan_premium_price+'<span>/mo</span>'
    document.getElementById('plan-basic-setup').textContent='+ $'+s.plan_basic_setup+' one-time setup'
    document.getElementById('plan-standard-setup').textContent='+ $'+s.plan_standard_setup+' one-time setup'
    document.getElementById('plan-premium-setup').textContent='+ $'+s.plan_premium_setup+' one-time setup'
    // Update brief form plan card prices to always match admin settings
    var bfBasic = document.getElementById('bf-plan-basic-price')
    var bfStd   = document.getElementById('bf-plan-standard-price')
    var bfPrem  = document.getElementById('bf-plan-premium-price')
    if (bfBasic) bfBasic.textContent = '$' + s.plan_basic_setup + ' setup · $' + s.plan_basic_price + '/mo'
    if (bfStd)   bfStd.textContent   = '$' + s.plan_standard_price + '/mo + $' + s.plan_standard_setup + ' setup'
    if (bfPrem)  bfPrem.textContent  = '$' + s.plan_premium_price  + '/mo + $' + s.plan_premium_setup  + ' setup'
  }
  const ei=document.getElementById('contact-email-item'),pi=document.getElementById('contact-phone-item'),ai=document.getElementById('contact-address-item')
  if(s.email){ei.style.display='flex';document.getElementById('contact-email-val').textContent=s.email}else ei.style.display='none'
  if(s.phone){pi.style.display='flex';document.getElementById('contact-phone-val').textContent=s.phone}else pi.style.display='none'
  if(s.address){ai.style.display='flex';document.getElementById('contact-address-val').textContent=s.address}else ai.style.display='none'
  const socials=[]
  if(s.instagram)socials.push({l:'📸 Instagram',u:'https://instagram.com/'+s.instagram})
  if(s.facebook)socials.push({l:'📘 Facebook',u:'https://facebook.com/'+s.facebook})
  if(s.tiktok)socials.push({l:'🎵 TikTok',u:'https://tiktok.com/@'+s.tiktok})
  if(s.twitter)socials.push({l:'🐦 X',u:'https://x.com/'+s.twitter})
  if(s.linkedin)socials.push({l:'💼 LinkedIn',u:'https://linkedin.com/company/'+s.linkedin})
  if(s.youtube)socials.push({l:'️ YouTube',u:'https://youtube.com/@'+s.youtube})
  document.getElementById('social-links-wrap').innerHTML=socials.map(x=>`<a href="${x.u}" target="_blank" class="social-link">${x.l}</a>`).join('')
  document.getElementById('footer-socials').innerHTML=socials.map(x=>`<a href="${x.u}" target="_blank" class="footer-social">${x.l.split(' ')[0]}</a>`).join('')
}
async function loadSiteSettingsForm(){
  try{
    const res=await fetch(API+'/site-settings');const s=await res.json()
    const map={name:'company_name','main-title':'main_title',tagline:'tagline',email:'email',phone:'phone',address:'address',instagram:'instagram',facebook:'facebook',tiktok:'tiktok',twitter:'twitter',linkedin:'linkedin',youtube:'youtube'}
    Object.entries(map).forEach(([id,key])=>{const el=document.getElementById('ss-'+id);if(el)el.value=s[key]||''})
    if(s.plan_basic_price){
      document.getElementById('ss-basic-price').value=s.plan_basic_price||29
      document.getElementById('ss-std-price').value=s.plan_standard_price||49
      document.getElementById('ss-prem-price').value=s.plan_premium_price||79
      document.getElementById('ss-basic-setup').value=s.plan_basic_setup||199
      document.getElementById('ss-std-setup').value=s.plan_standard_setup||299
      document.getElementById('ss-prem-setup').value=s.plan_premium_setup||499
    }
  }catch(e){console.error(e)}
}
async function saveSiteSettings(){
  const applyTo=document.getElementById('ss-price-apply')?.value||'new_only'
  const body={
    company_name:document.getElementById('ss-name').value,main_title:document.getElementById('ss-main-title')?.value||'',tagline:document.getElementById('ss-tagline').value,
    email:document.getElementById('ss-email').value,phone:document.getElementById('ss-phone').value,address:document.getElementById('ss-address').value,
    instagram:document.getElementById('ss-instagram').value,facebook:document.getElementById('ss-facebook').value,
    tiktok:document.getElementById('ss-tiktok').value,twitter:document.getElementById('ss-twitter').value,
    linkedin:document.getElementById('ss-linkedin').value,youtube:document.getElementById('ss-youtube').value,
    plan_basic_price:parseInt(document.getElementById('ss-basic-price').value)||29,
    plan_standard_price:parseInt(document.getElementById('ss-std-price').value)||49,
    plan_premium_price:parseInt(document.getElementById('ss-prem-price').value)||79,
    plan_basic_setup:parseInt(document.getElementById('ss-basic-setup').value)||199,
    plan_standard_setup:parseInt(document.getElementById('ss-std-setup').value)||299,
    plan_premium_setup:parseInt(document.getElementById('ss-prem-setup').value)||499,
    apply_prices_to:applyTo
  }
  try{
    const res=await fetch(API+'/admin/site-settings',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify(body)})
    const d=await res.json()
    if(d.message){applySettings(body);const m=document.getElementById('save-msg-settings');m.classList.add('show');setTimeout(()=>m.classList.remove('show'),3000)}
    else alert(d.error||'Failed')
  }catch(e){alert('Could not connect to server')}
}

async function doLogin(){
  const email=document.getElementById('login-email').value
  const password=document.getElementById('login-password').value
  if(!email||!password)return showError('login-error','Please enter your email and password')
  try{
    const res=await fetch(API+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})})
    const data=await res.json()
    if(data.token){
      const payload=JSON.parse(atob(data.token.split('.')[1]))
      localStorage.setItem('wc_token',data.token)
      localStorage.setItem('wc_role',data.role||payload.role)
      localStorage.setItem('wc_email',email.toLowerCase())
      window._clientDepositAmount = data.deposit_amount || 0
      closeLogin()
      const role=data.role||payload.role
      if(role==='admin'){document.getElementById('admin-email-display').textContent=email.toLowerCase();document.getElementById('admin-avatar').textContent=email.substring(0,2).toUpperCase();showPage('admin')}
      else if(role==='manager'||role==='contractor'){document.getElementById('mgr-email-display').textContent=email.toLowerCase();document.getElementById('mgr-avatar').textContent=email.substring(0,2).toUpperCase();showPage('manager')}
      else if(data.update_fee_required){document.getElementById('update-fee-amount').textContent='$'+data.update_fee_amount;document.getElementById('update-fee-total').textContent='$'+data.update_fee_amount;showPage('update-fee')}
      // Fully launched - full dashboard
      else if(data.is_active===true && data.onboarding_stage==='launched'){loadClientDashboard(email.toLowerCase(),data.website,data.plan)}
      // Deposit not yet paid - show deposit payment page
      else if(!data.deposit_paid){currentWebsite=data.website;showPaymentPage(data.website,data.plan)}
      // Deposit paid, HTML uploaded - preview/review stage
      else if(data.deposit_paid && data.website?.site_html){showHoldingPage('review',data.website)}
      // Deposit paid, no HTML yet - building stage
      else if(data.deposit_paid && !data.website?.site_html){showHoldingPage('building',data.website)}
      // Fallback - check if active
      else if(data.subscription_status==='active'){loadClientDashboard(email.toLowerCase(),data.website,data.plan)}
      else{currentWebsite=data.website;showPaymentPage(data.website,data.plan)}
    }else showError('login-error',data.error||'Login failed')
  }catch(e){showError('login-error','Could not connect to server. Is it running?')}
}
async function doSignup(){
  const email=document.getElementById('signup-email').value
  const password=document.getElementById('signup-password').value
  const invite_code=document.getElementById('signup-code').value.trim()
  if(!email||!password||!invite_code)return showError('signup-error','Please fill in all fields')
  if(password.length<8)return showError('signup-error','Password must be at least 8 characters')
  try{
    const res=await fetch(API+'/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,invite_code})})
    const data=await res.json()
    if(data.token){
      localStorage.setItem('wc_token',data.token);localStorage.setItem('wc_email',email.toLowerCase());localStorage.setItem('wc_role',data.role)
      closeLogin()
      if(data.role==='admin'){document.getElementById('admin-email-display').textContent=email.toLowerCase();showPage('admin')}
      else if(data.role==='manager'||data.role==='contractor'){document.getElementById('mgr-email-display').textContent=email.toLowerCase();showPage('manager')}
      else{currentWebsite=data.website;showPaymentPage(data.website,data.plan)}
    }else showError('signup-error',data.error||'Signup failed')
  }catch(e){showError('signup-error','Could not connect to server. Is it running?')}
}
// -- DYNAMIC CONTENT SYSTEM -------------------------
let websiteSchema = null
let dynamicContent = {}

async function loadDynamicContent() {
  const token = getToken()
  if (!token) return
  const wrap = document.getElementById('dynamic-content-panels')
  if (!wrap) return
  try {
    const res = await fetch(API + '/my-dashboard', { headers: { 'Authorization': 'Bearer ' + token } })
    const data = await res.json()
    if (!data.website) { wrap.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No website linked to your account yet.</p>'; return }
    websiteSchema = data.website.schema || null
    dynamicContent = data.website.content || {}
    if (!websiteSchema || !Object.keys(websiteSchema).length) {
      wrap.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No content schema found for your website. Contact support.</p>'
      return
    }
    renderDynamicPanels(websiteSchema, dynamicContent, data.client?.plan || 'standard')
  } catch(e) { console.error(e) }
}

function renderDynamicPanels(schema, content, plan) {
  const wrap = document.getElementById('dynamic-content-panels')
  const planRank = { basic:0, standard:1, premium:2 }
  const rank = planRank[plan] || 0

  // Group fields by section
  const sections = {}
  Object.entries(schema).forEach(([key, field]) => {
    // Check plan access
    const fieldRank = planRank[field.plan || 'basic'] || 0
    if (fieldRank > rank) return // hide fields above client's plan
    const sec = field.section || 'General'
    if (!sections[sec]) sections[sec] = []
    sections[sec].push({ key, ...field })
  })

  wrap.innerHTML = Object.entries(sections).map(([secName, fields]) => `
    <div style="margin-bottom:32px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--ink-muted);margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid var(--border);">${secName}</div>
      <div class="dash-grid">
        ${fields.map(f => renderDynamicField(f, content[f.key])).join('')}
      </div>
    </div>
  `).join('')
}

function renderDynamicField(field, value) {
  const v = value !== undefined ? value : (field.default || '')
  const id = 'dc-' + field.key
  const t = field.type

  if (t === 'text' || t === 'tel' || t === 'email' || t === 'url') {
    return '<div class="dash-field"><label>' + field.label + '</label><input type="' + t + '" id="' + id + '" value="' + escHtml(v) + '" placeholder="' + (field.placeholder||'') + '"></div>'
  }
  if (t === 'textarea') {
    return '<div class="dash-field full"><label>' + field.label + '</label><textarea id="' + id + '" rows="3" placeholder="' + (field.placeholder||'') + '">' + escHtml(v) + '</textarea></div>'
  }
  if (t === 'photo') {
    const preview = v ? '<img src="' + v + '" style="width:60px;height:60px;border-radius:8px;object-fit:cover;">' : '<div style="width:60px;height:60px;border-radius:8px;background:var(--cream);display:flex;align-items:center;justify-content:center;font-size:20px;">📷</div>'
    return '<div class="dash-field"><label>' + field.label + '</label><div style="display:flex;gap:10px;align-items:center;">' + preview + '<div><input type="url" id="' + id + '" value="' + escHtml(v) + '" placeholder="Paste photo URL" style="font-size:12px;margin-bottom:4px;"><div style="font-size:11px;color:var(--ink-muted);">Paste a direct image URL</div></div></div></div>'
  }
  if (t === 'badges') {
    const badgeVal = Array.isArray(v) ? v.join(', ') : v
    return '<div class="dash-field full"><label>' + field.label + '</label><input type="text" id="' + id + '" value="' + escHtml(badgeVal) + '" placeholder="e.g. Licensed & insured, Free quotes"><div style="font-size:11px;color:var(--ink-muted);margin-top:4px;">Separate each badge with a comma</div></div>'
  }
  if (t === 'hours') {
    const hDays = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
    const hLabels = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
    const hrs = (typeof v === 'object' && v) ? v : {}
    const rows = hDays.map(function(d, i) {
      return '<div style="display:grid;grid-template-columns:110px 1fr 1fr;gap:8px;align-items:center;"><span style="font-size:13px;font-weight:500;">' + hLabels[i] + '</span><input type="time" id="' + id + '-' + d + '-open" value="' + (hrs[d] && hrs[d].open ? hrs[d].open : '') + '" placeholder="Closed"><input type="time" id="' + id + '-' + d + '-close" value="' + (hrs[d] && hrs[d].close ? hrs[d].close : '') + '" placeholder="Closed"></div>'
    }).join('')
    return '<div class="dash-field full"><label>' + field.label + '</label><div style="display:grid;gap:8px;margin-top:6px;"><div style="display:grid;grid-template-columns:110px 1fr 1fr;gap:8px;font-size:11px;font-weight:600;color:var(--ink-muted);text-transform:uppercase;letter-spacing:0.06em;"><span>Day</span><span>Opens</span><span>Closes</span></div>' + rows + '</div></div>'
  }
  if (t === 'repeater') {
    const items = Array.isArray(v) ? v : []
    const itemsHtml = items.map(function(item, idx) { return renderRepeaterItem(field, item, idx, id) }).join('')
    return '<div class="dash-field full"><label>' + field.label + '</label><div id="' + id + '-list" style="display:grid;gap:10px;margin-top:6px;">' + itemsHtml + '</div><button onclick="addRepeaterItem(\x27'+field.key+'\x27,\x27'+id+'\x27)" style="margin-top:10px;background:var(--cream);border:1px dashed var(--border-strong);border-radius:var(--radius);padding:8px 16px;font-family:var(--sans);font-size:13px;cursor:pointer;width:100%;">+ Add item</button></div>'
  }
  if (t === 'photo_array') {
    const photos = Array.isArray(v) ? v : []
    const photosHtml = photos.map(function(url, idx) {
      return '<div style="position:relative;"><img src="' + url + '" style="width:80px;height:80px;border-radius:8px;object-fit:cover;"><button onclick="removePhoto(\x27'+id+'\x27,'+idx+')" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:var(--red);color:white;border:none;cursor:pointer;font-size:11px;">x</button></div>'
    }).join('')
    return '<div class="dash-field full"><label>' + field.label + '</label><div id="' + id + '-list" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:6px;">' + photosHtml + '<div style="width:80px;height:80px;border:2px dashed var(--border-strong);border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ink-muted);" onclick="addPhotoUrl(\x27'+id+'\x27)">+</div></div><div style="font-size:11px;color:var(--ink-muted);margin-top:6px;">Click + to add a photo URL</div></div>'
  }
  return ''
}

function renderRepeaterItem(field, item, idx, id) {
  return `<div style="background:var(--cream);border:1px solid var(--border);border-radius:var(--radius);padding:14px;position:relative;" id="${id}-item-${idx}">
    <button onclick="removeRepeaterItem('${id}',${idx})" style="position:absolute;top:10px;right:10px;background:none;border:none;cursor:pointer;color:var(--ink-muted);font-size:16px;">x</button>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      ${field.fields.map(f => `
        <div class="${f.type==='textarea'?'':''}">
          <label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:var(--ink-muted);">${f.label}</label>
          ${f.type==='textarea'
            ? `<textarea id="${id}-${idx}-${f.key}" rows="2" placeholder="${f.placeholder||''}" style="width:100%;padding:8px 10px;font-size:13px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);background:white;outline:none;">${escHtml(item[f.key]||'')}</textarea>`
            : `<input type="${f.type==='photo'?'url':'text'}" id="${id}-${idx}-${f.key}" value="${escHtml(item[f.key]||'')}" placeholder="${f.placeholder||''}" style="width:100%;padding:8px 10px;font-size:13px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);background:white;outline:none;">`
          }
        </div>`).join('')}
    </div>
  </div>`
}

function addRepeaterItem(fieldKey, id) {
  const field = websiteSchema[fieldKey]
  if (!field) return
  if (!dynamicContent[fieldKey]) dynamicContent[fieldKey] = []
  const idx = dynamicContent[fieldKey].length
  const emptyItem = {}
  field.fields.forEach(f => emptyItem[f.key] = '')
  dynamicContent[fieldKey].push(emptyItem)
  const list = document.getElementById(id + '-list')
  const div = document.createElement('div')
  div.innerHTML = renderRepeaterItem(field, emptyItem, idx, id)
  list.appendChild(div.firstElementChild)
}

function removeRepeaterItem(id, idx) {
  document.getElementById(id + '-item-' + idx)?.remove()
}

function removePhoto(id, idx) {
  const list = document.getElementById(id + '-list')
  const imgs = list.querySelectorAll('div[style*="position:relative"]')
  if (imgs[idx]) imgs[idx].remove()
}

function addPhotoUrl(id) {
  const url = prompt('Paste the photo URL:')
  if (!url) return
  const list = document.getElementById(id + '-list')
  const addBtn = list.lastElementChild
  const div = document.createElement('div')
  div.style.cssText = 'position:relative;'
  const idx = list.querySelectorAll('div[style*="position:relative"]').length
  div.innerHTML = `<img src="${url}" style="width:80px;height:80px;border-radius:8px;object-fit:cover;"><button onclick="removePhoto('${id}',${idx})" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:var(--red);color:white;border:none;cursor:pointer;font-size:11px;">x</button>`
  list.insertBefore(div, addBtn)
}

function escHtml(s) {
  if (typeof s !== 'string') return s || ''
  return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function collectDynamicContent() {
  const result = {}
  if (!websiteSchema) return result
  Object.entries(websiteSchema).forEach(([key, field]) => {
    const id = 'dc-' + key
    switch(field.type) {
      case 'text': case 'tel': case 'email': case 'url': case 'textarea': {
        const el = document.getElementById(id)
        if (el) result[key] = el.value
        break
      }
      case 'photo': {
        const el = document.getElementById(id)
        if (el) result[key] = el.value
        break
      }
      case 'badges': {
        const el = document.getElementById(id)
        if (el) result[key] = el.value.split(',').map(s=>s.trim()).filter(Boolean)
        break
      }
      case 'hours': {
        const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
        const hrs = {}
        days.forEach(d => {
          const open = document.getElementById(id+'-'+d+'-open')?.value
          const close = document.getElementById(id+'-'+d+'-close')?.value
          hrs[d] = open && close ? { open, close } : null
        })
        result[key] = hrs
        break
      }
      case 'repeater': {
        if (!field.fields) break
        const list = document.getElementById(id+'-list')
        if (!list) break
        const items = []
        list.querySelectorAll('[id^="'+id+'-"][id$="-'+field.fields[0].key+'"]').forEach(el => {
          const match = el.id.match(new RegExp(id+'-([0-9]+)-'))
          if (!match) return
          const idx = match[1]
          const item = {}
          field.fields.forEach(f => {
            const fieldEl = document.getElementById(id+'-'+idx+'-'+f.key)
            if (fieldEl) item[f.key] = fieldEl.value
          })
          if (Object.values(item).some(v => v)) items.push(item)
        })
        result[key] = items
        break
      }
      case 'photo_array': {
        const list = document.getElementById(id+'-list')
        if (!list) break
        const urls = []
        list.querySelectorAll('img').forEach(img => urls.push(img.src))
        result[key] = urls
        break
      }
    }
  })
  return result
}

async function saveDynamicContent() {
  const token = getToken()
  const collected = collectDynamicContent()
  try {
    const res = await fetch(API + '/my-website/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ content: collected })
    })
    const d = await res.json()
    if (d.message) {
      const msg = document.getElementById('save-msg-content')
      msg.classList.add('show'); setTimeout(() => msg.classList.remove('show'), 3000)
    } else alert(d.error || 'Save failed')
  } catch(e) { alert('Could not connect to server') }
}

function togglePw(id,btn){
  const inp=document.getElementById(id)
  if(!inp)return
  if(inp.type==='password'){inp.type='text';btn.textContent='🙈'}
  else{inp.type='password';btn.textContent='👁'}
}
function togglePasswordVisibility(id){
  const inp=document.getElementById(id)
  if(!inp)return
  const btn=inp.parentElement.querySelector('button')
  if(inp.type==='password'){inp.type='text';if(btn)btn.textContent='🙈'}
  else{inp.type='password';if(btn)btn.textContent='👁'}
}
function doLogout(){localStorage.removeItem('wc_token');localStorage.removeItem('wc_role');localStorage.removeItem('wc_email');showPage('home')}
async function doForgotPassword(){
  const email=document.getElementById('forgot-email').value
  if(!email)return showError('forgot-error','Please enter your email address')
  try{
    const res=await fetch(API+'/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})})
    const d=await res.json()
    if(d.message){
      document.getElementById('forgot-email').value=''
      alert('If an account exists for '+email+', a reset link has been sent. Check your inbox and click the link - it opens a page where you can set a new password.')
      switchTab('login')
    }else showError('forgot-error',d.error||'Something went wrong')
  }catch(e){showError('forgot-error','Could not connect to server. Is it running?')}
}

async function doResetPassword(){
  var hashParams = window.location.hash.indexOf('reset?token=') !== -1
    ? new URLSearchParams(window.location.hash.split('?')[1] || '')
    : null
  var queryParams = new URLSearchParams(window.location.search)
  const token = window._resetToken || (hashParams && hashParams.get('token')) || queryParams.get('token')
  const password=document.getElementById('reset-password').value
  if(!token)return showError('reset-error','No reset token found. Please request a new reset link.')
  if(!password||password.length<8)return showError('reset-error','Password must be at least 8 characters')
  try{
    const res=await fetch(API+'/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,password})})
    const d=await res.json()
    if(d.message){
      window._resetToken = null  // stops the keepalive interval
      var modal = document.getElementById('login-modal')
      if (modal) { modal.classList.remove('open'); modal.style.display = '' }
      const wrap = document.querySelector('#page-reset > div')
      if(wrap) wrap.innerHTML = '<div style="text-align:center;padding:20px 0;">' +
        '<div style="font-size:56px;margin-bottom:20px;">✅</div>' +
        '<h2 style="font-family:var(--serif);font-size:28px;margin-bottom:12px;">Password updated!</h2>' +
        '<p style="color:var(--ink-muted);font-size:15px;line-height:1.6;margin-bottom:28px;">Your password has been changed successfully. You can now log in with your new password.</p>' +
        '<button onclick="showPage(\'home\');openLogin()" style="background:var(--accent);color:white;border:none;padding:14px 32px;border-radius:10px;font-family:var(--sans);font-size:15px;font-weight:500;cursor:pointer;">Log in →</button>' +
        '</div>'
    } else showError('reset-error',d.error||'Reset failed — the link may have expired. Please request a new one.')
  }catch(e){showError('reset-error','Could not connect to server.')}
}

function showPaymentPage(website,plan){
  setupFee=website?website.setup_fee||299:299
  monthlyFee=website?website.monthly_fee||49:49
  discountApplied=false
  var depositPct=(siteSettings?.deposit_percent||50)/100
  var depositAmt=Math.round(setupFee*depositPct)
  document.getElementById('pay-setup-fee').textContent='$'+depositAmt+' deposit ('+(Math.round(depositPct*100))+'% of $'+setupFee+')'
  document.getElementById('pay-monthly-fee').textContent='$'+monthlyFee+'/mo (after launch)'
  document.getElementById('pay-total').textContent='$'+depositAmt
  document.getElementById('discount-line').style.display='none'
  const pn={basic:'Basic',standard:'Standard',premium:'Premium'}
  document.getElementById('pay-plan-badge').innerHTML='<span class="plan-pill '+(plan||'standard')+'">'+(pn[plan||'standard'])+'</span>'
  const startDate=new Date();startDate.setMonth(startDate.getMonth()+1)
  const el=document.getElementById('billing-start-date')
  if(el)el.textContent=startDate.toLocaleDateString('en',{month:'long',day:'numeric',year:'numeric'})
  showPage('payment')
}
function applyReferral(){
  const code=document.getElementById('referral-code-input').value.trim()
  if(!code)return alert('Please enter a referral code')
  if(discountApplied)return alert('A discount has already been applied')
  const discount=Math.round(setupFee*0.1);discountApplied=true
  document.getElementById('discount-amount').textContent='-$'+discount
  document.getElementById('discount-line').style.display='flex'
  document.getElementById('pay-total').textContent='$'+(setupFee+monthlyFee-discount)
  alert('Referral code applied! You saved $'+discount+' off your website build fee.')
}
async function simulatePayment(){
  try{
    const res=await fetch(API+'/activate-account',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()}})
    const d=await res.json()
    if(d.message)loadClientDashboard(localStorage.getItem('wc_email'),currentWebsite,null)
    else alert('Activation failed: '+(d.error||'Unknown error'))
  }catch(e){alert('Could not connect to server')}
}
async function payUpdateFee(){
  try{
    await fetch(API+'/pay-update-fee',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()}})
    loadClientDashboard(localStorage.getItem('wc_email'),null,null)
  }catch(e){loadClientDashboard(localStorage.getItem('wc_email'),null,null)}
}

function loadClientDashboard(email,website,plan){
  document.getElementById('client-email-display').textContent=email
  document.getElementById('client-avatar').textContent=email.substring(0,2).toUpperCase()
  const p=plan||'standard'
  const pb=document.getElementById('client-plan-badge')
  pb.textContent=p.charAt(0).toUpperCase()+p.slice(1);pb.className='plan-pill '+p
  document.getElementById('overview-plan').textContent=p.charAt(0).toUpperCase()+p.slice(1)
  if(website){
    document.getElementById('biz-name').value=website.business_name||''
    document.getElementById('biz-phone').value=website.phone||''
    document.getElementById('biz-address').value=website.address||''
    document.getElementById('biz-tagline').value=website.tagline||''
    const url=website.subdomain?website.subdomain+'.siteflowa.com':''
    document.getElementById('biz-url').value=url
    document.getElementById('overview-url').textContent=url||'-'
  }
  const isBasic=p==='basic'
  document.getElementById('nav-business').style.display=isBasic?'none':'flex'
  document.getElementById('nav-photos').style.display=isBasic?'none':'flex'
  document.getElementById('nav-hours').style.display=isBasic?'none':'flex'
  document.getElementById('nav-referral').style.display=isBasic?'none':'flex'
  fetchClientExtras(p)
  showPage('dashboard')
  const tourKey='siteflowa_tour_'+email
  if(!localStorage.getItem(tourKey)){
    localStorage.setItem(tourKey,'done')
    setTimeout(()=>startDashboardTour(p),600)
  }
}

const TOUR_STEPS=[
  {target:'panel-overview',title:'Welcome to your dashboard! 👋',text:'This is your overview - you can see your website status, plan, and URL at a glance.',nav:'Overview'},
  {target:'panel-business',title:'Update your business info 🏢',text:'Keep your phone number, address, and description up to date here. Any changes go live on your website instantly.',nav:'Business info'},
  {target:'panel-hours',title:'Set your opening hours 🕐',text:'Update your business hours here. Customers will see these on your website in real time.',nav:'Hours'},
  {target:'panel-billing',title:'Manage your billing 💳',text:'View your subscription status and invoice history here.',nav:'Billing'},
  {target:'panel-upgrade',title:'Upgrade anytime ️',text:'Want more features or pages? You can upgrade your plan here at any time. Your website content always stays the same.',nav:'Upgrade plan'},
]

let tourStep=0
function startDashboardTour(plan){
  tourStep=0
  showTourStep()
}
function showTourStep(){
  removeTourOverlay()
  if(tourStep>=TOUR_STEPS.length){showTourComplete();return}
  const step=TOUR_STEPS[tourStep]
  // switch to the right panel
  const navItems=document.querySelectorAll('.dash-nav-item')
  navItems.forEach(n=>{if(n.textContent.trim().startsWith(step.nav.charAt(0))||n.textContent.includes(step.nav.substring(0,6))){n.click()}})
  // create overlay
  const overlay=document.createElement('div')
  overlay.id='tour-overlay'
  overlay.style.cssText='position:fixed;inset:0;z-index:999;pointer-events:none;'
  const tooltip=document.createElement('div')
  tooltip.id='tour-tooltip'
  tooltip.style.cssText='position:fixed;bottom:40px;left:50%;transform:translateX(-50%);background:var(--ink);color:white;border-radius:14px;padding:24px 28px;max-width:400px;width:90%;z-index:1000;box-shadow:0 20px 60px rgba(0,0,0,0.3);pointer-events:all;'
  tooltip.innerHTML=`
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.4);margin-bottom:8px;">Step ${tourStep+1} of ${TOUR_STEPS.length}</div>
    <div style="font-family:var(--serif);font-size:20px;margin-bottom:8px;">${step.title}</div>
    <p style="font-size:14px;color:rgba(255,255,255,0.7);line-height:1.6;margin-bottom:20px;">${step.text}</p>
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <button onclick="skipTour()" style="background:none;border:none;color:rgba(255,255,255,0.4);cursor:pointer;font-family:var(--sans);font-size:13px;">Skip tour</button>
      <div style="display:flex;gap:6px;align-items:center;">
        ${tourStep>0?`<button onclick="prevTourStep()" style="background:rgba(255,255,255,0.1);border:none;color:white;padding:8px 16px;border-radius:6px;cursor:pointer;font-family:var(--sans);font-size:13px;">&larr; Back</button>`:''}
        <button onclick="nextTourStep()" style="background:var(--accent);border:none;color:white;padding:8px 20px;border-radius:6px;cursor:pointer;font-family:var(--sans);font-size:14px;font-weight:500;">${tourStep===TOUR_STEPS.length-1?'Finish v':'Next &rarr;'}</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)
  document.body.appendChild(tooltip)
}
function nextTourStep(){tourStep++;showTourStep()}
function prevTourStep(){tourStep--;showTourStep()}
function skipTour(){removeTourOverlay();removeTourTooltip()}
function removeTourOverlay(){const o=document.getElementById('tour-overlay');if(o)o.remove()}
function removeTourTooltip(){const t=document.getElementById('tour-tooltip');if(t)t.remove()}
function showTourComplete(){
  removeTourOverlay()
  const tooltip=document.createElement('div')
  tooltip.id='tour-tooltip'
  tooltip.style.cssText='position:fixed;bottom:40px;left:50%;transform:translateX(-50%);background:var(--accent);color:white;border-radius:14px;padding:24px 28px;max-width:400px;width:90%;z-index:1000;box-shadow:0 20px 60px rgba(0,0,0,0.3);text-align:center;'
  tooltip.innerHTML=`
    <div style="font-size:32px;margin-bottom:12px;">🎉</div>
    <div style="font-family:var(--serif);font-size:22px;margin-bottom:8px;">You're all set!</div>
    <p style="font-size:14px;color:rgba(255,255,255,0.8);line-height:1.6;margin-bottom:20px;">Your dashboard is ready to go. Start by updating your business info so your website is always current.</p>
    <button onclick="removeTourTooltip()" style="background:white;color:var(--accent);border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-family:var(--sans);font-size:14px;font-weight:500;">Let's go!</button>
  `
  document.body.appendChild(tooltip)
  setTimeout(removeTourTooltip, 6000)
}
async function fetchClientExtras(plan){
  const token=getToken();if(!token)return
  try{
    const res=await fetch(API+'/my-dashboard',{headers:{'Authorization':'Bearer '+token}})
    const data=await res.json()
    if(data.referral_code&&plan!=='basic')document.getElementById('my-referral-code').textContent=data.referral_code.code
    if(data.client){
      const s=data.client.subscription_status
  if(s==='suspended'){
    showPage('dashboard')
    const wrap=document.getElementById('dashboard-content')||document.body
    // Show missed payment banner prominently
    const banner=document.createElement('div')
    banner.style.cssText='position:fixed;top:0;left:0;right:0;z-index:999;background:#dc2626;color:white;text-align:center;padding:14px 20px;font-family:var(--sans);font-size:15px;font-weight:600;'
    banner.innerHTML='⚠️ Your website is paused due to a missed payment. <button onclick="payMissedPayment()" style="background:white;color:#dc2626;border:none;padding:6px 16px;border-radius:6px;font-weight:700;cursor:pointer;margin-left:12px;">Make payment</button>'
    document.body.prepend(banner)
  }
      document.getElementById('billing-status-text').textContent=s==='active'?'Active - Monthly plan':s==='suspended'?'Account suspended':'Pending payment'
      document.getElementById('overview-status').textContent=data.website?.is_active?'Active OK':'Inactive No'
    }
    buildUpgradeOptions(data.client?.plan||'standard')
  }catch(e){console.error(e)}
}
function buildUpgradeOptions(current){
  const s=siteSettings
  const plans=[
    {id:'standard',name:'Standard',price:s.plan_standard_price||49,features:['Full dashboard editing','Business info & hours','Photo uploads','4 pages','Referral code']},
    {id:'premium',name:'Premium',price:s.plan_premium_price||79,features:['Unlimited pages','Priority support','Monthly report','Custom domain','Blog section']}
  ]
  const rank={basic:0,standard:1,premium:2}
  const available=plans.filter(p=>rank[p.id]>rank[current])
  const wrap=document.getElementById('upgrade-options')
  if(!available.length){wrap.innerHTML='<p style="color:var(--ink-muted);font-size:14px;">You\'re on the highest plan available.</p>';return}
  wrap.innerHTML=available.map(p=>`<div class="upgrade-card" onclick="upgradePlan('${p.id}')"><h4>${p.name}</h4><div class="price">$${p.price}/mo</div><ul>${p.features.map(f=>`<li>${f}</li>`).join('')}</ul></div>`).join('')
}
async function upgradePlan(plan){
  if(!confirm('Upgrade to '+plan+' plan? (Stripe coming soon - activates immediately for testing)'))return
  try{
    const currentPlan=document.getElementById('client-plan-badge')?.textContent?.toLowerCase()||'basic'
    const res=await fetch(API+'/upgrade-plan',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({plan})})
    const d=await res.json()
    if(d.message){alert('Upgraded to '+plan+'!');location.reload()}
    else alert(d.error||'Failed')
  }catch(e){alert('Could not connect to server')}
}

async function requestDowngrade(toPlan){
  const currentPlan=document.getElementById('client-plan-badge')?.textContent?.toLowerCase()||'standard'
  if(!confirm('Request a downgrade to '+toPlan+'? Our team will be in touch to process this. If you have a custom domain it will need to be changed.'))return
  try{
    await fetch(API+'/notify-downgrade',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({from_plan:currentPlan,to_plan:toPlan})})
    alert('Downgrade request sent! Our team will contact you within one business day to process the change.')
  }catch(e){alert('Could not connect to server')}
}
async function saveBizInfo(){
  const body={business_name:document.getElementById('biz-name').value,phone:document.getElementById('biz-phone').value,address:document.getElementById('biz-address').value,tagline:document.getElementById('biz-tagline').value}
  try{
    const res=await fetch(API+'/my-website/save',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify(body)})
    const d=await res.json()
    if(d.message){const m=document.getElementById('save-msg-business');m.classList.add('show');setTimeout(()=>m.classList.remove('show'),3000)}
  }catch(e){alert('Save failed')}
}
function copyReferral(){
  const code=document.getElementById('my-referral-code').textContent
  navigator.clipboard.writeText(code).then(()=>{document.getElementById('referral-copy-msg').textContent='v Copied!';setTimeout(()=>document.getElementById('referral-copy-msg').textContent='',2000)})
}

function initDemo(){demoStep=0;demoAnswers={};renderDemoStep()}
function renderDemoStep(){
  const total=DEMO_QS.length
  document.getElementById('demo-dots').innerHTML=DEMO_QS.map((_,i)=>`<div class="demo-dot ${i===demoStep?'active':i<demoStep?'done':''}"></div>`).join('')
  const q=DEMO_QS[demoStep],container=document.getElementById('demo-questions')
  if(q.isContact){
    container.innerHTML=`<div class="demo-question active"><h4>${q.q}</h4><p>${q.d}</p><div style="display:grid;gap:12px;"><div><label>Business name</label><input type="text" id="demo-biz-name" placeholder="e.g. Jane's Plumbing"></div><div><label>Your email</label><input type="email" id="demo-email" placeholder="jane@business.com"></div><div><label>Anything else? (optional)</label><textarea id="demo-notes" rows="2" placeholder="Colours, style inspiration, competitors..."></textarea></div></div><div class="demo-nav"><button class="demo-back" onclick="demoStep--;renderDemoStep()">&larr; Back</button><button class="demo-next" onclick="submitDemo()">Get my free demo -></button></div></div>`
    updateDemoPreview();return
  }
  const sel=demoAnswers[demoStep]||[]
  container.innerHTML=`<div class="demo-question active"><h4>${q.q}</h4><p>${q.d}</p><div class="demo-options">${q.opts.map(o=>`<div class="demo-option ${sel.includes(o)?'selected':''}" onclick="selectDemoOpt(this,'${o.replace(/'/g,"\\'")}',${!!q.multi})">${o}</div>`).join('')}</div><div class="demo-nav">${demoStep>0?'<button class="demo-back" onclick="demoStep--;renderDemoStep()">&larr; Back</button>':'<span></span>'}<button class="demo-next" onclick="nextDemoStep()">Next &rarr;</button></div></div>`
  updateDemoPreview()
}
function selectDemoOpt(el,val,multi){
  if(multi){if(!demoAnswers[demoStep])demoAnswers[demoStep]=[];const i=demoAnswers[demoStep].indexOf(val);if(i>-1){demoAnswers[demoStep].splice(i,1);el.classList.remove('selected')}else{demoAnswers[demoStep].push(val);el.classList.add('selected')}}
  else{demoAnswers[demoStep]=[val];document.querySelectorAll('.demo-option').forEach(o=>o.classList.remove('selected'));el.classList.add('selected')}
  updateDemoPreview()
}
function nextDemoStep(){if(!(demoAnswers[demoStep]||[]).length)return alert('Please select an option');demoStep++;renderDemoStep()}
function updateDemoPreview(){
  const wrap=document.getElementById('demo-preview-wrap')
  if(demoStep<1){wrap.innerHTML='';return}
  const type=(demoAnswers[0]||[])[0]||'',sections=demoAnswers[2]||[],style=(demoAnswers[3]||[])[0]||''
  if(!type){wrap.innerHTML='';return}
  wrap.innerHTML=`<div class="demo-preview-box"><h4>Your demo will include:</h4><p>${type}${style?' &middot; '+style+' style':''}</p>${sections.length?`<div class="demo-feature-tags">${sections.map(s=>`<span class="demo-tag">${s}</span>`).join('')}</div>`:''}</div>`
}
async function submitDemo(){
  const biz=document.getElementById('demo-biz-name')?.value,email=document.getElementById('demo-email')?.value
  if(!biz||!email)return alert('Please enter your business name and email')
  const answers={}
  DEMO_Q_LABELS.forEach((label,i)=>{if(demoAnswers[i]&&demoAnswers[i].length)answers[label]=(demoAnswers[i]||[]).join(', ')})
  try{await fetch(API+'/inquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({first_name:biz,business_name:biz,email,is_demo_request:true,demo_answers:answers})})}catch(e){}
  document.getElementById('demo-form-wrap').style.display='none'
  document.getElementById('demo-success').style.display='block'
}
async function submitInquiry(e){
  e.preventDefault()
  const websiteLink=document.getElementById('if-website')?.value||''
  const msg=document.getElementById('if-msg').value
  const fullMsg=websiteLink?`${msg}${msg?'\n\n':''}Website/social: ${websiteLink}`:msg
  try{await fetch(API+'/inquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({first_name:document.getElementById('if-fname').value,last_name:document.getElementById('if-lname').value,business_name:document.getElementById('if-biz').value,email:document.getElementById('if-email').value,phone:document.getElementById('if-phone').value,business_type:document.getElementById('if-type').value,existing_website:document.getElementById('if-existing').value,message:fullMsg,plan_interest:document.getElementById('if-plan').value,is_demo_request:false})})}catch(e){}
  document.getElementById('inquiry-form').style.display='none'
  document.getElementById('form-success').style.display='block'
}

let revenueChart=null
async function loadAdminData(){
  loadSiteSettingsForm()
  loadPaySettings()
  const token=getToken();if(!token)return
  try{
    const res=await fetch(API+'/admin/stats',{headers:{'Authorization':'Bearer '+token}})
    const data=await res.json()
    if(data.stats){document.getElementById('stat-clients').textContent=data.stats.total_clients;document.getElementById('stat-active').textContent=data.stats.active_websites;document.getElementById('stat-monthly').textContent='$'+data.stats.monthly_revenue;document.getElementById('stat-total').textContent='$'+data.stats.total_revenue}
    if(data.clients)renderClientsTable(data.clients.filter(c=>c.role==='client'||(!c.role&&!c.is_admin)))
    if(data.managers)renderStaffList(data.managers)
    if(data.monthly_chart)renderChart(data.monthly_chart)
    loadAdminCodes();loadManagerCodes();loadInquiries('admin');loadPipeline();loadAssetForms();loadSubmittedBriefs();loadDomainRequests();loadBonusGoals();loadAllChats('admin');loadAdminDemos()
  }catch(e){console.error(e)}
}

async function loadPaySettings(){
  try{
    const res=await fetch(API+'/site-settings')
    const s=await res.json()
    const cycleEl=document.getElementById('pay-cycle-days')
    const startEl=document.getElementById('period-start-date')
    if(cycleEl)cycleEl.value=s.pay_cycle_days||7
    if(startEl&&s.current_period_start)startEl.value=new Date(s.current_period_start).toISOString().split('T')[0]
  }catch(e){console.error(e)}
}
function renderChart(rows){
  const ctx=document.getElementById('revenue-chart');if(!ctx)return
  if(revenueChart)revenueChart.destroy()
  revenueChart=new Chart(ctx,{type:'bar',data:{labels:rows.map(r=>new Date(r.month).toLocaleDateString('en',{month:'short',year:'2-digit'})),datasets:[{label:'Revenue ($)',data:rows.map(r=>r.revenue),backgroundColor:'rgba(26,107,90,0.7)',borderRadius:6},{label:'New clients',data:rows.map(r=>r.new_clients),backgroundColor:'rgba(45,158,132,0.4)',borderRadius:6}]},options:{responsive:true,plugins:{legend:{position:'top'}},scales:{y:{beginAtZero:true}}}})
}
function renderStaffList(managers){
  const wrap=document.getElementById('staff-list')
  if(!managers||!managers.length){wrap.innerHTML='<p style="color:var(--ink-muted);font-size:14px;">No staff yet.</p>';return}
  const all=[...managers.filter(m=>m.role==='contractor'),...managers.filter(m=>m.role==='manager'||!m.role)]
  wrap.innerHTML=all.map(m=>{
    const total=parseFloat(m.total_brought_in)||0
    const totalAll=parseFloat(m.total_all_time)||0
    const rate=parseFloat(m.commission_rate||10)
    const orgRate=parseFloat(m.manager_commission_rate||0)
    const commission=Math.round(total*rate/100)
    const commissionAll=Math.round(totalAll*rate/100)
    const isManager=m.role==='manager'
    const id=m.id, email=m.email, role=m.role||'contractor'
    const encEmail = (email||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;')
    const roleTag=!isManager
      ?'<span style="background:#e8f4f1;color:var(--accent);border:1px solid var(--accent);border-radius:10px;padding:1px 8px;font-size:10px;font-weight:700;text-transform:uppercase;margin-left:6px;">Contractor</span>'
      :'<span style="background:#ede9ff;color:#7c3aed;border:1px solid #c4b5fd;border-radius:10px;padding:1px 8px;font-size:10px;font-weight:700;text-transform:uppercase;margin-left:6px;">Manager</span>'
    const swapLabel=isManager?'Make contractor':'Make manager'
    const orgRateRow=isManager
      ?'<span style="font-size:12px;color:var(--ink-muted);margin-left:8px;">Org % of all launch fees:</span>'
       +'<input type="number" value="'+orgRate+'" style="width:56px;padding:4px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius);" id="mcr-'+id+'" min="0" max="100">'
       +'<button class="action-btn" data-id="'+id+'" onclick="updateManagerOrgRateById(this)">Save</button>'
      :''
    return '<div class="staff-row" style="flex-direction:column;align-items:stretch;">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">'
      +'<div class="staff-info"><div class="staff-email">'+email+roleTag+'</div>'
      +'<div class="staff-meta">Own sales: '+rate+'% commission'+(isManager?' &middot; Org: '+orgRate+'% of all launch fees':'')+'</div></div>'
      +'<div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;">'
      +'<button id="period-toggle-'+id+'" onclick="toggleStaffPeriod('+id+')" style="background:var(--accent);color:white;border:none;border-radius:var(--radius);padding:4px 10px;font-family:var(--sans);font-size:11px;cursor:pointer;">This period</button>'
      +'<button id="alltime-toggle-'+id+'" onclick="toggleStaffPeriod('+id+')" style="background:var(--cream);border:1px solid var(--border);border-radius:var(--radius);padding:4px 10px;font-family:var(--sans);font-size:11px;cursor:pointer;display:none;">All time</button>'
      +'</div></div>'
      +'<div id="stats-period-'+id+'" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px;">'
      +'<div style="background:white;border:1px solid var(--border);border-radius:var(--radius);padding:10px;text-align:center;"><div style="font-size:20px;font-weight:700;">'+(m.websites_created||0)+'</div><div style="font-size:11px;color:var(--ink-muted);margin-top:2px;">Clients</div></div>'
      +'<div style="background:white;border:1px solid var(--border);border-radius:var(--radius);padding:10px;text-align:center;"><div style="font-size:20px;font-weight:700;">'+(m.briefs_sent||0)+'</div><div style="font-size:11px;color:var(--ink-muted);margin-top:2px;">Briefs sent</div></div>'
      +'<div style="background:white;border:1px solid var(--border);border-radius:var(--radius);padding:10px;text-align:center;"><div style="font-size:20px;font-weight:700;">$'+total.toFixed(0)+'</div><div style="font-size:11px;color:var(--ink-muted);margin-top:2px;">Launch fees</div></div>'
      +'<div style="background:#e8f4f1;border:1px solid var(--accent);border-radius:var(--radius);padding:10px;text-align:center;"><div style="font-size:20px;font-weight:700;color:var(--accent);">$'+commission+'</div><div style="font-size:11px;color:var(--accent);margin-top:2px;">Commission</div></div>'
      +'</div>'
      +'<div id="stats-alltime-'+id+'" style="display:none;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px;">'
      +'<div style="background:white;border:1px solid var(--border);border-radius:var(--radius);padding:10px;text-align:center;"><div style="font-size:20px;font-weight:700;">'+(m.websites_all_time||0)+'</div><div style="font-size:11px;color:var(--ink-muted);margin-top:2px;">Clients (all time)</div></div>'
      +'<div style="background:white;border:1px solid var(--border);border-radius:var(--radius);padding:10px;text-align:center;"><div style="font-size:20px;font-weight:700;">'+(m.briefs_sent||0)+'</div><div style="font-size:11px;color:var(--ink-muted);margin-top:2px;">Briefs sent</div></div>'
      +'<div style="background:white;border:1px solid var(--border);border-radius:var(--radius);padding:10px;text-align:center;"><div style="font-size:20px;font-weight:700;">$'+totalAll.toFixed(0)+'</div><div style="font-size:11px;color:var(--ink-muted);margin-top:2px;">Launch fees (all time)</div></div>'
      +'<div style="background:#e8f4f1;border:1px solid var(--accent);border-radius:var(--radius);padding:10px;text-align:center;"><div style="font-size:20px;font-weight:700;color:var(--accent);">$'+commissionAll+'</div><div style="font-size:11px;color:var(--accent);margin-top:2px;">Commission (all time)</div></div>'
      +'</div>'
      +'<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">'
      +'<span style="font-size:12px;color:var(--ink-muted);">Own sales %:</span>'
      +'<input type="number" value="'+rate+'" style="width:56px;padding:4px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius);" id="cr-'+id+'" min="0" max="100">'
      +'<button class="action-btn" data-id="'+id+'" onclick="updateCommissionById(this)">Save</button>'
      +orgRateRow
      +'<button class="action-btn staff-history-btn" style="background:var(--accent-light);border-color:var(--accent);color:var(--accent);margin-left:4px;" data-id="'+id+'" data-email="'+encEmail+'" onclick="viewPayHistoryById(this)">📋 History</button>'
      +'<button class="dash-save staff-close-btn" style="padding:4px 12px;font-size:12px;background:var(--purple);" data-id="'+id+'" data-email="'+encEmail+'" onclick="closePeriodById(this)">✓ Close period &amp; pay</button>'
      +'<button class="action-btn staff-swap-btn" data-id="'+id+'" data-role="'+role+'" onclick="swapRoleById(this)">'+swapLabel+'</button>'
      +'<button class="btn-remove staff-remove-btn" data-id="'+id+'" data-email="'+encEmail+'" onclick="removeManagerById(this)">Remove</button>'
      +'<button class="action-btn" data-id="'+id+'" data-blocked="'+(m.is_blocked?'true':'false')+'" onclick="setBlockedById(this)" style="background:'+(m.is_blocked?'#fef2f2':'')+';;color:'+(m.is_blocked?'#ef4444':'')+';">'+( m.is_blocked?'🔓 Unblock':'🚫 Block')+'</button>'
      +'</div>'
      +'<div id="pay-history-'+id+'" style="display:none;background:var(--cream);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-top:8px;">'
      +'<div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-muted);margin-bottom:10px;">Pay period history</div>'
      +'<div id="pay-history-inner-'+id+'"><p style="font-size:13px;color:var(--ink-muted);">Loading...</p></div>'
      +'</div>'
  }).join('')
}


function toggleStaffPeriod(id) {
  var periodDiv = document.getElementById('stats-period-' + id)
  var allDiv = document.getElementById('stats-alltime-' + id)
  var periodBtn = document.getElementById('period-toggle-' + id)
  var allBtn = document.getElementById('alltime-toggle-' + id)
  var showingPeriod = periodDiv.style.display !== 'none'
  periodDiv.style.display = showingPeriod ? 'none' : 'grid'
  allDiv.style.display = showingPeriod ? 'grid' : 'none'
  if (periodBtn) { periodBtn.style.display = showingPeriod ? '' : 'none'; periodBtn.style.background = 'var(--cream)'; periodBtn.style.color = 'var(--ink)'; periodBtn.style.border = '1px solid var(--border)' }
  if (allBtn) { allBtn.style.display = showingPeriod ? 'none' : ''; allBtn.style.background = showingPeriod ? 'var(--accent)' : 'var(--cream)'; allBtn.style.color = showingPeriod ? 'white' : 'var(--ink)'; allBtn.style.border = showingPeriod ? 'none' : '1px solid var(--border)' }
  // Swap button states
  if (showingPeriod) {
    if (periodBtn) { periodBtn.style.background='var(--cream)'; periodBtn.style.color='var(--ink)'; periodBtn.style.border='1px solid var(--border)' }
    if (allBtn) { allBtn.style.background='var(--accent)'; allBtn.style.color='white'; allBtn.style.border='none' }
  } else {
    if (periodBtn) { periodBtn.style.background='var(--accent)'; periodBtn.style.color='white'; periodBtn.style.border='none' }
    if (allBtn) { allBtn.style.background='var(--cream)'; allBtn.style.color='var(--ink)'; allBtn.style.border='1px solid var(--border)' }
  }
}

async function updateManagerOrgRate(id) {
  var rate = parseInt(document.getElementById('mcr-' + id)?.value)
  if (isNaN(rate)) return alert('Please enter a valid rate')
  try {
    var res = await fetch(API + '/admin/set-manager-rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ client_id: id, rate: rate })
    })
    var d = await res.json()
    if (d.message) alert('Org commission rate updated to ' + rate + '%')
    else alert(d.error || 'Failed')
  } catch(e) { alert('Could not connect to server') }
}

async function closePeriod(managerId, email){
  try{
    // Single unified endpoint handles both contractors and managers
    const res=await fetch(API+'/admin/close-period',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({manager_id:managerId})})
    const d=await res.json()
    if(d.message){
      alert('Period closed! Receipt sent to '+email+'. They earned $'+d.earnings+' from '+d.websites_count+' client'+( d.websites_count!==1?'s':'')+'.')
      loadAdminData()
    } else alert(d.error||'Failed')
  }catch(e){alert('Could not connect')}
}

async function viewPayHistory(managerId, email){
  const wrap=document.getElementById('pay-history-'+managerId)
  const inner=document.getElementById('pay-history-inner-'+managerId)
  if(wrap.style.display==='block'){wrap.style.display='none';return}
  wrap.style.display='block'
  try{
    const res=await fetch(API+'/admin/pay-periods/'+managerId,{headers:{'Authorization':'Bearer '+getToken()}})
    const data=await res.json()
    if(!data.periods||!data.periods.length){inner.innerHTML='<p style="font-size:13px;color:var(--ink-muted);">No closed pay periods yet.</p>';return}
    inner.innerHTML=data.periods.map(p=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px;">
        <div>
          <div style="font-weight:500;">${new Date(p.period_start).toLocaleDateString()} - ${new Date(p.period_end).toLocaleDateString()}</div>
          <div style="color:var(--ink-muted);">${p.websites_count} website${p.websites_count!==1?'s':''} &middot; ${p.commission_rate}% commission</div>
        </div>
        <div style="font-family:var(--serif);font-size:22px;color:var(--accent);">$${p.total_earned}</div>
      </div>`).join('')
  }catch(e){inner.innerHTML='<p style="font-size:13px;color:var(--red);">Failed to load</p>'}
}

async function savePaySettings(){
  const days=document.getElementById('pay-cycle-days')?.value||7
  const start=document.getElementById('period-start-date')?.value||new Date().toISOString().split('T')[0]
  try{
    const res=await fetch(API+'/admin/pay-settings',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({pay_cycle_days:parseInt(days),current_period_start:start})})
    const d=await res.json()
    if(d.message){const m=document.getElementById('save-msg-pay');m.classList.add('show');setTimeout(()=>m.classList.remove('show'),3000)}
    else alert(d.error||'Failed')
  }catch(e){alert('Could not connect')}
}
async function updateCommission(id){
  const rate=parseInt(document.getElementById('cr-'+id).value)
  try{const res=await fetch(API+'/admin/update-commission',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({client_id:id,commission_rate:rate})});const d=await res.json();if(d.message)alert('Commission updated!');else alert(d.error||'Failed')}catch(e){alert('Could not connect')}
}

function renderInquiryCard(iq,role){
  if(iq.closed||iq.status==='closed')return''
  const isClaimed=iq.status==='claimed'||iq.assigned_to
  const myToken=localStorage.getItem('wc_token')
  const myPayload=myToken?JSON.parse(atob(myToken.split('.')[1])):null
  const myId=myPayload?myPayload.id:null
  const myEmail=localStorage.getItem('wc_email')
  const claimedByMe=iq.assigned_to===myId||iq.claimed_by_email===myEmail
  const isAdmin=role==='admin'
  const canSeeEmail=claimedByMe||isAdmin

  let demoHTML=''
  if(iq.is_demo_request&&iq.demo_answers){
    try{
      const answers=typeof iq.demo_answers==='string'?JSON.parse(iq.demo_answers):iq.demo_answers
      const entries=Object.entries(answers).filter(([,v])=>v)
      if(entries.length){
        demoHTML=`<div class="iq-demo-answers"><h5>Demo questionnaire answers:</h5>${entries.map(([q,a])=>`<div class="da-item"><span class="da-q">${q}:</span><span>${a}</span></div>`).join('')}</div>`
      }
    }catch(e){}
  }

  const emailDisplay=canSeeEmail?iq.email:'(hidden)'
  const claimedByDisplay=iq.claimed_by_email||(iq.assigned_to?'Someone':'')

  return`<div class="inquiry-card ${isClaimed?'claimed':''}">
    <div class="iq-header">
      <div>
        <h4>${iq.business_name||((iq.first_name||'')+(iq.last_name?' '+iq.last_name:''))}</h4>
        <div class="iq-meta">
          ${canSeeEmail?`<strong>${iq.email}</strong>`:'<span title="Claim this inquiry to see contact details">📧 (hidden) (claim to reveal)</span>'}
          &middot; ${iq.phone&&canSeeEmail?iq.phone:'No phone'}
          &middot; ${new Date(iq.created_at).toLocaleDateString()}
          ${isClaimed?`. <strong style="color:var(--purple);">Claimed by ${claimedByDisplay}</strong>`:''}
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <span class="iq-badge ${iq.is_demo_request?'demo':iq.status||'new'}">${iq.is_demo_request?'Demo request':(iq.status||'new').charAt(0).toUpperCase()+(iq.status||'new').slice(1)}</span>
        ${isClaimed&&(claimedByMe||isAdmin)?`<button class="action-btn" style="font-size:11px;" onclick="unclaimInquiry('${iq.id}','${role}')">Release</button>`:''}
        ${claimedByMe||isAdmin?`<button class="action-btn danger" style="font-size:11px;" onclick="closeInquiry('${iq.id}','${role}')">Close</button>`:''}
      </div>
    </div>
    <div class="iq-details">
      <span>Business type: ${iq.business_type||'Not specified'}</span>
      <span>Plan interest: ${(iq.plan_interest||'standard').charAt(0).toUpperCase()+(iq.plan_interest||'standard').slice(1)}</span>
      <span>Existing site: ${iq.existing_website||'Unknown'}</span>
      <span>Message: ${iq.message?iq.message.substring(0,80)+(iq.message.length>80?'...':''):'None'}</span>
    </div>
    ${demoHTML}
    <div class="iq-actions">
      ${!isClaimed?`<button class="action-btn claim" onclick="claimInquiry('${iq.id}','${role}')">Claim this client</button>`:''}
      ${claimedByMe||isAdmin?`
        <button class="action-btn" onclick="updateIqStatus('${iq.id}','contacted','${role}')">Mark contacted</button>
        <button class="action-btn" onclick="updateIqStatus('${iq.id}','converted','${role}')">Mark converted</button>
      `:''}
    </div>
  </div>`
}

async function loadInquiries(role){
  const token=getToken();if(!token)return
  try{
    const res=await fetch(API+'/admin/inquiries',{headers:{'Authorization':'Bearer '+token}})
    const data=await res.json()
    const listId=role==='admin'?'admin-inquiries-list':'mgr-inquiries-list'
    const wrap=document.getElementById(listId)
    if(!data.inquiries||!data.inquiries.length){wrap.innerHTML='<p style="color:var(--ink-muted);font-size:14px;">No inquiries yet.</p>';return}
    wrap.innerHTML=data.inquiries.map(iq=>renderInquiryCard(iq,role)).join('')
  }catch(e){console.error(e)}
}
async function claimInquiry(id,role){
  try{
    const res=await fetch(API+'/admin/claim-inquiry',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({inquiry_id:id})})
    const d=await res.json()
    if(d.message){alert('OK Inquiry claimed! You can now see the contact details.');loadInquiries(role)}
    else alert(d.error||'Failed to claim')
  }catch(e){alert('Could not connect to server')}
}
async function unclaimInquiry(id,role){
  if(!confirm('Release this inquiry? It will become available for others to claim.'))return
  try{
    const res=await fetch(API+'/admin/unclaim-inquiry',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({inquiry_id:id})})
    const d=await res.json()
    if(d.message)loadInquiries(role)
    else alert(d.error||'Failed to release')
  }catch(e){alert('Could not connect to server')}
}
async function closeInquiry(id,role){
  if(!confirm('Close this inquiry? It will be removed from the list. This cannot be undone.'))return
  try{
    const res=await fetch(API+'/admin/close-inquiry',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({inquiry_id:id})})
    const d=await res.json()
    if(d.message)loadInquiries(role)
    else alert(d.error||'Failed to close')
  }catch(e){alert('Could not connect to server')}
}
async function updateIqStatus(id,status,role){
  try{
    await fetch(API+'/admin/inquiry-status',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({inquiry_id:id,status})})
    loadInquiries(role)
  }catch(e){}
}

async function loadManagerData(){
  const token=getToken();if(!token)return
  const role = getRole()
  const isContractor = role === 'contractor'

  // Update title and badge to reflect actual role
  var titleEl = document.getElementById('mgr-dashboard-title')
  var badgeEl = document.getElementById('mgr-role-badge')
  if (titleEl) titleEl.textContent = isContractor ? 'Contractor Dashboard' : 'Manager Dashboard'
  if (badgeEl) { badgeEl.textContent = isContractor ? 'Contractor' : 'Manager'; badgeEl.style.background = isContractor ? 'var(--accent-light)' : '#ede9ff'; badgeEl.style.color = isContractor ? 'var(--accent)' : '#7c3aed' }

  try{
    // load stats
    const res=await fetch(API+'/admin/stats',{headers:{'Authorization':'Bearer '+token}})
    const data=await res.json()
    if(data.stats)document.getElementById('mgr-stat-clients').textContent=data.stats.total_clients
    // Contractors only see their own clients; managers see all
    if(data.clients){
      var clients = data.clients.filter(c=>c.role==='client'||(!c.role&&!c.is_admin))
      if(isContractor){
        var myId = JSON.parse(atob(token.split('.')[1])).id
        clients = clients.filter(c => c.created_by == myId)
      }
      renderManagerTable(clients)
    }

    // load my earnings
    const earnRes=await fetch(API+'/manager/earnings',{headers:{'Authorization':'Bearer '+token}})
    const earnData=await earnRes.json()
    document.getElementById('mgr-stat-mine').textContent=earnData.websites_count||0
    document.getElementById('mgr-stat-earnings').textContent='$'+(earnData.total_earnings||0)
    document.getElementById('mgr-stat-rate').textContent=(earnData.commission_rate||10)+'%'

    // load earnings history
    renderManagerEarningsHistory(earnData)

    loadInquiries('manager')
    loadPipeline();loadMgrAssetForms();loadSubmittedBriefs();loadContractorBonus();loadDomainNotifications();loadAllChats('manager');loadAdminEmails();loadDemos();loadUnreadChatDots()
    // Show/hide manager-only sections
    var isManager = getRole() === 'manager'
    var codeSection = document.getElementById('mgr-contractor-codes-section')
    var allClientsSection = document.getElementById('mgr-all-clients-section')
    var staffPerfSection = document.getElementById('mgr-staff-perf-section')
    var aiWarn = document.getElementById('ai-warn-text')
    var aiNotice = document.getElementById('ai-monitor-notice')
    if (codeSection) codeSection.style.display = isManager ? '' : 'none'
    if (allClientsSection) allClientsSection.style.display = isManager ? '' : 'none'
    if (staffPerfSection) staffPerfSection.style.display = isManager ? '' : 'none'
    if (aiWarn) aiWarn.textContent = isManager ? 'You can view all contractor AI conversations below.' : ''
    if (aiNotice) aiNotice.style.display = (!isManager && getRole() === 'contractor') ? 'block' : 'none'
    if (isManager) {
      loadContractorCodes()
      loadMgrAllClients()
      loadMgrStaffPerf()
      loadAllContractorAIHistories()
    }
  }catch(e){console.error(e)}
}

function renderManagerEarningsHistory(current){
  const wrap=document.getElementById('mgr-earnings-history')
  if(!wrap)return
  const periodStart=current.period_start?new Date(current.period_start).toLocaleDateString():'This period'
  const periodEnd=new Date().toLocaleDateString()
  wrap.innerHTML=`
    <div style="background:var(--accent-light);border:1px solid rgba(26,107,90,0.2);border-radius:var(--radius-lg);padding:20px 24px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
        <div>
          <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--accent);margin-bottom:4px;">Current period</div>
          <div style="font-size:13px;color:var(--ink-muted);">${periodStart} - ${periodEnd}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:var(--serif);font-size:32px;color:var(--accent);">$${current.total_earnings||0}</div>
          <div style="font-size:12px;color:var(--ink-muted);">${current.websites_count||0} website${(current.websites_count||0)!==1?'s':''} &middot; ${current.commission_rate||10}% commission</div>
        </div>
      </div>
      ${current.websites&&current.websites.length?`
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(26,107,90,0.2);">
          ${current.websites.map(w=>`
            <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px solid rgba(26,107,90,0.1);">
              <span>${w.business_name||'-'} <span style="color:var(--ink-muted);text-transform:capitalize;">(${w.plan||'standard'})</span></span>
              <span style="color:var(--accent);font-weight:600;">$${Math.round((w.setup_fee||299)*(current.commission_rate||10)/100)}</span>
            </div>`).join('')}
        </div>`:'<p style="font-size:13px;color:var(--ink-muted);margin-top:12px;">No websites created this period yet.</p>'}
    </div>
    <p style="font-size:12px;color:var(--ink-muted);">Past pay period receipts are sent to your email when the admin closes the period.</p>
  `
}
function renderManagerTable(clients){
  const tbody=document.getElementById('mgr-clients-table-body')
  if(!clients.length){tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--ink-muted);padding:32px;">No clients yet.</td></tr>';return}
  tbody.innerHTML=clients.map(c=>`
    <tr>
      <td><button class="action-btn" onclick="toggleMgrDetail('${c.id}')"></button></td>
      <td>${c.email}</td><td>${c.business_name||'<span style="color:var(--ink-muted)">Not set</span>'}</td>
      <td><span class="plan-pill ${c.plan||'standard'}">${(c.plan||'standard').charAt(0).toUpperCase()+(c.plan||'standard').slice(1)}</span></td>
      <td>${buildClientStatus(c)}</td>
      <td style="font-size:12px;">${c.created_by_email||'-'}</td>
      <td>${new Date(c.created_at).toLocaleDateString()}</td>
    </tr>
    <tr class="client-detail-row" id="mgr-detail-${c.id}"><td colspan="7"><div class="client-detail-inner">
      <div class="detail-grid">
        <div class="detail-item"><div class="dl">Email</div><div class="dv">${c.email}</div></div>
        <div class="detail-item"><div class="dl">Subdomain</div><div class="dv">${c.subdomain?c.subdomain+'.siteflowa.com':'-'}</div></div>
        <div class="detail-item"><div class="dl">Plan</div><div class="dv">${c.plan||'standard'}</div></div>
        <div class="detail-item"><div class="dl">Status</div><div class="dv">${c.subscription_status||'pending'}</div></div>
        <div class="detail-item"><div class="dl">Business</div><div class="dv">${c.business_name||'-'}</div></div>
        <div class="detail-item"><div class="dl">Referral code</div><div class="dv" style="font-family:monospace;">${c.referral_code||'-'}</div></div>
        <div class="detail-item"><div class="dl">Created by</div><div class="dv">${c.created_by_email||'-'}</div></div>
        <div class="detail-item"><div class="dl">Active</div><div class="dv">${c.is_active?'✅ Yes':'❌ No'}</div></div>
      </div>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
        <button class="action-btn" style="background:#1a6b5a;color:white;border-color:#1a6b5a;" onclick="uploadSiteHtml('${c.website_id}','${c.email}')">🌐 Upload website</button>
      </div>
      <p class="readonly-notice">ℹ️ Contact admin to change pricing, plan, or delete this account.</p>
    </div></td></tr>
  `).join('')
}
function toggleMgrDetail(id){document.getElementById('mgr-detail-'+id).classList.toggle('open')}

async function mgrCreateWebsite(){
  const business_name=document.getElementById('mgr-new-biz').value
  const subdomain=document.getElementById('mgr-new-sub').value.toLowerCase().replace(/\s+/g,'-')
  const plan=document.getElementById('mgr-new-plan').value
  const s=siteSettings
  const setup_fee=plan==='basic'?s.plan_basic_setup||199:plan==='premium'?s.plan_premium_setup||499:s.plan_standard_setup||299
  const monthly_fee=plan==='basic'?s.plan_basic_price||29:plan==='premium'?s.plan_premium_price||79:s.plan_standard_price||49
  if(!business_name||!subdomain)return alert('Please fill in business name and subdomain')
  try{
    const res=await fetch(API+'/admin/create-website',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({business_name,subdomain,setup_fee,monthly_fee,plan,sections:{gallery:true,hours:true,contact:true}})})
    const d=await res.json()
    if(d.invite_code){document.getElementById('mgr-invite-code-display').textContent=d.invite_code;document.getElementById('mgr-invite-result').style.display='block';document.getElementById('mgr-new-biz').value='';document.getElementById('mgr-new-sub').value=''}
    else alert(d.error||'Failed')
  }catch(e){alert('Could not connect to server')}
}

function buildClientStatus(c) {
  // Suspended / missed payment
  if (c.subscription_status==='suspended') return '<span class="status-badge suspended">⚠️ Missed payment</span>'
  // Fully live - must have is_active=true AND launched stage AND subscription active
  if (c.is_active===true && c.onboarding_stage==='launched' && c.subscription_status==='active') {
    return '<span class="status-badge active">Live ✅</span>'
  }
  // Deposit paid check - use the actual deposit_paid column only
  const depositPaid = c.deposit_paid === true
  if (!depositPaid) return '<span class="status-badge pending">No deposit yet</span>'
  // Deposit paid - derive build state from site_html
  if (c.site_html) {
    return '<span class="status-badge active">Deposit paid ✓</span><div style="font-size:11px;font-weight:600;color:#3b82f6;margin-top:3px;">👁 In preview</div>'
  }
  return '<span class="status-badge active">Deposit paid ✓</span><div style="font-size:11px;font-weight:600;color:var(--accent);margin-top:3px;">🔨 WIP — Being built</div>'
}
function renderClientsTable(clients){
  const tbody=document.getElementById('clients-table-body')
  if(!clients.length){tbody.innerHTML='<tr><td colspan="10" style="text-align:center;color:var(--ink-muted);padding:32px;">No clients yet.</td></tr>';return}
  tbody.innerHTML=clients.map(c=>`
    <tr style="${c.subscription_status==='suspended'?'background:#fff1f1;':''}">
      <td><button class="action-btn" onclick="toggleDetail('${c.id}')"></button></td>
      <td>${c.email}</td><td>${c.business_name||'<span style="color:var(--ink-muted)">Not set</span>'}</td>
      <td><span class="plan-pill ${c.plan||'standard'}">${(c.plan||'standard').charAt(0).toUpperCase()+(c.plan||'standard').slice(1)}</span></td>
      <td>${buildClientStatus(c)}</td>
      <td>$${c.setup_fee||299}</td><td>$${c.monthly_fee||49}/mo</td>
      <td style="font-size:11px;max-width:120px;overflow:hidden;text-overflow:ellipsis;">${c.created_by_email||'-'}</td>
      <td>${new Date(c.created_at).toLocaleDateString()}</td>
      <td>
        <button class="action-btn" onclick="toggleWebsite('${c.website_id}',${!c.is_active})">${c.is_active?'Pause':'Activate'}</button>
        <button class="action-btn warn" onclick="showUpdateFeeModal('${c.id}')">Fee</button>
        <button class="action-btn" onclick="showTransferModal('${c.website_id}','${c.created_by_email||''}')">Transfer</button>
        <button class="action-btn danger" onclick="deleteClient('${c.id}','${c.email}')">Delete</button>
      </td>
    </tr>
    <tr class="client-detail-row" id="detail-${c.id}"><td colspan="10"><div class="client-detail-inner">
      <div class="detail-grid">
        <div class="detail-item"><div class="dl">Email</div><div class="dv">${c.email}</div></div>
        <div class="detail-item"><div class="dl">Subdomain</div><div class="dv">${c.subdomain?c.subdomain+'.siteflowa.com':'-'}</div></div>
        <div class="detail-item"><div class="dl">Plan</div><div class="dv">${c.plan||'standard'}</div></div>
        <div class="detail-item"><div class="dl">Status</div><div class="dv">${c.subscription_status||'pending'}</div></div>
        <div class="detail-item"><div class="dl">Business</div><div class="dv">${c.business_name||'-'}</div></div>
        <div class="detail-item"><div class="dl">Referral code</div><div class="dv" style="font-family:monospace;">${c.referral_code||'-'}</div></div>
        <div class="detail-item"><div class="dl">Created by</div><div class="dv">${c.created_by_email||'-'}</div></div>
        <div class="detail-item"><div class="dl">Active</div><div class="dv">${c.is_active?'✅ Yes':'❌ No'}</div></div>
      </div>
      <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--border);">
        <button class="action-btn" style="background:#1a6b5a;color:white;border-color:#1a6b5a;" onclick="uploadSiteHtml('${c.website_id}','${c.email}')">🌐 Upload website HTML</button>
        <span style="font-size:12px;color:var(--ink-muted);margin-left:8px;">Uploading HTML automatically sets status to "In preview"</span>
      </div>
      <div class="pricing-edit" style="margin-bottom:10px;">
        <label>Domain name</label>
        <input type="text" id="dn-${c.id}" value="${c.domain_name||''}" placeholder="e.g. mybusiness.com" style="padding:6px 10px;font-size:13px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);width:160px;">
        <input type="number" id="dc-${c.id}" value="${c.domain_cost||''}" placeholder="Setup $" style="padding:6px 8px;font-size:13px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);width:80px;">
        <input type="number" id="dy-${c.id}" value="${c.domain_yearly_fee||''}" placeholder="$/year" style="padding:6px 8px;font-size:13px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);width:80px;">
        <button class="dash-save" onclick="updateClientDomain('${c.id}')" style="padding:8px 14px;font-size:13px;">Save domain</button>
      </div>
      <div class="pricing-edit">
        <label>Plan</label>
        <select id="pl-${c.id}" onchange="updatePlanFeeDisplay('${c.id}')" style="width:110px;padding:6px 10px;font-size:13px;"><option value="basic" ${c.plan==='basic'?'selected':''}>Basic</option><option value="standard" ${(!c.plan||c.plan==='standard')?'selected':''}>Standard</option><option value="premium" ${c.plan==='premium'?'selected':''}>Premium</option></select>
        <button class="dash-save" onclick="updateClientPlan('${c.id}')" style="padding:8px 14px;font-size:13px;">Update plan</button>
        <span id="plan-fees-${c.id}" style="font-size:12px;color:var(--ink-muted);margin-left:8px;">${getPlanFeesLabel(c.plan||'standard')}</span>
      </div>

    </div></td></tr>
  `).join('')
}
function toggleDetail(id){document.getElementById('detail-'+id).classList.toggle('open')}

async function createWebsite(){
  const business_name=document.getElementById('new-biz-name').value
  const subdomain=document.getElementById('new-subdomain').value.toLowerCase().replace(/\s+/g,'-')
  const plan=document.getElementById('new-plan').value
  const s=siteSettings
  const setup_fee=plan==='basic'?s.plan_basic_setup||199:plan==='premium'?s.plan_premium_setup||499:s.plan_standard_setup||299
  const monthly_fee=plan==='basic'?s.plan_basic_price||29:plan==='premium'?s.plan_premium_price||79:s.plan_standard_price||49
  if(!business_name||!subdomain)return alert('Please fill in business name and subdomain')
  const sections={gallery:true,hours:true,contact:true,services:true,team:true,menu:false}
  try{
    const res=await fetch(API+'/admin/create-website',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({business_name,subdomain,setup_fee,monthly_fee,plan,sections})})
    const d=await res.json()
    if(d.invite_code){document.getElementById('invite-code-display').textContent=d.invite_code;document.getElementById('invite-result').style.display='block';document.getElementById('new-biz-name').value='';document.getElementById('new-subdomain').value='';loadAdminData()}
    else alert(d.error||'Failed to create website')
  }catch(e){alert('Could not connect to server')}
}
async function toggleWebsite(wid,activate){
  if(!wid||wid==='null')return alert('No website linked yet')
  try{const res=await fetch(API+'/admin/toggle-website',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({website_id:wid,is_active:activate})});const d=await res.json();if(d.message)loadAdminData();else alert(d.error||'Failed')}catch(e){alert('Could not connect')}
}
async function updatePricing(wid,cid){
  if(!wid||wid==='null')return alert('No website linked yet')
  try{const res=await fetch(API+'/admin/update-pricing',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({website_id:wid,setup_fee:parseInt(document.getElementById('sf-'+cid).value),monthly_fee:parseInt(document.getElementById('mf-'+cid).value)})});const d=await res.json();if(d.message){alert('Pricing updated!');loadAdminData()}else alert(d.error||'Failed')}catch(e){alert('Could not connect')}
}
function getPlanFeesLabel(plan) {
  var ss = siteSettings || {}
  var fees = {
    basic:    { setup: ss.plan_basic_setup    || 199, monthly: ss.plan_basic_price    || 29  },
    standard: { setup: ss.plan_standard_setup || 299, monthly: ss.plan_standard_price || 49  },
    premium:  { setup: ss.plan_premium_setup  || 499, monthly: ss.plan_premium_price  || 79  }
  }
  var f = fees[plan] || fees[plan] || fees.standard
  return 'Setup: $' + f.setup + ' &middot; $' + f.monthly + '/mo'
}
function updatePlanFeeDisplay(cid) {
  var plan = document.getElementById('pl-' + cid)?.value || 'standard'
  var el = document.getElementById('plan-fees-' + cid)
  if (el) el.innerHTML = getPlanFeesLabel(plan)
}
async function updateClientPlan(cid){
  const plan=document.getElementById('pl-'+cid).value
  var ss = siteSettings || {}
  var fees = {
    basic:    { setup: ss.plan_basic_setup    || 199, monthly: ss.plan_basic_price    || 29  },
    standard: { setup: ss.plan_standard_setup || 299, monthly: ss.plan_standard_price || 49  },
    premium:  { setup: ss.plan_premium_setup  || 499, monthly: ss.plan_premium_price  || 79  }
  }
  var f = fees[plan] || fees.standard
  try{
    const res=await fetch(API+'/admin/update-client-plan',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({client_id:cid,plan,setup_fee:f.setup,monthly_fee:f.monthly})})
    const d=await res.json()
    if(d.message){ loadAdminData() } else alert(d.error||'Failed')
  }catch(e){alert('Could not connect')}
}
async function updateSections(wid,cid){
  if(!wid||wid==='null')return alert('No website linked yet')
  const sections={};SECTIONS.forEach(s=>{sections[s]=document.getElementById('sec-'+s+'-'+cid)?.checked||false})
  try{const res=await fetch(API+'/admin/update-sections',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({website_id:wid,sections})});const d=await res.json();if(d.message){alert('Sections updated!');loadAdminData()}else alert(d.error||'Failed')}catch(e){alert('Could not connect')}
}
function showUpdateFeeModal(cid){const amount=prompt('Enter update fee amount ($):');if(!amount||isNaN(amount))return;chargeUpdateFee(cid,parseInt(amount))}
async function chargeUpdateFee(cid,amount){
  try{const res=await fetch(API+'/admin/charge-update-fee',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({client_id:cid,amount})});const d=await res.json();if(d.message){alert('Update fee of $'+amount+' set. Client will be prompted to pay before accessing their dashboard.');loadAdminData()}else alert(d.error||'Failed')}catch(e){alert('Could not connect')}
}
async function deleteClient(cid,email){
  if(!confirm('Delete '+email+'? This removes their account, website, and all data. Cannot be undone.'))return
  try{const res=await fetch(API+'/admin/delete-client/'+cid,{method:'DELETE',headers:{'Authorization':'Bearer '+getToken()}});const d=await res.json();if(d.message)loadAdminData();else alert(d.error||'Failed')}catch(e){alert('Could not connect')}
}
async function loadManagerCodes(){
  try{
    const res=await fetch(API+'/admin/manager-codes',{headers:{'Authorization':'Bearer '+getToken()}})
    const data=await res.json()
    document.getElementById('manager-codes-list').innerHTML=!data.codes||!data.codes.length?'<span style="font-size:13px;color:var(--ink-muted);">No codes yet</span>':data.codes.map(c=>`<div class="manager-code-pill ${c.used?'used':''}">${c.code} ${c.used?'<span style="font-size:10px;">(used by '+(c.assigned_email||'someone')+')</span>':'<span style="font-size:10px;color:var(--accent);">* available</span>'}</div>`).join('')
  }catch(e){console.error(e)}
}
async function loadAdminCodes(){
  try{
    const res=await fetch(API+'/admin/admin-codes',{headers:{'Authorization':'Bearer '+getToken()}})
    const data=await res.json()
    document.getElementById('admin-codes-list').innerHTML=!data.codes||!data.codes.length?'<span style="font-size:13px;color:var(--ink-muted);">No codes yet</span>':data.codes.map(c=>`<div class="manager-code-pill ${c.used?'used':''}">${c.code} ${c.used?'<span style="font-size:10px;">(used)</span>':'<span style="font-size:10px;color:#b71c1c;">* available</span>'}</div>`).join('')
  }catch(e){console.error(e)}
}
async function createManagerCode(){const code=(document.getElementById('new-manager-role-code')||document.getElementById('new-manager-code'))?.value.trim();if(!code)return alert('Please enter a code');try{const res=await fetch(API+'/admin/create-manager-code',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({code})});const d=await res.json();if(d.message){var el=document.getElementById('new-manager-role-code')||document.getElementById('new-manager-code');if(el)el.value='';loadManagerCodes()}else alert(d.error||'Failed')}catch(e){alert('Could not connect')}}
async function createAdminCode(){const code=document.getElementById('new-admin-code').value.trim();if(!code)return alert('Please enter a code');try{const res=await fetch(API+'/admin/create-admin-code',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({code})});const d=await res.json();if(d.message){document.getElementById('new-admin-code').value='';loadAdminCodes()}else alert(d.error||'Failed')}catch(e){alert('Could not connect')}}
async function removeManager(cid,email){if(!confirm('Remove manager access for '+email+'?'))return;try{const res=await fetch(API+'/admin/remove-manager/'+cid,{method:'DELETE',headers:{'Authorization':'Bearer '+getToken()}});const d=await res.json();if(d.message)loadAdminData();else alert(d.error||'Failed')}catch(e){alert('Could not connect')}}

function switchPanel(name,el){document.querySelectorAll('.dash-panel').forEach(p=>p.classList.remove('active'));document.querySelectorAll('.dash-nav-item').forEach(n=>n.classList.remove('active'));document.getElementById('panel-'+name).classList.add('active');el.classList.add('active')}
function savePanel(btn){const p=btn.closest('.dash-panel');const m=p.querySelector('.save-msg');if(m){m.classList.add('show');setTimeout(()=>m.classList.remove('show'),3000)}}
window.addEventListener('load',()=>{
  var loginModal=document.getElementById('login-modal')
  if(loginModal) loginModal.addEventListener('click',function(e){if(e.target===this)closeLogin()})
  loadSiteSettings()
  const params=new URLSearchParams(window.location.search)
  if(params.get('token')){
    // Already handled at top of script — just ensure it stays shown
    return
  }
  if(params.get('brief')){
    var bPlan = params.get('plan') || 'standard'
    var bEmail = params.get('email') || ''
    showPage('assetform')
    try { initBriefForm(bPlan, bEmail) } catch(e) { console.error('Brief form init error:', e) }
  }
})
// ── WEBSITE BRIEFS (Send asset form to client) ──────
async function sendAssetFormShared(){
  const email=document.getElementById('brief-email-shared').value.trim()
  const plan=document.getElementById('brief-plan-shared').value
  if(!email)return alert('Please enter a client email')
  try{
    const res=await fetch(API+'/admin/send-brief',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({email,plan})})
    const d=await res.json()
    if(d.message){
      document.getElementById('brief-email-shared').value=''
      const m=document.getElementById('save-msg-brief-shared');m.classList.add('show');setTimeout(()=>m.classList.remove('show'),3000)
    }else alert(d.error||'Failed to send')
  }catch(e){alert('Could not connect to server')}
}

async function sendAssetFormMgr(){
  const email=document.getElementById('brief-email-mgr').value.trim()
  const plan=document.getElementById('brief-plan-mgr').value
  if(!email)return alert('Please enter a client email')
  try{
    const res=await fetch(API+'/admin/send-brief',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({email,plan})})
    const d=await res.json()
    if(d.message){
      document.getElementById('brief-email-mgr').value=''
      const m=document.getElementById('save-msg-brief-mgr');m.classList.add('show');setTimeout(()=>m.classList.remove('show'),3000)
    }else alert(d.error||'Failed to send')
  }catch(e){alert('Could not connect to server')}
}

// ── CLIENT TRANSFER ─────────────────────────────────
async function showTransferModal(websiteId, currentCreator) {
  try {
    const res = await fetch(API + '/admin/staff-list', { headers: { 'Authorization': 'Bearer ' + getToken() } })
    const d = await res.json()
    const staff = d.staff || []

    const overlay = document.createElement('div')
    overlay.className = 'transfer-overlay'
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;'

    const modal = document.createElement('div')
    modal.style.cssText = 'background:white;border-radius:18px;max-width:480px;width:90%;padding:32px;'
    modal.innerHTML = '<h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 8px;">Transfer Client</h2>' +
      '<p style="font-size:13px;color:#666;margin-bottom:20px;">Assign this client to a different contractor or manager.</p>' +
      '<div style="margin-bottom:20px;"><label style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#999;display:block;margin-bottom:6px;">New Creator</label>' +
      '<select id="transfer-select" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;font-family:inherit;">' +
      '<option value="">Select contractor or manager...</option>' +
      staff.map(function(s) { return '<option value="' + s.id + '">' + s.email + ' (' + s.role + ')</option>' }).join('') +
      '</select></div>' +
      '<div style="display:flex;gap:10px;">' +
      '<button onclick="doTransfer(\'' + websiteId + '\')" style="flex:1;padding:12px;background:#1a6b5a;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:500;">Transfer</button>' +
      '<button onclick="this.closest(\'.transfer-overlay\').remove()" style="padding:12px 20px;background:#f5f5f5;border:1px solid #ddd;border-radius:8px;cursor:pointer;font-size:14px;">Cancel</button>' +
      '</div>'

    overlay.appendChild(modal)
    document.body.appendChild(overlay)

    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove() })
  } catch(e) {
    alert('Could not load staff list')
  }
}

async function doTransfer(websiteId) {
  var sel = document.getElementById('transfer-select')
  if (!sel || !sel.value) return alert('Please select a contractor or manager')
  try {
    var res = await fetch(API + '/admin/transfer-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ website_id: websiteId, new_creator_id: sel.value })
    })
    var d = await res.json()
    if (d.message) {
      alert('Client transferred successfully!')
      document.querySelector('.transfer-overlay').remove()
      loadAdminData()
    } else {
      alert(d.error || 'Transfer failed')
    }
  } catch(e) {
    alert('Could not connect to server')
  }
}

// ── SEND INVITE CODE EMAIL ──────────────────────────
async function sendInviteCodeEmail() {
  var email = document.getElementById('invite-email-send').value.trim()
  var code = document.getElementById('invite-code-display').textContent
  if (!email) return alert('Please enter the client email')
  if (!code || code === '——') return alert('No invite code generated yet')
  try {
    var res = await fetch(API + '/admin/send-invite-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ email: email, invite_code: code })
    })
    var d = await res.json()
    if (d.message) {
      var m = document.getElementById('save-msg-invite-email')
      m.classList.add('show')
      setTimeout(function() { m.classList.remove('show') }, 3000)
    } else {
      alert(d.error || 'Failed to send')
    }
  } catch(e) {
    alert('Could not connect to server')
  }
}

// ── HOLDING PAGE (Building / Review stages) ─────────
function showHoldingPage(stage, website) {
  var wrap = document.getElementById('holding-content')
  var clientId = getToken() ? JSON.parse(atob(getToken().split('.')[1])).id : null
  var chatSection = clientId ? buildClientChatSection(clientId) : ''

  if (stage === 'building') {
    wrap.innerHTML =
      '<div style="max-width:680px;margin:0 auto;">' +
      '<div style="text-align:center;margin-bottom:32px;">' +
      '<div style="font-size:48px;margin-bottom:16px;">🏗️</div>' +
      '<h2 style="font-family:Georgia,serif;font-size:28px;margin-bottom:12px;">We\'re building your website!</h2>' +
      '<p style="color:#4a4f5e;font-size:15px;line-height:1.6;margin-bottom:20px;">Thank you for your deposit. Our team is now working on your website. We will notify you by email as soon as it is ready to preview.</p>' +
      '<div style="background:#f0faf7;border:1px solid rgba(26,107,90,0.2);border-radius:12px;padding:20px;text-align:left;margin-bottom:20px;">' +
      '<div style="font-size:13px;font-weight:600;color:#1a6b5a;margin-bottom:8px;">What happens next?</div>' +
      '<ol style="font-size:14px;color:#4a4f5e;line-height:1.8;margin:0;padding-left:20px;">' +
      '<li>We build your website based on your brief</li>' +
      '<li>You will get an email when it is ready to preview</li>' +
      '<li>Review it, request any changes via the chat below</li>' +
      '<li>Approve it and it goes live!</li>' +
      '</ol></div>' +
      '<button onclick="doLogout()" style="padding:10px 24px;background:#f5f5f5;border:1px solid #ddd;border-radius:8px;cursor:pointer;font-size:14px;">Log out</button>' +
      '</div>' +
      chatSection +
      '</div>'
  } else if (stage === 'review') {
    wrap.innerHTML =
      '<div style="max-width:680px;margin:0 auto;">' +
      '<div style="text-align:center;margin-bottom:32px;">' +
      '<div style="font-size:48px;margin-bottom:16px;">✨</div>' +
      '<h2 style="font-family:Georgia,serif;font-size:28px;margin-bottom:12px;">Your website is ready to review!</h2>' +
      '<p style="color:#4a4f5e;font-size:15px;line-height:1.6;margin-bottom:20px;">Take a look at your website using the preview link. Request any final changes in the chat below, then click approve when you\'re happy.</p>' +
      (website?.subdomain ? '<a href="/client/' + website.subdomain + '" target="_blank" style="display:inline-block;margin-bottom:16px;padding:14px 28px;background:#1a6b5a;color:white;text-decoration:none;border-radius:8px;font-weight:500;font-size:15px;">🌐 Preview your website</a><br>' : '<p style="color:#888;font-size:13px;margin-bottom:16px;">Preview link not yet available — check back soon.</p>') +
      '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:8px;">' +
      '<button onclick="approveWebsite()" style="padding:14px 28px;background:#1a6b5a;color:white;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-weight:500;">✅ I\'m happy — make it live!</button>' +
      '<button onclick="doLogout()" style="padding:14px 28px;background:#f5f5f5;border:1px solid #ddd;border-radius:8px;cursor:pointer;font-size:14px;">Log out</button>' +
      '</div>' +
      '<p style="font-size:12px;color:#999;">Once you approve and complete payment, your website goes live instantly.</p>' +
      '</div>' +
      chatSection +
      '</div>'
  }
  showPage('holding')
  // Load chat messages after DOM is ready
  if (clientId) setTimeout(function(){ loadClientChat(clientId) }, 100)
}

function buildClientChatSection(clientId) {
  return '<div style="background:white;border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-top:8px;">' +
    '<div style="background:#1a6b5a;color:white;padding:14px 20px;display:flex;align-items:center;gap:10px;">' +
    '<span style="font-size:18px;">💬</span>' +
    '<div><div style="font-weight:600;font-size:15px;">Chat with your website team</div>' +
    '<div style="font-size:12px;opacity:0.85;">Ask questions, request changes, discuss your domain name</div></div>' +
    '</div>' +
    '<div id="client-chat-messages" style="height:280px;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;">' +
    '<p style="text-align:center;color:#aaa;font-size:13px;margin:auto;">Loading messages...</p>' +
    '</div>' +
    '<div style="border-top:1px solid var(--border);padding:12px 16px;display:flex;gap:8px;">' +
    '<label style="cursor:pointer;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:18px;line-height:1;" title="Send image">📎<input type="file" id="client-img-file" accept="image/*" style="display:none;" onchange="previewClientChatImage(this)"></label>' +
    '<input id="client-chat-input" type="text" placeholder="Type a message..." onkeydown="if(event.key===&quot;Enter&quot;)sendClientChatMsg(this.dataset.id)" data-id="' + clientId + '" ' +
    'style="flex:1;padding:10px 14px;border:1px solid var(--border);border-radius:8px;font-family:var(--sans);font-size:14px;">' +
    '<button onclick="sendClientChatMsg(this.dataset.id)" data-id="' + clientId + '" style="background:#1a6b5a;color:white;border:none;border-radius:8px;padding:10px 18px;font-family:var(--sans);font-size:14px;font-weight:500;cursor:pointer;">Send</button>' +
    '</div></div>'
}

async function loadClientChat(clientId) {
  var wrap = document.getElementById('client-chat-messages')
  if (!wrap) return
  try {
    var res = await fetch(API + '/messages/' + clientId, {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    var d = await res.json()
    var msgs = d.messages || []
    if (!msgs.length) {
      wrap.innerHTML = '<p style="text-align:center;color:#aaa;font-size:13px;margin:auto;">No messages yet. Say hi to your team!</p>'
      return
    }
    var myId = JSON.parse(atob(getToken().split('.')[1])).id
    wrap.innerHTML = msgs.map(function(m) {
      var isMe = m.sender_id == myId || m.sender_role === 'client'
      var imgHtml = m.image_url ? '<div style="margin-top:6px;"><img src="' + m.image_url + '" style="max-width:200px;max-height:200px;border-radius:8px;display:block;cursor:pointer;" onclick="window.open(this.src,\'_blank\')"></div>' : ''
      return '<div style="display:flex;' + (isMe ? 'justify-content:flex-end' : 'justify-content:flex-start') + ';">' +
        '<div style="max-width:75%;background:' + (isMe ? '#1a6b5a' : '#f3f4f6') + ';color:' + (isMe ? 'white' : '#111') + ';' +
        'border-radius:' + (isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px') + ';padding:10px 14px;font-size:14px;line-height:1.5;">' +
        (isMe ? '' : '<div style="font-size:11px;font-weight:600;color:#1a6b5a;margin-bottom:3px;">Your team</div>') +
        (m.content || '') + imgHtml +
        '</div></div>'
    }).join('')
    wrap.scrollTop = wrap.scrollHeight
  } catch(e) {
    wrap.innerHTML = '<p style="text-align:center;color:#aaa;font-size:13px;margin:auto;">Could not load messages.</p>'
  }
}

async function sendClientChatMsg(idOrBtn) {
  var clientId = typeof idOrBtn === 'string' ? idOrBtn : idOrBtn.getAttribute('data-id')
  var inp = document.getElementById('client-chat-input')
  var content = inp?.value.trim()
  if (!content && !_clientChatImageData) return
  if (inp) inp.value = ''
  var imgData = _clientChatImageData
  _clientChatImageData = null
  var prev = document.getElementById('client-img-preview')
  if (prev) prev.remove()
  try {
    var res = await fetch(API + '/messages/' + clientId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ content: content || '', image_url: imgData || null })
    })
    var d = await res.json()
    if (d.message) loadClientChat(clientId)
    else { if (inp) inp.value = content; alert(d.error || 'Failed to send') }
  } catch(e) { if (inp) inp.value = content; alert('Could not connect') }
}

// ── APPROVE WEBSITE (triggers final payment) ────────
async function approveWebsite() {
  if (!confirm('Approve your website and make it live? You will be redirected to pay the remaining launch fee.')) return
  try {
    // Use actual deposit_amount from DB (what was really charged), not a recalculation
    var fullFee = currentWebsite?.setup_fee || 299
    var actualDepositPaid = window._clientDepositAmount || 0
    var remaining
    if (actualDepositPaid > 0) {
      // Use the exact amount already charged
      remaining = Math.max(0, fullFee - actualDepositPaid)
    } else {
      // Fallback: recalculate (siteSettings may not have loaded)
      var depositPct = (siteSettings?.deposit_percent || 50) / 100
      remaining = Math.max(0, fullFee - Math.round(fullFee * depositPct))
    }
    var res = await fetch(API + '/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ setup_fee: remaining, monthly_fee: currentWebsite?.monthly_fee || 49, plan: currentWebsite?.plan || 'standard', business_name: currentWebsite?.business_name || '' })
    })
    var d = await res.json()
    if (d.url) {
      window.location.href = d.url
    } else {
      alert(d.error || 'Could not create checkout session')
    }
  } catch(e) {
    alert('Could not connect to server')
  }
}

// ── PAY DEPOSIT ─────────────────────────────────────
async function payDeposit() {
  try {
    var res = await fetch(API + '/pay-deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() }
    })
    var d = await res.json()
    if (d.url) {
      window.location.href = d.url
    } else {
      alert(d.error || 'Could not start payment. Please try again.')
    }
  } catch(e) {
    alert('Could not connect to server')
  }
}

// ── EMAIL CENTER ────────────────────────────────────

function updateEmailFields() {
  var type = document.getElementById('email-center-type').value
  var planField = document.getElementById('email-plan-field')
  var extraFields = document.getElementById('email-extra-fields')
  var customField = document.getElementById('email-custom-field')
  
  planField.style.display = type === 'brief' ? '' : 'none'
  extraFields.style.display = type === 'invite' ? '' : 'none'
  customField.style.display = type === 'custom' ? '' : 'none'
  
  if (type === 'invite') {
    document.getElementById('email-extra-label').textContent = 'Invite code'
    document.getElementById('email-center-extra').placeholder = 'e.g. ABC123'
  }
}

async function sendEmailCenter() {
  var email = document.getElementById('email-center-to').value.trim()
  var type = document.getElementById('email-center-type').value
  if (!email) return alert('Please enter a client email')
  
  var endpoint = ''
  var body = {}
  
  if (type === 'brief') {
    var plan = document.getElementById('email-center-plan').value
    endpoint = '/admin/send-brief'
    body = { email: email, plan: plan }
  } else if (type === 'invite') {
    var code = document.getElementById('email-center-extra').value.trim()
    if (!code) return alert('Please enter the invite code')
    endpoint = '/admin/send-invite-email'
    body = { email: email, invite_code: code }
  } else if (type === 'ready') {
    endpoint = '/admin/send-ready-email'
    body = { email: email }
  } else if (type === 'custom') {
    var subject = document.getElementById('email-center-subject').value.trim()
    var message = document.getElementById('email-center-message').value.trim()
    if (!subject || !message) return alert('Please fill in subject and message')
    endpoint = '/admin/send-custom-email'
    body = { email: email, subject: subject, message: message }
  }
  
  try {
    var res = await fetch(API + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify(body)
    })
    var d = {}
    try { d = await res.json() } catch(jsonErr) { d = { message: 'sent' } }
    
    sentEmailsLog.unshift({ to: email, type: type, time: new Date().toLocaleTimeString() })
    renderSentEmails()
    
    var m = document.getElementById('save-msg-email-center')
    m.classList.add('show')
    setTimeout(function() { m.classList.remove('show') }, 3000)
    
    document.getElementById('email-center-to').value = ''
    if (type === 'invite') document.getElementById('email-center-extra').value = ''
    if (type === 'custom') {
      document.getElementById('email-center-subject').value = ''
      document.getElementById('email-center-message').value = ''
    }
  } catch(e) {
    console.error('Email send error:', e)
    sentEmailsLog.unshift({ to: email, type: type, time: new Date().toLocaleTimeString() })
    renderSentEmails()
    var m = document.getElementById('save-msg-email-center')
    m.classList.add('show')
    setTimeout(function() { m.classList.remove('show') }, 3000)
    document.getElementById('email-center-to').value = ''
  }
}

function renderSentEmails() {
  var wrap = document.getElementById('sent-emails-wrap')
  if (!sentEmailsLog.length) {
    wrap.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No emails sent yet this session.</p>'
    return
  }
  var typeLabels = { brief: '📋 Brief Form', invite: '🔑 Invite Code', ready: '✨ Website Ready', custom: '✉️ Custom' }
  wrap.innerHTML = sentEmailsLog.map(function(e) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border:1px solid var(--border);border-radius:var(--radius);margin-bottom:6px;font-size:13px;">' +
      '<div><strong>' + e.to + '</strong> — ' + (typeLabels[e.type] || e.type) + '</div>' +
      '<div style="color:var(--ink-muted);">' + e.time + '</div>' +
      '</div>'
  }).join('')
}

// ── BRIEF FORM (Client fills this out) ──────────────
var briefPlan = 'standard'
var briefEmail = ''
var briefPhotoCount = 0
var briefServiceCount = 0
var briefLimits = {
  basic: { photos: 2, services: 3, pages: 1, hours: false },
  standard: { photos: 8, services: 10, pages: 4, hours: true },
  premium: { photos: 999, services: 999, pages: 999, hours: true }
}

function initBriefForm(plan, email) {
  briefPlan = plan || 'standard'
  briefEmail = email || ''
  briefPhotoCount = 0
  briefServiceCount = 0
  briefPageCount = 0

  window._briefInitialising = true
  selectBriefPlan(briefPlan)
  window._briefInitialising = false

  // Clear lists and add one starter row each
  var photosList = document.getElementById('bf-photos-list')
  var servicesList = document.getElementById('bf-services-list')
  var pagesList = document.getElementById('bf-pages-list')
  if (photosList) photosList.innerHTML = ''
  if (servicesList) servicesList.innerHTML = ''
  if (pagesList) pagesList.innerHTML = ''

  addBriefService()
  addBriefPhoto()
  // Basic plan gets Home pre-filled, others start empty
  if (briefPlan === 'basic') {
    briefPageCount = 0
    addBriefPage()
    var firstPage = document.querySelector('.bf-page-input')
    if (firstPage) { firstPage.value = 'Home'; firstPage.readOnly = true }
  }
}

function selectBriefPlan(plan) {
  // Reset ALL counts when plan changes
  briefPageCount = 0
  briefPhotoCount = 0
  briefServiceCount = 0
  // Reset photo list
  var photosList = document.getElementById('bf-photos-list')
  if (photosList) photosList.innerHTML = ''
  // Reset services list  
  var servicesList = document.getElementById('bf-services-list')
  if (servicesList) servicesList.innerHTML = ''
  // Update limits display
  var photoLim = document.getElementById('bf-photos-limit')
  var servLim = document.getElementById('bf-services-limit')
  var lims = { basic: {photos:2,services:3}, standard: {photos:8,services:10}, premium: {photos:999,services:999} }
  var l = lims[plan] || lims.standard
  if (photoLim) photoLim.textContent = 'You can add up to ' + (l.photos < 999 ? l.photos : 'unlimited') + ' photos.'
  if (servLim) servLim.textContent = 'You can list up to ' + (l.services < 999 ? l.services : 'unlimited') + ' items. ' + (plan === 'basic' ? '(Basic plan)' : '')
  var pagesList = document.getElementById('bf-pages-list')
  var addPageBtn = document.getElementById('bf-add-page-btn')
  if (pagesList) pagesList.innerHTML = ''
  if (addPageBtn) {
    addPageBtn.style.display = plan === 'basic' ? 'none' : ''
  }
  // Update hours disclaimer based on plan
  var hoursNotice = document.getElementById('hours-plan-notice')
  if (hoursNotice) {
    if (plan === 'basic') {
      hoursNotice.innerHTML = '<div style="background:#fff8e6;border:1px solid #fcd34d;border-radius:var(--radius);padding:10px 14px;font-size:13px;color:#92400e;"><strong>⚠️ Basic plan notice:</strong> Business hours are set here and baked into your website. They <strong>cannot be updated later</strong> through your dashboard — you would need to contact us to make changes. Make sure your hours are correct before submitting.</div>'
    } else {
      hoursNotice.innerHTML = '<div style="background:#e8f4f1;border:1px solid #6ee7b7;border-radius:var(--radius);padding:10px 14px;font-size:13px;color:#065f46;"><strong>✅ ' + plan.charAt(0).toUpperCase() + plan.slice(1) + ' plan:</strong> You can update your business hours anytime from your client dashboard after your website goes live.</div>'
    }
  }

  if (plan === 'basic') {
    // Basic: only Home page, pre-filled and locked
    if (pagesList) {
      briefPageCount = 1
      var div = document.createElement('div')
      div.style.cssText = 'display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;'
      var inp = document.createElement('input')
      inp.type='text'; inp.className='bf-page-input'; inp.value='Home'; inp.readOnly=true
      inp.style.cssText='padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:13px;background:var(--cream);color:var(--ink-muted);'
      var lck = document.createElement('span')
      lck.style.cssText='padding:8px 10px;color:var(--ink-muted);font-size:13px;'
      lck.textContent='🔒 Only page on Basic'
      div.appendChild(inp); div.appendChild(lck)
      pagesList.appendChild(div)
    }
    // Hide bf-pages-limit and show message
    var lim = document.getElementById('bf-pages-limit')
    if (lim) lim.textContent = '(Basic plan includes Home page only)'
  } else {
    var lim = document.getElementById('bf-pages-limit')
    var maxPages = plan === 'premium' ? 12 : 4
    if (lim) lim.textContent = 'You can add up to ' + maxPages + ' pages on the ' + plan + ' plan.'
  }
  briefPlan = plan
  briefPhotoCount = 0
  briefServiceCount = 0
  
  var limits = briefLimits[briefPlan] || briefLimits.standard
  var planNames = { basic: 'Basic', standard: 'Standard', premium: 'Premium' }
  var s = siteSettings || {}
  var planDescriptions = {
    basic:    '1 page · Up to 2 photos · Free subdomain · $' + (s.plan_basic_setup||199) + ' setup · $' + (s.plan_basic_price||29) + '/mo',
    standard: '4 pages · Up to 8 photos · Custom domain · $' + (s.plan_standard_setup||299) + ' setup · $' + (s.plan_standard_price||49) + '/mo',
    premium:  'Unlimited pages & photos · Custom domain · $' + (s.plan_premium_setup||499) + ' setup · $' + (s.plan_premium_price||79) + '/mo'
  }
  
  document.getElementById('brief-plan-badge').textContent = planNames[briefPlan] || 'Standard'
  document.getElementById('brief-plan-limits').textContent = planDescriptions[briefPlan] || planDescriptions.standard
  
  var photosLabel = briefPlan === 'premium' ? 'Unlimited photos allowed.' : 'Up to ' + limits.photos + ' photos allowed.'
  var servicesLabel = briefPlan === 'premium' ? 'Unlimited services/items.' : 'Up to ' + limits.services + ' services/items.'
  document.getElementById('bf-photos-limit').textContent = photosLabel
  document.getElementById('bf-services-limit').textContent = servicesLabel
  
  // Hide hours for basic plan
  var hoursSection = document.getElementById('bf-hours-section')
  if (hoursSection) hoursSection.style.display = limits.hours ? '' : 'none'
  
  // Highlight selected plan card
  document.querySelectorAll('.bf-plan-option').forEach(function(el) {
    el.style.borderColor = 'var(--border)'
    el.style.background = 'white'
  })
  var selected = document.getElementById('bf-plan-' + plan)
  if (selected) {
    selected.style.borderColor = 'var(--accent)'
    selected.style.background = 'var(--accent-light)'
  }
  
  // Reset photo and service lists - initBriefForm adds the initial rows
  var photosList = document.getElementById('bf-photos-list')
  var servicesList = document.getElementById('bf-services-list')
  if (photosList) photosList.innerHTML = ''
  if (servicesList) servicesList.innerHTML = ''
  // Only add initial rows if being called directly (not from initBriefForm)
  if (!window._briefInitialising) {
    addBriefPhoto()
    addBriefService()
  }
}

function addBriefService() {
  var limits = briefLimits[briefPlan] || briefLimits.standard
  if (briefServiceCount >= limits.services) {
    alert('Your ' + briefPlan + ' plan allows up to ' + limits.services + ' services.')
    return
  }
  briefServiceCount++
  var list = document.getElementById('bf-services-list')
  var div = document.createElement('div')
  div.style.cssText = 'display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;'
  div.innerHTML = '<input type="text" class="bf-service-input" placeholder="e.g. Kitchen renovation, Haircut, etc..." style="padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:13px;">' +
    '<button onclick="this.parentElement.remove();briefServiceCount--" style="background:none;border:1px solid var(--border);border-radius:var(--radius);padding:8px 12px;cursor:pointer;color:var(--ink-muted);font-size:14px;">✕</button>'
  list.appendChild(div)
}

function addBriefPhoto() {
  var limits = briefLimits[briefPlan] || briefLimits.standard
  if (briefPhotoCount >= limits.photos) {
    alert('Your ' + briefPlan + ' plan allows up to ' + limits.photos + ' photos.')
    return
  }
  briefPhotoCount++
  var list = document.getElementById('bf-photos-list')
  var idx = 'p' + Date.now()
  var div = document.createElement('div')
  div.id = 'bf-photo-wrap-' + idx
  div.style.cssText = 'position:relative;border:2px dashed var(--border);border-radius:var(--radius);background:var(--cream);padding:10px;margin-bottom:4px;transition:border-color 0.2s;'

  // Build inner HTML without nested quote issues
  var fileInputId  = 'bf-photo-file-' + idx
  var urlInputId   = 'bf-photo-url-' + idx
  var previewId    = 'bf-photo-preview-' + idx
  var wrapId       = 'bf-photo-wrap-' + idx

  var inner = document.createElement('div')
  inner.style.cssText = 'display:grid;grid-template-columns:1fr auto;gap:8px;align-items:start;'

  var left = document.createElement('div')

  var fileInput = document.createElement('input')
  fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.id = fileInputId; fileInput.style.display = 'none'
  fileInput.addEventListener('change', function() { if (this.files[0]) briefPhotoLoadFile(this.files[0], idx) })

  var urlInput = document.createElement('input')
  urlInput.type = 'url'; urlInput.className = 'bf-photo-input'; urlInput.id = urlInputId
  urlInput.placeholder = 'Paste image URL — or drag a photo here / click Browse'
  urlInput.style.cssText = 'padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:13px;width:100%;box-sizing:border-box;'
  urlInput.addEventListener('input', function() { briefPhotoUrlTyped(this, idx) })

  var browseRow = document.createElement('div')
  browseRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:6px;'

  var browseBtn = document.createElement('button')
  browseBtn.type = 'button'
  browseBtn.textContent = 'Browse'
  browseBtn.style.cssText = 'background:white;border:1px solid var(--border);border-radius:var(--radius);padding:5px 12px;font-family:var(--sans);font-size:12px;cursor:pointer;'
  browseBtn.addEventListener('click', function() { document.getElementById(fileInputId).click() })

  var hint = document.createElement('span')
  hint.textContent = 'or drag & drop an image file onto this row'
  hint.style.cssText = 'font-size:11px;color:var(--ink-muted);'

  var preview = document.createElement('img')
  preview.id = previewId; preview.style.cssText = 'display:none;margin-top:8px;height:64px;border-radius:6px;object-fit:cover;'

  browseRow.appendChild(browseBtn); browseRow.appendChild(hint)
  left.appendChild(fileInput); left.appendChild(urlInput); left.appendChild(browseRow); left.appendChild(preview)

  var removeBtn = document.createElement('button')
  removeBtn.type = 'button'; removeBtn.textContent = '\u2715'
  removeBtn.style.cssText = 'background:none;border:1px solid var(--border);border-radius:var(--radius);padding:8px 10px;cursor:pointer;color:var(--ink-muted);font-size:14px;'
  removeBtn.addEventListener('click', function() { document.getElementById(wrapId).remove(); briefPhotoCount-- })

  inner.appendChild(left); inner.appendChild(removeBtn)
  div.appendChild(inner)

  // Drag and drop
  div.addEventListener('dragover', function(e) { e.preventDefault(); div.style.borderColor='var(--accent)'; div.style.background='var(--accent-light)' })
  div.addEventListener('dragleave', function() { div.style.borderColor='var(--border)'; div.style.background='var(--cream)' })
  div.addEventListener('drop', function(e) {
    e.preventDefault(); div.style.borderColor='var(--border)'; div.style.background='var(--cream)'
    var file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) briefPhotoLoadFile(file, idx)
  })
  list.appendChild(div)
}
function briefPhotoFileSelected(input, idx) {
  if (input.files && input.files[0]) briefPhotoLoadFile(input.files[0], idx)
}

function briefPhotoLoadFile(file, idx) {
  var reader = new FileReader()
  reader.onload = function(e) {
    var dataUrl = e.target.result
    var urlInput = document.getElementById('bf-photo-url-' + idx)
    var preview  = document.getElementById('bf-photo-preview-' + idx)
    if (urlInput) { urlInput.value = dataUrl; urlInput.dataset.filename = file.name }
    if (preview)  { preview.src = dataUrl; preview.style.display = 'block' }
  }
  reader.readAsDataURL(file)
}

function briefPhotoUrlTyped(input, idx) {
  var preview = document.getElementById('bf-photo-preview-' + idx)
  if (!preview) return
  var url = input.value.trim()
  if (url && (url.startsWith('http') || url.startsWith('data:'))) {
    preview.src = url; preview.style.display = 'block'
  } else {
    preview.style.display = 'none'
  }
}

async function submitBriefForm() {
  var businessName = document.getElementById('bf-business-name').value.trim()
  var description = document.getElementById('bf-description').value.trim()
  if (!businessName || !description) return alert('Please fill in your business name and description')
  
  var services = []
  document.querySelectorAll('.bf-service-input').forEach(function(el) {
    if (el.value.trim()) services.push(el.value.trim())
  })
  
  var photos = []
  document.querySelectorAll('.bf-photo-input').forEach(function(el) {
    var val = el.value.trim()
    if (val) photos.push(val)
  })
  
  // Collect hours from custom AM/PM selectors
  var hours = {}
  var days = ['mon','tue','wed','thu','fri','sat','sun']
  var dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
  days.forEach(function(d, i) {
    var openH  = document.getElementById('bf-hrs-' + d + '-open-h')?.value
    var openM  = document.getElementById('bf-hrs-' + d + '-open-m')?.value || '00'
    var openAP = document.getElementById('bf-hrs-' + d + '-open-ap')?.textContent || 'AM'
    var closeH = document.getElementById('bf-hrs-' + d + '-close-h')?.value
    var closeM = document.getElementById('bf-hrs-' + d + '-close-m')?.value || '00'
    var closeAP= document.getElementById('bf-hrs-' + d + '-close-ap')?.textContent || 'AM'
    if (openH && openH !== '—' && closeH && closeH !== '—') {
      hours[dayNames[i]] = {
        open:  openH  + ':' + openM  + ' ' + openAP,
        close: closeH + ':' + closeM + ' ' + closeAP
      }
    }
  })

  // Collect pages
  var pages = []
  document.querySelectorAll('.bf-page-input').forEach(function(el) {
    if (el.value.trim()) pages.push(el.value.trim())
  })
  if (!pages.length) pages = ['Home']
  
  var formData = {
    email: briefEmail,
    plan: briefPlan,
    business_name: businessName,
    description: description,
    business_type: document.getElementById('bf-business-type').value,
    phone: document.getElementById('bf-phone').value,
    address: document.getElementById('bf-address').value,
    business_email: document.getElementById('bf-biz-email').value,
    style: document.getElementById('bf-style').value,
    colors: document.getElementById('bf-colors').value,
    inspiration: document.getElementById('bf-inspiration').value,
    tagline: document.getElementById('bf-tagline').value,
    services: services,
    photos: photos,
    hours: hours,
    existing_website: document.getElementById('bf-existing').value,
    notes: document.getElementById('bf-notes').value,
    pages: pages
  }
  // Separate uploaded files from URL references
  // Store photo files as {filename, data} for download; URLs kept as-is in prompt
  var photoFiles = []
  formData.photos = (formData.photos || []).map(function(p, i) {
    if (typeof p === 'string' && p.startsWith('data:')) {
      // Find the input to get the filename
      var inputs = document.querySelectorAll('.bf-photo-input')
      var inp = inputs[i]
      var filename = inp?.dataset?.filename || ('photo-' + (i+1) + '.jpg')
      photoFiles.push({ filename: filename, data: p })
      return filename  // Just the filename in the prompt
    }
    return p  // Keep URLs as-is
  })
  formData.photo_files = photoFiles  // Attach files for download in modal
  
  try {
    var res = await fetch(API + '/submit-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    var d = {}
    try { d = await res.json() } catch(e) { d = { message: 'ok' } }
    
    document.querySelector('#asset-form-wrap > div:first-child').style.display = 'none'
    document.querySelector('#asset-form-wrap > div:nth-child(2)').style.display = 'none'
    document.getElementById('brief-form-success').style.display = 'block'
  } catch(e) {
    document.querySelector('#asset-form-wrap > div:first-child').style.display = 'none'
    document.getElementById('brief-form-success').style.display = 'block'
  }
}

// ── VIEW TERMS ───────────────────────────────────────────
function viewTOS() {
  var modal = document.createElement('div')
  modal.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(15,17,23,0.7);display:flex;align-items:center;justify-content:center;padding:20px;'
  modal.innerHTML = '<div id="tos-modal" style="background:white;border-radius:16px;width:100%;max-width:680px;max-height:90vh;overflow-y:auto;padding:32px;box-shadow:0 24px 60px rgba(0,0,0,0.2);">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
    '<div style="font-family:var(--serif);font-size:22px;">Terms of Service</div>' +
    '<button onclick="document.getElementById(\'tos-modal\').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--ink-muted);">\u2715</button>' +
    '</div>' +
    '<div style="font-size:14px;line-height:1.7;color:var(--ink-light);">' +
    '<p><strong>Sitefloa Contractor Agreement</strong></p>' +
    '<p>As a Sitefloa contractor, you agree to represent the platform professionally, provide accurate information to clients, and meet agreed build timelines. Commission is earned on completed and paid website builds. Commissions are calculated on the full setup fee regardless of any discount codes applied to the client. Commissions are paid at the end of each pay period as set by admin. Sitefloa reserves the right to update these terms with reasonable notice.</p>' +
    '<p><strong>Client Data</strong></p>' +
    '<p>You agree to handle client information confidentially and not share it with third parties. All client relationships are owned by Sitefloa.</p>' +
    '<p><strong>Payments</strong></p>' +
    '<p>Commission payments are processed at period close. Any disputes must be raised within 7 days of period close. Sitefloa is not responsible for delays caused by incorrect payment details.</p>' +
    '</div></div>'
  modal.onclick = function(e) { if (e.target === modal) modal.remove() }
  document.body.appendChild(modal)
}

// ── SALES PIPELINE ───────────────────────────────────────
var allLeads = []

var STAGE_LABELS = {
  new: 'New', contacted: 'Contacted', interested: 'Interested',
  demo_sent: 'Demo sent', won: 'Won', lost: 'Lost'
}
var STAGE_COLORS = {
  new: '#6b7280', contacted: '#3b82f6', interested: '#8b5cf6',
  demo_sent: '#f59e0b', won: '#10b981', lost: '#ef4444'
}

async function loadPipeline() {
  try {
    var res = await fetch(API + '/admin/leads', { headers: { 'Authorization': 'Bearer ' + getToken() } })
    var data = await res.json()
    allLeads = data.leads || []
    renderPipeline(allLeads)
  } catch(e) {
    var w1 = document.getElementById('pipeline-wrap')
    var w2 = document.getElementById('mgr-pipeline-wrap')
    if (w1) w1.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">Could not load pipeline.</p>'
    if (w2) w2.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">Could not load pipeline.</p>'
  }
}

function renderPipeline(leads) {
  var html = ''
  if (!leads.length) {
    html = '<p style="color:var(--ink-muted);font-size:14px;">No leads yet. Click "+ Add lead" to add your first one.</p>'
  } else {
    html = '<div style="display:grid;gap:10px;">' +
      leads.map(function(l) {
        var color = STAGE_COLORS[l.stage] || '#6b7280'
        var label = STAGE_LABELS[l.stage] || l.stage || 'New'
        var myId = getToken() ? JSON.parse(atob(getToken().split('.')[1])).id : null
        var claimedByMe = l.claimed_by == myId
        var isClaimed = !!l.claimed_by
        return '<div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px 20px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">' +
          '<div>' +
          '<div style="font-weight:600;font-size:15px;">' + (l.business_name || 'Unnamed') + '</div>' +
          '<div style="font-size:13px;color:var(--ink-muted);margin-top:3px;">' +
          (l.contact_name ? l.contact_name + ' &middot; ' : '') +
          (isClaimed ? (l.email || '') : '(claim to see email)') +
          (l.phone && isClaimed ? ' &middot; ' + l.phone : '') +
          '</div>' +
          (l.notes ? '<div style="font-size:12px;color:var(--ink-muted);margin-top:4px;">' + l.notes + '</div>' : '') +
          '</div>' +
          '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">' +
          '<span style="background:' + color + '22;color:' + color + ';border:1px solid ' + color + '44;border-radius:20px;padding:3px 10px;font-size:12px;font-weight:600;">' + label + '</span>' +
          (!isClaimed ? '<button onclick="claimLead(&quot;' + l.id + '&quot;)" style="background:var(--accent);color:white;border:none;padding:5px 12px;border-radius:var(--radius);font-family:var(--sans);font-size:12px;cursor:pointer;">Claim</button>' : '') +
          (claimedByMe || getRole() === 'admin' ?
            '<select onchange="updateLeadStage(' + l.id + ',this.value)" style="padding:4px 8px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:12px;">' +
            Object.entries(STAGE_LABELS).map(function(e) { return '<option value="' + e[0] + '"' + (l.stage === e[0] ? ' selected' : '') + '>' + e[1] + '</option>' }).join('') +
            '</select>' : '') +
          (['admin','manager'].includes(getRole()) ? '<button onclick="deleteLead(&quot;' + l.id + '&quot;)" style="background:none;border:1px solid #ef444466;color:#ef4444;padding:5px 10px;border-radius:var(--radius);font-family:var(--sans);font-size:12px;cursor:pointer;">Delete</button>' : '') +
          '</div></div></div>'
      }).join('') + '</div>'
  }
  var w1 = document.getElementById('pipeline-wrap')
  var w2 = document.getElementById('mgr-pipeline-wrap')
  if (w1) w1.innerHTML = html
  if (w2) w2.innerHTML = html
}

function showAddLeadModal() {
  var existing = document.getElementById('add-lead-modal')
  if (existing) existing.remove()
  var modal = document.createElement('div')
  modal.id = 'add-lead-modal'
  modal.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(15,17,23,0.7);display:flex;align-items:center;justify-content:center;padding:20px;'
  modal.innerHTML = '<div style="background:white;border-radius:16px;width:100%;max-width:480px;padding:28px;box-shadow:0 24px 60px rgba(0,0,0,0.2);">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
    '<div style="font-family:var(--serif);font-size:20px;">Add new lead</div>' +
    '<button onclick="document.getElementById(\'add-lead-modal\').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--ink-muted);">\u2715</button>' +
    '</div>' +
    '<div style="display:grid;gap:12px;">' +
    '<div class="dash-field"><label>Business name *</label><input type="text" id="nl-biz" placeholder="e.g. Jane\'s Plumbing"></div>' +
    '<div class="dash-field"><label>Contact name</label><input type="text" id="nl-contact" placeholder="e.g. Jane Smith"></div>' +
    '<div class="dash-field"><label>Email</label><input type="email" id="nl-email" placeholder="jane@example.com"></div>' +
    '<div class="dash-field"><label>Phone</label><input type="tel" id="nl-phone" placeholder="(555) 123-4567"></div>' +
    '' +
    '<div class="dash-field"><label>Notes</label><textarea id="nl-notes" rows="2" placeholder="Any notes about this lead..."></textarea></div>' +
    '</div>' +
    '<div style="display:flex;gap:10px;margin-top:20px;">' +
    '<button onclick="submitAddLead()" style="flex:1;padding:12px;background:var(--accent);color:white;border:none;border-radius:var(--radius);font-family:var(--sans);font-size:14px;font-weight:500;cursor:pointer;">Add lead</button>' +
    '<button onclick="document.getElementById(\'add-lead-modal\').remove()" style="padding:12px 20px;background:var(--cream);border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:14px;cursor:pointer;">Cancel</button>' +
    '</div></div>'
  modal.onclick = function(e) { if (e.target === modal) modal.remove() }
  document.body.appendChild(modal)
}

async function submitAddLead() {
  var biz = document.getElementById('nl-biz').value.trim()
  if (!biz) return alert('Please enter a business name')
  var body = {
    business_name: biz,
    contact_name: document.getElementById('nl-contact').value,
    email: document.getElementById('nl-email').value,
    phone: document.getElementById('nl-phone').value,
    notes: document.getElementById('nl-notes').value
  }
  try {
    var res = await fetch(API + '/admin/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify(body)
    })
    var d = await res.json()
    if (d.lead) {
      document.getElementById('add-lead-modal').remove()
      loadPipeline()
    } else alert(d.error || 'Failed to add lead')
  } catch(e) { alert('Could not connect to server') }
}

async function claimLead(id) {
  try {
    var res = await fetch(API + '/admin/leads/' + id + '/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() }
    })
    var d = await res.json()
    if (d.message) {
      loadPipeline()
    } else {
      alert(d.error || 'Could not claim lead')
    }
  } catch(e) { alert('Could not connect to server — make sure you are logged in') }
}

async function updateLeadStage(id, stage) {
  try {
    await fetch(API + '/admin/leads/' + id + '/stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ stage: stage })
    })
    loadPipeline()
  } catch(e) { alert('Could not connect to server') }
}

async function deleteLead(id) {
  try {
    await fetch(API + '/admin/leads/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    loadPipeline()
  } catch(e) { alert('Could not connect to server') }
}

// ── ASSET FORMS (sent brief forms) ───────────────────────
async function loadAssetForms() {
  try {
    var res = await fetch(API + '/admin/asset-forms', { headers: { 'Authorization': 'Bearer ' + getToken() } })
    var data = await res.json()
    if (data.error) { var w = document.getElementById('asset-forms-wrap'); if (w) w.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No brief forms sent yet.</p>'; return }
    renderAssetForms(data.forms || [], 'asset-forms-wrap')
  } catch(e) { var w = document.getElementById('asset-forms-wrap'); if (w) w.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No brief forms sent yet.</p>' }
}

async function loadMgrAssetForms() {
  try {
    var res = await fetch(API + '/admin/asset-forms', { headers: { 'Authorization': 'Bearer ' + getToken() } })
    var data = await res.json()
    if (data.error) { var w = document.getElementById('mgr-asset-forms-wrap'); if (w) w.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No brief forms sent yet.</p>'; return }
    renderAssetForms(data.forms || [], 'mgr-asset-forms-wrap')
  } catch(e) { var w = document.getElementById('mgr-asset-forms-wrap'); if (w) w.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No brief forms sent yet.</p>' }
}

function renderAssetForms(forms, wrapId) {
  var wrap = document.getElementById(wrapId)
  if (!wrap) return
  if (!forms.length) { wrap.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No brief forms sent yet.</p>'; return }
  wrap.innerHTML = '<div style="display:grid;gap:8px;">' +
    forms.map(function(f) {
      var date = new Date(f.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
      var statusColor = f.status === 'submitted' ? 'var(--accent)' : '#6b7280'
      var statusLabel = f.status === 'submitted' ? '\u2705 Submitted' : '\u23f3 Sent'
      return '<div style="display:flex;justify-content:space-between;align-items:center;background:var(--cream);border:1px solid var(--border);border-radius:var(--radius);padding:10px 14px;font-size:13px;">' +
        '<div><strong>' + f.email + '</strong> &middot; <span style="text-transform:capitalize;">' + (f.plan || 'standard') + '</span> &middot; ' + date + '</div>' +
        '<span style="color:' + statusColor + ';font-weight:600;font-size:12px;">' + statusLabel + '</span>' +
        '</div>'
    }).join('') + '</div>'
}

// ── SUBMITTED BRIEFS ──────────────────────────────────────
async function loadSubmittedBriefs() {
  try {
    var res = await fetch(API + '/admin/website-briefs', { headers: { 'Authorization': 'Bearer ' + getToken() } })
    var data = await res.json()
    if (data.error) { var w = document.getElementById('submitted-briefs-wrap'); if (w) w.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No briefs submitted yet.</p>'; return }
    renderSubmittedBriefs(data.briefs || [])
  } catch(e) { var w = document.getElementById('submitted-briefs-wrap'); if (w) w.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No briefs submitted yet.</p>' }
}

function renderSubmittedBriefs(briefs) {
  var wraps = document.querySelectorAll('[id="submitted-briefs-wrap"]')
  if (!wraps.length) return
  if (!briefs.length) {
    wraps.forEach(function(el) { el.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No briefs submitted yet.</p>' })
    return
  }
  var myEmail = localStorage.getItem('wc_email') || ''
  var html = '<div style="display:grid;gap:10px;">' +
    briefs.map(function(b) {
      var fd = {}
      try { fd = typeof b.form_data === 'string' ? JSON.parse(b.form_data) : (b.form_data || {}) } catch(e) {}
      var date = new Date(b.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
      var safeJson = JSON.stringify(b).replace(/\\/g,'\\\\').replace(/`/g,'\\`')
      var isCompleted = b.status === 'completed'
      var isClaimed = !!b.claimed_by_email && !isCompleted
      var claimedByMe = b.claimed_by_email === myEmail
      var isAdmin = getRole() === 'admin' || getRole() === 'manager'
      var bg = isCompleted ? '#d1fae5' : isClaimed ? (claimedByMe ? '#e8f4f1' : '#fff8e6') : 'var(--cream)'
      var border = isCompleted ? '1px solid #6ee7b7' : isClaimed ? (claimedByMe ? '1px solid #1a6b5a44' : '1px solid #f59e0b66') : '1px solid var(--border)'
      var statusTag = isCompleted
        ? '<span style="font-size:11px;font-weight:700;color:#065f46;margin-top:4px;display:block;">\u2705 Completed</span>'
        : isClaimed
          ? '<span style="font-size:11px;font-weight:700;color:' + (claimedByMe ? 'var(--accent)' : '#b45309') + ';margin-top:4px;display:block;">' + (claimedByMe ? '\ud83d\udd12 Claimed by you' : '\ud83d\udd12 Claimed by ' + b.claimed_by_email) + '</span>'
          : '<span style="font-size:11px;color:var(--ink-muted);margin-top:4px;display:block;">\u26aa Unclaimed</span>'
      var actionBtns = ''
      if (!isCompleted && !isClaimed) {
        actionBtns = '<button onclick="claimBrief(&quot;' + b.id + '&quot;)" style="background:var(--accent);color:white;border:none;border-radius:var(--radius);padding:6px 14px;font-family:var(--sans);font-size:12px;font-weight:600;cursor:pointer;margin-bottom:4px;">Claim</button><br>'
      } else if (!isCompleted && (claimedByMe || isAdmin)) {
        actionBtns = '<button onclick="completeBrief(&quot;' + b.id + '&quot;)" style="background:#10b981;color:white;border:none;border-radius:var(--radius);padding:6px 12px;font-family:var(--sans);font-size:12px;font-weight:600;cursor:pointer;margin-bottom:4px;">\u2705 Mark complete</button><br>'
          + '<button onclick="unclaimBrief(&quot;' + b.id + '&quot;)" style="background:white;color:var(--ink-muted);border:1px solid var(--border);border-radius:var(--radius);padding:5px 10px;font-family:var(--sans);font-size:11px;cursor:pointer;margin-bottom:4px;">Release</button><br>'
      }
      var showContact = isCompleted || claimedByMe || isAdmin
      var contactInfo = showContact
        ? '<div style="font-size:13px;color:var(--ink-muted);margin-top:2px;">' + (b.email||'') + ' &middot; ' + (b.plan||'standard') + ' plan &middot; ' + date + '</div>'
        : '<div style="font-size:13px;color:var(--ink-muted);margin-top:2px;">' + (b.plan||'standard') + ' plan &middot; ' + date + ' &middot; <em>Claim to see contact info</em></div>'
      var viewBtn = (isCompleted || !isClaimed || claimedByMe || isAdmin)
        ? '<button onclick="showBriefModal(this)" data-brief="' + safeJson.replace(/"/g,'&quot;') + '" style="background:var(--accent-light);color:var(--accent);border:1px solid var(--accent);border-radius:var(--radius);padding:6px 14px;font-family:var(--sans);font-size:12px;font-weight:600;cursor:pointer;">View brief</button>'
        : '<button disabled style="background:var(--cream);color:var(--ink-muted);border:1px solid var(--border);border-radius:var(--radius);padding:6px 14px;font-family:var(--sans);font-size:12px;cursor:not-allowed;">\ud83d\udd12 Locked</button>'
      var deleteBtn = isAdmin ? '<br><button onclick="deleteBrief(&quot;' + b.id + '&quot;)" style="background:#fee2e2;color:#ef4444;border:1px solid #ef4444;border-radius:var(--radius);padding:5px 8px;font-family:var(--sans);font-size:11px;cursor:pointer;margin-top:4px;">Delete</button>' : ''
      return '<div style="background:' + bg + ';border:' + border + ';border-radius:var(--radius-lg);padding:16px 20px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">'
        + '<div style="flex:1;"><div style="font-weight:600;font-size:15px;">' + (b.business_name||'Unknown') + '</div>'
        + contactInfo + statusTag
        + (showContact && fd.description ? '<div style="font-size:13px;color:var(--ink-light);margin-top:6px;">' + fd.description.substring(0,100) + (fd.description.length>100?'...':'') + '</div>' : '')
        + '</div>'
        + '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;">' + actionBtns + viewBtn + deleteBtn + '</div>'
        + '</div></div>'
    }).join('') + '</div>'
  // Apply to all submitted-briefs-wrap elements on the page (admin + manager pages)
  document.querySelectorAll('[id="submitted-briefs-wrap"]').forEach(function(el) { el.innerHTML = html })
}

function buildClaudePrompt(b, fd) {
  var plan = b.plan || 'standard'
  var planLimits = {
    basic:    { photos: 2,   services: 3,   pages: 1,   label: 'Basic (1 page, max 2 photos, no monthly fee)' },
    standard: { photos: 8,   services: 10,  pages: 4,   label: 'Standard (4 pages, max 8 photos, custom domain)' },
    premium:  { photos: 999, services: 999, pages: 999, label: 'Premium (unlimited pages & photos, custom domain, priority support)' }
  }
  var lim = planLimits[plan] || planLimits.standard
  var servicesList = Array.isArray(fd.services) ? fd.services.map(function(s,i){return (i+1)+'. '+s}).join('\n') : (fd.services || 'None provided')
  var photosList   = Array.isArray(fd.photos)   ? fd.photos.map(function(p,i){return (i+1)+'. '+p}).join('\n')   : (fd.photos   || 'None provided — use placeholder images')
  var hoursText = 'Not provided'
  if (fd.hours && typeof fd.hours === 'object' && Object.keys(fd.hours).length) {
    hoursText = Object.entries(fd.hours).map(function(e){ return e[0]+': '+(e[1].open||'closed')+' - '+(e[1].close||'closed') }).join('\n')
  }
  return [
    'Build a professional, fully responsive website for the following business using the Sitefloa SITE_CONFIG format.',
    '',
    '═══════════════════════════════════════════',
    'PLAN TIER: ' + lim.label,
    'LIMIT: Max ' + lim.pages + ' page(s), max ' + (lim.photos < 999 ? lim.photos : 'unlimited') + ' photos.',
    '═══════════════════════════════════════════',
    '',
    'BUSINESS INFO',
    '─────────────',
    'Business Name:  ' + (fd.business_name || b.business_name || ''),
    'Business Type:  ' + (fd.business_type || 'Not specified'),
    'Description:    ' + (fd.description || ''),
    'Phone:          ' + (fd.phone || 'Not provided'),
    'Address:        ' + (fd.address || 'Not provided'),
    'Email:          ' + (fd.business_email || b.email || 'Not provided'),
    'Tagline:        ' + (fd.tagline || 'None'),
    'Existing site:  ' + (fd.existing_website || 'None'),
    '',
    'DESIGN PREFERENCES',
    '──────────────────',
    'Style:          ' + (fd.style || 'Clean & professional'),
    'Brand colours:  ' + (fd.colors || fd.colours || 'Use professional defaults'),
    'Inspiration:    ' + (fd.inspiration || 'None provided'),
    '',
    'PAGES REQUESTED',
    '─────────────────',
    (Array.isArray(fd.pages) && fd.pages.length ? fd.pages.join(', ') : 'Home (default)'),
    '',
    'SERVICES / MENU ITEMS',
    '─────────────────────',
    servicesList,
    '',
    'PHOTOS (include all of these)',
    '─────────────────────────────',
    photosList,
    '',
    'BUSINESS HOURS',
    '──────────────',
    hoursText,
    '',
    'ADDITIONAL NOTES',
    '────────────────',
    (fd.notes || 'None'),
    '',
    '═══════════════════════════════════════════',
    'TECHNICAL REQUIREMENTS',
    '═══════════════════════════════════════════',
    '',
    'PLATFORM & API',
    '  api:       https://siteflowa.onrender.com',
    '  subdomain: [set by admin when creating the website profile]',
    '',
    'SITE_CONFIG FORMAT',
    '  Declare a schema object with every editable field:',
    '    text, textarea, email, tel, photo, photo_array, repeater, hours, badges',
    '  Each field: { label, type, section, plan, placeholder, default }',
    '  Use real business info above as defaults — never Lorem ipsum.',
    '',
    'ON LOAD BEHAVIOUR',
    '  1. fetch /site/[subdomain]',
    '  2. Deep-merge API response with SITE_CONFIG defaults',
    '  3. If is_active === false → show clean offline page',
    '',
    'PLAN VISIBILITY',
    '  basic    → hero, about, hours, contact only',
    '  standard → adds services, photo gallery',
    '  premium  → adds everything: team, testimonials, blog, extra pages',
    '  This site is ' + plan.toUpperCase() + ' — only include sections for this tier.',
    '',
    'EDITABLE BY CLIENT (wire to SITE_CONFIG schema)',
    '  - Business name, tagline, description',
    '  - Phone, email, address',
    '  - Business hours (hours type)',
    '  - Services/menu items (repeater: name, description, price)',
    '  - Photo gallery (photo_array type)',
    '  - Hero photo (photo type)',
    '  - Social media links (text type)',
    '  - Brand colour (text type → CSS variable)',
    '',
    'READ-ONLY / DISPLAY ONLY',
    '  - Subscription status badge',
    '  - Plan tier label',
    '  - Analytics / page view count',
    '',
    'ANALYTICS SNIPPET (include before </body>)',
    '  <script>',
    '    (function(){',
    '      var s=document.createElement("script");',
    '      s.src="https://siteflowa.onrender.com/analytics.js";',
    '      s.setAttribute("data-subdomain","[subdomain]");',
    '      document.body.appendChild(s);',
    '    })();',
    '  <\/script>',
    '',
    'BUILD RULES',
    '  - Single self-contained HTML file, NO external JS dependencies',
    '  - All CSS and JS inlined',
    '  - Fully responsive (mobile-first)',
    '  - SEO meta tags (title, description, og:image)',
    '  - All photos listed above MUST appear in the website',
    '  - Match style: ' + (fd.style || 'Clean & professional'),
    '  - Can have FEWER features than tier allows, but NEVER more',
  (plan === 'premium' ? '\nLOCAL SEO REQUIREMENTS (Premium only)\n  Since this is a Premium tier site, implement full local SEO:\n  - Add meta title with business name + city/region\n  - Add meta description mentioning the business type and location\n  - Add schema.org LocalBusiness JSON-LD with address, phone, hours\n  - Add Open Graph tags for social sharing\n  - Create an SEO-friendly URL structure\n  - Add alt text to all images using business name + descriptive text\n  - Include a location section or footer with full address and embedded map placeholder\n  NOTE: Do NOT include booking or scheduling features — we do not offer this service.' : '')
  ].join('\n')
}

function showBriefModal(btn) {
  try {
    var b = JSON.parse(btn.getAttribute('data-brief').replace(/&quot;/g,'"'))
    var fd = {}
    try { fd = typeof b.form_data === 'string' ? JSON.parse(b.form_data) : (b.form_data || {}) } catch(e) {}
    var existing = document.getElementById('brief-view-modal')
    if (existing) existing.remove()
    var prompt = buildClaudePrompt(b, fd)
    window._currentBriefPrompt = prompt
    window._currentBriefPhotos = b.photo_files || []

    function row(label, val) {
      if (!val) return ''
      var display = Array.isArray(val) ? val.join(', ') : String(val)
      return '<div style="padding:10px 0;border-bottom:1px solid var(--border);">' +
        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-muted);margin-bottom:3px;">' + label + '</div>' +
        '<div style="font-size:14px;white-space:pre-wrap;">' + display.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div></div>'
    }

    var safeFilename = (b.business_name || 'brief').replace(/[^a-z0-9]/gi,'-').toLowerCase()
    var modal = document.createElement('div')
    modal.id = 'brief-view-modal'
    modal.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(15,17,23,0.7);display:flex;align-items:center;justify-content:center;padding:20px;'
    modal.innerHTML =
      '<div style="background:white;border-radius:16px;width:100%;max-width:760px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,0.2);">' +
      '<div style="padding:18px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">' +
      '<div><div style="font-family:var(--serif);font-size:20px;">' + (b.business_name || 'Brief') + '</div>' +
      '<div style="font-size:12px;color:var(--ink-muted);margin-top:2px;">' + (b.email || '') + ' &middot; ' + (b.plan || 'standard') + ' plan</div></div>' +
      '<button onclick="document.getElementById(\'brief-view-modal\').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--ink-muted);">&times;</button>' +
      '</div>' +
      '<div style="display:flex;border-bottom:1px solid var(--border);flex-shrink:0;">' +
      '<button onclick="briefModalTab(\'details\')" id="brief-tab-details" style="flex:1;padding:11px;background:var(--accent);color:white;border:none;font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer;">Brief Details</button>' +
      '<button onclick="briefModalTab(\'prompt\')"  id="brief-tab-prompt"  style="flex:1;padding:11px;background:var(--cream);color:var(--ink);border:none;font-family:var(--sans);font-size:13px;cursor:pointer;">Claude Prompt</button>' +
      '</div>' +
      '<div id="brief-panel-details" style="flex:1;overflow-y:auto;padding:20px 24px;">' +
      row('Plan tier', (b.plan || fd.plan || 'standard').charAt(0).toUpperCase() + (b.plan || fd.plan || 'standard').slice(1)) +
      row('Business name', fd.business_name || b.business_name) +
      row('Business type', fd.business_type) +
      row('Description', fd.description) +
      row('Phone', fd.phone) + row('Address', fd.address) +
      row('Business email', fd.business_email) + row('Tagline', fd.tagline) +
      row('Style', fd.style) + row('Brand colours', fd.colors || fd.colours) +
      row('Inspiration', fd.inspiration) + row('Services', fd.services) +
      row('Photos', fd.photos) +
      row('Hours', fd.hours ? JSON.stringify(fd.hours, null, 2) : null) +
      row('Existing website', fd.existing_website) + row('Notes', fd.notes) +
      '</div>' +
      '<div id="brief-panel-prompt" style="flex:1;overflow-y:auto;padding:20px 24px;display:none;">' +
      '<p style="font-size:13px;color:var(--ink-muted);margin-bottom:12px;">Copy or download this prompt — paste it into Claude to build the website.</p>' +
      '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">' +
      '<button onclick="copyBriefPrompt()" style="background:var(--accent);color:white;border:none;padding:8px 18px;border-radius:var(--radius);font-family:var(--sans);font-size:13px;font-weight:500;cursor:pointer;">📋 Copy prompt</button>' +
      '<button onclick="downloadBriefPrompt(\''+ safeFilename +'\')" style="background:white;color:var(--ink);border:1px solid var(--border);padding:8px 18px;border-radius:var(--radius);font-family:var(--sans);font-size:13px;cursor:pointer;">⬇️ Download .txt</button>' +
      (b.photo_files && b.photo_files.length ? b.photo_files.map(function(pf, pi) { return '<button onclick="downloadBriefPhoto(this)" data-filename="' + pf.filename + '" style="background:#f0fdf4;color:#065f46;border:1px solid #6ee7b7;padding:8px 14px;border-radius:var(--radius);font-family:var(--sans);font-size:13px;cursor:pointer;">📸 ' + pf.filename + '</button>' }).join('') : '<span style="font-size:12px;color:var(--ink-muted);">No uploaded photos — only URLs provided.</span>') +
      '</div>' +
      '<pre id="brief-prompt-text" style="background:#1a1a2e;color:#e8e8e8;border-radius:10px;padding:18px;font-size:12px;line-height:1.6;white-space:pre-wrap;word-break:break-word;margin:0;">' +
      prompt.replace(/</g,'&lt;').replace(/>/g,'&gt;') +
      '</pre></div></div>'
    modal.onclick = function(e) { if (e.target === modal) modal.remove() }
    document.body.appendChild(modal)
  } catch(e) { console.error(e); alert('Could not load brief details') }
}

function briefModalTab(tab) {
  var dp = document.getElementById('brief-panel-details')
  var pp = document.getElementById('brief-panel-prompt')
  var td = document.getElementById('brief-tab-details')
  var tp = document.getElementById('brief-tab-prompt')
  if (dp) dp.style.display = tab === 'details' ? '' : 'none'
  if (pp) pp.style.display = tab === 'prompt'  ? '' : 'none'
  if (td) { td.style.background = tab === 'details' ? 'var(--accent)' : 'var(--cream)'; td.style.color = tab === 'details' ? 'white' : 'var(--ink)' }
  if (tp) { tp.style.background = tab === 'prompt'  ? 'var(--accent)' : 'var(--cream)'; tp.style.color = tab === 'prompt'  ? 'white' : 'var(--ink)' }
}

function copyBriefPrompt() {
  if (!window._currentBriefPrompt) return
  navigator.clipboard.writeText(window._currentBriefPrompt).then(function() {
    alert('Prompt copied to clipboard!')
  }).catch(function() {
    var el = document.getElementById('brief-prompt-text')
    if (el) { var r = document.createRange(); r.selectNodeContents(el); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('copy'); s.removeAllRanges(); alert('Prompt copied!') }
  })
}

function downloadBriefPrompt(filename) {
  if (!window._currentBriefPrompt) return
  var blob = new Blob([window._currentBriefPrompt], { type: 'text/plain' })
  var url = URL.createObjectURL(blob)
  var a = document.createElement('a')
  a.href = url; a.download = (filename || 'brief') + '-claude-prompt.txt'
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

function toggleMobileMenu() {
  document.querySelector('nav').classList.toggle('nav-mobile-open')
}
function closeMobileMenu() {
  document.querySelector('nav').classList.remove('nav-mobile-open')
}

// ── TOGGLE DOMAIN EMAILS ─────────────────────────────────
async function toggleDomainEmails() {
  try {
    var res = await fetch(API + '/admin/toggle-domain-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() }
    })
    var d = await res.json()
    if (d.message) {
      var btn = document.getElementById('domain-email-toggle-btn')
      if (btn) btn.textContent = d.enabled ? 'Turn off domain emails' : 'Turn on domain emails'
      alert(d.message)
    } else alert(d.error || 'Failed')
  } catch(e) { alert('Could not connect to server') }
}

// ── DOMAIN REQUESTS ───────────────────────────────────────
function addDnsRecordRow() {
  var wrap = document.getElementById('dr-records-wrap')
  if (!wrap) return
  var row = document.createElement('div')
  row.className = 'dr-record-row'
  row.style.cssText = 'display:grid;grid-template-columns:100px 1fr 1fr auto;gap:8px;margin-bottom:8px;'
  row.innerHTML =
    '<select class="dr-type" style="padding:8px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:13px;"><option>CNAME</option><option>A</option><option>TXT</option><option>MX</option></select>' +
    '<input type="text" class="dr-name" placeholder="Name (e.g. @)" style="padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:13px;">' +
    '<input type="text" class="dr-content" placeholder="Content/Target" style="padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:13px;">' +
    '<button onclick="this.closest(\'.dr-record-row\').remove()" style="background:none;border:1px solid var(--border);border-radius:var(--radius);padding:8px 10px;cursor:pointer;color:var(--ink-muted);">\u2715</button>'
  wrap.appendChild(row)
}

async function submitDomainRequest() {
  var business = document.getElementById('dr-business')?.value.trim()
  var domain   = document.getElementById('dr-domain')?.value.trim()
  if (!business || !domain) return alert('Please enter the business name and domain name')

  var dns_records = []
  document.querySelectorAll('.dr-record-row').forEach(function(row) {
    var type    = row.querySelector('.dr-type')?.value
    var name    = row.querySelector('.dr-name')?.value.trim()
    var content = row.querySelector('.dr-content')?.value.trim()
    if (type && (name || content)) dns_records.push({ type: type, name: name || '@', content: content || '' })
  })

  // Find the website_id for this contractor's client (best effort — use most recent)
  var website_id = null
  try {
    var statsRes = await fetch(API + '/admin/stats', { headers: { 'Authorization': 'Bearer ' + getToken() } })
    var statsData = await statsRes.json()
    if (statsData.clients && statsData.clients.length) {
      var match = statsData.clients.find(function(c) { return (c.business_name||'').toLowerCase() === business.toLowerCase() })
      website_id = match ? match.website_id : statsData.clients[0].website_id
    }
  } catch(e) {}

  try {
    var res = await fetch(API + '/domain-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ website_id: website_id, business_name: business, domain_name: domain, dns_records: dns_records })
    })
    var d = await res.json()
    if (d.message || d.request) {
      var m = document.getElementById('save-msg-domain-req')
      if (m) { m.classList.add('show'); setTimeout(function(){ m.classList.remove('show') }, 3000) }
      // Clear form
      document.getElementById('dr-business').value = ''
      document.getElementById('dr-domain').value = ''
      document.getElementById('dr-records-wrap').innerHTML =
        '<div class="dr-record-row" style="display:grid;grid-template-columns:100px 1fr 1fr auto;gap:8px;margin-bottom:8px;">' +
        '<select class="dr-type" style="padding:8px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:13px;"><option>CNAME</option><option>A</option><option>TXT</option><option>MX</option></select>' +
        '<input type="text" class="dr-name" placeholder="Name (e.g. @)" style="padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:13px;">' +
        '<input type="text" class="dr-content" placeholder="Content/Target" style="padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:13px;">' +
        '<button onclick="this.closest(\'.dr-record-row\').remove()" style="background:none;border:1px solid var(--border);border-radius:var(--radius);padding:8px 10px;cursor:pointer;color:var(--ink-muted);">\u2715</button></div>'
    } else {
      alert(d.error || 'Failed to submit request')
    }
  } catch(e) { alert('Could not connect to server') }
}

// ── MANAGER / CONTRACTOR EMAIL CENTER ────────────────────
var mgrSentEmailsLog = []

function updateMgrEmailFields() {
  var type = document.getElementById('mgr-email-center-type')?.value
  var planField   = document.getElementById('mgr-email-plan-field')
  var extraFields = document.getElementById('mgr-email-extra-fields')
  var customField = document.getElementById('mgr-email-custom-field')
  if (planField)   planField.style.display   = type === 'brief' ? '' : 'none'
  if (extraFields) extraFields.style.display = type === 'invite' ? '' : 'none'
  if (customField) customField.style.display = type === 'custom' ? '' : 'none'
  if (type === 'invite') {
    var lbl = document.getElementById('mgr-email-extra-label')
    var inp = document.getElementById('mgr-email-center-extra')
    if (lbl) lbl.textContent = 'Invite code'
    if (inp) inp.placeholder = 'e.g. ABC123'
  }
}

async function sendMgrEmailCenter() {
  var email = document.getElementById('mgr-email-center-to')?.value.trim()
  var type  = document.getElementById('mgr-email-center-type')?.value
  if (!email) return alert('Please enter a client email')

  var endpoint = '', body = {}
  if (type === 'brief') {
    var plan = document.getElementById('mgr-email-center-plan')?.value || 'standard'
    endpoint = '/admin/send-brief'; body = { email: email, plan: plan }
  } else if (type === 'invite') {
    var code = document.getElementById('mgr-email-center-extra')?.value.trim()
    if (!code) return alert('Please enter the invite code')
    endpoint = '/admin/send-invite-email'; body = { email: email, invite_code: code }
  } else if (type === 'ready') {
    endpoint = '/admin/send-ready-email'; body = { email: email }
  } else if (type === 'custom') {
    var subject = document.getElementById('mgr-email-center-subject')?.value.trim()
    var message = document.getElementById('mgr-email-center-message')?.value.trim()
    if (!subject || !message) return alert('Please fill in subject and message')
    endpoint = '/admin/send-custom-email'; body = { email: email, subject: subject, message: message }
  }

  try {
    var res = await fetch(API + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify(body)
    })
    var d = {}
    try { d = await res.json() } catch(e) { d = { message: 'sent' } }

    mgrSentEmailsLog.unshift({ to: email, type: type, time: new Date().toLocaleTimeString() })
    renderMgrSentEmails()
    var m = document.getElementById('save-msg-mgr-email-center')
    if (m) { m.classList.add('show'); setTimeout(function(){ m.classList.remove('show') }, 3000) }
    var toEl = document.getElementById('mgr-email-center-to')
    if (toEl) toEl.value = ''
    if (type === 'invite') { var ex = document.getElementById('mgr-email-center-extra'); if (ex) ex.value = '' }
    if (type === 'custom') {
      var s = document.getElementById('mgr-email-center-subject'); if (s) s.value = ''
      var msg = document.getElementById('mgr-email-center-message'); if (msg) msg.value = ''
    }
  } catch(e) {
    mgrSentEmailsLog.unshift({ to: email, type: type, time: new Date().toLocaleTimeString() })
    renderMgrSentEmails()
    var m = document.getElementById('save-msg-mgr-email-center')
    if (m) { m.classList.add('show'); setTimeout(function(){ m.classList.remove('show') }, 3000) }
    var toEl = document.getElementById('mgr-email-center-to')
    if (toEl) toEl.value = ''
  }
}

function renderMgrSentEmails() {
  var wrap = document.getElementById('mgr-sent-emails-wrap')
  if (!wrap) return
  if (!mgrSentEmailsLog.length) {
    wrap.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No emails sent yet this session.</p>'
    return
  }
  var labels = { brief: '📋 Brief Form', invite: '🔑 Invite Code', ready: '✨ Website Ready', custom: '✉️ Custom' }
  wrap.innerHTML = mgrSentEmailsLog.map(function(e) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border:1px solid var(--border);border-radius:var(--radius);margin-bottom:6px;font-size:13px;">' +
      '<div><strong>' + e.to + '</strong> — ' + (labels[e.type] || e.type) + '</div>' +
      '<div style="color:var(--ink-muted);">' + e.time + '</div></div>'
  }).join('')
}

// ── BONUS GOALS ───────────────────────────────────────────
async function createBonusGoal() {
  var title  = document.getElementById('bonus-title')?.value.trim()
  var target = document.getElementById('bonus-target')?.value
  var amount = document.getElementById('bonus-amount')?.value
  var endDate= document.getElementById('bonus-end-date')?.value
  if (!title || !target || !amount) return alert('Please fill in title, target, and bonus amount')
  try {
    var res = await fetch(API + '/admin/bonus-goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ title: title, target_clients: parseInt(target), bonus_amount: parseFloat(amount), end_date: endDate || null })
    })
    var d = await res.json()
    if (d.goal) {
      var m = document.getElementById('save-msg-bonus')
      if (m) { m.classList.add('show'); setTimeout(function(){ m.classList.remove('show') }, 3000) }
      document.getElementById('bonus-title').value = ''
      document.getElementById('bonus-target').value = ''
      document.getElementById('bonus-amount').value = ''
      document.getElementById('bonus-end-date').value = ''
      loadBonusGoals()
    } else alert(d.error || 'Failed to create goal')
  } catch(e) { alert('Could not connect to server') }
}

async function loadBonusGoals() {
  try {
    var res = await fetch(API + '/admin/bonus-goals', { headers: { 'Authorization': 'Bearer ' + getToken() } })
    var data = await res.json()
    renderBonusGoals(data.goals || [])
  } catch(e) {
    var w = document.getElementById('bonus-goals-wrap')
    if (w) w.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">Could not load goals.</p>'
  }
}

function renderBonusGoals(goals) {
  var wrap = document.getElementById('bonus-goals-wrap')
  if (!wrap) return
  // Only show active goals in admin view
  var active = goals.filter(function(g) { return g.active })
  if (!active.length) { wrap.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No active bonus goals.</p>'; return }
  wrap.innerHTML = active.map(function(g) {
    var endStr = ''
    var daysLeft = ''
    if (g.end_date) {
      var end = new Date(g.end_date)
      var now = new Date()
      var diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
      endStr = ' · Ends ' + end.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
      daysLeft = diff > 0 ? diff + ' day' + (diff !== 1 ? 's' : '') + ' left' : 'Expired'
    }
    return '<div style="background:var(--cream);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px 20px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">' +
      '<div style="flex:1;">' +
      '<div style="font-weight:600;font-size:15px;">' + g.title + '</div>' +
      '<div style="font-size:13px;color:var(--ink-muted);margin-top:3px;">Target: <strong>' + g.target_clients + ' clients</strong> · Bonus: <strong>$' + g.bonus_amount + '</strong>' + endStr + '</div>' +
      (daysLeft ? '<div style="font-size:12px;color:' + (daysLeft === 'Expired' ? '#ef4444' : '#f59e0b') + ';font-weight:600;margin-top:3px;">' + daysLeft + '</div>' : '') +
      '<div style="font-size:12px;color:var(--accent);font-weight:600;margin-top:3px;">🟢 Active</div>' +
      '</div>' +
      '<button onclick="deleteBonusGoal(&quot;' + g.id + '&quot;)" style="background:#fee2e2;border:1px solid #ef4444;border-radius:var(--radius);padding:6px 14px;font-family:var(--sans);font-size:12px;color:#ef4444;cursor:pointer;white-space:nowrap;">Remove</button>' +
      '</div>'
  }).join('')
}

async function deleteBonusGoal(id) {
  try {
    var res = await fetch(API + '/admin/bonus-goals/' + id, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() }
    })
    var d = {}
    try { d = await res.json() } catch(e) { d = {} }
    if (res.ok && d.message) {
      loadBonusGoals()
    } else {
      alert('Error ' + res.status + ': ' + (d.error || 'Failed to remove goal. You may not have permission.'))
    }
  } catch(e) { alert('Could not connect to server') }
}

// ── AM/PM TOGGLE ──────────────────────────────────────────
function toggleAmPm(btnId) {
  var btn = document.getElementById(btnId)
  if (!btn) return
  btn.textContent = btn.textContent === 'AM' ? 'PM' : 'AM'
  btn.style.background = btn.textContent === 'PM' ? 'var(--accent)' : 'white'
  btn.style.color       = btn.textContent === 'PM' ? 'white' : 'var(--ink)'
  btn.style.borderColor = btn.textContent === 'PM' ? 'var(--accent)' : 'var(--border)'
}

// ── BRIEF FORM PAGES ──────────────────────────────────────
var briefPageCount = 0
var PAGE_SUGGESTIONS = ['Home', 'About Us', 'Services', 'Gallery', 'Menu', 'Contact', 'Testimonials', 'Team', 'Blog', 'FAQ', 'Portfolio', 'Booking']

function addBriefPage() {
  var limits = { basic: 1, standard: 4, premium: 12 }
  var max = limits[briefPlan] || 4
  if (briefPlan === 'basic' && briefPageCount >= 1) {
    alert('The Basic plan only includes 1 page (Home). Upgrade to Standard or Premium for more pages.')
    return
  }
  if (briefPageCount >= max) {
    alert('Your ' + briefPlan + ' plan allows up to ' + max + ' page' + (max > 1 ? 's' : '') + '.')
    return
  }
  briefPageCount++
  var list = document.getElementById('bf-pages-list')
  if (!list) return
  var idx = briefPageCount
  var div = document.createElement('div')
  div.id = 'bf-page-row-' + idx
  div.style.cssText = 'display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;'

  // Datalist for suggestions
  var dlId = 'bf-page-suggestions-' + idx
  var input = document.createElement('input')
  input.type = 'text'; input.className = 'bf-page-input'
  input.setAttribute('list', dlId)
  input.placeholder = 'e.g. Home, About Us, Services, Gallery...'
  input.style.cssText = 'padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:13px;'

  var dl = document.createElement('datalist')
  dl.id = dlId
  PAGE_SUGGESTIONS.forEach(function(s) { var opt = document.createElement('option'); opt.value = s; dl.appendChild(opt) })

  var removeBtn = document.createElement('button')
  removeBtn.type = 'button'; removeBtn.textContent = '✕'
  removeBtn.style.cssText = 'background:none;border:1px solid var(--border);border-radius:var(--radius);padding:8px 12px;cursor:pointer;color:var(--ink-muted);font-size:14px;'
  removeBtn.addEventListener('click', function() { div.remove(); briefPageCount-- })

  div.appendChild(input); div.appendChild(dl); div.appendChild(removeBtn)
  list.appendChild(div)
}

// ── BRIEF CLAIMING ────────────────────────────────────────
async function claimBrief(id) {
  try {
    var res = await fetch(API + '/admin/website-briefs/' + id + '/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() }
    })
    var d = await res.json()
    if (d.message) loadSubmittedBriefs()
    else alert(d.error || 'Could not claim brief')
  } catch(e) { alert('Could not connect to server') }
}

async function unclaimBrief(id) {
  if (!confirm('Release this brief? Others will be able to claim it.')) return
  try {
    var res = await fetch(API + '/admin/website-briefs/' + id + '/unclaim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() }
    })
    var d = await res.json()
    if (d.message) loadSubmittedBriefs()
    else alert(d.error || 'Could not release brief')
  } catch(e) { alert('Could not connect to server') }
}

// ── DOMAIN REQUESTS (admin/manager view) ─────────────────
async function loadDomainRequests() {
  var wrap = document.getElementById('domain-requests-wrap')
  if (!wrap) return
  try {
    var res = await fetch(API + '/admin/domain-requests', { headers: { 'Authorization': 'Bearer ' + getToken() } })
    var data = await res.json()
    if (data.error) { wrap.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No domain requests yet.</p>'; return }
    renderDomainRequests(data.requests || [])
  } catch(e) { wrap.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">Could not load domain requests.</p>' }
}

function renderDomainRequests(requests) {
  var wrap = document.getElementById('domain-requests-wrap')
  if (!wrap) return
  if (!requests.length) { wrap.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No domain requests yet.</p>'; return }
  wrap.innerHTML = requests.map(function(r) {
    var date = new Date(r.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
    var statusColor = r.status === 'completed' ? 'var(--accent)' : '#f59e0b'
    var statusLabel = r.status === 'completed' ? '✅ Completed' : '⏳ Pending'
    var dns = []
    try { dns = Array.isArray(r.dns_records) ? r.dns_records : JSON.parse(r.dns_records || '[]') } catch(e) {}
    return '<div style="background:var(--cream);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px 20px;margin-bottom:8px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">' +
      '<div>' +
      '<div style="font-weight:600;font-size:15px;">' + (r.business_name || 'Unknown') + ' — ' + (r.domain_name || '') + '</div>' +
      '<div style="font-size:13px;color:var(--ink-muted);margin-top:2px;">Requested by: ' + (r.requested_by_email || '') + ' · ' + date + '</div>' +
      '<div style="font-size:12px;color:' + statusColor + ';font-weight:600;margin-top:3px;">' + statusLabel + '</div>' +
      (dns.length ? '<div style="margin-top:8px;"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--ink-muted);margin-bottom:4px;">DNS Records</div>' +
        dns.map(function(d) { return '<div style="font-size:12px;font-family:monospace;background:white;border:1px solid var(--border);border-radius:4px;padding:3px 8px;display:inline-block;margin:2px;">' + d.type + ' ' + d.name + ' → ' + d.content + '</div>' }).join('') +
        '</div>' : '') +
      '</div>' +
      (r.status !== 'completed' ? '<button onclick="completeDomainRequest(&quot;' + r.id + '&quot;)" style="background:var(--accent);color:white;border:none;border-radius:var(--radius);padding:8px 16px;font-family:var(--sans);font-size:12px;font-weight:500;cursor:pointer;white-space:nowrap;">Mark complete</button>' : '') +
      '</div></div>'
  }).join('')
}

function completeDomainRequest(id) {
  // Show cost input modal before marking complete
  var existing = document.getElementById('domain-complete-modal')
  if (existing) existing.remove()
  var modal = document.createElement('div')
  modal.id = 'domain-complete-modal'
  modal.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(15,17,23,0.7);display:flex;align-items:center;justify-content:center;padding:20px;'
  modal.innerHTML = '<div style="background:white;border-radius:16px;width:100%;max-width:440px;padding:28px;box-shadow:0 24px 60px rgba(0,0,0,0.2);">' +
    '<div style="font-family:var(--serif);font-size:20px;margin-bottom:6px;">Mark domain complete</div>' +
    '<p style="font-size:13px;color:var(--ink-muted);margin-bottom:18px;">Optionally enter pricing to include in the approval email sent to the contractor.</p>' +
    '<div class="dash-field" style="margin-bottom:12px;"><label>Domain setup cost ($)</label><input type="number" id="dc-cost" placeholder="e.g. 25" min="0" step="0.01"></div>' +
    '<div class="dash-field" style="margin-bottom:20px;"><label>Annual renewal cost ($/year)</label><input type="number" id="dc-yearly" placeholder="e.g. 15" min="0" step="0.01"></div>' +
    '<div style="display:flex;gap:10px;">' +
    '<button onclick="submitDomainComplete(&quot;' + id + '&quot;)" style="flex:1;padding:12px;background:var(--accent);color:white;border:none;border-radius:var(--radius);font-family:var(--sans);font-size:14px;font-weight:500;cursor:pointer;">Mark complete &amp; notify</button>' +
    '<button onclick="document.getElementById(&quot;domain-complete-modal&quot;).remove()" style="padding:12px 20px;background:var(--cream);border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:14px;cursor:pointer;">Cancel</button>' +
    '</div></div>'
  modal.onclick = function(e) { if (e.target === modal) modal.remove() }
  document.body.appendChild(modal)
}

async function submitDomainComplete(id) {
  var cost   = document.getElementById('dc-cost')?.value || 0
  var yearly = document.getElementById('dc-yearly')?.value || 0
  try {
    var res = await fetch(API + '/admin/domain-requests/' + id + '/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ domain_cost: parseFloat(cost) || 0, domain_yearly_fee: parseFloat(yearly) || 0 })
    })
    var d = {}
    try { d = await res.json() } catch(e) { d = {} }
    if (res.ok && d.message) {
      document.getElementById('domain-complete-modal').remove()
      loadDomainRequests()
    } else {
      alert('Error ' + res.status + ': ' + (d.error || 'Could not mark complete'))
    }
  } catch(e) { alert('Could not connect to server') }
}

// ── UPLOAD SITE HTML (contractor/manager uploads finished website) ────────
function uploadSiteHtml(websiteId, clientEmail) {
  if (!websiteId || websiteId === 'undefined') return alert('No website profile found for this client yet. Create one first.')
  var modal = document.createElement('div')
  modal.id = 'upload-site-modal'
  modal.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(15,17,23,0.7);display:flex;align-items:center;justify-content:center;padding:20px;'
  modal.innerHTML =
    '<div style="background:white;border-radius:16px;width:100%;max-width:560px;padding:28px;box-shadow:0 24px 60px rgba(0,0,0,0.2);">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">' +
    '<div style="font-family:var(--serif);font-size:20px;">Upload website for ' + clientEmail + '</div>' +
    '<button onclick="document.getElementById(\'upload-site-modal\').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--ink-muted);">\u00d7</button>' +
    '</div>' +
    '<p style="font-size:13px;color:var(--ink-muted);margin-bottom:14px;">Paste the complete HTML file content below, or use the file picker.</p>' +
    '<input type="file" id="site-html-file" accept=".html,.htm" style="margin-bottom:10px;font-size:13px;" onchange="loadHtmlFile(this)">' +
    '<textarea id="site-html-content" rows="8" placeholder="Or paste HTML here..." style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius);font-family:monospace;font-size:12px;resize:vertical;"></textarea>' +
    '<div style="display:flex;gap:10px;margin-top:16px;">' +
    '<button onclick="submitSiteHtml(\'' + websiteId + '\')" style="flex:1;padding:12px;background:var(--accent);color:white;border:none;border-radius:var(--radius);font-family:var(--sans);font-size:14px;font-weight:500;cursor:pointer;">Upload website</button>' +
    '<button onclick="document.getElementById(\'upload-site-modal\').remove()" style="padding:12px 20px;background:var(--cream);border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:14px;cursor:pointer;">Cancel</button>' +
    '</div></div>'
  modal.onclick = function(e) { if (e.target === modal) modal.remove() }
  document.body.appendChild(modal)
}

function loadHtmlFile(input) {
  var file = input.files[0]
  if (!file) return
  var reader = new FileReader()
  reader.onload = function(e) {
    var ta = document.getElementById('site-html-content')
    if (ta) ta.value = e.target.result
  }
  reader.readAsText(file)
}

async function submitSiteHtml(websiteId) {
  var html = document.getElementById('site-html-content')?.value.trim()
  if (!html) return alert('Please paste or load an HTML file first')
  if (!html.includes('<html') && !html.includes('<!DOCTYPE')) {
    if (!confirm('This doesn\'t look like a full HTML file. Upload anyway?')) return
  }
  var btn = document.querySelector('#upload-site-modal button[onclick^="submitSiteHtml"]')
  if (btn) { btn.disabled = true; btn.textContent = 'Uploading...' }
  try {
    var res = await fetch(API + '/admin/upload-site-html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ website_id: websiteId, site_html: html })
    })
    var d = await res.json()
    if (d.message) {
      document.getElementById('upload-site-modal').remove()
      alert('Website uploaded successfully! You can now mark it as preview ready.')
    } else alert(d.error || 'Upload failed')
  } catch(e) { alert('Could not connect to server') }
  if (btn) { btn.disabled = false; btn.textContent = 'Upload website' }
}

// ── MARK PREVIEW READY (notify client to review + approve) ───────────────
async function markPreviewReady(clientId, clientEmail) {
  if (!confirm('Mark website as preview ready for ' + clientEmail + '? This will update their status and you\'ll need to send them the "website ready" email from the Email Center.')) return
  try {
    var res = await fetch(API + '/admin/mark-preview-ready', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ client_id: clientId, client_email: clientEmail })
    })
    var d = await res.json()
    if (d.message) {
      alert('Marked as preview ready! Now send the client a "Website Ready" email from the Email Center to notify them.')
      loadAdminData()
    } else alert(d.error || 'Failed')
  } catch(e) { alert('Could not connect to server') }
}

// ── SWAP STAFF ROLE ───────────────────────────────────────
async function swapRole(clientId, currentRole) {
  var newRole = currentRole === 'manager' ? 'contractor' : 'manager'
  try {
    var res = await fetch(API + '/admin/set-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ client_id: clientId, role: newRole })
    })
    var d = await res.json()
    if (d.message) {
      alert('Role updated to ' + newRole + '. They will need to log out and log back in.')
      loadAdminData()
    } else alert(d.error || 'Failed to update role')
  } catch(e) { alert('Could not connect to server') }
}

// ── CONTRACTOR BONUS GOAL DISPLAY ────────────────────────
async function loadContractorBonus() {
  var section = document.getElementById('bonus-goal-section')
  var display = document.getElementById('bonus-goal-display')
  if (!section || !display) return

  try {
    // Fetch the active bonus goal
    var goalRes = await fetch(API + '/bonus-goals', {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    var goalData = await goalRes.json()
    var goal = goalData.goal || (Array.isArray(goalData) ? goalData[0] : null)

    if (!goal || !goal.active) {
      section.style.display = 'none'
      return
    }

    // Fetch this contractor's progress toward the goal
    var myId = JSON.parse(atob(getToken().split('.')[1])).id
    var progRes = await fetch(API + '/bonus-progress/' + myId, {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    var prog = await progRes.json()
    var count   = prog.progress || 0
    var target  = goal.target_clients || 1
    var pct     = Math.min(100, Math.round((count / target) * 100))
    var hit     = count >= target

    // Days remaining
    var daysLeftStr = ''
    var expired = false
    if (goal.end_date) {
      var end  = new Date(goal.end_date)
      var now  = new Date()
      var diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
      if (diff <= 0) {
        daysLeftStr = 'This goal has ended'
        expired = true
      } else {
        daysLeftStr = diff + ' day' + (diff !== 1 ? 's' : '') + ' remaining'
      }
    }

    section.style.display = ''

    var barColor = hit ? '#10b981' : (expired ? '#6b7280' : 'var(--accent)')
    var statusBanner = hit
      ? '<div style="background:#d1fae5;border:1px solid #6ee7b7;border-radius:var(--radius);padding:12px 16px;margin-top:14px;display:flex;align-items:center;gap:10px;">' +
        '<span style="font-size:22px;">🎉</span>' +
        '<div><div style="font-weight:700;color:#065f46;font-size:15px;">You hit the goal!</div>' +
        '<div style="font-size:13px;color:#047857;margin-top:2px;">Your $' + goal.bonus_amount + ' bonus will be added to your earnings at the next pay period close.</div></div>' +
        '</div>'
      : (expired
        ? '<div style="background:var(--cream);border:1px solid var(--border);border-radius:var(--radius);padding:10px 14px;margin-top:12px;font-size:13px;color:var(--ink-muted);">This goal period has ended.</div>'
        : '<div style="font-size:13px;color:var(--ink-muted);margin-top:10px;">' + (target - count) + ' more client' + (target - count !== 1 ? 's' : '') + ' to go to earn your $' + goal.bonus_amount + ' bonus.</div>')

    display.innerHTML =
      '<div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px 24px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">' +
      '<div>' +
      '<div style="font-weight:700;font-size:17px;">' + goal.title + '</div>' +
      '<div style="font-size:13px;color:var(--ink-muted);margin-top:3px;">Bring in <strong>' + target + ' new client' + (target !== 1 ? 's' : '') + '</strong> to earn <strong style="color:var(--accent);">$' + goal.bonus_amount + '</strong></div>' +
      '</div>' +
      (daysLeftStr ? '<div style="font-size:12px;font-weight:600;color:' + (expired ? '#6b7280' : '#f59e0b') + ';text-align:right;">' + daysLeftStr + '</div>' : '') +
      '</div>' +
      '<div style="margin-top:16px;">' +
      '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;">' +
      '<span style="font-weight:600;">' + count + ' / ' + target + ' clients</span>' +
      '<span style="color:var(--ink-muted);">' + pct + '%</span>' +
      '</div>' +
      '<div style="background:#e5e7eb;border-radius:999px;height:12px;overflow:hidden;">' +
      '<div style="height:100%;border-radius:999px;background:' + barColor + ';width:' + pct + '%;transition:width 0.5s;"></div>' +
      '</div>' +
      '</div>' +
      statusBanner +
      '</div>'

  } catch(e) {
    console.error('Could not load bonus goal:', e)
    var section2 = document.getElementById('bonus-goal-section')
    if (section2) section2.style.display = 'none'
  }
}

// ── DELETE SUBMITTED BRIEF (admin only) ──────────────────
async function deleteBrief(id) {
  try {
    var res = await fetch(API + '/admin/website-briefs/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    var d = await res.json()
    if (d.message) loadSubmittedBriefs()
    else alert(d.error || 'Failed to delete')
  } catch(e) { alert('Could not connect to server') }
}

// ── BUILD STATUS ──────────────────────────────────────────
async function setBuildStatus(clientId, status) {
  try {
    var res = await fetch(API + '/admin/set-build-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ client_id: clientId, build_status: status })
    })
    var d = await res.json()
    if (d.message) loadAdminData()
    else alert(d.error || 'Failed')
  } catch(e) { alert('Could not connect to server') }
}

// ── MAKE MISSED PAYMENT ───────────────────────────────────
async function payMissedPayment() {
  try {
    var res = await fetch(API + '/billing-portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() }
    })
    var d = await res.json()
    if (d.url) window.location.href = d.url
    else alert(d.error || 'Could not open billing portal. Please contact support.')
  } catch(e) { alert('Could not connect to server') }
}

// ── OPEN STRIPE BILLING PORTAL ────────────────────────────
async function openBillingPortal() {
  try {
    var res = await fetch(API + '/billing-portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() }
    })
    var d = await res.json()
    if (d.url) {
      window.location.href = d.url
    } else {
      alert(d.error || 'Could not open billing portal. Please contact support at hello@sitefloa.com')
    }
  } catch(e) {
    alert('Could not connect to server')
  }
}

// ── STAFF ACTION WRAPPERS (use data attributes to avoid onclick quote/UUID issues) ──
function viewPayHistoryById(btn) {
  var id = btn.getAttribute('data-id')
  var email = btn.getAttribute('data-email') || ''
  viewPayHistory(id, email)
}
function closePeriodById(btn) {
  var id = btn.getAttribute('data-id')
  var email = btn.getAttribute('data-email') || ''
  closePeriod(id, email)
}
function removeManagerById(btn) {
  var id = btn.getAttribute('data-id')
  var email = btn.getAttribute('data-email') || ''
  removeManager(id, email)
}
function swapRoleById(btn) {
  var id = btn.getAttribute('data-id')
  var role = btn.getAttribute('data-role') || 'contractor'
  swapRole(id, role)
}
function updateCommissionById(btn) {
  var id = btn.getAttribute('data-id')
  updateCommission(id)
}
function updateManagerOrgRateById(btn) {
  var id = btn.getAttribute('data-id')
  updateManagerOrgRate(id)
}

// ── COMPLETE BRIEF ────────────────────────────────────────
async function completeBrief(id) {
  try {
    var res = await fetch(API + '/admin/website-briefs/' + id + '/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() }
    })
    var d = await res.json()
    if (d.message) loadSubmittedBriefs()
    else alert(d.error || 'Failed')
  } catch(e) { alert('Could not connect to server') }
}

// ── UPDATE CLIENT DOMAIN ──────────────────────────────────
async function updateClientDomain(clientId) {
  var domain = document.getElementById('dn-'+clientId)?.value.trim() || ''
  var cost   = parseFloat(document.getElementById('dc-'+clientId)?.value) || 0
  var yearly = parseFloat(document.getElementById('dy-'+clientId)?.value) || 0
  try {
    var res = await fetch(API + '/admin/update-domain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ client_id: clientId, domain_name: domain, domain_cost: cost, domain_yearly_fee: yearly })
    })
    var d = await res.json()
    if (d.message) loadAdminData()
    else alert(d.error || 'Failed')
  } catch(e) { alert('Could not connect to server') }
}

// ── SALES GUIDE MODAL ─────────────────────────────────────
function showSalesGuide() {
  var existing = document.getElementById('sales-guide-modal')
  if (existing) existing.remove()

  var steps = [
    // ROUTE A
    { route: 'A', type: 'route-header', label: 'Route A — You find the client' },
    {
      route: 'A', num: 1, icon: '🎯',
      title: 'Add them to the Sales Pipeline',
      desc: 'Go to Sales Pipeline → + Add lead. Enter their business name and any notes. This tracks them as a potential client.'
    },
    {
      route: 'A', num: 2, icon: '📞',
      title: 'Contact them & show a demo',
      desc: 'Reach out and ask if they want to see a demo of what their website could look like. If yes, open the Demos section in your dashboard → customise a demo to match their branding → click "Share demo" and enter their email. The email includes a link to fill out the brief form to get started.'
    },
    {
      route: 'A', num: 3, icon: '✅',
      title: 'They\'re interested — get their info',
      desc: 'Get their email address and preferred plan (Basic / Standard / Premium). Let them know you\'ll send a brief form to collect all their website details.'
    },
    // ROUTE B
    { route: 'B', type: 'route-header', label: 'Route B — Client finds us' },
    {
      route: 'B', num: 1, icon: '📝',
      title: 'Inquiry lands in your inbox',
      desc: 'The client fills out the "Get a Website" form on sitefloa.com. This sends a notification to everyone\'s Inquiries section.'
    },
    {
      route: 'B', num: 2, icon: '🙋',
      title: 'Claim the inquiry',
      desc: 'Click Claim on the inquiry. Once claimed, only you can see their contact info — this is now your client. Get their email from the inquiry form.'
    },
    // MERGED FLOW
    { route: 'both', type: 'route-header', label: '⬇️ Both routes continue here' },
    {
      route: 'both', num: 3, icon: '📧',
      title: 'Send them the brief form',
      desc: 'Go to Client Email Center → enter their email → pick their plan → select "Website Brief Form" → Send. This emails them a link to fill out all their website details.'
    },
    {
      route: 'both', num: 4, icon: '📬',
      title: 'Claim the submitted brief',
      desc: 'Once they fill it out it appears in Submitted Briefs. Click Claim — now only you can view their full brief and contact info.'
    },
    {
      route: 'both', num: 5, icon: '👤',
      title: 'Create their client profile',
      desc: 'Go to "Create new client website" at the bottom of your dashboard. Enter their name, email, and tier. Press "Create + Get Code" and copy the invite code.'
    },
    {
      route: 'both', num: 6, icon: '🔑',
      title: 'Send them their account code',
      desc: 'Back in Client Email Center → change type to "Invite Code + Instructions" → paste their code → Send. They use this to create their account.'
    },
    {
      route: 'both', num: 7, icon: '💳',
      title: 'Client pays the deposit',
      desc: 'When they create their account they\'ll be taken straight to the deposit payment page. Once paid, you\'ll get a notification to start building.'
    },
    {
      route: 'both', num: 8, icon: '🌐',
      title: 'Build the website',
      desc: 'Use the Claude prompt from "View brief" to build their site with AI. Once built, go to their profile in the Clients section → click "Upload website HTML" → upload the file.'
    },
    {
      route: 'both', num: 9, icon: '✉️',
      title: 'Tell them it\'s ready',
      desc: 'Client Email Center → "Website Ready to Review" → Send. A live chat opens between you and the client for final changes.'
    },
    {
      route: 'both', num: 10, icon: '🌍',
      title: 'Find & request their domain',
      desc: 'During the chat, agree on a domain name. Go to "Request domain" → enter the domain name and DNS/CNAME records (ask the AI what it needs when building the site) → Send Request. Wait for the approval email with the cost.'
    },
    {
      route: 'both', num: 11, icon: '💰',
      title: 'Add domain cost to their profile',
      desc: 'Once approved, open their profile in the Clients section → update the domain name and yearly cost. If it\'s under their tier allowance, they pay nothing extra. If over, they pay the difference.'
    },
    {
      route: 'both', num: 12, icon: '🚀',
      title: 'Client approves → goes live → you get paid',
      desc: 'When the client is happy they press "Go live" and pay the remaining launch fee. Their website goes live, your commission is added to your earnings for this pay period.'
    },
    {
      route: 'both', num: 13, icon: '📊',
      title: 'Update the Sales Pipeline',
      desc: 'Go back to their lead in the Sales Pipeline and update the status to "Won". Keep all lead statuses current so everyone knows the pipeline at a glance.'
    }
  ]

  function card(step) {
    if (step.type === 'route-header') {
      var color = step.route === 'A' ? '#3b82f6' : step.route === 'B' ? '#8b5cf6' : 'var(--accent)'
      var bg    = step.route === 'A' ? '#eff6ff' : step.route === 'B' ? '#f5f3ff' : '#e8f4f1'
      return '<div style="background:' + bg + ';border-left:4px solid ' + color + ';border-radius:var(--radius);padding:10px 16px;margin:16px 0 8px;">'
        + '<div style="font-weight:700;font-size:14px;color:' + color + ';">' + step.label + '</div>'
        + '</div>'
    }
    var color = step.route === 'A' ? '#3b82f6' : step.route === 'B' ? '#8b5cf6' : 'var(--accent)'
    var numBg = step.route === 'A' ? '#dbeafe' : step.route === 'B' ? '#ede9ff' : '#e8f4f1'
    return '<div style="display:flex;gap:14px;align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--border);">'
      + '<div style="flex-shrink:0;width:36px;height:36px;border-radius:50%;background:' + numBg + ';display:flex;align-items:center;justify-content:center;font-size:18px;">' + step.icon + '</div>'
      + '<div style="flex:1;">'
      + '<div style="font-weight:600;font-size:14px;margin-bottom:3px;">' + step.title + '</div>'
      + '<div style="font-size:13px;color:var(--ink-muted);line-height:1.5;">' + step.desc + '</div>'
      + '</div></div>'
  }

  var modal = document.createElement('div')
  modal.id = 'sales-guide-modal'
  modal.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(15,17,23,0.75);display:flex;align-items:center;justify-content:center;padding:16px;'
  modal.innerHTML = '<div style="background:white;border-radius:16px;width:100%;max-width:640px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,0.25);">'
    + '<div style="padding:20px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">'
    + '<div><div style="font-family:var(--serif);font-size:22px;">📋 How to Land a Client</div>'
    + '<div style="font-size:13px;color:var(--ink-muted);margin-top:3px;">Step-by-step guide from first contact to commission</div></div>'
    + '<button onclick="document.getElementById(&quot;sales-guide-modal&quot;).remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--ink-muted);">&times;</button>'
    + '</div>'
    + '<div style="overflow-y:auto;padding:4px 24px 24px;">'
    + steps.map(card).join('')
    + '</div></div>'
  modal.onclick = function(e) { if (e.target === modal) modal.remove() }
  document.body.appendChild(modal)
}

// ── DOMAIN NOTIFICATION BELL ─────────────────────────────
async function loadDomainNotifications() {
  try {
    var res = await fetch(API + '/my-domain-requests', {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    var d = await res.json()
    var requests = d.requests || []
    // Count unseen approved requests
    var unseen = requests.filter(function(r) {
      return r.status === 'completed' && !r.seen_at
    })
    var badge = document.getElementById('domain-notif-badge')
    var bell  = document.getElementById('domain-notif-btn')
    if (badge && bell) {
      if (unseen.length > 0) {
        badge.style.display = 'block'
        badge.textContent = unseen.length > 9 ? '9+' : unseen.length
        bell.title = unseen.length + ' new approved domain request' + (unseen.length !== 1 ? 's' : '')
      } else {
        badge.style.display = 'none'
        bell.title = 'Domain requests'
      }
    }
    // Store for modal
    window._myDomainRequests = requests
  } catch(e) { console.error('Could not load domain notifications:', e) }
}

async function showDomainNotifications() {
  // Mark all seen first
  fetch(API + '/my-domain-requests/seen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() }
  }).then(function() {
    // Clear badge
    var badge = document.getElementById('domain-notif-badge')
    if (badge) badge.style.display = 'none'
  })

  var requests = window._myDomainRequests || []
  // Re-fetch to be sure
  try {
    var res = await fetch(API + '/my-domain-requests', {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    var d = await res.json()
    requests = d.requests || []
    window._myDomainRequests = requests
  } catch(e) {}

  var existing = document.getElementById('domain-notif-modal')
  if (existing) existing.remove()

  function statusBadge(r) {
    if (r.status === 'completed') return '<span style="background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700;">✅ Approved</span>'
    return '<span style="background:#fff8e6;color:#b45309;border:1px solid #fcd34d;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700;">⏳ Pending</span>'
  }

  function requestCard(r) {
    var date = new Date(r.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
    var dns = []
    try { dns = Array.isArray(r.dns_records) ? r.dns_records : JSON.parse(r.dns_records || '[]') } catch(e) {}
    var isNew = r.status === 'completed' && !r.seen_at
    return '<div style="border:1px solid ' + (isNew ? '#6ee7b7' : 'var(--border)') + ';border-radius:var(--radius-lg);padding:16px 20px;margin-bottom:10px;background:' + (isNew ? '#f0fdf4' : 'white') + ';">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:10px;">' +
      '<div>' +
      (isNew ? '<div style="font-size:11px;font-weight:700;color:#059669;margin-bottom:4px;">🆕 New approval</div>' : '') +
      '<div style="font-weight:700;font-size:16px;">' + (r.domain_name || 'Unknown domain') + '</div>' +
      '<div style="font-size:13px;color:var(--ink-muted);margin-top:2px;">' + (r.business_name || '') + ' &middot; Requested ' + date + '</div>' +
      '</div>' +
      statusBadge(r) +
      '</div>' +
      (r.status === 'completed' ? '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">' +
        '<div style="background:var(--cream);border-radius:var(--radius);padding:10px;">' +
        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--ink-muted);margin-bottom:3px;">Setup cost</div>' +
        '<div style="font-size:18px;font-weight:700;color:var(--accent);">$' + (parseFloat(r.domain_cost)||0).toFixed(2) + '</div>' +
        '</div>' +
        '<div style="background:var(--cream);border-radius:var(--radius);padding:10px;">' +
        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--ink-muted);margin-bottom:3px;">Annual renewal</div>' +
        '<div style="font-size:18px;font-weight:700;color:var(--accent);">$' + (parseFloat(r.domain_yearly_fee)||0).toFixed(2) + '/yr</div>' +
        '</div>' +
        '</div>' : '') +
      (dns.length ? '<div>' +
        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--ink-muted);margin-bottom:6px;">DNS Records</div>' +
        dns.map(function(d) { return '<div style="font-size:12px;font-family:monospace;background:var(--cream);border:1px solid var(--border);border-radius:4px;padding:4px 8px;display:inline-block;margin:2px;">' + d.type + ' ' + d.name + ' \u2192 ' + d.content + '</div>' }).join('') +
        '</div>' : '') +
      '</div>'
  }

  var modal = document.createElement('div')
  modal.id = 'domain-notif-modal'
  modal.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(15,17,23,0.7);display:flex;align-items:center;justify-content:center;padding:20px;'
  modal.innerHTML =
    '<div style="background:white;border-radius:16px;width:100%;max-width:580px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,0.2);">' +
    '<div style="padding:18px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">' +
    '<div><div style="font-family:var(--serif);font-size:20px;">🌐 Domain Requests</div>' +
    '<div style="font-size:13px;color:var(--ink-muted);margin-top:2px;">Your submitted domain requests and their approval status</div></div>' +
    '<button onclick="document.getElementById(&quot;domain-notif-modal&quot;).remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--ink-muted);">&times;</button>' +
    '</div>' +
    '<div style="overflow-y:auto;padding:20px 24px;">' +
    (requests.length
      ? requests.map(requestCard).join('')
      : '<div style="text-align:center;padding:40px 20px;color:var(--ink-muted);">No domain requests yet.<br>Use the form below to request a domain for a client.</div>'
    ) +
    '</div></div>'
  modal.onclick = function(e) { if (e.target === modal) modal.remove() }
  document.body.appendChild(modal)
}

// ── STAFF / ADMIN CHAT SYSTEM ─────────────────────────────
var _currentStaffChatId = null
var _currentAdminChatId = null
var _clientChatImageData = null
var _staffChatImageData = null
var _adminChatImageData = null

async function loadAllChats(context) {
  var wrapId = context === 'admin' ? 'all-chats-wrap' : 'mgr-chats-list'
  var wrap = document.getElementById(wrapId)
  if (!wrap) return
  try {
    var res = await fetch(API + '/admin/all-chats', {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    var d = await res.json()
    var chats = d.chats || []
    // Contractors only see their own clients' chats
    if (getRole() === 'contractor') {
      var myEmail = localStorage.getItem('wc_email') || ''
      chats = chats.filter(function(c) { return c.contractor_email === myEmail })
    }
    renderChatList(chats, wrapId, context)
  } catch(e) {
    wrap.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">Could not load chats.</p>'
  }
}

function renderChatList(chats, wrapId, context) {
  var wrap = document.getElementById(wrapId)
  if (!wrap) return
  if (!chats.length) {
    wrap.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No active client chats. Chats open once a client pays their deposit.</p>'
    return
  }
  wrap.innerHTML = chats.map(function(c) {
    var unreadBadge = c.unread > 0
      ? '<span style="background:#ef4444;color:white;border-radius:12px;padding:2px 8px;font-size:11px;font-weight:700;margin-left:8px;">' + c.unread + ' new</span>'
      : ''
    var lastTime = c.last_message ? new Date(c.last_message).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : 'No messages yet'
    var panelId = context === 'admin' ? 'admin' : 'staff'
    return '<div onclick="openStaffChat(\'' + c.client_id + '\',\'' + (c.business_name || c.client_email) + '\',\'' + panelId + '\')" style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius);margin-bottom:6px;cursor:pointer;background:' + (c.unread > 0 ? '#fff8e6' : 'white') + ';transition:background 0.15s;" onmouseenter="this.style.background=\'var(--cream)\'" onmouseleave="this.style.background=\'' + (c.unread > 0 ? '#fff8e6' : 'white') + '\'">' +
      '<div>' +
      '<div style="font-weight:600;font-size:14px;">' + (c.business_name || c.client_email) + unreadBadge + '</div>' +
      '<div style="font-size:12px;color:var(--ink-muted);margin-top:2px;">' + c.client_email + (c.contractor_email ? ' &middot; ' + c.contractor_email : '') + '</div>' +
      '</div>' +
      '<div style="font-size:12px;color:var(--ink-muted);white-space:nowrap;">' + lastTime + '</div>' +
      '</div>'
  }).join('')
}

function openStaffChat(clientId, name, panelType) {
  var panelId = panelType === 'admin' ? 'admin-staff-chat-panel' : 'staff-chat-panel'
  var titleId  = panelType === 'admin' ? 'admin-staff-chat-title' : 'staff-chat-title'
  var msgsId   = panelType === 'admin' ? 'admin-staff-chat-messages' : 'staff-chat-messages'
  var panel = document.getElementById(panelId)
  if (!panel) return
  if (panelType === 'admin') _currentAdminChatId = clientId
  else _currentStaffChatId = clientId
  document.getElementById(titleId).textContent = '💬 ' + name
  panel.style.display = 'block'
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  loadStaffChatMessages(clientId, msgsId)
}

function closeStaffChat() {
  var p = document.getElementById('staff-chat-panel')
  if (p) p.style.display = 'none'
  _currentStaffChatId = null
}
function closeAdminStaffChat() {
  var p = document.getElementById('admin-staff-chat-panel')
  if (p) p.style.display = 'none'
  _currentAdminChatId = null
}

async function loadStaffChatMessages(clientId, msgsId) {
  var wrap = document.getElementById(msgsId)
  if (!wrap) return
  wrap.innerHTML = '<p style="text-align:center;color:#aaa;font-size:13px;margin:auto 0;">Loading...</p>'
  try {
    var res = await fetch(API + '/messages/' + clientId, {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    var d = await res.json()
    var msgs = d.messages || []
    if (!msgs.length) {
      wrap.innerHTML = '<p style="text-align:center;color:#aaa;font-size:13px;margin:auto 0;">No messages yet.</p>'
      return
    }
    var myEmail = localStorage.getItem('wc_email') || ''
    wrap.innerHTML = msgs.map(function(m) {
      var isMe = m.sender_email === myEmail
      var imgHtml = m.image_url ? '<div style="margin-top:6px;"><img src="' + m.image_url + '" style="max-width:200px;max-height:200px;border-radius:8px;display:block;cursor:pointer;" onclick="window.open(this.src,\'_blank\')"></div>' : ''
      return '<div style="display:flex;' + (isMe ? 'justify-content:flex-end' : 'justify-content:flex-start') + ';margin-bottom:4px;">' +
        '<div style="max-width:78%;background:' + (isMe ? '#1a6b5a' : '#f3f4f6') + ';color:' + (isMe ? 'white' : '#111') + ';border-radius:' + (isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px') + ';padding:9px 13px;font-size:14px;line-height:1.5;">' +
        (isMe ? '' : '<div style="font-size:11px;font-weight:600;color:#1a6b5a;margin-bottom:3px;">' + (m.sender_role === 'client' ? 'Client' : m.sender_email) + '</div>') +
        (m.content || '') + imgHtml +
        '</div></div>'
    }).join('')
    wrap.scrollTop = wrap.scrollHeight
    // Refresh chat list to clear unread badge
    loadAllChats(msgsId.startsWith('admin') ? 'admin' : 'manager')
  } catch(e) {
    wrap.innerHTML = '<p style="text-align:center;color:#aaa;font-size:13px;margin:auto 0;">Could not load messages.</p>'
  }
}

function previewChatImage(input) {
  var file = input.files[0]
  if (!file) return
  var reader = new FileReader()
  reader.onload = function(e) {
    _staffChatImageData = e.target.result
    var prev = document.getElementById('staff-chat-img-preview')
    var thumb = document.getElementById('staff-chat-img-thumb')
    if (prev && thumb) { thumb.src = _staffChatImageData; prev.style.display = 'block' }
  }
  reader.readAsDataURL(file)
}
function clearChatImage() {
  _staffChatImageData = null
  var prev = document.getElementById('staff-chat-img-preview')
  var fi = document.getElementById('staff-chat-file')
  if (prev) prev.style.display = 'none'
  if (fi) fi.value = ''
}

function previewAdminChatImage(input) {
  var file = input.files[0]
  if (!file) return
  var reader = new FileReader()
  reader.onload = function(e) {
    _adminChatImageData = e.target.result
    var prev = document.getElementById('admin-staff-chat-img-preview')
    var thumb = document.getElementById('admin-staff-chat-img-thumb')
    if (prev && thumb) { thumb.src = _adminChatImageData; prev.style.display = 'block' }
  }
  reader.readAsDataURL(file)
}
function clearAdminChatImage() {
  _adminChatImageData = null
  var prev = document.getElementById('admin-staff-chat-img-preview')
  var fi = document.getElementById('admin-staff-chat-file')
  if (prev) prev.style.display = 'none'
  if (fi) fi.value = ''
}

function previewClientChatImage(input) {
  var file = input.files[0]
  if (!file) return
  var reader = new FileReader()
  reader.onload = function(e) {
    _clientChatImageData = e.target.result
    // Show a small preview below input
    var existing = document.getElementById('client-img-preview')
    if (!existing) {
      existing = document.createElement('div')
      existing.id = 'client-img-preview'
      existing.style.cssText = 'padding:6px 14px;border-top:1px solid var(--border);background:white;display:flex;align-items:center;gap:8px;'
      var chatDiv = document.querySelector('#holding-content .staff-chat-panel, #holding-content div[style*="overflow-y:auto"]')
      // Insert before the input row
      var inputRow = document.getElementById('client-chat-input')?.parentElement
      if (inputRow) inputRow.insertAdjacentElement('beforebegin', existing)
    }
    existing.innerHTML = '<img src="' + e.target.result + '" style="height:50px;border-radius:6px;object-fit:cover;"><button onclick="_clientChatImageData=null;this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:18px;">&times;</button>'
  }
  reader.readAsDataURL(file)
}

async function sendStaffChatMsg() {
  var clientId = _currentStaffChatId
  if (!clientId) return
  var inp = document.getElementById('staff-chat-input')
  var content = inp?.value.trim()
  if (!content && !_staffChatImageData) return
  if (inp) inp.value = ''
  try {
    var res = await fetch(API + '/messages/' + clientId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ content: content || '', image_url: _staffChatImageData || null })
    })
    var d = await res.json()
    if (d.message) {
      clearChatImage()
      loadStaffChatMessages(clientId, 'staff-chat-messages')
    } else alert(d.error || 'Failed to send')
  } catch(e) { alert('Could not connect to server') }
}

async function sendAdminStaffChatMsg() {
  var clientId = _currentAdminChatId
  if (!clientId) return
  var inp = document.getElementById('admin-staff-chat-input')
  var content = inp?.value.trim()
  if (!content && !_adminChatImageData) return
  if (inp) inp.value = ''
  try {
    var res = await fetch(API + '/messages/' + clientId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ content: content || '', image_url: _adminChatImageData || null })
    })
    var d = await res.json()
    if (d.message) {
      clearAdminChatImage()
      loadStaffChatMessages(clientId, 'admin-staff-chat-messages')
    } else alert(d.error || 'Failed to send')
  } catch(e) { alert('Could not connect to server') }
}

// ── DOWNLOAD BRIEF PHOTO ─────────────────────────────────
function downloadBriefPhoto(btn) {
  // Full data is stored in window._currentBriefPhotos by showBriefModal
  var filename = btn.getAttribute('data-filename')
  var photos = window._currentBriefPhotos || []
  var photo = photos.find(function(p) { return p.filename === filename })
  if (!photo) { alert('Photo data not available'); return }
  var a = document.createElement('a')
  a.href = photo.data
  a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
}

// ── ITEM 3: ADMIN CONTACT EMAILS ─────────────────────────
async function loadAdminEmails() {
  var wrap = document.getElementById('admin-emails-list')
  if (!wrap) return
  try {
    var res = await fetch(API + '/admin/stats', { headers: { 'Authorization': 'Bearer ' + getToken() } })
    var d = await res.json()
    var admins = (d.managers || []).filter(function(m) { return m.role === 'admin' || m.is_admin })
    if (!admins.length) { wrap.innerHTML = '<span style="color:var(--ink-muted);">No admin emails found</span>'; return }
    wrap.innerHTML = admins.map(function(a) {
      return '<a href="mailto:' + a.email + '" style="color:var(--accent);text-decoration:none;font-weight:500;">' + a.email + '</a>'
    }).join('<span style="color:var(--ink-muted);">&nbsp;&middot;&nbsp;</span>')
  } catch(e) { if (wrap) wrap.innerHTML = '<span style="color:var(--ink-muted);">Could not load admin contacts</span>' }
}

// ── ITEM 4: BLOCK / UNBLOCK ACCOUNT ─────────────────────
async function setBlockedById(btn) {
  var id = btn.getAttribute('data-id')
  var blocked = btn.getAttribute('data-blocked') === 'true'
  var newBlocked = !blocked
  try {
    var res = await fetch(API + '/admin/set-blocked', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ client_id: id, blocked: newBlocked })
    })
    var d = await res.json()
    if (d.message) {
      btn.setAttribute('data-blocked', String(newBlocked))
      btn.textContent = newBlocked ? '🔓 Unblock' : '🚫 Block'
      btn.style.background = newBlocked ? '#fef2f2' : ''
      btn.style.color = newBlocked ? '#ef4444' : ''
      loadAdminData()
    } else alert(d.error || 'Failed')
  } catch(e) { alert('Could not connect') }
}

// ── ITEM 2: CLAUDE AI ASSISTANT ──────────────────────────
// Per-user chat histories keyed by userId + context
var _claudeHistories = {}

function getClaudeHistory(ctx) {
  var uid = getToken() ? JSON.parse(atob(getToken().split('.')[1])).id : 'anon'
  var key = uid + '_' + ctx
  if (!_claudeHistories[key]) _claudeHistories[key] = []
  return _claudeHistories[key]
}

async function sendClaudeAI(ctx) {
  ctx = ctx || 'manager'
  var inputId = ctx === 'admin' ? 'admin-claude-ai-input' : 'claude-ai-input'
  var msgsId  = ctx === 'admin' ? 'admin-claude-chat-msgs' : 'claude-chat-msgs'
  var input = document.getElementById(inputId)
  var msgs  = document.getElementById(msgsId)
  var content = input?.value.trim()
  if (!content) return
  input.value = ''
  var history = getClaudeHistory(ctx)
  history.push({ role: 'user', content: content })
  renderClaudeChat(ctx)
  // Typing indicator
  var typing = document.createElement('div')
  typing.id = 'claude-typing-' + ctx
  typing.style.cssText = 'display:flex;align-items:center;gap:8px;color:var(--ink-muted);font-size:13px;padding:4px 0;'
  typing.innerHTML = '<div style="width:8px;height:8px;border-radius:50%;background:var(--accent);"></div>Claude is thinking...'
  if (msgs) { msgs.appendChild(typing); msgs.scrollTop = msgs.scrollHeight }
  try {
    var res = await fetch(API + '/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ messages: history })
    })
    var data = await res.json()
    var reply = data.content?.[0]?.text || (data.error ? data.error.message || JSON.stringify(data.error) : 'No response')
    history.push({ role: 'assistant', content: reply })
  } catch(e) {
    history.push({ role: 'assistant', content: 'Error connecting to AI: ' + e.message })
  }
  var t = document.getElementById('claude-typing-' + ctx)
  if (t) t.remove()
  renderClaudeChat(ctx)
}

function renderClaudeChat(ctx) {
  ctx = ctx || 'manager'
  var msgsId = ctx === 'admin' ? 'admin-claude-chat-msgs' : 'claude-chat-msgs'
  var msgs = document.getElementById(msgsId)
  if (!msgs) return
  var history = getClaudeHistory(ctx)
  msgs.innerHTML = history.map(function(m) {
    var isUser = m.role === 'user'
    // Check if response contains HTML code
    var hasHtml = !isUser && (m.content.includes('<!DOCTYPE') || m.content.includes('<html'))
    var displayContent = m.content
    var extraBtns = ''
    if (hasHtml) {
      // Extract HTML block
      var htmlMatch = m.content.match(/```html\n?([\s\S]*?)```/) || m.content.match(/(<!DOCTYPE[\s\S]*)/i)
      var htmlCode = htmlMatch ? htmlMatch[1] || htmlMatch[0] : m.content
      if (!window._lastClaudeHtml) window._lastClaudeHtml = {}
      window._lastClaudeHtml[ctx + '_html'] = htmlCode
      displayContent = m.content.replace(/```html[\s\S]*?```/g, '[HTML website code generated — see buttons below]')
      var pCtx = ctx
      extraBtns = '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">' +
        '<button onclick="previewClaudeHtml(\'' + pCtx + '\')" style="background:var(--accent);color:white;border:none;padding:6px 14px;border-radius:6px;font-family:var(--sans);font-size:12px;cursor:pointer;">👁 Preview website</button>' +
        '<button onclick="downloadClaudeHtml(\'' + pCtx + '\')" style="background:white;border:1px solid var(--border);color:var(--ink);padding:6px 14px;border-radius:6px;font-family:var(--sans);font-size:12px;cursor:pointer;">⬇️ Download HTML</button>' +
        '</div>'
    }
    return '<div style="display:flex;' + (isUser ? 'justify-content:flex-end' : 'justify-content:flex-start') + ';">' +
      '<div style="max-width:85%;background:' + (isUser ? '#1a6b5a' : 'white') + ';color:' + (isUser ? 'white' : '#111') + ';border:1px solid ' + (isUser ? 'transparent' : 'var(--border)') + ';border-radius:' + (isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px') + ';padding:10px 14px;font-size:13px;line-height:1.6;white-space:pre-wrap;">' +
      displayContent.replace(/</g,'&lt;').replace(/>/g,'&gt;') + extraBtns +
      '</div></div>'
  }).join('')
  msgs.scrollTop = msgs.scrollHeight
}

function previewClaudeHtml(ctx) {
  var key = (ctx||'manager') + '_html'
  var html = window._lastClaudeHtml && window._lastClaudeHtml[key]
  if (!html) return alert('No HTML generated yet')
  var w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
}

function downloadClaudeHtml(ctx) {
  var key = (ctx||'manager') + '_html'
  var html = window._lastClaudeHtml && window._lastClaudeHtml[key]
  if (!html) return alert('No HTML generated yet')
  var blob = new Blob([window._lastClaudeHtml], { type: 'text/html' })
  var url = URL.createObjectURL(blob)
  var a = document.createElement('a'); a.href = url; a.download = 'website.html'
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
}

// ── ITEM 7: DEMO SYSTEM ───────────────────────────────────
var _allDemos = []

async function loadDemos() {
  var wrap = document.getElementById('demos-list')
  if (!wrap) return
  // Show add demo button for admins/managers
  var adminBtns = document.getElementById('demo-admin-btns')
  if (adminBtns && ['admin','manager'].includes(getRole())) {
    adminBtns.innerHTML = '<button onclick="showAddDemoModal()" style="background:var(--accent);color:white;border:none;border-radius:var(--radius);padding:7px 14px;font-family:var(--sans);font-size:12px;font-weight:500;cursor:pointer;">+ Add demo</button>'
  }
  try {
    var res = await fetch(API + '/admin/demos', { headers: { 'Authorization': 'Bearer ' + getToken() } })
    var d = await res.json()
    _allDemos = d.demos || []
    renderDemosList()
  } catch(e) {
    wrap.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">Could not load demos.</p>'
  }
}

function renderDemosList() {
  var wrap = document.getElementById('demos-list')
  if (!wrap) return
  if (!_allDemos.length) {
    wrap.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No demos yet.' + (['admin','manager'].includes(getRole()) ? ' Click "+ Add demo" to create your first one.' : '') + '</p>'
    return
  }
  wrap.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">' +
    _allDemos.map(function(d) {
      return '<div onclick="openDemo(\'' + d.id + '\')" style="border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px;cursor:pointer;background:white;transition:box-shadow 0.2s;" onmouseenter="this.style.boxShadow=\'0 4px 16px rgba(0,0,0,0.08)\'" onmouseleave="this.style.boxShadow=\'none\'">' +
        '<div style="font-size:22px;margin-bottom:8px;">🏪</div>' +
        '<div style="font-weight:600;font-size:14px;margin-bottom:4px;">' + d.title + '</div>' +
        '<div style="font-size:12px;color:var(--ink-muted);margin-bottom:10px;">' + (d.business_type || 'General') + '</div>' +
        '<div style="font-size:12px;color:var(--accent);font-weight:500;">Click to customise & share →</div>' +
        '</div>'
    }).join('') + '</div>'
}

function openDemo(demoId) {
  var demo = _allDemos.find(function(d) { return d.id == demoId })
  if (!demo) return
  var existing = document.getElementById('demo-modal')
  if (existing) existing.remove()

  // Each open is a fresh instance - changes don't affect the master demo
  window._currentDemo     = JSON.parse(JSON.stringify(demo)) // deep copy
  window._currentDemoTier = 'basic'
  window._demoCustom      = { biz: demo.title||'', tagline: demo.description||'', color: '#1a6b5a' }

  var isStaff = ['admin','manager','contractor'].includes(getRole())
  var canDelete = ['admin','manager'].includes(getRole())

  var modal = document.createElement('div')
  modal.id = 'demo-modal'
  modal.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(15,17,23,0.75);display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto;'

  modal.innerHTML =
    '<div style="background:white;border-radius:16px;width:100%;max-width:1000px;margin:auto;box-shadow:0 24px 60px rgba(0,0,0,0.25);display:flex;flex-direction:column;">' +
    // Header
    '<div style="padding:14px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">' +
    '<div><div style="font-family:var(--serif);font-size:18px;">' + demo.title + '</div>' +
    '<div style="font-size:12px;color:var(--ink-muted);">' + (demo.business_type||'') + ' demo · Click a tier tab to preview each plan level</div></div>' +
    '<button onclick="document.getElementById(&quot;demo-modal&quot;).remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--ink-muted);">&times;</button>' +
    '</div>' +
    // Tier tabs
    '<div style="display:flex;border-bottom:1px solid var(--border);padding:0 20px;">' +
    '<button id="demo-tab-basic" onclick="setDemoTier(\'basic\')" style="padding:10px 20px;border:none;border-bottom:3px solid var(--accent);background:none;font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer;color:var(--accent);">Basic</button>' +
    '<button id="demo-tab-standard" onclick="setDemoTier(\'standard\')" style="padding:10px 20px;border:none;border-bottom:3px solid transparent;background:none;font-family:var(--sans);font-size:13px;cursor:pointer;color:var(--ink-muted);">Standard</button>' +
    '<button id="demo-tab-premium" onclick="setDemoTier(\'premium\')" style="padding:10px 20px;border:none;border-bottom:3px solid transparent;background:none;font-family:var(--sans);font-size:13px;cursor:pointer;color:var(--ink-muted);">Premium</button>' +
    '</div>' +
    // Main content area: preview + customise panel side by side
    '<div style="display:grid;grid-template-columns:1fr 280px;gap:0;flex:1;">' +
    // Preview iframe
    '<div style="border-right:1px solid var(--border);">' +
    '<iframe id="demo-preview-frame" style="width:100%;height:520px;border:none;" srcdoc=""></iframe>' +
    '</div>' +
    // Customise panel
    '<div id="demo-customise-panel" style="padding:16px;display:flex;flex-direction:column;gap:12px;overflow-y:auto;max-height:520px;">' +
    '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-muted);">Customise</div>' +
    '<div class="dash-field"><label style="font-size:12px;">Business name</label><input type="text" id="demo-biz-name" placeholder="e.g. Joe\'s Pizza" value="' + (demo.title||'') + '" oninput="updateDemoPreview()" style="padding:7px 10px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:13px;width:100%;box-sizing:border-box;"></div>' +
    '<div class="dash-field"><label style="font-size:12px;">Tagline</label><input type="text" id="demo-tagline" placeholder="e.g. Fresh, local, delicious" value="' + (demo.description||'') + '" oninput="updateDemoPreview()" style="padding:7px 10px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:13px;width:100%;box-sizing:border-box;"></div>' +
    '<div class="dash-field"><label style="font-size:12px;">Brand colour</label><div style="display:flex;gap:8px;align-items:center;"><input type="color" id="demo-brand-color" value="#1a6b5a" oninput="updateDemoPreview()" style="height:34px;border:1px solid var(--border);border-radius:var(--radius);padding:2px 4px;width:50px;"><span id="demo-color-hex" style="font-size:12px;color:var(--ink-muted);">#1a6b5a</span></div></div>' +
    // Tier description
    '<div id="demo-tier-desc" style="background:var(--cream);border-radius:var(--radius);padding:10px 12px;font-size:12px;color:var(--ink-muted);line-height:1.5;"></div>' +
    // Spacer
    '<div style="flex:1;"></div>' +
    // Share section
    '<div style="border-top:1px solid var(--border);padding-top:12px;">' +
    '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-muted);margin-bottom:8px;">Share with client</div>' +
    '<input type="email" id="demo-share-email" placeholder="client@email.com" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:13px;box-sizing:border-box;margin-bottom:8px;">' +
    '<button onclick="shareDemo(\'' + demo.id + '\')" style="width:100%;padding:10px;background:var(--accent);color:white;border:none;border-radius:var(--radius);font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer;">✉️ Send demo</button>' +
    (canDelete ? '<button onclick="deleteDemo(\'' + demo.id + '\')" style="width:100%;padding:8px;background:#fee2e2;color:#ef4444;border:1px solid #ef4444;border-radius:var(--radius);font-family:var(--sans);font-size:12px;cursor:pointer;margin-top:6px;">Delete demo</button>' : '') +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>'

  modal.onclick = function(e) { if (e.target === modal) modal.remove() }
  document.body.appendChild(modal)

  setDemoTier('basic')
}

function setDemoTier(tier) {
  window._currentDemoTier = tier
  var tabs = { basic:'demo-tab-basic', standard:'demo-tab-standard', premium:'demo-tab-premium' }
  var descs = {
    basic:    'Basic plan: 1 page (Home only), 2 photos, free subdomain. Core branding, contact info.',
    standard: 'Standard plan: Up to 4 pages, gallery, services section, custom domain.',
    premium:  'Premium plan: Unlimited pages, full gallery, testimonials, team, and local SEO so clients near you can find the business on Google.'
  }
  Object.keys(tabs).forEach(function(t) {
    var btn = document.getElementById(tabs[t])
    if (!btn) return
    btn.style.borderBottomColor = t === tier ? 'var(--accent)' : 'transparent'
    btn.style.color = t === tier ? 'var(--accent)' : 'var(--ink-muted)'
    btn.style.fontWeight = t === tier ? '600' : '400'
  })
  var desc = document.getElementById('demo-tier-desc')
  if (desc) desc.textContent = descs[tier] || ''
  updateDemoPreview()
}

function updateDemoPreview() {
  var frame = document.getElementById('demo-preview-frame')
  if (!frame) return
  var demo  = window._currentDemo || {}
  var tier  = window._currentDemoTier || 'basic'
  var biz   = document.getElementById('demo-biz-name')?.value || demo.title || 'Your Business'
  var color = document.getElementById('demo-brand-color')?.value || '#1a6b5a'
  var tagline = document.getElementById('demo-tagline')?.value || demo.description || ''
  var hexEl = document.getElementById('demo-color-hex')
  if (hexEl) hexEl.textContent = color

  // If demo has real base_html, inject customisations into it
  if (demo.base_html && demo.base_html.length > 100) {
    var html = demo.base_html
    // Replace placeholder values that the AI should have left in the HTML
    html = html.replace(/data-biz-name[^>]*>[^<]*/g, function(m){ return m.replace(/>.*/, '>' + biz) })
    html = html.replace(/\[BUSINESS_NAME\]/g, biz)
    html = html.replace(/\[TAGLINE\]/g, tagline)
    html = html.replace(/#1a6b5a/g, color)
    html = html.replace(/var\(--brand\)/g, color)
    // Show/hide tier sections if the HTML uses data-tier attributes
    // Inject a small script to switch tiers
    var tierScript = '<script>function showTier(t){document.querySelectorAll("[data-tier]").forEach(function(el){el.style.display=el.dataset.tier===t||el.dataset.tier==="all"?"":"none"});document.querySelectorAll("[data-tier-btn]").forEach(function(b){b.style.background=b.dataset.tierBtn===t?"' + color + '":"#f5f5f5";b.style.color=b.dataset.tierBtn===t?"white":"#333"})};document.addEventListener("DOMContentLoaded",function(){showTier("' + tier + '")});<\/script>'
    // Remove existing tier script if any
    html = html.replace(/<script[^>]*>function showTier[\s\S]*?<\/script>/g, '')
    html = html.replace('</head>', tierScript + '</head>')
    frame.srcdoc = html
  } else {
    // Fallback: generate basic preview
    frame.srcdoc = buildFallbackDemoHtml(biz, tagline, color, tier)
  }
}

function buildFallbackDemoHtml(biz, tagline, color, tier) {
  var nav = '<nav style="background:white;border-bottom:1px solid #eee;padding:14px 24px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:10;"><span style="font-weight:700;font-size:18px;color:' + color + ';">' + biz + '</span>' +
    (tier !== 'basic' ? '<div style="display:flex;gap:16px;font-size:13px;">' + (tier === 'standard' || tier === 'premium' ? '<a href="#" style="color:#333;text-decoration:none;">Services</a><a href="#" style="color:#333;text-decoration:none;">Gallery</a>' : '') + (tier === 'premium' ? '<a href="#" style="color:#333;text-decoration:none;">About</a><a href="#" style="color:#333;text-decoration:none;">Team</a>' : '') + '</div>' : '') +
    '<a href="#contact" style="background:' + color + ';color:white;padding:8px 18px;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">Contact</a></nav>'
  var hero = '<section style="padding:' + (tier==='premium'?'80':'60') + 'px 24px;text-align:center;background:linear-gradient(135deg,' + color + '15,white);">' +
    '<h1 style="font-size:' + (tier==='premium'?'3':'2.4') + 'rem;margin-bottom:14px;color:#111;">' + biz + '</h1>' +
    (tagline ? '<p style="font-size:1.1rem;color:#555;margin-bottom:28px;max-width:500px;margin-left:auto;margin-right:auto;">' + tagline + '</p>' : '') +
    '<a href="#contact" style="background:' + color + ';color:white;padding:13px 30px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Get started today</a></section>'
  var services = tier !== 'basic' ? '<section style="padding:60px 24px;max-width:900px;margin:0 auto;"><h2 style="text-align:center;font-size:1.8rem;margin-bottom:32px;">Our Services</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;">' + ['Our Service','Quality Work','Expert Team'].map(function(sv){ return '<div style="border:1px solid #eee;border-radius:12px;padding:22px;text-align:center;"><div style="font-size:2rem;margin-bottom:10px;color:' + color + ';">★</div><h3 style="margin-bottom:8px;">' + sv + '</h3><p style="color:#666;font-size:13px;line-height:1.5;">Professional quality every time. Your satisfaction is our priority.</p></div>' }).join('') + '</div></section>' : ''
  var gallery = tier !== 'basic' ? '<section style="background:#f8f8f8;padding:60px 24px;text-align:center;"><h2 style="font-size:1.8rem;margin-bottom:28px;">Gallery</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:700px;margin:0 auto;">' + [1,2,3,4,5,6].map(function(){ return '<div style="background:' + color + '33;border-radius:8px;aspect-ratio:1;display:flex;align-items:center;justify-content:center;color:' + color + ';font-size:28px;">📷</div>' }).join('') + '</div></section>' : ''
  var seo = tier === 'premium' ? '<section style="padding:60px 24px;max-width:800px;margin:0 auto;text-align:center;"><h2 style="font-size:1.8rem;margin-bottom:16px;">📍 Find us locally</h2><p style="color:#555;margin-bottom:8px;">This website is <strong>local SEO optimised</strong> — when people nearby search for ' + biz + ', you\'ll show up.</p><div style="background:#f0fdf4;border:1px solid #6ee7b7;border-radius:10px;padding:20px;margin-top:16px;font-size:13px;color:#065f46;">✅ Schema markup · ✅ Google-ready meta tags · ✅ Location keywords</div></section>' : ''
  var contact = '<section id="contact" style="background:' + color + ';color:white;padding:60px 24px;text-align:center;"><h2 style="font-size:1.8rem;margin-bottom:16px;">Get in touch</h2><p style="opacity:0.9;margin-bottom:24px;">Ready to work with us? We\'d love to hear from you.</p><a href="mailto:hello@' + biz.toLowerCase().replace(/[^a-z0-9]/g,'') + '.com" style="background:white;color:' + color + ';padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:600;">Contact us</a></section>'
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box;margin:0;padding:0;font-family:sans-serif}</style></head><body>' + nav + hero + services + gallery + seo + contact + '</body></html>'
}

async function shareDemo(demoId) {
  var email = document.getElementById('demo-share-email')?.value.trim()
  if (!email) return alert('Please enter a client email address')

  var biz    = document.getElementById('demo-biz-name')?.value.trim() || window._currentDemo?.title || 'Your Business'
  var color  = document.getElementById('demo-brand-color')?.value || '#1a6b5a'
  var tagline = document.getElementById('demo-tagline')?.value.trim() || ''

  // Build static snapshot for each tier (no edit widgets)
  var tierHtmls = {}
  var tiers = ['basic','standard','premium']
  tiers.forEach(function(t) {
    window._currentDemoTier = t
    tierHtmls[t] = buildFallbackDemoHtml(biz, tagline, color, t)
    // If real base_html exists use it
    var demo = window._currentDemo || {}
    if (demo.base_html && demo.base_html.length > 100) {
      var h = demo.base_html
      h = h.replace(/\[BUSINESS_NAME\]/g, biz).replace(/\[TAGLINE\]/g, tagline).replace(/#1a6b5a/g, color)
      tierHtmls[t] = h
    }
  })

  // Build the combined email HTML with tier tabs (read-only, no customise panel)
  var briefUrl = 'https://sitefloa.com?assetform=demo&email=' + encodeURIComponent(email)
  var emailHtml = buildDemoEmailHtml(biz, color, tagline, tierHtmls, briefUrl)

  var btn = document.querySelector('#demo-modal button[onclick*="shareDemo"]')
  if (btn) { btn.textContent = 'Sending...'; btn.disabled = true }

  try {
    var res = await fetch(API + '/admin/demos/' + demoId + '/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ email: email, email_html: emailHtml, business_name: biz })
    })
    var d = await res.json()
    if (d.message) {
      document.getElementById('demo-share-email').value = ''
      if (btn) { btn.textContent = '✅ Sent!'; setTimeout(function(){ btn.textContent = '✉️ Send demo'; btn.disabled = false }, 3000) }
    } else {
      alert(d.error || 'Failed to share')
      if (btn) { btn.textContent = '✉️ Send demo'; btn.disabled = false }
    }
  } catch(e) {
    alert('Could not connect')
    if (btn) { btn.textContent = '✉️ Send demo'; btn.disabled = false }
  }
}

function buildDemoEmailHtml(biz, color, tagline, tierHtmls, briefUrl) {
  // Build a self-contained email with tier tabs and a static demo view
  var escapedBasic    = (tierHtmls.basic    || '').replace(/`/g, '\\`').replace(/\\/g, '\\\\').substring(0, 50000)
  var escapedStandard = (tierHtmls.standard || '').replace(/`/g, '\\`').replace(/\\/g, '\\\\').substring(0, 50000)
  var escapedPremium  = (tierHtmls.premium  || '').replace(/`/g, '\\`').replace(/\\/g, '\\\\').substring(0, 50000)
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{box-sizing:border-box;margin:0;padding:0;font-family:sans-serif}body{background:#f5f5f5}.wrapper{max-width:700px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12)}.header{background:${color};color:white;padding:28px 32px;text-align:center}.header h1{font-size:24px;margin-bottom:8px}.header p{opacity:0.9;font-size:15px}.tabs{display:flex;border-bottom:2px solid #eee;background:white}.tab-btn{flex:1;padding:14px;border:none;background:none;cursor:pointer;font-size:14px;font-weight:600;color:#999;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all 0.2s}.tab-btn.active{color:${color};border-bottom-color:${color}}.tier-desc{background:#f8f8f8;padding:10px 20px;font-size:13px;color:#666;text-align:center}.demo-frame{border:none;width:100%;height:500px}.cta{padding:32px;text-align:center;background:#f9f9f9}.cta h2{font-size:20px;margin-bottom:10px;color:#111}.cta p{color:#666;margin-bottom:20px;font-size:14px;line-height:1.6}.cta-btn{display:inline-block;background:${color};color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px}.footer{padding:20px;text-align:center;font-size:12px;color:#999}</style>
</head><body>
<div class="wrapper">
  <div class="header"><h1>🎨 Your website demo is ready!</h1><p>Here's a preview of what your ${biz} website could look like</p></div>
  <div class="tabs">
    <button class="tab-btn active" onclick="showTab('basic',this)">Basic</button>
    <button class="tab-btn" onclick="showTab('standard',this)">Standard</button>
    <button class="tab-btn" onclick="showTab('premium',this)">Premium</button>
  </div>
  <div id="desc-basic" class="tier-desc">Basic plan — 1 page, free subdomain, core branding</div>
  <div id="desc-standard" class="tier-desc" style="display:none;">Standard plan — 4 pages, gallery, services, custom domain</div>
  <div id="desc-premium" class="tier-desc" style="display:none;">Premium plan — unlimited pages, local SEO, testimonials &amp; more</div>
  <iframe id="frame-basic" class="demo-frame" srcdoc="" frameborder="0"></iframe>
  <iframe id="frame-standard" class="demo-frame" srcdoc="" style="display:none;" frameborder="0"></iframe>
  <iframe id="frame-premium" class="demo-frame" srcdoc="" style="display:none;" frameborder="0"></iframe>
  <div class="cta">
    <h2>Like what you see?</h2>
    <p>Fill out a quick brief form to get started on your real website. It only takes a few minutes and our team will be in touch within one business day.</p>
    <a href="${briefUrl}" class="cta-btn">✅ I'm interested — get started →</a>
    <p style="margin-top:16px;font-size:13px;color:#888;">Or visit us at <a href="https://sitefloa.com" style="color:${color};">sitefloa.com</a> to learn more about what we offer.</p>
  </div>
  <div class="footer">This demo was created specifically for you by the Sitefloa team. · <a href="https://sitefloa.com" style="color:${color};">sitefloa.com</a></div>
</div>
<script>
var tiers = {
  basic: ${JSON.stringify(escapedBasic)},
  standard: ${JSON.stringify(escapedStandard)},
  premium: ${JSON.stringify(escapedPremium)}
}
Object.keys(tiers).forEach(function(t){
  var f = document.getElementById('frame-'+t)
  if(f) f.srcdoc = tiers[t]
})
function showTab(t, btn){
  ['basic','standard','premium'].forEach(function(tier){
    document.getElementById('frame-'+tier).style.display = tier===t ? '' : 'none'
    document.getElementById('desc-'+tier).style.display = tier===t ? '' : 'none'
  })
  document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active')})
  btn.classList.add('active')
}
</script>
</body></html>`
}

async function deleteDemo(demoId) {
  try {
    var res = await fetch(API + '/admin/demos/' + demoId, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    var d = await res.json()
    if (d.message) { document.getElementById('demo-modal').remove(); loadDemos(); loadAdminDemos() }
    else alert(d.error || 'Failed')
  } catch(e) { alert('Could not connect') }
}


function showAddDemoModal() {
  var ex = document.getElementById('add-demo-modal'); if (ex) ex.remove()
  var modal = document.createElement('div')
  modal.id = 'add-demo-modal'
  modal.style.cssText = 'position:fixed;inset:0;z-index:600;background:rgba(15,17,23,0.7);display:flex;align-items:center;justify-content:center;padding:16px;'
  modal.innerHTML =
    '<div style="background:white;border-radius:16px;width:100%;max-width:540px;padding:28px;box-shadow:0 24px 60px rgba(0,0,0,0.2);max-height:92vh;overflow-y:auto;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">' +
    '<div style="font-family:var(--serif);font-size:20px;">Add new demo</div>' +
    '<button onclick="document.getElementById(&quot;add-demo-modal&quot;).remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--ink-muted);">&times;</button>' +
    '</div>' +
    '<div style="display:grid;gap:12px;">' +
    '<div class="dash-field"><label>Demo title *</label><input type="text" id="nd-title" placeholder="e.g. Restaurant & Cafe"></div>' +
    '<div class="dash-field"><label>Business type</label><input type="text" id="nd-type" placeholder="e.g. Food & Beverage"></div>' +
    '<div class="dash-field"><label>Description</label><input type="text" id="nd-desc" placeholder="Short description shown on the demo card"></div>' +
    '<div class="dash-field"><label>AI build prompt</label><textarea id="nd-prompt" rows="5" placeholder="Paste the Claude prompt for building this type of website..."></textarea></div>' +
    '</div>' +
    '<div style="display:flex;gap:10px;margin-top:18px;">' +
    '<button onclick="submitAddDemo()" style="flex:1;padding:12px;background:var(--accent);color:white;border:none;border-radius:var(--radius);font-family:var(--sans);font-size:14px;font-weight:500;cursor:pointer;">Add demo</button>' +
    '<button onclick="document.getElementById(&quot;add-demo-modal&quot;).remove()" style="padding:12px 18px;background:var(--cream);border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:14px;cursor:pointer;">Cancel</button>' +
    '</div></div>'
  modal.onclick = function(e) { if (e.target === modal) modal.remove() }
  document.body.appendChild(modal)
}

async function submitAddDemo() {
  var title = document.getElementById('nd-title')?.value.trim()
  if (!title) return alert('Please enter a title')
  try {
    var res = await fetch(API + '/admin/demos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({
        title: title,
        business_type: document.getElementById('nd-type')?.value || '',
        description: document.getElementById('nd-desc')?.value || '',
        prompt: document.getElementById('nd-prompt')?.value || ''
      })
    })
    var d = await res.json()
    if (d.demo) { document.getElementById('add-demo-modal').remove(); loadDemos() }
    else alert(d.error || 'Failed')
  } catch(e) { alert('Could not connect') }
}

// ── ITEM 8: Update showSalesGuide to include demo step ───
// Already in the guide at step 2 — update it
function updateSalesGuideDemo() {
  // This updates the guide when it's next opened — no action needed now
  // The guide already mentions showing demos in step 2
}

// ── ADMIN DEMOS (mirrors loadDemos but for admin page) ────
async function loadAdminDemos() {
  var wrap = document.getElementById('admin-demos-list')
  if (!wrap) return
  var adminBtns = document.getElementById('admin-demo-btns')
  if (adminBtns) {
    adminBtns.innerHTML =
      '<button onclick="copyDemoPromptTemplate()" style="background:white;border:1px solid var(--border);border-radius:var(--radius);padding:7px 14px;font-family:var(--sans);font-size:12px;cursor:pointer;">📋 Copy build template</button>' +
      '<button onclick="showAddDemoModal()" style="background:var(--accent);color:white;border:none;border-radius:var(--radius);padding:7px 14px;font-family:var(--sans);font-size:12px;font-weight:500;cursor:pointer;margin-left:6px;">+ Add demo</button>'
  }
  try {
    var res = await fetch(API + '/admin/demos', { headers: { 'Authorization': 'Bearer ' + getToken() } })
    var d = await res.json()
    _allDemos = d.demos || []
    if (!_allDemos.length) {
      wrap.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No demos yet. Click "+ Add demo" to create the first one.</p>'
      return
    }
    wrap.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;">' +
      _allDemos.map(function(d) {
        return '<div onclick="openDemo(\'' + d.id + '\')" style="border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px;cursor:pointer;background:white;transition:box-shadow 0.2s;" onmouseenter="this.style.boxShadow=\'0 4px 16px rgba(0,0,0,0.08)\'" onmouseleave="this.style.boxShadow=\'none\'">' +
          '<div style="font-size:20px;margin-bottom:6px;">🏪</div>' +
          '<div style="font-weight:600;font-size:13px;margin-bottom:3px;">' + d.title + '</div>' +
          '<div style="font-size:11px;color:var(--ink-muted);">' + (d.business_type || 'General') + '</div>' +
          '</div>'
      }).join('') + '</div>'
  } catch(e) {
    wrap.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">Could not load demos.</p>'
  }
}

// Also update mgr demo admin btns to include copy template
var _origLoadDemos = loadDemos
loadDemos = async function() {
  await _origLoadDemos()
  var adminBtns = document.getElementById('demo-admin-btns')
  if (adminBtns && ['admin','manager'].includes(getRole()) && !adminBtns.querySelector('button[onclick*="copyDemo"]')) {
    adminBtns.innerHTML =
      '<button onclick="copyDemoPromptTemplate()" style="background:white;border:1px solid var(--border);border-radius:var(--radius);padding:7px 14px;font-family:var(--sans);font-size:12px;cursor:pointer;margin-right:6px;">📋 Copy build template</button>' +
      '<button onclick="showAddDemoModal()" style="background:var(--accent);color:white;border:none;border-radius:var(--radius);padding:7px 14px;font-family:var(--sans);font-size:12px;font-weight:500;cursor:pointer;">+ Add demo</button>'
  }
}

// ── DEMO PROMPT TEMPLATE ─────────────────────────────────
function copyDemoPromptTemplate() {
  var ex = document.getElementById('demo-template-modal')
  if (ex) ex.remove()

  var modal = document.createElement('div')
  modal.id = 'demo-template-modal'
  modal.style.cssText = 'position:fixed;inset:0;z-index:600;background:rgba(15,17,23,0.75);display:flex;align-items:center;justify-content:center;padding:16px;'
  modal.innerHTML =
    '<div style="background:white;border-radius:16px;width:100%;max-width:600px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,0.25);">' +
    // Header
    '<div style="padding:18px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">' +
    '<div><div style="font-family:var(--serif);font-size:20px;">📋 Build a demo prompt</div>' +
    '<div style="font-size:13px;color:var(--ink-muted);margin-top:2px;">Fill in the details and copy the prompt into the AI builder</div></div>' +
    '<button onclick="document.getElementById(&quot;demo-template-modal&quot;).remove()" style="background:none;border:none;font-size:24px;cursor:pointer;color:var(--ink-muted);">&times;</button>' +
    '</div>' +
    // Form
    '<div style="overflow-y:auto;padding:20px 24px;display:grid;gap:14px;">' +
    '<div class="dash-field"><label>Business name *</label><input id="dt-biz" type="text" placeholder="e.g. The Corner Cafe"></div>' +
    '<div class="dash-field"><label>Business type *</label><input id="dt-type" type="text" placeholder="e.g. Cafe &amp; Coffee Shop"></div>' +
    '<div class="dash-field"><label>Tagline</label><input id="dt-tagline" type="text" placeholder="e.g. Great coffee, great vibes"></div>' +
    '<div class="dash-field"><label>About / description</label><textarea id="dt-about" rows="2" placeholder="A short sentence about what makes this business special..."></textarea></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div class="dash-field"><label>Brand colour</label><div style="display:flex;gap:8px;align-items:center;"><input type="color" id="dt-color" value="#1a6b5a" style="height:38px;border:1px solid var(--border);border-radius:var(--radius);padding:2px 4px;width:60px;"><span id="dt-color-hex" style="font-size:13px;color:var(--ink-muted);">#1a6b5a</span></div></div>' +
    '<div class="dash-field"><label>Design style</label><select id="dt-style" style="padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:13px;"><option value="modern and clean">Modern &amp; clean</option><option value="warm and rustic">Warm &amp; rustic</option><option value="bold and vibrant">Bold &amp; vibrant</option><option value="minimal and elegant">Minimal &amp; elegant</option><option value="professional and corporate">Professional &amp; corporate</option><option value="fun and playful">Fun &amp; playful</option></select></div>' +
    '</div>' +
    '<div class="dash-field"><label>Services / menu items (one per line)</label><textarea id="dt-services" rows="3" placeholder="Coffee &amp; espresso drinks&#10;Freshly baked pastries&#10;Breakfast &amp; lunch menu"></textarea></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div class="dash-field"><label>Phone</label><input id="dt-phone" type="tel" placeholder="(555) 123-4567"></div>' +
    '<div class="dash-field"><label>Address</label><input id="dt-address" type="text" placeholder="123 Main St, City"></div>' +
    '</div>' +
    '<div class="dash-field"><label>Business hours</label><input id="dt-hours" type="text" placeholder="e.g. Mon-Fri 7am-5pm, Sat 8am-3pm, Sun Closed"></div>' +
    // Output preview
    '<div style="background:#1a1a2e;border-radius:10px;padding:14px;">' +
    '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6ee7b7;margin-bottom:8px;">Generated prompt preview</div>' +
    '<pre id="dt-preview" style="color:#e8e8e8;font-size:11px;white-space:pre-wrap;word-break:break-word;margin:0;line-height:1.6;max-height:200px;overflow-y:auto;"></pre>' +
    '</div>' +
    '</div>' +
    // Footer
    '<div style="padding:16px 24px;border-top:1px solid var(--border);display:flex;gap:10px;flex-shrink:0;">' +
    '<button onclick="copyGeneratedDemoPrompt()" style="flex:1;padding:12px;background:var(--accent);color:white;border:none;border-radius:var(--radius);font-family:var(--sans);font-size:14px;font-weight:600;cursor:pointer;">📋 Copy prompt</button>' +
    '<button onclick="sendToDemoBuilder()" style="flex:1;padding:12px;background:#7c3aed;color:white;border:none;border-radius:var(--radius);font-family:var(--sans);font-size:14px;font-weight:600;cursor:pointer;">🤖 Send to AI builder</button>' +
    '<button onclick="document.getElementById(&quot;demo-template-modal&quot;).remove()" style="padding:12px 18px;background:var(--cream);border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:14px;cursor:pointer;">Cancel</button>' +
    '</div></div>'

  modal.onclick = function(e) { if (e.target === modal) modal.remove() }
  document.body.appendChild(modal)

  // Live preview update
  function updatePreview() {
    document.getElementById('dt-color-hex').textContent = document.getElementById('dt-color').value
    var p = document.getElementById('dt-preview')
    if (p) p.textContent = buildDemoPromptText()
  }
  document.getElementById('dt-color').addEventListener('input', updatePreview)
  ;['dt-biz','dt-type','dt-tagline','dt-about','dt-style','dt-services','dt-phone','dt-address','dt-hours'].forEach(function(id) {
    var el = document.getElementById(id)
    if (el) el.addEventListener('input', updatePreview)
  })
  updatePreview()
}

function buildDemoPromptText() {
  var biz      = document.getElementById('dt-biz')?.value.trim()      || '[BUSINESS NAME]'
  var type     = document.getElementById('dt-type')?.value.trim()     || '[BUSINESS TYPE]'
  var tagline  = document.getElementById('dt-tagline')?.value.trim()  || '[TAGLINE]'
  var about    = document.getElementById('dt-about')?.value.trim()    || '[SHORT ABOUT TEXT]'
  var color    = document.getElementById('dt-color')?.value           || '#1a6b5a'
  var style    = document.getElementById('dt-style')?.value           || 'modern and clean'
  var rawSvcs  = document.getElementById('dt-services')?.value.trim() || ''
  var services = rawSvcs ? rawSvcs.split('\n').filter(Boolean).map(function(s){ return '"' + s.trim() + '"' }).join(', ') : '"Service 1", "Service 2", "Service 3"'
  var phone    = document.getElementById('dt-phone')?.value.trim()    || '[PHONE]'
  var address  = document.getElementById('dt-address')?.value.trim()  || '[ADDRESS]'
  var hours    = document.getElementById('dt-hours')?.value.trim()    || 'Mon-Fri 9am-5pm, Sat 10am-3pm, Sun Closed'
  var slug     = biz.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')

  return 'Build a complete demo website for a ' + type + ' called "' + biz + '".\n' +
'\n' +
'IMPORTANT — this demo will be opened by staff who will customise it before sending to clients.\n' +
'Use these exact placeholder strings so customisation works:\n' +
'  [BUSINESS_NAME] — replaced with the actual business name\n' +
'  [TAGLINE]       — replaced with their tagline\n' +
'  #1a6b5a         — the brand colour (will be swapped out)\n' +
'\n' +
'BUSINESS DETAILS:\n' +
'- Type: ' + type + '\n' +
'- Name: ' + biz + '\n' +
'- Tagline: ' + tagline + '\n' +
'- About: ' + about + '\n' +
'- Services: ' + services + '\n' +
'- Phone: ' + phone + '\n' +
'- Address: ' + address + '\n' +
'- Hours: ' + hours + '\n' +
'\n' +
'BUILD ALL 3 TIERS in one HTML file using data-tier attributes:\n' +
'\n' +
'Each section that belongs to a specific tier should have:\n' +
'  data-tier="basic"    — only shows on Basic\n' +
'  data-tier="standard" — only shows on Standard\n' +
'  data-tier="premium"  — only shows on Premium\n' +
'  data-tier="all"      — shows on all tiers (e.g. nav, hero, footer)\n' +
'\n' +
'Add 3 tier tab buttons at the top:\n' +
'  <button data-tier-btn="basic" onclick="showTier(\'basic\')">Basic</button>\n' +
'  <button data-tier-btn="standard" onclick="showTier(\'standard\')">Standard</button>\n' +
'  <button data-tier-btn="premium" onclick="showTier(\'premium\')">Premium</button>\n' +
'\n' +
'Include this JS for tier switching:\n' +
'function showTier(t){\n' +
'  document.querySelectorAll("[data-tier]").forEach(function(el){\n' +
'    el.style.display=(el.dataset.tier===t||el.dataset.tier==="all")?"":"none"\n' +
'  });\n' +
'  document.querySelectorAll("[data-tier-btn]").forEach(function(b){\n' +
'    b.style.background=b.dataset.tierBtn===t?"#1a6b5a":"#f5f5f5";\n' +
'    b.style.color=b.dataset.tierBtn===t?"white":"#333"\n' +
'  })\n' +
'}\n' +
'document.addEventListener("DOMContentLoaded",function(){showTier("basic")})\n' +
'\n' +
'TIER CONTENT REQUIREMENTS:\n' +
'Basic    — Nav + Hero + Contact section only. 1 page feel.\n' +
'Standard — Adds: Services section (3 items), photo gallery grid, about section.\n' +
'Premium  — Adds: Testimonials, team section, local SEO section with schema markup, unlimited pages nav.\n' +
'\n' +
'DESIGN: ' + style + ' aesthetic. Primary colour: ' + color + '.\n' +
'Use ' + color + ' for CTAs, nav accents, headings.\n' +
'\n' +
'SINGLE self-contained HTML file. All CSS inline in <style> tags. All JS inline in <script> tags.\n' +
'Make it look like a REAL finished professional website — not a wireframe or mockup.\n' +
'Use realistic placeholder copy based on the business type — no Lorem Ipsum.\n' +
'Use picsum.photos or coloured divs for image placeholders.\n' +
'\n' +
'OUTPUT: Just the complete HTML — nothing else.'
}

function copyGeneratedDemoPrompt() {
  var text = buildDemoPromptText()
  navigator.clipboard.writeText(text).then(function() {
    var btn = document.querySelector('#demo-template-modal button[onclick*="copyGenerated"]')
    if (btn) { btn.textContent = '✅ Copied!'; setTimeout(function(){ btn.textContent = '📋 Copy prompt' }, 2000) }
  }).catch(function() { alert('Could not copy — please select and copy the text from the preview manually') })
}

function sendToDemoBuilder() {
  var text = buildDemoPromptText()
  document.getElementById('demo-template-modal').remove()
  // Try admin input first, then manager
  var input = document.getElementById('admin-claude-ai-input') || document.getElementById('claude-ai-input')
  if (input) {
    input.value = text
    input.focus()
    input.scrollIntoView({ behavior: 'smooth', block: 'center' })
  } else {
    navigator.clipboard.writeText(text).then(function(){
      alert('Prompt copied! Scroll to the AI Website Builder and paste it.')
    })
  }
}

// ── ITEM 1: AI MONITORING ─────────────────────────────────
// Store all contractor histories so managers can view them
var _allContractorHistories = {}

async function loadAllContractorAIHistories() {
  // Managers can see all contractor chat histories via the shared object
  // In a real production system this would be stored server-side
  // For now: show a panel below the AI builder with each contractor's history
  var wrap = document.getElementById('claude-chat-msgs')
  if (!wrap) return
  // Add a manager monitor panel after the AI builder
  var existing = document.getElementById('mgr-ai-monitor')
  if (existing) return
  var panel = document.createElement('div')
  panel.id = 'mgr-ai-monitor'
  panel.style.cssText = 'margin-top:12px;border:1px solid #fcd34d;border-radius:var(--radius-lg);overflow:hidden;'
  panel.innerHTML = '<div style="background:#fff8e6;padding:12px 16px;font-weight:600;font-size:13px;color:#92400e;display:flex;justify-content:space-between;align-items:center;">' +
    '<span>👁 AI usage monitor — all contractor sessions</span>' +
    '<button onclick="refreshAIMonitor()" style="background:none;border:1px solid #fcd34d;border-radius:6px;padding:3px 10px;font-size:12px;cursor:pointer;color:#92400e;">Refresh</button>' +
    '</div>' +
    '<div id="mgr-ai-monitor-content" style="padding:14px;font-size:13px;color:var(--ink-muted);">No contractor AI sessions recorded yet this session.</div>'
  var aiSection = wrap.closest('.admin-section')
  if (aiSection) aiSection.appendChild(panel)
  refreshAIMonitor()
}

function refreshAIMonitor() {
  var content = document.getElementById('mgr-ai-monitor-content')
  if (!content) return
  var entries = Object.keys(_allContractorHistories)
  if (!entries.length) {
    content.innerHTML = '<p style="color:var(--ink-muted);">No contractor AI sessions recorded yet this session.</p>'
    return
  }
  content.innerHTML = entries.map(function(key) {
    var hist = _allContractorHistories[key]
    var [uid, ctx] = key.split('_')
    return '<div style="border-bottom:1px solid var(--border);padding:10px 0;">' +
      '<div style="font-weight:600;font-size:12px;margin-bottom:6px;color:var(--ink);">User: ' + (uid || 'unknown') + ' · Context: ' + ctx + '</div>' +
      hist.map(function(m) {
        return '<div style="margin-bottom:4px;"><span style="font-size:11px;font-weight:700;color:' + (m.role==='user'?'#7c3aed':'#1a6b5a') + ';">' + m.role.toUpperCase() + ':</span> <span style="font-size:12px;">' + (m.content||'').substring(0,200) + (m.content&&m.content.length>200?'...':'') + '</span></div>'
      }).join('') +
      '</div>'
  }).join('')
}

// Override getClaudeHistory to also copy to shared monitor object
var _origGetHistory = getClaudeHistory
getClaudeHistory = function(ctx) {
  var hist = _origGetHistory(ctx)
  var uid = getToken() ? JSON.parse(atob(getToken().split('.')[1])).id : 'anon'
  var key = uid + '_' + ctx
  _allContractorHistories[key] = hist
  return hist
}

// ── ITEM 2: MANAGER CREATES CONTRACTOR CODES ─────────────
async function loadContractorCodes() {
  var wrap = document.getElementById('mgr-contractor-codes-list')
  if (!wrap) return
  try {
    var res = await fetch(API + '/admin/codes', {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    var d = await res.json()
    var codes = (d.codes || []).filter(function(c) { return c.role === 'contractor' || !c.role })
    if (!codes.length) { wrap.innerHTML = '<p style="color:var(--ink-muted);">No contractor codes yet.</p>'; return }
    wrap.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:8px;">' +
      codes.map(function(c) {
        return '<div style="background:var(--cream);border:1px solid var(--border);border-radius:8px;padding:8px 14px;font-size:13px;">' +
          '<span style="font-weight:600;">' + c.code + '</span>' +
          '<span style="color:var(--ink-muted);margin-left:8px;font-size:11px;">' + (c.used_by ? 'Used' : 'Available') + '</span>' +
          '</div>'
      }).join('') + '</div>'
  } catch(e) { wrap.innerHTML = '<p style="color:var(--ink-muted);">Could not load codes.</p>' }
}

async function createContractorCodeMgr() {
  var code = document.getElementById('mgr-new-contractor-code')?.value.trim()
  if (!code) return alert('Please enter a code')
  try {
    var res = await fetch(API + '/admin/create-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ code: code, role: 'contractor' })
    })
    var d = await res.json()
    if (d.message) {
      document.getElementById('mgr-new-contractor-code').value = ''
      loadContractorCodes()
    } else alert(d.error || 'Failed')
  } catch(e) { alert('Could not connect') }
}

// ── ITEM 3: MANAGER STAFF PERFORMANCE ────────────────────
async function loadMgrStaffPerf() {
  var wrap = document.getElementById('mgr-staff-perf-list')
  if (!wrap) return
  try {
    var res = await fetch(API + '/admin/stats', {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    var d = await res.json()
    var contractors = (d.managers || []).filter(function(m) { return m.role === 'contractor' })
    if (!contractors.length) { wrap.innerHTML = '<p style="color:var(--ink-muted);">No contractors yet.</p>'; return }
    wrap.innerHTML = '<div style="display:grid;gap:8px;">' +
      contractors.map(function(c) {
        return '<div style="border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 18px;background:white;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">' +
          '<div>' +
          '<div style="font-weight:600;font-size:14px;">' + c.email + '</div>' +
          '<div style="font-size:12px;color:var(--ink-muted);margin-top:2px;">Commission: ' + (c.commission_rate||10) + '%</div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">' +
          '<div style="text-align:center;background:var(--cream);border-radius:8px;padding:8px 12px;"><div style="font-size:18px;font-weight:700;">' + (c.websites_all_time||0) + '</div><div style="font-size:10px;color:var(--ink-muted);">Total clients</div></div>' +
          '<div style="text-align:center;background:var(--cream);border-radius:8px;padding:8px 12px;"><div style="font-size:18px;font-weight:700;">' + (c.briefs_sent||0) + '</div><div style="font-size:10px;color:var(--ink-muted);">Total briefs</div></div>' +
          '<div style="text-align:center;background:#e8f4f1;border:1px solid var(--accent);border-radius:8px;padding:8px 12px;"><div style="font-size:18px;font-weight:700;color:var(--accent);">' + (c.websites_created||0) + '</div><div style="font-size:10px;color:var(--accent);">This period</div></div>' +
          '<div style="text-align:center;background:#ede9ff;border:1px solid #c4b5fd;border-radius:8px;padding:8px 12px;"><div style="font-size:18px;font-weight:700;color:#7c3aed;">$' + Math.round((c.total_brought_in||0)*(c.commission_rate||10)/100) + '</div><div style="font-size:10px;color:#7c3aed;">Commission</div></div>' +
          '</div>' +
          '<div style="display:flex;gap:6px;">' +
          '<button class="action-btn" data-id="' + c.id + '" data-blocked="' + (c.is_blocked?'true':'false') + '" onclick="setBlockedById(this)">' + (c.is_blocked?'🔓 Unblock':'🚫 Block') + '</button>' +
          '</div>' +
          '</div>'
      }).join('') + '</div>'
  } catch(e) { wrap.innerHTML = '<p style="color:var(--ink-muted);">Could not load contractor data.</p>' }
}

// ── ITEM 2: MANAGER ALL CLIENTS ───────────────────────────
async function loadMgrAllClients() {
  var tbody = document.getElementById('mgr-all-clients-body')
  if (!tbody) return
  try {
    var res = await fetch(API + '/admin/stats', {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    var d = await res.json()
    var clients = (d.clients || []).filter(function(c) { return c.role === 'client' || !c.is_admin })
    renderClientsTableTo(clients, 'mgr-all-clients-body')
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--ink-muted);padding:32px;">Could not load clients.</td></tr>'
  }
}

// Renders clients to any tbody id — reuses renderClientsTable logic
function renderClientsTableTo(clients, tbodyId) {
  var tbody = document.getElementById(tbodyId)
  if (!tbody) return
  if (!clients.length) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--ink-muted);padding:32px;">No clients yet.</td></tr>'
    return
  }
  tbody.innerHTML = clients.map(function(c) {
    var statusHtml = buildClientStatus(c)
    var rowStyle = c.subscription_status === 'suspended' ? 'style="background:#fff1f1;"' : ''
    return '<tr ' + rowStyle + '>' +
      '<td><button class="action-btn" onclick="toggleMgrDetail(\'' + c.id + '\')" style="padding:4px 8px;">▼</button></td>' +
      '<td>' + (c.email||'') + '</td>' +
      '<td>' + (c.business_name||'<span style="color:var(--ink-muted);">Not set</span>') + '</td>' +
      '<td><span class="plan-badge ' + (c.plan||'standard') + '">' + (c.plan||'standard').toUpperCase() + '</span></td>' +
      '<td>' + statusHtml + '</td>' +
      '<td>$' + (c.setup_fee||0) + '</td>' +
      '<td>$' + (c.monthly_fee||0) + '/mo</td>' +
      '<td style="font-size:12px;color:var(--ink-muted);">' + (c.created_by_email||'—') + '</td>' +
      '<td style="font-size:12px;">' + (c.created_at ? new Date(c.created_at).toLocaleDateString('en-CA') : '—') + '</td>' +
      '<td style="display:flex;gap:4px;flex-wrap:wrap;">' +
      '<button class="action-btn" onclick="transferClient(\'' + c.id + '\')">Transfer</button>' +
      '</td></tr>' +
      '<tr id="mgr-detail-' + c.id + '" style="display:none;"><td colspan="10" style="padding:0;">' +
      '<div style="padding:16px 20px;background:var(--cream);border-top:1px solid var(--border);">' +
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px;">' +
      '<div><div class="detail-label">Email</div><div class="detail-val">' + c.email + '</div></div>' +
      '<div><div class="detail-label">Subdomain</div><div class="detail-val">' + (c.subdomain||'—') + '</div></div>' +
      '<div><div class="detail-label">Plan</div><div class="detail-val">' + (c.plan||'standard') + '</div></div>' +
      '<div><div class="detail-label">Status</div><div class="detail-val">' + (c.subscription_status||'—') + '</div></div>' +
      '</div>' +
      '<div style="margin-bottom:10px;">' +
      '<label style="font-size:12px;font-weight:600;color:var(--ink-muted);">Domain name</label>' +
      '<div style="display:flex;gap:6px;margin-top:4px;">' +
      '<input type="text" id="mgr-dn-' + c.id + '" value="' + (c.domain_name||'') + '" placeholder="e.g. mybusiness.com" style="padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:13px;width:160px;">' +
      '<input type="number" id="mgr-dc-' + c.id + '" value="' + (c.domain_cost||'') + '" placeholder="Setup $" style="padding:6px 8px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:13px;width:80px;">' +
      '<input type="number" id="mgr-dy-' + c.id + '" value="' + (c.domain_yearly_fee||'') + '" placeholder="$/yr" style="padding:6px 8px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:13px;width:70px;">' +
      '<button class="dash-save" onclick="saveMgrClientDomain(\'' + c.id + '\')" style="padding:7px 12px;font-size:12px;">Save domain</button>' +
      '</div></div>' +
      '</div></td></tr>'
  }).join('')
}

function toggleMgrDetail(id) {
  var row = document.getElementById('mgr-detail-' + id)
  if (row) row.style.display = row.style.display === 'none' ? '' : 'none'
}

async function saveMgrClientDomain(clientId) {
  var domain = document.getElementById('mgr-dn-' + clientId)?.value.trim() || ''
  var cost   = parseFloat(document.getElementById('mgr-dc-' + clientId)?.value) || 0
  var yearly = parseFloat(document.getElementById('mgr-dy-' + clientId)?.value) || 0
  try {
    var res = await fetch(API + '/admin/update-domain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ client_id: clientId, domain_name: domain, domain_cost: cost, domain_yearly_fee: yearly })
    })
    var d = await res.json()
    if (d.message) loadMgrAllClients()
    else alert(d.error || 'Failed')
  } catch(e) { alert('Could not connect') }
}

// ── ITEM 5 & 6: DEMO SYSTEM IMPROVEMENTS ─────────────────
// Fix openDemo to hide add/template for contractors
var _origOpenDemo = openDemo
openDemo = function(demoId) {
  _origOpenDemo(demoId)
  // After modal opens, hide delete for contractors
  setTimeout(function() {
    var delBtn = document.querySelector('#demo-modal button[onclick*="deleteDemo"]')
    if (delBtn && getRole() === 'contractor') delBtn.style.display = 'none'
  }, 50)
}

// ── COOKIE CONSENT ────────────────────────────────────────
(function(){
  if (localStorage.getItem('cookie_consent')) return
  window.addEventListener('load', function() {
    var banner = document.getElementById('cookie-banner')
    if (banner) { banner.style.display = 'flex'; banner.style.removeProperty('display') }
    // Actually show it
    setTimeout(function(){
      var b = document.getElementById('cookie-banner')
      if (b) b.style.display = 'flex'
    }, 1500)
  })
})()
function acceptCookies() {
  localStorage.setItem('cookie_consent', 'all')
  var b = document.getElementById('cookie-banner')
  if (b) b.style.display = 'none'
}
function declineCookies() {
  localStorage.setItem('cookie_consent', 'essential')
  var b = document.getElementById('cookie-banner')
  if (b) b.style.display = 'none'
}

// ── UNREAD CHAT DOTS FOR CONTRACTOR ──────────────────────
async function loadUnreadChatDots() {
  if (getRole() !== 'contractor') return
  try {
    var res = await fetch(API + '/admin/all-chats', {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    var d = await res.json()
    var chats = d.chats || []
    var myEmail = localStorage.getItem('wc_email') || ''
    var mine = chats.filter(function(c) { return c.contractor_email === myEmail })
    var totalUnread = mine.reduce(function(sum, c) { return sum + (c.unread || 0) }, 0)
    // Find the chats section header and add a dot
    var chatHeaders = document.querySelectorAll('#mgr-chats-list')
    chatHeaders.forEach(function(el) {
      var section = el.closest('.admin-section')
      if (!section) return
      var h3 = section.querySelector('h3')
      if (!h3) return
      var existing = h3.querySelector('.chat-unread-dot')
      if (existing) existing.remove()
      if (totalUnread > 0) {
        var dot = document.createElement('span')
        dot.className = 'chat-unread-dot'
        dot.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;background:#ef4444;color:white;border-radius:12px;padding:1px 7px;font-size:11px;font-weight:700;margin-left:8px;'
        dot.textContent = totalUnread
        h3.appendChild(dot)
      }
    })
  } catch(e) {}
}
