# AdaptX — AI Development Instructions

## Project

AdaptX is an educational accessibility application.

Teachers upload educational documents and receive AI-powered
accessible educational transformations.

## Repository

/frontend
- React frontend
- Owned primarily by frontend developer

/backend
- Node/Express backend
- Owned primarily by backend developer

/docs
- Shared project documentation

## Critical API Rule

The API contract is defined in:

docs/API.md

The API contract must NOT be changed casually.

Before modifying an API endpoint, request field, response field,
or response structure, read docs/API.md.

If a change to the contract is genuinely necessary,
document the change and inform the other developer.

## AI Development Rules

Before changing code:

1. Inspect the existing code.
2. Understand the current architecture.
3. Make the smallest change required.
4. Do not rewrite unrelated files.
5. Do not introduce unnecessary dependencies.
6. Do not invent APIs.
7. Do not expose secrets.

## Frontend

Frontend must communicate with backend according to docs/API.md.

Backend API keys must never appear in frontend code.

## Backend

Backend is responsible for:
- file validation
- text extraction
- AI API calls
- AI prompts
- AI response validation
- API responses

## Git

This repository already has Git configured.

NEVER run:

git init

Do not create nested Git repositories.

Do not commit node_modules.

Do not commit .env files.

## Current MVP Principle

Build one working vertical feature at a time.

Prefer:

working → tested → committed

over:

large → complicated → untested