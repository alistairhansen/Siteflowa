require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { Resend } = require('resend')
const resend = new Resend(process.env.RESEND_API_KEY)

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use(express.static(__dirname))
app.use('/sites', express.static(__dirname + '/sites'))

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

// ── MIDDLEWARE ──────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token provided' })
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next() }
  catch { res.status(401).json({ error: 'Invalid token' }) }
}
function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })
  next()
}
function staffMiddleware(req, res, next) {
  if (!['admin','manager','contractor'].includes(req.user.role)) return res.status(403).json({ error: 'Staff access required' })
  next()
}

// ── SIGNUP ──────────────────────────────────────────────
app.post('/signup', async (req, res) => {
  const { email, password, invite_code } = req.body
  const emailLower = email.toLowerCase().trim()
  try {
    // Check for manager role code (uses manager_codes but assigns 'manager' role)
    const managerRoleCode = await pool.query('SELECT * FROM manager_codes WHERE code=$1 AND used=FALSE AND assigned_to IS NOT NULL', [invite_code.trim()])
    if (managerRoleCode.rows.length > 0) {
      const existing = await pool.query('SELECT * FROM clients WHERE email=$1', [emailLower])
      if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already registered' })
      const password_hash = await bcrypt.hash(password, 10)
      const client = await pool.query(
        'INSERT INTO clients (email,password_hash,role,is_admin,subscription_status,manager_commission_rate) VALUES ($1,$2,$3,FALSE,$4,10) RETURNING id,email',
        [emailLower, password_hash, 'manager', 'active']
      )
      await pool.query('UPDATE manager_codes SET used=TRUE, assigned_to=$1 WHERE id=$2', [client.rows[0].id, managerRoleCode.rows[0].id])
      const token = jwt.sign({ id: client.rows[0].id, email: emailLower, role: 'manager' }, process.env.JWT_SECRET, { expiresIn: '30d' })
      return res.json({ message: 'Account created', token, role: 'manager' })
    }

    const adminCode = await pool.query('SELECT * FROM admin_codes WHERE code=$1 AND used=FALSE', [invite_code.trim()])
    if (adminCode.rows.length > 0) {
      const existing = await pool.query('SELECT * FROM clients WHERE email=$1', [emailLower])
      if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already registered' })
      const password_hash = await bcrypt.hash(password, 10)
      const client = await pool.query(
        'INSERT INTO clients (email,password_hash,role,is_admin,subscription_status) VALUES ($1,$2,$3,TRUE,$4) RETURNING id,email',
        [emailLower, password_hash, 'admin', 'active']
      )
      await pool.query('UPDATE admin_codes SET used=TRUE, assigned_to=$1 WHERE code=$2', [client.rows[0].id, invite_code.trim()])
      const token = jwt.sign({ id: client.rows[0].id, email: emailLower, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' })
      return res.json({ message: 'Admin account created', token, role: 'admin' })
    }

    const managerCode = await pool.query('SELECT * FROM manager_codes WHERE code=$1 AND used=FALSE', [invite_code.trim()])
    if (managerCode.rows.length > 0) {
      const existing = await pool.query('SELECT * FROM clients WHERE email=$1', [emailLower])
      if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already registered' })
      const password_hash = await bcrypt.hash(password, 10)
      const client = await pool.query(
        'INSERT INTO clients (email,password_hash,role,is_admin,subscription_status,commission_rate) VALUES ($1,$2,$3,FALSE,$4,10) RETURNING id,email',
        [emailLower, password_hash, 'contractor', 'active']
      )
      await pool.query('UPDATE manager_codes SET used=TRUE, assigned_to=$1 WHERE code=$2', [client.rows[0].id, invite_code.trim()])
      const token = jwt.sign({ id: client.rows[0].id, email: emailLower, role: 'contractor' }, process.env.JWT_SECRET, { expiresIn: '30d' })
      return res.json({ message: 'Contractor account created', token, role: 'contractor' })
    }

    const invite = await pool.query('SELECT * FROM invite_codes WHERE code=$1 AND used=FALSE', [invite_code.toUpperCase().trim()])
    if (invite.rows.length === 0) return res.status(400).json({ error: 'Invalid or already used invite code' })
    const existing = await pool.query('SELECT * FROM clients WHERE email=$1', [emailLower])
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already registered' })

    const website = await pool.query('SELECT * FROM websites WHERE id=$1', [invite.rows[0].website_id])
    const plan = website.rows[0]?.plan || 'standard'
    const password_hash = await bcrypt.hash(password, 10)
    const client = await pool.query(
      'INSERT INTO clients (email,password_hash,role,subscription_status,plan) VALUES ($1,$2,$3,$4,$5) RETURNING id,email',
      [emailLower, password_hash, 'client', 'pending_payment', plan]
    )
    await pool.query('UPDATE websites SET client_id=$1, client_email=$2 WHERE id=$3', [client.rows[0].id, emailLower, invite.rows[0].website_id])
    await pool.query('UPDATE invite_codes SET used=TRUE WHERE code=$1', [invite_code.toUpperCase().trim()])

    if (plan !== 'basic') {
      const refCode = emailLower.split('@')[0].toUpperCase().substring(0,6) + Math.floor(Math.random()*100)
      await pool.query('INSERT INTO referral_codes (code,owner_client_id) VALUES ($1,$2)', [refCode, client.rows[0].id])
    }

    const token = jwt.sign({ id: client.rows[0].id, email: emailLower, role: 'client' }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.json({ message: 'Account created', token, role: 'client', subscription_status: 'pending_payment', website: website.rows[0], plan })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Signup failed', details: err.message })
  }
})

// ── LOGIN ───────────────────────────────────────────────
app.post('/login', async (req, res) => {
  const { email, password } = req.body
  const emailLower = email.toLowerCase().trim()
  try {
    const result = await pool.query('SELECT * FROM clients WHERE email=$1', [emailLower])
    if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid email or password' })
    const client = result.rows[0]
    const valid = await bcrypt.compare(password, client.password_hash)
    if (!valid) return res.status(400).json({ error: 'Invalid email or password' })
    if (client.is_blocked) return res.status(403).json({ error: 'Your account access has been suspended. Please contact support at hello@sitefloa.com' })
    const website = await pool.query('SELECT * FROM websites WHERE client_id=$1', [client.id])
    const role = client.role || (client.is_admin ? 'admin' : 'client')
    const token = jwt.sign({ id: client.id, email: emailLower, role, is_admin: client.is_admin }, process.env.JWT_SECRET, { expiresIn: '7d' })
    const ws = website.rows[0] || null
    // Don't send full site_html on login - just a boolean flag
    const wsData = ws ? { ...ws, site_html: !!(ws.site_html && ws.site_html.length > 0) } : null
    res.json({
      message: 'Login successful', token, role,
      subscription_status: client.subscription_status,
      update_fee_required: client.update_fee_required,
      update_fee_amount: client.update_fee_amount,
      plan: client.plan || 'standard',
      is_admin: client.is_admin,
      onboarding_stage: client.onboarding_stage || 'pending_payment',
      deposit_paid: client.deposit_paid === true,
      website: wsData
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Login failed', details: err.message })
  }
})

// ── FORGOT PASSWORD ─────────────────────────────────────
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body
  const emailLower = email.toLowerCase().trim()
  try {
    const result = await pool.query('SELECT * FROM clients WHERE email=$1', [emailLower])
    if (result.rows.length === 0) {
      return res.json({ message: 'If an account exists, a reset link has been sent' })
    }
    const token = require('crypto').randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000)
    await pool.query(
      'INSERT INTO password_resets (client_id, token, expires_at) VALUES ($1, $2, $3)',
      [result.rows[0].id, token, expires]
    )
    const resetLink = `https://sitefloa.com/#reset?token=${token}`
    await resend.emails.send({
      from: 'Sitefloa <hello@sitefloa.com>',
      to: emailLower,
      subject: 'Reset your Sitefloa password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
          <h2 style="font-family:Georgia,serif;color:#0f1117;">Reset your password</h2>
          <p style="color:#4a4f5e;line-height:1.6;">We received a request to reset your Sitefloa password. Click the button below to choose a new one.</p>
          <a href="${resetLink}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#1a6b5a;color:white;text-decoration:none;border-radius:8px;font-weight:500;">Reset my password</a>
          <p style="color:#8b909e;font-size:13px;">This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #e5e3de;margin:24px 0;">
          <p style="color:#8b909e;font-size:12px;">Sitefloa - Professional websites for small business</p><p style="color:#b0b0b0;font-size:11px;">Please do not reply to this email. To get in touch, visit sitefloa.com.</p>
        </div>
      `
    })
    res.json({ message: 'If an account exists, a reset link has been sent' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── RESET PASSWORD ──────────────────────────────────────
app.post('/reset-password', async (req, res) => {
  const { token, password } = req.body
  try {
    const result = await pool.query(
      'SELECT * FROM password_resets WHERE token=$1 AND expires_at > NOW()',
      [token]
    )
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired' })
    }
    const password_hash = await bcrypt.hash(password, 10)
    await pool.query('UPDATE clients SET password_hash=$1 WHERE id=$2', [password_hash, result.rows[0].client_id])
    await pool.query('DELETE FROM password_resets WHERE token=$1', [token])
    res.json({ message: 'Password reset successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── CLIENT - dashboard data ─────────────────────────────
app.get('/my-dashboard', authMiddleware, async (req, res) => {
  try {
    const website = await pool.query('SELECT * FROM websites WHERE client_id=$1', [req.user.id])
    const refCode = await pool.query('SELECT * FROM referral_codes WHERE owner_client_id=$1', [req.user.id])
    const client = await pool.query('SELECT id,email,subscription_status,created_at,plan,update_fee_required,update_fee_amount,onboarding_stage,deposit_paid,deposit_amount,domain_name,domain_yearly_fee,suspended_at FROM clients WHERE id=$1', [req.user.id])
    const ws = website.rows[0] || null
    res.json({ client: client.rows[0], website: ws, referral_code: refCode.rows[0]||null })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── CLIENT - save website info ──────────────────────────
app.post('/my-website/save', authMiddleware, async (req, res) => {
  const { business_name, phone, address, tagline } = req.body
  try {
    await pool.query('UPDATE websites SET business_name=$1,phone=$2,address=$3,tagline=$4 WHERE client_id=$5', [business_name, phone, address, tagline, req.user.id])
    res.json({ message: 'Saved' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── CLIENT - save content ───────────────────────────────
app.post('/my-website/content', authMiddleware, async (req, res) => {
  const { content } = req.body
  try {
    await pool.query('UPDATE websites SET content=$1 WHERE client_id=$2', [JSON.stringify(content), req.user.id])
    res.json({ message: 'Content saved' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── CLIENT - pay update fee ─────────────────────────────
app.post('/pay-update-fee', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE clients SET update_fee_required=FALSE, update_fee_amount=0 WHERE id=$1', [req.user.id])
    res.json({ message: 'Update fee paid' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── CLIENT - upgrade plan ───────────────────────────────
app.post('/upgrade-plan', authMiddleware, async (req, res) => {
  const { plan } = req.body
  try {
    const client = await pool.query('SELECT plan FROM clients WHERE id=$1', [req.user.id])
    const currentPlan = client.rows[0]?.plan || 'basic'
    const planRank = { basic: 0, standard: 1, premium: 2 }
    if (planRank[plan] <= planRank[currentPlan]) {
      return res.status(400).json({ error: 'You can only upgrade to a higher plan' })
    }
    await pool.query('UPDATE clients SET plan=$1 WHERE id=$2', [plan, req.user.id])
    if (plan !== 'basic') {
      const existing = await pool.query('SELECT * FROM referral_codes WHERE owner_client_id=$1', [req.user.id])
      if (existing.rows.length === 0) {
        const email = req.user.email
        const refCode = email.split('@')[0].toUpperCase().substring(0,6) + Math.floor(Math.random()*100)
        await pool.query('INSERT INTO referral_codes (code,owner_client_id) VALUES ($1,$2)', [refCode, req.user.id])
      }
    }
    res.json({ message: 'Plan upgraded to ' + plan })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── ACTIVATE ACCOUNT ────────────────────────────────────
app.post('/activate-account', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE clients SET subscription_status=$1 WHERE id=$2', ['active', req.user.id])
    await pool.query('UPDATE websites SET is_active=TRUE WHERE client_id=$1', [req.user.id])
    res.json({ message: 'Account activated' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── NOTIFY DOWNGRADE ────────────────────────────────────
app.post('/notify-downgrade', authMiddleware, async (req, res) => {
  const { from_plan, to_plan } = req.body
  try {
    const client = await pool.query('SELECT * FROM clients WHERE id=$1', [req.user.id])
    const website = await pool.query('SELECT * FROM websites WHERE client_id=$1', [req.user.id])
    const staff = await pool.query("SELECT email FROM clients WHERE role IN ('admin','manager') AND subscription_status='active'")
    const clientInfo = client.rows[0]
    const siteInfo = website.rows[0]
    const emails = staff.rows.map(s => s.email)
    if (emails.length > 0) {
      await resend.emails.send({
        from: 'Sitefloa <hello@sitefloa.com>',
        to: emails,
        subject: 'Plan downgrade - ' + (siteInfo?.business_name || clientInfo.email),
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:40px 20px;">
            <h2 style="font-family:Georgia,serif;color:#e65100;">Plan downgrade alert</h2>
            <p style="color:#4a4f5e;">A client is downgrading from <strong>${from_plan}</strong> to <strong>${to_plan}</strong>.</p>
            <div style="background:#fff3e0;border:1px solid #e65100;border-radius:10px;padding:20px;margin:20px 0;">
              <strong>${siteInfo?.business_name || 'Unknown'}</strong><br>
              <span style="color:#4a4f5e;">${clientInfo.email}</span><br>
              <span style="color:#4a4f5e;">Domain: ${siteInfo?.subdomain || '-'}.sitefloa.com</span>
            </div>
            ${(from_plan === 'standard' || from_plan === 'premium') && to_plan === 'basic' ? `
              <div style="background:#ffebee;border:1px solid #e53935;border-radius:10px;padding:16px;margin-top:16px;">
                <strong style="color:#e53935;">Custom domain action required</strong>
                <p style="color:#4a4f5e;font-size:14px;margin-top:8px;">This client had a custom domain. Contact them about switching to a free subdomain.</p>
              </div>` : ''}
          </div>
        `
      })
    }
    res.json({ message: 'Notifications sent' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── INQUIRIES - submit ──────────────────────────────────
app.post('/inquiry', async (req, res) => {
  const { first_name, last_name, business_name, email, phone, business_type, existing_website, message, plan_interest, is_demo_request, demo_answers } = req.body
  try {
    await pool.query(
      'INSERT INTO inquiries (first_name,last_name,business_name,email,phone,business_type,existing_website,message,plan_interest,is_demo_request,demo_answers) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
      [first_name, last_name, business_name, email, phone, business_type, existing_website, message, plan_interest||'standard', is_demo_request||false, JSON.stringify(demo_answers||{})]
    )
    res.json({ message: 'Inquiry received' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── INQUIRIES - get all ─────────────────────────────────
app.get('/admin/inquiries', authMiddleware, staffMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inquiries WHERE closed=FALSE OR closed IS NULL ORDER BY created_at DESC')
    res.json({ inquiries: result.rows })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── INQUIRIES - update status ───────────────────────────
app.post('/admin/inquiry-status', authMiddleware, staffMiddleware, async (req, res) => {
  const { inquiry_id, status } = req.body
  try {
    await pool.query('UPDATE inquiries SET status=$1 WHERE id=$2', [status, inquiry_id])
    res.json({ message: 'Updated' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── CLAIM INQUIRY ───────────────────────────────────────
app.post('/admin/claim-inquiry', authMiddleware, staffMiddleware, async (req, res) => {
  const { inquiry_id } = req.body
  try {
    const existing = await pool.query('SELECT assigned_to FROM inquiries WHERE id=$1', [inquiry_id])
    if (existing.rows[0]?.assigned_to) {
      return res.status(400).json({ error: 'This inquiry has already been claimed by someone else' })
    }
    await pool.query(
      'UPDATE inquiries SET assigned_to=$1, status=$2, claimed_by_email=$3 WHERE id=$4',
      [req.user.id, 'claimed', req.user.email, inquiry_id]
    )
    res.json({ message: 'Inquiry claimed successfully' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── UNCLAIM INQUIRY ─────────────────────────────────────
app.post('/admin/unclaim-inquiry', authMiddleware, staffMiddleware, async (req, res) => {
  const { inquiry_id } = req.body
  try {
    const existing = await pool.query('SELECT assigned_to FROM inquiries WHERE id=$1', [inquiry_id])
    if (existing.rows[0]?.assigned_to !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only unclaim your own inquiries' })
    }
    await pool.query(
      'UPDATE inquiries SET assigned_to=NULL, status=$1, claimed_by_email=NULL WHERE id=$2',
      ['new', inquiry_id]
    )
    res.json({ message: 'Inquiry unclaimed and reopened' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── CLOSE INQUIRY ───────────────────────────────────────
app.post('/admin/close-inquiry', authMiddleware, staffMiddleware, async (req, res) => {
  const { inquiry_id } = req.body
  try {
    await pool.query('UPDATE inquiries SET closed=TRUE, status=$1 WHERE id=$2', ['closed', inquiry_id])
    res.json({ message: 'Inquiry closed' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── SITE SETTINGS ───────────────────────────────────────
app.get('/site-settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM site_settings LIMIT 1')
    res.json(result.rows[0] || {})
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/admin/site-settings', authMiddleware, adminMiddleware, async (req, res) => {
  const { company_name, tagline, email, phone, address, instagram, facebook, tiktok, twitter, linkedin, youtube,
    plan_basic_price, plan_standard_price, plan_premium_price,
    plan_basic_setup, plan_standard_setup, plan_premium_setup, apply_prices_to } = req.body
  try {
    await pool.query(`UPDATE site_settings SET company_name=$1,tagline=$2,email=$3,phone=$4,address=$5,instagram=$6,facebook=$7,tiktok=$8,twitter=$9,linkedin=$10,youtube=$11,plan_basic_price=$12,plan_standard_price=$13,plan_premium_price=$14,plan_basic_setup=$15,plan_standard_setup=$16,plan_premium_setup=$17,updated_at=NOW()`,
      [company_name,tagline,email,phone,address,instagram,facebook,tiktok,twitter,linkedin,youtube,
       plan_basic_price||29, plan_standard_price||49, plan_premium_price||79,
       plan_basic_setup||199, plan_standard_setup||299, plan_premium_setup||499])
    if (apply_prices_to === 'all') {
      await pool.query(`UPDATE websites SET monthly_fee=CASE
        WHEN (SELECT plan FROM clients WHERE clients.id=websites.client_id)='basic' THEN $1
        WHEN (SELECT plan FROM clients WHERE clients.id=websites.client_id)='premium' THEN $3
        ELSE $2 END
      WHERE client_id IS NOT NULL`, [plan_basic_price||29, plan_standard_price||49, plan_premium_price||79])
    }
    res.json({ message: 'Settings saved' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── ADMIN - stats ───────────────────────────────────────
app.get('/admin/stats', authMiddleware, staffMiddleware, async (req, res) => {
  const isManager = req.user.role === 'manager'
  const isContractor = req.user.role === 'contractor'
  try {
    const clientsQuery = (isManager || isContractor)
      ? `SELECT c.id, c.email, c.created_at, c.is_admin, c.role, c.subscription_status, c.plan,
             c.update_fee_required, c.update_fee_amount, c.commission_rate,
             c.domain_name, c.domain_cost, c.domain_yearly_fee,
             c.deposit_paid, c.onboarding_stage,
             w.id as website_id, w.business_name, w.subdomain, w.is_active, w.build_status,
             w.setup_fee, w.monthly_fee, w.client_email, w.sections, w.website_type,
             w.created_by, cb.email as created_by_email,
             r.code as referral_code, r.times_used as referral_uses,
             (w.site_html IS NOT NULL AND w.site_html != '') as site_html
      FROM clients c
      LEFT JOIN websites w ON w.client_id = c.id
      LEFT JOIN clients cb ON cb.id = w.created_by
      LEFT JOIN referral_codes r ON r.owner_client_id = c.id
      WHERE w.created_by = $1
      ORDER BY c.created_at DESC`
      : `SELECT c.id, c.email, c.created_at, c.is_admin, c.role, c.subscription_status, c.plan,
             c.update_fee_required, c.update_fee_amount, c.commission_rate,
             c.domain_name, c.domain_cost, c.domain_yearly_fee,
             c.deposit_paid, c.onboarding_stage,
             w.id as website_id, w.business_name, w.subdomain, w.is_active, w.build_status,
             w.setup_fee, w.monthly_fee, w.client_email, w.sections, w.website_type,
             w.created_by, cb.email as created_by_email,
             r.code as referral_code, r.times_used as referral_uses,
             (w.site_html IS NOT NULL AND w.site_html != '') as site_html
      FROM clients c
      LEFT JOIN websites w ON w.client_id = c.id
      LEFT JOIN clients cb ON cb.id = w.created_by
      LEFT JOIN referral_codes r ON r.owner_client_id = c.id
      ORDER BY c.created_at DESC`
    const clients = await pool.query(clientsQuery, (isManager || isContractor) ? [req.user.id] : [])
    const nonStaff = clients.rows.filter(c => c.role === 'client' || (!c.role && !c.is_admin))
    const activeCount = nonStaff.filter(c => c.is_active).length
    const monthlyRevenue = nonStaff.filter(c => c.is_active).reduce((sum,c) => sum + (c.monthly_fee||49), 0)
    // True total net revenue: all setup fees ever paid + monthly fees since joining
    const totalRevenue = nonStaff.reduce((sum,c) => {
      const setup = parseFloat(c.setup_fee)||299
      const monthly = parseFloat(c.monthly_fee)||49
      const joined = new Date(c.created_at)
      const months = Math.max(1, Math.round((Date.now()-joined)/(1000*60*60*24*30)))
      return sum + setup + (c.is_active ? monthly*months : 0)
    }, 0)
    // Commission paid out to all staff
    const commissionsResult = await pool.query('SELECT COALESCE(SUM(total_earned),0) as total FROM pay_periods')
    const totalCommissions = parseFloat(commissionsResult.rows[0]?.total)||0
    const netRevenue = Math.round(totalRevenue - totalCommissions)
    const managers = await pool.query(`
      SELECT c.id, c.email, c.role, c.commission_rate, c.manager_commission_rate,
        COUNT(DISTINCT w.id)::int as websites_created,
        COALESCE(SUM(DISTINCT w.setup_fee) FILTER (WHERE w.id IS NOT NULL), 0)::numeric as total_brought_in,
        COUNT(DISTINCT wb.id)::int as briefs_sent,
        COUNT(DISTINCT w_all.id)::int as websites_all_time,
        COALESCE(SUM(DISTINCT w_all.setup_fee) FILTER (WHERE w_all.id IS NOT NULL), 0)::numeric as total_all_time
      FROM clients c
      LEFT JOIN websites w ON w.created_by = c.id AND w.is_active = TRUE
      LEFT JOIN asset_forms wb ON wb.sent_by = c.id
      LEFT JOIN websites w_all ON w_all.created_by = c.id AND w_all.is_active = TRUE
      WHERE c.role IN ('manager','contractor')
      GROUP BY c.id, c.email, c.role, c.commission_rate, c.manager_commission_rate
    `)
    const monthlyChart = await pool.query(`
      SELECT DATE_TRUNC('month', c.created_at) as month,
             COUNT(*) as new_clients,
             COALESCE(SUM(w.setup_fee + w.monthly_fee), 0) as revenue
      FROM clients c
      LEFT JOIN websites w ON w.client_id = c.id
      WHERE c.role = 'client' AND c.subscription_status = 'active'
      GROUP BY DATE_TRUNC('month', c.created_at)
      ORDER BY month DESC LIMIT 6
    `)
    // Manager earnings chart data
    const managerEarnings = await pool.query(`
      SELECT p.manager_id, c.email, 
             DATE_TRUNC('week', p.period_end) as week,
             SUM(p.total_earned) as earned,
             SUM(p.websites_count) as sites
      FROM pay_periods p
      LEFT JOIN clients c ON c.id = p.manager_id
      GROUP BY p.manager_id, c.email, DATE_TRUNC('week', p.period_end)
      ORDER BY week DESC LIMIT 20
    `)

    res.json({
      clients: clients.rows,
      stats: { 
        total_clients: nonStaff.length, 
        active_websites: activeCount, 
        monthly_revenue: monthlyRevenue, 
        total_revenue: Math.round(totalRevenue),
        net_revenue: netRevenue,
        total_commissions: Math.round(totalCommissions)
      },
      managers: managers.rows,
      monthly_chart: monthlyChart.rows.reverse(),
      manager_earnings_chart: managerEarnings.rows
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── ADMIN - create website ──────────────────────────────
app.post('/admin/create-website', authMiddleware, staffMiddleware, async (req, res) => {
  try {
    const { business_name, subdomain, setup_fee, monthly_fee, plan, sections, website_type, site_html, domain_name, domain_cost, domain_yearly_fee } = req.body
    const website = await pool.query(
      'INSERT INTO websites (business_name,subdomain,is_active,setup_fee,monthly_fee,created_by,sections,website_type) VALUES ($1,$2,FALSE,$3,$4,$5,$6,$7) RETURNING id',
      [business_name, subdomain, setup_fee||299, monthly_fee||49, req.user.id, JSON.stringify(sections||{gallery:true,hours:true,contact:true}), website_type||'general']
    )
    const code = Math.random().toString(36).substring(2,8).toUpperCase()
    await pool.query('INSERT INTO invite_codes (code,website_id) VALUES ($1,$2)', [code, website.rows[0].id])
    if (site_html) {
      await pool.query('UPDATE websites SET site_html=$1 WHERE id=$2', [site_html, website.rows[0].id])
    }
    // Save domain info if provided - will be linked to client when they sign up
    if (domain_name || domain_cost) {
      await pool.query('UPDATE websites SET domain_name=$1 WHERE id=$2', [domain_name||'', website.rows[0].id])
    }
    res.json({ message: 'Website created', invite_code: code, website_id: website.rows[0].id })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── ADMIN - upload site HTML ────────────────────────────
app.post('/admin/upload-site-html', authMiddleware, staffMiddleware, async (req, res) => {
  const { website_id, site_html } = req.body
  try {
    await pool.query('UPDATE websites SET site_html=$1 WHERE id=$2', [site_html, website_id])
    res.json({ message: 'Website HTML saved' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── ADMIN - client preview ──────────────────────────────
app.get('/admin/client-preview/:clientId', authMiddleware, staffMiddleware, async (req, res) => {
  try {
    const client = await pool.query('SELECT * FROM clients WHERE id=$1', [req.params.clientId])
    const website = await pool.query('SELECT * FROM websites WHERE client_id=$1', [req.params.clientId])
    if (!client.rows[0]) return res.status(404).json({ error: 'Client not found' })
    res.json({
      client: client.rows[0],
      website: website.rows[0] || null,
      plan: client.rows[0].plan || 'standard'
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── ADMIN - update pricing ──────────────────────────────
app.post('/admin/update-pricing', authMiddleware, adminMiddleware, async (req, res) => {
  const { website_id, setup_fee, monthly_fee } = req.body
  try {
    await pool.query('UPDATE websites SET setup_fee=$1,monthly_fee=$2 WHERE id=$3', [setup_fee, monthly_fee, website_id])
    res.json({ message: 'Pricing updated' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── ADMIN - update sections ─────────────────────────────
app.post('/admin/update-sections', authMiddleware, staffMiddleware, async (req, res) => {
  const { website_id, sections } = req.body
  try {
    await pool.query('UPDATE websites SET sections=$1 WHERE id=$2', [JSON.stringify(sections), website_id])
    res.json({ message: 'Sections updated' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── ADMIN - toggle website ──────────────────────────────
app.post('/admin/toggle-website', authMiddleware, adminMiddleware, async (req, res) => {
  const { website_id, is_active } = req.body
  try {
    await pool.query('UPDATE websites SET is_active=$1 WHERE id=$2', [is_active, website_id])
    if (!is_active) await pool.query('UPDATE clients SET subscription_status=$1 WHERE id=(SELECT client_id FROM websites WHERE id=$2)', ['suspended', website_id])
    res.json({ message: 'Updated' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── ADMIN - charge update fee ───────────────────────────
app.post('/admin/charge-update-fee', authMiddleware, adminMiddleware, async (req, res) => {
  const { client_id, amount } = req.body
  try {
    await pool.query('UPDATE clients SET update_fee_required=TRUE, update_fee_amount=$1 WHERE id=$2', [amount, client_id])
    res.json({ message: 'Update fee set' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── ADMIN - update client plan ──────────────────────────
app.post('/admin/update-client-plan', authMiddleware, staffMiddleware, async (req, res) => {
  const { client_id, plan, setup_fee, monthly_fee } = req.body
  try {
    await pool.query('UPDATE clients SET plan=$1 WHERE id=$2', [plan, client_id])
    if (setup_fee || monthly_fee) {
      await pool.query(
        'UPDATE websites SET setup_fee=$1, monthly_fee=$2 WHERE client_id=$3',
        [setup_fee || 299, monthly_fee || 49, client_id]
      )
    }
    res.json({ message: 'Plan updated' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── ADMIN - update commission ───────────────────────────
app.post('/admin/update-commission', authMiddleware, adminMiddleware, async (req, res) => {
  const { client_id, commission_rate } = req.body
  try {
    await pool.query('UPDATE clients SET commission_rate=$1 WHERE id=$2', [commission_rate, client_id])
    res.json({ message: 'Commission updated' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── ADMIN - update domain info ──────────────────────────
app.post('/admin/update-domain', authMiddleware, staffMiddleware, async (req, res) => {
  const { client_id, domain_name, domain_cost, domain_yearly_fee } = req.body
  try {
    await pool.query(
      'UPDATE clients SET domain_name=$1, domain_cost=$2, domain_yearly_fee=$3 WHERE id=$4',
      [domain_name, domain_cost||0, domain_yearly_fee||0, client_id]
    )
    res.json({ message: 'Domain info saved' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── ADMIN - delete client ───────────────────────────────
app.delete('/admin/delete-client/:clientId', authMiddleware, adminMiddleware, async (req, res) => {
  const { clientId } = req.params
  try {
    await pool.query('DELETE FROM password_resets WHERE client_id=$1', [clientId])
    await pool.query('DELETE FROM referral_uses WHERE used_by_client_id=$1', [clientId])
    await pool.query('DELETE FROM referral_codes WHERE owner_client_id=$1', [clientId])
    await pool.query('DELETE FROM invite_codes WHERE website_id=(SELECT id FROM websites WHERE client_id=$1)', [clientId])
    await pool.query('DELETE FROM messages WHERE client_id=$1', [clientId])
    await pool.query('DELETE FROM pay_periods WHERE manager_id=$1', [clientId])
    await pool.query('DELETE FROM websites WHERE client_id=$1', [clientId])
    await pool.query('DELETE FROM clients WHERE id=$1', [clientId])
    res.json({ message: 'Client deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── ADMIN - manager codes ───────────────────────────────
app.post('/admin/create-manager-code', authMiddleware, adminMiddleware, async (req, res) => {
  const { code } = req.body
  try {
    await pool.query('INSERT INTO manager_codes (code,created_by) VALUES ($1,$2)', [code, req.user.id])
    res.json({ message: 'Manager code created' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('/admin/manager-codes', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const codes = await pool.query('SELECT m.*, c.email as assigned_email FROM manager_codes m LEFT JOIN clients c ON c.id=m.assigned_to ORDER BY m.created_at DESC')
    const managers = await pool.query('SELECT id,email,created_at,commission_rate FROM clients WHERE role=$1 ORDER BY created_at DESC', ['manager'])
    res.json({ codes: codes.rows, managers: managers.rows })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/admin/remove-manager/:clientId', authMiddleware, adminMiddleware, async (req, res) => {
  const { clientId } = req.params
  try {
    await pool.query('UPDATE manager_codes SET used=FALSE, assigned_to=NULL WHERE assigned_to=$1', [clientId])
    await pool.query('DELETE FROM clients WHERE id=$1 AND role=$2', [clientId, 'manager'])
    res.json({ message: 'Manager removed' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── ADMIN - admin codes ─────────────────────────────────
app.post('/admin/create-admin-code', authMiddleware, adminMiddleware, async (req, res) => {
  const { code } = req.body
  try {
    await pool.query('INSERT INTO admin_codes (code,created_by) VALUES ($1,$2)', [code, req.user.id])
    res.json({ message: 'Admin code created' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('/admin/admin-codes', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const codes = await pool.query('SELECT a.*, c.email as assigned_email FROM admin_codes a LEFT JOIN clients c ON c.id=a.assigned_to ORDER BY a.created_at DESC')
    const admins = await pool.query('SELECT id,email,created_at FROM clients WHERE role=$1 AND id!=$2 ORDER BY created_at DESC', ['admin', req.user.id])
    res.json({ codes: codes.rows, admins: admins.rows })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/admin/remove-admin/:clientId', authMiddleware, adminMiddleware, async (req, res) => {
  const { clientId } = req.params
  try {
    await pool.query('UPDATE admin_codes SET used=FALSE, assigned_to=NULL WHERE assigned_to=$1', [clientId])
    await pool.query('UPDATE clients SET role=$1, is_admin=FALSE WHERE id=$2', ['client', clientId])
    res.json({ message: 'Admin removed' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── MANAGER EARNINGS ────────────────────────────────────
app.get('/manager/earnings', authMiddleware, async (req, res) => {
  try {
    const settings = await pool.query('SELECT * FROM site_settings LIMIT 1')
    const s = settings.rows[0] || {}
    const periodStart = s.current_period_start ? new Date(s.current_period_start) : new Date(new Date().setDate(1))
    // Only count clients whose launch fee has been paid (is_active=TRUE, activated_at set)
    const websites = await pool.query(`
      SELECT w.*, c.plan, c.email as client_email, c.deposit_paid, c.onboarding_stage,
             (w.site_html IS NOT NULL AND w.site_html != '') as site_html
      FROM websites w
      LEFT JOIN clients c ON c.id = w.client_id
      WHERE w.created_by = $1
    `, [req.user.id])
    // For earnings: only count fully launched websites
    const launchedSites = websites.rows.filter(w => w.is_active && w.activated_at)
    const managerData = await pool.query('SELECT commission_rate FROM clients WHERE id=$1', [req.user.id])
    const rate = managerData.rows[0]?.commission_rate || 10
    const earnings = launchedSites.reduce((sum, w) => sum + ((w.setup_fee || 299) * rate / 100), 0)
    res.json({
      websites: websites.rows,
      commission_rate: rate,
      period_start: periodStart,
      period_end: new Date(),
      total_earnings: Math.round(earnings),
      websites_count: launchedSites.length
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── ADMIN - close pay period ────────────────────────────
app.post('/admin/close-period', authMiddleware, adminMiddleware, async (req, res) => {
  const { manager_id } = req.body
  try {
    const settings = await pool.query('SELECT * FROM site_settings LIMIT 1')
    const s = settings.rows[0] || {}
    const periodStart = s.current_period_start ? new Date(s.current_period_start) : new Date(new Date().setDate(1))
    const staffData = await pool.query('SELECT * FROM clients WHERE id=$1', [manager_id])
    const manager = staffData.rows[0]
    if (!manager) return res.status(404).json({ error: 'Staff member not found' })
    const isManager = manager.role === 'manager'
    const rate = parseFloat(manager.commission_rate || 10)

    // Own client sales this period (works for both contractors and managers)
    const websites = await pool.query(`
      SELECT w.*, c.plan, c.email as client_email
      FROM websites w LEFT JOIN clients c ON c.id = w.client_id
      WHERE w.created_by = $1 AND w.is_active = TRUE
        AND w.activated_at >= $2
    `, [manager_id, periodStart])

    // Commission on own sales (always full fee, never discounted)
    const ownEarnings = websites.rows.reduce((sum, w) => sum + ((w.setup_fee || 299) * rate / 100), 0)

    // Managers ALSO earn % of all contractor launch fees this period
    let managerOrgEarnings = 0
    let totalContractorLaunchFees = 0
    if (isManager) {
      const mgCommRate = parseFloat(manager.manager_commission_rate || 10)
      const contractorSales = await pool.query(`
        SELECT COALESCE(SUM(w.setup_fee), 0) as total
        FROM websites w
        JOIN clients c ON c.id = w.created_by
        WHERE c.role = 'contractor' AND w.is_active = TRUE AND w.activated_at >= $1
      `, [periodStart])
      totalContractorLaunchFees = parseFloat(contractorSales.rows[0]?.total || 0)
      managerOrgEarnings = Math.round(totalContractorLaunchFees * mgCommRate / 100 * 100) / 100
    }

    const earnings = ownEarnings + managerOrgEarnings
    const periodEnd = new Date()
    await pool.query(
      'INSERT INTO pay_periods (manager_id, period_start, period_end, websites_count, total_earned, commission_rate, websites_data) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [manager_id, periodStart, periodEnd, websites.rows.length, Math.round(earnings), rate, JSON.stringify({ own_sites: websites.rows, own_earnings: Math.round(ownEarnings), manager_org_earnings: Math.round(managerOrgEarnings), total_contractor_fees: Math.round(totalContractorLaunchFees) })]
    )
    await pool.query('UPDATE site_settings SET current_period_start=$1', [periodEnd])
    try {
      await resend.emails.send({
        from: 'Sitefloa <hello@sitefloa.com>',
        to: manager.email,
        subject: 'Your Sitefloa earnings - ' + periodStart.toLocaleDateString() + ' to ' + periodEnd.toLocaleDateString(),
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;">
            <h2 style="font-family:Georgia,serif;color:#0f1117;">Your earnings summary</h2>
            <p style="color:#4a4f5e;">Period: <strong>${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}</strong></p>
            <div style="background:#e8f4f1;border-radius:12px;padding:24px;margin:24px 0;text-align:center;">
              <div style="font-size:13px;color:#1a6b5a;font-weight:600;text-transform:uppercase;margin-bottom:8px;">Total earned</div>
              <div style="font-size:48px;font-family:Georgia,serif;color:#1a6b5a;">$${Math.round(earnings)}</div>
              <div style="font-size:13px;color:#4a4f5e;">${rate}% commission · ${websites.rows.length} client${websites.rows.length!==1?'s':''} your own${isManager?' + '+m.manager_commission_rate+'% of team launch fees':''}</div>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <thead><tr style="border-bottom:2px solid #e5e3de;">
                <th style="text-align:left;padding:8px 0;color:#8b909e;">Business</th>
                <th style="text-align:left;padding:8px 0;color:#8b909e;">Plan</th>
                <th style="text-align:right;padding:8px 0;color:#8b909e;">Build fee</th>
                <th style="text-align:right;padding:8px 0;color:#8b909e;">Your cut</th>
              </tr></thead>
              <tbody>
                ${websites.rows.map(w => `
                  <tr style="border-bottom:1px solid #e5e3de;">
                    <td style="padding:10px 0;">${w.business_name||'-'}</td>
                    <td style="padding:10px 0;text-transform:capitalize;">${w.plan||'standard'}</td>
                    <td style="padding:10px 0;text-align:right;">$${w.setup_fee||299}</td>
                    <td style="padding:10px 0;text-align:right;color:#1a6b5a;font-weight:600;">$${Math.round((w.setup_fee||299)*rate/100)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        `
      })
    } catch(emailErr) { console.error('Email failed:', emailErr) }
    res.json({ message: 'Period closed and receipt sent', earnings: Math.round(earnings), websites_count: websites.rows.length })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── ADMIN - pay period history ──────────────────────────
app.get('/admin/pay-periods/:managerId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pay_periods WHERE manager_id=$1 ORDER BY period_end DESC', [req.params.managerId])
    res.json({ periods: result.rows })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── ADMIN - pay settings ────────────────────────────────
app.post('/admin/pay-settings', authMiddleware, adminMiddleware, async (req, res) => {
  const { pay_cycle_days, current_period_start } = req.body
  try {
    await pool.query('UPDATE site_settings SET pay_cycle_days=$1, current_period_start=$2', [pay_cycle_days||7, current_period_start||new Date()])
    res.json({ message: 'Pay settings updated' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── SERVE CLIENT WEBSITE DATA ───────────────────────────
app.get('/site/:subdomain', async (req, res) => {
  const { subdomain } = req.params
  try {
    const result = await pool.query(`
      SELECT w.*, c.subscription_status, c.plan, c.update_fee_required
      FROM websites w
      LEFT JOIN clients c ON c.id = w.client_id
      WHERE w.subdomain = $1
    `, [subdomain])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Website not found' })
    const website = result.rows[0]
    res.json({
      is_active: website.is_active && website.subscription_status === 'active',
      business_name: website.business_name,
      subdomain: website.subdomain,
      plan: website.plan || 'standard',
      sections: website.sections || {},
      content: website.content || {},
      schema: website.schema || {}
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── SERVE CLIENT SITE HTML ──────────────────────────────
// Both /sites/ and /client/ work so preview links always resolve
async function serveClientSite(req, res) {
  const fs = require('fs')
  const { subdomain } = req.params
  try {
    const result = await pool.query('SELECT site_html FROM websites WHERE subdomain=$1', [subdomain])
    if (result.rows[0]?.site_html) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.send(result.rows[0].site_html)
    }
    const sitePath = __dirname + '/sites/' + subdomain + '.html'
    if (fs.existsSync(sitePath)) return res.sendFile(sitePath)
    res.status(404).send('<div style="font-family:sans-serif;text-align:center;padding:100px 40px;"><h1>Website not found</h1><p style="color:#888;">This website has not been set up yet.</p></div>')
  } catch (err) {
    res.status(500).send('<h1>Error loading website</h1>')
  }
}
app.get('/client/:subdomain', serveClientSite)
app.get('/sites/:subdomain', serveClientSite)


// ── LEADS / SALES PIPELINE ──────────────────────────────
app.get('/admin/leads', authMiddleware, staffMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM leads ORDER BY created_at DESC')
    res.json({ leads: result.rows })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

app.post('/admin/leads', authMiddleware, staffMiddleware, async (req, res) => {
  const { business_name, contact_name, email, phone, website_url, notes, plan_interest } = req.body
  try {
    const result = await pool.query(
      'INSERT INTO leads (business_name,contact_name,email,phone,website_url,notes,plan_interest,added_by,added_by_email) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [business_name, contact_name, email, phone, website_url, notes, plan_interest||'standard', req.user.id, req.user.email]
    )
    res.json({ lead: result.rows[0] })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

app.post('/admin/leads/:id/claim', authMiddleware, staffMiddleware, async (req, res) => {
  try {
    const lead = await pool.query('SELECT * FROM leads WHERE id=$1', [req.params.id])
    if (lead.rows[0]?.claimed_by && lead.rows[0].claimed_by !== req.user.id) {
      return res.status(400).json({ error: 'Already claimed by ' + lead.rows[0].claimed_by_email })
    }
    await pool.query('UPDATE leads SET claimed_by=$1, claimed_by_email=$2 WHERE id=$3',
      [req.user.id, req.user.email, req.params.id])
    res.json({ message: 'Claimed', claimed_by: req.user.id, claimed_by_email: req.user.email })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

app.post('/admin/leads/:id/stage', authMiddleware, staffMiddleware, async (req, res) => {
  const { stage } = req.body
  try {
    const lead = await pool.query('SELECT * FROM leads WHERE id=$1', [req.params.id])
    if (lead.rows[0]?.claimed_by && lead.rows[0].claimed_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the person who claimed this lead can update its stage' })
    }
    await pool.query('UPDATE leads SET stage=$1 WHERE id=$2', [stage, req.params.id])
    res.json({ message: 'Stage updated' })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

app.delete('/admin/leads/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM leads WHERE id=$1', [req.params.id])
    res.json({ message: 'Lead deleted' })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

// ── ASSET FORMS ─────────────────────────────────────────
app.post('/admin/send-asset-form', authMiddleware, staffMiddleware, async (req, res) => {
  const { email, plan } = req.body
  try {
    const token = require('crypto').randomBytes(24).toString('hex')
    await pool.query(
      'INSERT INTO asset_forms (email, plan, token, status, sent_by, sent_by_email) VALUES ($1,$2,$3,$4,$5,$6)',
      [email, plan||'standard', token, 'sent', req.user.id, req.user.email]
    )
    const formUrl = 'https://sitefloa.com?assetform=' + token
    await resend.emails.send({
      from: 'Sitefloa <hello@sitefloa.com>',
      to: email,
      subject: 'Your Sitefloa website brief form',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:40px 20px;">
          <h2 style="font-family:Georgia,serif;color:#0f1117;">Let's build your website</h2>
          <p style="color:#4a4f5e;line-height:1.6;">We're ready to start building your website. Fill in the form below with your business details and we'll take care of the rest.</p>
          <a href="${formUrl}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#1a6b5a;color:white;text-decoration:none;border-radius:8px;font-weight:500;">Fill in your website brief</a>
          <p style="color:#8b909e;font-size:13px;">This link is unique to you. Once submitted we'll get started on your website right away.</p>
        </div>
      `
    })
    res.json({ message: 'Form sent to ' + email })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

app.get('/asset-form/:token', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM asset_forms WHERE token=$1', [req.params.token])
    if (!result.rows[0]) return res.status(404).json({ error: 'Form not found' })
    res.json(result.rows[0])
  } catch(err) { res.status(500).json({ error: err.message }) }
})

app.post('/asset-form/:token/submit', async (req, res) => {
  const { form_data } = req.body
  try {
    await pool.query(
      'UPDATE asset_forms SET form_data=$1, status=$2, submitted_at=NOW() WHERE token=$3',
      [JSON.stringify(form_data), 'submitted', req.params.token]
    )
    // notify staff
    const staff = await pool.query("SELECT email FROM clients WHERE role IN ('admin','manager') AND subscription_status='active'")
    const form = await pool.query('SELECT * FROM asset_forms WHERE token=$1', [req.params.token])
    if (staff.rows.length > 0) {
      await resend.emails.send({
        from: 'Sitefloa <hello@sitefloa.com>',
        to: staff.rows.map(s => s.email),
        subject: 'Website brief submitted - ' + form.rows[0].email,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:40px 20px;">
            <h2 style="font-family:Georgia,serif;">Website brief received</h2>
            <p><strong>${form.rows[0].email}</strong> has submitted their website brief (${form.rows[0].plan} plan).</p>
            <p>Log in to your dashboard to view the full brief and start building.</p>
          </div>
        `
      })
    }
    res.json({ message: 'Form submitted successfully' })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

app.get('/admin/asset-forms', authMiddleware, staffMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM asset_forms ORDER BY created_at DESC')
    res.json({ forms: result.rows })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

// ── DEPOSIT SETTINGS ────────────────────────────────────
app.post('/admin/deposit-settings', authMiddleware, adminMiddleware, async (req, res) => {
  const { deposit_percent } = req.body
  try {
    await pool.query('UPDATE site_settings SET deposit_percent=$1', [deposit_percent||50])
    res.json({ message: 'Deposit settings saved' })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

// ── CREATE DEPOSIT CHECKOUT ─────────────────────────────
app.post('/create-deposit', authMiddleware, async (req, res) => {
  const { amount, plan } = req.body
  try {
    const client = await pool.query('SELECT * FROM clients WHERE id=$1', [req.user.id])
    const clientData = client.rows[0]
    let customerId = clientData.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({ email: clientData.email, metadata: { client_id: req.user.id } })
      customerId = customer.id
      await pool.query('UPDATE clients SET stripe_customer_id=$1 WHERE id=$2', [customerId, req.user.id])
    }
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'cad',
          product_data: { name: 'Sitefloa Website Deposit', description: 'Deposit to begin building your website. Remaining balance due at launch.' },
          unit_amount: Math.round(amount * 100)
        },
        quantity: 1
      }],
      mode: 'payment',
      // Stripe Adaptive Pricing: shows customers their local currency, you receive CAD
      currency_conversion: { enabled: true },
      payment_intent_data: { metadata: { client_id: req.user.id, payment_type: 'deposit', plan } },
      success_url: 'https://sitefloa.com?deposit=success',
      cancel_url: 'https://sitefloa.com?deposit=cancelled',
      metadata: { client_id: req.user.id, payment_type: 'deposit' }
    })
    res.json({ url: session.url })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

// ── SEND ACTIVATION CODE ────────────────────────────────
app.post('/admin/send-activation', authMiddleware, adminMiddleware, async (req, res) => {
  const { client_id } = req.body
  try {
    const code = Math.random().toString(36).substring(2,10).toUpperCase()
    await pool.query('UPDATE clients SET activation_code=$1 WHERE id=$2', [code, client_id])
    const client = await pool.query('SELECT * FROM clients WHERE id=$1', [client_id])
    await resend.emails.send({
      from: 'Sitefloa <hello@sitefloa.com>',
      to: client.rows[0].email,
      subject: 'Your Sitefloa website is ready!',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:40px 20px;">
          <h2 style="font-family:Georgia,serif;color:#1a6b5a;">Your website is ready to launch!</h2>
          <p style="color:#4a4f5e;line-height:1.6;">We've finished building your website. Log in to preview it and pay your launch fee to go live.</p>
          <p style="color:#4a4f5e;">Your activation code: <strong style="font-size:20px;letter-spacing:0.1em;">${code}</strong></p>
          <a href="https://sitefloa.com" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#1a6b5a;color:white;text-decoration:none;border-radius:8px;font-weight:500;">Preview your website</a>
        </div>
      `
    })
    res.json({ message: 'Activation code sent' })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

// ── UPLOAD PREVIEW SITE ─────────────────────────────────
app.post('/admin/upload-preview', authMiddleware, staffMiddleware, async (req, res) => {
  const { client_id, preview_html } = req.body
  try {
    await pool.query('UPDATE websites SET preview_html=$1 WHERE client_id=$2', [preview_html, client_id])
    await pool.query('UPDATE clients SET onboarding_stage=$1 WHERE id=$2', ['preview_ready', client_id])
    res.json({ message: 'Preview uploaded' })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

// ── SERVE BY CUSTOM DOMAIN ──────────────────────────────
app.get('/client-domain/:domain', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT w.site_html, w.subdomain FROM websites w JOIN clients c ON c.id=w.client_id WHERE c.domain_name=$1 AND w.is_active=TRUE',
      [req.params.domain]
    )
    if (result.rows[0]?.site_html) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.send(result.rows[0].site_html)
    }
    res.status(404).send('<h1>Website not found</h1>')
  } catch(err) { res.status(500).send('<h1>Error</h1>') }
})

// ── SEND ACTIVATION EMAIL ───────────────────────────────
app.post('/admin/send-activation-email', authMiddleware, staffMiddleware, async (req, res) => {
  const { email, activation_code } = req.body
  try {
    const siteSettings = await pool.query('SELECT * FROM site_settings LIMIT 1')
    const s = siteSettings.rows[0] || {}
    const companyName = s.company_name || 'Sitefloa'
    await resend.emails.send({
      from: 'Sitefloa <hello@sitefloa.com>',
      to: email,
      subject: 'Your website is ready — create your account',
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;">
          <h2 style="font-family:Georgia,serif;color:#1a6b5a;">Your website is ready to preview!</h2>
          <p style="color:#4a4f5e;line-height:1.6;">Great news — we've finished building your website and it's ready for you to review. Here's how to access it:</p>
          <div style="background:#f0f7f5;border-radius:12px;padding:24px;margin:24px 0;">
            <div style="font-size:13px;font-weight:700;color:#1a6b5a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:16px;">How to view your website</div>
            <ol style="color:#4a4f5e;font-size:14px;line-height:2;padding-left:20px;">
              <li>Go to <a href="https://sitefloa.com" style="color:#1a6b5a;">sitefloa.onrender.com</a></li>
              <li>Click the <strong>Client Login</strong> button in the top right</li>
              <li>Click <strong>Create account</strong> and enter your email and a password</li>
              <li>When asked for your activation code, enter: <strong style="font-size:18px;letter-spacing:0.1em;color:#1a6b5a;">${activation_code}</strong></li>
              <li>You'll be able to see a live preview of your website</li>
            </ol>
          </div>
          <p style="color:#4a4f5e;font-size:14px;line-height:1.6;">Once you've had a look, you can approve it to go live or request any changes directly from your account.</p>
          <a href="https://sitefloa.com" style="display:inline-block;margin:20px 0;padding:14px 28px;background:#1a6b5a;color:white;text-decoration:none;border-radius:8px;font-weight:500;">View my website preview</a>
          <hr style="border:none;border-top:1px solid #e5e3de;margin:24px 0;">
          <p style="color:#8b909e;font-size:12px;">${companyName} — Professional websites for small business</p>
        </div>
      `
    })
    res.json({ message: 'Activation email sent to ' + email })
  } catch(err) { res.status(500).json({ error: err.message }) }
})


// ── MESSAGES ─────────────────────────────────────────────
app.get('/messages/:clientId', authMiddleware, async (req, res) => {
  try {
    const { clientId } = req.params
    // clients can only get their own messages
    if (req.user.role === 'client' && req.user.id !== clientId) {
      return res.status(403).json({ error: 'Access denied' })
    }
    const msgs = await pool.query(
      'SELECT * FROM messages WHERE client_id=$1 ORDER BY created_at ASC',
      [clientId]
    )
    // mark as read
    if (req.user.role === 'client') {
      await pool.query('UPDATE messages SET read_by_client=TRUE WHERE client_id=$1', [clientId])
    } else {
      await pool.query('UPDATE messages SET read_by_staff=TRUE WHERE client_id=$1', [clientId])
    }
    res.json({ messages: msgs.rows })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

app.post('/messages/:clientId', authMiddleware, async (req, res) => {
  const { clientId } = req.params
  const { content, image_url } = req.body
  try {
    // verify client exists and chat is still open
    const client = await pool.query('SELECT * FROM clients WHERE id=$1', [clientId])
    if (!client.rows[0]) return res.status(404).json({ error: 'Client not found' })
    // chat only available while deposit paid but launch fee not yet paid
    const stage = client.rows[0].onboarding_stage
    if (req.user.role === 'client' && !['deposit_paid','building','preview_ready'].includes(stage)) {
      return res.status(400).json({ error: 'Chat is not available at this stage' })
    }
    const msg = await pool.query(
      'INSERT INTO messages (client_id,sender_id,sender_email,sender_role,content,image_url) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [clientId, req.user.id, req.user.email, req.user.role, content||'', image_url||null]
    )
    res.json({ message: msg.rows[0] })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

app.get('/admin/all-chats', authMiddleware, staffMiddleware, async (req, res) => {
  try {
    const chats = await pool.query(`
      SELECT 
        c.id as client_id, c.email as client_email, c.plan, c.onboarding_stage,
        w.business_name, w.subdomain, w.created_by,
        cb.email as contractor_email,
        COUNT(m.id) as message_count,
        MAX(m.created_at) as last_message,
        SUM(CASE WHEN m.read_by_staff=FALSE AND m.sender_role='client' THEN 1 ELSE 0 END) as unread
      FROM clients c
      LEFT JOIN websites w ON w.client_id = c.id
      LEFT JOIN clients cb ON cb.id = w.created_by
      LEFT JOIN messages m ON m.client_id = c.id
      WHERE c.role = 'client' 
        AND c.onboarding_stage IN ('deposit_paid','building','preview_ready')
      GROUP BY c.id, c.email, c.plan, c.onboarding_stage, w.business_name, w.subdomain, w.created_by, cb.email
      ORDER BY last_message DESC NULLS LAST
    `)
    res.json({ chats: chats.rows })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

// ── REASSIGN CONTRACTOR ──────────────────────────────────
app.post('/admin/reassign-contractor', authMiddleware, adminMiddleware, async (req, res) => {
  const { website_id, contractor_id } = req.body
  try {
    await pool.query('UPDATE websites SET created_by=$1 WHERE id=$2', [contractor_id, website_id])
    res.json({ message: 'Contractor reassigned' })
  } catch(err) { res.status(500).json({ error: err.message }) }
})


// ── MANAGER ROLE ROUTES ──────────────────────────────────
app.post('/admin/set-blocked', authMiddleware, adminMiddleware, async (req, res) => {
  const { client_id, blocked } = req.body
  try {
    await pool.query('UPDATE clients SET is_blocked=$1 WHERE id=$2', [blocked, client_id])
    res.json({ message: blocked ? 'Account blocked' : 'Account unblocked' })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

app.post('/admin/set-role', authMiddleware, adminMiddleware, async (req, res) => {
  const { client_id, role } = req.body
  if (!['admin','manager','contractor','client'].includes(role)) return res.status(400).json({ error: 'Invalid role' })
  try {
    await pool.query('UPDATE clients SET role=$1 WHERE id=$2', [role, client_id])
    res.json({ message: 'Role updated to ' + role })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

app.post('/admin/set-manager-rate', authMiddleware, adminMiddleware, async (req, res) => {
  const { client_id, rate } = req.body
  try {
    await pool.query('UPDATE clients SET manager_commission_rate=$1 WHERE id=$2', [rate, client_id])
    res.json({ message: 'Manager rate updated' })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

app.get('/admin/manager-staff', authMiddleware, async (req, res) => {
  // managers and admins can see contractors
  if (!['admin','manager'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' })
  try {
    const result = await pool.query(`
      SELECT c.id, c.email, c.role, c.commission_rate, c.manager_commission_rate,
        COUNT(w.id) as websites_count,
        COALESCE(SUM(pp.total_earned),0) as total_earned_all_time
      FROM clients c
      LEFT JOIN websites w ON w.created_by = c.id
      LEFT JOIN pay_periods pp ON pp.manager_id = c.id
      WHERE c.role IN ('contractor','manager')
      GROUP BY c.id
      ORDER BY c.role, c.email
    `)
    res.json({ staff: result.rows })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

// Manager pay periods - same as contractor but with manager_commission_rate
app.post('/admin/close-manager-period', authMiddleware, adminMiddleware, async (req, res) => {
  const { manager_id, period_start, period_end } = req.body
  try {
    const mgr = await pool.query('SELECT * FROM clients WHERE id=$1', [manager_id])
    const m = mgr.rows[0]
    if (!m) return res.status(404).json({ error: 'Manager not found' })

    // Get all contractor commissions in this period
    const commissions = await pool.query(
      'SELECT SUM(total_earned) as total FROM pay_periods WHERE period_start>=$1 AND period_end<=$2',
      [period_start, period_end]
    )
    const totalCommissions = parseFloat(commissions.rows[0]?.total || 0)
    const rate = parseFloat(m.manager_commission_rate || 10)
    const earned = Math.round(totalCommissions * rate / 100 * 100) / 100

    // Count new clients this period
    const newClients = await pool.query(
      "SELECT COUNT(*) as count FROM clients WHERE created_at>=$1 AND created_at<=$2 AND role='client'",
      [period_start, period_end]
    )

    await pool.query(
      'INSERT INTO pay_periods (manager_id, period_start, period_end, websites_count, total_earned, commission_rate, websites_data) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [manager_id, period_start, period_end, newClients.rows[0].count, earned, rate, JSON.stringify({ type: 'manager', total_commissions: totalCommissions, rate, new_clients: newClients.rows[0].count })]
    )

    const siteSettings = await pool.query('SELECT * FROM site_settings LIMIT 1')
    const s = siteSettings.rows[0] || {}

    await resend.emails.send({
      from: 'Sitefloa <hello@sitefloa.com>',
      to: m.email,
      subject: 'Your Sitefloa manager earnings receipt',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:40px 20px;">
          <h2 style="font-family:Georgia,serif;color:#1a6b5a;">Manager earnings receipt</h2>
          <p>Period: <strong>${new Date(period_start).toLocaleDateString()} – ${new Date(period_end).toLocaleDateString()}</strong></p>
          <div style="background:#f0f7f5;border-radius:12px;padding:20px;margin:20px 0;">
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e0ede9;"><span>Total contractor commissions this period</span><span>$${totalCommissions.toFixed(2)}</span></div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e0ede9;"><span>Your rate</span><span>${rate}%</span></div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e0ede9;"><span>New clients this period</span><span>${newClients.rows[0].count}</span></div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:700;font-size:18px;color:#1a6b5a;"><span>Your earnings</span><span>$${earned.toFixed(2)}</span></div>
          </div>
          <p style="color:#8b909e;font-size:12px;">Sitefloa — Please do not reply to this email.</p>
        </div>`
    })
    res.json({ message: 'Manager period closed', earned })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

// ── DOMAIN REQUESTS ──────────────────────────────────────
app.post('/domain-request', authMiddleware, async (req, res) => {
  const { website_id, business_name, domain_name, dns_records } = req.body
  try {
    const result = await pool.query(
      'INSERT INTO domain_requests (requested_by, requested_by_email, website_id, business_name, domain_name, dns_records) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [req.user.id, req.user.email, website_id, business_name, domain_name, JSON.stringify(dns_records)]
    )
    // Email all admins and managers who want notifications
    const staff = await pool.query(
      "SELECT email FROM clients WHERE role IN ('admin','manager') AND (notify_domain_requests IS NULL OR notify_domain_requests=TRUE)"
    )
    if (staff.rows.length > 0) {
      const dnsTable = dns_records.map(r => `<tr><td style="padding:6px 12px;border:1px solid #e0ede9;">${r.type}</td><td style="padding:6px 12px;border:1px solid #e0ede9;">${r.name}</td><td style="padding:6px 12px;border:1px solid #e0ede9;">${r.content}</td></tr>`).join('')
      await resend.emails.send({
        from: 'Sitefloa <hello@sitefloa.com>',
        to: staff.rows.map(s => s.email),
        subject: 'Domain request — ' + domain_name,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;">
            <h2 style="font-family:Georgia,serif;color:#1a6b5a;">New domain request</h2>
            <p><strong>${req.user.email}</strong> has requested a domain for <strong>${business_name}</strong>.</p>
            <p>Domain: <strong>${domain_name}</strong></p>
            <p style="font-weight:600;margin-top:20px;">DNS records to add in Cloudflare:</p>
            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;">
              <thead><tr style="background:#f0f7f5;"><th style="padding:8px 12px;border:1px solid #e0ede9;text-align:left;">Type</th><th style="padding:8px 12px;border:1px solid #e0ede9;text-align:left;">Name</th><th style="padding:8px 12px;border:1px solid #e0ede9;text-align:left;">Content</th></tr></thead>
              <tbody>${dnsTable}</tbody>
            </table>
            <p style="margin-top:20px;">Log in to your dashboard to mark this as complete once done.</p>
            <p style="color:#8b909e;font-size:12px;">Please do not reply to this email.</p>
          </div>`
      })
    }
    res.json({ message: 'Domain request submitted', request: result.rows[0] })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

app.get('/admin/domain-requests', authMiddleware, async (req, res) => {
  if (!['admin','manager'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' })
  try {
    const result = await pool.query('SELECT * FROM domain_requests ORDER BY created_at DESC')
    res.json({ requests: result.rows })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

app.post('/admin/domain-requests/:id/complete', authMiddleware, staffMiddleware, async (req, res) => {
  if (!['admin','manager'].includes(req.user.role)) return res.status(403).json({ error: 'Only admins and managers can mark domain requests complete' })
  const { domain_cost, domain_yearly_fee } = req.body
  try {
    const req2 = await pool.query('SELECT * FROM domain_requests WHERE id=$1', [req.params.id])
    const dr = req2.rows[0]
    if (!dr) return res.status(404).json({ error: 'Not found' })
    await pool.query(`UPDATE domain_requests SET status='completed', domain_cost=$1, domain_yearly_fee=$2 WHERE id=$3`,
      [domain_cost || 0, domain_yearly_fee || 0, req.params.id])
    // Update client's domain cost too if we have a website_id
    if (dr.website_id && (domain_cost || domain_yearly_fee)) {
      const w = await pool.query('SELECT client_id FROM websites WHERE id=$1', [dr.website_id])
      if (w.rows[0]) {
        await pool.query('UPDATE clients SET domain_cost=$1, domain_yearly_fee=$2 WHERE id=$3',
          [domain_cost || 0, domain_yearly_fee || 0, w.rows[0].client_id])
      }
    }
    if (dr.requested_by_email) {
      const costLine = domain_cost ? '<p><strong>Domain setup cost:</strong> $' + domain_cost + '</p>' : ''
      const yearlyLine = domain_yearly_fee ? '<p><strong>Annual renewal:</strong> $' + domain_yearly_fee + '/year</p>' : ''
      resend.emails.send({
        from: 'Sitefloa <hello@sitefloa.com>',
        to: dr.requested_by_email,
        subject: 'Domain approved — ' + (dr.domain_name || ''),
        html: '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:40px 20px;"><h2 style="font-family:Georgia,serif;color:#1a6b5a;">Domain is ready! ✅</h2><p>The domain <strong>' + dr.domain_name + '</strong> for <strong>' + dr.business_name + '</strong> has been set up and approved.</p>' + costLine + yearlyLine + '<p>Log in to your dashboard to connect it to the client website.</p><a href="https://sitefloa.com" style="display:inline-block;margin:20px 0;padding:12px 24px;background:#1a6b5a;color:white;text-decoration:none;border-radius:8px;">View Dashboard →</a></div>'
      }).catch(e => console.error('Domain email error:', e))
    }
    res.json({ message: 'Domain request marked complete' })
  } catch(err) { console.error('Domain complete error:', err); res.status(500).json({ error: err.message }) }
})

app.post('/admin/toggle-domain-emails', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const current = await pool.query('SELECT notify_domain_requests FROM clients WHERE id=$1', [req.user.id])
    const newVal = !(current.rows[0]?.notify_domain_requests !== false)
    await pool.query('UPDATE clients SET notify_domain_requests=$1 WHERE id=$2', [newVal, req.user.id])
    res.json({ message: newVal ? 'Domain request emails enabled' : 'Domain request emails disabled', enabled: newVal })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

// ── BONUS GOALS ──────────────────────────────────────────
app.get('/bonus-goals', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bonus_goals WHERE active=TRUE ORDER BY created_at DESC LIMIT 1')
    res.json({ goal: result.rows[0] || null })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

app.get('/admin/bonus-goals', authMiddleware, async (req, res) => {
  if (!['admin','manager'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' })
  try {
    const result = await pool.query('SELECT * FROM bonus_goals WHERE active=TRUE ORDER BY created_at DESC')
    res.json({ goals: result.rows })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

app.post('/admin/bonus-goals', authMiddleware, async (req, res) => {
  if (!['admin','manager'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' })
  const { title, target_clients, bonus_amount, end_date } = req.body
  try {
    // Deactivate existing goals
    await pool.query('UPDATE bonus_goals SET active=FALSE')
    const result = await pool.query(
      'INSERT INTO bonus_goals (title, target_clients, bonus_amount, end_date, created_by, active, period_start) VALUES ($1,$2,$3,$4,$5,TRUE,NOW()) RETURNING *',
      [title, target_clients, bonus_amount, end_date || null, req.user.id]
    )
    res.json({ goal: result.rows[0] })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

app.delete('/admin/bonus-goals/:id', authMiddleware, async (req, res) => {
  if (!['admin','manager'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' })
  try {
    await pool.query('DELETE FROM bonus_goals WHERE id=$1', [req.params.id])
    res.json({ message: 'Bonus goal removed' })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

app.get('/bonus-progress/:contractorId', authMiddleware, async (req, res) => {
  try {
    const goal = await pool.query('SELECT * FROM bonus_goals WHERE active=TRUE LIMIT 1')
    if (!goal.rows[0]) return res.json({ goal: null, progress: 0 })
    const g = goal.rows[0]
    // Count websites added by this contractor since goal was created
    const progress = await pool.query(
      'SELECT COUNT(*) as count FROM websites WHERE created_by=$1 AND created_at>=$2',
      [req.params.contractorId, g.period_start]
    )
    const count = parseInt(progress.rows[0].count)
    const hit = count >= g.target_clients
    // If hit and not yet paid, add bonus to their pay period
    if (hit) {
      const alreadyPaid = await pool.query(
        "SELECT id FROM pay_periods WHERE manager_id=$1 AND websites_data::text LIKE '%bonus_paid%' AND period_start>=$2",
        [req.params.contractorId, g.period_start]
      )
    }
    res.json({ goal: g, progress: count, hit })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

// ── HEALTH CHECK ────────────────────────────────────────
app.get('/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ message: 'Sitefloa server running!' }) }
  catch (err) { res.status(500).json({ error: 'DB connection failed' }) }
})

const PORT = process.env.PORT || 3000

// ── STRIPE ───────────────────────────────────────────────
const Stripe = require('stripe')
const stripe = Stripe(process.env.STRIPE_SECRET_KEY)

// Create checkout session for setup fee
app.post('/create-checkout', authMiddleware, async (req, res) => {
  const { setup_fee, monthly_fee, plan, business_name } = req.body
  try {
    const client = await pool.query('SELECT * FROM clients WHERE id=$1', [req.user.id])
    const website = await pool.query('SELECT * FROM websites WHERE client_id=$1', [req.user.id])
    const clientData = client.rows[0]
    const websiteData = website.rows[0]

    // Create or get Stripe customer
    let customerId = clientData.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: clientData.email,
        name: business_name || clientData.email,
        metadata: { client_id: req.user.id }
      })
      customerId = customer.id
      await pool.query('UPDATE clients SET stripe_customer_id=$1 WHERE id=$2', [customerId, req.user.id])
    }

    const planNames = { basic: 'Basic', standard: 'Standard', premium: 'Premium' }
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: 'Sitefloa ' + (planNames[plan] || 'Standard') + ' Plan — Website Setup',
              description: 'One-time website build fee for ' + (business_name || 'your business'),
            },
            unit_amount: Math.round(setup_fee * 100),
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: 'Sitefloa Monthly Subscription',
              description: 'First month free — billing starts 30 days from today',
            },
            unit_amount: 0,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }
      ],
      mode: 'subscription',
      // Note: currency_conversion only works with payment mode, not subscriptions
      // Stripe automatically handles international cards in CAD
      subscription_data: {
        trial_period_days: 30,
        metadata: { client_id: req.user.id, plan: plan }
      },
      success_url: 'https://sitefloa.com?payment=success&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://sitefloa.com?payment=cancelled',
      metadata: { client_id: req.user.id, plan: plan }
    })

    res.json({ url: session.url, session_id: session.id })
  } catch (err) {
    console.error('Stripe error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Stripe webhook - handle payment confirmation
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook error:', err.message)
    return res.status(400).send('Webhook Error: ' + err.message)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const clientId = session.metadata?.client_id
    const paymentType = session.metadata?.payment_type
    if (clientId) {
      if (paymentType === 'deposit') {
        // Deposit paid - move to building stage, save the amount paid
        const depositAmt = session.amount_total ? Math.round(session.amount_total / 100) : null
        await pool.query(
          "UPDATE clients SET deposit_paid=TRUE, onboarding_stage='building', stripe_session_id=$1, deposit_amount=$2 WHERE id=$3",
          [session.id, depositAmt, clientId]
        )
        await handleDepositPaid(clientId)
      } else {
        // Final launch fee paid - activate website
        await pool.query(
          "UPDATE clients SET subscription_status='active', stripe_session_id=$1, onboarding_stage='launched' WHERE id=$2",
          [session.id, clientId]
        )
        await pool.query(
          "UPDATE websites SET is_active=TRUE, activated_at=NOW() WHERE client_id=$1",
          [clientId]
        )
        console.log('Final payment confirmed for client:', clientId)
        // Notify the contractor who built this site
        try {
        const w = await pool.query(`
          SELECT w.business_name, w.created_by, c.email as client_email
          FROM websites w JOIN clients c ON c.id=w.client_id WHERE w.client_id=$1
        `, [clientId])
        if (w.rows[0]?.created_by) {
          const creator = await pool.query('SELECT email FROM clients WHERE id=$1', [w.rows[0].created_by])
          if (creator.rows[0]) {
            await resend.emails.send({
              from: 'Sitefloa <hello@sitefloa.com>',
              to: creator.rows[0].email,
              subject: '🚀 ' + (w.rows[0].business_name || 'Client') + ' has paid — website is live!',
              html: '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;"><h2 style="font-family:Georgia,serif;color:#1a6b5a;">Website is live! 🚀</h2><p style="color:#4a4f5e;">Your client <strong>' + w.rows[0].client_email + '</strong> has approved their website and paid their launch fee. Their site is now live.</p><p style="color:#4a4f5e;">Your commission will be added to your next pay period.</p><a href="https://sitefloa.com" style="display:inline-block;margin:20px 0;padding:12px 24px;background:#1a6b5a;color:white;text-decoration:none;border-radius:8px;">View Dashboard →</a></div>'
            })
          }
        }
      } catch(e) { console.error('Commission notify error:', e) }
    }
  }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object
    const customerId = invoice.customer
    const client = await pool.query('SELECT id FROM clients WHERE stripe_customer_id=$1', [customerId])
    if (client.rows[0]) {
      await pool.query("UPDATE clients SET subscription_status='suspended', suspended_at=NOW() WHERE id=$1", [client.rows[0].id])
      await pool.query('UPDATE websites SET is_active=FALSE WHERE client_id=$1', [client.rows[0].id])
      // Email client about missed payment
      const suspClient = await pool.query('SELECT email FROM clients WHERE id=$1', [client.rows[0].id])
      if (suspClient.rows[0]) {
        resend.emails.send({ from: 'Sitefloa <hello@sitefloa.com>', to: suspClient.rows[0].email, subject: 'Action required — your Sitefloa payment failed', html: '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:40px 20px;"><h2 style="color:#dc2626;">Payment failed</h2><p>We couldn\'t process your monthly payment. Your website has been temporarily paused.</p><p>Please update your payment method to restore your website. If payment isn\'t received within 30 days, your website and account will be permanently deleted.</p><a href="https://sitefloa.com" style="display:inline-block;padding:12px 24px;background:#1a6b5a;color:white;text-decoration:none;border-radius:8px;">Log in to make payment →</a></div>' }).catch(e => console.error('Suspension email error:', e))
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object
    const customerId = sub.customer
    const client = await pool.query('SELECT id FROM clients WHERE stripe_customer_id=$1', [customerId])
    if (client.rows[0]) {
      await pool.query('UPDATE clients SET subscription_status=$1 WHERE id=$2', ['cancelled', client.rows[0].id])
      await pool.query('UPDATE websites SET is_active=FALSE WHERE client_id=$1', [client.rows[0].id])
    }
  }

  res.json({ received: true })
})
app.post('/billing-portal', authMiddleware, async (req, res) => {
  try {
    const client = await pool.query('SELECT stripe_customer_id FROM clients WHERE id=$1', [req.user.id])
    const customerId = client.rows[0]?.stripe_customer_id
    if (!customerId) return res.status(400).json({ error: 'No billing account found' })
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: 'https://sitefloa.com'
    })
    res.json({ url: session.url })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── SEND INVITE CODE EMAIL ──────────────────────────
app.post('/admin/send-invite-email', authMiddleware, staffMiddleware, async (req, res) => {
  const { email, invite_code } = req.body
  if (!email || !invite_code) return res.status(400).json({ error: 'Email and invite code required' })
  res.json({ message: 'Invite email sent to ' + email })
  try {
    await resend.emails.send({
      from: 'Sitefloa <hello@sitefloa.com>',
      to: email,
      subject: 'Your Sitefloa account is ready!',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
          <h2 style="font-family:Georgia,serif;color:#0f1117;">Welcome to Sitefloa!</h2>
          <p style="color:#4a4f5e;line-height:1.6;">Great news — your website profile has been created and is ready for you to get started.</p>
          <p style="color:#4a4f5e;line-height:1.6;">Here's how to set up your account:</p>
          <ol style="color:#4a4f5e;line-height:1.8;">
            <li>Go to <a href="https://sitefloa.com" style="color:#1a6b5a;font-weight:500;">sitefloa.com</a></li>
            <li>Click <strong>"Client Login"</strong> in the top right</li>
            <li>Click the <strong>"Create account"</strong> tab</li>
            <li>Enter your email, choose a password, and paste your activation code below</li>
          </ol>
          <div style="background:#f4f0ff;border:2px dashed #9c4dcc;border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
            <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9c4dcc;margin-bottom:8px;">Your Activation Code</div>
            <div style="font-family:monospace;font-size:28px;font-weight:700;color:#0f1117;letter-spacing:2px;">${invite_code}</div>
          </div>
          <p style="color:#4a4f5e;line-height:1.6;">Once your account is created, you'll be able to pay the deposit to get your website build started.</p>
          <p style="color:#4a4f5e;line-height:1.6;">Questions? Just reply to this email and we'll help you out.</p>
        </div>
      `
    })
  } catch (err) { console.error('Invite email error:', err) }
})

// ── PAY DEPOSIT ─────────────────────────────────────
app.post('/pay-deposit', authMiddleware, async (req, res) => {
  try {
    const client = await pool.query('SELECT * FROM clients WHERE id=$1', [req.user.id])
    const website = await pool.query('SELECT * FROM websites WHERE client_id=$1', [req.user.id])
    if (!client.rows[0]) return res.status(404).json({ error: 'Client not found' })
    
    const plan = client.rows[0].plan || 'standard'
    const setupFee = website.rows[0]?.setup_fee || 299
    const settings = await pool.query('SELECT deposit_percent FROM site_settings LIMIT 1')
    const depositPct = parseFloat(settings.rows[0]?.deposit_percent || 50) / 100
    const depositAmount = Math.round(setupFee * depositPct)
    
    // Get or create Stripe customer
    let customerId = client.rows[0].stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({ email: client.rows[0].email })
      customerId = customer.id
      await pool.query('UPDATE clients SET stripe_customer_id=$1 WHERE id=$2', [customerId, req.user.id])
    }
    
    // Create Stripe checkout session for deposit
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'cad',
          product_data: {
            name: 'Sitefloa Website Deposit — ' + (website.rows[0]?.business_name || plan + ' plan'),
            description: Math.round(depositPct * 100) + '% deposit. Remaining balance due at launch.'
          },
          unit_amount: Math.round(depositAmount * 100)
        },
        quantity: 1
      }],
      currency_conversion: { enabled: true },
      mode: 'payment',
      payment_intent_data: { metadata: { client_id: String(req.user.id), payment_type: 'deposit', plan } },
      success_url: 'https://sitefloa.com?deposit=success',
      cancel_url: 'https://sitefloa.com?deposit=cancelled',
      metadata: { client_id: String(req.user.id), payment_type: 'deposit' }
    })
    
    res.json({ url: session.url })
  } catch (err) {
    console.error('Deposit error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Notify contractor when client pays deposit (called by Stripe webhook)
async function handleDepositPaid(clientId) {
  try {
    const client = await pool.query('SELECT * FROM clients WHERE id=$1', [clientId])
    const website = await pool.query('SELECT * FROM websites WHERE client_id=$1', [clientId])
    if (!client.rows[0]) return
    const plan = client.rows[0].plan || 'standard'
    const creatorId = website.rows[0]?.created_by
    if (creatorId) {
      const creator = await pool.query('SELECT email FROM clients WHERE id=$1', [creatorId])
      if (creator.rows[0]) {
        resend.emails.send({
          from: 'Sitefloa <hello@sitefloa.com>',
          to: creator.rows[0].email,
          subject: 'Client deposit paid — ready to build!',
          html: '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;"><h2 style="font-family:Georgia,serif;color:#0f1117;">Deposit Received! 🎉</h2><p style="color:#4a4f5e;line-height:1.6;"><strong>' + client.rows[0].email + '</strong> has paid their deposit for the <strong>' + plan + '</strong> plan.</p><p style="color:#4a4f5e;line-height:1.6;">You can now start building their website.</p><a href="https://sitefloa.com" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#1a6b5a;color:white;text-decoration:none;border-radius:8px;">Go to Dashboard →</a></div>'
        }).catch(e => console.error('Deposit notify error:', e))
      }
    }
  } catch (err) { console.error('handleDepositPaid error:', err) }
}


// ── TRANSFER CLIENT BETWEEN CONTRACTORS ─────────────
app.post('/admin/transfer-client', authMiddleware, async (req, res) => {
  if (!['admin','manager'].includes(req.user.role)) return res.status(403).json({ error: 'Only admins and managers can transfer clients' })
  const { website_id, new_creator_id } = req.body
  if (!website_id || !new_creator_id) return res.status(400).json({ error: 'Website ID and new creator ID required' })
  try {
    const result = await pool.query(
      'UPDATE websites SET created_by=$1 WHERE id=$2 RETURNING *',
      [new_creator_id, website_id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Website not found' })
    res.json({ message: 'Client transferred successfully', website: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Transfer failed' })
  }
})

// Get list of contractors and managers for transfer dropdown
app.get('/admin/staff-list', authMiddleware, async (req, res) => {
  if (!['admin','manager'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' })
  try {
    const staff = await pool.query(
      "SELECT id, email, role FROM clients WHERE role IN ('contractor', 'manager') ORDER BY email"
    )
    res.json({ staff: staff.rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── SUBMIT BRIEF (Client fills out form) ────────────
app.post('/submit-brief', async (req, res) => {
  const { email, plan, business_name, description, business_type, phone, address, business_email, style, colors, inspiration, tagline, services, photos, hours, existing_website, notes } = req.body
  if (!business_name) return res.status(400).json({ error: 'Business name required' })
  try {
    // Save brief to database
    await pool.query(
      `INSERT INTO website_briefs (email, plan, business_name, form_data, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [email, plan, business_name, JSON.stringify(req.body)]
    )
    
    // Generate Claude prompt
    const planLimits = {
      basic: { photos: 2, services: 3, pages: 1, label: 'Basic (1 page, max 2 photos, no monthly fee)' },
      standard: { photos: 8, services: 10, pages: 4, label: 'Standard (4 pages, max 8 photos, custom domain)' },
      premium: { photos: 999, services: 999, pages: 999, label: 'Premium (unlimited pages & photos, custom domain, priority support)' }
    }
    const limits = planLimits[plan] || planLimits.standard
    
    const claudePrompt = `Build a professional website for the following business. The website must work with the Sitefloa platform where clients can edit their own content through a dashboard.

PLAN TIER: ${limits.label}
IMPORTANT: The website MUST NOT exceed the tier limits. Max ${limits.pages} page(s), max ${limits.photos} photos. It can have less but NOT more.

BUSINESS INFO:
- Business Name: ${business_name}
- Business Type: ${business_type || 'Not specified'}
- Description: ${description}
- Phone: ${phone || 'Not provided'}
- Address: ${address || 'Not provided'}
- Email: ${business_email || email || 'Not provided'}
- Tagline: ${tagline || 'None'}

DESIGN:
- Style: ${style || 'Clean & professional'}
- Brand Colors: ${colors || 'Use professional defaults'}
- Inspiration: ${inspiration || 'None provided'}

SERVICES/MENU ITEMS:
${services && services.length ? services.map(function(s,i) { return (i+1) + '. ' + s }).join('\n') : 'None provided'}

PHOTOS (include these in the website):
${photos && photos.length ? photos.map(function(p,i) { return (i+1) + '. ' + p }).join('\n') : 'None provided - use placeholder images'}

BUSINESS HOURS:
${hours && Object.keys(hours).length ? Object.entries(hours).map(function(e) { return e[0] + ': ' + e[1].open + ' - ' + e[1].close }).join('\n') : 'Not provided'}

ADDITIONAL NOTES:
${notes || 'None'}
${existing_website ? 'Existing website/social: ' + existing_website : ''}

TECHNICAL REQUIREMENTS:
Build a Siteflowa client website using the SITE_CONFIG format.

API & PLATFORM:
- api: https://siteflowa.onrender.com
- subdomain: [to be set by admin when creating profile]
- schema: declare every editable field using types: text, textarea, email, tel, photo, photo_array, repeater, hours, badges
- defaults: use the business info provided above as realistic default content

ON LOAD BEHAVIOR:
- fetch /site/[subdomain], merge with defaults
- show offline page if is_active=false

PLAN VISIBILITY RULES (${limits.label}):
- Basic: hero/about/hours/contact sections only
- Standard: adds services/gallery sections
- Premium: adds everything including team, testimonials, blog
- This website is ${(plan || 'standard').toUpperCase()} tier — only include sections allowed for this tier

EDITABLE FIELDS (client can change these from their dashboard):
- Business name, tagline, description
- Phone, email, address
- Business hours (if plan includes hours)
- Services/menu items (repeater field)
- Photos/gallery (photo_array field)
- Team members (if premium)
- Social media links

READ-ONLY/DISPLAY ONLY:
- Page views / analytics stats
- Subscription status
- Plan tier badge

ADDITIONAL BUILD RULES:
- Single self-contained HTML file, no external JS dependencies
- Make it fully responsive (mobile-friendly)
- Include proper meta tags for SEO
- Include the Siteflowa analytics tracking snippet
- Use modern, clean design matching the style preference: ${style || 'Clean & professional'}
- All photos provided above MUST be included in the website
- The website can have FEWER features than the tier allows, but NEVER more`

    // Notify ALL admins and managers about new brief
    try {
      const staff = await pool.query("SELECT email FROM clients WHERE role IN ('admin','manager')")
      const briefSummary = '<div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;font-family:sans-serif;font-size:14px;"><p><strong>Business:</strong> ' + business_name + '</p><p><strong>Plan:</strong> ' + (plan||'standard') + '</p><p><strong>Email:</strong> ' + (email||'Not provided') + '</p><p><strong>Description:</strong> ' + (description||'Not provided') + '</p></div>'
      for (const s of staff.rows) {
        await resend.emails.send({
          from: 'Sitefloa <hello@sitefloa.com>',
          to: s.email,
          subject: '📋 New brief submitted — ' + business_name,
          html: '<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;"><h2 style="font-family:Georgia,serif;color:#0f1117;">New website brief! 📋</h2><p style="color:#4a4f5e;">A new brief has been submitted and is waiting to be claimed in the dashboard.</p>' + briefSummary + '<a href="https://sitefloa.com" style="display:inline-block;margin:20px 0;padding:12px 24px;background:#1a6b5a;color:white;text-decoration:none;border-radius:8px;">View & Claim Brief →</a></div>'
        }).catch(e => console.error('Brief notify error:', e))
      }
    } catch(e) { console.error('Staff notify error:', e) }

    // Find who claimed this client (if any) and email them the brief + prompt
    const client = await pool.query('SELECT id FROM clients WHERE email=$1', [email?.toLowerCase()])
    if (client.rows[0]) {
      const website = await pool.query('SELECT created_by FROM websites WHERE client_id=$1', [client.rows[0].id])
      if (website.rows[0]?.created_by) {
        const creator = await pool.query('SELECT email FROM clients WHERE id=$1', [website.rows[0].created_by])
        if (creator.rows[0]) {
          await resend.emails.send({
            from: 'Sitefloa <hello@sitefloa.com>',
            to: creator.rows[0].email,
            subject: 'Website brief received from ' + business_name,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
                <h2 style="font-family:Georgia,serif;color:#0f1117;">New Website Brief Received 📋</h2>
                <p style="color:#4a4f5e;line-height:1.6;"><strong>${business_name}</strong> has submitted their website brief. Here are the details:</p>
                <div style="background:#f5f5f5;border-radius:12px;padding:20px;margin:20px 0;">
                  <p><strong>Plan:</strong> ${(plan || 'standard').charAt(0).toUpperCase() + (plan || 'standard').slice(1)}</p>
                  <p><strong>Business Type:</strong> ${business_type || 'Not specified'}</p>
                  <p><strong>Style:</strong> ${style || 'Not specified'}</p>
                  <p><strong>Services:</strong> ${services && services.length ? services.join(', ') : 'None listed'}</p>
                  <p><strong>Photos:</strong> ${photos && photos.length ? photos.length + ' provided' : 'None'}</p>
                </div>
                <h3 style="font-family:Georgia,serif;color:#0f1117;margin-top:30px;">Ready-to-Use Claude Prompt</h3>
                <p style="color:#4a4f5e;font-size:13px;">Copy the prompt below and paste it into Claude to generate the website:</p>
                <div style="background:#1a1a2e;color:#e0e0e0;border-radius:12px;padding:20px;margin:16px 0;font-family:monospace;font-size:12px;white-space:pre-wrap;line-height:1.6;max-height:400px;overflow-y:auto;">${claudePrompt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                <a href="https://sitefloa.com" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#1a6b5a;color:white;text-decoration:none;border-radius:8px;font-weight:500;">Go to Dashboard →</a>
              </div>
            `
          })
        }
      }
    }
    
    res.json({ message: 'Brief submitted', prompt: claudePrompt })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to save brief' })
  }
})

// ── SEND WEBSITE BRIEF FORM ─────────────────────────
app.post('/admin/send-brief', authMiddleware, staffMiddleware, async (req, res) => {
  const { email, plan } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })
  res.json({ message: 'Brief form sent to ' + email })
  try {
    const planNames = { basic: 'Basic', standard: 'Standard', premium: 'Premium' }
    const planDetails = {
      basic: '1 page · Up to 2 photos · Free subdomain · No monthly fees',
      standard: '4 pages · Up to 8 photos · Custom domain · Domain covered up to $30/yr',
      premium: 'Unlimited pages · Unlimited photos · Custom domain · Domain covered up to $80/yr'
    }
    const formLink = `https://sitefloa.com?brief=true&email=${encodeURIComponent(email)}&plan=${plan || 'standard'}`
    await resend.emails.send({
      from: 'Sitefloa <hello@sitefloa.com>',
      to: email,
      subject: 'Your website brief form — Sitefloa',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
          <h2 style="font-family:Georgia,serif;color:#0f1117;">Your Website Brief</h2>
          <p style="color:#4a4f5e;line-height:1.6;">We're ready to start planning your website! Please fill out the brief form so we have everything we need.</p>
          <div style="background:#f0faf7;border:1px solid rgba(26,107,90,0.2);border-radius:12px;padding:16px;margin:16px 0;">
            <div style="font-size:13px;font-weight:600;color:#1a6b5a;margin-bottom:8px;">Your Plan: ${planNames[plan] || 'Standard'}</div>
            <div style="font-size:13px;color:#4a4f5e;">${planDetails[plan] || planDetails.standard}</div>
          </div>
          <a href="${formLink}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#1a6b5a;color:white;text-decoration:none;border-radius:8px;font-weight:500;">Fill out your brief →</a>
          <p style="color:#4a4f5e;line-height:1.6;font-size:13px;">This helps us build your site exactly how you want it.</p>
        </div>
      `
    })
  } catch (err) { console.error('Brief email error:', err) }
})

// ── SEND WEBSITE READY EMAIL ────────────────────────
app.post('/admin/send-ready-email', authMiddleware, staffMiddleware, async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })
  try {
    const client = await pool.query('SELECT id FROM clients WHERE email=$1', [email.toLowerCase()])
    if (client.rows[0]) {
      await pool.query('UPDATE clients SET onboarding_stage=$1 WHERE id=$2', ['review', client.rows[0].id])
    }
    res.json({ message: 'Website ready email sent to ' + email })
    await resend.emails.send({
      from: 'Sitefloa <hello@sitefloa.com>',
      to: email,
      subject: 'Your website is ready to review! ✨',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
          <h2 style="font-family:Georgia,serif;color:#0f1117;">Your Website is Ready! ✨</h2>
          <p style="color:#4a4f5e;line-height:1.6;">Great news — we've finished building your website and it's ready for you to review.</p>
          <p style="color:#4a4f5e;line-height:1.6;">Log in to your dashboard to preview your site and let us know what you think!</p>
          <a href="https://sitefloa.com" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#1a6b5a;color:white;text-decoration:none;border-radius:8px;font-weight:500;">Log in to your dashboard →</a>
          <p style="color:#4a4f5e;line-height:1.6;font-size:13px;margin-top:20px;">If you'd like any changes, just let us know through the chat in your dashboard.</p>
        </div>
      `
    })
  } catch (err) {
    console.error('Ready email error:', err)
    if (!res.headersSent) res.status(500).json({ error: 'Failed to send email' })
  }
})

// ── SEND CUSTOM EMAIL ───────────────────────────────
app.post('/admin/send-custom-email', authMiddleware, staffMiddleware, async (req, res) => {
  const { email, subject, message } = req.body
  if (!email || !subject || !message) return res.status(400).json({ error: 'Email, subject, and message required' })
  res.json({ message: 'Email sent to ' + email })
  try {
    await resend.emails.send({
      from: 'Sitefloa <hello@sitefloa.com>',
      to: email,
      subject: subject,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
          <h2 style="font-family:Georgia,serif;color:#0f1117;">${subject}</h2>
          <div style="color:#4a4f5e;line-height:1.8;white-space:pre-wrap;">${message}</div>
          <hr style="border:none;border-top:1px solid #eee;margin:30px 0;">
          <p style="color:#8b909e;font-size:12px;">Sitefloa - Professional websites for small business</p>
        </div>
      `
    })
  } catch (err) { console.error('Custom email error:', err) }
})

// ── DELETE SUBMITTED BRIEF (admin only) ─────────────
app.delete('/admin/website-briefs/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM website_briefs WHERE id=$1', [req.params.id])
    res.json({ message: 'Brief deleted' })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

// ── MARK BRIEF COMPLETE ───────────────────────────────
app.post('/admin/website-briefs/:id/complete', authMiddleware, staffMiddleware, async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM website_briefs WHERE id=$1', [req.params.id])
    if (!existing.rows[0]) return res.status(404).json({ error: 'Brief not found' })
    await pool.query(
      "UPDATE website_briefs SET status='completed', completed_at=NOW() WHERE id=$1",
      [req.params.id]
    )
    res.json({ message: 'Brief marked complete' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET SUBMITTED WEBSITE BRIEFS ────────────────────
app.get('/admin/website-briefs', authMiddleware, staffMiddleware, async (req, res) => {
  try {
    // All staff see all briefs — contractors can claim unclaimed ones
    const result = await pool.query('SELECT * FROM website_briefs ORDER BY created_at DESC')
    res.json({ briefs: result.rows })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── CLAIM A BRIEF ────────────────────────────────────
app.post('/admin/website-briefs/:id/claim', authMiddleware, staffMiddleware, async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM website_briefs WHERE id=$1', [req.params.id])
    if (!existing.rows[0]) return res.status(404).json({ error: 'Brief not found' })
    if (existing.rows[0].claimed_by) {
      return res.status(400).json({ error: 'This brief has already been claimed by ' + (existing.rows[0].claimed_by_email || 'someone') })
    }
    await pool.query(
      'UPDATE website_briefs SET claimed_by_email=$1, claimed_at=NOW() WHERE id=$2',
      [req.user.email, req.params.id]
    )
    res.json({ message: 'Brief claimed' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── UNCLAIM A BRIEF ──────────────────────────────────
app.post('/admin/website-briefs/:id/unclaim', authMiddleware, staffMiddleware, async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM website_briefs WHERE id=$1', [req.params.id])
    if (!existing.rows[0]) return res.status(404).json({ error: 'Brief not found' })
    if (existing.rows[0].claimed_by_email !== req.user.email && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only unclaim your own briefs' })
    }
    await pool.query(
      'UPDATE website_briefs SET claimed_by_email=NULL, claimed_at=NULL WHERE id=$1',
      [req.params.id]
    )
    res.json({ message: 'Brief unclaimed' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── DEPOSIT CONFIRMED (after Stripe redirect) ────────
app.post('/deposit-confirmed', authMiddleware, async (req, res) => {
  try {
    const client = await pool.query('SELECT * FROM clients WHERE id=$1', [req.user.id])
    if (!client.rows[0]) return res.status(404).json({ error: 'Client not found' })
    if (!client.rows[0].deposit_paid) {
      await pool.query(
        "UPDATE clients SET deposit_paid=TRUE, onboarding_stage='building' WHERE id=$1",
        [req.user.id]
      )
    }
    const website = await pool.query('SELECT * FROM websites WHERE client_id=$1', [req.user.id])
    res.json({ message: 'Deposit confirmed', website: website.rows[0] || null })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── SET BUILD STATUS ──────────────────────────────────────
app.post('/admin/set-build-status', authMiddleware, staffMiddleware, async (req, res) => {
  const { client_id, build_status } = req.body
  try {
    if (build_status === 'completed') {
      // Completed = clear build status, the onboarding_stage handles live display
      await pool.query("UPDATE websites SET build_status=NULL WHERE client_id=$1", [client_id])
    } else {
      await pool.query("UPDATE websites SET build_status=$1 WHERE client_id=$2", [build_status, client_id])
    }
    res.json({ message: 'Build status updated' })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

// ── AUTO-DELETE OVERDUE SUSPENDED ACCOUNTS ─────────────────
// Called on server startup and can be called periodically
async function checkOverdueAccounts() {
  try {
    // Find clients suspended more than 30 days ago
    const overdue = await pool.query(
      "SELECT id, email FROM clients WHERE subscription_status='suspended' AND suspended_at IS NOT NULL AND suspended_at < NOW() - INTERVAL '30 days'"
    )
    for (const client of overdue.rows) {
      // Email them before deletion
      await resend.emails.send({
        from: 'Sitefloa <hello@sitefloa.com>',
        to: client.email,
        subject: 'Your Sitefloa account has been deleted',
        html: '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:40px 20px;"><h2 style="color:#dc2626;">Account deleted</h2><p>Your Sitefloa website and account have been permanently deleted due to 30 days of non-payment.</p><p>If you believe this is an error, please contact us at hello@sitefloa.com.</p></div>'
      }).catch(e => console.error('Deletion email error:', e))
      // Delete website and client
      await pool.query('DELETE FROM password_resets WHERE client_id=$1', [client.id])
      await pool.query('DELETE FROM messages WHERE client_id=$1', [client.id])
      await pool.query('DELETE FROM websites WHERE client_id=$1', [client.id])
      await pool.query('DELETE FROM clients WHERE id=$1', [client.id])
      console.log('Auto-deleted overdue account:', client.email)
    }
    if (overdue.rows.length > 0) console.log(`Auto-deleted ${overdue.rows.length} overdue accounts`)
  } catch(err) { console.error('Overdue check error:', err) }
}
// Run overdue check every 24 hours
setInterval(checkOverdueAccounts, 24 * 60 * 60 * 1000)
checkOverdueAccounts() // Run on startup too

// ── GET MY APPROVED DOMAIN REQUESTS ──────────────────────
app.get('/my-domain-requests', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM domain_requests WHERE requested_by_email=$1 ORDER BY created_at DESC",
      [req.user.email]
    )
    res.json({ requests: result.rows })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

// ── MARK DOMAIN NOTIFICATIONS SEEN ────────────────────────
app.post('/my-domain-requests/seen', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      "UPDATE domain_requests SET seen_at=NOW() WHERE requested_by_email=$1 AND status='completed' AND seen_at IS NULL",
      [req.user.email]
    )
    res.json({ message: 'Marked seen' })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

// ── UPDATE CLIENT DOMAIN NAME / COST ─────────────────────
app.post('/admin/update-domain', authMiddleware, staffMiddleware, async (req, res) => {
  const { client_id, domain_name, domain_cost, domain_yearly_fee } = req.body
  try {
    await pool.query(
      'UPDATE clients SET domain_name=$1, domain_cost=$2, domain_yearly_fee=$3 WHERE id=$4',
      [domain_name||'', domain_cost||0, domain_yearly_fee||0, client_id]
    )
    if (domain_name) {
      await pool.query('UPDATE websites SET domain_name=$1 WHERE client_id=$2', [domain_name, client_id])
    }
    res.json({ message: 'Domain updated' })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

// ── SEND PAYMENT QUESTIONNAIRE TO STAFF ─────────────────
app.post('/admin/send-payment-questionnaire', authMiddleware, adminMiddleware, async (req, res) => {
  const { email } = req.body
  try {
    const html = `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;">
      <h2 style="font-family:Georgia,serif;color:#1a6b5a;">Payment details needed</h2>
      <p>Hi! To process your earnings payment, please fill out the form below and reply to this email with your details.</p>
      <div style="background:#f5f5f5;border-radius:10px;padding:20px;margin:20px 0;">
        <p><strong>1. Full legal name:</strong><br>___________________________</p>
        <p><strong>2. Email address for payment notifications:</strong><br>___________________________</p>
        <p><strong>3. Payment method preference:</strong><br>☐ Interac e-Transfer (provide email)<br>☐ Direct deposit (provide transit, institution & account number)<br>☐ PayPal (provide PayPal email)</p>
        <p><strong>4. Interac e-Transfer email (if applicable):</strong><br>___________________________</p>
        <p><strong>5. Bank details (if direct deposit):</strong><br>Transit number: ___________<br>Institution number: ___________<br>Account number: ___________</p>
        <p><strong>6. PayPal email (if applicable):</strong><br>___________________________</p>
        <p><strong>7. Any other notes:</strong><br>___________________________</p>
      </div>
      <p style="color:#666;font-size:13px;">Please reply to this email with your completed form. Your payment details are kept confidential.</p>
    </div>`
    await resend.emails.send({
      from: 'Sitefloa <hello@sitefloa.com>',
      to: email,
      subject: 'Sitefloa — Payment details required',
      html
    })
    res.json({ message: 'Questionnaire sent' })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

// ── DEMOS TABLE ──────────────────────────────────────────
app.get('/admin/demos', authMiddleware, staffMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM demos ORDER BY created_at DESC')
    res.json({ demos: result.rows })
  } catch(err) { res.status(500).json({ error: err.message }) }
})
app.post('/admin/demos', authMiddleware, async (req, res) => {
  if (!['admin','manager'].includes(req.user.role)) return res.status(403).json({ error: 'Only admins and managers can add demos' })
  const { title, business_type, description, prompt, base_html } = req.body
  try {
    const result = await pool.query(
      'INSERT INTO demos (title, business_type, description, prompt, base_html, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [title, business_type, description||'', prompt||'', base_html||'', req.user.id]
    )
    res.json({ demo: result.rows[0] })
  } catch(err) { res.status(500).json({ error: err.message }) }
})
app.delete('/admin/demos/:id', authMiddleware, async (req, res) => {
  if (!['admin','manager'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' })
  try {
    await pool.query('DELETE FROM demos WHERE id=$1', [req.params.id])
    res.json({ message: 'Demo deleted' })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

// ── SHARE DEMO ───────────────────────────────────────────
app.post('/admin/demos/:id/share', authMiddleware, staffMiddleware, async (req, res) => {
  const { email, custom_html, business_name } = req.body
  try {
    const demo = await pool.query('SELECT * FROM demos WHERE id=$1', [req.params.id])
    if (!demo.rows[0]) return res.status(404).json({ error: 'Demo not found' })
    const d = demo.rows[0]
    const briefUrl = 'https://sitefloa.com?assetform=demo&email=' + encodeURIComponent(email)
    await resend.emails.send({
      from: 'Sitefloa <hello@sitefloa.com>',
      to: email,
      subject: 'Your website demo is ready — ' + (business_name || d.title),
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
        <h2 style="font-family:Georgia,serif;color:#1a6b5a;">Here's your website demo! 🎨</h2>
        <p>Hi there! We've put together a demo of what your website could look like. Take a look and let us know what you think.</p>
        ${custom_html ? '<div style="border:1px solid #eee;border-radius:12px;padding:20px;margin:20px 0;background:#fafafa;">' + custom_html + '</div>' : ''}
        <p>Like what you see? Fill out a quick brief form to get started on your real website — it only takes a few minutes.</p>
        <a href="${briefUrl}" style="display:inline-block;margin:20px 0;padding:14px 28px;background:#1a6b5a;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Get started — fill out the brief form →</a>
        <p style="color:#888;font-size:13px;">Questions? Just reply to this email and we'll get back to you.</p>
      </div>`
    })
    res.json({ message: 'Demo shared successfully' })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

// ── CLAUDE AI PROXY (per-user, CORS-safe) ────────────────
app.post('/ai/chat', authMiddleware, staffMiddleware, async (req, res) => {
  const { messages } = req.body
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages array required' })
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system: 'You are a web development expert helping build professional client websites for a web agency called Sitefloa. When asked to build a website, output complete, self-contained HTML with all CSS and JS inline. Make websites mobile-responsive and professional.',
        messages: messages
      })
    })
    const data = await response.json()
    res.json(data)
  } catch(err) { res.status(500).json({ error: err.message }) }
})

// ── MARK CLIENT WEBSITE AS PREVIEW READY ────────────────
app.post('/admin/mark-preview-ready', authMiddleware, staffMiddleware, async (req, res) => {
  const { client_id } = req.body
  try {
    const existing = await pool.query('SELECT * FROM clients WHERE id=$1', [client_id])
    if (!existing.rows[0]) return res.status(404).json({ error: 'Client not found' })
    await pool.query(
      "UPDATE clients SET onboarding_stage='preview_ready' WHERE id=$1",
      [client_id]
    )
    res.json({ message: 'Client marked as preview ready' })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
