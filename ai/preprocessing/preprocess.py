"""
preprocess.py - Data preprocessing for digital transformation projects
Ministry of Digital Transition and Administration Reform - Morocco

CHANGELOG (this version):
  - CRITICAL FIX: 'risk_score' and 'budget_overrun_rate' were not excluded from
    feature_cols (only the four *_targets* were), so they leaked straight into the
    training features -- the same bug already fixed in train_model.py. Added an
    explicit LEAKAGE_COLUMNS list and drop it before feature_cols is computed.
  - CRITICAL FIX: _create_features() injected np.random.uniform(...) as the
    'cloud_readiness' feature. This ran at BOTH training and inference time
    (prepare_features() calls _create_features()), meaning the same project sent
    to the API twice would get a different feature value and a different
    prediction each time. Replaced with a deterministic formula.
  - FIX: pipeline order was encode -> scale -> engineer_features. Several engineered
    features (digital_maturity_index, ai_readiness, quality_score, budget_efficiency,
    citizen_engagement) assume raw 0-100 / raw-MAD inputs, but scaling ran first,
    so they were being computed on standardized (mean ~0, possibly negative) values.
    Reordered to encode -> engineer_features (on raw values) -> scale (raw numeric
    columns only; engineered columns are already roughly bounded by design and are
    left unscaled intentionally).
  - Ordinal columns (software_complexity, integration_complexity, project_priority,
    strategic_importance, cybersecurity_level, scrum_maturity, chatbot_usage) are now
    encoded with an explicit, meaning-preserving integer map (matching
    ORDINAL_COLUMNS in train_model.py) instead of an arbitrary alphabetical
    LabelEncoder, which had no guarantee of preserving Low < Medium < High order.
  - NOTE: this pipeline is NOT what train_model.py actually trains on (that script
    has its own independent build_xy()/ColumnTransformer and saves
    'preprocessor.joblib'). If you serve predictions, use RiskExplainer
    (shap_explainer.py) / preprocessor.joblib, not this class, or you will get
    silently wrong predictions from a feature representation the model never saw.
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
import joblib
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))
from config import *

# Columns that are OUTCOMES and must never be used as model inputs (target leakage).
# Kept in sync with LEAKAGE_COLUMNS in train_model.py.
LEAKAGE_COLUMNS = ['risk_score', 'budget_overrun_rate']

# Ordinal columns with a meaningful order -> encoded as integers, NOT via LabelEncoder
# (which sorts alphabetically and would silently break the Low < Medium < High
# relationship, e.g. 'Critical' < 'High' < 'Low' < 'Medium' alphabetically).
# Kept in sync with ORDINAL_COLUMNS in train_model.py.
ORDINAL_COLUMNS = {
    'software_complexity': {'Low': 0, 'Medium': 1, 'High': 2, 'Very High': 3},
    'integration_complexity': {'Low': 0, 'Medium': 1, 'High': 2, 'Very High': 3},
    'project_priority': {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3},
    'strategic_importance': {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3},
    'cybersecurity_level': {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3},
    'scrum_maturity': {'Low': 0, 'Medium': 1, 'High': 2},
    'chatbot_usage': {'Low': 0, 'Medium': 1, 'High': 2},
}

# Nominal (unordered) categorical columns -> LabelEncoder is fine here since there's
# no ordering to preserve.
NOMINAL_COLUMNS = [
    'project_type', 'digital_service', 'region', 'province',
    'cloud_migration', 'cloud_provider', 'frontend_framework', 'backend_framework',
    'database', 'encryption_level', 'gdpr_compliance', 'iso27001',
    'penetration_testing', 'ai_component', 'ai_type', 'microservices', 'funding_source',
]

# Full categorical list (ordinal + nominal), used for missing-value handling only.
ALL_CATEGORICAL_COLUMNS = list(ORDINAL_COLUMNS.keys()) + NOMINAL_COLUMNS


class DataPreprocessor:
    def __init__(self):
        self.label_encoders = {}
        self.scaler = StandardScaler()
        self.feature_cols = None
        self.target_cols = ['risk_level', 'budget_overrun', 'completion_delay', 'success_probability']

    def load_data(self, file_path=None):
        """Load the digital transformation dataset"""
        if file_path is None:
            file_path = RAW_DATA_PATH
        if not Path(file_path).exists():
            raise FileNotFoundError(f"Data file not found at {file_path}")
        df = pd.read_csv(file_path)
        print(f"✅ Loaded {len(df)} records from {file_path}")
        return df

    def preprocess(self, df):
        """Main preprocessing pipeline for digital transformation projects.

        Order matters: categorical encoding must happen before feature engineering
        (some engineered features read '<col>_encoded' columns), and feature
        engineering must happen BEFORE scaling (engineered features assume raw,
        unscaled inputs).
        """
        print("🔄 Starting preprocessing for digital transformation data...")
        data = df.copy()

        # Handle missing values
        data = self._handle_missing_values(data)

        # Encode categorical variables (ordinal -> meaning-preserving ints, nominal -> LabelEncoder)
        data = self._encode_categorical(data)

        # Create engineered features on RAW numeric values (must precede scaling)
        data = self._create_features(data)

        # Scale numerical features (raw source columns only, not engineered ones)
        data = self._scale_features(data)

        # Drop leakage columns (outcomes correlated with / derived from risk_score)
        # before computing feature_cols, in addition to the primary prediction targets.
        cols_to_exclude = set(self.target_cols) | set(LEAKAGE_COLUMNS)
        data_for_features = data.drop(columns=[c for c in LEAKAGE_COLUMNS if c in data.columns])

        # Prepare feature columns for ML
        self.feature_cols = [
            col for col in data_for_features.columns
            if col not in cols_to_exclude
            and not col.startswith('project_')
            and col not in ['project_id', 'project_name', 'ministry', 'sector']
        ]

        print(f"✅ Preprocessing complete. {len(data)} records ready.")
        print(f"   Features: {len(self.feature_cols)}")
        print(f"   Target: {', '.join(self.target_cols)}")
        print(f"   Excluded (leakage): {', '.join(LEAKAGE_COLUMNS)}")
        return data

    def _handle_missing_values(self, data):
        """Handle missing values in the dataset"""
        for col in ALL_CATEGORICAL_COLUMNS:
            if col in data.columns:
                data[col] = data[col].fillna(data[col].mode()[0] if not data[col].mode().empty else 'Unknown')

        numerical_cols = ['planned_budget_mad', 'budget_sufficiency', 'planned_duration_days',
                         'procurement_delay_days', 'approval_delay_days', 'api_count',
                         'legacy_systems', 'interoperability_score', 'ai_maturity',
                         'vulnerabilities_found', 'security_audit_score', 'team_size',
                         'senior_developers', 'vendor_experience', 'digital_skill_score',
                         'staff_turnover', 'testing_coverage', 'compliance_score',
                         'audit_findings', 'citizen_users', 'expected_transactions',
                         'digital_adoption_rate', 'citizen_complaints',
                         'system_availability_target', 'user_training', 'change_requests',
                         'digital_maturity', 'risk_score', 'success_probability',
                         'budget_overrun', 'budget_overrun_rate', 'completion_delay']

        for col in numerical_cols:
            if col in data.columns:
                data[col] = data[col].fillna(data[col].median())

        return data

    def _encode_categorical(self, data):
        """Encode categorical variables.

        Ordinal columns use an explicit, meaning-preserving integer map so that
        Low < Medium < High < Critical/Very High is guaranteed -- this matters both
        for model quality (trees can split cleanly on a monotonic scale) and for
        any monotonic constraints applied downstream.

        Nominal columns use LabelEncoder since there's no order to preserve.
        """
        # Ordinal: explicit mapping, always the same regardless of what values are
        # present in this particular dataframe (unlike LabelEncoder, which depends
        # on np.unique() of whatever's present).
        for col, mapping in ORDINAL_COLUMNS.items():
            if col in data.columns:
                data[col + '_encoded'] = data[col].map(mapping)
                # Unmapped/unexpected category values fall back to the lowest level
                # rather than silently becoming NaN.
                data[col + '_encoded'] = data[col + '_encoded'].fillna(0).astype(int)

        # Nominal: LabelEncoder (order doesn't matter for these)
        for col in NOMINAL_COLUMNS:
            if col in data.columns:
                if col not in self.label_encoders:
                    self.label_encoders[col] = LabelEncoder()
                    unique_vals = data[col].astype(str).unique()
                    self.label_encoders[col].fit(unique_vals)
                data[col + '_encoded'] = self.label_encoders[col].transform(data[col].astype(str))

        return data

    def _scale_features(self, data):
        """Scale numerical features. Only the original raw numeric columns are
        scaled -- engineered features (digital_maturity_index, ai_readiness, etc.)
        are intentionally left unscaled since they're already roughly bounded
        (0-1 or similar) by construction."""
        numerical_cols = ['planned_budget_mad', 'budget_sufficiency', 'planned_duration_days',
                         'procurement_delay_days', 'approval_delay_days', 'api_count',
                         'legacy_systems', 'interoperability_score', 'ai_maturity',
                         'vulnerabilities_found', 'security_audit_score', 'team_size',
                         'senior_developers', 'vendor_experience', 'digital_skill_score',
                         'staff_turnover', 'testing_coverage', 'compliance_score',
                         'audit_findings', 'citizen_users', 'expected_transactions',
                         'digital_adoption_rate', 'citizen_complaints',
                         'system_availability_target', 'user_training', 'change_requests',
                         'digital_maturity']

        existing_numerical = [col for col in numerical_cols if col in data.columns]
        if existing_numerical:
            if not hasattr(self.scaler, 'mean_'):
                self.scaler.fit(data[existing_numerical])
            data[existing_numerical] = self.scaler.transform(data[existing_numerical])
        return data

    def _create_features(self, data):
        """Create engineered features for digital transformation projects.
        Expects RAW (unscaled) numeric inputs -- must run before _scale_features()."""

        # Digital maturity index (combine multiple factors)
        if all(col in data.columns for col in ['digital_skill_score', 'digital_maturity', 'interoperability_score']):
            data['digital_maturity_index'] = (
                data['digital_skill_score'] * 0.4 +
                data['digital_maturity'] * 100 * 0.3 +
                data['interoperability_score'] * 0.3
            ) / 100

        # AI readiness score
        if all(col in data.columns for col in ['ai_component_encoded', 'ai_maturity', 'digital_skill_score']):
            data['ai_readiness'] = np.where(
                data['ai_component_encoded'] == 1,
                (data['ai_maturity'] * 0.5 + (data['digital_skill_score'] / 100) * 0.5),
                0
            )

        # Cloud readiness: deterministic function of migration status + digital
        # maturity / interoperability, instead of the previous np.random.uniform()
        # call (which made this feature -- and therefore every downstream
        # prediction -- non-reproducible: the same project would score differently
        # on every single call, at both training and inference time).
        if 'cloud_migration_encoded' in data.columns:
            maturity_component = data['digital_maturity'] if 'digital_maturity' in data.columns else 0.5
            interop_component = (data['interoperability_score'] / 100) if 'interoperability_score' in data.columns else 0.5
            data['cloud_readiness'] = np.where(
                data['cloud_migration_encoded'] == 1,
                (0.5 * maturity_component + 0.5 * interop_component).clip(0, 1),
                0
            )

        # Security maturity
        if all(col in data.columns for col in ['security_audit_score', 'cybersecurity_level_encoded']):
            data['security_maturity'] = data['security_audit_score'] / 100 * 0.7 + \
                                       (data['cybersecurity_level_encoded'] / 3) * 0.3

        # Integration complexity ratio
        if 'integration_complexity_encoded' in data.columns and 'api_count' in data.columns:
            data['integration_ratio'] = (data['integration_complexity_encoded'] / 3) * (data['api_count'] / 50)
            data['integration_ratio'] = data['integration_ratio'].clip(0, 1)

        # Legacy burden
        if 'legacy_systems' in data.columns:
            data['legacy_burden'] = np.where(
                data['legacy_systems'] > 20, 1,
                np.where(data['legacy_systems'] > 10, 0.5, 0)
            )

        # Team capability score
        if all(col in data.columns for col in ['team_size', 'senior_developers', 'vendor_experience', 'digital_skill_score']):
            data['team_capability'] = (
                (data['senior_developers'] / data['team_size'].clip(lower=1)) * 0.4 +
                (data['vendor_experience'] / 5) * 0.3 +
                (data['digital_skill_score'] / 100) * 0.3
            )

        # Citizen engagement score
        if all(col in data.columns for col in ['citizen_users', 'digital_adoption_rate', 'expected_transactions']):
            data['citizen_engagement'] = (
                np.log1p(data['citizen_users'].clip(lower=1)) / np.log1p(20_000_000) * 0.4 +
                data['digital_adoption_rate'] * 0.3 +
                np.log1p(data['expected_transactions'].clip(lower=1)) / np.log1p(5_000_000) * 0.3
            )

        # Quality assurance score
        if all(col in data.columns for col in ['testing_coverage', 'compliance_score', 'audit_findings']):
            data['quality_score'] = (
                (data['testing_coverage'] / 100) * 0.4 +
                (data['compliance_score'] / 100) * 0.4 +
                (1 - np.minimum(data['audit_findings'] / 10, 1)) * 0.2
            )

        # Budget efficiency
        if 'planned_budget_mad' in data.columns and 'budget_sufficiency' in data.columns:
            data['budget_efficiency'] = data['budget_sufficiency'] / (1 + data['planned_budget_mad'] / 100_000_000)
            data['budget_efficiency'] = data['budget_efficiency'].clip(0, 1)

        # Risk-adjusted success probability (normalized copy, kept for reference /
        # dashboards only -- 'success_probability' itself stays in target_cols and
        # is never used as a feature).
        if 'success_probability' in data.columns:
            data['success_probability_norm'] = data['success_probability'] / 100

        return data

    def save_preprocessors(self):
        """Save fitted preprocessors"""
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.label_encoders, ENCODER_PATH)
        joblib.dump(self.scaler, SCALER_PATH)
        joblib.dump(self.feature_cols, MODELS_DIR / 'feature_cols.pkl')
        print(f"✅ Preprocessors saved to {MODELS_DIR}")

    def load_preprocessors(self):
        """Load fitted preprocessors"""
        if not ENCODER_PATH.exists() or not SCALER_PATH.exists():
            raise FileNotFoundError(f"Preprocessors not found at {MODELS_DIR}")
        self.label_encoders = joblib.load(ENCODER_PATH)
        self.scaler = joblib.load(SCALER_PATH)
        feature_cols_path = MODELS_DIR / 'feature_cols.pkl'
        if feature_cols_path.exists():
            self.feature_cols = joblib.load(feature_cols_path)
        print(f"✅ Preprocessors loaded from {MODELS_DIR}")

    def prepare_features(self, df):
        """Prepare features for prediction. Mirrors preprocess()'s ordering:
        encode -> engineer -> scale."""
        data = df.copy()

        # Ordinal encoding (explicit map, same as training)
        for col, mapping in ORDINAL_COLUMNS.items():
            if col in data.columns:
                data[col + '_encoded'] = data[col].map(mapping).fillna(0).astype(int)
            else:
                data[col + '_encoded'] = 0

        # Nominal encoding (LabelEncoder, fit during training)
        for col in NOMINAL_COLUMNS:
            if col in data.columns and col in self.label_encoders:
                le = self.label_encoders[col]
                data[col + '_encoded'] = data[col].apply(
                    lambda x: le.transform([str(x)])[0] if str(x) in le.classes_ else -1
                )
            elif col in data.columns:
                data[col + '_encoded'] = 0

        # Ensure all raw numerical columns exist before feature engineering / scaling
        numerical_cols = ['planned_budget_mad', 'budget_sufficiency', 'planned_duration_days',
                         'procurement_delay_days', 'approval_delay_days', 'api_count',
                         'legacy_systems', 'interoperability_score', 'ai_maturity',
                         'vulnerabilities_found', 'security_audit_score', 'team_size',
                         'senior_developers', 'vendor_experience', 'digital_skill_score',
                         'staff_turnover', 'testing_coverage', 'compliance_score',
                         'audit_findings', 'citizen_users', 'expected_transactions',
                         'digital_adoption_rate', 'citizen_complaints',
                         'system_availability_target', 'user_training', 'change_requests',
                         'digital_maturity']
        for col in numerical_cols:
            if col not in data.columns:
                data[col] = 0

        # Engineer features on raw values BEFORE scaling
        data = self._create_features(data)

        # Scale using the fitted scaler
        if hasattr(self.scaler, 'mean_'):
            existing_scaler_features = [col for col in numerical_cols if col in data.columns]
            if existing_scaler_features:
                scaler_data = data[existing_scaler_features].copy()
                try:
                    scaled_data = self.scaler.transform(scaler_data)
                    data[existing_scaler_features] = scaled_data
                except ValueError as e:
                    print(f"Warning: Could not scale data: {e}")

        if self.feature_cols:
            feature_cols_existing = [col for col in self.feature_cols if col in data.columns]
            X = data[feature_cols_existing]
        else:
            X = data[[col for col in data.columns if col.endswith('_encoded') or
                     col in numerical_cols or col in ['digital_maturity_index', 'ai_readiness',
                     'cloud_readiness', 'security_maturity', 'integration_ratio',
                     'legacy_burden', 'team_capability', 'citizen_engagement',
                     'quality_score', 'budget_efficiency', 'success_probability_norm']]]

        return X

    def split_data(self, data, test_size=0.2, random_state=42):
        """Split data into train and test sets"""
        X = data[self.feature_cols] if self.feature_cols else data.drop(
            columns=[c for c in self.target_cols + LEAKAGE_COLUMNS if c in data.columns]
        )

        y_risk = data['risk_level'].map({'Low': 0, 'Medium': 1, 'High': 2})
        y_budget = data['budget_overrun']
        y_completion = data['completion_delay']
        y_success = data['success_probability']

        X_train, X_test, y_risk_train, y_risk_test, y_budget_train, y_budget_test, \
        y_completion_train, y_completion_test, y_success_train, y_success_test = train_test_split(
            X, y_risk, y_budget, y_completion, y_success,
            test_size=test_size, random_state=random_state, stratify=y_risk
        )

        print(f"✅ Data split complete:")
        print(f"   Train: {len(X_train)} records")
        print(f"   Test: {len(X_test)} records")

        return (X_train, X_test, y_risk_train, y_risk_test,
                y_budget_train, y_budget_test,
                y_completion_train, y_completion_test,
                y_success_train, y_success_test)


def main():
    """Main preprocessing function"""
    preprocessor = DataPreprocessor()

    df = preprocessor.load_data()
    processed_df = preprocessor.preprocess(df)

    processed_df.to_csv(PROCESSED_DATA_PATH, index=False)
    print(f"✅ Processed data saved to {PROCESSED_DATA_PATH}")

    preprocessor.save_preprocessors()

    try:
        split_data = preprocessor.split_data(processed_df)
        X_train, X_test, y_risk_train, y_risk_test, y_budget_train, y_budget_test, \
        y_completion_train, y_completion_test, y_success_train, y_success_test = split_data

        pd.DataFrame(X_train).to_csv(MODELS_DIR / 'X_train.csv', index=False)
        pd.DataFrame(X_test).to_csv(MODELS_DIR / 'X_test.csv', index=False)
        pd.DataFrame({'risk_level': y_risk_train}).to_csv(MODELS_DIR / 'y_risk_train.csv', index=False)
        pd.DataFrame({'risk_level': y_risk_test}).to_csv(MODELS_DIR / 'y_risk_test.csv', index=False)
        print(f"✅ Train/test splits saved to {MODELS_DIR}")
    except Exception as e:
        print(f"Warning: Could not save train/test splits: {e}")

    print("\n📊 Data Summary:")
    print(f"   - Total records: {len(processed_df)}")
    print(f"   - Features: {len(preprocessor.feature_cols)}")

    if 'risk_level' in processed_df.columns:
        print(f"\n   - Risk levels:")
        risk_counts = processed_df['risk_level'].value_counts()
        for level, count in risk_counts.items():
            print(f"     {level}: {count} ({count/len(processed_df)*100:.1f}%)")

    if 'success_probability' in processed_df.columns:
        print(f"\n   - Success probability:")
        print(f"     Mean: {processed_df['success_probability'].mean():.1f}%")
        print(f"     Min: {processed_df['success_probability'].min():.1f}%")
        print(f"     Max: {processed_df['success_probability'].max():.1f}%")

    if 'budget_overrun' in processed_df.columns:
        print(f"\n   - Budget overrun:")
        print(f"     Mean: {processed_df['budget_overrun'].mean():,.2f} MAD")
        print(f"     Std: {processed_df['budget_overrun'].std():,.2f} MAD")

    print("\n🔍 Digital Transformation Features Included:")
    digital_features = ['ai_component_encoded', 'cloud_migration_encoded', 'api_count',
                       'legacy_systems', 'interoperability_score', 'digital_skill_score',
                       'cybersecurity_level_encoded', 'digital_maturity']
    existing_features = [f for f in digital_features if f in processed_df.columns]
    for feature in existing_features[:5]:
        print(f"   - {feature}")


if __name__ == "__main__":
    main()