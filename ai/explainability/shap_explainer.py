

import shap
import pandas as pd
import numpy as np
import joblib
import json
from pathlib import Path
import matplotlib.pyplot as plt
from typing import Dict, List, Optional, Union, Any
import warnings
from functools import lru_cache
from collections import OrderedDict
import logging

warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ===============================
# JSON ENCODER - Handle numpy types
# ===============================
class NumpyEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles numpy types."""
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, np.bool_):
            return bool(obj)
        if hasattr(obj, 'item'):  # For numpy scalar types
            return obj.item()
        return super().default(obj)


# ===============================
# FEATURE LABELS - Human-readable names
# ===============================
FEATURE_LABELS = {
    # Technical Features
    "software_complexity": "Software Complexity",
    "integration_complexity": "Integration Complexity",
    "api_count": "API Count",
    "legacy_systems": "Legacy Systems",
    "interoperability_score": "Interoperability",
    "cloud_migration": "Cloud Migration",
    "microservices": "Microservices",

    # AI Features
    "ai_component": "AI Component",
    "ai_maturity": "AI Maturity",
    "ai_readiness": "AI Readiness",

    # Security Features
    "cybersecurity_level": "Cybersecurity Level",
    "security_audit_score": "Security Score",
    "security_maturity": "Security Maturity",
    "encryption_level": "Encryption Level",
    "gdpr_compliance": "GDPR Compliance",
    "iso27001": "ISO27001",
    "penetration_testing": "Penetration Testing",
    "vulnerabilities_found": "Vulnerabilities",

    # Team Features
    "team_size": "Team Size",
    "senior_developers": "Senior Developers",
    "vendor_experience": "Vendor Experience",
    "digital_skill_score": "Digital Skills",
    "staff_turnover": "Staff Turnover",
    "team_capability": "Team Capability",
    "scrum_maturity": "Scrum Maturity",

    # Quality Features
    "testing_coverage": "Testing Coverage",
    "compliance_score": "Compliance Score",
    "audit_findings": "Audit Findings",
    "quality_score": "Quality Score",

    # Citizen Impact
    "citizen_users": "Citizen Users",
    "digital_adoption_rate": "Digital Adoption",
    "citizen_complaints": "Citizen Complaints",
    "system_availability_target": "System Availability",
    "citizen_engagement": "Citizen Engagement",

    # Financial & Timeline
    "planned_budget_mad": "Planned Budget",
    "budget_sufficiency": "Budget Sufficiency",
    "budget_efficiency": "Budget Efficiency",
    "planned_duration_days": "Planned Duration",
    "procurement_delay_days": "Procurement Delay",
    "approval_delay_days": "Approval Delay",
    "total_delay_days": "Total Delay",

    # Digital Maturity
    "digital_maturity": "Digital Maturity",
    "digital_maturity_index": "Digital Maturity Index",
    "complexity_score": "Complexity Score",
    "integration_burden": "Integration Burden",

    # Other
    "user_training": "User Training",
    "change_requests": "Change Requests",
    "chatbot_usage": "Chatbot Usage",
    "funding_source": "Funding Source",
    "project_priority": "Project Priority",
    "strategic_importance": "Strategic Importance",
}

CATEGORY_LABELS = {
    'ai_component': {'Yes': 'AI Enabled', 'No': 'No AI'},
    'cloud_migration': {'Yes': 'Cloud Native', 'No': 'On-Premise', 'Hybrid': 'Hybrid Cloud'},
    'gdpr_compliance': {'Yes': 'GDPR Compliant', 'No': 'Non-Compliant'},
    'iso27001': {'Yes': 'ISO27001 Certified', 'No': 'Not Certified'},
    'penetration_testing': {'Yes': 'Tested', 'No': 'Not Tested'},
    'microservices': {'Yes': 'Microservices', 'No': 'Monolithic'},
    'cybersecurity_level': {'Low': 'Low Security', 'Medium': 'Medium Security', 'High': 'High Security', 'Critical': 'Critical Security'},
    'encryption_level': {'None': 'No Encryption', 'Basic': 'Basic Encryption', 'Strong': 'Strong Encryption', 'Military Grade': 'Military Grade Encryption'},
    'scrum_maturity': {'Low': 'Low Agile Maturity', 'Medium': 'Medium Agile Maturity', 'High': 'High Agile Maturity'},
    'chatbot_usage': {'Low': 'Low Usage', 'Medium': 'Medium Usage', 'High': 'High Usage'},
    'software_complexity': {'Low': 'Low Complexity', 'Medium': 'Medium Complexity', 'High': 'High Complexity', 'Very High': 'Very High Complexity'},
    'integration_complexity': {'Low': 'Low Integration', 'Medium': 'Medium Integration', 'High': 'High Integration', 'Very High': 'Very High Integration'},
    'project_priority': {'Low': 'Low Priority', 'Medium': 'Medium Priority', 'High': 'High Priority', 'Critical': 'Critical Priority'},
    'strategic_importance': {'Low': 'Low Strategic', 'Medium': 'Medium Strategic', 'High': 'High Strategic', 'Critical': 'Critical Strategic'},
    'funding_source': {'National Budget': 'National Budget', 'International Grant': 'International Grant',
                      'Public-Private Partnership': 'Public-Private Partnership', 'Mixed': 'Mixed Funding'},
}

# Ordinal mappings for consistent encoding.
# NOTE: these must match ORDINAL_COLUMNS in train_model.py exactly, since these
# features are ordinal-ONLY in the trained model (not also one-hot encoded).
ORDINAL_MAPPINGS = {
    'software_complexity': {'Low': 0, 'Medium': 1, 'High': 2, 'Very High': 3},
    'integration_complexity': {'Low': 0, 'Medium': 1, 'High': 2, 'Very High': 3},
    'project_priority': {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3},
    'strategic_importance': {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3},
    'cybersecurity_level': {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3},
    'scrum_maturity': {'Low': 0, 'Medium': 1, 'High': 2},
    'chatbot_usage': {'Low': 0, 'Medium': 1, 'High': 2},
}


@lru_cache(maxsize=256)
def _feature_label_lookup(feature_name: str) -> str:
    clean_name = feature_name.replace('_ordinal', '')

    if '_' in clean_name and any(cat in clean_name for cat in ['_Low', '_Medium', '_High', '_Critical', '_Yes', '_No']):
        parts = clean_name.rsplit('_', 1)
        base_name, category = parts[0], parts[1]

        base_label = FEATURE_LABELS.get(base_name, base_name)

        if base_name in CATEGORY_LABELS and category in CATEGORY_LABELS[base_name]:
            return f"{base_label}: {CATEGORY_LABELS[base_name][category]}"
        return f"{base_label}: {category}"

    return FEATURE_LABELS.get(clean_name, clean_name)


class RiskExplainer:
    """Optimized SHAP explainer for digital transformation risk analysis."""

    def __init__(self, model_dir: str = 'models', cache_size: int = 128):
        """
        Initialize explainer with pre-computed artifacts.

        Args:
            model_dir: Directory containing model artifacts
            cache_size: Max number of predictions to keep in the LRU prediction cache
        """
        self.model_dir = Path(model_dir)
        self.cache_size = cache_size

        # Initialize attributes
        self.model = None
        self.preprocessor = None
        self.label_encoder = None
        self.feature_names = None
        self.shap_data = None
        self.explainer = None
        self.current_input = {}
        self.risk_levels = ['Low', 'Medium', 'High']

        # Load artifacts and setup
        self._load_artifacts()
        self._setup_explainer()

        # Bounded LRU cache for predictions (bounded by self.cache_size, see
        # _cache_get / _cache_put below).
        self._prediction_cache: "OrderedDict[str, Dict]" = OrderedDict()

    def _load_artifacts(self) -> None:
        """Load all saved artifacts from training pipeline."""
        logger.info("Loading training artifacts...")

        # Load model
        model_path = self.model_dir / 'risk_model.joblib'
        if not model_path.exists():
            raise FileNotFoundError(f"Model not found at {model_path}")
        self.model = joblib.load(model_path)
        logger.info(f"✅ Model loaded: {type(self.model).__name__}")

        # Load preprocessor
        preprocessor_path = self.model_dir / 'preprocessor.joblib'
        if preprocessor_path.exists():
            self.preprocessor = joblib.load(preprocessor_path)
            logger.info("✅ Preprocessor loaded")

        # Load label encoder
        label_path = self.model_dir / 'label_encoder.joblib'
        if label_path.exists():
            self.label_encoder = joblib.load(label_path)
            self.risk_levels = list(self.label_encoder.classes_)
            logger.info(f"✅ Label encoder loaded: {self.risk_levels}")

        # Load feature names
        features_path = self.model_dir / 'feature_names.json'
        if features_path.exists():
            with open(features_path, 'r') as f:
                self.feature_names = json.load(f)
            logger.info(f"✅ Feature names loaded: {len(self.feature_names)} features")

        # Load SHAP values
        shap_path = self.model_dir / 'shap_values.joblib'
        if shap_path.exists():
            self.shap_data = joblib.load(shap_path)
            logger.info(f"✅ Pre-computed SHAP values loaded: {len(self.shap_data['sample'])} samples")

    def _setup_explainer(self) -> None:
        """Setup the SHAP explainer using the loaded model."""
        logger.info("Setting up SHAP explainer...")

        try:
            self.explainer = shap.TreeExplainer(self.model)
            logger.info(f"✅ TreeExplainer created for {type(self.model).__name__}")
        except Exception as e:
            logger.error(f"❌ Could not create explainer: {e}")
            raise

    def _get_feature_label(self, feature_name: str) -> str:
        """Get human-readable label for a feature, via the module-level cache."""
        return _feature_label_lookup(feature_name)

    def _get_feature_value(self, input_data: Dict, feature_name: str) -> str:
        """Extract the actual value of a feature from input data."""
        clean_name = feature_name.replace('_ordinal', '')

        # Check for categorical feature
        if '_' in clean_name and any(cat in clean_name for cat in ['_Low', '_Medium', '_High', '_Critical', '_Yes', '_No']):
            parts = clean_name.rsplit('_', 1)
            base_name = parts[0]

            if base_name in input_data:
                return str(input_data[base_name])

        # Regular feature
        if clean_name in input_data:
            value = input_data[clean_name]
            return f"{value:.2f}" if isinstance(value, float) else str(value)

        return "N/A"

    def _encode_ordinal_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Encode ordinal categorical columns efficiently."""
        df = df.copy()

        for col, mapping in ORDINAL_MAPPINGS.items():
            if col in df.columns:
                df[f'{col}_ordinal'] = df[col].map(mapping).fillna(0).astype(int)
            else:
                df[f'{col}_ordinal'] = 0

        return df

    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Apply feature engineering matching train_model.py."""
        df = df.copy()

        # Digital maturity index
        if all(col in df.columns for col in ['digital_skill_score', 'digital_maturity', 'interoperability_score']):
            df['digital_maturity_index'] = (
                df['digital_skill_score'] * 0.4 +
                df['digital_maturity'] * 100 * 0.3 +
                df['interoperability_score'] * 0.3
            ) / 100

        # AI readiness score
        if all(col in df.columns for col in ['ai_component', 'ai_maturity', 'digital_skill_score']):
            df['ai_readiness'] = np.where(
                df['ai_component'] == 'Yes',
                (df['ai_maturity'] * 0.5 + (df['digital_skill_score'] / 100) * 0.5),
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
        if all(col in df.columns for col in ['api_count', 'legacy_systems']):
            df['integration_burden'] = (df['api_count'] / 50) * (df['legacy_systems'] / 30)
            df['integration_burden'] = df['integration_burden'].clip(0, 1)

        # Security maturity
        if all(col in df.columns for col in ['security_audit_score', 'cybersecurity_level']):
            security_map = {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3}
            df['security_maturity'] = df['security_audit_score'] / 100 * 0.7 + \
                                      df['cybersecurity_level'].map(security_map).fillna(0) / 3 * 0.3

        # Citizen engagement
        if all(col in df.columns for col in ['citizen_users', 'digital_adoption_rate', 'expected_transactions']):
            df['citizen_engagement'] = (
                np.log1p(df['citizen_users'].clip(lower=1)) / np.log1p(20_000_000) * 0.4 +
                df['digital_adoption_rate'] * 0.3 +
                np.log1p(df['expected_transactions'].clip(lower=1)) / np.log1p(5_000_000) * 0.3
            )

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
        if all(col in df.columns for col in ['planned_budget_mad', 'budget_sufficiency']):
            df['budget_efficiency'] = df['budget_sufficiency'] / (1 + df['planned_budget_mad'] / 100_000_000)
            df['budget_efficiency'] = df['budget_efficiency'].clip(0, 1)

        # Cloud migration flag
        if 'cloud_provider' in df.columns:
            df['cloud_migration'] = np.where(df['cloud_provider'] != 'On-Premise', 'Yes', 'No')

        return df

    def preprocess_input(self, input_data: Union[Dict, pd.DataFrame]) -> np.ndarray:
        """Preprocess a single input for prediction.

        NOTE: the raw string versions of ordinal columns (software_complexity, etc.)
        are intentionally left in the frame here even after adding '_ordinal' columns;
        the fitted preprocessor's ColumnTransformer only reads the columns it was fit
        on (its one-hot list no longer includes these, per train_model.py), so extra
        columns are harmless passthrough-ignored input, not a second encoding path.
        """
        if isinstance(input_data, dict):
            input_df = pd.DataFrame([input_data])
            self.current_input = input_data
        elif isinstance(input_data, pd.DataFrame):
            input_df = input_data
            self.current_input = input_data.iloc[0].to_dict()
        else:
            raise ValueError("Input must be dict or DataFrame")

        # Apply feature engineering and encoding
        input_df = self.engineer_features(input_df)
        input_df = self._encode_ordinal_columns(input_df)

        # Apply preprocessing
        if self.preprocessor is not None:
            try:
                processed = self.preprocessor.transform(input_df)
                if hasattr(processed, 'toarray'):
                    processed = processed.toarray()
                return processed
            except ValueError as e:
                logger.error(f"Preprocessing error: {e}")
                raise
        else:
            return input_df.values

    def _extract_shap_values_for_class(self, shap_values, predicted_class_idx: int,
                                       feature_names: List[str]) -> np.ndarray:
        """Extract SHAP values for the predicted class."""
        values = shap_values.values if hasattr(shap_values, "values") else shap_values

        if isinstance(values, list):
            shap_values_pred = values[predicted_class_idx][0] if len(values[predicted_class_idx]) > 0 else values[predicted_class_idx]
        elif isinstance(values, np.ndarray):
            if values.ndim == 3:
                if values.shape[1] == len(feature_names):
                    shap_values_pred = values[0, :, predicted_class_idx]
                elif values.shape[2] == len(feature_names):
                    shap_values_pred = values[0, predicted_class_idx, :]
                else:
                    raise ValueError(f"Unexpected SHAP shape {values.shape}")
            elif values.ndim == 2:
                shap_values_pred = values[0] if values.shape[0] > 1 else values
            else:
                raise ValueError(f"Unsupported SHAP array shape {values.shape}")
        else:
            raise ValueError(f"Unsupported SHAP output type: {type(values)}")

        # Flatten if needed
        if isinstance(shap_values_pred, np.ndarray) and len(shap_values_pred.shape) > 1:
            shap_values_pred = shap_values_pred.flatten()

        # Fix shape if needed
        if len(shap_values_pred) != len(feature_names):
            if len(shap_values_pred) == len(feature_names) * 3:
                shap_values_pred = shap_values_pred[predicted_class_idx * len(feature_names):(predicted_class_idx + 1) * len(feature_names)]

        return shap_values_pred

    def get_risk_breakdown(self, contributions: List[Dict], predicted_risk: str) -> List[Dict]:
        """Generate risk breakdown with percentage contributions."""
        breakdown = []

        # Calculate totals - use shap_value key
        total_positive = sum(c['shap_value'] for c in contributions if c['shap_value'] > 0)
        total_negative = abs(sum(c['shap_value'] for c in contributions if c['shap_value'] < 0))
        total_impact = total_positive + total_negative

        for c in contributions[:10]:
            if total_impact > 0:
                percentage = (abs(c['shap_value']) / total_impact) * 100
            else:
                percentage = 0

            breakdown.append({
                'feature': c['feature_label'],
                'value': float(c['shap_value']),
                'percentage': float(percentage),
                'sign': '+' if c['shap_value'] > 0 else '-',
                'impact': c['impact'],
                'icon': c['icon']
            })

        return breakdown

    def get_recommendations(self, contributions: List[Dict], predicted_risk: str) -> List[Dict]:
        """Generate actionable recommendations based on risk drivers."""
        recommendations = []

        # Risk driver mapping
        recommendation_map = {
            'legacy_systems': {
                'High': {'priority': 'Critical', 'action': 'Develop legacy system migration roadmap',
                        'details': 'Reduce dependency on legacy systems to improve integration and security'},
                'Medium': {'priority': 'High', 'action': 'Begin legacy system modernization planning',
                          'details': 'Create a phased approach to reduce technical debt'}
            },
            'testing_coverage': {
                'High': {'priority': 'Critical', 'action': 'Increase testing coverage to at least 85%',
                        'details': 'Implement automated testing and CI/CD pipelines'},
                'Medium': {'priority': 'High', 'action': 'Improve testing coverage to 75%',
                          'details': 'Add unit and integration tests for critical components'}
            },
            'integration_complexity': {
                'High': {'priority': 'Critical', 'action': 'Conduct integration architecture review',
                        'details': 'Simplify integration patterns and reduce API coupling'},
                'Medium': {'priority': 'High', 'action': 'Standardize API design and documentation',
                          'details': 'Implement API governance and versioning'}
            },
            'security_audit_score': {
                'High': {'priority': 'Critical', 'action': 'Perform comprehensive security audit',
                        'details': 'Address vulnerabilities and implement security best practices'},
                'Medium': {'priority': 'High', 'action': 'Conduct security assessment',
                          'details': 'Identify and remediate security gaps'}
            },
            'vendor_experience': {
                'High': {'priority': 'High', 'action': 'Review vendor selection and engagement model',
                        'details': 'Consider vendor with stronger digital transformation experience'},
                'Medium': {'priority': 'Medium', 'action': 'Provide additional vendor support and oversight',
                          'details': 'Assign experienced project manager to work with vendor'}
            },
            'digital_skill_score': {
                'High': {'priority': 'Critical', 'action': 'Launch digital skills development program',
                        'details': 'Provide training in cloud, AI, and agile methodologies'},
                'Medium': {'priority': 'High', 'action': 'Implement upskilling initiatives',
                          'details': 'Focus on critical skills gaps identified in assessment'}
            },
            'digital_maturity': {
                'High': {'priority': 'High', 'action': 'Develop digital maturity roadmap',
                        'details': 'Identify specific areas for digital capability improvement'},
                'Medium': {'priority': 'Medium', 'action': 'Enhance digital culture and practices',
                          'details': 'Promote digital-first mindset and agile adoption'}
            }
        }

        # Check top contributors that oppose the prediction
        for c in contributions[:15]:
            if c['impact'] == 'opposes':
                for feature_key, rec_map in recommendation_map.items():
                    if feature_key in c['feature'].lower():
                        rec = rec_map.get(predicted_risk, rec_map.get('Medium'))
                        if rec:
                            recommendations.append({
                                'priority': rec['priority'],
                                'action': rec['action'],
                                'details': rec['details'],
                                'feature': c['feature_label']
                            })
                        break

        # Add general recommendations if needed
        if len(recommendations) < 3:
            if predicted_risk == 'High':
                recommendations.extend([
                    {'priority': 'Critical', 'action': 'Conduct detailed risk review',
                     'details': 'Engage senior management and develop mitigation strategies', 'feature': 'General'},
                    {'priority': 'High', 'action': 'Develop contingency plan',
                     'details': 'Prepare for potential delays and budget overruns', 'feature': 'General'}
                ])
            elif predicted_risk == 'Medium':
                recommendations.append({
                    'priority': 'Medium', 'action': 'Implement enhanced monitoring',
                    'details': 'Track key risk indicators and escalate when thresholds exceeded', 'feature': 'General'
                })

        # Remove duplicates
        unique_recommendations = []
        seen_actions = set()
        for rec in recommendations:
            if rec['action'] not in seen_actions:
                unique_recommendations.append(rec)
                seen_actions.add(rec['action'])

        return unique_recommendations[:5]

    def _convert_to_serializable(self, obj: Any) -> Any:
        """Convert numpy types to Python native types for JSON serialization."""
        if isinstance(obj, dict):
            return {k: self._convert_to_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_to_serializable(item) for item in obj]
        elif isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, np.bool_):
            return bool(obj)
        elif hasattr(obj, 'item'):
            try:
                return obj.item()
            except Exception:
                return str(obj)
        else:
            return obj

    def _cache_get(self, key: str) -> Optional[Dict]:
        """LRU-style get: touching a key moves it to the most-recently-used end."""
        if key not in self._prediction_cache:
            return None
        self._prediction_cache.move_to_end(key)
        return self._prediction_cache[key]

    def _cache_put(self, key: str, value: Dict) -> None:
        """LRU-style put: evicts the oldest entry once cache_size is exceeded."""
        self._prediction_cache[key] = value
        self._prediction_cache.move_to_end(key)
        while len(self._prediction_cache) > self.cache_size:
            self._prediction_cache.popitem(last=False)

    def explain_prediction(self, input_data: Union[Dict, pd.DataFrame],
                          top_n: int = 10) -> Dict[str, Any]:
        """Explain a single prediction with SHAP values."""
        # Check cache
        cache_key = str(input_data) if isinstance(input_data, dict) else str(input_data.to_dict())
        cached = self._cache_get(cache_key)
        if cached is not None:
            logger.info("Returning cached explanation")
            return cached

        # Preprocess input
        processed_data = self.preprocess_input(input_data)

        # Get prediction
        prediction_proba = self.model.predict_proba(processed_data)[0]
        prediction = self.model.predict(processed_data)[0]

        # Decode risk level
        predicted_risk = self.risk_levels[prediction]

        # Get SHAP values
        try:
            explanation = self.explainer(processed_data)
            shap_values = explanation.values
        except Exception as e:
            logger.warning(f"SHAP explanation failed: {e}, using fallback")
            shap_values = self.explainer.shap_values(processed_data)

        # Get feature contributions
        predicted_class_idx = self.risk_levels.index(predicted_risk)
        shap_values_pred = self._extract_shap_values_for_class(
            shap_values, predicted_class_idx, self.feature_names
        )

        # Create contributions with feature values
        contributions = []
        for i, (name, value) in enumerate(zip(self.feature_names, shap_values_pred)):
            is_supporting = value > 0
            contributions.append({
                'feature': name,
                'feature_label': self._get_feature_label(name),
                'feature_value': self._get_feature_value(self.current_input, name),
                'shap_value': float(value),
                'impact': 'supports' if is_supporting else 'opposes',
                'impact_type': 'positive' if is_supporting else 'negative',
                'icon': '✅' if is_supporting else '⚠️'
            })

        # Sort by absolute impact
        contributions.sort(key=lambda x: abs(x['shap_value']), reverse=True)

        # Calculate risk score
        high_risk_idx = self.risk_levels.index('High') if 'High' in self.risk_levels else 2
        risk_score = prediction_proba[high_risk_idx] * 100
        success_probability = 100 - risk_score

        # Generate risk breakdown and recommendations
        risk_breakdown = self.get_risk_breakdown(contributions[:10], predicted_risk)
        recommendations = self.get_recommendations(contributions, predicted_risk)

        # Prepare result
        result = {
            'prediction': predicted_risk,
            'risk_score': float(risk_score),
            'success_probability': float(success_probability),
            'confidence': float(max(prediction_proba)) * 100,
            'risk_probabilities': {
                self.risk_levels[i]: float(prob) * 100 for i, prob in enumerate(prediction_proba)
            },
            'top_features': contributions[:top_n],
            'risk_breakdown': risk_breakdown,
            'recommendations': recommendations,
            'full_explanation': contributions,
            'digital_insights': self._extract_digital_insights(contributions[:top_n])
        }

        # Convert to JSON-serializable
        result = self._convert_to_serializable(result)

        # Cache result (bounded, LRU eviction)
        self._cache_put(cache_key, result)
        return result

    def _extract_digital_insights(self, top_features: List[Dict]) -> Dict:
        """Extract digital transformation-specific insights from top features."""
        insights = {
            'digital_maturity': None,
            'security_readiness': None,
            'integration_complexity': None,
            'team_capability': None,
            'ai_readiness': None
        }

        digital_keywords = {
            'digital_maturity': ['digital_maturity', 'digital_skill', 'interoperability'],
            'security_readiness': ['security', 'cybersecurity', 'gdpr', 'iso27001', 'penetration'],
            'integration_complexity': ['integration', 'api_count', 'legacy_systems', 'integration_burden'],
            'team_capability': ['team', 'developer', 'vendor_experience', 'senior_developers'],
            'ai_readiness': ['ai_component', 'ai_maturity', 'ai_readiness']
        }

        for feature in top_features:
            feature_name = feature['feature'].lower()
            for insight, keywords in digital_keywords.items():
                if any(keyword in feature_name for keyword in keywords) and insights[insight] is None:
                    insights[insight] = {
                        'feature': feature['feature_label'],
                        'value': feature['feature_value'],
                        'impact': feature['impact'],
                        'icon': feature['icon']
                    }
                    break

        return insights

    def explain_batch(self, inputs_batch: List[Union[Dict, pd.DataFrame]],
                     top_n: int = 10) -> List[Dict]:
        """Explain multiple predictions."""
        results = []
        for input_data in inputs_batch:
            try:
                result = self.explain_prediction(input_data, top_n)
                results.append(result)
            except Exception as e:
                logger.error(f"Batch prediction failed: {e}")
                results.append({
                    'error': str(e),
                    'prediction': None,
                    'confidence': None,
                    'risk_probabilities': None
                })
        return results

    def generate_visualizations(self, sample_index: int = 0, output_dir: Optional[str] = None) -> None:
        """Generate SHAP visualizations."""
        if output_dir is None:
            output_dir = self.model_dir

        output_dir = Path(output_dir)
        output_dir.mkdir(exist_ok=True)

        logger.info("Generating SHAP visualizations...")

        if self.shap_data is not None:
            sample = self.shap_data['sample'][sample_index:sample_index+1]
            shap_values = self.shap_data['shap_values']
            feature_names = self.shap_data['feature_names']

            if isinstance(shap_values, list):
                sv_for_plot = shap_values[0][sample_index:sample_index+1]
            elif isinstance(shap_values, np.ndarray) and len(shap_values.shape) == 3:
                sv_for_plot = shap_values[sample_index:sample_index+1, :, 0]
            else:
                sv_for_plot = shap_values[sample_index:sample_index+1]
        else:
            logger.warning("No background data available for visualizations")
            return

        try:
            plt.figure(figsize=(12, 8))
            shap.summary_plot(
                sv_for_plot,
                sample,
                feature_names=feature_names,
                show=False,
                max_display=15
            )
            plt.title('SHAP Summary - Digital Transformation Risk Factors')
            plt.tight_layout()
            plt.savefig(output_dir / 'shap_summary_digital.png', dpi=150, bbox_inches='tight')
            plt.close()
            logger.info(f"✅ Summary plot saved: {output_dir / 'shap_summary_digital.png'}")
        except Exception as e:
            logger.warning(f"Could not generate summary plot: {e}")

    def export_explanation_json(self, input_data: Union[Dict, pd.DataFrame],
                               output_path: Optional[str] = None) -> Dict:
        """Export explanation as JSON with proper serialization."""
        explanation = self.explain_prediction(input_data)

        if output_path:
            with open(output_path, 'w') as f:
                json.dump(explanation, f, indent=2, cls=NumpyEncoder)
            logger.info(f"✅ Explanation saved to: {output_path}")

        return explanation

    def clear_cache(self) -> None:
        """Clear prediction cache."""
        self._prediction_cache.clear()
        logger.info("Prediction cache cleared")


def create_sample_project() -> Dict:
    """Create a sample project for testing."""
    return {
        'project_type': 'National Digital Identity',
        'digital_service': 'Digital Identity',
        'region': 'Casablanca-Settat',
        'province': 'Casablanca',
        'project_priority': 'High',
        'strategic_importance': 'Critical',
        'planned_budget_mad': 28000000,
        'budget_sufficiency': 0.95,
        'planned_duration_days': 420,
        'procurement_delay_days': 18,
        'approval_delay_days': 12,
        'software_complexity': 'High',
        'integration_complexity': 'High',
        'frontend_framework': 'React',
        'backend_framework': 'Spring Boot',
        'database': 'PostgreSQL',
        'cloud_provider': 'Azure',
        'microservices': 'Yes',
        'api_count': 34,
        'legacy_systems': 8,
        'interoperability_score': 85,
        'ai_component': 'Yes',
        'ai_type': 'Predictive Analytics',
        'ai_maturity': 0.7,
        'cybersecurity_level': 'High',
        'encryption_level': 'Strong',
        'gdpr_compliance': 'Yes',
        'iso27001': 'Yes',
        'penetration_testing': 'Yes',
        'vulnerabilities_found': 2,
        'security_audit_score': 92,
        'team_size': 42,
        'senior_developers': 18,
        'vendor_experience': 4.6,
        'digital_skill_score': 84,
        'staff_turnover': 12.5,
        'scrum_maturity': 'High',
        'testing_coverage': 91,
        'compliance_score': 96,
        'audit_findings': 1,
        'citizen_users': 4000000,
        'expected_transactions': 800000,
        'digital_adoption_rate': 0.75,
        'citizen_complaints': 3,
        'system_availability_target': 99.95,
        'user_training': 82,
        'change_requests': 5,
        'digital_maturity': 0.85,
        'chatbot_usage': 'Medium',
        'funding_source': 'National Budget'
    }


def main():
    """CLI interface for testing SHAP explanations."""
    print("="*70)
    print("🔍 SHAP EXPLAINER - Digital Transformation Risk Analysis")
    print("Ministry of Digital Transition and Administration Reform - Morocco")
    print("="*70)

    try:
        # Initialize explainer
        explainer = RiskExplainer(model_dir='models')

        # Create sample project
        sample_project = create_sample_project()

        print("\n📊 Generating explanation for digital transformation project...")
        print(f"   Project: {sample_project['project_type']}")
        print(f"   Cloud Provider: {sample_project['cloud_provider']}")
        print(f"   AI Component: {sample_project['ai_component']}")

        # Get explanation
        explanation = explainer.export_explanation_json(
            sample_project,
            output_path='models/sample_digital_explanation.json'
        )

        # Display results
        print(f"\n📈 Prediction: {explanation['prediction']}")
        print(f"   Risk Score: {explanation['risk_score']:.1f}/100")
        print(f"   Success Probability: {explanation['success_probability']:.1f}%")
        print(f"   Confidence: {explanation['confidence']:.1f}%")

        print(f"\n   Risk Probabilities:")
        for risk, prob in explanation['risk_probabilities'].items():
            print(f"      {risk}: {prob:.1f}%")

        print(f"\n   📊 Risk Breakdown:")
        for item in explanation['risk_breakdown'][:8]:
            print(f"      {item['sign']}{item['percentage']:.1f}% {item['feature']}")

        print(f"\n   🔍 Top Decision Factors:")
        for feature in explanation['top_features'][:8]:
            print(f"      {feature['icon']} {feature['feature_label']} = {feature['feature_value']}")
            print(f"         → {feature['impact']} {explanation['prediction']} risk (SHAP: {feature['shap_value']:.3f})")

        if 'digital_insights' in explanation:
            print(f"\n   💡 Digital Insights:")
            for insight, data in explanation['digital_insights'].items():
                if data:
                    print(f"      {data['icon']} {insight.replace('_', ' ').title()}: {data['feature']} = {data['value']}")
                    print(f"         → {data['impact']} {explanation['prediction']} risk")

        print(f"\n   🎯 Recommendations:")
        for i, rec in enumerate(explanation['recommendations'][:5], 1):
            print(f"      {i}. [{rec['priority']}] {rec['action']}")
            print(f"         {rec['details']}")

        print("\n" + "="*70)
        print("✅ SHAP explainer optimized successfully!")
        print("   - Fixed lru_cache memory leak on instance method")
        print("   - Bounded LRU prediction cache (was unbounded dict)")
        print("   - Fixed JSON serialization for numpy types")
        print("   - Improved error handling")
        print("="*70)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
