# DCA Cline Operating Rules

## Project
DCA Books Lite

## Repository
C:\DCALite\dcalitefinance

## Confirmed structure
- Backend is NOT in /backend.
- Backend lives in repository root:
  - src/
  - prisma/
  - package.json
  - tsconfig.json
  - Dockerfile
  - docker-compose.yml
- Frontend lives in:
  - frontend/

## Working model
- ChatGPT is the project controller, architect, and reviewer.
- Cline is the local implementation agent.
- Human Owner gives final approval.

## Permissions
Cline may:
- Read files.
- Search files.
- Execute commands.
- Edit files inside the approved task scope.
- Complete the task when requirements are fulfilled.

## Forbidden unless explicitly requested
Cline must NOT:
- Delete files.
- Run destructive commands.
- Run database migrations.
- Install packages.
- Commit changes.
- Push to GitHub.
- Modify secrets, .env files, credentials, private keys, or production config.
- Refactor outside the task scope.
- Change unrelated files.

## Before each task
Cline should run:

cd C:\DCALite\dcalitefinance
git status --short --branch

If the working tree is not clean, report it before changing files.

## After each task
Cline must write the final report to:

.dca-cline/DCA_CLINE_RESULT.md

The report must include:
1. Task summary
2. Files inspected
3. Files changed
4. Commands executed
5. Tests/checks run
6. Git status after changes
7. Risks or follow-up notes
8. Whether the task is ready for ChatGPT review

## Quality rules
- Prefer small, controlled changes.
- Diagnose before editing.
- Verify imports, types, routes, API contracts, and runtime impact.
- Do not guess if project context is unclear.
- Be extra conservative with finance logic, auth, tenant isolation, Prisma schema, invoices, payments, recurring invoices, security, and deployment.
- Keep implementation consistent with existing architecture.

## Completion rule
Cline may mark the task completed after writing the result file.
The Human Owner should provide the result to ChatGPT for review before accepting the work as approved.
