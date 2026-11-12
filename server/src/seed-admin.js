import bcrypt from 'bcryptjs';
import { emitKeypressEvents } from 'node:readline';
import { pool } from './db.js';

function readPassword() {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    if (process.env.INITIAL_ADMIN_PASSWORD) return Promise.resolve(process.env.INITIAL_ADMIN_PASSWORD);
    return Promise.reject(new Error('Run this command in an interactive terminal to enter the password securely.'));
  }
  return new Promise((resolve, reject) => {
    process.stdout.write('Initial admin password (12+ characters): ');
    emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    let value = '';
    const onKey = (key, info) => {
      if (info?.name === 'return' || info?.name === 'enter') {
        process.stdin.off('keypress', onKey); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); resolve(value); return;
      }
      if (info?.ctrl && info.name === 'c') {
        process.stdin.off('keypress', onKey); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); reject(new Error('Cancelled.')); return;
      }
      if (info?.name === 'backspace') value = value.slice(0, -1);
      else if (!info?.ctrl && key) value += key;
    };
    process.stdin.on('keypress', onKey);
  });
}

const [employeeCode, name, emailValue, departmentName = 'Administration'] = process.argv.slice(2);
let password = '';
try { password = await readPassword(); }
catch (error) { console.error(error.message); process.exitCode = 1; }
if (!employeeCode || !name || !emailValue || password.length < 12) {
  console.error('Usage: npm run db:seed-admin -- EMP001 "Admin Name" admin@example.com [Department] (password is entered as a hidden prompt)');
  process.exitCode = 1;
} else {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('INSERT INTO departments(name) VALUES (?) ON DUPLICATE KEY UPDATE name=VALUES(name)', [departmentName]);
    const [[department]] = await connection.execute('SELECT id FROM departments WHERE name=?', [departmentName]);
    const email = emailValue.trim().toLowerCase();
    await connection.execute(
      'INSERT INTO employees(employee_code,name,email,department_id,role,status) VALUES (?,?,?,?,\'Admin\',\'Active\')',
      [employeeCode.trim().toUpperCase(), name.trim(), email, department.id]
    );
    const [[employee]] = await connection.execute('SELECT id FROM employees WHERE employee_code=?', [employeeCode.trim().toUpperCase()]);
    const hash = await bcrypt.hash(password, 12);
    await connection.execute('INSERT INTO users(employee_id,email,password_hash,role) VALUES (?,?,?,\'Admin\')', [employee.id, email, hash]);
    await connection.commit();
    console.log(`Admin account created for ${email}.`);
  } catch (error) {
    await connection.rollback();
    console.error('Could not create admin:', error.message);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}
