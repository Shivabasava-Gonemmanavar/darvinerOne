import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import dotenv from 'dotenv';
import { pool, audit } from './db.js';
import { MySQLSessionStore } from './mysqlSessionStore.js';

dotenv.config({ path: 'server/.env' });
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const uploadRoot = process.env.VERCEL
  ? path.join(os.tmpdir(), 'workflow-hr-uploads')
  : path.resolve(projectRoot, process.env.UPLOAD_DIR || 'server/uploads');
await fs.mkdir(uploadRoot, { recursive: true });

const app = express();
const port = Number(process.env.PORT || 3000);
const prod = process.env.NODE_ENV === 'production';
if (prod && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
  throw new Error('Set SESSION_SECRET to at least 32 random characters in production.');
}
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

const sessionStore = new MySQLSessionStore(pool);
app.use(session({
  name: 'workflow.sid',
  secret: process.env.SESSION_SECRET || 'development-only-change-this-secret-now',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: prod, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 }
}));

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const fail = (res, status, message) => res.status(status).json({ error: { message } });
const hasRole = (...roles) => (req, res, next) => roles.includes(req.user?.role) ? next() : fail(res, 403, 'You do not have permission to perform this action.');
const isoDate = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const datePart = (value) => value instanceof Date ? isoDate(value) : String(value || '').slice(0, 10);
const timePart = (value) => value ? new Date(value).toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }) : '';
const employeeView = (row) => ({
  id: row.employee_code, employeeId: row.employee_code, name: row.name, department: row.department,
  role: row.role, email: row.email, status: row.status, balance: Number(row.leave_balance),
  phone: row.phone || '', bloodGroup: row.blood_group || '', address: row.address || ''
});
const employeeSelect = `SELECT e.*, d.name AS department FROM employees e JOIN departments d ON d.id=e.department_id`;
const attendanceView = (row) => ({ id: Number(row.id), employeeId: Number(row.employee_id), employee: row.employee, date: datePart(row.work_date), status: row.status, checkIn: timePart(row.check_in_at), checkOut: timePart(row.check_out_at) });
const leaveView = (row) => ({ id: Number(row.id), employeeId: Number(row.employee_id), employee: row.employee, type: row.leave_type, from: datePart(row.start_date), to: datePart(row.end_date), days: Number(row.working_days), paidDays: Number(row.paid_days), lopDays: Number(row.lop_days), status: row.status, reason: row.reason, documentName: row.document_name || '', documentData: '', reviewerId: row.reviewer_id ? Number(row.reviewer_id) : null });
const leaveSelect = `SELECT l.*, e.name AS employee FROM leave_requests l JOIN employees e ON e.id=l.employee_id`;

async function loadUser(userId) {
  const [rows] = await pool.execute(`SELECT e.*,d.name AS department,u.id AS user_id FROM employees e JOIN departments d ON d.id=e.department_id JOIN users u ON u.employee_id=e.id WHERE u.id=? AND u.is_active=1 AND e.status='Active'`, [userId]);
  if (!rows[0]) return null;
  return { ...employeeView(rows[0]), userId: Number(rows[0].user_id || userId), dbEmployeeId: Number(rows[0].id) };
}
const requireAuth = asyncRoute(async (req, res, next) => {
  if (!req.session.userId) return fail(res, 401, 'Please sign in to continue.');
  const user = await loadUser(req.session.userId);
  if (!user) { req.session.destroy(() => {}); return fail(res, 401, 'Your session is no longer active. Please sign in again.'); }
  req.user = user;
  next();
});
const managerScope = (user, alias = 'e') => user.role === 'Admin' ? { sql: '1=1', params: [] }
  : user.role === 'Manager' ? { sql: `${alias}.department_id=?`, params: [user.departmentId] }
    : { sql: `${alias}.id=?`, params: [user.dbEmployeeId] };

// Rehydrate department id for the authorization scope on each authenticated request.
const attachDepartment = asyncRoute(async (req, res, next) => {
  if (req.user) {
    const [[row]] = await pool.execute('SELECT department_id FROM employees WHERE id=?', [req.user.dbEmployeeId]);
    req.user.departmentId = row?.department_id;
  }
  next();
});
app.get('/api/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', database: 'connected' });
}));

const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
app.post('/api/v1/auth/login', loginLimit, asyncRoute(async (req, res) => {
  const schema = z.object({ email: z.string().email().max(190), password: z.string().min(1).max(200) });
  const input = schema.safeParse(req.body);
  if (!input.success) return fail(res, 400, 'Enter a valid email and password.');
  const email = input.data.email.trim().toLowerCase();
  const [rows] = await pool.execute(
    `SELECT e.*,d.name AS department,u.id AS user_id,u.password_hash FROM employees e JOIN departments d ON d.id=e.department_id JOIN users u ON u.employee_id=e.id WHERE u.email=? AND u.is_active=1 AND e.status='Active'`, [email]
  );
  const row = rows[0];
  if (!row || !(await bcrypt.compare(input.data.password, row.password_hash))) return fail(res, 401, 'Email or password is incorrect.');
  await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
  req.session.userId = Number(row.user_id);
  await pool.execute('UPDATE users SET last_login_at=UTC_TIMESTAMP() WHERE id=?', [row.user_id]);
  await audit(row.user_id, 'login', 'user', row.user_id);
  res.json({ user: employeeView(row) });
}));
app.post('/api/v1/auth/logout', asyncRoute(async (req, res) => {
  if (req.session.userId) await audit(req.session.userId, 'logout', 'user', req.session.userId);
  req.session.destroy((error) => error ? res.status(500).json({ error: { message: 'Could not sign out.' } }) : res.clearCookie('workflow.sid').json({ ok: true }));
}));
app.get('/api/v1/auth/me', requireAuth, attachDepartment, (req, res) => res.json({ user: { id: req.user.employeeId, employeeId: req.user.employeeId, email: req.user.email, name: req.user.name, role: req.user.role } }));

app.use('/api/v1', requireAuth, attachDepartment);

app.get('/api/v1/bootstrap', asyncRoute(async (req, res) => {
  const scope = managerScope(req.user);
  const [employees] = await pool.execute(`${employeeSelect} WHERE ${scope.sql} ORDER BY e.name`, scope.params);
  const [leaves] = await pool.execute(`${leaveSelect} WHERE ${req.user.role === 'Admin' ? '1=1' : req.user.role === 'Manager' ? 'e.department_id=?' : 'e.id=?'} ORDER BY l.created_at DESC`, req.user.role === 'Admin' ? [] : req.user.role === 'Manager' ? [req.user.departmentId] : [req.user.dbEmployeeId]);
  const [attendance] = await pool.execute(`SELECT a.*, e.name AS employee FROM attendance a JOIN employees e ON e.id=a.employee_id WHERE ${req.user.role === 'Admin' ? '1=1' : req.user.role === 'Manager' ? 'e.department_id=?' : 'e.id=?'} ORDER BY a.work_date DESC LIMIT 1000`, req.user.role === 'Admin' ? [] : req.user.role === 'Manager' ? [req.user.departmentId] : [req.user.dbEmployeeId]);
  const [holidays] = await pool.execute('SELECT id, holiday_date, name FROM holidays ORDER BY holiday_date');
  const [slips] = await pool.execute(`SELECT p.id, p.employee_id, p.pay_month, p.file_name, e.employee_code FROM payslips p JOIN employees e ON e.id=p.employee_id WHERE ${req.user.role === 'Admin' ? '1=1' : 'p.employee_id=?'} ORDER BY p.pay_month DESC`, req.user.role === 'Admin' ? [] : [req.user.dbEmployeeId]);
  const [tickets] = await pool.execute(`SELECT t.*, e.name AS employee FROM tickets t JOIN employees e ON e.id=t.employee_id WHERE ${req.user.role === 'Admin' ? '1=1' : req.user.role === 'Manager' ? 'e.department_id=?' : 't.employee_id=?'} ORDER BY t.created_at DESC`, req.user.role === 'Admin' ? [] : req.user.role === 'Manager' ? [req.user.departmentId] : [req.user.dbEmployeeId]);
  res.json({
    user: { id: req.user.employeeId, employeeId: req.user.employeeId, email: req.user.email, name: req.user.name, role: req.user.role },
    employees: employees.map(employeeView), leaves: leaves.map(leaveView), attendance: attendance.map(attendanceView),
    holidays: holidays.map((h) => ({ id: Number(h.id), date: datePart(h.holiday_date), name: h.name })),
    payslips: slips.map((p) => ({ id: String(p.id), employeeId: String(p.employee_code), month: p.pay_month, fileName: p.file_name })),
    tickets: tickets.map((t) => ({ id: Number(t.id), employeeId: Number(t.employee_id), employee: t.employee, subject: t.subject, description: t.description, priority: t.priority, status: t.status, createdAt: t.created_at }))
  });
}));

app.get('/api/v1/employees', asyncRoute(async (req, res) => {
  const scope = managerScope(req.user);
  const [rows] = await pool.execute(`${employeeSelect} WHERE ${scope.sql} ORDER BY e.name`, scope.params);
  res.json({ data: rows.map(employeeView) });
}));
app.post('/api/v1/employees', hasRole('Admin'), asyncRoute(async (req, res) => {
  const schema = z.object({ id: z.string().min(2).max(30), name: z.string().min(1).max(160), department: z.string().min(1).max(100), role: z.enum(['Employee','Manager','Admin']), email: z.string().email().max(190), password: z.string().min(12).max(200), phone: z.string().max(40).optional(), bloodGroup: z.string().max(12).optional(), address: z.string().max(500).optional(), balance: z.coerce.number().min(0).max(365).default(18) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message);
  const d = parsed.data; const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('INSERT INTO departments(name) VALUES (?) ON DUPLICATE KEY UPDATE name=VALUES(name)', [d.department.trim()]);
    const [[department]] = await connection.execute('SELECT id FROM departments WHERE name=?', [d.department.trim()]);
    const email = d.email.trim().toLowerCase();
    const [result] = await connection.execute('INSERT INTO employees(employee_code,name,email,department_id,role,phone,blood_group,address,leave_balance) VALUES (?,?,?,?,?,?,?,?,?)', [d.id.trim().toUpperCase(),d.name.trim(),email,department.id,d.role,d.phone || null,d.bloodGroup || null,d.address || null,d.balance]);
    const hash = await bcrypt.hash(d.password, 12);
    await connection.execute('INSERT INTO users(employee_id,email,password_hash,role) VALUES (?,?,?,?)', [result.insertId,email,hash,d.role]);
    await connection.commit(); await audit(req.user.userId, 'employee.create', 'employee', result.insertId);
    const [[row]] = await pool.execute(`${employeeSelect} WHERE e.id=?`, [result.insertId]);
    res.status(201).json({ data: employeeView(row) });
  } catch (error) { await connection.rollback(); if (error.code === 'ER_DUP_ENTRY') return fail(res, 409, 'Employee ID or email already exists.'); throw error; }
  finally { connection.release(); }
}));
app.patch('/api/v1/employees/:id', asyncRoute(async (req, res) => {
  const [[employee]] = await pool.execute(`${employeeSelect} WHERE e.employee_code=?`, [req.params.id]);
  if (!employee) return fail(res, 404, 'Employee not found.');
  if (req.user.role === 'Employee' || (req.user.role === 'Manager' && employee.department_id !== req.user.departmentId)) return fail(res, 403, 'You cannot edit this employee.');
  const schema = z.object({ name: z.string().min(1).max(160), email: z.string().email().max(190), department: z.string().max(100).optional(), role: z.enum(['Employee','Manager','Admin']).optional(), status: z.enum(['Active','Inactive']).optional(), phone: z.string().max(40).optional(), bloodGroup: z.string().max(12).optional(), address: z.string().max(500).optional(), balance: z.coerce.number().min(0).max(365) });
  const parsed = schema.safeParse(req.body); if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message);
  const d=parsed.data; const role=req.user.role==='Admin' ? (d.role || employee.role) : employee.role; const departmentName=req.user.role==='Admin' ? (d.department || employee.department) : employee.department; const status=req.user.role==='Admin' ? (d.status || employee.status) : employee.status;
  if (employee.id === req.user.dbEmployeeId && (role !== req.user.role || status !== 'Active')) return fail(res, 400, 'You cannot remove or change your own access role.');
  const connection=await pool.getConnection();
  try {
    await connection.beginTransaction(); await connection.execute('INSERT INTO departments(name) VALUES (?) ON DUPLICATE KEY UPDATE name=VALUES(name)',[departmentName]);
    const [[dept]]=await connection.execute('SELECT id FROM departments WHERE name=?',[departmentName]);
    const email=d.email.trim().toLowerCase();
    await connection.execute('UPDATE employees SET name=?,email=?,department_id=?,role=?,status=?,phone=?,blood_group=?,address=?,leave_balance=? WHERE id=?',[d.name.trim(),email,dept.id,role,status,d.phone||null,d.bloodGroup||null,d.address||null,d.balance,employee.id]);
    await connection.execute('UPDATE users SET email=?,role=?,is_active=? WHERE employee_id=?',[email,role,status==='Active',employee.id]);
    await connection.commit(); await audit(req.user.userId,'employee.update','employee',employee.id);
    const [[row]]=await pool.execute(`${employeeSelect} WHERE e.id=?`,[employee.id]); res.json({data:employeeView(row)});
  } catch(error){await connection.rollback();if(error.code==='ER_DUP_ENTRY')return fail(res,409,'Email already exists.');throw error;} finally{connection.release();}
}));
app.delete('/api/v1/employees/:id', hasRole('Admin'), asyncRoute(async (req,res)=>{
  const [[target]] = await pool.execute('SELECT id FROM employees WHERE employee_code=?', [req.params.id]);
  if (!target) return fail(res,404,'Employee not found.');
  if (Number(target.id) === req.user.dbEmployeeId) return fail(res,409,'You cannot deactivate your own account.');
  const [result]=await pool.execute("UPDATE employees SET status='Inactive' WHERE employee_code=?",[req.params.id]);
  await pool.execute('UPDATE users u JOIN employees e ON e.id=u.employee_id SET u.is_active=0 WHERE e.employee_code=?',[req.params.id]);
  await audit(req.user.userId,'employee.deactivate','employee',req.params.id);res.json({ok:true});
}));

app.get('/api/v1/attendance', asyncRoute(async(req,res)=>{
  const scope=managerScope(req.user,'e'); const month=String(req.query.month||'');
  const filter=month ? ' AND DATE_FORMAT(a.work_date, \'%Y-%m\')=?' : ''; const params=[...scope.params,...(month?[month]:[])];
  const [rows]=await pool.execute(`SELECT a.*,e.name AS employee FROM attendance a JOIN employees e ON e.id=a.employee_id WHERE ${scope.sql}${filter} ORDER BY a.work_date DESC LIMIT 2000`,params);res.json({data:rows.map(attendanceView)});
}));
app.post('/api/v1/attendance/check-in', asyncRoute(async(req,res)=>{
  const today=isoDate(new Date());const now=new Date();const time=now.toLocaleTimeString('en-GB',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hour12:false});const status=time>'09:45'?'Late':'Present';
  try{const [result]=await pool.execute('INSERT INTO attendance(employee_id,work_date,status,check_in_at) VALUES(?,?,?,UTC_TIMESTAMP())',[req.user.dbEmployeeId,today,status]);await audit(req.user.userId,'attendance.check-in','attendance',result.insertId);res.status(201).json({data:{id:result.insertId,employee:req.user.name,date:today,status,checkIn:time,checkOut:''}});}catch(error){if(error.code==='ER_DUP_ENTRY')return fail(res,409,'Attendance is already marked for today.');throw error;}
}));
app.post('/api/v1/attendance/check-out', asyncRoute(async(req,res)=>{
  const today=isoDate(new Date());const [result]=await pool.execute('UPDATE attendance SET check_out_at=UTC_TIMESTAMP() WHERE employee_id=? AND work_date=? AND check_out_at IS NULL',[req.user.dbEmployeeId,today]);if(!result.affectedRows)return fail(res,409,'No open attendance record was found for today.');res.json({ok:true});
}));

app.get('/api/v1/leaves', asyncRoute(async(req,res)=>{const scope=managerScope(req.user,'e');const [rows]=await pool.execute(`${leaveSelect} WHERE ${scope.sql} ORDER BY l.created_at DESC`,scope.params);res.json({data:rows.map(leaveView)});}));
app.post('/api/v1/leaves', asyncRoute(async(req,res)=>{
  const schema=z.object({type:z.enum(['Paid Leave','Sick Leave','Maternity Leave','Paternity Leave']),from:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),to:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),reason:z.string().min(1).max(1000),documentName:z.string().max(255).optional(),documentData:z.string().max(14000000).optional()});const p=schema.safeParse(req.body);if(!p.success)return fail(res,400,p.error.issues[0].message);const d=p.data;if(d.to<d.from)return fail(res,400,'Invalid date range.');
  const [holidays]=await pool.execute('SELECT holiday_date FROM holidays WHERE holiday_date BETWEEN ? AND ?',[d.from,d.to]);const holidaySet=new Set(holidays.map(h=>datePart(h.holiday_date)));let days=0;for(let day=new Date(`${d.from}T12:00:00Z`);day<=new Date(`${d.to}T12:00:00Z`);day.setUTCDate(day.getUTCDate()+1)){const key=day.toISOString().slice(0,10);if(day.getUTCDay()!==0&&day.getUTCDay()!==6&&!holidaySet.has(key))days++;}if(!days)return fail(res,400,'No working days are selected.');if(d.type==='Sick Leave'&&days>3&&!d.documentData)return fail(res,400,'Supporting document is required for Sick Leave over 3 working days.');
  const [[person]]=await pool.execute('SELECT leave_balance FROM employees WHERE id=?',[req.user.dbEmployeeId]);const paid=Math.min(days,Number(person.leave_balance));const lop=days-paid;if(d.type==='Paid Leave'&&lop>0)return fail(res,400,'Insufficient leave balance.');let docPath=null;
  if(d.documentData){const match=d.documentData.match(/^data:(application\/pdf|image\/(?:png|jpeg));base64,([\s\S]+)$/);if(!match)return fail(res,400,'Supporting document must be a PDF, PNG or JPEG.');const buffer=Buffer.from(match[2],'base64');if(buffer.length>10*1024*1024)return fail(res,400,'Supporting document is too large (10 MB maximum).');const signature=match[1]==='application/pdf'?buffer.subarray(0,5).toString()==='%PDF-':match[1]==='image/png'?buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):buffer.subarray(0,3).equals(Buffer.from([255,216,255]));if(!signature)return fail(res,400,'Supporting document content does not match its file type.');const file=crypto.randomUUID()+ (match[1]==='application/pdf'?'.pdf':match[1]==='image/png'?'.png':'.jpg');const dir=path.join(uploadRoot,'leave');await fs.mkdir(dir,{recursive:true});docPath=path.join(dir,file);await fs.writeFile(docPath,buffer,{flag:'wx'});}
  const [result]=await pool.execute('INSERT INTO leave_requests(employee_id,leave_type,start_date,end_date,working_days,paid_days,lop_days,reason,document_name,document_path) VALUES(?,?,?,?,?,?,?,?,?,?)',[req.user.dbEmployeeId,d.type,d.from,d.to,days,paid,lop,d.reason.trim(),d.documentName||null,docPath]);await audit(req.user.userId,'leave.submit','leave_request',result.insertId);res.status(201).json({data:{id:result.insertId,employeeId:req.user.employeeId,employee:req.user.name,type:d.type,from:d.from,to:d.to,days,paidDays:paid,lopDays:lop,status:'Pending',reason:d.reason,documentName:d.documentName||''}});
}));
app.post('/api/v1/leaves/:id/:decision', hasRole('Manager','Admin'), asyncRoute(async(req,res)=>{
  const decision=req.params.decision==='approve'?'Approved':req.params.decision==='reject'?'Rejected':null;if(!decision)return fail(res,404,'Unknown leave action.');const connection=await pool.getConnection();
  try{await connection.beginTransaction();const [[leave]]=await connection.execute('SELECT l.*,e.department_id FROM leave_requests l JOIN employees e ON e.id=l.employee_id WHERE l.id=? FOR UPDATE',[req.params.id]);if(!leave){await connection.rollback();return fail(res,404,'Leave request not found.');}if(req.user.role==='Manager'&&leave.department_id!==req.user.departmentId){await connection.rollback();return fail(res,403,'This request is outside your department.');}if(leave.status!=='Pending'){await connection.rollback();return fail(res,409,'This request has already been reviewed.');}if(decision==='Approved'&&Number(leave.paid_days)>0){const [updated]=await connection.execute('UPDATE employees SET leave_balance=leave_balance-? WHERE id=? AND leave_balance>=?',[leave.paid_days,leave.employee_id,leave.paid_days]);if(!updated.affectedRows){await connection.rollback();return fail(res,409,'Employee no longer has enough leave balance.');}}await connection.execute('UPDATE leave_requests SET status=?,reviewer_id=?,reviewed_at=UTC_TIMESTAMP() WHERE id=?',[decision,req.user.userId,leave.id]);await connection.commit();await audit(req.user.userId,`leave.${decision.toLowerCase()}`,'leave_request',leave.id);res.json({ok:true,status:decision});}catch(error){await connection.rollback();throw error;}finally{connection.release();}
}));

app.get('/api/v1/holidays', asyncRoute(async(_req,res)=>{const [rows]=await pool.execute('SELECT id,holiday_date,name FROM holidays ORDER BY holiday_date');res.json({data:rows.map(h=>({id:Number(h.id),date:datePart(h.holiday_date),name:h.name}))});}));
app.post('/api/v1/holidays',hasRole('Admin'),asyncRoute(async(req,res)=>{const p=z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),name:z.string().min(1).max(160)}).safeParse(req.body);if(!p.success)return fail(res,400,'Enter a valid holiday date and name.');try{const [r]=await pool.execute('INSERT INTO holidays(holiday_date,name,created_by) VALUES(?,?,?)',[p.data.date,p.data.name.trim(),req.user.userId]);await audit(req.user.userId,'holiday.create','holiday',r.insertId);res.status(201).json({data:{id:r.insertId,...p.data}});}catch(e){if(e.code==='ER_DUP_ENTRY')return fail(res,409,'A holiday already exists on this date.');throw e;}}));

app.get('/api/v1/tickets',asyncRoute(async(req,res)=>{const [rows]=await pool.execute(`SELECT t.*,e.name AS employee FROM tickets t JOIN employees e ON e.id=t.employee_id WHERE ${req.user.role==='Admin'?'1=1':req.user.role==='Manager'?'e.department_id=?':'t.employee_id=?'} ORDER BY t.created_at DESC`,req.user.role==='Admin'?[]:req.user.role==='Manager'?[req.user.departmentId]:[req.user.dbEmployeeId]);res.json({data:rows.map(t=>({id:Number(t.id),employeeId:Number(t.employee_id),employee:t.employee,subject:t.subject,description:t.description,priority:t.priority,status:t.status,createdAt:t.created_at}))});}));
app.post('/api/v1/tickets',asyncRoute(async(req,res)=>{const p=z.object({subject:z.string().trim().min(3).max(180),description:z.string().trim().min(5).max(5000),priority:z.enum(['Low','Normal','High']).default('Normal')}).safeParse(req.body);if(!p.success)return fail(res,400,p.error.issues[0].message);const [r]=await pool.execute('INSERT INTO tickets(employee_id,subject,description,priority) VALUES(?,?,?,?)',[req.user.dbEmployeeId,p.data.subject,p.data.description,p.data.priority]);await audit(req.user.userId,'ticket.create','ticket',r.insertId);res.status(201).json({ok:true,id:r.insertId});}));
app.patch('/api/v1/tickets/:id',hasRole('Manager','Admin'),asyncRoute(async(req,res)=>{const p=z.object({status:z.enum(['Open','In Progress','Resolved'])}).safeParse(req.body);if(!p.success)return fail(res,400,'Choose a valid ticket status.');const [[ticket]]=await pool.execute('SELECT t.id,e.department_id FROM tickets t JOIN employees e ON e.id=t.employee_id WHERE t.id=?',[req.params.id]);if(!ticket)return fail(res,404,'Ticket not found.');if(req.user.role==='Manager'&&ticket.department_id!==req.user.departmentId)return fail(res,403,'This ticket is outside your department.');await pool.execute('UPDATE tickets SET status=?,assigned_to=?,resolved_at=? WHERE id=?',[p.data.status,req.user.userId,p.data.status==='Resolved'?new Date():null,req.params.id]);await audit(req.user.userId,'ticket.update','ticket',req.params.id,{status:p.data.status});res.json({ok:true});}));

const storage=multer.diskStorage({destination:async(_req,_file,cb)=>{const d=path.join(uploadRoot,'payslips');await fs.mkdir(d,{recursive:true});cb(null,d);},filename:(_req,file,cb)=>cb(null,`${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)});
const upload=multer({storage,limits:{fileSize:Number(process.env.MAX_UPLOAD_MB||10)*1024*1024},fileFilter:(_req,file,cb)=>cb(null,file.mimetype==='application/pdf'&&path.extname(file.originalname).toLowerCase()==='.pdf')});
app.get('/api/v1/payslips',asyncRoute(async(req,res)=>{const [rows]=await pool.execute(`SELECT p.id,p.employee_id,p.pay_month,p.file_name,e.employee_code,e.name FROM payslips p JOIN employees e ON e.id=p.employee_id WHERE ${req.user.role==='Admin'?'1=1':'p.employee_id=?'} ORDER BY p.pay_month DESC`,req.user.role==='Admin'?[]:[req.user.dbEmployeeId]);res.json({data:rows.map(p=>({id:String(p.id),employeeId:p.employee_code,employee:p.name,month:p.pay_month,fileName:p.file_name}))});}));
app.post('/api/v1/payslips',hasRole('Admin'),upload.single('file'),asyncRoute(async(req,res)=>{if(!req.file)return fail(res,400,'Select a PDF file.');const head=await fs.readFile(req.file.path);if(head.subarray(0,5).toString()!=='%PDF-'){await fs.unlink(req.file.path);return fail(res,400,'The uploaded file is not a valid PDF.');}const month=String(req.body.month||'');const employeeId=String(req.body.employeeId||'');if(!/^\d{4}-\d{2}$/.test(month)){await fs.unlink(req.file.path);return fail(res,400,'Select a valid pay month.');}const [[employee]]=await pool.execute('SELECT id FROM employees WHERE employee_code=?',[employeeId]);if(!employee){await fs.unlink(req.file.path);return fail(res,404,'Employee not found.');}const storageKey=path.relative(uploadRoot,req.file.path);try{await pool.execute('INSERT INTO payslips(employee_id,pay_month,storage_key,file_name,uploaded_by) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE storage_key=VALUES(storage_key),file_name=VALUES(file_name),uploaded_by=VALUES(uploaded_by)',[employee.id,month,storageKey,path.basename(req.file.originalname),req.user.userId]);await audit(req.user.userId,'payslip.upload','payslip',`${employeeId}-${month}`);res.status(201).json({ok:true});}catch(error){await fs.unlink(req.file.path).catch(()=>{});throw error;}}));
app.get('/api/v1/payslips/:id/download',asyncRoute(async(req,res)=>{const [rows]=await pool.execute('SELECT p.*,e.employee_code,e.department_id FROM payslips p JOIN employees e ON e.id=p.employee_id WHERE p.id=?',[req.params.id]);const p=rows[0];if(!p)return fail(res,404,'Payslip not found.');if(req.user.role!=='Admin'&&p.employee_id!==req.user.dbEmployeeId)return fail(res,403,'You cannot download this payslip.');const full=path.resolve(uploadRoot,p.storage_key);if(!full.startsWith(`${uploadRoot}${path.sep}`))return fail(res,400,'Invalid file path.');await fs.access(full);await audit(req.user.userId,'payslip.download','payslip',p.id);res.download(full,p.file_name);}));
app.delete('/api/v1/payslips/:id',hasRole('Admin'),asyncRoute(async(req,res)=>{const [[row]]=await pool.execute('SELECT storage_key FROM payslips WHERE id=?',[req.params.id]);if(!row)return fail(res,404,'Payslip not found.');await pool.execute('DELETE FROM payslips WHERE id=?',[req.params.id]);await fs.unlink(path.resolve(uploadRoot,row.storage_key)).catch(()=>{});await audit(req.user.userId,'payslip.delete','payslip',req.params.id);res.json({ok:true});}));

app.get('/api/v1/dashboard/summary',asyncRoute(async(req,res)=>{const scope=managerScope(req.user,'e');const [[{totalEmployees}]]=await pool.execute(`SELECT COUNT(*) AS totalEmployees FROM employees e WHERE ${scope.sql} AND e.status='Active'`,scope.params);const today=isoDate(new Date());const [[{present}]]=await pool.execute(`SELECT COUNT(*) AS present FROM attendance a JOIN employees e ON e.id=a.employee_id WHERE ${scope.sql} AND a.work_date=? AND a.status IN ('Present','Late')`,[...scope.params,today]);const [[{pendingLeaves}]]=await pool.execute(`SELECT COUNT(*) AS pendingLeaves FROM leave_requests l JOIN employees e ON e.id=l.employee_id WHERE ${scope.sql} AND l.status='Pending'`,scope.params);const [[{holidayCount}]]=await pool.execute('SELECT COUNT(*) AS holidayCount FROM holidays');res.json({data:{totalEmployees:Number(totalEmployees),presentToday:Number(present),pendingLeaves:Number(pendingLeaves),holidays:Number(holidayCount)}});}));
app.get('/api/v1/reports/attendance',asyncRoute(async(req,res)=>{const scope=managerScope(req.user,'e');const month=String(req.query.month||'');if(!/^\d{4}-\d{2}$/.test(month))return fail(res,400,'Month must use YYYY-MM.');const [rows]=await pool.execute(`SELECT a.*,e.name AS employee,e.employee_code,d.name AS department FROM attendance a JOIN employees e ON e.id=a.employee_id JOIN departments d ON d.id=e.department_id WHERE ${scope.sql} AND DATE_FORMAT(a.work_date,'%Y-%m')=? ORDER BY a.work_date,e.name`,[...scope.params,month]);res.json({data:rows.map(r=>({...attendanceView(r),employeeId:r.employee_code,department:r.department}))});}));

app.use('/api/v1', (_req,res)=>fail(res,404,'API route not found.'));
const staticRoot = process.env.VERCEL ? path.join(projectRoot, 'public') : projectRoot;
app.use('/src',express.static(path.join(staticRoot,'src'),{dotfiles:'deny',index:false}));
app.get('/styles.css',(_req,res)=>res.sendFile(path.join(staticRoot,'styles.css')));
app.get('/',(_req,res)=>res.sendFile(path.join(staticRoot,'index.html')));
app.get('*',(req,res,next)=>req.path.startsWith('/api/')?next():res.status(404).send('Not found'));
app.use((error,_req,res,_next)=>{console.error(error);if(error instanceof multer.MulterError)return fail(res,400,error.code==='LIMIT_FILE_SIZE'?'File is too large.':'Invalid upload.');res.status(500).json({error:{message:prod?'A server error occurred.':error.message}});});

export default app;

if (!process.env.VERCEL) {
  const server=app.listen(port,()=>console.log(`WorkFlow HR is running at http://localhost:${port}`));
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(async()=>{sessionStore.close();await pool.end();process.exit(0);}));
}
