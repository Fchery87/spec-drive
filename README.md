# Spec-Driven Orchestrator v1.1

A specification-first orchestration platform that guides projects from vague ideas to complete, production-grade specifications using AI agents powered by Gemini 2.5 Flash.

## 🚀 Features

### Core Capabilities
- **AI-Powered Orchestration**: Sequential agent execution for systematic spec generation
- **Phase-Based Workflow**: 6 structured phases from Analysis to Handoff
- **Real-time Progress Tracking**: Live orchestration status and artifact generation
- **Cross-Artifact Validation**: Ensures consistency across all generated documents
- **Requirement Traceability**: Links requirements to tasks, APIs, and database schemas

### Technical Stack
- **Frontend**: React + TypeScript + Vite
- **UI Components**: Shadcn-UI with Tailwind CSS
- **Database**: PostgreSQL on Neon with Drizzle ORM
- **Authentication**: Better Auth
- **Validation**: Zod for runtime type safety
- **AI Integration**: Google Gemini 2.5 Flash
- **Package Manager**: pnpm

## 🏗️ Architecture

### Project Phases
1. **ANALYSIS** - Understanding project vision, users, and constraints
2. **STACK_SELECTION** - Choose and approve technology stack
3. **SPEC** - Create detailed requirements, data model, and API specs
4. **DEPENDENCIES** - Define dependencies, security posture, and SBOM
5. **SOLUTIONING** - Break down into tasks and implementation roadmap
6. **DONE** - Generate final handoff documentation

### AI Agents
- **Analyst Agent** - Project vision and user research
- **Architect Agent** - Technology stack and system design
- **PM Agent** - Requirements and specifications
- **DevOps Agent** - Dependencies and deployment strategy
- **Scrum Master Agent** - Task breakdown and planning

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- pnpm
- PostgreSQL database (Neon recommended)
- Google Gemini API key

### Installation

1. **Clone and install dependencies**:
```bash
cd spec-drive-orchestrator
pnpm install
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Set up database**:
```bash
pnpm db:generate
pnpm db:migrate
```

4. **Start development server**:
```bash
pnpm dev
```

### Environment Configuration

```env
# Database
DATABASE_URL="your-neon-database-url"

# Better Auth
BETTER_AUTH_SECRET="your-auth-secret"
BETTER_AUTH_URL="http://localhost:3000"

# Gemini AI
GEMINI_API_KEY="your-gemini-api-key"

# Optional GitHub Integration
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

## 📖 Usage

### Creating a New Project

1. **Navigate to Dashboard**: View all existing projects
2. **Start New Project**: Click "New Project" button
3. **Wizard Steps**:
   - Step 1: Basic project information
   - Step 2: Detailed project vision and idea
   - Step 3: Review and create

### Orchestration Process

1. **Monitor Progress**: Real-time tracking of AI agent execution
2. **Review Artifacts**: Generated documents and specifications
3. **Approval Gates**: Stack and dependency approval required
4. **Phase Advancement**: Automatic validation before moving forward

### Generated Artifacts

- **constitution.md** - Project principles and constraints
- **project-brief.md** - Vision, goals, and market analysis
- **personas.md** - Detailed user personas (3-5 personas)
- **stack-proposal.md** - Technology recommendations
- **PRD.md** - Product Requirements Document
- **data-model.md** - Database schema and models
- **api-spec.json** - OpenAPI specification
- **DEPENDENCIES.md** - Dependencies with rationale
- **tasks.md** - Implementation tasks
- **architecture.md** - System architecture
- **HANDOFF.md** - Final handoff documentation

## 🏢 Canonical Technology Stack

By default, the orchestrator biases toward this modern stack:

- **Frontend**: Next.js + React + TypeScript
- **Database**: PostgreSQL on Neon (managed)
- **ORM**: Drizzle ORM
- **Authentication**: Better Auth
- **Styling**: Tailwind CSS + Shadcn-UI
- **Validation**: Zod
- **Package Manager**: pnpm
- **Monorepo**: TurboRepo

## 🧪 Development

### Project Structure

```
src/
├── components/
│   ├── ui/              # Shadcn-UI components
│   ├── layout/          # Layout components
│   └── pages/           # Page components
├── lib/
│   ├── orchestrator.ts  # Core orchestration logic
│   ├── ai-agents.ts     # AI agent implementations
│   ├── api.ts          # API client and types
│   └── utils.ts        # Utility functions
├── db/
│   ├── schema.ts       # Database schema
│   └── index.ts        # Database connection
└── types/              # TypeScript type definitions
```

### Available Scripts

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm preview          # Preview production build

# Database
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run database migrations
pnpm db:studio        # Open Drizzle Studio

# Code Quality
pnpm lint             # Run ESLint
pnpm typecheck        # Run TypeScript checks
```

## 🔒 Security & Validation

- **Cross-artifact validation** ensures consistency
- **Requirement traceability matrix** tracks coverage
- **Token economy** controls LLM costs
- **Quality scoring** monitors output quality
- **Security baselines** for all generated projects

## 📚 API Reference

### Core Endpoints

- `POST /api/projects` - Create new project
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects/:id/orchestration/start` - Start orchestration
- `GET /api/projects/:id/orchestration/progress` - Get progress
- `POST /api/projects/:id/phases/advance` - Advance to next phase
- `GET /api/projects/:id/artifacts` - Get project artifacts

## 🤝 Contributing

This project follows the specification defined in `spec-driven-orchestrator-v1.1.md`. Please refer to the specification document for detailed requirements and architectural decisions.

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ using modern web technologies and AI orchestration**