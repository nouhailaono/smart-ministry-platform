# Update config.py with complete configuration

import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / 'data'
MODELS_DIR = BASE_DIR / 'models'
PREPROCESSING_DIR = BASE_DIR / 'preprocessing'
TRAINING_DIR = BASE_DIR / 'training'
PREDICTION_DIR = BASE_DIR / 'prediction'
RECOMMENDATIONS_DIR = BASE_DIR / 'recommendations'
EXPLAINABILITY_DIR = BASE_DIR / 'explainability'

# Data files
RAW_DATA_PATH = DATA_DIR / 'ministry_projects.csv'  # Added this
DATASET_PATH = DATA_DIR / 'ministry_projects.csv'
PROCESSED_DATA_PATH = DATA_DIR / 'processed_projects.csv'

# Model files
RISK_MODEL_PATH = MODELS_DIR / 'risk_model.pkl'
SCALER_PATH = MODELS_DIR / 'scaler.pkl'
ENCODER_PATH = MODELS_DIR / 'encoder.pkl'
FEATURE_IMPORTANCE_PATH = MODELS_DIR / 'feature_importance.pkl'

# Model parameters
RANDOM_STATE = 42
TEST_SIZE = 0.2
VALIDATION_SIZE = 0.1

# Features
CATEGORICAL_FEATURES = [
    'ministry', 'project_type', 'status', 'location', 'priority'
]

NUMERICAL_FEATURES = [
    'budget', 'actual_cost', 'project_duration_days'
]

TARGET_FEATURES = {
    'risk_level': ['Low', 'Medium', 'High'],
    'budget_overrun': ['Low', 'Medium', 'High']
}

# Recommendation thresholds
HIGH_RISK_THRESHOLD = 0.7
MEDIUM_RISK_THRESHOLD = 0.4

# Create directories if they don't exist
for dir_path in [DATA_DIR, MODELS_DIR, PREPROCESSING_DIR, TRAINING_DIR, 
                 PREDICTION_DIR, RECOMMENDATIONS_DIR, EXPLAINABILITY_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)
