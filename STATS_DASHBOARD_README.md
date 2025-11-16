# 📊 Hidden Stats Dashboard

## Access URL
```
http://localhost:8000/secret-stats-dashboard-x9k2m
```

## What It Shows

The dashboard displays real-time statistics about your Plant AI system:

### 📈 Metrics Tracked:
- **Total Requests**: All API calls to the backend
- **Plant Scans**: Number of images analyzed
- **AI Takeovers**: When Gemini AI replaced ML predictions (low confidence)
- **ML Predictions**: When the ML model was used (high confidence)
- **Chat Messages**: Number of questions asked to the chatbot
- **Errors**: Failed requests

### 🎨 Features:
- ✨ Beautiful gradient design
- 📊 Visual bar chart showing prediction distribution
- ⏱️ Server uptime display
- 🔄 Auto-refreshes every 5 seconds
- 📱 Responsive design

## How to Use

1. Make sure your backend server is running:
   ```
   py server_ai_takeover.py
   ```

2. Open your browser and visit:
   ```
   http://localhost:8000/secret-stats-dashboard-x9k2m
   ```

3. The dashboard will automatically update every 5 seconds

## Security Note

This URL is "hidden" - it's not linked anywhere in your app, so only someone with the direct URL can access it. The random string `x9k2m` makes it harder to guess.

## Customization

To change the URL, edit `server_ai_takeover.py` and modify:
```python
@app.get('/secret-stats-dashboard-x9k2m')  # Change this part
```

To change the refresh interval, edit the HTML:
```html
<meta http-equiv="refresh" content="5">  <!-- Change seconds here -->
```
