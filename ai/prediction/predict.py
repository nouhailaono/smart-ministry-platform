# ai/predictor.py - Updated with better error handling

import pandas as pd
import numpy as np
import joblib
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import sys
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RiskPredictor:
    """XGBoost Risk Predictor for Digital Transformation Projects"""
    
    def __init__(self, model_dir: str = 'models'):
        """Initialize the predictor with trained models."""
        self.model_dir = Path(model_dir)
        self.model = None
        self.preprocessor = None
        self.label_encoder = None
        self.feature_names = None
        self.scaler = None
        
        self._load_artifacts()
        logger.info("✅ RiskPredictor initialized successfully")
    
    def _load_artifacts(self):
        """Load all trained artifacts."""
        try:
            # Load model
            model_path = self.model_dir / 'risk_model.joblib'
            if model_path.exists():
                self.model = joblib.load(model_path)
                logger.info(f"✅ Model loaded: {type(self.model).__name__}")
            else:
                logger.error(f"❌ Model not found at {model_path}")
                raise FileNotFoundError(f"Model not found at {model_path}")
            
            # Load preprocessor
            preprocessor_path = self.model_dir / 'preprocessor.joblib'
            if preprocessor_path.exists():
                self.preprocessor = joblib.load(preprocessor_path)
                logger.info("✅ Preprocessor loaded")
            
            # Load label encoder
            label_path = self.model_dir / 'label_encoder.joblib'
            if label_path.exists():
                self.label_encoder = joblib.load(label_path)
                logger.info(f"✅ Label encoder loaded: {list(self.label_encoder.classes_)}")
            
            # Load feature names
            features_path = self.model_dir / 'feature_names.json'
            if features_path.exists():
                with open(features_path, 'r') as f:
                    self.feature_names = json.load(f)
                logger.info(f"✅ Feature names loaded: {len(self.feature_names)} features")
            
            # Load scaler if exists
            scaler_path = self.model_dir / 'scaler.joblib'
            if scaler_path.exists():
                self.scaler = joblib.load(scaler_path)
                logger.info("✅ Scaler loaded")
                
        except Exception as e:
            logger.error(f"❌ Error loading artifacts: {e}")
            logger.error(traceback.format_exc())
            raise
    
    def _engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Apply feature engineering to match training."""
        df = df.copy()
        
        try:
            # Digital maturity index
            if all(col in df.columns for col in ['digital_skill_score', 'digital_maturity', 'interoperability_score']):
                df['digital_maturity_index'] = (
                    df['digital_skill_score'] * 0.4 +
                    df['digital_maturity'] * 100 * 0.3 +
                    df['interoperability_score'] * 0.3
                ) / 100
            
            # AI readiness score
            if 'ai_component' in df.columns and 'ai_maturity' in df.columns and 'digital_skill_score' in df.columns:
                df['ai_readiness'] = np.where(
                    df['ai_component'] == 'Yes',
                    (df['ai_maturity'] * 0.5 + (df['digital_skill_score']/100) * 0.5),
                    0
                )
            
            # Team capability score
            if all(col in df.columns for col in ['team_size', 'senior_developers', 'vendor_experience', 'digital_skill_score']):
                df['team_capability'] = (
                    (df['senior_developers'] / df['team_size'].clip(lower=1)) * 0.4 +
                    (df['vendor_experience'] / 5) * 0.3 +
                    (df['digital_skill_score'] / 100) * 0.3
                )
            
            # Integration burden
            if 'api_count' in df.columns and 'legacy_systems' in df.columns:
                df['integration_burden'] = (df['api_count'] / 50) * (df['legacy_systems'] / 30)
                df['integration_burden'] = df['integration_burden'].clip(0, 1)
            
            # Security maturity
            if 'security_audit_score' in df.columns and 'cybersecurity_level' in df.columns:
                security_map = {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3}
                df['security_maturity'] = df['security_audit_score'] / 100 * 0.7 + \
                                          df['cybersecurity_level'].map(security_map).fillna(0) / 3 * 0.3
            
            # Quality score
            if all(col in df.columns for col in ['testing_coverage', 'compliance_score', 'audit_findings']):
                df['quality_score'] = (
                    (df['testing_coverage'] / 100) * 0.4 +
                    (df['compliance_score'] / 100) * 0.4 +
                    (1 - np.minimum(df['audit_findings'] / 10, 1)) * 0.2
                )
            
            # Complexity score
            if 'software_complexity' in df.columns:
                complexity_map = {'Low': 0, 'Medium': 1, 'High': 2, 'Very High': 3}
                df['complexity_score'] = df['software_complexity'].map(complexity_map).fillna(0) / 3
            
            # Total delay
            if all(col in df.columns for col in ['procurement_delay_days', 'approval_delay_days']):
                df['total_delay_days'] = df['procurement_delay_days'] + df['approval_delay_days']
            
            # Budget efficiency
            if 'planned_budget_mad' in df.columns and 'budget_sufficiency' in df.columns:
                df['budget_efficiency'] = df['budget_sufficiency'] / (1 + df['planned_budget_mad'] / 100_000_000)
                df['budget_efficiency'] = df['budget_efficiency'].clip(0, 1)
            
            # Citizen engagement
            if all(col in df.columns for col in ['citizen_users', 'digital_adoption_rate', 'expected_transactions']):
                df['citizen_engagement'] = (
                    np.log1p(df['citizen_users'].clip(lower=1)) / np.log1p(20_000_000) * 0.4 +
                    df['digital_adoption_rate'] * 0.3 +
                    np.log1p(df['expected_transactions'].clip(lower=1)) / np.log1p(5_000_000) * 0.3
                )
            
        except Exception as e:
            logger.warning(f"Feature engineering error: {e}")
            logger.warning(traceback.format_exc())
        
        return df
    
    def _encode_ordinal_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Encode ordinal categorical columns."""
        ordinal_mappings = {
            'software_complexity': {'Low': 0, 'Medium': 1, 'High': 2, 'Very High': 3},
            'integration_complexity': {'Low': 0, 'Medium': 1, 'High': 2, 'Very High': 3},
            'project_priority': {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3},
            'strategic_importance': {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3},
            'cybersecurity_level': {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3},
            'scrum_maturity': {'Low': 0, 'Medium': 1, 'High': 2},
            'chatbot_usage': {'Low': 0, 'Medium': 1, 'High': 2},
        }
        
        df = df.copy()
        for col, mapping in ordinal_mappings.items():
            if col in df.columns:
                df[col + '_ordinal'] = df[col].map(mapping).fillna(0).astype(int)
            else:
                df[col + '_ordinal'] = 0
        
        return df
    
    def preprocess_input(self, input_data: Dict[str, Any]) -> np.ndarray:
        """Preprocess input data for prediction."""
        try:
            # Convert to DataFrame
            df = pd.DataFrame([input_data])
            logger.info(f"Input DataFrame shape: {df.shape}")
            logger.info(f"Input columns: {df.columns.tolist()}")
            
            # Apply feature engineering
            df = self._engineer_features(df)
            logger.info(f"After feature engineering shape: {df.shape}")
            
            # Encode ordinal columns
            df = self._encode_ordinal_columns(df)
            logger.info(f"After ordinal encoding shape: {df.shape}")
            
            # Apply preprocessor if available
            if self.preprocessor is not None:
                try:
                    processed = self.preprocessor.transform(df)
                    if hasattr(processed, 'toarray'):
                        processed = processed.toarray()
                    logger.info(f"After preprocessing shape: {processed.shape}")
                    return processed
                except Exception as e:
                    logger.error(f"Preprocessor error: {e}")
                    logger.error(traceback.format_exc())
                    
                    # Fallback: use raw values
                    logger.warning("Using fallback: raw values")
                    return df.values
            
            return df.values
            
        except Exception as e:
            logger.error(f"Preprocessing error: {e}")
            logger.error(traceback.format_exc())
            raise
    
    def predict(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Make a prediction with explanation."""
        try:
            logger.info("="*50)
            logger.info("🔍 Starting prediction")
            logger.info(f"Input data keys: {list(input_data.keys())}")
            
            # Preprocess input
            processed_data = self.preprocess_input(input_data)
            logger.info(f"Processed data shape: {processed_data.shape}")
            
            # Make prediction
            prediction_proba = self.model.predict_proba(processed_data)[0]
            prediction = self.model.predict(processed_data)[0]
            logger.info(f"Prediction: {prediction}")
            logger.info(f"Prediction probabilities: {prediction_proba}")
            
            # Decode risk level
            if self.label_encoder is not None:
                risk_levels = self.label_encoder.classes_
                predicted_risk = risk_levels[prediction]
            else:
                risk_levels = ['Low', 'Medium', 'High']
                predicted_risk = risk_levels[prediction]
            
            logger.info(f"Predicted risk: {predicted_risk}")
            
            # Calculate risk score
            high_risk_idx = list(risk_levels).index('High') if 'High' in risk_levels else 2
            risk_score = prediction_proba[high_risk_idx] * 100
            success_probability = 100 - risk_score
            
            # Get SHAP values if available
            shap_values = None
            try:
                import shap
                explainer = shap.TreeExplainer(self.model)
                shap_values = explainer.shap_values(processed_data)
                logger.info("SHAP values computed successfully")
            except Exception as e:
                logger.warning(f"SHAP computation failed: {e}")
            
            # Prepare response
            result = {
                'prediction': predicted_risk,
                'risk_score': float(risk_score),
                'success_probability': float(success_probability),
                'confidence': float(max(prediction_proba)),
                'risk_probabilities': {
                    risk_levels[i]: float(prob) for i, prob in enumerate(prediction_proba)
                },
                'risk_level': predicted_risk,
                'estimated_budget_overrun': self._estimate_budget_overrun(input_data, predicted_risk),
                'estimated_delay': self._estimate_delay(input_data, predicted_risk),
            }
            
            # Add SHAP explanation if available
            if shap_values is not None:
                result['top_features'] = self._get_top_features(shap_values, processed_data, prediction)
                result['shap_values'] = shap_values.tolist() if hasattr(shap_values, 'tolist') else None
            
            # Add recommendations
            result['recommendations'] = self._generate_recommendations(input_data, predicted_risk)
            
            logger.info("✅ Prediction completed successfully")
            logger.info("="*50)
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Prediction error: {e}")
            logger.error(traceback.format_exc())
            raise
    
    def _get_top_features(self, shap_values, processed_data, prediction):
        """Extract top features from SHAP values."""
        try:
            # Handle different SHAP output formats
            if isinstance(shap_values, list):
                shap_vals = shap_values[prediction][0]
            elif len(shap_values.shape) == 3:
                shap_vals = shap_values[0, :, prediction]
            else:
                shap_vals = shap_values[0]
            
            # Get feature names
            feature_names = self.feature_names if self.feature_names else [f"feature_{i}" for i in range(len(shap_vals))]
            
            # Create feature importance list
            features = []
            for i, (name, value) in enumerate(zip(feature_names, shap_vals)):
                features.append({
                    'feature': name,
                    'impact': 'increases' if value > 0 else 'decreases',
                    'value': float(value)
                })
            
            # Sort by absolute impact
            features.sort(key=lambda x: abs(x['value']), reverse=True)
            
            return features[:10]
            
        except Exception as e:
            logger.warning(f"Error extracting top features: {e}")
            return []
    
    def _estimate_budget_overrun(self, input_data: Dict, risk_level: str) -> float:
        """Estimate budget overrun based on risk level."""
        base_overrun = {
            'Low': 0.05,
            'Medium': 0.15,
            'High': 0.30
        }
        return base_overrun.get(risk_level, 0.15) * 100
    
    def _estimate_delay(self, input_data: Dict, risk_level: str) -> float:
        """Estimate project delay based on risk level."""
        base_delay = {
            'Low': 5,
            'Medium': 15,
            'High': 30
        }
        return base_delay.get(risk_level, 15)
    
    def _generate_recommendations(self, input_data: Dict, risk_level: str) -> List[str]:
        """Generate recommendations based on risk level and input data."""
        recommendations = []
        
        if risk_level == 'High':
            recommendations.append("🔴 Immediate intervention required. Review all risk factors.")
            recommendations.append("Develop comprehensive risk mitigation strategy.")
            recommendations.append("Engage senior management for oversight.")
        
        elif risk_level == 'Medium':
            recommendations.append("⚠️ Implement risk mitigation strategies.")
            recommendations.append("Enhance monitoring and reporting.")
            recommendations.append("Conduct regular risk reviews.")
        
        else:
            recommendations.append("✅ Maintain current trajectory.")
            recommendations.append("Continue monitoring key metrics.")
            recommendations.append("Document lessons learned.")
        
        # Add specific recommendations based on input data
        if input_data.get('testing_coverage', 0) < 70:
            recommendations.append("Increase testing coverage to at least 85%")
        
        if input_data.get('vendor_experience', 0) < 3:
            recommendations.append("Consider vendor with stronger experience")
        
        if input_data.get('digital_skill_score', 0) < 70:
            recommendations.append("Launch digital skills development program")
        
        if input_data.get('integration_complexity') == 'High' or input_data.get('integration_complexity') == 'Very High':
            recommendations.append("Conduct integration architecture review")
        
        if input_data.get('legacy_systems', 0) > 10:
            recommendations.append("Develop legacy system migration roadmap")
        
        if input_data.get('security_audit_score', 0) < 80:
            recommendations.append("Perform comprehensive security audit")
        
        return recommendations[:5]  # Return top 5 recommendations


def create_app():
    """Create Flask app with prediction endpoint."""
    from flask import Flask, request, jsonify
    from flask_cors import CORS
    
    app = Flask(__name__)
    CORS(app)
    
    # Initialize predictor
    predictor = RiskPredictor(model_dir='models')
    
    @app.route('/health', methods=['GET'])
    def health():
        """Health check endpoint."""
        return jsonify({
            'status': 'healthy',
            'model_loaded': predictor.model is not None
        })
    
    @app.route('/model-info', methods=['GET'])
    def model_info():
        """Get model information."""
        return jsonify({
            'model_type': type(predictor.model).__name__ if predictor.model else None,
            'feature_count': len(predictor.feature_names) if predictor.feature_names else 0,
            'classes': list(predictor.label_encoder.classes_) if predictor.label_encoder else ['Low', 'Medium', 'High']
        })
    
    @app.route('/predict', methods=['POST'])
    def predict():
        """Prediction endpoint."""
        try:
            # Get input data
            data = request.get_json()
            
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            logger.info(f"Received prediction request with {len(data)} fields")
            
            # Make prediction
            result = predictor.predict(data)
            
            return jsonify(result)
            
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            logger.error(traceback.format_exc())
            return jsonify({
                'error': str(e),
                'detail': traceback.format_exc()
            }), 500
    
    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=8000, debug=True)