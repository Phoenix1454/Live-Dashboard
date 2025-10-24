import pandas as pd
import numpy as np
from datetime import date, timedelta

def generate_seo_data(n_days=365, filename="data/seo_metrics_daily.csv"):
    base_date = date.today()
    date_range = [base_date - timedelta(days=x) for x in range(n_days)]
    date_range.reverse()
    
    keywords = ['marketing analytics', 'ai for business', 'customer segmentation', 'sales forecasting']
    
    records = []
    for day in date_range:
        for keyword in keywords:
            records.append({
                'date': day,
                'keyword': keyword,
                'rank': np.random.randint(1, 50),
                'clicks': np.random.randint(5, 100),
                'impressions': np.random.randint(1000, 20000)
            })
    
    df = pd.DataFrame(records)
    df['ctr'] = df['clicks'].div(df['impressions']).fillna(0)
    df.to_csv(filename, index=False)

if __name__ == '__main__':
    generate_seo_data()