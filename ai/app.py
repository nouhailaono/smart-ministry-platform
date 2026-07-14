"""
app.py - Flask API for the AI module
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import json
from datetime import datetime

from config import *
from preprocessing.preprocess import ProjectDataPreprocessor
from prediction.predict import RiskPredictor
from recommendations.recommendation_engine import RecommendationEngine

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize components
predictor = RiskPredictor()
recommendation_engine = RecommendationEngine()
preprocessor = ProjectDataPreprocessor()

# Load models and data
try:
    predictor.load_artifacts()
    print("✅ Risk predictor loaded")
except Exception as e:
    print(f"⚠️ Risk predictor not loaded: {e}")

try:
    recommendation_engine.load_data()
    print("✅ Recommendation engine loaded")
except Exception as e:
    print(f"⚠️ Recommendation engine not loaded: {e}")

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'services': {
            'predictor': predictor.model is not None,
            'recommendations': recommendation_engine.projects_df is not None
        }
    })

@app.route('/predict', methods=['POST'])
def predict():
    """Predict risk level for a project"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['ministry', 'project_type', 'status', 'budget', 'location', 'priority']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Make prediction
        result = predictor.predict_risk(data)
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/predict-batch', methods=['POST'])
def predict_batch():
    """Predict risk for multiple projects"""
    try:
        data = request.json
        
        if 'projects' not in data:
            return jsonify({'error': 'Missing projects field'}), 400
        
        projects_df = pd.DataFrame(data['projects'])
        results = predictor.predict_batch(projects_df)
        
        return jsonify({
            'success': True,
            'data': results.to_dict('records')
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/recommendations/similar/<project_id>', methods=['GET'])
def get_similar_projects(project_id):
    """Get similar projects"""
    try:
        n = int(request.args.get('n', 5))
        similar = recommendation_engine.get_similar_projects(project_id, n)
        
        return jsonify({
            'success': True,
            'data': similar.to_dict('records')
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/recommendations/high-risk', methods=['GET'])
def get_high_risk():
    """Get high-risk projects"""
    try:
        threshold = float(request.args.get('threshold', 0.7))
        high_risk = recommendation_engine.get_high_risk_recommendations(threshold)
        
        return jsonify({
            'success': True,
            'data': high_risk.to_dict('records') if not high_risk.empty else []
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/recommendations/budget', methods=['GET'])
def get_budget_recommendations():
    """Get budget optimization recommendations"""
    try:
        ministry = request.args.get('ministry')
        recommendations = recommendation_engine.get_budget_recommendations(ministry)
        
        # Convert DataFrames to dict
        for key in ['best_efficiency', 'worst_efficiency']:
            if isinstance(recommendations[key], pd.DataFrame):
                recommendations[key] = recommendations[key].to_dict('records')
        
        return jsonify({
            'success': True,
            'data': recommendations
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/recommendations/mitigation/<project_id>', methods=['GET'])
def get_mitigation_recommendations(project_id):
    """Get risk mitigation recommendations"""
    try:
        recommendations = recommendation_engine.get_risk_mitigation_recommendations(project_id)
        
        return jsonify({
            'success': True,
            'data': recommendations
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/dashboard/summary', methods=['GET'])
def get_dashboard_summary():
    """Get summary statistics for dashboard"""
    try:
        df = recommendation_engine.projects_df
        
        if df is None:
            return jsonify({'error': 'No data available'}), 404
        
        summary = {
            'total_projects': len(df),
            'status_counts': df['status'].value_counts().to_dict(),
            'ministry_counts': df['ministry'].value_counts().head(10).to_dict(),
            'priority_counts': df['priority'].value_counts().to_dict(),
            'total_budget': float(df['budget'].sum()),
            'avg_budget': float(df['budget'].mean()),
            'avg_duration': int(df['project_duration_days'].mean()),
            'completion_rate': float(
                (df['status'] == 'Completed').sum() / len(df) * 100
            )
        }
        
        return jsonify({
            'success': True,
            'data': summary
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)