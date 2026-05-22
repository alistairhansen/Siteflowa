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
function staffOrContractorMiddleware(req, res, next) {
  if (!['admin','manager','contractor'].includes(req.user.role)) return res.status(403).json({ error: 'Staff or contractor access required' })
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

    const contractorCode = await pool.query('SELECT * FROM contractor_codes WHERE code=$1 AND used=FALSE', [invite_code.trim()])
    if (contractorCode.rows.length > 0) {
      const existing = await pool.query('SELECT * FROM clients WHERE email=$1', [emailLower])
      if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already registered' })
      const password_hash = await bcrypt.hash(password, 10)
      const client = await pool.query(
        'INSERT INTO clients (email,password_hash,role,is_admin,subscription_status,contractor_rate) VALUES ($1,$2,$3,FALSE,$4,25) RETURNING id,email',
        [emailLower, password_hash, 'contractor', 'active', 25]
      )
      await pool.query('UPDATE contractor_codes SET used=TRUE, assigned_to=$1 WHERE code=$2', [client.rows[0].id, invite_code.trim()])
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
    const resetLink = `https://sitefloa.com?token=${token}`
    await resend.emails.send({
      from: 'Sitefloa <hello@sitefloa.com>',
      to: emailLower,
      subject: 'Reset your Sitefloa password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
          <h2 style="font-family:Georgia,serif;color:#0f1117;">Reset your password</h2>
          <p style="color:#4a4f5e;line-height:1.6;">We received a request to reset your Sitefloa password. Click the button below to choose a new one.</p>
          <a href="${resetLink}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#1a6b5a;color:white;text-decoration:none;border-radius:8px;font-weight:500;">Reset my password</a>
          <p style="color:#4a4f5e;line-height:1.6;">If you didn't request this, you can ignore this email. This link expires in 1 hour.</p>
        </div>
      `
    })
    res.json({ message: 'Reset link sent to email' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to send reset email' })
  }
})

app.post('/reset-password', async (req, res) => {
  const { token, password } = req.body
  try {
    const result = await pool.query(
      'SELECT * FROM password_resets WHERE token=$1 AND expires_at > NOW()',
      [token]
    )
    if (result.rows.length === 0) return res.status(400).json({ error: 'Token expired or invalid' })
    const passwordHash = await bcrypt.hash(password, 10)
    await pool.query('UPDATE clients SET password_hash=$1 WHERE id=$2', [passwordHash, result.rows[0].client_id])
    await pool.query('DELETE FROM password_resets WHERE id=$1', [result.rows[0].id])
    res.json({ message: 'Password reset successful' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Password reset failed' })
  }
})

// ── INQUIRY FORM ENDPOINTS ──────────────────────────────
// Submit new client inquiry form
app.post('/inquiry-form', async (req, res) => {
  const { business_name, email, phone, plan, questions_data } = req.body
  try {
    const inquiry = await pool.query(
      `INSERT INTO client_inquiries 
       (business_name, email, phone, plan, form_data, created_at, claimed_by, claimed_at) 
       VALUES ($1, $2, $3, $4, $5, NOW(), NULL, NULL) 
       RETURNING id, business_name, email, phone, plan, created_at`,
      [business_name, email, phone, plan, JSON.stringify(questions_data)]
    )
    
    // Send inquiry to all admins, managers, and contractors
    const staff = await pool.query(
      "SELECT email FROM clients WHERE role IN ('admin', 'manager', 'contractor')"
    )
    
    const inquiryLink = `https://sitefloa.com/inquiries?id=${inquiry.rows[0].id}&plan=${plan}`
    const emailBody = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
        <h2 style="font-family:Georgia,serif;color:#0f1117;">New Client Inquiry</h2>
        <div style="background:#f5f5f5;border-radius:8px;padding:20px;margin:20px 0;">
          <p style="margin:8px 0;"><strong>Business Name:</strong> ${business_name}</p>
          <p style="margin:8px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin:8px 0;"><strong>Phone:</strong> ${phone || 'Not provided'}</p>
          <p style="margin:8px 0;"><strong>Plan Selected:</strong> ${plan}</p>
        </div>
        <a href="${inquiryLink}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#9c4dcc;color:white;text-decoration:none;border-radius:8px;font-weight:500;">View & Claim This Lead</a>
        <p style="color:#4a4f5e;font-size:13px;">Click the link above to view the full inquiry and claim it for yourself.</p>
      </div>
    `
    
    for (const staffMember of staff.rows) {
      await resend.emails.send({
        from: 'Sitefloa <hello@sitefloa.com>',
        to: staffMember.email,
        subject: `New Client Inquiry: ${business_name}`,
        html: emailBody
      })
    }
    
    res.json({ message: 'Inquiry submitted', inquiry: inquiry.rows[0] })
  } catch(err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Get all inquiries for staff (filtered by role)
app.get('/inquiries', authMiddleware, staffOrContractorMiddleware, async (req, res) => {
  try {
    const user = req.user
    let query = 'SELECT * FROM client_inquiries WHERE '
    let params = []
    
    if (user.role === 'contractor') {
      // Contractors only see inquiries they've claimed or unclaimed
      query += 'claimed_by=$1 OR claimed_by IS NULL'
      params = [user.id]
    } else {
      // Admins and managers see all inquiries
      query += '1=1'
    }
    
    const inquiries = await pool.query(query + ' ORDER BY created_at DESC', params)
    res.json({ inquiries: inquiries.rows })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// Get single inquiry details
app.get('/inquiry/:id', authMiddleware, staffOrContractorMiddleware, async (req, res) => {
  try {
    const inquiry = await pool.query('SELECT * FROM client_inquiries WHERE id=$1', [req.params.id])
    if (!inquiry.rows[0]) return res.status(404).json({ error: 'Inquiry not found' })
    res.json(inquiry.rows[0])
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// Claim an inquiry
app.post('/inquiry/:id/claim', authMiddleware, staffOrContractorMiddleware, async (req, res) => {
  try {
    const inquiry = await pool.query('SELECT * FROM client_inquiries WHERE id=$1', [req.params.id])
    if (!inquiry.rows[0]) return res.status(404).json({ error: 'Inquiry not found' })
    if (inquiry.rows[0].claimed_by && inquiry.rows[0].claimed_by !== req.user.id) {
      return res.status(403).json({ error: 'This inquiry has already been claimed' })
    }
    
    const result = await pool.query(
      'UPDATE client_inquiries SET claimed_by=$1, claimed_at=NOW() WHERE id=$2 RETURNING *',
      [req.user.id, req.params.id]
    )
    res.json({ message: 'Inquiry claimed', inquiry: result.rows[0] })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// Get tier-locked form constraints
app.get('/form-constraints/:plan', async (req, res) => {
  const constraints = {
    basic: { max_photos: 2, max_services: 1, max_team: 0, has_gallery: true, has_hours: true, has_contact: true },
    standard: { max_photos: 6, max_services: 5, max_team: 3, has_gallery: true, has_hours: true, has_contact: true },
    premium: { max_photos: 20, max_services: 20, max_team: 10, has_gallery: true, has_hours: true, has_contact: true }
  }
  res.json(constraints[req.params.plan] || constraints.standard)
})

// ── CLIENT TRANSFER (Move client between contractors/managers) ──────
app.post('/admin/transfer-client', authMiddleware, adminMiddleware, async (req, res) => {
  const { website_id, new_creator_id } = req.body
  try {
    const result = await pool.query(
      'UPDATE websites SET created_by=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [new_creator_id, website_id]
    )
    res.json({ message: 'Client transferred', website: result.rows[0] })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// Get contractors and managers for transfer dropdown
app.get('/staff-list', authMiddleware, staffMiddleware, async (req, res) => {
  try {
    const staff = await pool.query(
      "SELECT id, email, role FROM clients WHERE role IN ('contractor', 'manager') ORDER BY email"
    )
    res.json({ staff: staff.rows })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// ── PAY PERIOD MANAGEMENT (Contractors & Managers) ────────────────
// Create pay period for contractor
app.post('/contractor/pay-period', authMiddleware, async (req, res) => {
  const { period_start, period_end, websites_created, total_earned, net_amount } = req.body
  try {
    const result = await pool.query(
      `INSERT INTO contractor_pay_periods 
       (contractor_id, period_start, period_end, websites_created, total_earned, net_amount, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
       RETURNING *`,
      [req.user.id, period_start, period_end, websites_created, total_earned, net_amount]
    )
    res.json({ message: 'Pay period created', pay_period: result.rows[0] })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// Get contractor pay periods
app.get('/contractor/pay-periods', authMiddleware, async (req, res) => {
  try {
    const periods = await pool.query(
      'SELECT * FROM contractor_pay_periods WHERE contractor_id=$1 ORDER BY period_start DESC',
      [req.user.id]
    )
    res.json({ pay_periods: periods.rows })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// Get all contractor earnings for admin (with net earnings chart)
app.get('/admin/contractor-earnings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const earnings = await pool.query(
      `SELECT c.id, c.email, COUNT(w.id) as websites_created, 
              COALESCE(SUM(cpp.total_earned), 0) as total_earned,
              COALESCE(SUM(cpp.net_amount), 0) as net_amount
       FROM clients c
       LEFT JOIN websites w ON w.created_by = c.id
       LEFT JOIN contractor_pay_periods cpp ON cpp.contractor_id = c.id
       WHERE c.role = 'contractor'
       GROUP BY c.id, c.email
       ORDER BY c.email`
    )
    res.json({ earnings: earnings.rows })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// Get manager performance stats
app.get('/admin/manager-performance', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const stats = await pool.query(
      `SELECT c.id, c.email, c.manager_commission_rate,
              COUNT(w.id) as websites_created,
              COALESCE(SUM(mp.total_revenue), 0) as revenue_brought_in,
              COALESCE(SUM(mp.commission_paid), 0) as commission_paid
       FROM clients c
       LEFT JOIN websites w ON w.created_by = c.id
       LEFT JOIN manager_pay_periods mp ON mp.manager_id = c.id
       WHERE c.role = 'manager'
       GROUP BY c.id, c.email, c.manager_commission_rate
       ORDER BY c.email`
    )
    res.json({ stats: stats.rows })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// Close pay period and pay manager/contractor
app.post('/admin/pay-period-complete', authMiddleware, adminMiddleware, async (req, res) => {
  const { staff_id, staff_role, amount, period_start, period_end } = req.body
  try {
    if (staff_role === 'manager') {
      const result = await pool.query(
        `INSERT INTO manager_pay_periods 
         (manager_id, period_start, period_end, total_revenue, commission_paid, created_at)
         VALUES ($1, $2, $3, 0, $4, NOW())
         RETURNING *`,
        [staff_id, period_start, period_end, amount]
      )
      // Send receipt email
      const staff = await pool.query('SELECT email FROM clients WHERE id=$1', [staff_id])
      if (staff.rows[0]) {
        await resend.emails.send({
          from: 'Sitefloa <hello@sitefloa.com>',
          to: staff.rows[0].email,
          subject: 'Your Payment Receipt',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
              <h2>Payment Receipt</h2>
              <p>Your payment for the period ${new Date(period_start).toLocaleDateString()} - ${new Date(period_end).toLocaleDateString()} has been processed.</p>
              <p><strong>Amount Paid: $${amount}</strong></p>
              <p>Thank you for your work!</p>
            </div>
          `
        })
      }
    } else if (staff_role === 'contractor') {
      await pool.query(
        `INSERT INTO contractor_pay_periods 
         (contractor_id, period_start, period_end, websites_created, total_earned, net_amount, created_at)
         VALUES ($1, $2, $3, 0, $4, $4, NOW())`,
        [staff_id, period_start, period_end, amount]
      )
      // Send receipt email
      const staff = await pool.query('SELECT email FROM clients WHERE id=$1', [staff_id])
      if (staff.rows[0]) {
        await resend.emails.send({
          from: 'Sitefloa <hello@sitefloa.com>',
          to: staff.rows[0].email,
          subject: 'Your Contractor Payment Receipt',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
              <h2>Payment Receipt</h2>
              <p>Your contractor payment for the period ${new Date(period_start).toLocaleDateString()} - ${new Date(period_end).toLocaleDateString()} has been processed.</p>
              <p><strong>Amount Paid: $${amount}</strong></p>
              <p>Thank you for your work!</p>
            </div>
          `
        })
      }
    }
    res.json({ message: 'Payment processed and receipt sent' })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// Get clients list (filtered by role and creator)
app.get('/admin/clients-list', authMiddleware, async (req, res) => {
  try {
    const user = req.user
    let query = `SELECT w.id, w.business_name, w.client_email, w.created_by, 
                        c.email as creator_email, c.role as creator_role, w.created_at
                 FROM websites w
                 LEFT JOIN clients c ON c.id = w.created_by
                 WHERE 1=1`
    const params = []
    
    if (user.role === 'contractor') {
      query += ' AND w.created_by = $' + (params.length + 1)
      params.push(user.id)
    }
    
    const clients = await pool.query(query + ' ORDER BY w.created_at DESC', params)
    res.json({ clients: clients.rows })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// ── EXISTING ENDPOINTS (keeping all original functionality) ──────

// Get site settings
app.get('/site-settings', async (req, res) => {
  try {
    const settings = await pool.query('SELECT * FROM site_settings ORDER BY id DESC LIMIT 1')
    if (settings.rows.length === 0) {
      return res.json({
        company_name: 'Sitefloa',
        plan_basic_price: 29,
        plan_standard_price: 49,
        plan_premium_price: 79,
        plan_basic_setup: 199,
        plan_standard_setup: 299,
        plan_premium_setup: 499
      })
    }
    res.json(settings.rows[0])
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// Save site settings
app.post('/admin/site-settings', authMiddleware, adminMiddleware, async (req, res) => {
  const { company_name, tagline, email, phone, address, instagram, facebook, tiktok, twitter, linkedin, youtube, plan_basic_price, plan_standard_price, plan_premium_price, plan_basic_setup, plan_standard_setup, plan_premium_setup, apply_prices_to } = req.body
  try {
    await pool.query(
      `INSERT INTO site_settings (company_name, tagline, email, phone, address, instagram, facebook, tiktok, twitter, linkedin, youtube, plan_basic_price, plan_standard_price, plan_premium_price, plan_basic_setup, plan_standard_setup, plan_premium_setup)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [company_name, tagline, email, phone, address, instagram, facebook, tiktok, twitter, linkedin, youtube, plan_basic_price, plan_standard_price, plan_premium_price, plan_basic_setup, plan_standard_setup, plan_premium_setup]
    )
    res.json({ message: 'Settings updated' })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// Get websites
app.get('/websites', authMiddleware, async (req, res) => {
  try {
    const websites = await pool.query('SELECT * FROM websites WHERE client_id=$1', [req.user.id])
    res.json({ websites: websites.rows })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// Create website
app.post('/websites', authMiddleware, async (req, res) => {
  const { business_name, plan } = req.body
  try {
    const result = await pool.query(
      'INSERT INTO websites (business_name, client_id, plan, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [business_name, req.user.id, plan, req.user.id]
    )
    res.json({ website: result.rows[0] })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// Get website by ID
app.get('/website/:id', authMiddleware, async (req, res) => {
  try {
    const website = await pool.query('SELECT * FROM websites WHERE id=$1', [req.params.id])
    if (website.rows.length === 0) return res.status(404).json({ error: 'Website not found' })
    res.json(website.rows[0])
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// Update website
app.put('/website/:id', authMiddleware, async (req, res) => {
  const { business_name, content } = req.body
  try {
    const result = await pool.query(
      'UPDATE websites SET business_name=$1, content=$2, updated_at=NOW() WHERE id=$3 RETURNING *',
      [business_name, content, req.params.id]
    )
    res.json({ website: result.rows[0] })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// Get admin stats
app.get('/admin/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const totalClients = await pool.query('SELECT COUNT(*) as count FROM clients WHERE role=$1', ['client'])
    const totalWebsites = await pool.query('SELECT COUNT(*) as count FROM websites')
    const activeSubscriptions = await pool.query('SELECT COUNT(*) as count FROM clients WHERE subscription_status=$1', ['active'])
    res.json({
      total_clients: parseInt(totalClients.rows[0].count),
      total_websites: parseInt(totalWebsites.rows[0].count),
      active_subscriptions: parseInt(activeSubscriptions.rows[0].count)
    })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// Get manager stats
app.get('/manager/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await pool.query(
      'SELECT COUNT(*) as count FROM websites WHERE created_by=$1',
      [req.user.id]
    )
    res.json({ websites_created: parseInt(stats.rows[0].count) })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// Get manager staff list
app.get('/admin/manager-staff', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const staff = await pool.query(
      "SELECT id, email, role FROM clients WHERE role IN ('manager', 'contractor') ORDER BY email"
    )
    res.json({ staff: staff.rows })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// ── BONUS GOALS ──────────────────────────────────────────────
app.post('/admin/bonus-goals', authMiddleware, adminMiddleware, async (req, res) => {
  const { title, target_clients, bonus_amount } = req.body
  try {
    const result = await pool.query(
      `INSERT INTO bonus_goals (title, target_clients, bonus_amount, active, period_start)
       VALUES ($1, $2, $3, TRUE, NOW())
       RETURNING *`,
      [title, target_clients, bonus_amount]
    )
    res.json({ goal: result.rows[0] })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/admin/bonus-goals', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const goals = await pool.query('SELECT * FROM bonus_goals ORDER BY created_at DESC')
    res.json({ goals: goals.rows })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/admin/bonus-goals/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE bonus_goals SET active=FALSE WHERE id=$1', [req.params.id])
    res.json({ message: 'Bonus goal removed' })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/bonus-progress/:contractorId', authMiddleware, async (req, res) => {
  try {
    const goal = await pool.query('SELECT * FROM bonus_goals WHERE active=TRUE LIMIT 1')
    if (!goal.rows[0]) return res.json({ goal: null, progress: 0 })
    const g = goal.rows[0]
    const progress = await pool.query(
      'SELECT COUNT(*) as count FROM websites WHERE created_by=$1 AND created_at>=$2',
      [req.params.contractorId, g.period_start]
    )
    const count = parseInt(progress.rows[0].count)
    const hit = count >= g.target_clients
    res.json({ goal: g, progress: count, hit })
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

// ── HEALTH CHECK ────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ message: 'Sitefloa server running!' })
  } catch(err) {
    res.status(500).json({ error: 'DB connection failed' })
  }
})

const PORT = process.env.PORT || 3000

// ── STRIPE ───────────────────────────────────────────────
const Stripe = require('stripe')
const stripe = Stripe(process.env.STRIPE_SECRET_KEY)

// Create checkout session
app.post('/create-checkout', authMiddleware, async (req, res) => {
  const { setup_fee, monthly_fee, plan, business_name } = req.body
  try {
    const client = await pool.query('SELECT * FROM clients WHERE id=$1', [req.user.id])
    const website = await pool.query('SELECT * FROM websites WHERE client_id=$1', [req.user.id])
    const clientData = client.rows[0]
    const websiteData = website.rows[0]

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
      subscription_data: {
        trial_period_days: 30,
        metadata: { client_id: req.user.id, plan: plan }
      },
      success_url: 'https://sitefloa.com?payment=success&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://sitefloa.com?payment=cancelled',
      metadata: { client_id: req.user.id, plan: plan }
    })

    res.json({ url: session.url, session_id: session.id })
  } catch(err) {
    console.error('Stripe error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Stripe webhook
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch(err) {
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

// Billing portal
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
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
