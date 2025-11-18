from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import numpy as np
from PIL import Image
import io
import os
import base64
import tensorflow as tf
import httpx
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="Plant Disease Detection with AI Takeover")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
MODEL_PATH = os.path.join('final_plant_code', 'new_efficientnetb0_disease_detector.keras')
SPECIES_LABELS_PATH = os.path.join('final_plant_code', 'species_labels.json')
DISEASE_LABELS_PATH = os.path.join('final_plant_code', 'disease_labels.json')

LLM_URL = os.getenv('LLM_URL')
LLM_API_KEY = os.getenv('LLM_API_KEY')
AI_FALLBACK_THRESHOLD = float(os.getenv('AI_FALLBACK_THRESHOLD', '50'))
ENABLE_AI_TAKEOVER = os.getenv('ENABLE_AI_TAKEOVER', 'true').lower() == 'true'
ML_ENABLED = os.getenv('ML_ENABLED', 'true').lower() == 'true'

# Global model and labels (single model used twice with different labels)
MODEL = None
SPECIES_LABELS = None
DISEASE_LABELS = None

# Usage tracking
STATS_FILE = 'usage_stats.json'
USAGE_STATS = {
    'predictions': 0,
    'chat_messages': 0,
    'ai_takeovers': 0,
    'ml_predictions': 0,
    'total_requests': 0,
    'errors': 0,
    'tokens_used': 0,
    'tokens_input': 0,
    'tokens_output': 0,
    'start_time': None,
    'total_lifetime': {
        'predictions': 0,
        'chat_messages': 0,
        'ai_takeovers': 0,
        'ml_predictions': 0,
        'total_requests': 0,
        'errors': 0,
        'tokens_used': 0,
        'tokens_input': 0,
        'tokens_output': 0
    }
}


def load_stats():
    """Load stats from file."""
    global USAGE_STATS
    import json
    if os.path.exists(STATS_FILE):
        try:
            with open(STATS_FILE, 'r') as f:
                saved = json.load(f)
                # Load lifetime stats
                if 'total_lifetime' in saved:
                    USAGE_STATS['total_lifetime'] = saved['total_lifetime']
                logger.info(f"📊 Loaded lifetime stats: {USAGE_STATS['total_lifetime']['predictions']} predictions")
        except Exception as e:
            logger.warning(f"Could not load stats: {e}")


def save_stats():
    """Save stats to file."""
    import json
    try:
        with open(STATS_FILE, 'w') as f:
            json.dump(USAGE_STATS, f, indent=2)
    except Exception as e:
        logger.warning(f"Could not save stats: {e}")


def update_lifetime_stats():
    """Update lifetime stats with current session."""
    USAGE_STATS['total_lifetime']['predictions'] += USAGE_STATS['predictions']
    USAGE_STATS['total_lifetime']['chat_messages'] += USAGE_STATS['chat_messages']
    USAGE_STATS['total_lifetime']['ai_takeovers'] += USAGE_STATS['ai_takeovers']
    USAGE_STATS['total_lifetime']['ml_predictions'] += USAGE_STATS['ml_predictions']
    USAGE_STATS['total_lifetime']['total_requests'] += USAGE_STATS['total_requests']
    USAGE_STATS['total_lifetime']['errors'] += USAGE_STATS['errors']
    USAGE_STATS['total_lifetime']['tokens_used'] += USAGE_STATS['tokens_used']
    USAGE_STATS['total_lifetime']['tokens_input'] += USAGE_STATS['tokens_input']
    USAGE_STATS['total_lifetime']['tokens_output'] += USAGE_STATS['tokens_output']
    save_stats()


def load_model_and_labels():
    """Load single model with both species and disease labels."""
    global MODEL, SPECIES_LABELS, DISEASE_LABELS
    import json
    
    # Load the single model (will be used twice with different labels)
    if not os.path.exists(MODEL_PATH):
        logger.error(f"Model not found at {MODEL_PATH}")
    else:
        try:
            MODEL = tf.keras.models.load_model(MODEL_PATH, compile=False)
            logger.info(f"✓ Model loaded from {MODEL_PATH}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
    
    # Load Species Labels (80 classes)
    if os.path.exists(SPECIES_LABELS_PATH):
        try:
            with open(SPECIES_LABELS_PATH, 'r', encoding='utf-8') as f:
                SPECIES_LABELS = json.load(f)
                logger.info(f"✓ Loaded {len(SPECIES_LABELS)} species labels")
        except Exception as e:
            logger.error(f"Failed to load species labels: {e}")
    else:
        logger.warning(f"Species labels not found at {SPECIES_LABELS_PATH}")
    
    # Load Disease Labels (28 classes)
    if os.path.exists(DISEASE_LABELS_PATH):
        try:
            with open(DISEASE_LABELS_PATH, 'r', encoding='utf-8') as f:
                DISEASE_LABELS = json.load(f)
                logger.info(f"✓ Loaded {len(DISEASE_LABELS)} disease labels")
        except Exception as e:
            logger.error(f"Failed to load disease labels: {e}")
    else:
        logger.warning(f"Disease labels not found at {DISEASE_LABELS_PATH}")


@app.on_event("startup")
def startup():
    """Initialize on server startup."""
    global USAGE_STATS
    from datetime import datetime
    load_stats()  # Load previous lifetime stats
    USAGE_STATS['start_time'] = datetime.now().isoformat()
    logger.info("🚀 Starting Plant Disease Detection Server with AI Takeover...")
    if ML_ENABLED:
        load_model_and_labels()
    else:
        logger.info("ℹ️ ML inference disabled via ML_ENABLED=false; skipping model load")
    if LLM_URL and LLM_API_KEY:
        logger.info("✓ Gemini AI complete takeover enabled")
    else:
        logger.warning("⚠ Gemini AI disabled (missing credentials)")


@app.on_event("shutdown")
def shutdown():
    """Save stats on shutdown."""
    update_lifetime_stats()
    logger.info("💾 Stats saved to disk")


def parse_ai_analysis(ai_text: str) -> dict | None:
    """Parse structured AI response into analysis dict."""
    try:
        lines = ai_text.strip().split('\n')
        parsed = {}
        
        for line in lines:
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip().upper().replace('**', '')
                value = value.strip().replace('**', '')
                
                if key == 'PLANT':
                    parsed['plantName'] = value
                elif key == 'DISEASE':
                    if value.lower().startswith('yes'):
                        parsed['diseaseDetected'] = True
                        # Extract disease name after "Yes -" or "Yes,"
                        disease_name = value.split('-', 1)[-1].split(',', 1)[-1].strip()
                        parsed['diseaseName'] = disease_name if disease_name and disease_name.lower() != 'yes' else 'Disease Detected'
                    else:
                        parsed['diseaseDetected'] = False
                        parsed['diseaseName'] = None
                elif key == 'CONFIDENCE':
                    try:
                        conf_num = ''.join(filter(str.isdigit, value))
                        parsed['confidence'] = float(conf_num) if conf_num else 50.0
                    except:
                        parsed['confidence'] = 50.0
                elif key == 'SEVERITY':
                    severity = value.strip().title()
                    if severity in ['Low', 'Medium', 'High']:
                        parsed['severity'] = severity
                    else:
                        parsed['severity'] = 'Medium'
                elif key == 'SYMPTOMS':
                    symptoms = [s.strip() for s in value.split('|') if s.strip()]
                    parsed['symptoms'] = symptoms if symptoms else ['Visible symptoms present']
                elif key == 'RECOMMENDATIONS':
                    recommendations = [r.strip() for r in value.split('|') if r.strip()]
                    parsed['recommendations'] = recommendations if recommendations else ['Consult plant expert']
                elif key == 'ANALYSIS':
                    parsed['aiAssist'] = value
        
        # Ensure required fields
        if 'plantName' not in parsed:
            parsed['plantName'] = 'Unknown Plant'
        if 'diseaseDetected' not in parsed:
            parsed['diseaseDetected'] = False
        if 'confidence' not in parsed:
            parsed['confidence'] = 50.0
        if 'severity' not in parsed:
            parsed['severity'] = 'Medium'
        if 'symptoms' not in parsed:
            parsed['symptoms'] = []
        if 'recommendations' not in parsed:
            parsed['recommendations'] = ['Monitor plant condition', 'Consult expert if symptoms worsen']
        
        # Calculate health score
        if parsed['diseaseDetected']:
            parsed['healthScore'] = max(0, 100 - int(parsed['confidence']))
        else:
            parsed['healthScore'] = min(100, int(parsed['confidence']))
        
        # Add full AI text as aiAssist if not already present
        if 'aiAssist' not in parsed:
            parsed['aiAssist'] = ai_text
        
        logger.info(f"✓ Parsed AI analysis: {parsed['plantName']}, disease={parsed['diseaseDetected']}")
        return parsed
        
    except Exception as e:
        logger.error(f"Failed to parse AI analysis: {e}")
        return None


async def call_gemini_complete_analysis(image_bytes: bytes, ml_prediction: str, confidence: float) -> dict | None:
    """Call Gemini API for COMPLETE takeover - AI provides all fields."""
    if not LLM_URL or not LLM_API_KEY:
        return None
    
    try:
        # Convert image to base64
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        url = f"{LLM_URL}?key={LLM_API_KEY}"
        
        # Comprehensive prompt for complete analysis
        prompt = f"""You are a plant disease expert. Analyze this plant image and provide a COMPLETE diagnosis.

The ML model predicted: {ml_prediction} with only {confidence:.1f}% confidence (very low - likely wrong).

Analyze the image and provide these details in this EXACT format:

PLANT: [specific plant name or general type like "Medicinal Herb", "Leafy Vegetable"]
DISEASE: [Yes - disease name] or [No - Healthy]
CONFIDENCE: [your confidence 0-100]
SEVERITY: [Low or Medium or High]
SYMPTOMS: [symptom 1] | [symptom 2] | [symptom 3]
RECOMMENDATIONS: [action 1] | [action 2] | [action 3] | [action 4]
ANALYSIS: [2-3 sentences explaining what you see and your diagnosis]

Be specific and practical."""

        # Gemini API format with image
        body = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": base64_image
                        }
                    }
                ]
            }]
        }
        
        headers = {'Content-Type': 'application/json'}
        
        logger.info("🤖 AI COMPLETE TAKEOVER - Gemini analyzing image...")
        
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, json=body, headers=headers)
            
            if resp.status_code != 200:
                logger.error(f"Gemini API error {resp.status_code}: {resp.text[:500]}")
                return None
            
            data = resp.json()
            
            # Track token usage if available
            if 'usageMetadata' in data:
                metadata = data['usageMetadata']
                prompt_tokens = metadata.get('promptTokenCount', 0)
                completion_tokens = metadata.get('candidatesTokenCount', 0)
                total_tokens = metadata.get('totalTokenCount', 0)
                
                USAGE_STATS['tokens_input'] += prompt_tokens
                USAGE_STATS['tokens_output'] += completion_tokens
                USAGE_STATS['tokens_used'] += total_tokens
                
                logger.info(f"🔢 Tokens: {prompt_tokens} input + {completion_tokens} output = {total_tokens} total")
            
            # Parse response
            if 'candidates' in data and len(data['candidates']) > 0:
                content = data['candidates'][0].get('content', {})
                parts = content.get('parts', [])
                if parts and 'text' in parts[0]:
                    ai_text = parts[0]['text']
                    logger.info(f"✓ AI complete analysis received ({len(ai_text)} chars)")
                    
                    # Parse structured response
                    result = parse_ai_analysis(ai_text)
                    if result:
                        logger.info(f"✅ AI TAKEOVER SUCCESS: {result['plantName']}, {result['confidence']}% confidence")
                        return result
                    
                    # Fallback: return as aiAssist only
                    logger.warning("⚠ Could not parse AI response, returning as text only")
                    return {'aiAssist': ai_text}
            
            logger.error("Could not parse Gemini response")
            return None
            
    except Exception as e:
        logger.exception(f"Gemini complete analysis failed: {e}")
        return None


def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """Preprocess image for model prediction."""
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    img = img.resize((224, 224))
    arr = np.array(img, dtype=np.float32)
    
    # EfficientNet preprocessing
    try:
        arr = tf.keras.applications.efficientnet.preprocess_input(arr)
    except:
        arr = arr / 255.0
    
    return np.expand_dims(arr, axis=0)


def analyze_prediction(label: str, confidence: float) -> dict:
    """Analyze prediction and generate response (used when ML confidence is high).
    DEPRECATED: Use create_dual_model_analysis() for dual-model predictions."""
    conf_pct = round(float(confidence), 2)
    label_lower = label.lower()
    
    # Check if disease detected
    disease_keywords = [
        'leaf', 'rot', 'blight', 'rust', 'wilt', 'mildew', 'anthracnose',
        'spot', 'curl', 'sooty', 'powdery', 'phytophthora'
    ]
    disease_detected = any(kw in label_lower for kw in disease_keywords)
    
    # Calculate severity and health score
    if disease_detected:
        if conf_pct >= 70:
            severity = 'High'
        elif conf_pct >= 40:
            severity = 'Medium'
        else:
            severity = 'Low'
        health_score = max(0, 100 - int(conf_pct))
        symptoms = ['Visible discoloration', 'Leaf abnormalities', 'Potential disease signs']
        recommendations = [
            'Isolate affected plant if possible',
            'Monitor for spreading symptoms',
            'Consider consulting plant expert'
        ]
    else:
        severity = 'Low'
        health_score = min(100, int(conf_pct))
        symptoms = []
        recommendations = ['Plant appears healthy', 'Continue regular care', 'Monitor periodically']
    
    return {
        'plantName': label,
        'diseaseDetected': disease_detected,
        'diseaseName': label if disease_detected else None,
        'confidence': conf_pct,
        'severity': severity,
        'symptoms': symptoms,
        'recommendations': recommendations,
        'healthScore': health_score
    }


def create_dual_model_analysis(species_name: str, species_confidence: float, 
                               disease_name: str, disease_confidence: float) -> dict:
    """Analyze dual-model predictions (species + disease) and generate structured response."""
    
    # Round confidences
    species_conf = round(float(species_confidence), 2)
    disease_conf = round(float(disease_confidence), 2)
    combined_conf = round((species_conf + disease_conf) / 2, 2)
    
    # Determine severity based on disease confidence
    if disease_conf >= 70:
        severity = 'High'
    elif disease_conf >= 40:
        severity = 'Medium'
    else:
        severity = 'Low'
    
    # Health score inversely proportional to disease confidence
    health_score = max(0, 100 - int(disease_conf))
    
    # Check if it's a healthy condition or actual disease
    disease_lower = disease_name.lower()
    is_healthy = 'healthy' in disease_lower or 'normal' in disease_lower
    
    if is_healthy:
        symptoms = []
        recommendations = [
            f'{species_name} appears healthy',
            'Continue regular watering and care',
            'Monitor periodically for any changes',
            'Maintain good air circulation'
        ]
        disease_detected = False
    else:
        symptoms = [
            'Disease symptoms detected',
            'Visual abnormalities present',
            f'Identified as {disease_name}'
        ]
        recommendations = [
            f'Disease detected: {disease_name}',
            'Isolate affected plant to prevent spread',
            'Remove severely affected leaves',
            'Apply appropriate fungicide or treatment',
            'Monitor other plants for similar symptoms',
            'Consult plant expert if condition worsens'
        ]
        disease_detected = True
    
    return {
        'plantName': species_name,
        'diseaseDetected': disease_detected,
        'diseaseName': disease_name if disease_detected else None,
        'confidence': combined_conf,
        'speciesConfidence': species_conf,
        'diseaseConfidence': disease_conf,
        'severity': severity,
        'symptoms': symptoms,
        'recommendations': recommendations,
        'healthScore': health_score,
        'modelType': 'dual'  # Indicates this used both models
    }


@app.get('/')
async def root():
    """Root endpoint."""
    return {
        'service': 'Plant Disease Detection API with AI Takeover (Single Model)',
        'status': 'running',
        'model_loaded': MODEL is not None,
        'species_labels': len(SPECIES_LABELS) if SPECIES_LABELS else 0,
        'disease_labels': len(DISEASE_LABELS) if DISEASE_LABELS else 0,
        'ai_takeover_enabled': ENABLE_AI_TAKEOVER,
        'ai_takeover_available': LLM_URL is not None and LLM_API_KEY is not None,
        'ml_enabled': ML_ENABLED
    }


@app.get('/health')
async def health():
    """Health check."""
    USAGE_STATS['total_requests'] += 1
    if MODEL is None:
        raise HTTPException(status_code=503, detail='Model not loaded')
    return {
        'status': 'healthy',
        'model': 'loaded',
        'species_labels': len(SPECIES_LABELS) if SPECIES_LABELS else 0,
        'disease_labels': len(DISEASE_LABELS) if DISEASE_LABELS else 0,
        'ai_takeover_enabled': ENABLE_AI_TAKEOVER,
        'ai_takeover_available': 'yes' if (LLM_URL and LLM_API_KEY) else 'no',
        'ml_enabled': ML_ENABLED
    }


@app.get('/labels')
def get_labels():
    """Get available plant species and disease labels."""
    return JSONResponse(content={
        'species': SPECIES_LABELS if SPECIES_LABELS else [],
        'diseases': DISEASE_LABELS if DISEASE_LABELS else []
    })


@app.post('/predict')
async def predict(file: UploadFile = File(...)):
    """Predict plant species and disease from image using single model twice."""
    USAGE_STATS['total_requests'] += 1
    USAGE_STATS['predictions'] += 1
    
    if MODEL is None:
        USAGE_STATS['errors'] += 1
        raise HTTPException(status_code=503, detail='Model not available')
    
    # Read image
    try:
        image_bytes = await file.read()
        processed_image = preprocess_image(image_bytes)
    except Exception as e:
        USAGE_STATS['errors'] += 1
        raise HTTPException(status_code=400, detail=f'Invalid image: {str(e)}')

    # If ML is disabled via env, route to AI takeover (if enabled) or error
    if not ML_ENABLED:
        logger.info("ℹ️ ML is disabled; skipping ML inference")
        if ENABLE_AI_TAKEOVER:
            USAGE_STATS['ai_takeovers'] += 1
            ai_result = await call_gemini_complete_analysis(image_bytes, "Unknown - Unknown", 0.0)
            if ai_result:
                return JSONResponse(content=ai_result)
            else:
                USAGE_STATS['errors'] += 1
                raise HTTPException(status_code=503, detail='AI takeover failed and ML is disabled')
        else:
            USAGE_STATS['errors'] += 1
            raise HTTPException(status_code=503, detail='Both ML and AI are disabled; cannot perform inference')
    
    # Step 1: Predict Plant Species (using species labels)
    try:
        species_predictions = MODEL.predict(processed_image, verbose=0)
        species_idx = int(np.argmax(species_predictions[0]))
        species_confidence = float(species_predictions[0][species_idx] * 100)
        
        if SPECIES_LABELS and species_idx < len(SPECIES_LABELS):
            species_name = SPECIES_LABELS[species_idx]
        else:
            species_name = f'Unknown_Species_{species_idx}'
        
        logger.info(f"🌿 Species: {species_name} ({species_confidence:.2f}%)")
    except Exception as e:
        USAGE_STATS['errors'] += 1
        raise HTTPException(status_code=500, detail=f'Species prediction failed: {str(e)}')
    
    # Step 2: Predict Disease (using disease labels, same model)
    try:
        disease_predictions = MODEL.predict(processed_image, verbose=0)
        disease_idx = int(np.argmax(disease_predictions[0]))
        disease_confidence = float(disease_predictions[0][disease_idx] * 100)
        
        if DISEASE_LABELS and disease_idx < len(DISEASE_LABELS):
            disease_name = DISEASE_LABELS[disease_idx]
        else:
            disease_name = f'Unknown_Disease_{disease_idx}'
        
        logger.info(f"🔬 Disease: {disease_name} ({disease_confidence:.2f}%)")
    except Exception as e:
        USAGE_STATS['errors'] += 1
        raise HTTPException(status_code=500, detail=f'Disease prediction failed: {str(e)}')
    
    # Calculate combined confidence (average of both)
    combined_confidence = (species_confidence + disease_confidence) / 2
    
    # Create combined label for AI context
    ml_label = f"{species_name} - {disease_name}"
    
    # DECISION: AI Takeover or ML Result?
    if ENABLE_AI_TAKEOVER and combined_confidence < AI_FALLBACK_THRESHOLD:
        USAGE_STATS['ai_takeovers'] += 1
        logger.info(f"⚠ Low ML confidence ({combined_confidence:.2f}%) - ACTIVATING AI TAKEOVER")
        
        # AI COMPLETE TAKEOVER
        ai_result = await call_gemini_complete_analysis(image_bytes, ml_label, combined_confidence)
        
        if ai_result:
            logger.info("✅ Using AI analysis as primary result")
            return JSONResponse(content=ai_result)
        else:
            logger.warning("⚠ AI takeover failed, falling back to ML result")
            analysis = create_dual_model_analysis(species_name, species_confidence, disease_name, disease_confidence)
            analysis['aiAssist'] = 'AI analysis unavailable - using ML prediction'
            return JSONResponse(content=analysis)
    else:
        # High ML confidence or AI disabled - use ML result
        USAGE_STATS['ml_predictions'] += 1
        if not ENABLE_AI_TAKEOVER:
            logger.info(f"✓ AI takeover disabled - using ML result ({combined_confidence:.2f}%)")
        else:
            logger.info(f"✓ High ML confidence ({combined_confidence:.2f}%) - using ML result")
        analysis = create_dual_model_analysis(species_name, species_confidence, disease_name, disease_confidence)
        return JSONResponse(content=analysis)


class ChatRequest(BaseModel):
    """Chat request model."""
    prompt: str
    analysisContext: Optional[dict] = None


@app.post('/chat')
async def chat(request: ChatRequest):
    """
    Chat endpoint using Gemini AI.
    Accepts user prompt and optional analysis context.
    """
    USAGE_STATS['total_requests'] += 1
    USAGE_STATS['chat_messages'] += 1
    
    if not LLM_URL or not LLM_API_KEY:
        USAGE_STATS['errors'] += 1
        raise HTTPException(status_code=503, detail="Gemini AI not configured")
    
    try:
        # Build the request to Gemini
        payload = {
            "contents": [{
                "parts": [{
                    "text": request.prompt
                }]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 1024,
            }
        }
        
        # Make request to Gemini
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{LLM_URL}?key={LLM_API_KEY}",
                json=payload,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code != 200:
                logger.error(f"Gemini API error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=response.status_code, detail="Gemini API error")
            
            data = response.json()
            
            # Track token usage
            if 'usageMetadata' in data:
                metadata = data['usageMetadata']
                prompt_tokens = metadata.get('promptTokenCount', 0)
                completion_tokens = metadata.get('candidatesTokenCount', 0)
                total_tokens = metadata.get('totalTokenCount', 0)
                
                USAGE_STATS['tokens_input'] += prompt_tokens
                USAGE_STATS['tokens_output'] += completion_tokens
                USAGE_STATS['tokens_used'] += total_tokens
                
                logger.info(f"🔢 Chat tokens: {total_tokens} total")
            
            # Extract response text
            if 'candidates' in data and len(data['candidates']) > 0:
                candidate = data['candidates'][0]
                if 'content' in candidate and 'parts' in candidate['content']:
                    ai_response = candidate['content']['parts'][0].get('text', '')
                    return JSONResponse(content={'response': ai_response})
            
            logger.warning("Unexpected Gemini response format")
            return JSONResponse(content={'response': 'I apologize, but I encountered an error processing your request.'})
            
    except httpx.TimeoutException:
        logger.error("Gemini API timeout")
        raise HTTPException(status_code=504, detail="Request timeout")
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
    
    # Lifetime stats
    lifetime = USAGE_STATS['total_lifetime']
    lifetime_total = lifetime['predictions']
    lifetime_ai_percent = (lifetime['ai_takeovers'] / lifetime_total * 100) if lifetime_total > 0 else 0
    lifetime_ml_percent = (lifetime['ml_predictions'] / lifetime_total * 100) if lifetime_total > 0 else 0
    
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
            .lifetime-section {{
                background: rgba(255, 255, 255, 0.1);
                border-radius: 15px;
                padding: 20px;
                margin-top: 30px;
                border: 2px solid rgba(255, 255, 255, 0.2);
            }}
            .lifetime-section h3 {{
                color: white;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                gap: 10px;
            }}
            .lifetime-grid {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
            }}
            .lifetime-stat {{
                text-align: center;
                padding: 15px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
            }}
            .lifetime-stat .value {{
                font-size: 2em;
                font-weight: bold;
                color: white;
                margin-bottom: 5px;
            }}
            .lifetime-stat .label {{
                color: rgba(255, 255, 255, 0.8);
                font-size: 0.85em;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🌱 Plant AI Stats Dashboard</h1>
                <p>Real-time API Usage Monitoring</p>
            </div>
            
            <div class="lifetime-section">
                <h3>📈 All-Time Statistics</h3>
                <div class="lifetime-grid">
                    <div class="lifetime-stat">
                        <div class="value">{lifetime['tokens_used']:,}</div>
                        <div class="label">🎯 Total Tokens</div>
                    </div>
                    <div class="lifetime-stat">
                        <div class="value">{lifetime['tokens_input']:,}</div>
                        <div class="label">📥 Input Tokens</div>
                    </div>
                    <div class="lifetime-stat">
                        <div class="value">{lifetime['tokens_output']:,}</div>
                        <div class="label">📤 Output Tokens</div>
                    </div>
                    <div class="lifetime-stat">
                        <div class="value">{lifetime['predictions']}</div>
                        <div class="label">Total Scans</div>
                    </div>
                    <div class="lifetime-stat">
                        <div class="value">{lifetime['chat_messages']}</div>
                        <div class="label">Chat Messages</div>
                    </div>
                    <div class="lifetime-stat">
                        <div class="value">{lifetime_ai_percent:.1f}%</div>
                        <div class="label">AI Usage Rate</div>
                    </div>
                </div>
            </div>
            
            <div class="stats-grid" style="margin-top: 30px;">
                <div class="stat-card">
                    <div class="icon">🎯</div>
                    <div class="label">Session Tokens</div>
                    <div class="value">{USAGE_STATS['tokens_used']:,}</div>
                    <div class="subvalue">Total consumed</div>
                </div>
                
                <div class="stat-card">
                    <div class="icon">📸</div>
                    <div class="label">Session Scans</div>
                    <div class="value">{USAGE_STATS['predictions']}</div>
                    <div class="subvalue">This session</div>
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
                <h2>📊 Current Session Distribution</h2>
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


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('server_ai_takeover:app', host='127.0.0.1', port=8000, reload=False)
