const API='https://siteflowa.onrender.com'
let currentWebsite=null,setupFee=299,monthlyFee=49,discountApplied=false,siteSettings={},demoStep=0,demoAnswers={}
var sentEmailsLog = []
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
  const name=s.company_name||'Siteflowa'
  document.title=name+' - Professional Websites for Small Business'
  document.getElementById('footer-copy').textContent='(c) 2026 '+name+'. All rights reserved.'
  if(s.tagline)document.getElementById('hero-tagline').textContent=s.tagline
  if(s.plan_basic_price){
    document.getElementById('home-stat-price').textContent='$'+s.plan_basic_price
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
      if(role==='admin'){document.getElementById('admin-email-display').textContent=email.toLowerCase();document.getElementById('admin-avatar').textContent=email.substring(0,2).toUpperCase();showPage('admin')}
      else if(role==='manager'){document.getElementById('mgr-email-display').textContent=email.toLowerCase();document.getElementById('mgr-avatar').textContent=email.substring(0,2).toUpperCase();showPage('manager')}
      else if(data.update_fee_required){document.getElementById('update-fee-amount').textContent='$'+data.update_fee_amount;document.getElementById('update-fee-total').textContent='$'+data.update_fee_amount;showPage('update-fee')}
      else if(data.subscription_status==='pending_payment'){currentWebsite=data.website;showPaymentPage(data.website,data.plan)}
      else if(data.onboarding_stage==='building'&&data.website&&!data.website.site_html){showHoldingPage('building',data.website)}
      else if(data.onboarding_stage==='review'||data.website?.site_html&&data.subscription_status!=='active'){showHoldingPage('review',data.website)}
      else loadClientDashboard(email.toLowerCase(),data.website,data.plan)
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
      else if(data.role==='manager'){document.getElementById('mgr-email-display').textContent=email.toLowerCase();showPage('manager')}
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
    loadAdminCodes();loadManagerCodes();loadInquiries('admin')
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
  if(!managers||!managers.length){wrap.innerHTML='<p style="color:var(--ink-muted);font-size:14px;">No managers yet.</p>';return}
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
        <div class="detail-item"><div class="dl">Active</div><div class="dv">${c.is_active?'OK Yes':'No No'}</div></div>
      </div>
      <p class="readonly-notice">i️ Contact admin to change pricing, plan, or delete this account.</p>
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
async function updateClientPlan(cid){
  const plan=document.getElementById('pl-'+cid).value
  try{const res=await fetch(API+'/admin/update-client-plan',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({client_id:cid,plan})});const d=await res.json();if(d.message){alert('Plan updated to '+plan);loadAdminData()}else alert(d.error||'Failed')}catch(e){alert('Could not connect')}
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
async function createManagerCode(){const code=document.getElementById('new-manager-code').value.trim();if(!code)return alert('Please enter a code');try{const res=await fetch(API+'/admin/create-manager-code',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({code})});const d=await res.json();if(d.message){document.getElementById('new-manager-code').value='';loadManagerCodes()}else alert(d.error||'Failed')}catch(e){alert('Could not connect')}}
async function createAdminCode(){const code=document.getElementById('new-admin-code').value.trim();if(!code)return alert('Please enter a code');try{const res=await fetch(API+'/admin/create-admin-code',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify({code})});const d=await res.json();if(d.message){document.getElementById('new-admin-code').value='';loadAdminCodes()}else alert(d.error||'Failed')}catch(e){alert('Could not connect')}}
async function removeManager(cid,email){if(!confirm('Remove manager access for '+email+'?'))return;try{const res=await fetch(API+'/admin/remove-manager/'+cid,{method:'DELETE',headers:{'Authorization':'Bearer '+getToken()}});const d=await res.json();if(d.message)loadAdminData();else alert(d.error||'Failed')}catch(e){alert('Could not connect')}}

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
  if (stage === 'building') {
    wrap.innerHTML = '<div style="font-size:48px;margin-bottom:20px;">🏗️</div>' +
      '<h2 style="font-family:Georgia,serif;font-size:28px;margin-bottom:12px;">We\'re building your website!</h2>' +
      '<p style="color:#4a4f5e;font-size:15px;line-height:1.6;margin-bottom:24px;">Thank you for your deposit. Our team is now working on your website. We\'ll notify you by email as soon as it\'s ready for you to review.</p>' +
      '<div style="background:#f0faf7;border:1px solid rgba(26,107,90,0.2);border-radius:12px;padding:20px;margin-bottom:24px;">' +
      '<div style="font-size:13px;font-weight:600;color:#1a6b5a;margin-bottom:8px;">What happens next?</div>' +
      '<ol style="font-size:14px;color:#4a4f5e;line-height:1.8;margin:0;padding-left:20px;">' +
      '<li>We build your website based on your brief</li>' +
      '<li>You\'ll get an email when it\'s ready to preview</li>' +
      '<li>Review it and request any changes</li>' +
      '<li>Approve it and we\'ll make it live!</li>' +
      '</ol></div>' +
      '<p style="color:#999;font-size:13px;">Business: <strong>' + (website?.business_name || '') + '</strong></p>' +
      '<button onclick="doLogout()" style="margin-top:20px;padding:10px 24px;background:#f5f5f5;border:1px solid #ddd;border-radius:8px;cursor:pointer;font-size:14px;">Log out</button>'
  } else if (stage === 'review') {
    wrap.innerHTML = '<div style="font-size:48px;margin-bottom:20px;">✨</div>' +
      '<h2 style="font-family:Georgia,serif;font-size:28px;margin-bottom:12px;">Your website is ready to review!</h2>' +
      '<p style="color:#4a4f5e;font-size:15px;line-height:1.6;margin-bottom:24px;">Take a look at your new website below. If you\'re happy with it, click the approve button to make it live!</p>' +
      (website?.subdomain ? '<a href="/sites/' + website.subdomain + '" target="_blank" style="display:inline-block;margin-bottom:24px;padding:14px 28px;background:#1a6b5a;color:white;text-decoration:none;border-radius:8px;font-weight:500;">🌐 Preview your website</a>' : '') +
      '<div style="margin-top:20px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">' +
      '<button onclick="approveWebsite()" style="padding:14px 28px;background:#1a6b5a;color:white;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-weight:500;">✅ I\'m happy — make it live!</button>' +
      '<button onclick="doLogout()" style="padding:14px 28px;background:#f5f5f5;border:1px solid #ddd;border-radius:8px;cursor:pointer;font-size:14px;">Log out</button>' +
      '</div>'
  }
  showPage('holding')
}

// ── APPROVE WEBSITE (triggers final payment) ────────
async function approveWebsite() {
  if (!confirm('Approve your website and make it live? You will be redirected to pay the remaining launch fee.')) return
  try {
    var res = await fetch(API + '/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ setup_fee: 0, monthly_fee: currentWebsite?.monthly_fee || 49, plan: currentWebsite?.plan || 'standard', business_name: currentWebsite?.business_name || '' })
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
    if (d.message) {
      alert('Deposit paid! We will start building your website now.')
      showHoldingPage('building', currentWebsite)
    } else {
      alert(d.error || 'Payment failed')
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
  
  selectBriefPlan(briefPlan)
  
  // Clear lists
  document.getElementById('bf-photos-list').innerHTML = ''
  document.getElementById('bf-services-list').innerHTML = ''
  
  // Add one empty service and photo field to start
  addBriefService()
  addBriefPhoto()
}

function selectBriefPlan(plan) {
  briefPlan = plan
  briefPhotoCount = 0
  briefServiceCount = 0
  
  var limits = briefLimits[briefPlan] || briefLimits.standard
  var planNames = { basic: 'Basic', standard: 'Standard', premium: 'Premium' }
  var planDescriptions = {
    basic: '1 page · Up to 2 photos · Free subdomain · No monthly fees',
    standard: '4 pages · Up to 8 photos · Custom domain · Domain covered up to $30/yr',
    premium: 'Unlimited pages · Unlimited photos · Custom domain · Domain covered up to $80/yr'
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
  
  // Reset photo and service lists
  var photosList = document.getElementById('bf-photos-list')
  var servicesList = document.getElementById('bf-services-list')
  if (photosList) photosList.innerHTML = ''
  if (servicesList) servicesList.innerHTML = ''
  addBriefPhoto()
  addBriefService()
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
  var div = document.createElement('div')
  div.style.cssText = 'display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;'
  div.innerHTML = '<input type="url" class="bf-photo-input" placeholder="Paste photo URL (e.g. from Google Drive, Imgur, etc)" style="padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:13px;">' +
    '<button onclick="this.parentElement.remove();briefPhotoCount--" style="background:none;border:1px solid var(--border);border-radius:var(--radius);padding:8px 12px;cursor:pointer;color:var(--ink-muted);font-size:14px;">✕</button>'
  list.appendChild(div)
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
    if (el.value.trim()) photos.push(el.value.trim())
  })
  
  var hours = {}
  var days = ['mon','tue','wed','thu','fri','sat','sun']
  var dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
  days.forEach(function(d, i) {
    var open = document.getElementById('bf-hrs-' + d + '-open')
    var close = document.getElementById('bf-hrs-' + d + '-close')
    if (open && close && open.value && close.value) {
      hours[dayNames[i]] = { open: open.value, close: close.value }
    }
  })
  
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
    notes: document.getElementById('bf-notes').value
  }
  
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
