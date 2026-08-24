"""
SageMaker Processing script for algorithm backtesting.
Reads historical predictions and actuals, computes metrics per province/variety.
"""
import os
import json
import glob
from typing import Dict, List, Any

import numpy as np
import pandas as pd


INPUT_DIR = '/opt/ml/processing/input/data'
OUTPUT_DIR = '/opt/ml/processing/output'


def compute_mape(actual: np.ndarray, predicted: np.ndarray) -> float:
    """Compute Mean Absolute Percentage Error."""
    mask = actual != 0
    if not mask.any():
        return 0.0
    return float(np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100)


def compute_rmse(actual: np.ndarray, predicted: np.ndarray) -> float:
    """Compute Root Mean Squared Error."""
    return float(np.sqrt(np.mean((actual - predicted) ** 2)))


def compute_mae(actual: np.ndarray, predicted: np.ndarray) -> float:
    """Compute Mean Absolute Error."""
    return float(np.mean(np.abs(actual - predicted)))


def compute_r2(actual: np.ndarray, predicted: np.ndarray) -> float:
    """Compute R-squared coefficient of determination."""
    ss_res = np.sum((actual - predicted) ** 2)
    ss_tot = np.sum((actual - np.mean(actual)) ** 2)
    if ss_tot == 0:
        return 1.0
    return float(1 - (ss_res / ss_tot))


def compute_metrics(actual: np.ndarray, predicted: np.ndarray) -> Dict[str, float]:
    """Compute all metrics for a given actual/predicted pair."""
    return {
        'mape': compute_mape(actual, predicted),
        'rmse': compute_rmse(actual, predicted),
        'mae': compute_mae(actual, predicted),
        'r2': compute_r2(actual, predicted),
    }


def aggregate_by_window(df: pd.DataFrame, window: str = 'D') -> pd.DataFrame:
    """Aggregate time-series data by window (daily or weekly)."""
    if 'timestamp' not in df.columns:
        return df

    df = df.copy()
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.set_index('timestamp')

    numeric_cols = df.select_dtypes(include=[np.number]).columns
    group_cols = [col for col in df.columns if col not in numeric_cols]

    if group_cols:
        aggregated = df.groupby(group_cols).resample(window)[numeric_cols].mean().reset_index()
    else:
        aggregated = df.resample(window)[numeric_cols].mean().reset_index()

    return aggregated


def load_data(input_dir: str) -> pd.DataFrame:
    """Load all CSV files from the input directory."""
    csv_files = glob.glob(os.path.join(input_dir, '**', '*.csv'), recursive=True)

    if not csv_files:
        print(f'No CSV files found in {input_dir}')
        return pd.DataFrame()

    dfs = []
    for f in csv_files:
        print(f'Loading: {f}')
        df = pd.read_csv(f)
        dfs.append(df)

    combined = pd.concat(dfs, ignore_index=True)
    print(f'Loaded {len(combined)} rows from {len(csv_files)} files')
    return combined


def process_backtesting(df: pd.DataFrame) -> Dict[str, Any]:
    """Process backtesting data and compute metrics per province/variety."""
    results: Dict[str, Any] = {
        'overall': {},
        'by_province': {},
        'by_variety': {},
        'daily': {},
        'weekly': {},
    }

    if df.empty:
        print('WARNING: Empty dataframe, returning empty results')
        return results

    # Check required columns
    actual_col = 'actual' if 'actual' in df.columns else None
    predicted_col = 'predicted' if 'predicted' in df.columns else None

    if not actual_col or not predicted_col:
        print('WARNING: Missing actual/predicted columns')
        return results

    actual = df[actual_col].values.astype(float)
    predicted = df[predicted_col].values.astype(float)

    # Overall metrics
    results['overall'] = compute_metrics(actual, predicted)
    print(f'Overall metrics: {results["overall"]}')

    # Metrics by province
    if 'province' in df.columns:
        for province, group in df.groupby('province'):
            province_actual = group[actual_col].values.astype(float)
            province_predicted = group[predicted_col].values.astype(float)
            results['by_province'][str(province)] = compute_metrics(province_actual, province_predicted)

    # Metrics by variety
    if 'variety' in df.columns:
        for variety, group in df.groupby('variety'):
            variety_actual = group[actual_col].values.astype(float)
            variety_predicted = group[predicted_col].values.astype(float)
            results['by_variety'][str(variety)] = compute_metrics(variety_actual, variety_predicted)

    # Daily aggregation
    daily_df = aggregate_by_window(df, 'D')
    if not daily_df.empty and actual_col in daily_df.columns and predicted_col in daily_df.columns:
        daily_actual = daily_df[actual_col].dropna().values.astype(float)
        daily_predicted = daily_df[predicted_col].dropna().values.astype(float)
        min_len = min(len(daily_actual), len(daily_predicted))
        if min_len > 0:
            results['daily'] = compute_metrics(daily_actual[:min_len], daily_predicted[:min_len])

    # Weekly aggregation
    weekly_df = aggregate_by_window(df, 'W')
    if not weekly_df.empty and actual_col in weekly_df.columns and predicted_col in weekly_df.columns:
        weekly_actual = weekly_df[actual_col].dropna().values.astype(float)
        weekly_predicted = weekly_df[predicted_col].dropna().values.astype(float)
        min_len = min(len(weekly_actual), len(weekly_predicted))
        if min_len > 0:
            results['weekly'] = compute_metrics(weekly_actual[:min_len], weekly_predicted[:min_len])

    return results


def main() -> None:
    """Main entry point for the backtesting processor."""
    print('Starting backtesting processor...')
    print(f'Input directory: {INPUT_DIR}')
    print(f'Output directory: {OUTPUT_DIR}')

    # Load data
    df = load_data(INPUT_DIR)

    # Process and compute metrics
    results = process_backtesting(df)

    # Write results
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_path = os.path.join(OUTPUT_DIR, 'backtest_results.json')
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2, default=str)

    print(f'Results written to: {output_path}')
    print(f'Overall MAPE: {results.get("overall", {}).get("mape", "N/A")}')
    print('Backtesting processor completed successfully.')


if __name__ == '__main__':
    main()
