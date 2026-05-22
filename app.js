const API='https://siteflowa.onrender.com'
let currentWebsite=null,setupFee=299,monthlyFee=49,discountApplied=false,siteSettings={},demoStep=0,demoAnswers={}
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

function toggleMobileMenu(){
  document.querySelector('nav').classList.toggle('nav-mobile-open')
}
function closeMobileMenu(){
  document.querySelector('nav').classList.remove('nav-mobile-open')
}
function showPage(n){
  document.querySelectorAll('.page-section').forEach(s=>s.classList.remove('active'))
  document.getElementById('page-'+n).classList.add('active')
  window.scrollTo({top:0,behavior:'smooth'})
  if(n==='admin')loadAdminData()
  if(n==='manager')loadManagerData()
  if(n==='inquiry')initDemo()
}
function openLogin(){document.getElementById('login-modal').classList.add('open')}
function closeLogin(){document.getElementById('login-modal').classList.remove('open')}
function switchTab(t){
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'))
  document.querySelectorAll('.modal-tab').forEach(x=>x.classList.remove('active'))
  document.getElementById('tab-'+t).classList.add('active')
  if(t==='login')document.querySelectorAll('.modal-tab')[0].classList.add('active')
  if(t==='signup')document.querySelectorAll('.modal-tab')[1].classList.add('active')
}
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
  window._siteEmail=s.email||''
  window._sitePhone=s.phone||''
  const name=s.company_name||'Sitefloa'
  document.title=name+' - Professional Websites for Small Business'
  document.getElementById('footer-copy').textContent='(c) 2026 '+name+'. All rights reserved.'
  if(s.tagline)document.getElementById('hero-tagline').textContent=s.tagline
  if(s.plan_basic_price){
    document.getElementById('home-stat-price').textContent='$'+s.plan_basic_price
    const svcSetup=document.getElementById('svc-setup-price');if(svcSetup)svcSetup.textContent='$'+(s.plan_basic_setup||199)
    const svcMonthly=document.getElementById('svc-monthly-price');if(svcMonthly)svcMonthly.textContent='$'+(s.plan_basic_price||29)+'/mo'
    document.getElementById('plan-basic-price').innerHTML='$'+s.plan_basic_price+'<span>/mo</span>'
    document.getElementById('plan-standard-price').innerHTML='$'+s.plan_standard_price+'<span>/mo</span>'
    document.getElementById('plan-premium-price').innerHTML='$'+s.plan_premium_price+'<span>/mo</span>'
    document.getElementById('plan-basic-setup').textContent='+ $'+s.plan_basic_setup+' one-time setup'
    document.getElementById('plan-standard-setup').textContent='+ $'+s.plan_standard_setup+' one-time setup'
    document.getElementById('plan-premium-setup').textContent='+ $'+s.plan_premium_setup+' one-time setup'
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
    const map={name:'company_name',tagline:'tagline',email:'email',phone:'phone',address:'address',instagram:'instagram',facebook:'facebook',tiktok:'tiktok',twitter:'twitter',linkedin:'linkedin',youtube:'youtube'}
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
    company_name:document.getElementById('ss-name').value,tagline:document.getElementById('ss-tagline').value,
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
      closeLogin()
      const role=data.role||payload.role
      if(role==='admin'){document.getElementById('admin-email-display').textContent=email.toLowerCase();document.getElementById('admin-avatar').textContent=email.substring(0,2).toUpperCase();showPage('admin');checkTOS(email.toLowerCase(),'admin')}
      else if(role==='manager'){document.getElementById('mgr-email-display').textContent=email.toLowerCase();document.getElementById('mgr-avatar').textContent=email.substring(0,2).toUpperCase();showPage('manager');checkTOS(email.toLowerCase(),'manager')}
      else if(data.update_fee_required){document.getElementById('update-fee-amount').textContent='$'+data.update_fee_amount;document.getElementById('update-fee-total').textContent='$'+data.update_fee_amount;showPage('update-fee')}
      else if(data.subscription_status==='pending_payment'){currentWebsite=data.website;showPaymentPage(data.website,data.plan)}
      else routeClientAfterLogin({email:email.toLowerCase(),subscription_status:data.subscription_status,onboarding_stage:data.onboarding_stage,plan:data.plan||'standard',deposit_paid:data.deposit_paid},data.website,data.plan||'standard')
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
      else{currentWebsite=data.website;routeClientAfterLogin({email:email.toLowerCase(),subscription_status:data.subscription_status||'account_created',onboarding_stage:'account_created',plan:data.plan||'standard',deposit_paid:false},data.website,data.plan||'standard')}
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
    return '<div class="dash-field full"><label>' + field.label + '</label><div id="' + id + '-list" style="display:grid;gap:10px;margin-top:6px;">' + itemsHtml + '</div><button onclick="addRepeaterItem(\'' + field.key + '\',\'' + id + '\')" style="margin-top:10px;background:var(--cream);border:1px dashed var(--border-strong);border-radius:var(--radius);padding:8px 16px;font-family:var(--sans);font-size:13px;cursor:pointer;width:100%;">+ Add item</button></div>'
  }
  if (t === 'photo_array') {
    const photos = Array.isArray(v) ? v : []
    const photosHtml = photos.map(function(url, idx) {
      return '<div style="position:relative;"><img src="' + url + '" style="width:80px;height:80px;border-radius:8px;object-fit:cover;"><button onclick="removePhoto(\'' + id + '\',' + idx + ')" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:var(--red);color:white;border:none;cursor:pointer;font-size:11px;">x</button></div>'
    }).join('')
    return '<div class="dash-field full"><label>' + field.label + '</label><div id="' + id + '-list" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:6px;">' + photosHtml + '<div style="width:80px;height:80px;border:2px dashed var(--border-strong);border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ink-muted);" onclick="addPhotoUrl(\'' + id + '\')">+</div></div><div style="font-size:11px;color:var(--ink-muted);margin-top:6px;">Click + to add a photo URL</div></div>'
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

// ── TERMS OF SERVICE ──────────────────────────────────
const TOS_TEXT = `SITEFLOA INDEPENDENT CONTRACTOR TERMS

By accessing, using, or being granted any level of access to Sitefloa systems, dashboards, tools, client interfaces, or business resources, you expressly agree that you are acting as an independent contractor and not as an employee, agent, or partner of Sitefloa.

You acknowledge and agree that your participation is voluntary and that you are solely responsible for all taxes, reporting obligations, and legal requirements arising from any income earned through commissions or other compensation.

You further agree that any sales, leads, or client acquisitions generated by you on behalf of Sitefloa may qualify you for commission-based compensation as determined solely by Sitefloa, and that such commission is only payable after successful payment confirmation from the client and any applicable refund or dispute periods have passed.

Sitefloa reserves the right to modify, adjust, or revoke commission structures, payment terms, and eligibility criteria at any time at its sole discretion; however, Sitefloa agrees to provide no less than fourteen (14) days prior notice to all active contractors before any changes to commission rates or structures take effect.

You agree that Sitefloa may, at any time and for any reason, restrict, suspend, or permanently revoke your access to dashboards, internal systems, client tools, or any related infrastructure, with or without notice.

In the event that your access is revoked or your participation is terminated for any reason, you will be entitled to one final payout only, which will consist solely of any confirmed but unpaid commission earned up to the date of termination, and no additional compensation, bonuses, future earnings, or ongoing payments shall be owed under any circumstance.

You agree that any access granted to dashboards or systems is strictly for the purpose of performing assigned business activities and may be revoked at any time without obligation to continue providing access.

You must not copy, reverse engineer, distribute, or misuse any part of Sitefloa systems, code, data, or client information, and you agree to maintain strict confidentiality regarding all non-public business information, including but not limited to pricing, systems, clients, processes, and software.

You acknowledge that any misuse, breach of confidentiality, or unauthorized use of systems will result in immediate termination of access and potential forfeiture of unpaid commissions pending review.

Either party may terminate this relationship at any time, with or without cause, and upon termination all access will be removed.

By continuing to access or use Sitefloa systems or by performing any sales or business activities on behalf of Sitefloa, you confirm that you have read, understood, and agreed to be bound by these terms in full.`

function checkTOS(email, role) {
  if (role !== 'admin' && role !== 'manager') return
  const tosKey = 'sitefloa_tos_' + email
  if (!localStorage.getItem(tosKey)) {
    showTOSModal(email)
  }
}

function showTOSModal(email) {
  const existing = document.getElementById('tos-modal')
  if (existing) existing.remove()
  const modal = document.createElement('div')
  modal.id = 'tos-modal'
  modal.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(15,17,23,0.85);display:flex;align-items:center;justify-content:center;padding:20px;'
  modal.innerHTML = `
    <div style="background:white;border-radius:18px;max-width:620px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.3);">
      <div style="padding:28px 32px 20px;border-bottom:1px solid var(--border);">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--accent);margin-bottom:6px;">Before you continue</div>
        <h2 style="font-family:var(--serif);font-size:26px;letter-spacing:-0.02em;margin-bottom:6px;">Independent Contractor Terms</h2>
        <p style="font-size:13px;color:var(--ink-muted);">Please read and accept these terms to access your dashboard.</p>
      </div>
      <div style="padding:24px 32px;overflow-y:auto;flex:1;">
        <div style="font-size:13px;color:var(--ink-light);line-height:1.8;white-space:pre-line;">${TOS_TEXT}</div>
      </div>
      <div style="padding:20px 32px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:16px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <input type="checkbox" id="tos-checkbox" style="width:18px;height:18px;cursor:pointer;">
          <label for="tos-checkbox" style="font-size:13px;font-weight:500;color:var(--ink);cursor:pointer;">I have read and agree to these terms</label>
        </div>
        <button onclick="acceptTOS('${email}')" style="background:var(--accent);color:white;border:none;padding:12px 28px;border-radius:8px;font-family:var(--sans);font-size:14px;font-weight:600;cursor:pointer;">Accept & continue</button>
      </div>
    </div>
  `
  document.body.appendChild(modal)
}

function acceptTOS(email) {
  const checkbox = document.getElementById('tos-checkbox')
  if (!checkbox?.checked) {
    alert('Please check the box to confirm you have read and agree to the terms.')
    return
  }
  const tosKey = 'sitefloa_tos_' + email
  localStorage.setItem(tosKey, new Date().toISOString())
  const modal = document.getElementById('tos-modal')
  if (modal) modal.remove()
}

function viewTOS() {
  const email = localStorage.getItem('wc_email') || ''
  const modal = document.createElement('div')
  modal.id = 'tos-view-modal'
  modal.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(15,17,23,0.85);display:flex;align-items:center;justify-content:center;padding:20px;'
  modal.innerHTML = `
    <div style="background:white;border-radius:18px;max-width:620px;width:100%;max-height:90vh;display:flex;flex-direction:column;">
      <div style="padding:24px 32px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
        <h2 style="font-family:var(--serif);font-size:22px;">Contractor Terms</h2>
        <button onclick="document.getElementById('tos-view-modal').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--ink-muted);">x</button>
      </div>
      <div style="padding:24px 32px;overflow-y:auto;flex:1;">
        <div style="font-size:13px;color:var(--ink-light);line-height:1.8;white-space:pre-line;">${TOS_TEXT}</div>
      </div>
      <div style="padding:16px 32px;border-top:1px solid var(--border);font-size:12px;color:var(--ink-muted);">
        Accepted on: ${localStorage.getItem('sitefloa_tos_'+email) ? new Date(localStorage.getItem('sitefloa_tos_'+email)).toLocaleDateString('en-CA',{year:'numeric',month:'long',day:'numeric'}) : 'Not yet accepted'}
      </div>
    </div>
  `
  document.body.appendChild(modal)
}

function togglePw(id,btn){
  const inp=document.getElementById(id)
  if(!inp)return
  if(inp.type==='password'){inp.type='text';btn.textContent='🙈'}
  else{inp.type='password';btn.textContent='👁'}
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
  const token=new URLSearchParams(window.location.search).get('token')
  const password=document.getElementById('reset-password').value
  if(!token)return showError('reset-error','No reset token found. Please request a new reset link.')
  if(!password||password.length<8)return showError('reset-error','Password must be at least 8 characters')
  try{
    const res=await fetch(API+'/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,password})})
    const d=await res.json()
    if(d.message){alert('Password reset successfully! You can now log in with your new password.');closeLogin();openLogin();switchTab('login')}
    else showError('reset-error',d.error||'Reset failed - the link may have expired')
  }catch(e){showError('reset-error','Could not connect to server. Is it running?')}
}

function showPaymentPage(website,plan){
  localStorage.setItem('wc_plan',plan||'standard')
  const badge=document.getElementById('payment-plan-badge')
  if(badge){
    const names={basic:'Basic plan',standard:'Standard plan',premium:'Premium plan'}
    badge.textContent=names[plan||'standard']||plan
    badge.style.display='inline-block'
  }
  setupFee=website?website.setup_fee||299:299
  monthlyFee=website?website.monthly_fee||49:49
  discountApplied=false
  document.getElementById('pay-setup-fee').textContent='$'+setupFee
  document.getElementById('pay-monthly-fee').textContent='$'+monthlyFee+'/mo'
  document.getElementById('pay-total').textContent='$'+setupFee
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
  const token=getToken()
  if(!token)return alert('Please log in first')
  try{
    const res=await fetch(API+'/create-checkout',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify({
        setup_fee:setupFee,
        monthly_fee:monthlyFee,
        plan:localStorage.getItem('wc_plan')||'standard',
        business_name:currentWebsite?.business_name||''
      })
    })
    const d=await res.json()
    if(d.url){
      window.location.href=d.url
    }else{
      alert(d.error||'Could not create payment session')
    }
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
    const url=website.subdomain?website.subdomain+'.sitefloa.com':''
    document.getElementById('biz-url').value=url
    document.getElementById('overview-url').textContent=url||'-'
    currentSubdomain=website.subdomain||''
  }
  const isBasic=p==='basic'
  document.getElementById('nav-business').style.display=isBasic?'none':'flex'
  document.getElementById('nav-photos').style.display=isBasic?'none':'flex'
  document.getElementById('nav-hours').style.display=isBasic?'none':'flex'
  document.getElementById('nav-referral').style.display=isBasic?'none':'flex'
  document.getElementById('nav-analytics').style.display=isBasic?'none':'flex'
  fetchClientExtras(p)
  showPage('dashboard')
  const tourKey='sitefloa_tour_'+email
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
    <button onclick="document.getElementById('tour-tooltip').remove()" style="background:white;color:var(--accent);border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-family:var(--sans);font-size:14px;font-weight:500;">Let's go!</button>
  `
  document.body.appendChild(tooltip)
  setTimeout(()=>{const t=document.getElementById('tour-tooltip');if(t)t.remove()}, 8000)
}
let analyticsChart=null
let currentSubdomain=''

async function loadAnalytics(){
  const token=getToken()
  if(!token||!currentSubdomain)return
  const planBadge=document.getElementById('client-plan-badge')
  const plan=(planBadge?.textContent||'basic').toLowerCase().trim()
  const planRank={basic:0,standard:1,premium:2}
  const rank=planRank[plan]||0
  if(rank<1)return
  const period=document.getElementById('analytics-period')?.value||'30'
  const wrap=document.getElementById('analytics-wrap')
  if(!wrap)return
  wrap.innerHTML='<p style="color:var(--ink-muted);font-size:14px;">Loading...</p>'
  try{
    const res=await fetch(API+'/analytics/'+currentSubdomain+'?period='+period,{headers:{'Authorization':'Bearer '+token}})
    const data=await res.json()
    if(data.error){wrap.innerHTML='<p style="color:var(--red);">'+data.error+'</p>';return}
    renderAnalytics(data,rank)
  }catch(e){wrap.innerHTML='<p style="color:var(--red);">Could not load analytics</p>'}
}

function renderAnalytics(data,rank){
  const wrap=document.getElementById('analytics-wrap')
  if(!wrap)return
  const total=data.total_views||0
  const mobile=data.devices?data.devices.find(d=>d.device==='Mobile')?.count||0:0
  const mPct=total>0?Math.round(mobile/total*100):0

  let html='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px;">'
  html+='<div style="background:var(--accent-light);border-radius:var(--radius-lg);padding:20px;"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--accent);margin-bottom:8px;">Total views</div><div style="font-family:var(--serif);font-size:36px;color:var(--accent);">'+total.toLocaleString()+'</div></div>'
  html+='<div style="background:var(--cream);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-muted);margin-bottom:8px;">Mobile</div><div style="font-family:var(--serif);font-size:36px;">'+mPct+'%</div></div>'
  html+='<div style="background:var(--cream);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-muted);margin-bottom:8px;">Desktop</div><div style="font-family:var(--serif);font-size:36px;">'+(100-mPct)+'%</div></div>'
  html+='</div>'
  html+='<div style="background:var(--cream);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;margin-bottom:16px;"><div style="font-size:13px;font-weight:600;margin-bottom:14px;">Views over time</div><canvas id="analytics-chart" height="80"></canvas></div>'

  if(rank>=2){
    if(data.sources&&data.sources.length){
      html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">'
      html+='<div style="background:var(--cream);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;"><div style="font-size:13px;font-weight:600;margin-bottom:12px;">Traffic sources</div>'
      data.sources.forEach(function(s){
        var pct=total>0?Math.round(s.count/total*100):0
        html+='<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px;"><span>'+s.referrer_source+'</span><span style="font-weight:600;color:var(--accent);">'+pct+'% ('+s.count+')</span></div>'
      })
      html+='</div>'
      html+='<div style="background:var(--cream);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;"><div style="font-size:13px;font-weight:600;margin-bottom:12px;">Browsers</div>'
      if(data.browsers)data.browsers.forEach(function(b){
        var pct=total>0?Math.round(b.count/total*100):0
        html+='<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px;"><span>'+b.browser+'</span><span style="font-weight:600;color:var(--accent);">'+pct+'% ('+b.count+')</span></div>'
      })
      html+='</div></div>'
    }
  }else{
    html+='<div style="background:var(--gold-light);border:1px solid var(--gold);border-radius:var(--radius-lg);padding:14px 18px;font-size:13px;"><strong>Upgrade to Premium</strong> to unlock traffic sources, browser data, and top pages.</div>'
  }

  wrap.innerHTML=html
  var ctx=document.getElementById('analytics-chart')
  if(ctx&&data.daily){
    if(analyticsChart)analyticsChart.destroy()
    analyticsChart=new Chart(ctx,{
      type:'line',
      data:{
        labels:data.daily.map(function(d){return new Date(d.day).toLocaleDateString('en-CA',{month:'short',day:'numeric'})}),
        datasets:[{label:'Views',data:data.daily.map(function(d){return parseInt(d.views)}),borderColor:'#1a6b5a',backgroundColor:'rgba(26,107,90,0.1)',tension:0.4,fill:true}]
      },
      options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0}}}}
    })
  }
}

function loadSupportContactInfo(){
  const email = window._siteEmail||''
  const phone = window._sitePhone||''
  const emailItem = document.getElementById('support-email-item')
  const phoneItem = document.getElementById('support-phone-item')
  const emailLink = document.getElementById('support-email-link')
  const phoneLink = document.getElementById('support-phone-link')
  if(email && emailItem && emailLink){
    emailItem.style.display='flex'
    emailLink.textContent=email
    emailLink.href='mailto:'+email
  }
  if(phone && phoneItem && phoneLink){
    phoneItem.style.display='flex'
    phoneLink.textContent=phone
    phoneLink.href='tel:'+phone.replace(/\D/g,'')
  }
}

async function sendSupportMessage(){
  const select = document.querySelector('#panel-support select')
  const textarea = document.querySelector('#panel-support textarea')
  const subject = select?.value||'Support request'
  const message = textarea?.value||''
  const email = window._siteEmail
  if(!message){alert('Please describe your issue first');return}
  if(email){
    window.location.href='mailto:'+email+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(message)
  }else{
    alert('Message noted! We will be in touch within one business day.')
  }
  if(textarea) textarea.value=''
}

async function fetchClientExtras(plan){
  const token=getToken();if(!token)return
  try{
    const res=await fetch(API+'/my-dashboard',{headers:{'Authorization':'Bearer '+token}})
    const data=await res.json()
    if(data.referral_code&&plan!=='basic')document.getElementById('my-referral-code').textContent=data.referral_code.code
    if(data.client){
      const s=data.client.subscription_status
      document.getElementById('billing-status-text').textContent=s==='active'?'Active - Monthly plan':s==='suspended'?'Account suspended':'Pending payment'
      document.getElementById('overview-status').textContent=data.website?.is_active?'Active':'Inactive'
    }
    // show domain fee if applicable
    if(data.client?.domain_yearly_fee && parseFloat(data.client.domain_yearly_fee) > 0){
      const notice = document.getElementById('domain-fee-notice')
      const text = document.getElementById('domain-fee-text')
      if(notice && text){
        notice.style.display='block'
        text.textContent = data.client.domain_name + ' renews yearly at $' + parseFloat(data.client.domain_yearly_fee).toFixed(2) + '/yr (billed annually)'
      }
    }
    buildUpgradeOptions(data.client?.plan||'standard')
    loadSupportContactInfo()
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
  const currentPlan=document.getElementById('client-plan-badge')?.textContent?.toLowerCase().trim()||'standard'
  let msg='Request a downgrade to '+toPlan+'?\n\nThis will hide some dashboard features but your website content will never be removed.'
  if(toPlan==='basic'){
    msg+='\n\nIMPORTANT: The Basic plan does not support custom domain names. If you currently have a custom domain, our team will contact you to help switch to a free subdomain (yourname.sitefloa.com) at no charge.'
  }
  if(!confirm(msg))return
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
async function cancelSubscription(){
  const confirmed = confirm(
    'Are you sure you want to cancel?\n\n' +
    'WARNING: This will permanently take your website offline.\n\n' +
    'We do not save your website or any of your content. ' +
    'Once cancelled, your website and all its content will be gone and cannot be recovered.\n\n' +
    'Your next monthly payment will not be charged.\n\n' +
    'Type OK to confirm you understand this is permanent.'
  )
  if (!confirmed) return
  try {
    const res = await fetch(API + '/cancel-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() }
    })
    const d = await res.json()
    if (d.message) {
      alert('Your subscription has been cancelled. Your website is now offline. Thank you for using Sitefloa.')
      doLogout()
    } else {
      alert(d.error || 'Something went wrong. Please contact support.')
    }
  } catch(e) { alert('Could not connect to server') }
}

async function openBillingPortal(){
  try{
    const res=await fetch(API+'/billing-portal',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()}})
    const d=await res.json()
    if(d.url){
      window.location.href=d.url
    }else{
      // Portal not set up yet - show helpful message
      alert('To update your payment method, please email us at ' + (window._siteEmail||'hello@sitefloa.com') + ' and we will send you a secure payment update link.')
    }
  }catch(e){alert('Could not connect to server')}
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
    if(data.stats){
      document.getElementById('stat-clients').textContent=data.stats.total_clients
      document.getElementById('stat-active').textContent=data.stats.active_websites
      document.getElementById('stat-monthly').textContent='$'+data.stats.monthly_revenue.toLocaleString()
      document.getElementById('stat-total').textContent='$'+data.stats.total_revenue.toLocaleString()
      const commEl=document.getElementById('stat-commissions');if(commEl)commEl.textContent='$'+data.stats.total_commissions.toLocaleString()
      const netEl=document.getElementById('stat-net');if(netEl)netEl.textContent='$'+data.stats.net_revenue.toLocaleString()
    }
    if(data.manager_earnings_chart)renderContractorChart(data.manager_earnings_chart,data.stats)
    if(data.clients)renderClientsTable(data.clients.filter(c=>c.role==='client'||(!c.role&&!c.is_admin)))
    if(data.managers)renderStaffList(data.managers)
    if(data.monthly_chart)renderChart(data.monthly_chart)
    loadAdminCodes();loadManagerCodes();loadInquiries('admin');loadPipeline();loadAssetForms()
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
    const depEl=document.getElementById('deposit-percent');if(depEl&&s.deposit_percent)depEl.value=s.deposit_percent
  }catch(e){console.error(e)}
}
let contractorChart = null
function renderContractorChart(earnings, stats) {
  const ctx = document.getElementById('contractor-chart')
  if (!ctx) return
  if (contractorChart) contractorChart.destroy()
  const weeks = {}
  earnings.forEach(function(e) {
    const w = new Date(e.week).toLocaleDateString('en-CA',{month:'short',day:'numeric'})
    if (!weeks[w]) weeks[w] = { contractor: 0 }
    weeks[w].contractor += parseFloat(e.earned) || 0
  })
  const totalGross = stats && stats.total_revenue ? stats.total_revenue : 0
  const totalComm = stats && stats.total_commissions ? stats.total_commissions : 0
  const netRatio = totalGross > 0 ? (totalGross - totalComm) / totalGross : 0.8
  const labels = Object.keys(weeks)
  const contractorData = labels.map(function(w){ return Math.round(weeks[w].contractor) })
  const netData = labels.map(function(w){ return Math.round(weeks[w].contractor * netRatio / (1-netRatio+0.001)) })
  contractorChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'My net revenue', data: netData, backgroundColor: 'rgba(26,107,90,0.7)', borderColor: '#1a6b5a', borderWidth: 1 },
        { label: 'Contractor commissions', data: contractorData, backgroundColor: 'rgba(59,130,246,0.6)', borderColor: '#3b82f6', borderWidth: 1 }
      ]
    },
    options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, ticks: { callback: function(v){ return '$'+v } } } } }
  })
}

function renderChart(rows){
  const ctx=document.getElementById('revenue-chart');if(!ctx)return
  if(revenueChart)revenueChart.destroy()
  revenueChart=new Chart(ctx,{type:'bar',data:{labels:rows.map(r=>new Date(r.month).toLocaleDateString('en',{month:'short',year:'2-digit'})),datasets:[{label:'Revenue ($)',data:rows.map(r=>r.revenue),backgroundColor:'rgba(26,107,90,0.7)',borderRadius:6},{label:'New clients',data:rows.map(r=>r.new_clients),backgroundColor:'rgba(45,158,132,0.4)',borderRadius:6}]},options:{responsive:true,plugins:{legend:{position:'top'}},scales:{y:{beginAtZero:true}}}})
}
function renderStaffList(managers){
  const wrap=document.getElementById('staff-list')
  if(!managers||!managers.length){wrap.innerHTML='<p style="color:var(--ink-muted);font-size:14px;">No contractors yet.</p>';return}
  wrap.innerHTML=managers.map(m=>{
    const total=parseFloat(m.total_brought_in)||0,commission=Math.round(total*(m.commission_rate||10)/100)
    return`<div class="staff-row">
      <div class="staff-info"><div class="staff-email">${m.email}</div><div class="staff-meta">Commission: ${m.commission_rate||10}%</div></div>
      <div class="staff-stats">
        <div><div class="sv">${m.websites_created||0}</div><div class="sl">This period</div></div>
        <div><div class="sv">$${total.toFixed(0)}</div><div class="sl">Brought in</div></div>
        <div><div class="sv" style="color:var(--accent);">$${commission}</div><div class="sl">Earned</div></div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
        <input type="number" value="${m.commission_rate||10}" style="width:60px;padding:4px 8px;font-size:12px;" id="cr-${m.id}" min="0" max="100">
        <span style="font-size:12px;color:var(--ink-muted);">%</span>
        <button class="action-btn" onclick="updateCommission('${m.id}')">Save %</button>
        <button class="action-btn" style="background:var(--accent-light);border-color:var(--accent);color:var(--accent);" onclick="viewPayHistory('${m.id}','${m.email}')">📋 History</button>
        <button class="dash-save" style="padding:4px 12px;font-size:12px;background:var(--purple);" onclick="closePeriod('${m.id}','${m.email}')">v Close period & pay</button>
        <button class="btn-remove" onclick="removeManager('${m.id}','${m.email}')">Remove</button>
      </div>
    </div>
    <div id="pay-history-${m.id}" style="display:none;background:var(--cream);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-top:8px;">
      <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-muted);margin-bottom:10px;">Pay period history</div>
      <div id="pay-history-inner-${m.id}"><p style="font-size:13px;color:var(--ink-muted);">Loading...</p></div>
    </div>`
  }).join('')
}

async function closePeriod(managerId, email){
  if(!confirm('Close pay period for '+email+'? This will calculate earnings, send receipt, and reset stats.'))return
  try{
    const res=await fetch(API+'/admin/close-period',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({manager_id:managerId})})
    const d=await res.json()
    if(d.message){alert('OK Period closed! Receipt sent to '+email+'. They earned $'+d.earnings+' from '+d.websites_count+' websites.');loadAdminData()}
    else alert(d.error||'Failed')
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
  try{
    // load stats
    const res=await fetch(API+'/admin/stats',{headers:{'Authorization':'Bearer '+token}})
    const data=await res.json()
    if(data.stats)document.getElementById('mgr-stat-clients').textContent=data.stats.total_clients
    if(data.clients)renderManagerTable(data.clients.filter(c=>c.role==='client'||(!c.role&&!c.is_admin)))

    // load my earnings
    const earnRes=await fetch(API+'/manager/earnings',{headers:{'Authorization':'Bearer '+token}})
    const earnData=await earnRes.json()
    document.getElementById('mgr-stat-mine').textContent=earnData.websites_count||0
    document.getElementById('mgr-stat-earnings').textContent='$'+(earnData.total_earnings||0)
    document.getElementById('mgr-stat-rate').textContent=(earnData.commission_rate||10)+'%'

    // load earnings history
    renderManagerEarningsHistory(earnData)

    loadInquiries('manager')
    loadPipeline()
    loadManagerAssetForms()
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
      <td><span class="status-badge ${c.is_active?'active':c.subscription_status==='pending_payment'?'pending':'inactive'}">${c.is_active?'Active':c.subscription_status==='pending_payment'?'Pending':'Inactive'}</span></td>
      <td style="font-size:12px;">${c.created_by_email||'-'}</td>
      <td>${new Date(c.created_at).toLocaleDateString('en-CA',{timeZone:'America/Vancouver',year:'numeric',month:'short',day:'numeric'})}</td>
      <td><button class="action-btn" style="background:var(--blue-light);border-color:var(--blue);color:var(--blue);" onclick="previewClientDashboard('${c.id}','${c.email}','${c.website_id||''}')">Preview dashboard</button></td>
    </tr>
    <tr class="client-detail-row" id="mgr-detail-${c.id}"><td colspan="7"><div class="client-detail-inner">
      <div class="detail-grid">
        <div class="detail-item"><div class="dl">Email</div><div class="dv">${c.email}</div></div>
        <div class="detail-item"><div class="dl">Subdomain</div><div class="dv">${c.subdomain?'<a href="/client/'+c.subdomain+'" target="_blank" style="color:var(--accent);">'+c.subdomain+'.sitefloa.com</a>':'--'}</div></div>
        <div class="detail-item"><div class="dl">Plan</div><div class="dv">${c.plan||'standard'}</div></div>
        <div class="detail-item"><div class="dl">Status</div><div class="dv">${c.subscription_status||'pending'}</div></div>
        <div class="detail-item"><div class="dl">Business</div><div class="dv">${c.business_name||'-'}</div></div>
        <div class="detail-item"><div class="dl">Referral code</div><div class="dv" style="font-family:monospace;">${c.referral_code||'-'}</div></div>
        <div class="detail-item"><div class="dl">Created by</div><div class="dv">${c.created_by_email||'-'}</div></div>
        <div class="detail-item"><div class="dl">Total charged</div><div class="dv" style="color:var(--accent);font-weight:600;">${calcClientTotal(c)}</div></div>
      </div>
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
          <button class="action-btn" style="background:var(--accent-light);border-color:var(--accent);color:var(--accent);" onclick="uploadPreviewForClient('${c.id}','${c.website_id}')">Upload preview to client</button>
          <button class="action-btn" onclick="sendActivationCode('${c.id}')">Send activation code</button>
        </div>
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-muted);margin-bottom:8px;">Update website HTML</div>
        <div id="html-update-zone-${c.id}" style="border:2px dashed var(--border-strong);border-radius:var(--radius);padding:16px;text-align:center;cursor:pointer;transition:all 0.2s;font-size:13px;color:var(--ink-muted);"
          ondragover="event.preventDefault();this.style.borderColor='var(--accent)';this.style.background='var(--accent-light)'"
          ondragleave="this.style.borderColor='var(--border-strong)';this.style.background=''"
          ondrop="handleHtmlUpdate(event,'${c.website_id}','${c.id}')"
          onclick="document.getElementById('html-update-input-${c.id}').click()">
          ${c.site_html ? 'HTML uploaded - drag new file to replace' : 'Drag HTML file here or click to upload'}
          <input type="file" id="html-update-input-${c.id}" accept=".html" style="display:none;" onchange="handleHtmlUpdateSelect(event,'${c.website_id}','${c.id}')">
        </div>
        <span style="font-size:12px;color:var(--ink-muted);margin-left:4px;" id="html-update-msg-${c.id}"></span>
      </div>
      <p class="readonly-notice">i️ Contact admin to change pricing, plan, or delete this account.</p>
      ${c.domain_name ? '<div style="margin-top:8px;padding:10px 14px;background:var(--cream);border-radius:var(--radius);font-size:13px;"><strong>Domain:</strong> '+c.domain_name+' &middot; <strong>Cost:</strong> $'+(c.domain_cost||0)+'/yr &middot; <strong>Client charged:</strong> $'+(c.domain_yearly_fee||0)+'/yr</div>' : ''}
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
  const domain_name=document.getElementById('mgr-new-domain-name')?.value||''
  const domain_cost=parseFloat(document.getElementById('mgr-new-domain-cost')?.value)||0
  const domain_yearly_fee=parseFloat(document.getElementById('mgr-new-domain-fee')?.value)||0
  if(!business_name||!subdomain)return alert('Please fill in business name and subdomain')
  try{
    const body={business_name,subdomain,setup_fee,monthly_fee,plan,sections:{gallery:true,hours:true,contact:true},domain_name,domain_cost,domain_yearly_fee}
    if(mgrPendingHtml)body.site_html=mgrPendingHtml
    const res=await fetch(API+'/admin/create-website',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify(body)})
    const d=await res.json()
    if(d.invite_code){
      document.getElementById('mgr-invite-code-display').textContent=d.invite_code
      document.getElementById('mgr-invite-result').style.display='block'
      document.getElementById('mgr-new-biz').value=''
      document.getElementById('mgr-new-sub').value=''
      const nEl=document.getElementById('mgr-html-file-name');if(nEl)nEl.textContent='No file selected'
      const zEl=document.getElementById('mgr-html-drop-zone');if(zEl){zEl.style.borderColor='var(--border-strong)';zEl.style.background=''}
      mgrPendingHtml=null
    } else alert(d.error||'Failed')
  }catch(e){alert('Could not connect to server')}
}

function renderClientsTable(clients){
  const tbody=document.getElementById('clients-table-body')
  if(!clients.length){tbody.innerHTML='<tr><td colspan="10" style="text-align:center;color:var(--ink-muted);padding:32px;">No clients yet.</td></tr>';return}
  tbody.innerHTML=clients.map(c=>`
    <tr>
      <td><button class="action-btn" onclick="toggleDetail('${c.id}')"></button></td>
      <td>${c.email}</td><td>${c.business_name||'<span style="color:var(--ink-muted)">Not set</span>'}</td>
      <td><span class="plan-pill ${c.plan||'standard'}">${(c.plan||'standard').charAt(0).toUpperCase()+(c.plan||'standard').slice(1)}</span></td>
      <td><span class="status-badge ${c.is_active?'active':c.subscription_status==='suspended'?'suspended':c.subscription_status==='pending_payment'?'pending':'inactive'}">${c.is_active?'Active':c.subscription_status==='suspended'?'Suspended':c.subscription_status==='pending_payment'?'Pending':'Inactive'}</span></td>
      <td>$${c.setup_fee||299}</td><td>$${c.monthly_fee||49}/mo</td>
      <td style="font-size:12px;color:var(--accent);font-weight:600;">${calcClientTotal(c)}</td>
      <td style="font-size:11px;max-width:120px;overflow:hidden;text-overflow:ellipsis;">${c.created_by_email||'-'}</td>
      <td>${new Date(c.created_at).toLocaleDateString('en-CA',{timeZone:'America/Vancouver',year:'numeric',month:'short',day:'numeric'})}</td>
      <td>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">
          <button class="action-btn" onclick="toggleWebsite('${c.website_id}',${!c.is_active})">${c.is_active?'Pause':'Activate'}</button>
          ${c.subdomain?'<a class="action-btn" href="/client/'+c.subdomain+'" target="_blank" style="text-decoration:none;">View site</a>':''}
          <button class="action-btn" style="background:var(--blue-light);border-color:var(--blue);color:var(--blue);" onclick="previewClientDashboard('${c.id}','${c.email}','${c.website_id||''}')">Preview</button>
          <button class="action-btn" style="background:#f0f9ff;border-color:#0ea5e9;color:#0ea5e9;" onclick="openClientChat('${c.id}','${c.email}')">Chat</button>
          <button class="action-btn warn" onclick="showUpdateFeeModal('${c.id}')">Update Fee</button>
          <button class="action-btn danger" onclick="deleteClient('${c.id}','${c.email}')">Delete</button>
        </div>
      </td>
    </tr>
    <tr class="client-detail-row" id="detail-${c.id}"><td colspan="10"><div class="client-detail-inner">
      <div class="detail-grid">
        <div class="detail-item"><div class="dl">Email</div><div class="dv">${c.email}</div></div>
        <div class="detail-item"><div class="dl">Subdomain</div><div class="dv">${c.subdomain?c.subdomain+'.sitefloa.com':'-'}</div></div>
        <div class="detail-item"><div class="dl">Plan</div><div class="dv">${c.plan||'standard'}</div></div>
        <div class="detail-item"><div class="dl">Status</div><div class="dv">${c.subscription_status||'pending'}</div></div>
        <div class="detail-item"><div class="dl">Business</div><div class="dv">${c.business_name||'-'}</div></div>
        <div class="detail-item"><div class="dl">Referral code</div><div class="dv" style="font-family:monospace;">${c.referral_code||'-'}</div></div>
        <div class="detail-item"><div class="dl">Created by</div><div class="dv">${c.created_by_email||'-'}</div></div>
        <div class="detail-item"><div class="dl">Active</div><div class="dv">${c.is_active?'OK Yes':'No No'}</div></div>
      </div>
      <div class="pricing-edit">
        <label>Plan</label>
        <select id="pl-${c.id}" style="width:110px;padding:6px 10px;font-size:13px;"><option value="basic" ${c.plan==='basic'?'selected':''}>Basic</option><option value="standard" ${(!c.plan||c.plan==='standard')?'selected':''}>Standard</option><option value="premium" ${c.plan==='premium'?'selected':''}>Premium</option></select>
        <button class="dash-save" onclick="updateClientPlan('${c.id}')" style="padding:8px 14px;font-size:13px;">Update plan</button>
        <span style="font-size:12px;color:var(--ink-muted);margin-left:8px;">Fees: $${c.setup_fee||299} setup &middot; $${c.monthly_fee||49}/mo</span>
      </div>
      <div class="sections-edit">
        <div class="sections-edit-label">Website sections</div>
        <div class="sections-edit-checks">${SECTIONS.map(s=>{const on=c.sections?c.sections[s]:['gallery','hours','contact'].includes(s);return`<label class="section-check"><input type="checkbox" id="sec-${s}-${c.id}" ${on?'checked':''}> ${SECTION_LABELS[s]}</label>`}).join('')}</div>
        <button class="dash-save" onclick="updateSections('${c.website_id}','${c.id}')" style="padding:8px 14px;font-size:13px;margin-top:10px;">Update sections</button>
      </div>
      <div class="sections-edit" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">
        <div class="sections-edit-label">Domain & yearly fees</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:8px;align-items:end;">
          <div><label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:var(--ink-muted);">Domain name</label><input type="text" id="dn-${c.id}" value="${c.domain_name||''}" placeholder="e.g. janeplumbing.com" style="width:100%;padding:6px 10px;font-size:13px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);"></div>
          <div><label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:var(--ink-muted);">Domain cost/year ($)</label><input type="number" id="dc-${c.id}" value="${c.domain_cost||0}" placeholder="0" oninput="calcDomainFee('${c.id}')" style="width:100%;padding:6px 10px;font-size:13px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);"></div>
          <div><label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:var(--ink-muted);">Yearly domain fee charged ($)</label><input type="number" id="dyf-${c.id}" value="${c.domain_yearly_fee||0}" readonly style="width:100%;padding:6px 10px;font-size:13px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);background:var(--cream);color:var(--ink-muted);" title="Auto-calculated based on plan"></div>
        </div>
        <div style="margin-top:8px;">
          <button class="dash-save" onclick="updateDomainFee('${c.id}','${c.website_id}')" style="padding:8px 14px;font-size:13px;">Save domain info</button>
          <span style="font-size:12px;color:var(--ink-muted);margin-left:10px;" id="domain-save-msg-${c.id}"></span>
        </div>
        <div style="font-size:12px;color:var(--ink-muted);margin-top:6px;line-height:1.5;">
          Standard: free if under $30/yr, client pays excess. Premium: free if under $80/yr, client pays excess. Basic: no custom domain.
        </div>
      </div>
    </div></td></tr>
  `).join('')
}
function calcClientTotal(c){
  if(!c.is_active && c.subscription_status !== 'active') return '-'
  const joined = new Date(c.created_at)
  const now = new Date()
  const months = Math.max(1, Math.round((now - joined) / (1000 * 60 * 60 * 24 * 30)))
  const setup = parseFloat(c.setup_fee)||299
  const monthly = parseFloat(c.monthly_fee)||49
  const domain = parseFloat(c.domain_yearly_fee)||0
  const total = setup + (monthly * months) + domain
  return '$' + Math.round(total).toLocaleString()
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
    const domainName = document.getElementById('new-domain-name')?.value||''
    const domainCost = parseFloat(document.getElementById('new-domain-cost')?.value)||0
    const planForDomain = plan
    let domainYearlyFee = 0
    if(planForDomain==='standard') domainYearlyFee = domainCost>30 ? Math.round((domainCost-30)*100)/100 : 0
    else if(planForDomain==='premium') domainYearlyFee = domainCost>80 ? Math.round((domainCost-80)*100)/100 : 0
    // add domain cost to setup fee for first payment
    const totalSetupFee = setup_fee + (domainCost > 0 && planForDomain !== 'basic' ? Math.min(domainCost, planForDomain==='premium'?80:30) : 0)
    const body = {business_name,subdomain,setup_fee:totalSetupFee,monthly_fee,plan,sections,domain_name:domainName,domain_cost:domainCost,domain_yearly_fee:domainYearlyFee}
    if(pendingHtmlContent) body.site_html = pendingHtmlContent
    const res=await fetch(API+'/admin/create-website',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify(body)})
    const d=await res.json()
    if(d.invite_code){
      document.getElementById('invite-code-display').textContent=d.invite_code
      document.getElementById('invite-result').style.display='block'
      document.getElementById('new-biz-name').value=''
      document.getElementById('new-subdomain').value=''
      document.getElementById('html-file-name').textContent='No file selected'
      document.getElementById('html-drop-zone').style.borderColor='var(--border-strong)'
      document.getElementById('html-drop-zone').style.background=''
      pendingHtmlContent=null
      loadAdminData()
    } else alert(d.error||'Failed to create website')
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
async function updateClientPlan(cid){
  const plan=document.getElementById('pl-'+cid).value
  try{const res=await fetch(API+'/admin/update-client-plan',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({client_id:cid,plan})});const d=await res.json();if(d.message){alert('Plan updated to '+plan);loadAdminData()}else alert(d.error||'Failed')}catch(e){alert('Could not connect')}
}
async function updateSections(wid,cid){
  if(!wid||wid==='null')return alert('No website linked yet')
  const sections={};SECTIONS.forEach(s=>{sections[s]=document.getElementById('sec-'+s+'-'+cid)?.checked||false})
  try{const res=await fetch(API+'/admin/update-sections',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({website_id:wid,sections})});const d=await res.json();if(d.message){alert('Sections updated!');loadAdminData()}else alert(d.error||'Failed')}catch(e){alert('Could not connect')}
}
function showUpdateFeeModal(cid){
  const amount=prompt('Enter update fee amount ($):\n\nThis will lock the client out of their dashboard until they pay.\nThey will see a message saying:\n"A one-time update fee has been applied to your account."')
  if(!amount||isNaN(amount))return
  chargeUpdateFee(cid,parseInt(amount))
}
async function chargeUpdateFee(cid,amount){
  try{const res=await fetch(API+'/admin/charge-update-fee',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({client_id:cid,amount})});const d=await res.json();if(d.message){alert('Update fee of $'+amount+' set. Client will be prompted to pay before accessing their dashboard.');loadAdminData()}else alert(d.error||'Failed')}catch(e){alert('Could not connect')}
}
function calcMgrDomainFee(){
  const cost = parseFloat(document.getElementById('mgr-new-domain-cost')?.value)||0
  const plan = document.getElementById('mgr-new-plan')?.value||'standard'
  const feeEl = document.getElementById('mgr-new-domain-fee')
  const notice = document.getElementById('mgr-domain-fee-notice')
  if(!feeEl)return
  let covered = plan==='premium'?80:plan==='standard'?30:0
  let yearlyFee = cost>covered && plan!=='basic' ? Math.round((cost-covered)*100)/100 : 0
  feeEl.value = yearlyFee
  if(notice){
    if(cost>0 && plan!=='basic'){
      notice.style.display='block'
      notice.textContent = 'Domain $'+cost.toFixed(2)+'/yr — $'+Math.min(cost,covered).toFixed(2)+' covered — client charged $'+yearlyFee.toFixed(2)+'/yr'
    } else {
      notice.style.display='none'
    }
  }
}

let mgrPendingHtml = null
function handleMgrHtmlDrop(e){
  e.preventDefault()
  const zone=document.getElementById('mgr-html-drop-zone')
  if(zone){zone.style.borderColor='var(--border-strong)';zone.style.background=''}
  const file=e.dataTransfer.files[0]
  if(!file||!file.name.endsWith('.html')){alert('Please drop an HTML file');return}
  readMgrHtmlFile(file)
}
function handleMgrHtmlSelect(e){
  const file=e.target.files[0]
  if(!file)return
  readMgrHtmlFile(file)
}
function readMgrHtmlFile(file){
  const reader=new FileReader()
  reader.onload=function(e){
    mgrPendingHtml=e.target.result
    const nameEl=document.getElementById('mgr-html-file-name')
    const zone=document.getElementById('mgr-html-drop-zone')
    if(nameEl)nameEl.textContent='Ready: '+file.name
    if(zone){zone.style.borderColor='var(--accent)';zone.style.background='var(--accent-light)'}
  }
  reader.readAsText(file)
}

function calcNewDomainFee(){
  const cost = parseFloat(document.getElementById('new-domain-cost')?.value)||0
  const plan = document.getElementById('new-plan')?.value||'standard'
  const notice = document.getElementById('new-domain-fee-notice')
  const text = document.getElementById('new-domain-fee-text')
  if(!notice||!text)return
  if(cost===0||plan==='basic'){notice.style.display='none';return}
  notice.style.display='block'
  let covered = plan==='premium' ? 80 : 30
  let yearlyCharge = cost > covered ? Math.round((cost-covered)*100)/100 : 0
  let addedToLaunch = Math.min(cost, covered)
  let msg = 'Domain: ' + (document.getElementById('new-domain-name')?.value||'') + ' ($' + cost.toFixed(2) + '/yr)'
  msg += ' — $' + addedToLaunch.toFixed(2) + ' covered in launch fee'
  if(yearlyCharge>0) msg += ' — client charged $' + yearlyCharge.toFixed(2) + '/yr after first year'
  else msg += ' — fully covered, no yearly charge to client'
  text.textContent = msg
}

function calcDomainFee(cid){
  const domainCost = parseFloat(document.getElementById('dc-'+cid)?.value)||0
  const planEl = document.getElementById('pl-'+cid)
  const plan = planEl ? planEl.value : 'standard'
  let yearlyFee = 0
  if(plan === 'standard') yearlyFee = domainCost > 30 ? Math.round((domainCost-30)*100)/100 : 0
  else if(plan === 'premium') yearlyFee = domainCost > 80 ? Math.round((domainCost-80)*100)/100 : 0
  const feeEl = document.getElementById('dyf-'+cid)
  if(feeEl) feeEl.value = yearlyFee
}

async function updateDomainFee(cid, wid){
  const domainName = document.getElementById('dn-'+cid)?.value||''
  const domainCost = parseFloat(document.getElementById('dc-'+cid)?.value)||0
  // get client plan from the plan select
  const planEl = document.getElementById('pl-'+cid)
  const plan = planEl ? planEl.value : 'standard'
  // calculate what client owes based on plan
  let yearlyFee = 0
  if(plan === 'basic') yearlyFee = 0
  else if(plan === 'standard') yearlyFee = domainCost > 30 ? Math.round((domainCost - 30)*100)/100 : 0
  else if(plan === 'premium') yearlyFee = domainCost > 80 ? Math.round((domainCost - 80)*100)/100 : 0
  // update the readonly field
  const feeEl = document.getElementById('dyf-'+cid)
  if(feeEl) feeEl.value = yearlyFee
  try{
    const res = await fetch(API+'/admin/update-domain',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({client_id:cid,domain_name:domainName,domain_cost:domainCost,domain_yearly_fee:yearlyFee})})
    const d = await res.json()
    const msg = document.getElementById('domain-save-msg-'+cid)
    if(d.message){
      if(msg){msg.textContent='✓ Saved';setTimeout(()=>msg.textContent='',3000)}
    } else {
      if(msg) msg.textContent = d.error||'Failed'
    }
  }catch(e){alert('Could not connect')}
}

// ── HTML FILE UPLOAD ──────────────────────────────────
let pendingHtmlContent = null

async function uploadPreviewForClient(clientId, websiteId) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.html'
  input.onchange = async function(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async function(ev) {
      const html = ev.target.result
      try {
        const res = await fetch(API + '/admin/upload-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
          body: JSON.stringify({ client_id: clientId, preview_html: html })
        })
        const d = await res.json()
        if (d.message) alert('Preview uploaded and client notified by email!')
        else alert(d.error || 'Upload failed')
      } catch(err) { alert('Could not connect') }
    }
    reader.readAsText(file)
  }
  input.click()
}

async function sendActivationCode(clientId) {
  if (!confirm('Send activation code to this client? This will email them a code to create their account.')) return
  try {
    const res = await fetch(API + '/admin/send-activation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ client_id: clientId })
    })
    const d = await res.json()
    if (d.message) alert('Activation code sent!')
    else alert(d.error || 'Failed')
  } catch(e) { alert('Could not connect') }
}

async function handleHtmlUpdate(e, websiteId, clientId) {
  e.preventDefault()
  const zone = document.getElementById('html-update-zone-'+clientId)
  if(zone){zone.style.borderColor='var(--border-strong)';zone.style.background=''}
  const file = e.dataTransfer.files[0]
  if (!file||!file.name.endsWith('.html')) return alert('Please drop an HTML file')
  uploadHtmlForClient(file, websiteId, clientId)
}

function handleHtmlUpdateSelect(e, websiteId, clientId) {
  const file = e.target.files[0]
  if (!file) return
  uploadHtmlForClient(file, websiteId, clientId)
}

async function uploadHtmlForClient(file, websiteId, clientId) {
  const msg = document.getElementById('html-update-msg-'+clientId)
  if(msg) msg.textContent = 'Uploading...'
  const reader = new FileReader()
  reader.onload = async function(e) {
    const html = e.target.result
    try {
      const res = await fetch(API+'/admin/upload-site-html', {
        method: 'POST',
        headers: {'Content-Type':'application/json','Authorization':'Bearer '+getToken()},
        body: JSON.stringify({website_id: websiteId, site_html: html})
      })
      const d = await res.json()
      if(msg) msg.textContent = d.message ? 'Uploaded successfully! Site is live.' : (d.error||'Upload failed')
      setTimeout(()=>{if(msg)msg.textContent=''},4000)
    } catch(err) {
      if(msg) msg.textContent = 'Upload failed - could not connect'
    }
  }
  reader.readAsText(file)
}

function handleHtmlDrop(e) {
  e.preventDefault()
  const zone = document.getElementById('html-drop-zone')
  zone.style.borderColor = 'var(--accent)'
  zone.style.background = 'var(--accent-light)'
  const file = e.dataTransfer.files[0]
  if (!file || !file.name.endsWith('.html')) {
    alert('Please drop an HTML file')
    zone.style.borderColor = 'var(--border-strong)'
    zone.style.background = ''
    return
  }
  readHtmlFile(file)
}

function handleHtmlFileSelect(e) {
  const file = e.target.files[0]
  if (!file) return
  readHtmlFile(file)
}

function readHtmlFile(file) {
  const reader = new FileReader()
  reader.onload = function(e) {
    pendingHtmlContent = e.target.result
    document.getElementById('html-file-name').textContent = 'Ready: ' + file.name
    document.getElementById('html-drop-zone').style.borderColor = 'var(--accent)'
    document.getElementById('html-drop-zone').style.background = 'var(--accent-light)'
  }
  reader.readAsText(file)
}

// ── PREVIEW CLIENT DASHBOARD ───────────────────────────
function previewClientDashboard(clientId, email, websiteId) {
  // Store preview info and show the dashboard in preview mode
  localStorage.setItem('preview_client_id', clientId)
  localStorage.setItem('preview_email', email)
  localStorage.setItem('preview_website_id', websiteId)
  localStorage.setItem('is_preview_mode', 'true')
  // Load their dashboard data
  loadClientDashboardPreview(clientId, email, websiteId)
}

async function loadClientDashboardPreview(clientId, email, websiteId) {
  const token = getToken()
  try {
    const res = await fetch(API + '/admin/client-preview/' + clientId, {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    const data = await res.json()
    if (data.error) { alert(data.error); return }
    // Show preview banner
    showPreviewBanner(email)
    // Load dashboard with client data
    loadClientDashboard(email, data.website, data.plan)
  } catch(e) {
    alert('Could not load client dashboard preview')
  }
}

function showPreviewBanner(email) {
  const existing = document.getElementById('preview-banner')
  if (existing) existing.remove()
  const banner = document.createElement('div')
  banner.id = 'preview-banner'
  banner.style.cssText = 'position:fixed;top:64px;left:0;right:0;z-index:150;background:var(--blue);color:white;padding:10px 24px;display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:500;'
  banner.innerHTML = '<span>👀 Previewing dashboard as: <strong>' + email + '</strong> — changes you make here will affect their real account</span><button onclick="exitPreview()" style="background:white;color:var(--blue);border:none;padding:6px 16px;border-radius:6px;font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer;">Exit preview</button>'
  document.body.appendChild(banner)
  // push content down
  document.querySelector('section')?.style.setProperty('padding-top', '120px')
}

function exitPreview() {
  localStorage.removeItem('preview_client_id')
  localStorage.removeItem('preview_email')
  localStorage.removeItem('preview_website_id')
  localStorage.removeItem('is_preview_mode')
  const banner = document.getElementById('preview-banner')
  if (banner) banner.remove()
  const role = getRole()
  if (role === 'admin') showPage('admin')
  else showPage('manager')
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
async function createManagerCode(){const code=document.getElementById('new-manager-code').value.trim();if(!code)return alert('Please enter a code');try{const res=await fetch(API+'/admin/create-manager-code',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({code})});const d=await res.json();if(d.message){document.getElementById('new-manager-code').value='';loadManagerCodes()}else alert(d.error||'Failed')}catch(e){alert('Could not connect')}}
async function createAdminCode(){const code=document.getElementById('new-admin-code').value.trim();if(!code)return alert('Please enter a code');try{const res=await fetch(API+'/admin/create-admin-code',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({code})});const d=await res.json();if(d.message){document.getElementById('new-admin-code').value='';loadAdminCodes()}else alert(d.error||'Failed')}catch(e){alert('Could not connect')}}
async function removeManager(cid,email){if(!confirm('Remove contractor access for '+email+'?'))return;try{const res=await fetch(API+'/admin/remove-manager/'+cid,{method:'DELETE',headers:{'Authorization':'Bearer '+getToken()}});const d=await res.json();if(d.message)loadAdminData();else alert(d.error||'Failed')}catch(e){alert('Could not connect')}}

document.getElementById('login-modal').addEventListener('click',function(e){if(e.target===this)closeLogin()})
function switchPanel(name,el){document.querySelectorAll('.dash-panel').forEach(p=>p.classList.remove('active'));document.querySelectorAll('.dash-nav-item').forEach(n=>n.classList.remove('active'));document.getElementById('panel-'+name).classList.add('active');el.classList.add('active')}
function savePanel(btn){const p=btn.closest('.dash-panel');const m=p.querySelector('.save-msg');if(m){m.classList.add('show');setTimeout(()=>m.classList.remove('show'),3000)}}
window.addEventListener('load',()=>{
  loadSiteSettings()
  const params=new URLSearchParams(window.location.search)
  if(params.get('token')){
    openLogin()
    document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'))
    document.querySelectorAll('.modal-tab').forEach(t=>t.classList.remove('active'))
    const resetTab=document.getElementById('tab-reset')
    if(resetTab)resetTab.classList.add('active')
  }
  if(params.get('payment')==='success'){
    // Payment confirmed - activate account and load dashboard
    const token=getToken()
    if(token){
      fetch(API+'/activate-account',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}})
        .then(r=>r.json())
        .then(d=>{
          if(d.message){
            const email=localStorage.getItem('wc_email')
            alert('Payment successful! Welcome to Sitefloa.')
            loadClientDashboard(email,currentWebsite,localStorage.getItem('wc_plan')||'standard')
          }
        }).catch(()=>{})
    }
    // Clean URL
    window.history.replaceState({},'',window.location.pathname)
  }
  if(params.get('payment')==='cancelled'){
    alert('Payment was cancelled. You can try again from your account.')
    window.history.replaceState({},'',window.location.pathname)
    openLogin()
  }
  if(params.get('deposit')==='success'){
    const token=getToken()
    if(token){
      fetch(API+'/deposit-confirmed',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}})
        .then(r=>r.json())
        .then(d=>{
          const email=localStorage.getItem('wc_email')
          fetch(API+'/my-dashboard',{headers:{'Authorization':'Bearer '+token}})
            .then(r=>r.json())
            .then(data=>{
              routeClientAfterLogin(data.client,data.website,data.client?.plan||'standard')
            })
        }).catch(()=>{})
    }
    window.history.replaceState({},'',window.location.pathname)
  }
  if(params.get('assetform')){
    const token=params.get('assetform')
    showPage('assetform')
    loadAssetFormPage(token)
    window.history.replaceState({},'',window.location.pathname)
  }
})
// ══════════════════════════════════════════════════════
// SALES PIPELINE
// ══════════════════════════════════════════════════════
let allLeads = []

const STAGE_LABELS = {
  new: 'New lead', contacted: 'Contacted', interested: 'Interested',
  demo_sent: 'Demo sent', deposit_paid: 'Deposit paid', building: 'Building',
  ready: 'Ready to launch', live: 'Live', not_interested: 'Not interested'
}
const STAGE_COLORS = {
  new: '#6b7280', contacted: '#3b82f6', interested: '#8b5cf6',
  demo_sent: '#f59e0b', deposit_paid: '#10b981', building: '#1a6b5a',
  ready: '#059669', live: '#047857', not_interested: '#ef4444'
}

function filterPipelineMgr() {
  const filter = document.getElementById('mgr-pipeline-filter')?.value || 'all'
  const filtered = filter === 'all' ? allLeads : allLeads.filter(l => l.stage === filter)
  const wrap = document.getElementById('mgr-pipeline-wrap')
  if (wrap) renderPipelineInto(wrap, filtered)
}

async function loadManagerAssetForms() {
  try {
    const res = await fetch(API + '/admin/asset-forms', {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    const data = await res.json()
    const myEmail = localStorage.getItem('wc_email') || ''
    const myForms = (data.forms || []).filter(f => f.sent_by_email === myEmail)
    const wrap = document.getElementById('mgr-asset-forms-wrap')
    if (!wrap) return
    if (!myForms.length) {
      wrap.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No briefs sent yet.</p>'
      return
    }
    const submitted = myForms.filter(f => f.status === 'submitted').length
    wrap.innerHTML = '<div style="font-size:13px;color:var(--ink-muted);margin-bottom:10px;">'+myForms.length+' sent &middot; '+submitted+' submitted</div>' +
      myForms.map(function(f) {
        var statusBg = f.status==='submitted' ? 'var(--accent-light)' : 'var(--cream)'
        var statusColor = f.status==='submitted' ? 'var(--accent)' : 'var(--ink-muted)'
        var statusLabel = f.status==='submitted' ? 'Submitted' : 'Awaiting'
        var viewBtn = f.status==='submitted' ? '<button class="action-btn" onclick="viewBriefAndGenerate(\'' + f.id + '\')">View & generate prompt</button>' : ''
        return '<div style="border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 18px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">' +
          '<div><div style="font-weight:600;font-size:14px;">'+f.email+'</div><div style="font-size:12px;color:var(--ink-muted);">'+f.plan+' plan &middot; '+new Date(f.created_at).toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric'})+(f.submitted_at?' &middot; <strong style="color:var(--accent);">Submitted</strong>':'')+'</div></div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;"><span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:'+statusBg+';color:'+statusColor+';">'+statusLabel+'</span>'+viewBtn +
          '<button class="action-btn" style="background:var(--blue-light);border-color:var(--blue);color:var(--blue);" onclick="showFollowUpModal(\'' + f.email + '\')">Send activation</button></div></div>'
      }).join('')
  } catch(e) { console.error(e) }
}

async function loadPipeline() {
  const token = getToken()
  if (!token) return
  try {
    const res = await fetch(API + '/admin/leads', { headers: { 'Authorization': 'Bearer ' + token } })
    const data = await res.json()
    allLeads = data.leads || []
    renderPipeline(allLeads)
    // also populate mgr-pipeline-wrap if exists
    const mgrWrap = document.getElementById('mgr-pipeline-wrap')
    if (mgrWrap) renderPipelineInto(mgrWrap, allLeads)
  } catch(e) { console.error(e) }
}

function filterPipeline() {
  const filter = document.getElementById('pipeline-filter')?.value || 'all'
  const filtered = filter === 'all' ? allLeads : allLeads.filter(l => l.stage === filter)
  renderPipeline(filtered)
}

function renderPipeline(leads) {
  const wrap = document.getElementById('pipeline-wrap')
  if (wrap) renderPipelineInto(wrap, leads)
  const mgrWrap = document.getElementById('mgr-pipeline-wrap')
  if (mgrWrap) renderPipelineInto(mgrWrap, leads)
}

function renderPipelineInto(wrap, leads) {
  if (!leads || !leads.length) {
    wrap.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No leads yet. Add your first potential client above.</p>'
    return
  }
  const myEmail = localStorage.getItem('wc_email') || ''
  const role = getRole()
  wrap.innerHTML = `
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:2px solid var(--border);">
            <th style="text-align:left;padding:10px 8px;color:var(--ink-muted);font-weight:600;">Business</th>
            <th style="text-align:left;padding:10px 8px;color:var(--ink-muted);font-weight:600;">Contact</th>
            <th style="text-align:left;padding:10px 8px;color:var(--ink-muted);font-weight:600;">Plan</th>
            <th style="text-align:left;padding:10px 8px;color:var(--ink-muted);font-weight:600;">Stage</th>
            <th style="text-align:left;padding:10px 8px;color:var(--ink-muted);font-weight:600;">Claimed by</th>
            <th style="text-align:left;padding:10px 8px;color:var(--ink-muted);font-weight:600;">Added by</th>
            <th style="text-align:left;padding:10px 8px;color:var(--ink-muted);font-weight:600;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${leads.map(l => {
            const isMine = l.claimed_by_email === myEmail
            const unclaimed = !l.claimed_by
            const canEdit = isMine || role === 'admin'
            return `
              <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:10px 8px;">
                  <div style="font-weight:600;">${l.business_name}</div>
                  ${l.website_url ? '<a href="'+l.website_url+'" target="_blank" style="font-size:11px;color:var(--accent);">View website</a>' : ''}
                  ${l.notes ? '<div style="font-size:11px;color:var(--ink-muted);margin-top:2px;">'+l.notes+'</div>' : ''}
                </td>
                <td style="padding:10px 8px;">
                  <div>${l.contact_name || '-'}</div>
                  ${l.email ? '<a href="mailto:'+l.email+'" style="font-size:11px;color:var(--accent);">'+l.email+'</a>' : ''}
                  ${l.phone ? '<div style="font-size:11px;">'+l.phone+'</div>' : ''}
                </td>
                <td style="padding:10px 8px;text-transform:capitalize;">${l.plan_interest || 'standard'}</td>
                <td style="padding:10px 8px;">
                  <span style="background:${STAGE_COLORS[l.stage]||'#6b7280'}22;color:${STAGE_COLORS[l.stage]||'#6b7280'};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;">
                    ${STAGE_LABELS[l.stage] || l.stage}
                  </span>
                </td>
                <td style="padding:10px 8px;font-size:12px;">${l.claimed_by_email || '<span style="color:var(--ink-muted)">Unclaimed</span>'}</td>
                <td style="padding:10px 8px;font-size:12px;">${l.added_by_email || '-'}</td>
                <td style="padding:10px 8px;">
                  <div style="display:flex;gap:4px;flex-wrap:wrap;">
                    ${unclaimed ? '<button class="action-btn" onclick="claimLead(\''+l.id+'\')">Claim</button>' : ''}
                    ${canEdit ? `<select onchange="updateLeadStage('${l.id}',this.value)" style="padding:4px 8px;font-size:11px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);">
                      ${Object.entries(STAGE_LABELS).map(([k,v]) => '<option value="'+k+'"'+(l.stage===k?' selected':'')+'>'+v+'</option>').join('')}
                    </select>` : ''}
                    ${role === 'admin' ? '<button class="action-btn danger" onclick="deleteLead(\''+l.id+'\')">Delete</button>' : ''}
                  </div>
                </td>
              </tr>`
          }).join('')}
        </tbody>
      </table>
    </div>`
}

function showAddLeadModal() {
  const existing = document.getElementById('add-lead-modal')
  if (existing) existing.remove()
  const modal = document.createElement('div')
  modal.id = 'add-lead-modal'
  modal.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(15,17,23,0.7);display:flex;align-items:center;justify-content:center;padding:20px;'
  modal.innerHTML = `
    <div style="background:white;border-radius:16px;max-width:520px;width:100%;padding:32px;box-shadow:0 24px 60px rgba(0,0,0,0.25);">
      <h3 style="font-family:var(--serif);font-size:22px;margin-bottom:20px;">Add new lead</h3>
      <div class="dash-grid">
        <div class="dash-field"><label>Business name *</label><input type="text" id="lead-biz" placeholder="Acme Plumbing"></div>
        <div class="dash-field"><label>Contact name</label><input type="text" id="lead-contact" placeholder="John Smith"></div>
        <div class="dash-field"><label>Email</label><input type="email" id="lead-email" placeholder="john@acme.com"></div>
        <div class="dash-field"><label>Phone</label><input type="tel" id="lead-phone" placeholder="+1 (555) 000-0000"></div>
        <div class="dash-field full"><label>Website URL</label><input type="url" id="lead-url" placeholder="https://acme.com"></div>
        <div class="dash-field full"><label>Notes</label><textarea id="lead-notes" rows="2" placeholder="Any notes about this lead..."></textarea></div>
        <div class="dash-field"><label>Plan interest</label><select id="lead-plan"><option value="basic">Basic</option><option value="standard" selected>Standard</option><option value="premium">Premium</option></select></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:20px;">
        <button class="dash-save" onclick="submitLead()">Add lead</button>
        <button onclick="document.getElementById('add-lead-modal').remove()" style="background:none;border:1px solid var(--border);border-radius:var(--radius);padding:10px 20px;font-family:var(--sans);font-size:14px;cursor:pointer;">Cancel</button>
      </div>
    </div>`
  document.body.appendChild(modal)
}

async function submitLead() {
  const biz = document.getElementById('lead-biz')?.value
  if (!biz) { alert('Business name is required'); return }
  const body = {
    business_name: biz,
    contact_name: document.getElementById('lead-contact')?.value,
    email: document.getElementById('lead-email')?.value,
    phone: document.getElementById('lead-phone')?.value,
    website_url: document.getElementById('lead-url')?.value,
    notes: document.getElementById('lead-notes')?.value,
    plan_interest: document.getElementById('lead-plan')?.value
  }
  try {
    const res = await fetch(API + '/admin/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify(body)
    })
    const d = await res.json()
    if (d.lead) {
      document.getElementById('add-lead-modal')?.remove()
      loadPipeline()
    } else alert(d.error || 'Failed')
  } catch(e) { alert('Could not connect') }
}

async function claimLead(id) {
  try {
    const res = await fetch(API + '/admin/leads/' + id + '/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() }
    })
    const d = await res.json()
    if (d.message) loadPipeline()
    else alert(d.error || 'Could not claim')
  } catch(e) { alert('Could not connect') }
}

async function updateLeadStage(id, stage) {
  try {
    const res = await fetch(API + '/admin/leads/' + id + '/stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ stage })
    })
    const d = await res.json()
    if (!d.message) alert(d.error || 'Could not update stage')
    else loadPipeline()
  } catch(e) { alert('Could not connect') }
}

async function deleteLead(id) {
  if (!confirm('Delete this lead?')) return
  try {
    await fetch(API + '/admin/leads/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    loadPipeline()
  } catch(e) { alert('Could not connect') }
}

// ══════════════════════════════════════════════════════
// WEBSITE BRIEFS / ASSET FORMS
// ══════════════════════════════════════════════════════
async function sendAssetForm() {
  const email = document.getElementById('brief-email')?.value?.trim()
  const plan = document.getElementById('brief-plan')?.value || 'standard'
  if (!email) { alert('Please enter a client email'); return }
  try {
    const res = await fetch(API + '/admin/send-asset-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ email, plan })
    })
    const d = await res.json()
    if (d.message) {
      const msg = document.getElementById('save-msg-brief')
      if (msg) { msg.classList.add('show'); setTimeout(() => msg.classList.remove('show'), 3000) }
      document.getElementById('brief-email').value = ''
      loadAssetForms()
    } else alert(d.error || 'Failed')
  } catch(e) { alert('Could not connect') }
}

async function sendAssetFormMgr() {
  const emailEl = document.getElementById('mgr-brief-email')
  const planEl = document.getElementById('mgr-brief-plan')
  const email = emailEl?.value?.trim()
  const plan = planEl?.value || 'standard'
  if (!email) { alert('Please enter a client email'); return }
  try {
    const res = await fetch(API + '/admin/send-asset-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ email, plan })
    })
    const d = await res.json()
    if (d.message) {
      const msg = document.getElementById('save-msg-mgr-brief')
      if (msg) { msg.classList.add('show'); setTimeout(() => msg.classList.remove('show'), 3000) }
      if (emailEl) emailEl.value = ''
      loadManagerAssetForms()
    } else alert(d.error || 'Failed')
  } catch(e) { alert('Could not connect') }
}

async function sendAssetFormShared() {
  // Try all possible email input IDs
  const emailEl = document.getElementById('brief-email-shared') || 
                  document.getElementById('brief-email') ||
                  document.getElementById('mgr-brief-email')
  const planEl = document.getElementById('brief-plan-shared') || 
                 document.getElementById('brief-plan') ||
                 document.getElementById('mgr-brief-plan')
  const email = emailEl?.value?.trim()
  const plan = planEl?.value || 'standard'
  if (!email) { alert('Please enter a client email'); return }
  try {
    const res = await fetch(API + '/admin/send-asset-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ email, plan })
    })
    const d = await res.json()
    if (d.message) {
      const msg = document.getElementById('save-msg-brief-shared') || document.getElementById('save-msg-brief')
      if (msg) { msg.classList.add('show'); setTimeout(() => msg.classList.remove('show'), 3000) }
      if (emailEl) emailEl.value = ''
      loadAssetForms()
    } else alert(d.error || 'Failed to send: ' + (d.error || 'Unknown error'))
  } catch(e) { alert('Could not connect to server') }
}

async function loadAssetForms() {
  try {
    const res = await fetch(API + '/admin/asset-forms', {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    const data = await res.json()
    renderAssetForms(data.forms || [])
    // update stat
    const statEl = document.getElementById('stat-forms-sent')
    if (statEl && data.forms) statEl.textContent = data.forms.length
  } catch(e) { console.error(e) }
}

function renderAssetForms(forms) {
  const wrap = document.getElementById('asset-forms-wrap')
  if (!wrap) return
  const role = getRole()
  const myEmail = localStorage.getItem('wc_email') || ''
  const filtered = role === 'admin' ? forms : forms.filter(function(f){ return f.sent_by_email === myEmail })
  const submitted = filtered.filter(function(f){ return f.status === 'submitted' }).length
  const statEl = document.getElementById('stat-forms-sent')
  if (statEl) statEl.textContent = forms.length
  if (!filtered.length) {
    wrap.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No website briefs sent yet.</p>'
    return
  }
  wrap.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><div style="font-size:13px;color:var(--ink-muted);">'+filtered.length+' sent &middot; '+submitted+' submitted</div><button onclick="toggleBriefsList()" id="briefs-toggle-btn" style="background:none;border:1px solid var(--border);border-radius:var(--radius);padding:5px 12px;font-size:12px;cursor:pointer;font-family:var(--sans);">Collapse</button></div><div id="briefs-list">'+filtered.map(function(f){
    var statusBg = f.status==='submitted' ? 'var(--accent-light)' : 'var(--cream)'
    var statusColor = f.status==='submitted' ? 'var(--accent)' : 'var(--ink-muted)'
    var statusLabel = f.status==='submitted' ? 'Submitted' : 'Awaiting'
    var submittedDate = f.submitted_at ? ' &middot; <strong style="color:var(--accent);">Submitted '+new Date(f.submitted_at).toLocaleDateString('en-CA',{month:'short',day:'numeric'})+'</strong>' : ''
    var sentBy = (f.sent_by_email && role==='admin') ? ' &middot; by '+f.sent_by_email : ''
    var viewBtn = f.status==='submitted' ? '<button class="action-btn" onclick="viewBriefAndGenerate(\'' + f.id + '\')">' + 'View & generate prompt</button>' : ''
    return '<div style="border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 18px;margin-bottom:8px;"><div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;"><div><div style="font-weight:600;font-size:14px;">'+f.email+'</div><div style="font-size:12px;color:var(--ink-muted);margin-top:2px;">'+f.plan+' plan &middot; Sent '+new Date(f.created_at).toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric'})+sentBy+submittedDate+'</div></div><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;"><span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:'+statusBg+';color:'+statusColor+';">'+statusLabel+'</span>'+viewBtn+'<button class="action-btn" style="background:var(--blue-light);border-color:var(--blue);color:var(--blue);" onclick="showFollowUpModal(\'' + f.email + '\')">' + 'Send activation</button></div></div></div>'
  }).join('')+'</div>'
}

function toggleBriefsList() {
  const list = document.getElementById('briefs-list')
  const btn = document.getElementById('briefs-toggle-btn')
  if (!list || !btn) return
  if (list.style.display === 'none') { list.style.display = 'block'; btn.textContent = 'Collapse' }
  else { list.style.display = 'none'; btn.textContent = 'Expand' }
}

function showFollowUpModal(email) {
  const existing = document.getElementById('followup-modal')
  if (existing) existing.remove()
  const modal = document.createElement('div')
  modal.id = 'followup-modal'
  modal.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(15,17,23,0.75);display:flex;align-items:center;justify-content:center;padding:20px;'
  const box = document.createElement('div')
  box.style.cssText = 'background:white;border-radius:16px;max-width:480px;width:100%;padding:32px;box-shadow:0 24px 60px rgba(0,0,0,0.25);'
  box.innerHTML = '<h3 style="font-family:var(--serif);font-size:20px;margin-bottom:8px;">Send activation code</h3>' +
    '<p style="font-size:13px;color:var(--ink-muted);margin-bottom:20px;">This will email <strong>' + email + '</strong> with their activation code and step-by-step instructions to create their account.</p>' +
    '<div class="dash-field" style="margin-bottom:16px;"><label>Activation code</label>' +
    '<input type="text" id="followup-code" placeholder="e.g. ABC123XY" style="font-family:monospace;font-size:16px;letter-spacing:0.08em;text-transform:uppercase;">' +
    '<div style="font-size:11px;color:var(--ink-muted);margin-top:4px;">The invite code from the create website form for this client.</div></div>' +
    '<div style="display:flex;gap:10px;">' +
    '<button class="dash-save" id="followup-send-btn">Send email</button>' +
    '<button id="followup-cancel-btn" style="background:none;border:1px solid var(--border);border-radius:var(--radius);padding:10px 20px;font-family:var(--sans);font-size:14px;cursor:pointer;">Cancel</button>' +
    '</div>'
  modal.appendChild(box)
  document.body.appendChild(modal)
  document.getElementById('followup-send-btn').onclick = function() { sendFollowUpEmail(email) }
  document.getElementById('followup-cancel-btn').onclick = function() { modal.remove() }
}


async function sendFollowUpEmail(email) {
  const code = document.getElementById('followup-code')?.value?.trim().toUpperCase()
  if (!code) { alert('Please enter an activation code'); return }
  try {
    const res = await fetch(API + '/admin/send-activation-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ email, activation_code: code })
    })
    const d = await res.json()
    if (d.message) { document.getElementById('followup-modal')?.remove(); alert('Activation email sent to ' + email) }
    else alert(d.error || 'Failed to send')
  } catch(e) { alert('Could not connect') }
}


function viewBriefAndGenerate(formId) {
  // Find form in loaded data - reload and show
  fetch(API + '/admin/asset-forms', { headers: { 'Authorization': 'Bearer ' + getToken() } })
    .then(r => r.json())
    .then(data => {
      const form = data.forms?.find(f => f.id === formId)
      if (!form || !form.form_data) return
      const fd = typeof form.form_data === 'string' ? JSON.parse(form.form_data) : form.form_data
      showBriefModal(form, fd)
    })
}

function showBriefModal(form, fd) {
  const existing = document.getElementById('brief-modal')
  if (existing) existing.remove()
  const plan = form.plan
  const planRank = { basic: 1, standard: 2, premium: 3 }

  // Generate the Claude prompt automatically
  const prompt = generateClaudePrompt(form.email, plan, fd)

  const modal = document.createElement('div')
  modal.id = 'brief-modal'
  modal.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(15,17,23,0.8);display:flex;align-items:center;justify-content:center;padding:20px;'
  modal.innerHTML = `
    <div style="background:white;border-radius:16px;max-width:700px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,0.3);">
      <div style="padding:24px 28px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
        <div>
          <h3 style="font-family:var(--serif);font-size:20px;">Website brief — ${form.email}</h3>
          <p style="font-size:13px;color:var(--ink-muted);margin-top:4px;">${plan} plan &middot; Submitted ${new Date(form.submitted_at).toLocaleDateString()}</p>
        </div>
        <button onclick="document.getElementById('brief-modal').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--ink-muted);">x</button>
      </div>
      <div style="padding:20px 28px;overflow-y:auto;flex:1;">
        <div style="background:var(--accent-light);border:1px solid rgba(26,107,90,0.2);border-radius:var(--radius-lg);padding:18px 20px;margin-bottom:20px;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--accent);margin-bottom:10px;">Claude build prompt — copy this</div>
          <pre id="claude-prompt-text" style="font-size:12px;line-height:1.6;white-space:pre-wrap;font-family:monospace;color:var(--ink);">${prompt}</pre>
          <button onclick="navigator.clipboard.writeText(document.getElementById('claude-prompt-text').textContent).then(()=>alert('Copied!'))" style="margin-top:12px;background:var(--accent);color:white;border:none;padding:8px 18px;border-radius:var(--radius);font-family:var(--sans);font-size:13px;cursor:pointer;">Copy prompt</button>
        </div>
        <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-muted);margin-bottom:12px;">Raw form data</div>
        ${Object.entries(fd).map(([k,v]) => v ? '<div style="display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;"><span style="font-weight:600;min-width:160px;color:var(--ink-muted);">'+k+'</span><span>'+v+'</span></div>' : '').join('')}
      </div>
    </div>`
  document.body.appendChild(modal)
}

function generateClaudePrompt(email, plan, fd) {
  const sub = (fd.subdomain || email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g,'')).substring(0,20)
  const sections = []
  if (fd.business_name) sections.push('hero, about')
  if (fd.services) sections.push('services')
  if (fd.photos) sections.push('gallery')
  if (fd.hours) sections.push('hours')
  sections.push('contact')
  if (plan === 'premium' && fd.blog) sections.push('blog')

  const editable = ['business name', 'phone', 'email', 'address', 'tagline', 'hero photo', 'about text', 'about photo', 'hours']
  if (plan !== 'basic') editable.push('services (name, description, price)', 'gallery photos (up to '+(plan==='premium'?'unlimited':'8')+')')
  if (plan === 'premium') editable.push('blog posts')

  return `Build a Sitefloa client website.

Business: ${fd.business_name || '[Business name]'}
Type: ${fd.business_type || '[Type]'}
Subdomain: ${sub}
Sections: ${sections.join(', ')}
Style: ${fd.style || 'clean and professional'}
Colours: ${fd.colours || 'green and white'}
Special: ${fd.special || 'none'}

Use the SITE_CONFIG format with:
- api: https://sitefloa.onrender.com
- subdomain: ${sub}
- schema: declare every editable field (types: text, textarea, email, tel, photo, photo_array, repeater, hours, badges)
- defaults: use the client's actual content below as defaults

On load: fetch /site/${sub}, merge with defaults, show offline page if is_active=false.
Plan visibility: basic=hero/about/hours/contact only, standard adds services/gallery, premium adds everything.
Single self-contained HTML file, no external JS dependencies.
Include the Sitefloa analytics tracking snippet.

Editable fields the client should be able to change:
${editable.map(e => '- ' + e).join('\n')}

Client content to use as defaults:
Business name: ${fd.business_name || ''}
Tagline: ${fd.tagline || ''}
Phone: ${fd.phone || ''}
Email: ${fd.email || ''}
Address: ${fd.address || ''}
Hours: ${fd.hours || ''}
About: ${fd.about || ''}
Services: ${fd.services || ''}
Style notes: ${fd.style_notes || ''}
Logo/brand colours: ${fd.colours || ''}`
}

// ══════════════════════════════════════════════════════
// ASSET FORM PAGE (client-facing)
// ══════════════════════════════════════════════════════
async function loadAssetFormPage(token) {
  try {
    const res = await fetch(API + '/asset-form/' + token)
    const data = await res.json()
    if (data.error) { showPage('home'); return }
    if (data.status === 'submitted') {
      showAssetFormSubmitted()
      return
    }
    showAssetFormPage(data.plan, token)
  } catch(e) { showPage('home') }
}

function showAssetFormPage(plan, token) {
  showPage('assetform')
  const wrap = document.getElementById('asset-form-wrap')
  if (!wrap) return
  const planRank = { basic: 0, standard: 1, premium: 2 }
  const rank = planRank[plan] || 0

  wrap.innerHTML = `
    <div style="max-width:680px;margin:0 auto;">
      <div class="section-eyebrow">Website brief</div>
      <h2 style="font-family:var(--serif);font-size:clamp(28px,4vw,42px);letter-spacing:-0.025em;margin-bottom:10px;">Tell us about your business</h2>
      <p style="font-size:16px;color:var(--ink-light);margin-bottom:36px;line-height:1.7;">Fill in as much as you can — the more detail you give us, the better your website will be. You don't need to fill in everything, just the parts you want included.</p>

      <div style="background:var(--cream);border-radius:var(--radius-lg);padding:24px 28px;margin-bottom:20px;">
        <h3 style="font-family:var(--serif);font-size:18px;margin-bottom:16px;">Basic info</h3>
        <div class="form-row">
          <div><label class="form-label">Business name *</label><input type="text" id="af-biz" class="form-input" placeholder="e.g. Jane's Plumbing"></div>
          <div><label class="form-label">Business type</label><input type="text" id="af-type" class="form-input" placeholder="e.g. Plumbing, Restaurant, Salon"></div>
        </div>
        <div class="form-row">
          <div><label class="form-label">Phone number</label><input type="tel" id="af-phone" class="form-input" placeholder="+1 (555) 000-0000"></div>
          <div><label class="form-label">Email address</label><input type="email" id="af-email" class="form-input" placeholder="hello@yourbusiness.com"></div>
        </div>
        <div><label class="form-label">Business address</label><input type="text" id="af-address" class="form-input" placeholder="123 Main St, Vancouver BC"></div>
        <div style="margin-top:14px;"><label class="form-label">Tagline / short description</label><input type="text" id="af-tagline" class="form-input" placeholder="e.g. Vancouver's most trusted plumbers"></div>
        <div style="margin-top:14px;"><label class="form-label">Tell us about your business</label><textarea id="af-about" class="form-input" rows="3" placeholder="A short paragraph about who you are, what you do, and why customers should choose you..."></textarea></div>
      </div>

      <div style="background:var(--cream);border-radius:var(--radius-lg);padding:24px 28px;margin-bottom:20px;">
        <h3 style="font-family:var(--serif);font-size:18px;margin-bottom:16px;">Hours & contact</h3>
        <div><label class="form-label">Business hours</label><textarea id="af-hours" class="form-input" rows="4" placeholder="Monday-Friday: 8am-5pm&#10;Saturday: 9am-2pm&#10;Sunday: Closed"></textarea></div>
      </div>

      ${rank >= 1 ? `
      <div style="background:var(--cream);border-radius:var(--radius-lg);padding:24px 28px;margin-bottom:20px;">
        <h3 style="font-family:var(--serif);font-size:18px;margin-bottom:6px;">Your services</h3>
        <p style="font-size:13px;color:var(--ink-muted);margin-bottom:16px;">List up to 6 services. Include a name, short description, and price if you'd like it shown.</p>
        <textarea id="af-services" class="form-input" rows="6" placeholder="1. Emergency repairs — Available 24/7 for burst pipes and leaks — From $149&#10;2. Bathroom renovations — Full plumbing for renos and new builds — From $299&#10;3. Drain cleaning — Professional drain clearing service — From $99"></textarea>
      </div>
      <div style="background:var(--cream);border-radius:var(--radius-lg);padding:24px 28px;margin-bottom:20px;">
        <h3 style="font-family:var(--serif);font-size:18px;margin-bottom:6px;">Photos</h3>
        <p style="font-size:13px;color:var(--ink-muted);margin-bottom:16px;">Paste direct links to any photos you'd like on your website (from Google Drive, Dropbox, your website, etc). Up to ${rank >= 2 ? 'unlimited' : '8'} photos.</p>
        <textarea id="af-photos" class="form-input" rows="4" placeholder="https://drive.google.com/... &#10;https://dropbox.com/..."></textarea>
      </div>` : ''}

      <div style="background:var(--cream);border-radius:var(--radius-lg);padding:24px 28px;margin-bottom:20px;">
        <h3 style="font-family:var(--serif);font-size:18px;margin-bottom:16px;">Style preferences</h3>
        <div class="form-row">
          <div>
            <label class="form-label">Website style</label>
            <select id="af-style" class="form-input">
              <option value="">No preference</option>
              <option value="clean and minimal">Clean and minimal</option>
              <option value="bold and modern">Bold and modern</option>
              <option value="warm and friendly">Warm and friendly</option>
              <option value="professional and corporate">Professional and corporate</option>
            </select>
          </div>
          <div><label class="form-label">Brand colours (if any)</label><input type="text" id="af-colours" class="form-input" placeholder="e.g. dark green and white"></div>
        </div>
        <div style="margin-top:14px;"><label class="form-label">Anything else you'd like included?</label><textarea id="af-special" class="form-input" rows="3" placeholder="Any special features, sections, or specific requests..."></textarea></div>
      </div>

      <button onclick="submitAssetForm('${token}')" class="btn btn-p" style="width:100%;padding:16px;font-size:16px;margin-bottom:40px;">Submit my website brief</button>
    </div>`
}

async function submitAssetForm(token) {
  const biz = document.getElementById('af-biz')?.value
  if (!biz) { alert('Please enter your business name'); return }
  const form_data = {
    business_name: document.getElementById('af-biz')?.value,
    business_type: document.getElementById('af-type')?.value,
    phone: document.getElementById('af-phone')?.value,
    email: document.getElementById('af-email')?.value,
    address: document.getElementById('af-address')?.value,
    tagline: document.getElementById('af-tagline')?.value,
    about: document.getElementById('af-about')?.value,
    hours: document.getElementById('af-hours')?.value,
    services: document.getElementById('af-services')?.value,
    photos: document.getElementById('af-photos')?.value,
    style: document.getElementById('af-style')?.value,
    colours: document.getElementById('af-colours')?.value,
    special: document.getElementById('af-special')?.value
  }
  try {
    const res = await fetch(API + '/asset-form/' + token + '/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ form_data })
    })
    const d = await res.json()
    if (d.message) showAssetFormSubmitted()
    else alert(d.error || 'Submission failed')
  } catch(e) { alert('Could not connect') }
}

function showAssetFormSubmitted() {
  showPage('assetform')
  const wrap = document.getElementById('asset-form-wrap')
  if (wrap) wrap.innerHTML = `
    <div style="max-width:520px;margin:0 auto;text-align:center;padding:60px 20px;">
      <div style="font-size:56px;margin-bottom:20px;">🎉</div>
      <h2 style="font-family:var(--serif);font-size:32px;margin-bottom:14px;">Brief submitted!</h2>
      <p style="font-size:16px;color:var(--ink-light);line-height:1.7;">Thank you — we've received everything we need to start building your website. We'll be in touch within one business day to confirm the next steps.</p>
    </div>`
}

// ══════════════════════════════════════════════════════
// DEPOSIT SETTINGS
// ══════════════════════════════════════════════════════
async function savePaySettings() {
  const days = document.getElementById('pay-cycle-days')?.value || 7
  const start = document.getElementById('period-start-date')?.value || new Date().toISOString().split('T')[0]
  const deposit = document.getElementById('deposit-percent')?.value || 50
  try {
    const [r1, r2] = await Promise.all([
      fetch(API + '/admin/pay-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
        body: JSON.stringify({ pay_cycle_days: parseInt(days), current_period_start: start })
      }),
      fetch(API + '/admin/deposit-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
        body: JSON.stringify({ deposit_percent: parseInt(deposit) })
      })
    ])
    const d = await r1.json()
    if (d.message) {
      const msg = document.getElementById('save-msg-pay')
      if (msg) { msg.classList.add('show'); setTimeout(() => msg.classList.remove('show'), 3000) }
    }
  } catch(e) { alert('Could not connect') }
}

// ══════════════════════════════════════════════════════
// NEW CLIENT ONBOARDING FLOW
// ══════════════════════════════════════════════════════

async function loadHoldingPage(clientData, websiteData) {
  showPage('holding')
  const wrap = document.getElementById('holding-content')
  if (!wrap) return

  const stage = clientData.onboarding_stage || 'account_created'
  const plan = clientData.plan || 'standard'
  const planNames = { basic: 'Basic', standard: 'Standard', premium: 'Premium' }
  const siteSettings = await fetch(API + '/site-settings').then(r => r.json()).catch(() => ({}))
  const depositPct = siteSettings.deposit_percent || 50
  const setupFees = { basic: siteSettings.plan_basic_setup || 199, standard: siteSettings.plan_standard_setup || 299, premium: siteSettings.plan_premium_setup || 499 }
  const monthlyFees = { basic: siteSettings.plan_basic_price || 29, standard: siteSettings.plan_standard_price || 49, premium: siteSettings.plan_premium_price || 79 }
  const setupFee = setupFees[plan]
  const depositAmt = Math.round(setupFee * depositPct / 100)
  const remainingAmt = setupFee - depositAmt

  if (stage === 'account_created' || !clientData.deposit_paid) {
    // Stage 1: Pay deposit
    wrap.innerHTML = `
      <div style="font-size:52px;margin-bottom:20px;">👋</div>
      <div style="display:inline-block;background:var(--accent-light);color:var(--accent);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:5px 14px;border-radius:20px;margin-bottom:16px;">${planNames[plan]} plan</div>
      <h2 style="font-family:var(--serif);font-size:clamp(28px,4vw,42px);letter-spacing:-0.025em;margin-bottom:14px;">Welcome to Sitefloa!</h2>
      <p style="font-size:16px;color:var(--ink-light);line-height:1.7;margin-bottom:32px;">To get started, pay your deposit and we'll begin building your website. The remaining balance is due when your site is ready to launch.</p>
      <div style="background:var(--cream);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px 28px;margin-bottom:28px;text-align:left;">
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:14px;"><span>Website build fee</span><span style="font-weight:600;">$${setupFee}</span></div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:14px;"><span>Deposit today (${depositPct}%)</span><span style="font-weight:600;color:var(--accent);">$${depositAmt}</span></div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:14px;color:var(--ink-muted);"><span>Remaining at launch</span><span>$${remainingAmt}</span></div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:14px;color:var(--ink-muted);"><span>Monthly subscription (starts 30 days after launch)</span><span>$${monthlyFees[plan]}/mo</span></div>
      </div>
      <button onclick="payDeposit(${depositAmt},'${plan}')" style="background:var(--accent);color:white;border:none;padding:16px 40px;border-radius:10px;font-family:var(--sans);font-size:16px;font-weight:500;cursor:pointer;width:100%;margin-bottom:14px;">Pay $${depositAmt} deposit securely</button>
      <p style="font-size:12px;color:var(--ink-muted);">Secured by Stripe. Your card details are never stored on our servers.</p>
      <div style="margin-top:24px;padding-top:24px;border-top:1px solid var(--border);">
        <p style="font-size:13px;color:var(--ink-muted);">Questions before paying? Get in touch:</p>
        <div style="display:flex;gap:12px;justify-content:center;margin-top:10px;flex-wrap:wrap;">
          ${window._siteEmail ? '<a href="mailto:'+window._siteEmail+'" style="display:inline-flex;align-items:center;gap:6px;background:var(--cream);border:1px solid var(--border);border-radius:8px;padding:8px 16px;font-size:13px;color:var(--ink);text-decoration:none;">📧 Email us</a>' : ''}
          ${window._sitePhone ? '<a href="tel:'+window._sitePhone.replace(/\\D/g,'')+'" style="display:inline-flex;align-items:center;gap:6px;background:var(--cream);border:1px solid var(--border);border-radius:8px;padding:8px 16px;font-size:13px;color:var(--ink);text-decoration:none;">📞 Call us</a>' : ''}
        </div>
      </div>`

  } else if (stage === 'deposit_paid' || stage === 'building') {
    var chatClientId = JSON.parse(atob(getToken().split('.')[1])).id
    wrap.innerHTML = '<div style="font-size:52px;margin-bottom:20px;">🔨</div>'
      + '<h2 style="font-family:var(--serif);font-size:clamp(26px,4vw,38px);margin-bottom:14px;">We\'re building your website!</h2>'
      + '<p style="font-size:16px;color:var(--ink-light);line-height:1.7;margin-bottom:24px;">Your deposit has been received. Our team is now working on your website. We\'ll be in touch as soon as it\'s ready to preview.</p>'
      + '<div style="background:white;border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:24px;max-width:500px;margin-left:auto;margin-right:auto;">'
      + '<div style="background:var(--cream);padding:12px 16px;border-bottom:1px solid var(--border);font-size:13px;font-weight:600;">💬 Chat with us</div>'
      + '<div id="client-chat-messages" style="height:220px;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;"></div>'
      + '<div style="padding:10px 12px;border-top:1px solid var(--border);display:flex;gap:8px;">'
      + '<input type="text" id="client-chat-input" placeholder="Ask us anything about your website..." style="flex:1;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:13px;">'
      + '<button onclick="sendClientMessage(\'' + chatClientId + '\')" style="background:var(--accent);color:white;border:none;padding:8px 16px;border-radius:var(--radius);font-family:var(--sans);font-size:13px;cursor:pointer;">Send</button>'
      + '</div></div>'
    document.getElementById('client-chat-input').addEventListener('keydown', function(e){ if(e.key==='Enter'){ sendClientMessage(chatClientId) } })
    loadClientMessages()
    setInterval(loadClientMessages, 8000)

  } else if (stage === 'preview_ready') {
    // Stage 3: Preview ready - show website in iframe + pay launch fee
    const previewHtml = websiteData?.preview_html
    if (previewHtml) {
      wrap.innerHTML = `
        <h2 style="font-family:var(--serif);font-size:clamp(24px,3vw,34px);margin-bottom:10px;">Your website is ready!</h2>
        <p style="font-size:15px;color:var(--ink-light);margin-bottom:20px;">Check everything below and let us know if you're happy with it.</p>
        <div style="border:2px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:20px;text-align:left;">
          <div style="background:var(--cream);padding:10px 16px;display:flex;gap:6px;align-items:center;border-bottom:1px solid var(--border);">
            <div style="width:10px;height:10px;border-radius:50%;background:#ff5f57;"></div>
            <div style="width:10px;height:10px;border-radius:50%;background:#febc2e;"></div>
            <div style="width:10px;height:10px;border-radius:50%;background:#28c840;"></div>
            <span style="font-size:12px;color:var(--ink-muted);margin-left:8px;">Preview of your website</span>
          </div>
          <iframe srcdoc="${previewHtml.replace(/"/g,'&quot;')}" style="width:100%;height:500px;border:none;"></iframe>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
          <button onclick="approvePreview(${remainingAmt},'${plan}')" style="background:var(--accent);color:white;border:none;padding:14px;border-radius:10px;font-family:var(--sans);font-size:15px;font-weight:500;cursor:pointer;">Yes, I love it! Pay $${remainingAmt} to launch</button>
          <button onclick="rejectPreview()" style="background:var(--cream);color:var(--ink);border:1px solid var(--border);padding:14px;border-radius:10px;font-family:var(--sans);font-size:15px;cursor:pointer;">I'd like some changes</button>
        </div>
        <p style="font-size:12px;color:var(--ink-muted);">Once you pay your remaining launch fee your website goes live and you get full dashboard access.</p>`
    } else {
      wrap.innerHTML = `
        <div style="font-size:52px;margin-bottom:20px;">⏳</div>
        <h2 style="font-family:var(--serif);font-size:clamp(26px,4vw,38px);margin-bottom:14px;">Almost there...</h2>
        <p style="font-size:16px;color:var(--ink-light);line-height:1.7;margin-bottom:24px;">We're putting the finishing touches on your website. You'll get an email as soon as your preview is ready.</p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
          ${window._siteEmail ? '<a href="mailto:'+window._siteEmail+'" style="display:inline-flex;align-items:center;gap:6px;background:var(--cream);border:1px solid var(--border);border-radius:8px;padding:10px 20px;font-size:14px;color:var(--ink);text-decoration:none;">📧 Email us</a>' : ''}
          ${window._sitePhone ? '<a href="tel:'+window._sitePhone.replace(/\\D/g,'')+'" style="display:inline-flex;align-items:center;gap:6px;background:var(--cream);border:1px solid var(--border);border-radius:8px;padding:10px 20px;font-size:14px;color:var(--ink);text-decoration:none;">📞 Call us</a>' : ''}
        </div>`
    }
  }
}

async function payDeposit(amount, plan) {
  try {
    const res = await fetch(API + '/create-deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ amount, plan })
    })
    const d = await res.json()
    if (d.url) window.location.href = d.url
    else alert(d.error || 'Could not create payment')
  } catch(e) { alert('Could not connect') }
}

async function approvePreview(amount, plan) {
  try {
    const res = await fetch(API + '/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ setup_fee: amount, monthly_fee: 0, plan, business_name: '' })
    })
    const d = await res.json()
    if (d.url) window.location.href = d.url
    else alert(d.error || 'Could not create payment')
  } catch(e) { alert('Could not connect') }
}

async function rejectPreview() {
  const msg = prompt('What changes would you like? We\'ll get back to you within one business day.')
  if (!msg) return
  try {
    await fetch(API + '/notify-downgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ from_plan: 'preview_feedback', to_plan: msg })
    })
    alert('Feedback sent! We\'ll make the changes and update your preview.')
  } catch(e) { alert('Could not connect') }
}

// ══════════════════════════════════════════════════════
// UPDATED LOGIN HANDLER - route to holding page if needed
// ══════════════════════════════════════════════════════
function routeClientAfterLogin(clientData, websiteData, plan) {
  const stage = clientData.onboarding_stage || 'account_created'
  const hasDashboard = clientData.subscription_status === 'active' && websiteData?.is_active
  if (hasDashboard) {
    // Full dashboard access
    loadClientDashboard(clientData.email, websiteData, plan)
  } else {
    // Still in onboarding
    loadHoldingPage(clientData, websiteData)
  }
}

// ══════════════════════════════════════════════════════
// MESSAGING SYSTEM
// ══════════════════════════════════════════════════════
let messagePollingInterval = null
let currentChatClientId = null

function openClientChat(clientId, clientEmail) {
  currentChatClientId = clientId
  const existing = document.getElementById('chat-modal')
  if (existing) existing.remove()

  const modal = document.createElement('div')
  modal.id = 'chat-modal'
  modal.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(15,17,23,0.8);display:flex;align-items:center;justify-content:center;padding:20px;'

  const box = document.createElement('div')
  box.style.cssText = 'background:white;border-radius:16px;width:100%;max-width:560px;height:80vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,0.3);'
  box.innerHTML = `
    <div style="padding:18px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-family:var(--serif);font-size:18px;">Chat with ${clientEmail}</div>
        <div style="font-size:12px;color:var(--ink-muted);">Messages are only available during the build process</div>
      </div>
      <button id="chat-close-btn" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--ink-muted);">x</button>
    </div>
    <div id="chat-messages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;">
      <p style="color:var(--ink-muted);font-size:13px;text-align:center;">Loading messages...</p>
    </div>
    <div style="padding:12px 16px;border-top:1px solid var(--border);">
      <div style="display:flex;gap:8px;align-items:flex-end;">
        <textarea id="chat-input" rows="2" placeholder="Type a message..." style="flex:1;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:14px;resize:none;outline:none;" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendChatMessage('${clientId}')}"></textarea>
        <button onclick="sendChatMessage('${clientId}')" style="background:var(--accent);color:white;border:none;padding:10px 18px;border-radius:var(--radius);font-family:var(--sans);font-size:13px;cursor:pointer;white-space:nowrap;">Send</button>
      </div>
      <div style="font-size:11px;color:var(--ink-muted);margin-top:6px;">Press Enter to send &middot; Shift+Enter for new line</div>
    </div>`

  modal.appendChild(box)
  document.body.appendChild(modal)

  document.getElementById('chat-close-btn').onclick = function() {
    clearInterval(messagePollingInterval)
    modal.remove()
    currentChatClientId = null
  }

  loadMessages(clientId)
  messagePollingInterval = setInterval(() => loadMessages(clientId), 5000)
}

async function loadMessages(clientId) {
  try {
    const res = await fetch(API + '/messages/' + clientId, {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    const data = await res.json()
    renderMessages(data.messages || [], clientId)
  } catch(e) { console.error(e) }
}

function renderMessages(messages, clientId) {
  const wrap = document.getElementById('chat-messages')
  if (!wrap) return
  const myId = getToken() ? JSON.parse(atob(getToken().split('.')[1])).id : null
  const wasAtBottom = wrap.scrollHeight - wrap.scrollTop <= wrap.clientHeight + 50

  if (!messages.length) {
    wrap.innerHTML = '<p style="color:var(--ink-muted);font-size:13px;text-align:center;margin-top:20px;">No messages yet. Start the conversation!</p>'
    return
  }

  wrap.innerHTML = messages.map(m => {
    const isMe = m.sender_id === myId
    return `<div style="display:flex;flex-direction:column;align-items:${isMe?'flex-end':'flex-start'};">
      <div style="max-width:80%;background:${isMe?'var(--accent)':'var(--cream)'};color:${isMe?'white':'var(--ink)'};border-radius:${isMe?'14px 14px 4px 14px':'14px 14px 14px 4px'};padding:10px 14px;font-size:14px;line-height:1.5;">
        ${m.image_url ? '<img src="'+m.image_url+'" style="max-width:200px;border-radius:8px;margin-bottom:6px;display:block;">' : ''}
        ${m.content}
      </div>
      <div style="font-size:11px;color:var(--ink-muted);margin-top:3px;">${m.sender_email} &middot; ${new Date(m.created_at).toLocaleTimeString('en-CA',{hour:'2-digit',minute:'2-digit'})}</div>
    </div>`
  }).join('')

  if (wasAtBottom) wrap.scrollTop = wrap.scrollHeight
}

async function sendChatMessage(clientId) {
  const input = document.getElementById('chat-input')
  const content = input?.value?.trim()
  if (!content) return
  try {
    const res = await fetch(API + '/messages/' + clientId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ content })
    })
    const d = await res.json()
    if (d.message) {
      if (input) input.value = ''
      loadMessages(clientId)
    }
  } catch(e) { alert('Could not send message') }
}

// Client-side chat (in holding page)
async function loadClientMessages() {
  const clientId = JSON.parse(atob(getToken().split('.')[1])).id
  if (!clientId) return
  try {
    const res = await fetch(API + '/messages/' + clientId, {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    const data = await res.json()
    renderClientMessages(data.messages || [], clientId)
  } catch(e) { console.error(e) }
}

function renderClientMessages(messages, clientId) {
  const wrap = document.getElementById('client-chat-messages')
  if (!wrap) return
  const myId = JSON.parse(atob(getToken().split('.')[1])).id
  if (!messages.length) {
    wrap.innerHTML = '<p style="color:var(--ink-muted);font-size:13px;text-align:center;">No messages yet. Ask us anything about your website!</p>'
    return
  }
  wrap.innerHTML = messages.map(m => {
    const isMe = m.sender_id === myId
    return `<div style="display:flex;flex-direction:column;align-items:${isMe?'flex-end':'flex-start'};">
      <div style="max-width:80%;background:${isMe?'var(--accent)':'var(--cream)'};color:${isMe?'white':'var(--ink)'};border-radius:${isMe?'14px 14px 4px 14px':'14px 14px 14px 4px'};padding:10px 14px;font-size:14px;line-height:1.5;">${m.content}</div>
      <div style="font-size:11px;color:var(--ink-muted);margin-top:3px;">${isMe?'You':m.sender_email} &middot; ${new Date(m.created_at).toLocaleTimeString('en-CA',{hour:'2-digit',minute:'2-digit'})}</div>
    </div>`
  }).join('')
  wrap.scrollTop = wrap.scrollHeight
}

async function sendClientMessage(clientId) {
  const input = document.getElementById('client-chat-input')
  const content = input?.value?.trim()
  if (!content) return
  try {
    const res = await fetch(API + '/messages/' + clientId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ content })
    })
    if (input) input.value = ''
    loadClientMessages()
  } catch(e) { alert('Could not send') }
}

// ══════════════════════════════════════════════════════
// ALL CHATS OVERVIEW (admin)
// ══════════════════════════════════════════════════════
async function loadAllChats() {
  const wrap = document.getElementById('all-chats-wrap')
  if (!wrap) return
  try {
    const res = await fetch(API + '/admin/all-chats', {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    const data = await res.json()
    const chats = data.chats || []
    if (!chats.length) {
      wrap.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No active chats right now.</p>'
      return
    }
    wrap.innerHTML = chats.map(c => `
      <div style="border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px 20px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;${parseInt(c.unread)>0?'background:var(--accent-light);border-color:var(--accent);':''}">
        <div>
          <div style="font-weight:600;font-size:14px;">${c.business_name||c.client_email} ${parseInt(c.unread)>0?'<span style="background:var(--accent);color:white;border-radius:20px;padding:1px 8px;font-size:11px;margin-left:6px;">'+c.unread+' new</span>':''}</div>
          <div style="font-size:12px;color:var(--ink-muted);margin-top:3px;">
            Client: ${c.client_email} &middot; Contractor: ${c.contractor_email||'Unassigned'} &middot; ${c.message_count||0} messages
          </div>
          <div style="font-size:11px;color:var(--ink-muted);">Stage: ${c.onboarding_stage} &middot; Last message: ${c.last_message?new Date(c.last_message).toLocaleDateString('en-CA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'None'}</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="action-btn" onclick="openClientChat('${c.client_id}','${c.client_email}')">Open chat</button>
          <button class="action-btn" style="background:var(--blue-light);border-color:var(--blue);color:var(--blue);" onclick="showReassignModal('${c.client_id}','${c.business_name||c.client_email}','${c.contractor_email||''}')">Reassign</button>
        </div>
      </div>`).join('')
  } catch(e) { console.error(e) }
}

// ══════════════════════════════════════════════════════
// REASSIGN CONTRACTOR
// ══════════════════════════════════════════════════════
async function showReassignModal(clientId, businessName, currentContractor) {
  // Load contractors list
  try {
    const res = await fetch(API + '/admin/manager-codes', {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    const data = await res.json()
    const contractors = data.managers || []

    const existing = document.getElementById('reassign-modal')
    if (existing) existing.remove()

    const modal = document.createElement('div')
    modal.id = 'reassign-modal'
    modal.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(15,17,23,0.75);display:flex;align-items:center;justify-content:center;padding:20px;'

    const box = document.createElement('div')
    box.style.cssText = 'background:white;border-radius:16px;max-width:440px;width:100%;padding:28px;box-shadow:0 24px 60px rgba(0,0,0,0.25);'
    box.innerHTML = `<h3 style="font-family:var(--serif);font-size:20px;margin-bottom:8px;">Reassign contractor</h3>
      <p style="font-size:13px;color:var(--ink-muted);margin-bottom:16px;">Reassigning for: <strong>${businessName}</strong><br>Current contractor: ${currentContractor||'None'}</p>
      <div class="dash-field" style="margin-bottom:16px;">
        <label>New contractor</label>
        <select id="reassign-select" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:14px;">
          ${contractors.map(c => '<option value="'+c.id+'"'+(c.email===currentContractor?' selected':'')+'>'+c.email+'</option>').join('')}
        </select>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="dash-save" id="reassign-confirm-btn">Reassign</button>
        <button id="reassign-cancel-btn" style="background:none;border:1px solid var(--border);border-radius:var(--radius);padding:10px 20px;font-family:var(--sans);font-size:14px;cursor:pointer;">Cancel</button>
      </div>`

    modal.appendChild(box)
    document.body.appendChild(modal)

    document.getElementById('reassign-cancel-btn').onclick = () => modal.remove()
    document.getElementById('reassign-confirm-btn').onclick = async function() {
      const contractorId = document.getElementById('reassign-select').value
      try {
        // Get website_id for this client
        const statsRes = await fetch(API + '/admin/stats', { headers: { 'Authorization': 'Bearer ' + getToken() } })
        const statsData = await statsRes.json()
        const client = statsData.clients?.find(c => c.id === clientId)
        if (!client?.website_id) { alert('Website not found'); return }

        const res = await fetch(API + '/admin/reassign-contractor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
          body: JSON.stringify({ website_id: client.website_id, contractor_id: contractorId })
        })
        const d = await res.json()
        if (d.message) { modal.remove(); alert('Contractor reassigned!'); loadAllChats(); loadAdminData() }
        else alert(d.error || 'Failed')
      } catch(e) { alert('Could not connect') }
    }
  } catch(e) { alert('Could not load contractors') }
}

// ══════════════════════════════════════════════════════
// MANAGER ROLE MANAGEMENT
// ══════════════════════════════════════════════════════
async function loadManagerStaffList() {
  const wrap = document.getElementById('manager-staff-list')
  if (!wrap) return
  try {
    const res = await fetch(API + '/admin/manager-staff', {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    const data = await res.json()
    const staff = data.staff || []
    if (!staff.length) { wrap.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No managers or contractors yet.</p>'; return }
    wrap.innerHTML = staff.map(s => `
      <div style="border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 18px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <div style="font-weight:600;font-size:14px;">${s.email}</div>
          <div style="font-size:12px;color:var(--ink-muted);">
            <span style="text-transform:capitalize;">${s.role}</span> &middot;
            ${s.role==='contractor'?'Commission: '+s.commission_rate+'%':'Manager rate: '+s.manager_commission_rate+'%'}
            &middot; ${s.websites_count} websites &middot; $${parseFloat(s.total_earned_all_time).toFixed(2)} earned
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          ${getRole()==='admin' ? `
            <select onchange="changeStaffRole('${s.id}',this.value)" style="padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:12px;">
              <option value="contractor" ${s.role==='contractor'?'selected':''}>Contractor</option>
              <option value="manager" ${s.role==='manager'?'selected':''}>Manager</option>
              <option value="admin" ${s.role==='admin'?'selected':''}>Admin</option>
            </select>
            <input type="number" id="rate-${s.id}" value="${s.role==='manager'?s.manager_commission_rate:s.commission_rate}" min="0" max="100" style="width:60px;padding:6px 8px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:12px;">
            <button class="action-btn" onclick="saveStaffRate('${s.id}','${s.role}')">Save rate</button>
            <button class="action-btn" onclick="closeStaffPeriod('${s.id}','${s.email}','${s.role}')">Close period</button>
          ` : ''}
        </div>
      </div>`).join('')
  } catch(e) { console.error(e) }
}

async function changeStaffRole(clientId, role) {
  if (!confirm('Change this person\'s role to ' + role + '?')) return
  try {
    const res = await fetch(API + '/admin/set-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ client_id: clientId, role })
    })
    const d = await res.json()
    if (d.message) { alert('Role updated!'); loadManagerStaffList() }
    else alert(d.error || 'Failed')
  } catch(e) { alert('Could not connect') }
}

async function saveStaffRate(clientId, role) {
  const rate = document.getElementById('rate-' + clientId)?.value
  if (!rate) return
  const endpoint = role === 'manager' ? '/admin/set-manager-rate' : '/admin/set-commission'
  try {
    const res = await fetch(API + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ client_id: clientId, rate: parseFloat(rate) })
    })
    const d = await res.json()
    if (d.message) alert('Rate saved!')
    else alert(d.error || 'Failed')
  } catch(e) { alert('Could not connect') }
}

async function closeStaffPeriod(staffId, email, role) {
  const periodStart = prompt('Period start date (YYYY-MM-DD):')
  if (!periodStart) return
  const periodEnd = new Date().toISOString().split('T')[0]
  const endpoint = role === 'manager' ? '/admin/close-manager-period' : '/admin/close-period'
  try {
    const res = await fetch(API + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ manager_id: staffId, period_start: periodStart, period_end: periodEnd })
    })
    const d = await res.json()
    if (d.message) alert('Period closed! Earned: $' + (d.earned || 0))
    else alert(d.error || 'Failed')
  } catch(e) { alert('Could not connect') }
}

// ══════════════════════════════════════════════════════
// DOMAIN REQUESTS
// ══════════════════════════════════════════════════════
function addDnsRecordRow() {
  const wrap = document.getElementById('dr-records-wrap')
  if (!wrap) return
  const row = document.createElement('div')
  row.className = 'dr-record-row'
  row.style.cssText = 'display:grid;grid-template-columns:100px 1fr 1fr auto;gap:8px;margin-bottom:8px;'
  row.innerHTML = `
    <select class="dr-type" style="padding:8px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:13px;"><option>CNAME</option><option>A</option><option>TXT</option><option>MX</option></select>
    <input type="text" class="dr-name" placeholder="Name (e.g. @)" style="padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:13px;">
    <input type="text" class="dr-content" placeholder="Content/Target" style="padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:13px;">
    <button onclick="this.closest('.dr-record-row').remove()" style="background:none;border:1px solid var(--border);border-radius:var(--radius);padding:8px 10px;cursor:pointer;color:var(--ink-muted);">✕</button>`
  wrap.appendChild(row)
}

async function submitDomainRequest() {
  const business = document.getElementById('dr-business')?.value?.trim()
  const domain = document.getElementById('dr-domain')?.value?.trim()
  if (!business || !domain) { alert('Please fill in business name and domain'); return }
  const rows = document.querySelectorAll('.dr-record-row')
  const dns_records = []
  rows.forEach(row => {
    const type = row.querySelector('.dr-type')?.value
    const name = row.querySelector('.dr-name')?.value?.trim()
    const content = row.querySelector('.dr-content')?.value?.trim()
    if (name && content) dns_records.push({ type, name, content })
  })
  if (!dns_records.length) { alert('Please add at least one DNS record'); return }
  try {
    const res = await fetch(API + '/domain-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ business_name: business, domain_name: domain, dns_records })
    })
    const d = await res.json()
    if (d.message) {
      const msg = document.getElementById('save-msg-domain-req')
      if (msg) { msg.classList.add('show'); setTimeout(() => msg.classList.remove('show'), 3000) }
      document.getElementById('dr-business').value = ''
      document.getElementById('dr-domain').value = ''
    } else alert(d.error || 'Failed')
  } catch(e) { alert('Could not connect') }
}

async function loadDomainRequests() {
  const wrap = document.getElementById('domain-requests-wrap')
  if (!wrap) return
  try {
    const res = await fetch(API + '/admin/domain-requests', {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    const data = await res.json()
    const requests = data.requests || []
    if (!requests.length) { wrap.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No domain requests yet.</p>'; return }
    wrap.innerHTML = requests.map(r => {
      const records = typeof r.dns_records === 'string' ? JSON.parse(r.dns_records) : (r.dns_records || [])
      return `<div style="border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px 20px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
          <div>
            <div style="font-weight:600;font-size:14px;">${r.domain_name} — ${r.business_name}</div>
            <div style="font-size:12px;color:var(--ink-muted);">Requested by ${r.requested_by_email} &middot; ${new Date(r.created_at).toLocaleDateString()}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:${r.status==='completed'?'var(--accent-light)':'#fff3cd'};color:${r.status==='completed'?'var(--accent)':'#856404'};">${r.status}</span>
            ${r.status!=='completed'?'<button class="action-btn" onclick="completeDomainRequest(\''+r.id+'\')">Mark complete</button>':''}
          </div>
        </div>
        <div style="margin-top:12px;overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead><tr style="background:var(--cream);"><th style="padding:6px 10px;text-align:left;border:1px solid var(--border);">Type</th><th style="padding:6px 10px;text-align:left;border:1px solid var(--border);">Name</th><th style="padding:6px 10px;text-align:left;border:1px solid var(--border);">Content</th></tr></thead>
            <tbody>${records.map(rec => '<tr><td style="padding:6px 10px;border:1px solid var(--border);">'+rec.type+'</td><td style="padding:6px 10px;border:1px solid var(--border);">'+rec.name+'</td><td style="padding:6px 10px;border:1px solid var(--border);font-family:monospace;">'+rec.content+'</td></tr>').join('')}</tbody>
          </table>
        </div>
      </div>`
    }).join('')
  } catch(e) { console.error(e) }
}

async function completeDomainRequest(id) {
  try {
    const res = await fetch(API + '/admin/domain-requests/' + id + '/complete', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    const d = await res.json()
    if (d.message) { alert('Marked complete! Contractor notified.'); loadDomainRequests() }
    else alert(d.error || 'Failed')
  } catch(e) { alert('Could not connect') }
}

async function toggleDomainEmails() {
  try {
    const res = await fetch(API + '/admin/toggle-domain-emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    const d = await res.json()
    const btn = document.getElementById('domain-email-toggle-btn')
    if (btn) btn.textContent = d.enabled ? 'Turn off domain emails' : 'Turn on domain emails'
    alert(d.message)
  } catch(e) { alert('Could not connect') }
}

// ══════════════════════════════════════════════════════
// BONUS GOALS
// ══════════════════════════════════════════════════════
async function createBonusGoal() {
  const title = document.getElementById('bonus-title')?.value?.trim()
  const target = document.getElementById('bonus-target')?.value
  const amount = document.getElementById('bonus-amount')?.value
  if (!title || !target || !amount) { alert('Please fill in all fields'); return }
  try {
    const res = await fetch(API + '/admin/bonus-goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ title, target_clients: parseInt(target), bonus_amount: parseFloat(amount) })
    })
    const d = await res.json()
    if (d.goal) {
      const msg = document.getElementById('save-msg-bonus')
      if (msg) { msg.classList.add('show'); setTimeout(() => msg.classList.remove('show'), 3000) }
      loadBonusGoalsAdmin()
    } else alert(d.error || 'Failed')
  } catch(e) { alert('Could not connect') }
}

async function loadBonusGoalsAdmin() {
  const wrap = document.getElementById('bonus-goals-wrap')
  if (!wrap) return
  try {
    const res = await fetch(API + '/admin/bonus-goals', {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    const data = await res.json()
    const goals = data.goals || []
    if (!goals.length) { wrap.innerHTML = '<p style="color:var(--ink-muted);font-size:14px;">No bonus goals set yet.</p>'; return }
    wrap.innerHTML = goals.map(g => `
      <div style="border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 18px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <div style="font-weight:600;font-size:14px;">${g.title} ${g.active?'<span style="background:var(--accent-light);color:var(--accent);padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;">ACTIVE</span>':''}</div>
          <div style="font-size:12px;color:var(--ink-muted);">Target: ${g.target_clients} new clients &middot; Bonus: $${g.bonus_amount} &middot; Set ${new Date(g.created_at).toLocaleDateString()}</div>
        </div>
        <div style="display:flex;gap:8px;">
          ${g.active ? '<button class="action-btn danger" onclick="removeBonusGoal(\''+g.id+'\')">Remove goal</button>' : ''}
        </div>
      </div>`).join('')
  } catch(e) { console.error(e) }
}

async function removeBonusGoal(id) {
  if (!confirm('Remove this bonus goal? Progress bars will reset for contractors.')) return
  try {
    const res = await fetch(API + '/admin/bonus-goals/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    const d = await res.json()
    if (d.message) loadBonusGoalsAdmin()
    else alert(d.error || 'Failed')
  } catch(e) { alert('Could not connect') }
}

async function loadBonusGoalContractor() {
  const section = document.getElementById('bonus-goal-section')
  if (!section) return
  try {
    const tokenData = JSON.parse(atob(getToken().split('.')[1]))
    const contractorId = tokenData.id
    const res = await fetch(API + '/bonus-progress/' + contractorId, {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    })
    const data = await res.json()
    if (!data.goal) { section.style.display = 'none'; return }
    section.style.display = ''
    const g = data.goal
    const pct = Math.min(100, Math.round(data.progress / g.target_clients * 100))
    const hit = data.hit
    document.getElementById('bonus-goal-display').innerHTML = `
      <div style="background:var(--cream);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px 24px;">
        <div style="font-size:18px;font-weight:700;margin-bottom:6px;">${g.title}</div>
        <div style="font-size:13px;color:var(--ink-muted);margin-bottom:16px;">Hit ${g.target_clients} new clients this period to earn a <strong style="color:var(--accent);">$${g.bonus_amount} bonus</strong></div>
        <div style="background:var(--border);border-radius:20px;height:14px;overflow:hidden;margin-bottom:8px;">
          <div style="background:${hit?'var(--accent)':'#f59e0b'};height:100%;width:${pct}%;border-radius:20px;transition:width 0.5s;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;">
          <span style="color:var(--ink-muted);">${data.progress} / ${g.target_clients} clients</span>
          <span style="font-weight:600;color:${hit?'var(--accent)':'var(--ink-muted)'};">${hit?'🎉 Goal reached! Bonus added to your pay!':'${pct}% there'}</span>
        </div>
      </div>`
  } catch(e) { console.error(e) }
}

// Load domain requests and bonus goals when admin/manager loads
const _origLoadAdminData = loadAdminData
async function loadAdminData() {
  await _origLoadAdminData()
  loadDomainRequests()
  loadBonusGoalsAdmin()
  loadManagerStaffList()
}

const _origLoadManagerData = loadManagerData
async function loadManagerData() {
  await _origLoadManagerData()
  loadDomainRequests()
  loadBonusGoalsAdmin()
  loadBonusGoalContractor()
}

// ══════════════════════════════════════════════════════
// DASHBOARD PREVIEW (MANAGERS/CONTRACTORS)
// ══════════════════════════════════════════════════════
function showManagerPreview() {
  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(15,17,23,0.85);display:flex;align-items:center;justify-content:center;padding:20px;'
  overlay.innerHTML = `
    <div style="background:white;border-radius:18px;max-width:800px;width:100%;max-height:90vh;display:flex;flex-direction:column;">
      <div style="padding:28px 32px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
        <h2 style="font-family:var(--serif);font-size:24px;">Manager Dashboard Preview</h2>
        <button style="background:none;border:none;font-size:24px;cursor:pointer;">×</button>
      </div>
      <div style="padding:24px 32px;overflow-y:auto;flex:1;font-size:13px;color:var(--ink-light);">
        <h3 style="font-weight:600;margin-bottom:12px;">Manager View Includes:</h3>
        <ul style="margin:0;padding-left:20px;">
          <li style="margin-bottom:8px;">📋 Pipeline - Manage all their leads and prospects</li>
          <li style="margin-bottom:8px;">📊 Website Briefs - Send forms to clients, track submissions</li>
          <li style="margin-bottom:8px;">💰 Earnings - Track commission and revenue brought in</li>
          <li style="margin-bottom:8px;">👥 Clients List - See all clients they created websites for</li>
          <li style="margin-bottom:8px;">🎯 Bonus Goals - Track progress toward bonus targets</li>
          <li style="margin-bottom:8px;">📱 Domain Requests - Manage domain setup requests</li>
          <li style="margin-bottom:8px;">➕ Full admin features - Everything contractors have access to, plus management tools</li>
        </ul>
      </div>
      <div style="padding:20px 32px;border-top:1px solid var(--border);display:flex;gap:12px;justify-content:flex-end;">
        <button style="background:var(--cream);border:1px solid var(--border);color:var(--ink);border-radius:var(--radius);padding:10px 16px;font-family:var(--sans);font-size:13px;cursor:pointer;">Close</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)
  overlay.addEventListener('click', function(e) {
    if(e.target === overlay) overlay.remove()
  })
  overlay.querySelector('button:first-of-type').addEventListener('click', function() { overlay.remove() })
  overlay.querySelector('button:last-of-type').addEventListener('click', function() { overlay.remove() })
}

function showContractorPreview() {
  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(15,17,23,0.85);display:flex;align-items:center;justify-content:center;padding:20px;'
  overlay.innerHTML = `
    <div style="background:white;border-radius:18px;max-width:800px;width:100%;max-height:90vh;display:flex;flex-direction:column;">
      <div style="padding:28px 32px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
        <h2 style="font-family:var(--serif);font-size:24px;">Contractor Dashboard Preview</h2>
        <button style="background:none;border:none;font-size:24px;cursor:pointer;">×</button>
      </div>
      <div style="padding:24px 32px;overflow-y:auto;flex:1;font-size:13px;color:var(--ink-light);">
        <h3 style="font-weight:600;margin-bottom:12px;">Contractor View Includes:</h3>
        <ul style="margin:0;padding-left:20px;">
          <li style="margin-bottom:8px;">📋 Pipeline - Manage their own leads and prospects</li>
          <li style="margin-bottom:8px;">📊 Website Briefs - Send website setup forms to clients</li>
          <li style="margin-bottom:8px;">💰 Earnings - Track their pay periods and total earnings</li>
          <li style="margin-bottom:8px;">👥 Clients List - See only clients they created websites for</li>
          <li style="margin-bottom:8px;">🎯 Bonus Goals - Track individual bonus progress</li>
          <li style="margin-bottom:8px;">📱 Domain Requests - Submit domain setup requests</li>
          <li style="margin-bottom:8px;">🔍 Limited Access - No admin functions, focused on project delivery</li>
        </ul>
      </div>
      <div style="padding:20px 32px;border-top:1px solid var(--border);display:flex;gap:12px;justify-content:flex-end;">
        <button style="background:var(--cream);border:1px solid var(--border);color:var(--ink);border-radius:var(--radius);padding:10px 16px;font-family:var(--sans);font-size:13px;cursor:pointer;">Close</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)
  overlay.addEventListener('click', function(e) {
    if(e.target === overlay) overlay.remove()
  })
  overlay.querySelector('button:first-of-type').addEventListener('click', function() { overlay.remove() })
  overlay.querySelector('button:last-of-type').addEventListener('click', function() { overlay.remove() })
}
