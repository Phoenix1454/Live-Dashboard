import pandas as pd
import numpy as np
from datetime import date, timedelta

def generate_email_data(n_campaigns=52, filename="data/email_campaigns.csv"):
    base_date = date.today()
    send_dates = [base_date - timedelta(weeks=x) for x in range(n_campaigns)]
    send_dates.reverse()

    list_sizes = []
    current_size = 10000
    for _ in range(n_campaigns):
        list_sizes.append(current_size)
        current_size += np.random.randint(50, 250)

    df = pd.DataFrame({
        'campaign_id': [f'ECID_{i+1:03}' for i in range(n_campaigns)],
        'send_date': send_dates,
        'subject_line': [f'Weekly Update & Offers - Vol. {i+1}' for i in range(n_campaigns)],
        'list_size': list_sizes
    })

    df['list_growth'] = df['list_size'].pct_change().fillna(0)
    df['recipients'] = df['list_size']
    df['sends'] = (df['recipients'] * np.random.uniform(0.98, 0.999)).astype(int)
    df['opens'] = (df['sends'] * np.random.uniform(0.18, 0.45)).astype(int)
    df['clicks'] = (df['opens'] * np.random.uniform(0.05, 0.20)).astype(int)
    df['unsubscribe'] = (df['opens'] * np.random.uniform(0.005, 0.015)).astype(int)
    df['open_rate'] = df['opens'] / df['sends']
    df['click_through_rate'] = df['clicks'] / df['sends']
    df['CTOR'] = df['clicks'] / df['opens']
    
    df.fillna(0, inplace=True)
    final_columns = [
        'campaign_id', 'send_date', 'subject_line', 'recipients',
        'list_size', 'list_growth', 'sends', 'opens', 'clicks',
        'unsubscribe', 'open_rate', 'click_through_rate', 'CTOR'
    ]
    df = df[final_columns]
    df.to_csv(filename, index=False)

if __name__ == '__main__':
    generate_email_data()