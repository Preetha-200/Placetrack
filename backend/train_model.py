"""
Train and evaluate ML models for Placement Readiness Prediction.
Models evaluated:
1. Logistic Regression
2. Decision Tree Classifier
3. Random Forest Classifier
4. Random Forest Regressor (for continuous score estimation)

Metrics computed:
- Accuracy, Precision (Macro/Weighted), Recall (Macro/Weighted), F1-Score (Macro/Weighted)
- Regressor: MAE, RMSE, R²
- Feature importances

Outputs saved:
- ml/models/evaluation_metrics.json
- ml/models/best_model.joblib
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    mean_absolute_error,
    mean_squared_error,
    r2_score
)

def train_and_evaluate():
    base_dir = os.path.dirname(__file__)
    data_path = os.path.join(base_dir, 'data', 'placement_readiness_dataset.csv')
    models_dir = os.path.join(base_dir, 'models')
    os.makedirs(models_dir, exist_ok=True)

    print(f"Loading training dataset from {data_path}...")
    df = pd.read_csv(data_path)

    feature_cols = [
        'aptitude_score',
        'verbal_score',
        'logical_score',
        'technical_score',
        'completion_rate',
        'mock_interview_score',
        'historical_performance'
    ]

    X = df[feature_cols]
    y_cat = df['readiness_category']
    y_score = df['readiness_score']

    # 80/20 train/test split with stratification on category
    X_train, X_test, y_train_cat, y_test_cat, y_train_score, y_test_score = train_test_split(
        X, y_cat, y_score, test_size=0.20, random_state=42, stratify=y_cat
    )

    print(f"Train samples: {len(X_train)}, Test samples: {len(X_test)}")

    # Standardize features for Logistic Regression
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Class ordering
    classes = ['Needs Improvement', 'Moderate', 'High']

    # 1. Logistic Regression
    print("\n--- Training Model 1: Logistic Regression ---")
    log_reg = LogisticRegression(max_iter=1000, random_state=42)
    log_reg.fit(X_train_scaled, y_train_cat)
    y_pred_lr = log_reg.predict(X_test_scaled)

    lr_acc = float(accuracy_score(y_test_cat, y_pred_lr))
    lr_prec_macro = float(precision_score(y_test_cat, y_pred_lr, average='macro'))
    lr_rec_macro = float(recall_score(y_test_cat, y_pred_lr, average='macro'))
    lr_f1_macro = float(f1_score(y_test_cat, y_pred_lr, average='macro'))
    lr_f1_weighted = float(f1_score(y_test_cat, y_pred_lr, average='weighted'))

    print(f"Logistic Regression -> Accuracy: {lr_acc:.4f}, Precision: {lr_prec_macro:.4f}, Recall: {lr_rec_macro:.4f}, F1: {lr_f1_macro:.4f}")

    # 2. Decision Tree Classifier
    print("\n--- Training Model 2: Decision Tree Classifier ---")
    dt = DecisionTreeClassifier(max_depth=7, min_samples_split=10, min_samples_leaf=5, random_state=42)
    dt.fit(X_train, y_train_cat)
    y_pred_dt = dt.predict(X_test)

    dt_acc = float(accuracy_score(y_test_cat, y_pred_dt))
    dt_prec_macro = float(precision_score(y_test_cat, y_pred_dt, average='macro'))
    dt_rec_macro = float(recall_score(y_test_cat, y_pred_dt, average='macro'))
    dt_f1_macro = float(f1_score(y_test_cat, y_pred_dt, average='macro'))
    dt_f1_weighted = float(f1_score(y_test_cat, y_pred_dt, average='weighted'))

    print(f"Decision Tree -> Accuracy: {dt_acc:.4f}, Precision: {dt_prec_macro:.4f}, Recall: {dt_rec_macro:.4f}, F1: {dt_f1_macro:.4f}")

    # 3. Random Forest Classifier
    print("\n--- Training Model 3: Random Forest Classifier ---")
    rf_clf = RandomForestClassifier(n_estimators=150, max_depth=10, min_samples_split=6, random_state=42, n_jobs=-1)
    rf_clf.fit(X_train, y_train_cat)
    y_pred_rf = rf_clf.predict(X_test)

    rf_acc = float(accuracy_score(y_test_cat, y_pred_rf))
    rf_prec_macro = float(precision_score(y_test_cat, y_pred_rf, average='macro'))
    rf_rec_macro = float(recall_score(y_test_cat, y_pred_rf, average='macro'))
    rf_f1_macro = float(f1_score(y_test_cat, y_pred_rf, average='macro'))
    rf_f1_weighted = float(f1_score(y_test_cat, y_pred_rf, average='weighted'))

    print(f"Random Forest -> Accuracy: {rf_acc:.4f}, Precision: {rf_prec_macro:.4f}, Recall: {rf_rec_macro:.4f}, F1: {rf_f1_macro:.4f}")

    # 4. Random Forest Regressor (for fine-grained Continuous Score Prediction 0-100)
    print("\n--- Training Model 4: Random Forest Regressor (Score Estimation) ---")
    rf_reg = RandomForestRegressor(n_estimators=150, max_depth=12, random_state=42, n_jobs=-1)
    rf_reg.fit(X_train, y_train_score)
    y_pred_reg = rf_reg.predict(X_test)

    reg_mae = float(mean_absolute_error(y_test_score, y_pred_reg))
    reg_rmse = float(np.sqrt(mean_squared_error(y_test_score, y_pred_reg)))
    reg_r2 = float(r2_score(y_test_score, y_pred_reg))
    print(f"Random Forest Regressor -> MAE: {reg_mae:.2f} pts, RMSE: {reg_rmse:.2f}, R²: {reg_r2:.4f}")

    # Feature Importance analysis
    feature_importances = {
        col: round(float(imp) * 100, 2)
        for col, imp in zip(feature_cols, rf_clf.feature_importances_)
    }
    sorted_importance = dict(sorted(feature_importances.items(), key=lambda x: x[1], reverse=True))
    print("\nFeature Importances (%):", sorted_importance)

    # Determine Best Classifier
    models_comparison = {
        'Logistic Regression': {
            'accuracy': round(lr_acc * 100, 2),
            'precision_macro': round(lr_prec_macro * 100, 2),
            'recall_macro': round(lr_rec_macro * 100, 2),
            'f1_score_macro': round(lr_f1_macro * 100, 2),
            'f1_score_weighted': round(lr_f1_weighted * 100, 2)
        },
        'Decision Tree': {
            'accuracy': round(dt_acc * 100, 2),
            'precision_macro': round(dt_prec_macro * 100, 2),
            'recall_macro': round(dt_rec_macro * 100, 2),
            'f1_score_macro': round(dt_f1_macro * 100, 2),
            'f1_score_weighted': round(dt_f1_weighted * 100, 2)
        },
        'Random Forest': {
            'accuracy': round(rf_acc * 100, 2),
            'precision_macro': round(rf_prec_macro * 100, 2),
            'recall_macro': round(rf_rec_macro * 100, 2),
            'f1_score_macro': round(rf_f1_macro * 100, 2),
            'f1_score_weighted': round(rf_f1_weighted * 100, 2)
        }
    }

    # Best model selection by Macro F1
    best_algo = max(models_comparison, key=lambda k: models_comparison[k]['f1_score_macro'])
    print(f"\n[BEST MODEL] Best Algorithm Selected: {best_algo} with F1-Score: {models_comparison[best_algo]['f1_score_macro']}%")

    metrics_payload = {
        'best_algorithm': best_algo,
        'model_version': 'placetrack-rf-v1.0',
        'training_dataset': {
            'total_samples': len(df),
            'train_samples': len(X_train),
            'test_samples': len(X_test),
            'test_split_ratio': 0.20
        },
        'models_comparison': models_comparison,
        'best_model_performance': {
            'accuracy': models_comparison[best_algo]['accuracy'],
            'precision': models_comparison[best_algo]['precision_macro'],
            'recall': models_comparison[best_algo]['recall_macro'],
            'f1_score': models_comparison[best_algo]['f1_score_macro'],
            'regressor_mae': round(reg_mae, 2),
            'regressor_r2': round(reg_r2, 4)
        },
        'feature_importances': sorted_importance,
        'feature_names': feature_cols,
        'classes': classes
    }

    # Save metrics JSON
    metrics_path = os.path.join(models_dir, 'evaluation_metrics.json')
    with open(metrics_path, 'w', encoding='utf-8') as f:
        json.dump(metrics_payload, f, indent=2)
    print(f"[OK] Saved evaluation metrics to: {metrics_path}")

    # Save trained bundle
    model_bundle = {
        'version': 'placetrack-rf-v1.0',
        'classifier': rf_clf if best_algo == 'Random Forest' else log_reg if best_algo == 'Logistic Regression' else dt,
        'regressor': rf_reg,
        'scaler': scaler,
        'feature_names': feature_cols,
        'classes': classes,
        'metrics': metrics_payload['best_model_performance']
    }
    model_save_path = os.path.join(models_dir, 'best_model.joblib')
    joblib.dump(model_bundle, model_save_path)
    print(f"[OK] Saved trained model bundle to: {model_save_path}")

if __name__ == '__main__':
    train_and_evaluate()
