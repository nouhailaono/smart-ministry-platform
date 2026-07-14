
import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import shap
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.compose import ColumnTransformer
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score, GridSearchCV
from sklearn.preprocessing import OneHotEncoder, LabelEncoder
from sklearn.metrics import (
    accuracy_score, f1_score, classification_report,
    confusion_matrix, ConfusionMatrixDisplay,
    roc_auc_score, roc_curve, precision_recall_curve, auc,
    mean_squared_error, mean_absolute_error, r2_score
)
from sklearn.preprocessing import label_binarize
from xgboost import XGBClassifier, XGBRegressor

# ===============================
# CONFIG
# ===============================

# Columns that are OUTCOMES - must never be used as model inputs (target leakage).
LEAKAGE_COLUMNS = [
    "risk_score", "budget_overrun", "budget_overrun_rate", "completion_delay",
]

# Identifier / non-predictive columns.
ID_COLUMNS = ["project_id", "project_name", "ministry", "sector"]


CATEGORICAL_COLUMNS = [
    "project_type", "digital_service", "region", "province",
    "frontend_framework", "backend_framework", "database", "cloud_provider",
    "encryption_level", "gdpr_compliance", "iso27001", "penetration_testing",
    "ai_component", "ai_type", "microservices", "funding_source",
]

ORDINAL_COLUMNS = {
    'software_complexity': {'Low': 0, 'Medium': 1, 'High': 2, 'Very High': 3},
    'integration_complexity': {'Low': 0, 'Medium': 1, 'High': 2, 'Very High': 3},
    'project_priority': {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3},
    'strategic_importance': {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3},
    'cybersecurity_level': {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3},
    'scrum_maturity': {'Low': 0, 'Medium': 1, 'High': 2},
    'chatbot_usage': {'Low': 0, 'Medium': 1, 'High': 2},
}

MONOTONIC_DIRECTIONS = {
    'testing_coverage': -1,
    'vendor_experience': -1,
    'legacy_systems': 1,
    'security_audit_score': -1,
    'digital_skill_score': -1,
    'compliance_score': -1,
    'staff_turnover': 1,
    'procurement_delay_days': 1,
    'approval_delay_days': 1,
    'total_delay_days': 1,
    'audit_findings': 1,
    'vulnerabilities_found': 1,
    'interoperability_score': -1,
    'user_training': -1,
    'citizen_complaints': 1,
    'software_complexity_ordinal': 1,
    'integration_complexity_ordinal': 1,
    'cybersecurity_level_ordinal': -1,
    'scrum_maturity_ordinal': -1,
}

TARGET_COLUMN = "risk_level"
RISK_ORDER = ["Low", "Medium", "High"]  
SUCCESS_TARGET = "success_probability"

RANDOM_STATE = 42

# ===============================
# FEATURE ENGINEERING
# ===============================

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add digital transformation-specific engineered features."""
    df = df.copy()

    # Digital maturity index (combine multiple factors)
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

    # Integration complexity ratio
    if 'api_count' in df.columns and 'legacy_systems' in df.columns:
        df['integration_burden'] = (df['api_count'] / 50) * (df['legacy_systems'] / 30)
        df['integration_burden'] = df['integration_burden'].clip(0, 1)

    # Security maturity
    if 'security_audit_score' in df.columns and 'cybersecurity_level' in df.columns:
        security_map = {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3}
        df['security_maturity'] = df['security_audit_score'] / 100 * 0.7 + \
                                  df['cybersecurity_level'].map(security_map).fillna(0) / 3 * 0.3

    # Citizen engagement score
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

    # Project complexity score
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

    # Cloud migration flag (derived from cloud_provider)
    if 'cloud_provider' in df.columns:
        df['cloud_migration'] = np.where(df['cloud_provider'] != 'On-Premise', 'Yes', 'No')

    return df


def encode_ordinal_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Encode ordinal categorical columns. The *original* string column is dropped
    afterward in build_xy() via the categorical/ordinal partitioning below, so each
    ordinal variable ends up represented exactly once in the final feature matrix."""
    df = df.copy()
    for col, mapping in ORDINAL_COLUMNS.items():
        if col in df.columns:
            df[col + '_ordinal'] = df[col].map(mapping).fillna(0).astype(int)
    return df

# ===============================
# DATA LOADING + SPLITTING
# ===============================

def load_dataset(csv_path: Path) -> pd.DataFrame:
    """Load the dataset from CSV file."""
    if not csv_path.exists():
        alt_path = csv_path.parent / "ministry_projects.csv"
        if alt_path.exists():
            csv_path = alt_path
        else:
            raise FileNotFoundError(f"Data file not found at {csv_path} or {alt_path}")

    df = pd.read_csv(csv_path)

    if TARGET_COLUMN not in df.columns:
        raise ValueError(f"Target column '{TARGET_COLUMN}' not found in dataset. Available columns: {df.columns.tolist()}")

    missing_target = df[TARGET_COLUMN].isna().sum()
    if missing_target:
        raise ValueError(f"{missing_target} rows have a missing '{TARGET_COLUMN}' value.")

    print(f"Loaded {len(df)} rows from {csv_path}")
    return df


def build_xy(df: pd.DataFrame):
    """Build feature matrix X and target vectors.

    Ordinal-source columns (e.g. 'software_complexity') are encoded into their
    '_ordinal' counterpart and then DROPPED as raw strings, so they never also get
    swept into the one-hot categorical list. This prevents the double-encoding bug.
    """
    df = engineer_features(df)
    df = encode_ordinal_columns(df)

    cols_to_drop = [c for c in LEAKAGE_COLUMNS + ID_COLUMNS if c in df.columns]
    # Drop the raw string version of every ordinal column now that '<col>_ordinal' exists.
    cols_to_drop += [c for c in ORDINAL_COLUMNS.keys() if c in df.columns]
    df = df.drop(columns=cols_to_drop)

    y_raw = df.pop(TARGET_COLUMN)
    y_success = df.pop(SUCCESS_TARGET) if SUCCESS_TARGET in df.columns else None

    X = df

    ordinal_cols = [col + '_ordinal' for col in ORDINAL_COLUMNS.keys() if col + '_ordinal' in X.columns]
    existing_cat_cols = [col for col in CATEGORICAL_COLUMNS if col in X.columns]

    numeric_columns = []
    for col in X.columns:
        if col in existing_cat_cols or col in ordinal_cols:
            continue
        if pd.api.types.is_numeric_dtype(X[col]):
            numeric_columns.append(col)

    numeric_columns.extend(ordinal_cols)

    print(f"\nFeature breakdown:")
    print(f"  - Categorical columns (one-hot): {len(existing_cat_cols)}")
    print(f"  - Ordinal columns (integer-encoded, numeric): {len(ordinal_cols)}")
    print(f"  - Other numeric columns: {len(numeric_columns) - len(ordinal_cols)}")
    print(f"  - Total features: {len(existing_cat_cols) + len(numeric_columns)}")

    return X, y_raw, y_success, numeric_columns, existing_cat_cols


# ===============================
# PREPROCESSING
# ===============================

def build_preprocessor(numeric_columns, categorical_columns):
    """Build a ColumnTransformer for preprocessing."""
    return ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_columns),
            ("num", "passthrough", numeric_columns),
        ]
    )


def get_output_feature_names(preprocessor: ColumnTransformer, numeric_columns, categorical_columns):
    """Get feature names after preprocessing. Order matches the ColumnTransformer:
    one-hot categorical columns first, then numeric/ordinal columns (passthrough)."""
    cat_encoder = preprocessor.named_transformers_["cat"]
    cat_names = list(cat_encoder.get_feature_names_out(categorical_columns))
    return cat_names + list(numeric_columns)


def build_monotone_constraints(feature_names):
    """Build the monotone_constraints tuple string for XGBClassifier, matching the
    feature order returned by get_output_feature_names(). One-hot categorical columns
    always get 0 (unconstrained); numeric/ordinal columns use MONOTONIC_DIRECTIONS
    where defined, else 0."""
    directions = []
    for name in feature_names:
        directions.append(MONOTONIC_DIRECTIONS.get(name, 0))
    n_constrained = sum(1 for d in directions if d != 0)
    print(f"Monotonic constraints applied to {n_constrained}/{len(directions)} features")
    return "(" + ",".join(str(d) for d in directions) + ")"


# ===============================
# TRAINING - CLASSIFICATION (Risk Level)
# ===============================

def train_xgboost_classifier(X_train, y_train, X_val=None, y_val=None, tune: bool = False,
                              monotone_constraints: str = None):
    """Train XGBoost classifier for risk level prediction."""
    base_params = dict(
        objective="multi:softprob",
        num_class=3,
        eval_metric="mlogloss",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    if monotone_constraints is not None:
        base_params["monotone_constraints"] = monotone_constraints

    if not tune:
        model = XGBClassifier(
            **base_params,
            n_estimators=1000,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.85,
            colsample_bytree=0.85,
            min_child_weight=3,
            reg_lambda=1.5,
            early_stopping_rounds=30 if X_val is not None else None,
        )
        if X_val is not None:
            model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
            print(f"Early stopping at iteration: {model.best_iteration}")
        else:
            model.fit(X_train, y_train)
        return model, base_params

    print("Running GridSearchCV hyperparameter tuning (this may take a while)...")
    param_grid = {
        "n_estimators": [250, 350, 500],
        "max_depth": [4, 5, 6],
        "learning_rate": [0.03, 0.05, 0.1],
        "subsample": [0.75, 0.85, 1.0],
        "colsample_bytree": [0.75, 0.85, 1.0],
    }
    grid = GridSearchCV(
        XGBClassifier(**base_params),
        param_grid=param_grid,
        cv=StratifiedKFold(n_splits=4, shuffle=True, random_state=RANDOM_STATE),
        scoring="f1_macro",
        n_jobs=-1,
        verbose=1,
    )
    grid.fit(X_train, y_train)
    print(f"Best params: {grid.best_params_}")
    print(f"Best CV f1_macro: {grid.best_score_:.4f}")
    return grid.best_estimator_, grid.best_params_

# ===============================
# TRAINING - REGRESSION (Success Probability)
# ===============================

def train_xgboost_regressor(X_train, y_train, X_val=None, y_val=None, tune: bool = False):
    """Train XGBoost regressor for success probability prediction."""
    base_params = dict(
        objective="reg:squarederror",
        eval_metric="rmse",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )

    if not tune:
        model = XGBRegressor(
            **base_params,
            n_estimators=1000,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.85,
            colsample_bytree=0.85,
            min_child_weight=3,
            reg_lambda=1.5,
            early_stopping_rounds=30 if X_val is not None else None,
        )
        if X_val is not None:
            model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
            print(f"Early stopping at iteration: {model.best_iteration}")
        else:
            model.fit(X_train, y_train)
        return model, base_params

    print("Running GridSearchCV hyperparameter tuning for regressor...")
    param_grid = {
        "n_estimators": [250, 350, 500],
        "max_depth": [4, 5, 6],
        "learning_rate": [0.03, 0.05, 0.1],
        "subsample": [0.75, 0.85, 1.0],
        "colsample_bytree": [0.75, 0.85, 1.0],
    }
    grid = GridSearchCV(
        XGBRegressor(**base_params),
        param_grid=param_grid,
        cv=StratifiedKFold(n_splits=4, shuffle=True, random_state=RANDOM_STATE),
        scoring="neg_mean_squared_error",
        n_jobs=-1,
        verbose=1,
    )
    grid.fit(X_train, y_train)
    print(f"Best params: {grid.best_params_}")
    print(f"Best CV RMSE: {np.sqrt(-grid.best_score_):.4f}")
    return grid.best_estimator_, grid.best_params_

# ===============================
# EVALUATION
# ===============================

def evaluate_classifier(model, X_test, y_test, label_encoder, output_dir: Path):
    """Evaluate the classifier model."""
    y_pred = model.predict(X_test)

    acc = accuracy_score(y_test, y_pred)
    f1_macro = f1_score(y_test, y_pred, average="macro")
    report = classification_report(
        y_test, y_pred, target_names=label_encoder.classes_, output_dict=True
    )

    print(f"\nClassification Test Results:")
    print(f"Test accuracy: {acc:.4f}")
    print(f"Test macro F1: {f1_macro:.4f}")
    if acc > 0.95:
        print("⚠️  WARNING: accuracy above 95% — treat this as a possible leakage signal, "
              "not a genuine performance gain. Re-check LEAKAGE_COLUMNS and feature list.")
    print("\nClassification report:")
    print(classification_report(y_test, y_pred, target_names=label_encoder.classes_))

    cm = confusion_matrix(y_test, y_pred)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=label_encoder.classes_)
    fig, ax = plt.subplots(figsize=(5, 5))
    disp.plot(ax=ax, cmap="Blues", colorbar=False)
    plt.title("Risk Level - Confusion Matrix")
    plt.tight_layout()
    plt.savefig(output_dir / "confusion_matrix.png", dpi=150)
    plt.close(fig)

    metrics = {
        "classification": {
            "accuracy": acc,
            "f1_macro": f1_macro,
            "classification_report": report,
            "confusion_matrix": cm.tolist(),
            "class_order": list(label_encoder.classes_),
        }
    }
    return metrics


def evaluate_regressor(model, X_test, y_test, output_dir: Path):
    """Evaluate the regressor model. Predictions are clipped to [0, 100] since
    success_probability is bounded in the training data (see generate_synthetic_data.py),
    and unclipped tree regressors can extrapolate outside that range on extreme inputs."""
    y_pred = np.clip(model.predict(X_test), 0, 100)

    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print(f"\nRegression Test Results (Success Probability):")
    print(f"RMSE: {rmse:.4f}")
    print(f"MAE: {mae:.4f}")
    print(f"R²: {r2:.4f}")

    fig, ax = plt.subplots(figsize=(8, 6))
    ax.scatter(y_test, y_pred, alpha=0.5)
    ax.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--', lw=2)
    ax.set_xlabel("Actual Success Probability")
    ax.set_ylabel("Predicted Success Probability")
    ax.set_title("Success Probability - Actual vs Predicted")
    plt.tight_layout()
    plt.savefig(output_dir / "success_regression.png", dpi=150)
    plt.close(fig)

    metrics = {
        "regression": {
            "rmse": rmse,
            "mae": mae,
            "r2": r2,
            "mse": mse,
        }
    }
    return metrics


def plot_roc_pr_curves(model, X_test, y_test, label_encoder, output_dir: Path):
    """Plot ROC and Precision-Recall curves."""
    y_proba = model.predict_proba(X_test)
    classes = label_encoder.classes_
    y_test_bin = label_binarize(y_test, classes=range(len(classes)))

    macro_auc = roc_auc_score(y_test_bin, y_proba, average="macro", multi_class="ovr")
    print(f"Macro ROC-AUC (OvR): {macro_auc:.4f}")

    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    for i, cls in enumerate(classes):
        fpr, tpr, _ = roc_curve(y_test_bin[:, i], y_proba[:, i])
        axes[0].plot(fpr, tpr, label=f"{cls} (AUC={auc(fpr, tpr):.3f})")

        prec, rec, _ = precision_recall_curve(y_test_bin[:, i], y_proba[:, i])
        axes[1].plot(rec, prec, label=cls)

    axes[0].plot([0, 1], [0, 1], "k--", alpha=0.3)
    axes[0].set_xlabel("False Positive Rate")
    axes[0].set_ylabel("True Positive Rate")
    axes[0].set_title("ROC Curves (One-vs-Rest)")
    axes[0].legend()

    axes[1].set_xlabel("Recall")
    axes[1].set_ylabel("Precision")
    axes[1].set_title("Precision-Recall Curves")
    axes[1].legend()

    plt.tight_layout()
    plt.savefig(output_dir / "roc_pr_curves.png", dpi=150)
    plt.close(fig)

    return {"macro_roc_auc": float(macro_auc)}


def save_feature_importances(model, feature_names, output_dir: Path, prefix: str = ""):
    """Save feature importances to CSV."""
    importances = model.feature_importances_
    imp_df = pd.DataFrame({"feature": feature_names, "importance": importances})
    imp_df = imp_df.sort_values("importance", ascending=False).reset_index(drop=True)
    filename = f"feature_importances{prefix}.csv"
    imp_df.to_csv(output_dir / filename, index=False)
    print(f"Feature importances saved to: {output_dir / filename}")
    return imp_df


def compute_shap(model, X_train_transformed, feature_names, output_dir: Path, sample_size=1500):
    """Compute and save SHAP values safely handling multi-class dimensional quirks."""
    print("\nComputing SHAP values (TreeExplainer)...")
    explainer = shap.TreeExplainer(model)

    sample = X_train_transformed
    if sample.shape[0] > sample_size:
        idx = np.random.RandomState(RANDOM_STATE).choice(sample.shape[0], sample_size, replace=False)
        sample = sample[idx]

    shap_values = explainer.shap_values(sample)

    joblib.dump({"shap_values": shap_values, "sample": sample, "feature_names": feature_names},
                output_dir / "shap_values.joblib")

    plt.figure(figsize=(9, 7))

    # Extract underlying matrix data if SHAP encapsulated it inside an Explanation wrapper
    if hasattr(shap_values, "values"):
        vals = shap_values.values
    else:
        vals = shap_values

    # Cleanly compress multiclass dimensionality down to a strictly 1D feature array
    if isinstance(vals, list):
        mean_abs = np.mean([np.abs(sv).mean(axis=0) for sv in vals], axis=0)
    elif isinstance(vals, np.ndarray) and vals.ndim == 3:
        # Check standard layout: (samples, features, classes) -> average across samples & classes
        if vals.shape[1] == len(feature_names):
            mean_abs = np.abs(vals).mean(axis=(0, 2))
        else:
            # Handle inverted configuration fallback layout: (samples, classes, features)
            mean_abs = np.abs(vals).mean(axis=(0, 1))
    else:
        mean_abs = np.abs(vals).mean(axis=0)

    # Flatten if any loose dimensions linger, guaranteeing smooth indexing/sorting
    mean_abs = np.atleast_1d(mean_abs).ravel()

    order = np.argsort(mean_abs)[::-1][:20]
    plt.barh([feature_names[i] for i in order][::-1], mean_abs[order][::-1], color="#185FA5")
    plt.xlabel("Mean |SHAP value|")
    plt.title("Top 20 Features Driving Risk Predictions")
    plt.tight_layout()
    plt.savefig(output_dir / "shap_summary.png", dpi=150)
    plt.close()

    print(f"SHAP artifacts saved to: {output_dir / 'shap_summary.png'}, "
          f"{output_dir / 'shap_values.joblib'}")

# ===============================
# MAIN
# ===============================

def main():
    parser = argparse.ArgumentParser(description="Train the Smart Ministry Platform risk classifier.")
    parser.add_argument("--data", type=str, default=None, help="Path to digital_transition_projects.csv or ministry_projects.csv")
    parser.add_argument("--tune", action="store_true", help="Run GridSearchCV hyperparameter tuning")
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--no-monotonic", action="store_true", help="Disable monotonic constraints on the classifier")
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    ai_root = script_dir.parent if script_dir.name in ["data", "preprocessing", "training"] else script_dir

    data_path = None
    if args.data:
        data_path = Path(args.data)
    else:
        possible_paths = [
            ai_root / "data" / "digital_transition_projects.csv",
            ai_root / "data" / "ministry_projects.csv",
            ai_root / "data" / "processed_projects.csv",
        ]
        for path in possible_paths:
            if path.exists():
                data_path = path
                break

    if data_path is None:
        raise FileNotFoundError(
            "No data file found. Please ensure one of these files exists:\n"
            f"  - {ai_root / 'data' / 'digital_transition_projects.csv'}\n"
            f"  - {ai_root / 'data' / 'ministry_projects.csv'}\n"
            f"  - {ai_root / 'data' / 'processed_projects.csv'}"
        )

    output_dir = ai_root / "models"
    output_dir.mkdir(exist_ok=True, parents=True)

    print("=" * 70)
    print("DIGITAL TRANSFORMATION PROJECT RISK MODEL TRAINER")
    print("Ministry of Digital Transition and Administration Reform - Morocco")
    print("=" * 70)
    print(f"\nLoading dataset from: {data_path.resolve()}")

    df = load_dataset(data_path)
    X, y_risk_raw, y_success, numeric_columns, categorical_columns = build_xy(df)

    label_encoder = LabelEncoder()
    label_encoder.fit(RISK_ORDER)
    y_risk = label_encoder.transform(y_risk_raw)

    X_train_full, X_test, y_risk_train_full, y_risk_test, y_success_train_full, y_success_test = train_test_split(
        X, y_risk, y_success, test_size=args.test_size, random_state=RANDOM_STATE, stratify=y_risk
    )

    X_train, X_val, y_risk_train, y_risk_val, y_success_train, y_success_val = train_test_split(
        X_train_full, y_risk_train_full, y_success_train_full,
        test_size=0.15, random_state=RANDOM_STATE, stratify=y_risk_train_full
    )

    preprocessor = build_preprocessor(numeric_columns, categorical_columns)
    X_train_t = preprocessor.fit_transform(X_train)
    X_val_t = preprocessor.transform(X_val)
    X_test_t = preprocessor.transform(X_test)
    feature_names = get_output_feature_names(preprocessor, numeric_columns, categorical_columns)

    if hasattr(X_train_t, "toarray"):
        X_train_t = X_train_t.toarray()
        X_val_t = X_val_t.toarray()
        X_test_t = X_test_t.toarray()

    print(f"\nFeature matrix shape: {X_train_t.shape}")
    print(f"Number of features: {len(feature_names)}")

    # ===============================
    # TRAIN CLASSIFIER (Risk Level)
    # ===============================
    print("\n" + "=" * 70)
    print("TRAINING RISK CLASSIFIER")
    print("=" * 70)
    print(f"Training XGBoost on {X_train_t.shape[0]} rows, {X_train_t.shape[1]} features "
          f"(+{X_val_t.shape[0]} held out for early stopping)...")

    monotone_constraints = None if args.no_monotonic else build_monotone_constraints(feature_names)

    classifier, class_params = train_xgboost_classifier(
        X_train_t, y_risk_train, X_val_t, y_risk_val, tune=args.tune,
        monotone_constraints=monotone_constraints
    )

    cv_params = dict(classifier.get_params())
    cv_params.pop("early_stopping_rounds", None)
    if hasattr(classifier, "best_iteration") and classifier.best_iteration is not None:
        cv_params["n_estimators"] = int(classifier.best_iteration) + 1
    cv_model = XGBClassifier(**cv_params)
    cv_scores = cross_val_score(
        cv_model,
        X_train_t, y_risk_train,
        cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE),
        scoring="f1_macro",
    )
    print(f"5-fold CV macro F1: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

    metrics = evaluate_classifier(classifier, X_test_t, y_risk_test, label_encoder, output_dir)
    metrics["classification"]["cv_f1_macro_mean"] = float(cv_scores.mean())
    metrics["classification"]["cv_f1_macro_std"] = float(cv_scores.std())
    metrics["n_train"] = int(X_train_t.shape[0])
    metrics["n_val"] = int(X_val_t.shape[0])
    metrics["n_test"] = int(X_test_t.shape[0])
    metrics["n_features"] = int(X_train_t.shape[1])
    if hasattr(classifier, "best_iteration") and classifier.best_iteration is not None:
        metrics["early_stopping_best_iteration"] = int(classifier.best_iteration)

    roc_metrics = plot_roc_pr_curves(classifier, X_test_t, y_risk_test, label_encoder, output_dir)
    metrics["classification"]["macro_roc_auc"] = roc_metrics["macro_roc_auc"]

    save_feature_importances(classifier, feature_names, output_dir, "_classifier")
    compute_shap(classifier, X_train_t, feature_names, output_dir)

    joblib.dump(classifier, output_dir / "risk_model.joblib")
    joblib.dump(preprocessor, output_dir / "preprocessor.joblib")
    joblib.dump(label_encoder, output_dir / "label_encoder.joblib")

    with open(output_dir / "feature_names.json", "w") as f:
        json.dump(feature_names, f, indent=2)

    # ===============================
    # TRAIN REGRESSOR (Success Probability)
    # ===============================
    if y_success is not None and len(y_success) > 0:
        print("\n" + "=" * 70)
        print("TRAINING SUCCESS PROBABILITY REGRESSOR")
        print("=" * 70)

        regressor, reg_params = train_xgboost_regressor(
            X_train_t, y_success_train, X_val_t, y_success_val, tune=args.tune
        )

        reg_metrics = evaluate_regressor(regressor, X_test_t, y_success_test, output_dir)
        metrics["regression"] = reg_metrics["regression"]

        save_feature_importances(regressor, feature_names, output_dir, "_regressor")

        joblib.dump(regressor, output_dir / "success_model.joblib")

        metrics["regression"]["n_train"] = int(X_train_t.shape[0])
        metrics["regression"]["n_val"] = int(X_val_t.shape[0])
        metrics["regression"]["n_test"] = int(X_test_t.shape[0])
    else:
        print("\n⚠️  Success probability target not found. Skipping regression training.")

    # ===============================
    # SAVE ALL METRICS
    # ===============================
    with open(output_dir / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    print("\n" + "=" * 70)
    print("TRAINING COMPLETE - ARTIFACTS SAVED")
    print("=" * 70)
    print(f"All artifacts saved to: {output_dir.resolve()}")
    acc = metrics["classification"]["accuracy"]
    print(f"\nFinal test accuracy: {acc:.4f} "
          f"({'within expected 85-90% range' if 0.85 <= acc <= 0.90 else 'outside expected 85-90% range — review before trusting'})")
    print("\n✅ Training pipeline completed successfully!")

if __name__ == "__main__":
    main()
