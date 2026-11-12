CREATE DATABASE IF NOT EXISTS workflow_hr CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE workflow_hr;

CREATE TABLE IF NOT EXISTS departments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS employees (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  employee_code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  department_id BIGINT UNSIGNED NOT NULL,
  role ENUM('Employee','Manager','Admin') NOT NULL DEFAULT 'Employee',
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  phone VARCHAR(40) NULL,
  blood_group VARCHAR(12) NULL,
  address VARCHAR(500) NULL,
  leave_balance DECIMAL(7,2) NOT NULL DEFAULT 18,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_employees_department FOREIGN KEY (department_id) REFERENCES departments(id),
  INDEX idx_employees_department (department_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL UNIQUE,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('Employee','Manager','Admin') NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS web_sessions (
  session_id VARCHAR(128) NOT NULL PRIMARY KEY,
  expires_at BIGINT UNSIGNED NOT NULL,
  session_data MEDIUMTEXT NOT NULL,
  INDEX idx_web_sessions_expiry (expires_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL,
  work_date DATE NOT NULL,
  status ENUM('Present','Late','Sick Leave','Absent') NOT NULL DEFAULT 'Present',
  check_in_at DATETIME NULL,
  check_out_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
  UNIQUE KEY uq_attendance_employee_date (employee_id, work_date),
  INDEX idx_attendance_date (work_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS holidays (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  holiday_date DATE NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_holidays_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS leave_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL,
  leave_type ENUM('Paid Leave','Sick Leave','Maternity Leave','Paternity Leave') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  working_days DECIMAL(6,2) NOT NULL,
  paid_days DECIMAL(6,2) NOT NULL,
  lop_days DECIMAL(6,2) NOT NULL DEFAULT 0,
  status ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  reason VARCHAR(1000) NOT NULL,
  document_name VARCHAR(255) NULL,
  document_path VARCHAR(500) NULL,
  reviewer_id BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_leave_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
  CONSTRAINT fk_leave_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_leave_employee_status (employee_id, status),
  INDEX idx_leave_dates (start_date, end_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payslips (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL,
  pay_month CHAR(7) NOT NULL,
  storage_key VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  uploaded_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payslip_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
  CONSTRAINT fk_payslip_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_payslip_employee_month (employee_id, pay_month)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tickets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL,
  subject VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('Low','Normal','High') NOT NULL DEFAULT 'Normal',
  status ENUM('Open','In Progress','Resolved') NOT NULL DEFAULT 'Open',
  assigned_to BIGINT UNSIGNED NULL,
  resolved_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ticket_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
  CONSTRAINT fk_ticket_assignee FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_tickets_status (status, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_user_id BIGINT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80) NULL,
  details JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;
