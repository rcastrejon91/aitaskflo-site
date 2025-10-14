const fs = require('fs');

// Read server.js
let serverCode = fs.readFileSync('server.js', 'utf8');

// Check if static serving exists
if (!serverCode.includes("app.use(express.static('public'))")) {
    console.log('❌ Static serving not found or misconfigured');
    
    // Find the line with app.use(express.json())
    const lines = serverCode.split('\n');
    let insertIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('app.use(express.json())')) {
            insertIndex = i + 1;
            break;
        }
    }
    
    if (insertIndex > -1) {
        // Remove any existing static serving lines
        const cleanedLines = lines.filter(line => 
            !line.includes("express.static('public')") && 
            !line.includes('express.static("public")')
        );
        
        // Insert proper static serving
        cleanedLines.splice(insertIndex, 0, "app.use(express.static('public'));");
        cleanedLines.splice(insertIndex + 1, 0, "app.use(express.static('.'));  // Serve root files too");
        
        serverCode = cleanedLines.join('\n');
        fs.writeFileSync('server.js', serverCode);
        console.log('✅ Fixed static file serving');
    } else {
        console.log('❌ Could not find insertion point');
    }
} else {
    console.log('✅ Static serving already configured');
}
