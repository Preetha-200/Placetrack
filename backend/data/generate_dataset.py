"""
Generate a realistic, statistically sound labelled training dataset for campus placement readiness.
Features:
- aptitude_score: 30-100 (Quantitative problem solving)
- verbal_score: 30-100 (Grammar, vocabulary, reading comprehension)
- logical_score: 30-100 (Deductive reasoning, puzzles, patterns)
- technical_score: 30-100 (Data structures, algorithms, SQL, core CS)
- completion_rate: 10-100 (Assessment assignment completion percentage)
- mock_interview_score: 30-100 (Communication, technical viva, problem breakdown)
- historical_performance: 30-100 (Past test score baseline)

Targets:
- readiness_score: Continuous (0 - 100)
- readiness_category: 'High' (>= 75), 'Moderate' (60 to 74), 'Needs Improvement' (< 60)
"""

import os
import numpy as np
import pandas as pd

def generate_placement_dataset(num_samples: int = 2000, random_seed: int = 42) -> pd.DataFrame:
    np.random.seed(random_seed)

    # Correlated academic skill profiles
    # Base general capability factor
    g_factor = np.random.normal(loc=70, scale=14, size=num_samples)
    g_factor = np.clip(g_factor, 40, 95)

    # Domain scores with realistic variation around general capability
    aptitude = np.clip(g_factor + np.random.normal(0, 10, num_samples), 30, 100)
    verbal = np.clip(g_factor + np.random.normal(-2, 12, num_samples), 30, 100)
    logical = np.clip(g_factor + np.random.normal(1, 9, num_samples), 30, 100)
    technical = np.clip(g_factor + np.random.normal(3, 11, num_samples), 30, 100)

    # Completion rate depends on diligence, loosely correlated with g_factor
    completion_rate = np.clip(
        0.5 * g_factor + np.random.normal(loc=35, scale=15, size=num_samples), 15, 100
    )

    # Mock interview score
    mock_interview = np.clip(
        0.35 * verbal + 0.35 * technical + np.random.normal(loc=15, scale=10, size=num_samples),
        30,
        100
    )

    # Historical baseline
    historical = np.clip(
        0.25 * aptitude + 0.25 * verbal + 0.25 * logical + 0.25 * technical + np.random.normal(0, 5, num_samples),
        30,
        100
    )

    # Calculate ground truth readiness score with realistic recruitment weights:
    # Technical (30%), Aptitude (20%), Logical (15%), Verbal (15%), Mock Interview (10%), Completion Rate (10%)
    raw_readiness = (
        0.28 * technical +
        0.20 * aptitude +
        0.16 * logical +
        0.16 * verbal +
        0.10 * mock_interview +
        0.10 * completion_rate +
        np.random.normal(0, 2.5, num_samples) # slight environmental variance
    )

    # Penalty if any core technical or aptitude is critically low (< 45)
    critical_flaw = (technical < 45) | (aptitude < 45)
    raw_readiness[critical_flaw] = np.minimum(raw_readiness[critical_flaw], 58.0)

    # Penalty if completion rate is critically low (< 35)
    low_engagement = completion_rate < 35
    raw_readiness[low_engagement] -= 8.0

    readiness_score = np.round(np.clip(raw_readiness, 10, 100), 1)

    # Categorize
    categories = []
    for score in readiness_score:
        if score >= 75.0:
            categories.append('High')
        elif score >= 60.0:
            categories.append('Moderate')
        else:
            categories.append('Needs Improvement')

    df = pd.DataFrame({
        'aptitude_score': np.round(aptitude, 1),
        'verbal_score': np.round(verbal, 1),
        'logical_score': np.round(logical, 1),
        'technical_score': np.round(technical, 1),
        'completion_rate': np.round(completion_rate, 1),
        'mock_interview_score': np.round(mock_interview, 1),
        'historical_performance': np.round(historical, 1),
        'readiness_score': readiness_score,
        'readiness_category': categories
    })

    return df

if __name__ == '__main__':
    data_dir = os.path.join(os.path.dirname(__file__))
    os.makedirs(data_dir, exist_ok=True)
    csv_path = os.path.join(data_dir, 'placement_readiness_dataset.csv')

    df = generate_placement_dataset(num_samples=2500)
    df.to_csv(csv_path, index=False)
    print(f"Generated {len(df)} samples saved to: {csv_path}")
    print("\nDataset Class Distribution:")
    print(df['readiness_category'].value_counts(normalize=True).round(3) * 100)
    print("\nDataset Summary:")
    print(df.describe().round(2))
