# This will be inserted into server_ai_takeover.py before the if __name__ == '__main__': line

@app.get('/secret-stats-dashboard-x9k2m')
async def secret_stats():
    """
    Hidden stats endpoint - only accessible via direct URL.
    Access at: http://localhost:8000/secret-stats-dashboard-x9k2m
    """
    from datetime import datetime
    from fastapi.responses import HTMLResponse
    
    # Calculate uptime
    uptime = 'N/A'
    if USAGE_STATS['start_time']:
        try:
            start = datetime.fromisoformat(USAGE_STATS['start_time'])
            now = datetime.now()
            delta = now - start
            hours = delta.total_seconds() / 3600
            if hours < 1:
                uptime = f"{int(delta.total_seconds() / 60)} minutes"
            else:
                uptime = f"{hours:.1f} hours"
        except:
            uptime = 'N/A'
    
    # Calculate percentages
    total = USAGE_STATS['predictions']
    ai_percent = (USAGE_STATS['ai_takeovers'] / total * 100) if total > 0 else 0
    ml_percent = (USAGE_STATS['ml_predictions'] / total * 100) if total > 0 else 0
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Plant AI Stats Dashboard</title>
        <meta http-equiv="refresh" content="5">
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 20px;
                min-height: 100vh;
            }}
            .container {{
                max-width: 1200px;
                margin: 0 auto;
            }}
            .header {{
                text-align: center;
                color: white;
                margin-bottom: 30px;
            }}
            .header h1 {{
                font-size: 2.5em;
                margin-bottom: 10px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }}
            .header p {{
                opacity: 0.9;
                font-size: 1.1em;
            }}
            .stats-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }}
            .stat-card {{
                background: white;
                border-radius: 15px;
                padding: 25px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                transition: transform 0.3s;
            }}
            .stat-card:hover {{
                transform: translateY(-5px);
            }}
            .stat-card .icon {{
                font-size: 2.5em;
                margin-bottom: 10px;
            }}
            .stat-card .label {{
                color: #666;
                font-size: 0.9em;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 8px;
            }}
            .stat-card .value {{
                font-size: 2.5em;
                font-weight: bold;
                color: #333;
                margin-bottom: 5px;
            }}
            .stat-card .subvalue {{
                color: #999;
                font-size: 0.9em;
            }}
            .chart-card {{
                background: white;
                border-radius: 15px;
                padding: 30px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }}
            .chart-card h2 {{
                margin-bottom: 20px;
                color: #333;
            }}
            .bar-chart {{
                display: flex;
                gap: 20px;
                align-items: flex-end;
                height: 200px;
                margin-top: 20px;
                padding-top: 30px;
            }}
            .bar {{
                flex: 1;
                background: linear-gradient(to top, #667eea, #764ba2);
                border-radius: 8px 8px 0 0;
                position: relative;
                min-height: 20px;
                transition: all 0.3s;
            }}
            .bar:hover {{
                opacity: 0.8;
            }}
            .bar-label {{
                position: absolute;
                bottom: -25px;
                left: 0;
                right: 0;
                text-align: center;
                font-size: 0.9em;
                color: #666;
            }}
            .bar-value {{
                position: absolute;
                top: -25px;
                left: 0;
                right: 0;
                text-align: center;
                font-weight: bold;
                color: #333;
            }}
            .refresh-notice {{
                text-align: center;
                color: white;
                margin-top: 20px;
                opacity: 0.8;
            }}
            .purple {{ color: #8b5cf6; }}
            .blue {{ color: #3b82f6; }}
            .green {{ color: #10b981; }}
            .red {{ color: #ef4444; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🌱 Plant AI Stats Dashboard</h1>
                <p>Real-time API Usage Monitoring</p>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="icon">📊</div>
                    <div class="label">Total Requests</div>
                    <div class="value">{USAGE_STATS['total_requests']}</div>
                    <div class="subvalue">All endpoints</div>
                </div>
                
                <div class="stat-card">
                    <div class="icon">📸</div>
                    <div class="label">Plant Scans</div>
                    <div class="value">{USAGE_STATS['predictions']}</div>
                    <div class="subvalue">Images analyzed</div>
                </div>
                
                <div class="stat-card">
                    <div class="icon">🤖</div>
                    <div class="label">AI Takeovers</div>
                    <div class="value purple">{USAGE_STATS['ai_takeovers']}</div>
                    <div class="subvalue">{ai_percent:.1f}% of scans</div>
                </div>
                
                <div class="stat-card">
                    <div class="icon">🧠</div>
                    <div class="label">ML Predictions</div>
                    <div class="value blue">{USAGE_STATS['ml_predictions']}</div>
                    <div class="subvalue">{ml_percent:.1f}% of scans</div>
                </div>
                
                <div class="stat-card">
                    <div class="icon">💬</div>
                    <div class="label">Chat Messages</div>
                    <div class="value green">{USAGE_STATS['chat_messages']}</div>
                    <div class="subvalue">Gemini API calls</div>
                </div>
                
                <div class="stat-card">
                    <div class="icon">⚠️</div>
                    <div class="label">Errors</div>
                    <div class="value red">{USAGE_STATS['errors']}</div>
                    <div class="subvalue">Failed requests</div>
                </div>
            </div>
            
            <div class="chart-card">
                <h2>📊 Prediction Distribution</h2>
                <div class="bar-chart">
                    <div class="bar" style="height: {max(ai_percent, 5)}%">
                        <div class="bar-value">{USAGE_STATS['ai_takeovers']}</div>
                        <div class="bar-label">AI Takeover</div>
                    </div>
                    <div class="bar" style="height: {max(ml_percent, 5)}%">
                        <div class="bar-value">{USAGE_STATS['ml_predictions']}</div>
                        <div class="bar-label">ML Model</div>
                    </div>
                    <div class="bar" style="height: {max((USAGE_STATS['chat_messages'] / max(USAGE_STATS['predictions'], 1) * 100) if USAGE_STATS['predictions'] > 0 else 0, 5)}%">
                        <div class="bar-value">{USAGE_STATS['chat_messages']}</div>
                        <div class="bar-label">Chat Messages</div>
                    </div>
                </div>
            </div>
            
            <div class="refresh-notice">
                🔄 Auto-refreshing every 5 seconds | Uptime: {uptime}
            </div>
        </div>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html)
