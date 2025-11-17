# API Documentation

Complete API reference for the Spec-Drive Orchestrator backend.

## Overview

The Spec-Drive API is a RESTful service built with Express.js that manages project orchestration, AI agent execution, and artifact generation.

**Base URL:** `http://localhost:3001` (development) or `https://api.yourdomain.com` (production)

**Authentication:** JWT Bearer tokens in Authorization header
```
Authorization: Bearer <token>
```

## Table of Contents

1. [Authentication](#authentication)
2. [Projects](#projects)
3. [Orchestration](#orchestration)
4. [Artifacts](#artifacts)
5. [Validation](#validation)
6. [Error Handling](#error-handling)

---

## Authentication

### POST /auth/signup

Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "User Name"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "User Name"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### POST /auth/login

Authenticate user and obtain JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### GET /auth/me

Get current authenticated user.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

---

## Projects

### POST /api/projects

Create a new project.

**Request:**
```json
{
  "name": "E-Commerce Platform",
  "description": "Full-stack e-commerce solution",
  "scope": "MVP with basic features"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "proj-abc123",
    "name": "E-Commerce Platform",
    "description": "Full-stack e-commerce solution",
    "status": "ANALYSIS",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing or invalid fields
- `401 Unauthorized` - User not authenticated
- `409 Conflict` - Project name already exists

### GET /api/projects

List all projects for current user.

**Query Parameters:**
- `skip` (number) - Pagination offset, default: 0
- `limit` (number) - Pagination limit, default: 20
- `status` (string) - Filter by status (ANALYSIS, STACK_SELECTION, SPEC, etc.)
- `search` (string) - Search in project name/description

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "proj-1",
      "name": "Project 1",
      "status": "ANALYSIS",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "skip": 0,
    "limit": 20
  }
}
```

### GET /api/projects/:id

Get project details.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "proj-abc123",
    "name": "E-Commerce Platform",
    "description": "Full-stack e-commerce solution",
    "status": "SPEC",
    "phase": "SPEC",
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T15:45:00Z"
  }
}
```

**Error Responses:**
- `404 Not Found` - Project doesn't exist
- `403 Forbidden` - User doesn't have access

### PATCH /api/projects/:id

Update project details.

**Request:**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "proj-abc123",
    "name": "Updated Name",
    "updatedAt": "2025-01-15T16:00:00Z"
  }
}
```

### DELETE /api/projects/:id

Delete a project.

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

---

## Orchestration

### POST /api/projects/:id/orchestration/start

Start project orchestration process.

**Request:**
```json
{
  "phase": "ANALYSIS",
  "parallelAgents": true,
  "options": {
    "useGemini": true,
    "maxTokens": 8000
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "projectId": "proj-abc123",
    "orchestrationId": "orch-123",
    "phase": "ANALYSIS",
    "status": "in_progress",
    "progress": 0,
    "startedAt": "2025-01-15T16:00:00Z"
  }
}
```

### GET /api/projects/:id/orchestration/progress

Get orchestration progress.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "projectId": "proj-abc123",
    "orchestrationId": "orch-123",
    "phase": "ANALYSIS",
    "status": "in_progress",
    "progress": 45,
    "completedAgents": [
      {
        "name": "analyst",
        "status": "completed",
        "progress": 100,
        "artifacts": ["constitution.md", "personas.json"]
      }
    ],
    "currentAgent": {
      "name": "architect",
      "status": "in_progress",
      "progress": 60
    },
    "estimatedTimeRemaining": "2m 30s",
    "lastUpdate": "2025-01-15T16:05:00Z"
  }
}
```

### POST /api/projects/:id/orchestration/pause

Pause ongoing orchestration.

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Orchestration paused",
  "data": {
    "orchestrationId": "orch-123",
    "status": "paused",
    "progress": 45
  }
}
```

### POST /api/projects/:id/orchestration/resume

Resume paused orchestration.

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Orchestration resumed",
  "data": {
    "orchestrationId": "orch-123",
    "status": "in_progress",
    "progress": 45
  }
}
```

---

## Artifacts

### GET /api/projects/:id/artifacts

Get all artifacts for a project.

**Query Parameters:**
- `phase` (string) - Filter by phase
- `type` (string) - Filter by artifact type

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "artifact-1",
      "name": "PRD.md",
      "type": "prd",
      "phase": "SPEC",
      "content": "# Product Requirements Document\n...",
      "metadata": {
        "agentId": "pm-agent",
        "timestamp": "2025-01-15T16:00:00Z"
      }
    }
  ]
}
```

### GET /api/projects/:id/artifacts/:artifactId

Get specific artifact content.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "artifact-1",
    "name": "PRD.md",
    "content": "# Product Requirements Document\n...",
    "createdAt": "2025-01-15T16:00:00Z"
  }
}
```

### POST /api/projects/:id/artifacts

Upload or create new artifact.

**Request:**
```json
{
  "name": "custom-artifact.md",
  "type": "custom",
  "content": "Custom content here",
  "phase": "SPEC"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "artifact-new",
    "name": "custom-artifact.md",
    "createdAt": "2025-01-15T16:30:00Z"
  }
}
```

### GET /api/projects/:id/download

Download all artifacts as ZIP file.

**Response:** `200 OK` (Binary data)
- Content-Type: `application/zip`
- Content-Disposition: `attachment; filename="project-artifacts.zip"`

---

## Validation

### POST /api/validation/run

Run validation on project artifacts.

**Request:**
```json
{
  "projectId": "proj-abc123",
  "phase": "SPEC",
  "rules": ["REQ-API-001", "STACK-DEP-001"]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "reportId": "val-report-1",
    "projectId": "proj-abc123",
    "phase": "SPEC",
    "overallStatus": "warning",
    "totalRules": 5,
    "passedRules": 4,
    "failedRules": 0,
    "warningRules": 1,
    "validationResults": [
      {
        "ruleId": "REQ-API-001",
        "ruleName": "API endpoints match requirements",
        "passed": true,
        "severity": "error",
        "details": {
          "coverage": 95
        }
      }
    ]
  }
}
```

### GET /api/validation/reports/:projectId

Get validation reports for project.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "val-report-1",
      "phase": "SPEC",
      "overallStatus": "pass",
      "createdAt": "2025-01-15T16:00:00Z"
    }
  ]
}
```

### GET /api/validation/dashboard/:projectId

Get validation dashboard metrics.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "metrics": {
      "totalValidations": 10,
      "passedValidations": 8,
      "failedValidations": 1,
      "warningValidations": 1,
      "trend": "improving"
    },
    "ruleStats": {
      "total": 5,
      "enabled": 5,
      "byType": {
        "requirement_api": 1,
        "requirement_data": 1,
        "requirement_task": 1,
        "stack_dependency": 1
      }
    }
  }
}
```

---

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `AUTH_REQUIRED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `CONFLICT` | 409 | Resource already exists |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Example Error Response

```json
{
  "success": false,
  "error": "Project not found",
  "code": "NOT_FOUND",
  "statusCode": 404
}
```

---

## Rate Limiting

Rate limits are applied to prevent abuse:

- **Default:** 100 requests per minute per user
- **Authentication:** 5 attempts per minute per IP
- **File Upload:** 10 MB per request

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705334400
```

---

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `skip` (number) - Offset for pagination
- `limit` (number) - Maximum items per page (max 100)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 250,
    "skip": 0,
    "limit": 20,
    "hasMore": true
  }
}
```

---

## Webhooks (Future)

Webhooks will be supported for:
- Orchestration completion
- Validation failures
- Artifact generation

---

## SDK Examples

### cURL

```bash
# Create project
curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Project",
    "description": "Project description"
  }'
```

### JavaScript/TypeScript

```typescript
const api = {
  async createProject(data) {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    })
    return response.json()
  }
}
```

### Python

```python
import requests

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

response = requests.post(
    'http://localhost:3001/api/projects',
    json={'name': 'My Project'},
    headers=headers
)
```

---

## Changelog

### v1.0.0 (Current)
- Initial release
- Basic CRUD for projects
- Orchestration workflows
- Validation engine
- Artifact management

---

For more information, see [TECHNICAL_STACK.md](TECHNICAL_STACK.md) and [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).
