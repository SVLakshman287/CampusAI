# CampusAI - Smart Campus Assistant

CampusAI is a student development project for DVR & Dr. HS MIC College of Technology, Kanchikacherla, Andhra Pradesh. It helps students ask campus questions, receive FAQ answers, create support tickets, and track their own requests.

## Problem Statement

Students often need to contact different campus departments for routine questions and request updates. CampusAI gives these questions one simple place to start.

## Solution

The application classifies a question, searches a small FAQ knowledge base, and either returns an answer or creates a ticket for the appropriate department.

## Features

- Department-aware student registration and profile
- Student and admin login
- Demo math CAPTCHA for authentication forms
- FAQ matching and smart escalation
- SQLite ticket creation and status workflow
- Student-owned ticket tracking
- Admin summaries, filters, analytics, and department overview
- Responsive HTML, CSS, and vanilla JavaScript portal

## Student Features

Students can create an account, select a department, log in, ask questions, view answers, create tickets for unanswered questions, and see only their own tickets.

## Admin Features

The admin can log in with the configured demo admin account, view all tickets including older ownerless records, filter the queue, inspect summaries, and update ticket statuses.

## Personalization

A student's selected department is stored during registration and displayed in the profile, welcome area, and department-aware portal. Supported selectable options include Computer Science and Engineering, Electronics and Communication Engineering, Electrical and Electronics Engineering, Mechanical Engineering, Civil Engineering, Information Technology, Artificial Intelligence and Data Science, and Other.

## Authentication and Security

Passwords are stored as PBKDF2-HMAC-SHA256 hashes with random salts. Login sessions use secure random tokens from Python's `secrets` module and are kept in memory for this demo. Student routes check the session role and ticket ownership. Admin status updates require an authenticated admin session.

CampusAI currently implements basic authentication and role-based access suitable for a student hackathon demonstration. Production deployment would require HTTPS, secure session management, stronger account recovery, rate limiting, audit logging, secret management and enterprise-grade CAPTCHA/security controls.

## CAPTCHA

Demo CAPTCHA: A lightweight human-verification challenge is included for demonstration. It is not a replacement for production CAPTCHA services.

## Technology Stack

- Python
- FastAPI
- SQLite
- HTML
- CSS
- JavaScript

## System Architecture

Student
↓
Frontend
↓
FastAPI
↓
AI/NLP classification
↓
Knowledge Base / SQLite
↓
Answer or Ticket
↓
Admin

## Ticket Workflow

Pending
↓
In Progress
↓
Resolved

## Department Personalization

Students select a department during registration. The selected department is saved with the account and displayed dynamically instead of showing one department for every user.

## Installation

From the project root:

1. Activate the virtual environment:
   - Windows PowerShell: `.venv\\Scripts\\Activate.ps1`
2. Start the backend:
   - `uvicorn backend.main:app --reload`
3. In another terminal, start the frontend from the `frontend` directory:
   - `python -m http.server 5500`
4. Open `http://127.0.0.1:5500/`.

The default demo admin username is `admin`. The demo password is configured in backend code with an environment-variable override and is intentionally not displayed in the UI.

## API Endpoints

Public authentication endpoints:

- `GET /captcha`
- `POST /register`
- `POST /login`
- `POST /admin/login`
- `POST /logout`

Authenticated endpoints:

- `GET /me`
- `POST /ask` - student session required
- `GET /tickets` - students receive their own tickets; admins receive all tickets
- `GET /tickets/{ticket_id}` - students can access their own tickets; admins can access all
- `PUT /tickets/{ticket_id}/status` - admin session required

## Database Migration

The application creates a `users` table and adds a nullable `user_id` column to the existing `tickets` table if it is missing. Existing tickets are preserved and remain available to admins.

## Security

The authentication implementation is intentionally small and understandable for a hackathon. It does not claim to be production-grade. No password is returned by an API, and database writes use parameterized SQL.

## Future Scope

- Production authentication and secure persistent sessions
- Real CAPTCHA service
- College ERP integration
- Email and SMS notifications
- Advanced NLP or LLM integration
- Deployment and monitoring
- Audit logs
