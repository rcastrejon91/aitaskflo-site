# AITaskFlo Website

Official website for AITaskFlo — Automation. Intelligence. Scale.

A modern enterprise automation platform website featuring an interactive AI agent demonstration system.

## Features

- **🏠 Homepage**: Modern, responsive design with animated UI elements
- **⚙️ Factory Demo**: Interactive AI agent collaboration system
- **🤖 AI Agents**: Individual bots with unique personalities and capabilities
- **🧠 Memory System**: Persistent conversations across interactions
- **👥 Team Mode**: Multi-agent collaboration and discussion

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3001`

## Demo Features

### Individual AI Agents
- **💌 Email Bot**: Automated email response simulation
- **📋 Task Manager**: Task assignment and tracking
- **📊 Analytics Engine**: Business insights and metrics
- **🔍 Research Bot**: Information gathering and analysis

### Team Collaboration
- Ask questions to the entire AI agent crew
- Watch agents discuss and collaborate in real-time
- Get synthesized insights from multiple AI perspectives

## Architecture

- **Frontend**: Modern HTML5/CSS3/JavaScript with animations
- **Backend**: Express.js with CORS support
- **Memory**: File-based persistence system
- **API**: RESTful endpoints for bot interactions

## Development

The server serves both the static website files and the API endpoints on the same port (3001) for seamless integration.

### API Endpoints
- `POST /run-bot` - Execute individual bot commands
- `POST /team-run` - Run team collaboration mode
- `POST /admin-login` - Admin authentication

## Production Deployment

For production deployment:
1. Set appropriate environment variables
2. Configure reverse proxy (nginx recommended)
3. Set up SSL certificates
4. Configure file permissions for memory directory

## License

© 2025 AITaskFlo. All rights reserved.
