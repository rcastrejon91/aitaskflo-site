# 🏥 AITaskFlo Medical Bot - Integration Guide

## Quick Start (1 Line of Code!)

Add this to any page on your website:

```html
<!-- Add before </body> -->
<script src="https://www.aitaskflo.com/medical-bot-widget.js"></script>
<script>
  AITaskFloMedicalBot.init({
    apiKey: 'YOUR_API_KEY_HERE'
  });
</script>

<!DOCTYPE html>
<html>
<head>
    <title>Your Website</title>
</head>
<body>
    <!-- Your website content -->
    
    <!-- AITaskFlo Medical Bot -->
    <script src="https://www.aitaskflo.com/medical-bot-widget.js"></script>
    <script>
        AITaskFloMedicalBot.init({
            apiUrl: 'https://api.aitaskflo.com',
            apiKey: 'YOUR_API_KEY',
            theme: 'aitaskflo',
            position: 'bottom-right',
            botName: 'Medical Assistant',
            welcomeMessage: 'Hello! How can I help you today?'
        });
    </script>
</body>
</html>

