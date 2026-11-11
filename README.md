# WorkFlow HR — LMS & Attendance v2

A professional front-end structure refactor for the original single-file HR management dashboard.

## Project structure

```text
LMS_Attendance_Frontend_v2/
├── index.html
├── styles.css
├── README.md
├── package.json
├── src/
│   ├── app.js
│   ├── config/
│   │   └── defaultData.js
│   ├── services/
│   │   ├── authService.js
│   │   ├── attendanceService.js
│   │   ├── employeeService.js
│   │   ├── leaveService.js
│   │   └── reportService.js
│   ├── state/
│   │   └── store.js
│   ├── utils/
│   │   └── helpers.js
│   └── views/
│       ├── attendanceView.js
│       ├── dashboardView.js
│       ├── employeeView.js
│       ├── layoutView.js
│       ├── leaveView.js
│       └── reportsView.js
└── assets/ (optional for future UI images/icons)
```

## Responsibilities by folder
- `src/config`: default users and seed data
- `src/state`: central application state and localStorage persistence
- `src/services`: business logic for login, attendance, leaves, employees, reports
- `src/views`: rendering logic for pages and UI sections
- `src/app.js`: app bootstrap and page coordination
- `src/utils`: reusable helper functions

## Demo login
- Employee: rahul@company.com / 123456
- Manager: priya@company.com / 123456
- Admin: shiva@company.com / 123456

## Run
Open the folder in VS Code and use Live Server, or simply open `index.html` in a browser.

## Notes
This project is a front-end demo. Authentication is still browser-based and not production-safe, but the codebase is now organized for easier maintenance, testing, and extension.
