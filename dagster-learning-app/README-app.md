# Dagster Learning App

An interactive learning platform for mastering Dagster, the cloud-native data orchestration platform.

## Overview

This is Phase 1 of a comprehensive learning application designed to teach Dagster concepts through:
- Structured curriculum with beginner to advanced tracks
- Interactive code examples with syntax highlighting
- Progress tracking and module navigation
- Responsive design for all devices

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Modern web browser

### Installation

1. Clone the repository
```bash
git clone <repo-url>
cd dagster-learning-app
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

4. Open http://localhost:5173 in your browser

## Project Structure

```
dagster-learning-app/
├── public/
│   └── content/          # Learning content (JSON + Markdown)
│       ├── curriculum.json
│       └── modules/
├── src/
│   ├── components/       # React components
│   │   ├── common/      # Shared components
│   │   ├── content/     # Content display components
│   │   └── layout/      # Layout components
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Page components
│   ├── router/          # Routing configuration
│   ├── types/           # TypeScript definitions
│   └── utils/           # Utility functions
└── README.md
```

## Features Implemented (Phase 1)

- ✅ Content loading system from JSON/Markdown files
- ✅ Module and section navigation
- ✅ Markdown rendering with syntax highlighting
- ✅ Responsive design with TailwindCSS
- ✅ Progress indicators (UI only, not persistent)
- ✅ Loading states and error handling
- ✅ TypeScript for type safety

## Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Styling**: TailwindCSS + Typography plugin
- **Markdown**: remark + remark-html
- **Syntax Highlighting**: Prism.js
- **Icons**: Lucide React

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Adding Content

1. Create a new module directory in `public/content/modules/[level]/[module-id]/`
2. Add `module.json` with module metadata
3. Create markdown files in `sections/` subdirectory
4. Update `curriculum.json` to include the new module

### Content Structure

#### Module JSON Format
```json
{
  "id": "module-id",
  "title": "Module Title",
  "description": "Module description",
  "estimatedHours": 4,
  "prerequisites": [],
  "learningObjectives": ["Objective 1", "Objective 2"],
  "sections": [
    {
      "id": "section-id",
      "title": "Section Title",
      "type": "theory|hands-on|lab",
      "estimatedMinutes": 30,
      "file": "sections/01-section.md"
    }
  ]
}
```

#### Section Markdown Format
```markdown
---
title: Section Title
type: theory
estimatedMinutes: 30
---

# Section Content

Your markdown content here...
```

## Future Phases

This is Phase 1 of 5. Future phases will include:
- Phase 2: Interactive features (progress persistence, quizzes)
- Phase 3: Code execution environment
- Phase 4: Advanced features (AI assistance, collaboration)
- Phase 5: Production deployment and optimization

## Contributing

Please follow these guidelines:
1. Maintain TypeScript type safety
2. Follow the established component patterns
3. Test on multiple screen sizes
4. Ensure proper error handling

## License

[License information here]