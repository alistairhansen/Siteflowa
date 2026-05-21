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
  if (!['admin','manager'].includes(req.user.role)) return res.status(403).json({ error: 'Staff access required' })
  next()
}

// ── SIGNUP ──────────────────────────────────────────────
app.post('/signup', async (req, res) => {
  const { email, password, invite_code } = req.body
  const emailLower = email.toLowerCase().trim()
  try {
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
        'INSERT INTO clients (email,password_hash,role,is_admin,subscription_status) VALUES ($1,$2,$3,FALSE,$4) RETURNING id,email',
        [emailLower, password_hash, 'manager', 'active']
      )
      await pool.query('UPDATE manager_codes SET used=TRUE, assigned_to=$1 WHERE code=$2', [client.rows[0].id, invite_code.trim()])
      const token = jwt.sign({ id: client.rows[0].id, email: emailLower, role: 'manager' }, process.env.JWT_SECRET, { expiresIn: '7d' })
      return res.json({ message: 'Manager account created', token, role: 'manager' })
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
    const website = await pool.query('SELECT * FROM websites WHERE client_id=$1', [client.id])
    const role = client.role || (client.is_admin ? 'admin' : 'client')
    const token = jwt.sign({ id: client.id, email: emailLower, role, is_admin: client.is_admin }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.json({
      message: 'Login successful', token, role,
      subscription_status: client.subscription_status,
      update_fee_required: client.update_fee_required,
      update_fee_amount: client.update_fee_amount,
      plan: client.plan || 'standard',
      is_admin: client.is_admin,
      website: website.rows[0] || null
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
    const resetLink = `https://siteflowa.onrender.com?token=${token}`
    await resend.emails.send({
      from: 'Siteflowa <onboarding@resend.dev>',
      to: emailLower,
      subject: 'Reset your Siteflowa password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
          <h2 style="font-family:Georgia,serif;color:#0f1117;">Reset your password</h2>
          <p style="color:#4a4f5e;line-height:1.6;">We received a request to reset your Siteflowa password. Click the button below to choose a new one.</p>
          <a href="${resetLink}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#1a6b5a;color:white;text-decoration:none;border-radius:8px;font-weight:500;">Reset my password</a>
          <p style="color:#8b909e;font-size:13px;">This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #e5e3de;margin:24px 0;">
          <p style="color:#8b909e;font-size:12px;">Siteflowa - Professional websites for small business</p>
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
    const client = await pool.query('SELECT id,email,subscription_status,created_at,plan,update_fee_required,update_fee_amount,onboarding_stage,deposit_paid,deposit_amount,domain_name,domain_yearly_fee FROM clients WHERE id=$1', [req.user.id])
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
        from: 'Siteflowa <onboarding@resend.dev>',
        to: emails,
        subject: 'Plan downgrade - ' + (siteInfo?.business_name || clientInfo.email),
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:40px 20px;">
            <h2 style="font-family:Georgia,serif;color:#e65100;">Plan downgrade alert</h2>
            <p style="color:#4a4f5e;">A client is downgrading from <strong>${from_plan}</strong> to <strong>${to_plan}</strong>.</p>
            <div style="background:#fff3e0;border:1px solid #e65100;border-radius:10px;padding:20px;margin:20px 0;">
              <strong>${siteInfo?.business_name || 'Unknown'}</strong><br>
              <span style="color:#4a4f5e;">${clientInfo.email}</span><br>
              <span style="color:#4a4f5e;">Domain: ${siteInfo?.subdomain || '-'}.siteflowa.com</span>
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
  try {
    const clients = await pool.query(`
      SELECT c.id, c.email, c.created_at, c.is_admin, c.role, c.subscription_status, c.plan,
             c.update_fee_required, c.update_fee_amount, c.commission_rate,
             c.domain_name, c.domain_cost, c.domain_yearly_fee,
             w.id as website_id, w.business_name, w.subdomain, w.is_active,
             w.setup_fee, w.monthly_fee, w.client_email, w.sections, w.website_type,
             w.created_by, cb.email as created_by_email,
             r.code as referral_code, r.times_used as referral_uses
      FROM clients c
      LEFT JOIN websites w ON w.client_id = c.id
      LEFT JOIN clients cb ON cb.id = w.created_by
      LEFT JOIN referral_codes r ON r.owner_client_id = c.id
      ORDER BY c.created_at DESC
    `)
    const nonStaff = clients.rows.filter(c => c.role === 'client' || (!c.role && !c.is_admin))
    const activeCount = nonStaff.filter(c => c.is_active).length
    const monthlyRevenue = nonStaff.filter(c => c.is_active).reduce((sum,c) => sum + (c.monthly_fee||49), 0)
    const totalRevenue = nonStaff.reduce((sum,c) => sum + (c.is_active ? (c.setup_fee||299)+(c.monthly_fee||49) : 0), 0)
    const managers = await pool.query(`
      SELECT c.id, c.email, c.commission_rate,
        COUNT(w.id) as websites_created,
        COALESCE(SUM(w.setup_fee + w.monthly_fee), 0) as total_brought_in
      FROM clients c
      LEFT JOIN websites w ON w.created_by = c.id
      WHERE c.role = 'manager'
      GROUP BY c.id, c.email, c.commission_rate
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
    res.json({
      clients: clients.rows,
      stats: { total_clients: nonStaff.length, active_websites: activeCount, monthly_revenue: monthlyRevenue, total_revenue: totalRevenue },
      managers: managers.rows,
      monthly_chart: monthlyChart.rows.reverse()
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── ADMIN - create website ──────────────────────────────
app.post('/admin/create-website', authMiddleware, staffMiddleware, async (req, res) => {
  try {
    const { business_name, subdomain, setup_fee, monthly_fee, plan, sections, website_type, site_html } = req.body
    const website = await pool.query(
      'INSERT INTO websites (business_name,subdomain,is_active,setup_fee,monthly_fee,created_by,sections,website_type) VALUES ($1,$2,FALSE,$3,$4,$5,$6,$7) RETURNING id',
      [business_name, subdomain, setup_fee||299, monthly_fee||49, req.user.id, JSON.stringify(sections||{gallery:true,hours:true,contact:true}), website_type||'general']
    )
    const code = Math.random().toString(36).substring(2,8).toUpperCase()
    await pool.query('INSERT INTO invite_codes (code,website_id) VALUES ($1,$2)', [code, website.rows[0].id])
    if (site_html) {
      await pool.query('UPDATE websites SET site_html=$1 WHERE id=$2', [site_html, website.rows[0].id])
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
app.post('/admin/update-client-plan', authMiddleware, adminMiddleware, async (req, res) => {
  const { client_id, plan } = req.body
  try {
    await pool.query('UPDATE clients SET plan=$1 WHERE id=$2', [plan, client_id])
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
    await pool.query('DELETE FROM referral_uses WHERE used_by_client_id=$1', [clientId])
    await pool.query('DELETE FROM referral_codes WHERE owner_client_id=$1', [clientId])
    await pool.query('DELETE FROM invite_codes WHERE website_id=(SELECT id FROM websites WHERE client_id=$1)', [clientId])
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
    const websites = await pool.query(`
      SELECT w.*, c.plan, c.email as client_email
      FROM websites w
      LEFT JOIN clients c ON c.id = w.client_id
      WHERE w.created_by = $1 AND w.created_at >= $2
    `, [req.user.id, periodStart])
    const managerData = await pool.query('SELECT commission_rate FROM clients WHERE id=$1', [req.user.id])
    const rate = managerData.rows[0]?.commission_rate || 10
    const earnings = websites.rows.reduce((sum, w) => sum + ((w.setup_fee || 299) * rate / 100), 0)
    res.json({
      websites: websites.rows,
      commission_rate: rate,
      period_start: periodStart,
      period_end: new Date(),
      total_earnings: Math.round(earnings),
      websites_count: websites.rows.length
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
    const managerData = await pool.query('SELECT * FROM clients WHERE id=$1', [manager_id])
    const manager = managerData.rows[0]
    if (!manager) return res.status(404).json({ error: 'Manager not found' })
    const rate = manager.commission_rate || 10
    const websites = await pool.query(`
      SELECT w.*, c.plan, c.email as client_email
      FROM websites w LEFT JOIN clients c ON c.id = w.client_id
      WHERE w.created_by = $1 AND w.created_at >= $2
    `, [manager_id, periodStart])
    const earnings = websites.rows.reduce((sum, w) => sum + ((w.setup_fee || 299) * rate / 100), 0)
    const periodEnd = new Date()
    await pool.query(
      'INSERT INTO pay_periods (manager_id, period_start, period_end, websites_count, total_earned, commission_rate, websites_data) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [manager_id, periodStart, periodEnd, websites.rows.length, Math.round(earnings), rate, JSON.stringify(websites.rows)]
    )
    await pool.query('UPDATE site_settings SET current_period_start=$1', [periodEnd])
    try {
      await resend.emails.send({
        from: 'Siteflowa <onboarding@resend.dev>',
        to: manager.email,
        subject: 'Your Siteflowa earnings - ' + periodStart.toLocaleDateString() + ' to ' + periodEnd.toLocaleDateString(),
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;">
            <h2 style="font-family:Georgia,serif;color:#0f1117;">Your earnings summary</h2>
            <p style="color:#4a4f5e;">Period: <strong>${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}</strong></p>
            <div style="background:#e8f4f1;border-radius:12px;padding:24px;margin:24px 0;text-align:center;">
              <div style="font-size:13px;color:#1a6b5a;font-weight:600;text-transform:uppercase;margin-bottom:8px;">Total earned</div>
              <div style="font-size:48px;font-family:Georgia,serif;color:#1a6b5a;">$${Math.round(earnings)}</div>
              <div style="font-size:13px;color:#4a4f5e;">${rate}% commission on ${websites.rows.length} website${websites.rows.length!==1?'s':''}</div>
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
app.get('/client/:subdomain', async (req, res) => {
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
})


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
    await pool.query('UPDATE leads SET claimed_by=$1, claimed_by_email=$2, updated_at=NOW() WHERE id=$3',
      [req.user.id, req.user.email, req.params.id])
    res.json({ message: 'Claimed' })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

app.post('/admin/leads/:id/stage', authMiddleware, staffMiddleware, async (req, res) => {
  const { stage } = req.body
  try {
    const lead = await pool.query('SELECT * FROM leads WHERE id=$1', [req.params.id])
    if (lead.rows[0]?.claimed_by && lead.rows[0].claimed_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the person who claimed this lead can update its stage' })
    }
    await pool.query('UPDATE leads SET stage=$1, updated_at=NOW() WHERE id=$2', [stage, req.params.id])
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
      'INSERT INTO asset_forms (email, plan, token, status) VALUES ($1,$2,$3,$4)',
      [email, plan||'standard', token, 'sent']
    )
    const formUrl = 'https://siteflowa.onrender.com?assetform=' + token
    await resend.emails.send({
      from: 'Siteflowa <onboarding@resend.dev>',
      to: email,
      subject: 'Your Siteflowa website brief form',
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
        from: 'Siteflowa <onboarding@resend.dev>',
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
          product_data: { name: 'Siteflowa Website Deposit', description: 'Deposit to begin building your website. Remaining balance due at launch.' },
          unit_amount: Math.round(amount * 100)
        },
        quantity: 1
      }],
      mode: 'payment',
      payment_intent_data: { metadata: { client_id: req.user.id, payment_type: 'deposit', plan } },
      success_url: 'https://siteflowa.onrender.com?deposit=success',
      cancel_url: 'https://siteflowa.onrender.com?deposit=cancelled',
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
      from: 'Siteflowa <onboarding@resend.dev>',
      to: client.rows[0].email,
      subject: 'Your Siteflowa website is ready!',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:40px 20px;">
          <h2 style="font-family:Georgia,serif;color:#1a6b5a;">Your website is ready to launch!</h2>
          <p style="color:#4a4f5e;line-height:1.6;">We've finished building your website. Log in to preview it and pay your launch fee to go live.</p>
          <p style="color:#4a4f5e;">Your activation code: <strong style="font-size:20px;letter-spacing:0.1em;">${code}</strong></p>
          <a href="https://siteflowa.onrender.com" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#1a6b5a;color:white;text-decoration:none;border-radius:8px;font-weight:500;">Preview your website</a>
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

// ── HEALTH CHECK ────────────────────────────────────────
app.get('/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ message: 'Siteflowa server running!' }) }
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
              name: 'Siteflowa ' + (planNames[plan] || 'Standard') + ' Plan — Website Setup',
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
              name: 'Siteflowa Monthly Subscription',
              description: 'First month free — billing starts 30 days from today',
            },
            unit_amount: 0,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }
      ],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 30,
        metadata: { client_id: req.user.id, plan: plan }
      },
      success_url: 'https://siteflowa.onrender.com?payment=success&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://siteflowa.onrender.com?payment=cancelled',
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
    if (clientId) {
      await pool.query('UPDATE clients SET subscription_status=$1, stripe_session_id=$2 WHERE id=$3',
        ['active', session.id, clientId])
      await pool.query('UPDATE websites SET is_active=TRUE WHERE client_id=$1', [clientId])
      console.log('Payment confirmed for client:', clientId)
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object
    const customerId = invoice.customer
    const client = await pool.query('SELECT id FROM clients WHERE stripe_customer_id=$1', [customerId])
    if (client.rows[0]) {
      await pool.query('UPDATE clients SET subscription_status=$1 WHERE id=$2', ['suspended', client.rows[0].id])
      await pool.query('UPDATE websites SET is_active=FALSE WHERE client_id=$1', [client.rows[0].id])
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

// Get Stripe customer portal link
app.post('/billing-portal', authMiddleware, async (req, res) => {
  try {
    const client = await pool.query('SELECT stripe_customer_id FROM clients WHERE id=$1', [req.user.id])
    const customerId = client.rows[0]?.stripe_customer_id
    if (!customerId) return res.status(400).json({ error: 'No billing account found' })
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: 'https://siteflowa.onrender.com'
    })
    res.json({ url: session.url })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
