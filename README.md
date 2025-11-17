# 🌱 Plant Disease Detection System

An intelligent plant disease detection system powered by Machine Learning (EfficientNetB0) and Google Gemini AI, featuring real-time analysis, AI chatbot assistance, and comprehensive token usage analytics.

![Plant Health AI](https://img.shields.io/badge/AI-Powered-green?style=flat-square)
![Python](https://img.shields.io/badge/Python-3.11+-blue?style=flat-square)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

## ✨ Features

- 🔬 **Hybrid AI System**: Combines EfficientNetB0 ML model with Gemini AI for accurate disease detection
- 🤖 **Intelligent Chatbot**: Context-aware Gemini-powered assistant for plant care advice
- 📊 **Analytics Dashboard**: Hidden statistics dashboard tracking API usage, tokens, and system performance
- 🌡️ **Weather Integration**: Real-time climate information for better plant care
- 🔐 **User Authentication**: Secure sign-in/sign-up powered by Supabase Auth
- 📱 **Responsive Design**: Modern UI with Tailwind CSS and Shadcn components
- 🎯 **107 Disease Classes**: Comprehensive detection covering multiple plant species

## 🏗️ Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │─────▶│    Backend   │─────▶│  Gemini AI  │
│ (React/Vite)│      │   (FastAPI)  │      │   (Cloud)   │
└─────────────┘      └──────────────┘      └─────────────┘
                             │
                             ├──▶ ML Model (EfficientNetB0)
                             ├──▶ Token Tracking
                             └──▶ Analytics Storage
```

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Create .env file with your API key
echo "GEMINI_API_KEY=your_api_key_here" > .env

# 3. Start backend server (port 8000)
python server_ai_takeover.py
```

### Frontend Setup

```bash
# 1. Install Node dependencies
npm install

# 2. Start development server (port 8080)
npm run dev
```

### Access Points

- **Main App**: http://localhost:8080
- **Backend API**: http://localhost:8000
- **Analytics Dashboard**: http://localhost:8000/secret-stats-dashboard-x9k2m

## 📦 Tech Stack

### Backend
- **FastAPI**: High-performance Python web framework
- **TensorFlow**: ML model serving (EfficientNetB0)
- **Google Gemini AI**: Advanced AI analysis and chatbot
- **HTTPX**: Async HTTP client for API calls

### Frontend
- **React 18**: Modern UI library
- **TypeScript**: Type-safe development
- **Vite**: Lightning-fast build tool
- **Tailwind CSS**: Utility-first styling
- **Shadcn UI**: Beautiful component library
- **Supabase**: Authentication backend

## 🔑 API Configuration

### Get Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to `.env` file:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### Supabase Configuration

Supabase is used **only for authentication**. The credentials are already configured in:
- `src/integrations/supabase/client.ts`

No additional setup required for basic functionality.

## 📊 System Behavior

### AI Takeover Logic
- **Confidence ≥ 50%**: ML model prediction used
- **Confidence < 50%**: Gemini AI completely replaces analysis
- Both paths tracked separately in analytics

### Token Tracking
- Real-time token consumption monitoring
- Separate tracking for input/output tokens
- Persistent storage across sessions
- Billing-grade accuracy from Gemini API

## 📁 Project Structure

```
├── server_ai_takeover.py          # FastAPI backend with ML + AI
├── final_plant_code/
│   ├── new_efficientnetb0_disease_detector.keras  # Active ML model
│   └── labels.json                 # 107 disease class labels
├── src/
│   ├── components/
│   │   ├── GeminiChatbot.tsx      # AI chatbot component
│   │   ├── PlantAnalyzer.tsx      # Image analysis UI
│   │   └── ClimateInfo.tsx        # Weather widget
│   ├── pages/
│   │   ├── Index.tsx              # Main page
│   │   └── Auth.tsx               # Authentication
│   └── contexts/
│       └── AuthContext.tsx        # Supabase auth provider
├── requirements.txt               # Python dependencies
├── package.json                   # Node dependencies
└── usage_stats.json              # Persistent analytics data
```
```

### Run Tests

```bash
# Backend
pytest

# Frontend
npm run test
```

### Build for Production

```bash
# Frontend build
npm run build

# Backend runs directly with uvicorn
python server_ai_takeover.py
```

**Features:**
- Session vs lifetime statistics
- Token consumption breakdown
- ML vs AI usage ratios
- Auto-refresh every 5 seconds
- Persistent storage

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Google Gemini AI** for advanced plant analysis
- **TensorFlow** for ML model serving
- **Supabase** for authentication infrastructure
- **Shadcn UI** for beautiful components


---

**Made with 🌱 for plant lovers everywhere**
