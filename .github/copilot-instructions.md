# AITaskFlo Website
AITaskFlo is a Node.js web application that serves static HTML pages alongside a comprehensive API server featuring AI bots, security monitoring, and multiple integrations. The application consists of static website files and a sophisticated Express.js server with WebSocket support.

**ALWAYS reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Working Effectively

### Bootstrap and Setup
- **Node.js requirement**: Node.js v20+ and npm v10+ are required (Node.js is pre-installed)
- **Install dependencies**: `npm install` -- takes ~11 seconds. NEVER CANCEL. Installs 185+ packages including Express, security middleware, and API integrations.
- **Start server**: `npm start` or `node server.js` -- starts immediately (under 3 seconds)
- **Default port**: Application runs on `http://localhost:3001`
- **CRITICAL**: NO BUILD PROCESS EXISTS - This is a pure Node.js application with static HTML files

### Dependencies (Auto-installed via package.json)
The application requires 14 core npm packages:
- express, cors, helmet, express-rate-limit, compression, morgan (web server & security)
- bcrypt, jsonwebtoken, express-validator (authentication & validation)  
- multer, nodemailer, node-cron, ws, axios, form-data (features & integrations)

### Server Startup and Validation
- **Start server**: `node server.js`
- **Startup time**: ~2-3 seconds maximum
- **Success indicators**: Look for these console messages:
  ```
  🛡️ Security Guardian Bot activated and monitoring...
  ⚠️ Created default admins.json with hashed password  
  🚀 COMPLETE AITaskFlo server with Security Guardian running on http://localhost:3001
  ```
- **Health check**: `curl http://localhost:3001/health` should return JSON with status "healthy"

## Validation Requirements

### ALWAYS Test Complete User Scenarios After Changes
**CRITICAL**: Simply starting/stopping the application is NOT sufficient validation. Always test actual functionality:

1. **Website Navigation**:
   - Visit `http://localhost:3001` - should load AITaskFlo homepage
   - Navigate to `http://localhost:3001/pricing.html` - should load pricing page
   - Navigate to `http://localhost:3001/waitlist.html` - should load waitlist form

2. **API Functionality** (all should return success JSON):
   ```bash
   curl http://localhost:3001/health
   curl http://localhost:3001/api/password/12
   curl -X POST http://localhost:3001/api/qr-code -H "Content-Type: application/json" -d '{"text": "test"}'
   curl -X POST http://localhost:3001/run-bot -H "Content-Type: application/json" -d '{"botName": "taskBot", "input": "test task"}'
   ```

3. **Security Features**:
   - Server automatically creates security logs, admin accounts, and database files
   - Security Guardian Bot monitors all requests and blocks threats
   - Rate limiting is active (100 requests per 15 minutes per IP)

### Manual Testing Checklist
- [ ] Homepage loads with "Enterprise Automation" title
- [ ] Pricing page shows 3 pricing tiers (Starter $29, Growth $79, Professional $199)
- [ ] Bot API accepts POST requests and returns logs
- [ ] Health endpoint returns server status and security info
- [ ] Password generator API works with length parameter
- [ ] QR code generation API returns URLs for QR images

## Known Issues and Workarounds

### Working Features
- ✅ **Website serving**: All HTML pages load correctly
- ✅ **Bot functionality**: POST `/run-bot` with botName and input works
- ✅ **Security system**: Guardian bot active, rate limiting functional
- ✅ **Password generation**: GET `/api/password/{length}` works
- ✅ **QR code generation**: POST `/api/qr-code` with text works
- ✅ **Health monitoring**: GET `/health` returns comprehensive status

### Partially Working Features  
- ⚠️ **External API endpoints**: Some APIs like UUID, jokes, weather depend on external services and API keys
- ⚠️ **Email functionality**: Requires EMAIL_USER and EMAIL_PASS environment variables
- ⚠️ **Content Security Policy**: Console shows CSP warnings for external fonts/scripts (cosmetic only)

### Known Fixes Applied
- Fixed `nodemailer.createTransporter` → `nodemailer.createTransport` in server.js (lines 292, 547)

## File Structure and Key Locations

### Static Website Files
- `index.html` - Main homepage with enterprise automation content
- `pricing.html` - Pricing plans ($29 Starter to $199 Professional)
- `factory.html` - Automation factory interface (84KB, complex UI)
- `waitlist.html` - Demo request and waitlist signup
- `careers.html` - Careers and job listings
- `docs/` - Documentation pages (roadmap, terms)
- `assets/` - Images and static assets

### Server and API Files
- `server.js` - Main application server (1,485 lines, comprehensive API)
- `package.json` - Dependencies and npm scripts
- `admins.json` - Auto-created admin accounts with bcrypt hashed passwords
- `database.json` - Auto-created SQLite-like JSON database
- `security-logs.json` - Security Guardian Bot activity logs
- `memory/` - AI bot memory storage (auto-created)

### Configuration
- **No build configuration needed** - Pure Node.js application
- **No linting configuration found** - No ESLint, Prettier, or similar tools detected
- **No testing framework** - package.json has placeholder test script
- **Environment variables**: Optional for email (EMAIL_USER, EMAIL_PASS) and API keys

## Common Development Tasks

### Making Code Changes
- **Always restart server after code changes**: Stop with Ctrl+C, restart with `node server.js`
- **No hot reloading** - Manual server restart required for all changes
- **Validate immediately**: Run health check and test affected endpoints after restart
- **Check security logs**: Application logs security events to `security-logs.json`

### Adding New Features
- **API endpoints**: Add routes in server.js following existing patterns
- **Static pages**: Add HTML files to root directory, server will serve automatically  
- **Bot functionality**: Add new bots to the `bots` object in server.js
- **Security**: All requests go through Security Guardian Bot middleware first

### Debugging Common Issues
- **Port conflicts**: Default port 3001, change PORT environment variable if needed
- **Database issues**: Delete `database.json` to reset, server recreates automatically
- **Security lockouts**: Check `security-logs.json` for blocked IPs or threats
- **Memory issues**: Bot memories stored in `memory/{botName}.json` files

## Timing Expectations

### Build and Setup Operations
- **NEVER CANCEL** any installation or startup operations
- `npm install`: ~11 seconds (185 packages) - Set timeout to 60+ seconds minimum
- `node server.js`: ~2-3 seconds to start - Set timeout to 30+ seconds minimum
- **No compilation needed** - Application starts immediately after dependency installation

### API Response Times  
- Health checks: Under 100ms
- Bot interactions: 100-500ms depending on external API calls
- Static file serving: Under 50ms
- Security checks: Add 10-20ms overhead per request

### Common Command Timings
```bash
npm install        # ~11s - NEVER CANCEL, timeout: 60s+
node server.js     # ~3s  - NEVER CANCEL, timeout: 30s+
curl /health       # ~50ms - instant response  
curl /api/*        # 100ms-2s depending on external APIs
```

## Architecture Notes

### Security Architecture
- **Security Guardian Bot**: Active monitoring class that analyzes all requests
- **Threat detection**: SQL injection, XSS, bot detection, rate limiting
- **Auto-blocking**: High-risk IPs blocked automatically  
- **JWT Authentication**: Required for admin endpoints
- **Helmet.js**: Security headers for all responses

### API Architecture
- **REST API**: Standard HTTP methods with JSON responses
- **Rate limiting**: 100 requests/15min general, 20 requests/min for API endpoints
- **WebSocket support**: Real-time features on same port as HTTP server
- **Free APIs**: Weather, news, QR codes, password generation, etc.
- **Bot system**: AI agents with memory, learning, and multi-step workflows

### Data Storage
- **JSON files**: No traditional database, uses file-based JSON storage
- **Auto-creation**: Server creates required files on first run
- **Memory management**: Automatic cleanup of old logs and bot memories
- **File uploads**: Multer handling with 5MB limit, saved to `uploads/` directory

Remember: This application starts fast, requires minimal setup, but needs comprehensive validation of user scenarios to ensure functionality works correctly after any changes.