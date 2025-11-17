# User Guide - Spec-Drive Orchestrator

Complete guide for using the Spec-Drive Orchestrator platform.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating a Project](#creating-a-project)
3. [Project Phases](#project-phases)
4. [Understanding Artifacts](#understanding-artifacts)
5. [Validation & Quality](#validation--quality)
6. [Common Tasks](#common-tasks)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

---

## Getting Started

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- Email address for account registration

### First Time Setup

1. **Sign Up**
   - Visit the application homepage
   - Click "Sign Up"
   - Enter email and password
   - Check your email for confirmation

2. **Log In**
   - Use your registered email and password
   - You'll be redirected to your dashboard

3. **Explore Dashboard**
   - View your projects
   - Check recent activity
   - Access project templates (if available)

---

## Creating a Project

### Step 1: Start New Project

1. Click the **"New Project"** button
2. Enter project details:
   - **Project Name:** Descriptive name for your project
   - **Description:** Brief overview (optional)
   - **Scope:** MVP scope or detailed requirements

### Step 2: Choose Scope

Select your project type:
- **MVP (Minimum Viable Product)** - Focus on core features
- **Full Application** - Comprehensive feature set
- **Custom Scope** - Define your own scope

### Step 3: Review & Create

- Review entered information
- Click **"Create Project"**
- You'll be taken to the project dashboard

### Project Settings

After creation, you can:
- Edit project name and description
- Update scope
- Archive or delete the project
- Invite team members (future feature)

---

## Project Phases

Your project moves through these phases:

### Phase 1: ANALYSIS ✓
**Goal:** Understand project requirements and vision

**Generated Artifacts:**
- Constitution Document
- Project Brief
- User Personas

**What Happens:**
- AI Analyst creates project vision
- Identifies key stakeholders
- Defines project scope

**How to Proceed:**
1. Review generated artifacts
2. Provide feedback if needed
3. Click "Advance Phase" when ready

### Phase 2: STACK SELECTION 🔧
**Goal:** Choose appropriate technology stack

**Generated Artifacts:**
- Stack Proposal
- Architecture Diagram
- Technology Rationale

**What Happens:**
- AI Architect recommends technology stack
- Provides pros/cons analysis
- Considers scalability and team expertise

**How to Proceed:**
1. Review stack recommendations
2. Approve or request changes
3. Click "Approve Stack"

### Phase 3: SPECIFICATION 📋
**Goal:** Define detailed requirements and APIs

**Generated Artifacts:**
- Product Requirements Document (PRD)
- API Specification
- Data Model
- Technical Requirements

**What Happens:**
- PM Agent generates comprehensive PRD
- DevOps defines infrastructure needs
- API specifications created

**How to Proceed:**
1. Review specifications
2. Validate against project goals
3. Click "Advance Phase"

### Phase 4: DEPENDENCIES 📦
**Goal:** Identify and approve project dependencies

**Generated Artifacts:**
- Dependencies List
- SBOM (Software Bill of Materials)
- Security Vulnerability Report

**What Happens:**
- DevOps Agent analyzes dependencies
- Security checks performed
- Alternatives suggested

**How to Proceed:**
1. Review dependencies
2. Approve or request changes
3. Click "Approve Dependencies"

### Phase 5: SOLUTIONING 🛠️
**Goal:** Break down requirements into tasks

**Generated Artifacts:**
- Task Breakdown
- User Stories
- Epic Definitions
- Implementation Roadmap

**What Happens:**
- Scrum Master creates task breakdown
- Estimates effort and complexity
- Creates implementation roadmap

**How to Proceed:**
1. Review tasks and estimates
2. Adjust if needed
3. Click "Start Implementation"

### Phase 6: DONE ✨
**Goal:** Prepare for handoff

**Generated Artifacts:**
- HANDOFF.md Documentation
- Complete artifacts package
- Setup instructions
- Deployment guide

**What Happens:**
- All artifacts compiled
- Documentation finalized
- Ready for development team

**How to Proceed:**
1. Download complete package
2. Share with development team
3. Begin implementation

---

## Understanding Artifacts

### What are Artifacts?

Artifacts are generated documents that define your project:

| Artifact | Purpose | Created By |
|----------|---------|------------|
| Constitution | Project vision and values | Analyst |
| Project Brief | High-level overview | Analyst |
| Personas | User types and behaviors | Analyst |
| Stack Proposal | Technology recommendations | Architect |
| PRD | Detailed requirements | PM Agent |
| API Spec | API endpoint definitions | Architect |
| Data Model | Database schema | DevOps |
| Tasks | Implementation breakdown | Scrum Master |
| SBOM | Dependency inventory | DevOps |

### Viewing Artifacts

1. Go to project dashboard
2. Click **"View Artifacts"**
3. Select artifact from list
4. Read or download content

### Editing Artifacts

Some artifacts can be edited:

1. Click the artifact
2. Click **"Edit"** button
3. Make changes
4. Click **"Save"**

### Downloading Artifacts

**Single Artifact:**
1. Click artifact
2. Click **"Download"** button
3. File saves to your computer

**All Artifacts:**
1. Click **"Download All"** on project page
2. ZIP file downloads with all artifacts

---

## Validation & Quality

### Validation Process

The system automatically validates:
- **Requirements Coverage** - APIs match requirements
- **Data Alignment** - Database covers data needs
- **Task Completeness** - Tasks cover requirements
- **Consistency** - Terminology consistent across documents

### Viewing Validation Results

1. Go to project dashboard
2. Click **"Validation Results"**
3. See pass/fail status for each rule
4. Review detailed feedback

### Types of Validation Issues

**Errors (Red):**
- Critical issues blocking progress
- Must be resolved before advancement

**Warnings (Yellow):**
- Non-critical issues
- Should be addressed
- Won't block advancement

**Info (Blue):**
- Informational messages
- Suggestions for improvement

### Fixing Validation Issues

1. **Read the Error Message** - Understand what needs fixing
2. **Identify the Problem** - Which artifact needs changes
3. **Make Changes** - Edit relevant artifact
4. **Re-validate** - Run validation again
5. **Verify Pass** - Ensure all checks pass

---

## Common Tasks

### Uploading Custom Content

1. In project dashboard, click **"Upload Artifact"**
2. Select file from computer
3. Enter artifact name
4. Choose artifact type
5. Click **"Upload"**

### Inviting Team Members

1. Go to project settings
2. Click **"Team Members"**
3. Enter email addresses
4. Set permissions (Viewer, Editor, Admin)
5. Click **"Invite"**

### Generating Reports

1. Click **"Reports"** on project page
2. Select report type:
   - Coverage Report
   - Validation Report
   - Timeline Report
3. Click **"Generate"**
4. Download or view online

### Exporting Project

1. Go to project dashboard
2. Click **"Export Project"**
3. Choose format (ZIP, PDF, JSON)
4. Click **"Export"**
5. Download file

### Sharing with Stakeholders

1. Click **"Share Project"**
2. Choose sharing option:
   - Email link
   - Public link
   - Restricted access
3. Select what to share:
   - All artifacts
   - Selected artifacts
   - Read-only access
4. Click **"Generate Link"**
5. Share the link

---

## Troubleshooting

### General Issues

#### "Cannot login"
- Verify email address is correct
- Check if account is activated
- Reset password if forgotten
- Try different browser
- Clear browser cache

**Solution:**
1. Click "Forgot Password"
2. Enter email address
3. Follow reset instructions
4. Create new password

#### "Page not loading"
- Check internet connection
- Refresh the page
- Clear browser cache
- Try different browser
- Restart browser

#### "Slow performance"
- Close other browser tabs
- Clear browser cache
- Try at different time
- Check internet connection
- Contact support

### Project Issues

#### "Cannot create project"
- Ensure project name is unique
- Check for special characters
- Verify account is active
- Try shorter project name

#### "Artifacts not generating"
- Wait for processing to complete
- Check internet connection
- Refresh the page
- Try generating again
- Check validation errors

#### "Validation keeps failing"
- Read error messages carefully
- Review artifact content
- Fix consistency issues
- Regenerate artifacts if needed
- Contact support if persists

### Export/Download Issues

#### "Download button not working"
- Check internet connection
- Try different browser
- Clear browser cache
- Check disk space
- Disable browser extensions

#### "ZIP file corrupted"
- Try downloading again
- Use different browser
- Clear cache and try again
- Contact support

### Performance Issues

#### "Slow artifact generation"
- This is normal for large projects
- Initial generation may take 2-5 minutes
- Check progress in real-time
- Don't close browser window
- Network connection affects speed

#### "Timeouts during long operations"
- Network connection may be unstable
- Try operation again
- Reduce project scope if possible
- Contact support for large projects

---

## FAQ

### General Questions

**Q: What is Spec-Drive Orchestrator?**
A: An AI-powered tool that generates comprehensive project specifications and documentation automatically.

**Q: Who should use this tool?**
A: Product managers, architects, developers, and project leads who need to generate project specifications quickly.

**Q: How long does specification generation take?**
A: Typically 3-10 minutes depending on project complexity. Initial setup may take longer.

**Q: Can I edit generated artifacts?**
A: Yes, you can edit most artifacts. Changes are saved and can affect validation results.

**Q: Can I invite team members?**
A: This feature is coming soon. Currently, projects are personal.

### Project Management

**Q: Can I delete a project?**
A: Yes. Go to project settings and click "Delete Project". This action is permanent.

**Q: Can I duplicate a project?**
A: Go to project dashboard, click "..." menu, select "Duplicate". New project is created with copied artifacts.

**Q: How many projects can I create?**
A: Unlimited projects. Storage limits may apply based on account type.

**Q: Can I export my project?**
A: Yes. Click "Export" in project dashboard. Choose format (ZIP, PDF, or JSON).

### Artifacts & Documentation

**Q: What's included in the HANDOFF.md?**
A: Complete project documentation including setup instructions, deployment guide, and API reference.

**Q: Can I customize artifact templates?**
A: This feature is coming soon. Currently, templates are generated based on project details.

**Q: How are artifacts versioned?**
A: Each regeneration creates a new version. Previous versions are saved in history.

**Q: Can I compare artifact versions?**
A: This feature is planned for future release.

### Validation

**Q: What does "Validation Failed" mean?**
A: One or more checks found inconsistencies between artifacts. Review the details to fix.

**Q: Can I ignore validation errors?**
A: You can proceed despite warnings, but errors should be fixed for best results.

**Q: What's checked in validation?**
A: Requirements coverage in APIs, data models, tasks, and terminology consistency.

**Q: How often should I validate?**
A: Validate after each artifact update or phase change.

### Account & Security

**Q: Is my data secure?**
A: Yes. We use encryption and secure authentication. See our security documentation.

**Q: Can I change my password?**
A: Yes. Go to account settings, select "Change Password".

**Q: How do I delete my account?**
A: Go to account settings, scroll to bottom, click "Delete Account". This is permanent.

**Q: Can I export my data?**
A: Yes. Go to settings and click "Download My Data" to get all your projects.

### Technical Questions

**Q: What browsers are supported?**
A: Chrome, Firefox, Safari, and Edge (latest 2 versions).

**Q: Do you support offline mode?**
A: Not currently. Internet connection required.

**Q: What's the file size limit for uploads?**
A: Maximum 10 MB per file. Contact support for larger files.

**Q: Can I use this with my own backend?**
A: The orchestrator is a full service. Self-hosted options coming soon.

### Billing & Pricing

**Q: What's the cost?**
A: Check the pricing page. Free tier available for basic projects.

**Q: Can I upgrade/downgrade?**
A: Yes. Changes take effect at next billing cycle.

**Q: Do you offer discounts for teams?**
A: Yes. Contact sales for team/enterprise pricing.

---

## Getting Help

### Support Channels

- **Email:** support@specdrive.io
- **Chat:** In-app chat support (coming soon)
- **Documentation:** See our docs at docs.specdrive.io
- **GitHub Issues:** Report bugs at github.com/specdrive/issues

### Before Contacting Support

1. Check this user guide
2. Review the FAQ
3. Search the documentation
4. Try the troubleshooting section

### Providing Feedback

We'd love to hear your feedback!

1. Click the feedback icon (?) in the app
2. Share your thoughts
3. Describe your experience
4. Include your email if you want us to follow up

---

## Best Practices

### Project Organization

- Use descriptive project names
- Add detailed descriptions
- Organize by type or team
- Archive completed projects
- Regular review of old projects

### Artifact Management

- Review generated artifacts carefully
- Edit for accuracy and completeness
- Keep artifacts up-to-date
- Version important artifacts
- Share regularly with stakeholders

### Validation

- Validate after each change
- Fix errors before proceeding
- Address warnings if possible
- Track validation improvements
- Use validation trends to improve

### Collaboration

- Share projects with team members
- Communicate changes
- Review feedback
- Update documentation
- Keep everyone informed

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save current artifact |
| `Ctrl+D` | Download artifact |
| `Ctrl+P` | Print artifact |
| `Ctrl+F` | Find in artifact |
| `Esc` | Close dialog |
| `?` | Show help |

---

## Accessibility

This application is designed to be accessible:
- Keyboard navigation supported
- Screen reader compatible
- High contrast mode available
- Text sizing adjustable

For accessibility issues, contact support@specdrive.io

---

For technical documentation, see [TECHNICAL_STACK.md](TECHNICAL_STACK.md) and [API_DOCUMENTATION.md](API_DOCUMENTATION.md).
