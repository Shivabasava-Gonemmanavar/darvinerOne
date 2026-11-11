export const defaultUsers = [
  { email: 'rahul@company.com', password: '123456', role: 'Employee', employeeId: 'EMP002' },
  { email: 'priya@company.com', password: '123456', role: 'Manager', employeeId: 'EMP003' },
  { email: 'shiva@company.com', password: '123456', role: 'Admin', employeeId: 'EMP001' }
];

export const defaultData = {
  employees: [
    { id: 'EMP001', name: 'Shiva Gonemmanavar', department: 'QA', role: 'Admin', email: 'shiva@company.com', status: 'Active', balance: 18 },
    { id: 'EMP002', name: 'Rahul Kumar', department: 'Engineering', role: 'Employee', email: 'rahul@company.com', status: 'Active', balance: 14 },
    { id: 'EMP003', name: 'Priya Sharma', department: 'HR', role: 'Manager', email: 'priya@company.com', status: 'Active', balance: 16 },
    { id: 'EMP004', name: 'Arun Kumar', department: 'Engineering', role: 'Employee', email: 'arun@company.com', status: 'Active', balance: 12 }
  ],
  leaves: [
    { id: 1, employee: 'Rahul Kumar', type: 'Sick Leave', from: '2026-08-13', to: '2026-08-13', days: 1, status: 'Pending', reason: 'Not feeling well' },
    { id: 2, employee: 'Shiva Gonemmanavar', type: 'Paid Leave', from: '2026-08-14', to: '2026-08-15', days: 2, status: 'Approved', reason: 'Personal work' }
  ],
  holidays: [
    { id: 1, date: '2026-08-15', name: 'Independence Day' },
    { id: 2, date: '2026-08-27', name: 'Ganesh Chaturthi' }
  ],
  attendance: [
    { date: '2026-08-12', employee: 'Shiva Gonemmanavar', status: 'Present', checkIn: '09:35', checkOut: '18:20' },
    { date: '2026-08-12', employee: 'Rahul Kumar', status: 'Present', checkIn: '09:48', checkOut: '18:05' },
    { date: '2026-08-12', employee: 'Priya Sharma', status: 'Present', checkIn: '09:20', checkOut: '17:55' },
    { date: '2026-08-12', employee: 'Arun Kumar', status: 'Late', checkIn: '10:25', checkOut: '18:15' }
  ],
  payslips: [],
  policies: [],
  tickets: []
};
