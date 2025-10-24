import pandas as pd
import numpy as np
from datetime import date, timedelta

def generate_web_data(n_days=365, filename="data/web_analytics_daily.csv"):
    base_date = date.today()
    date_range = [base_date - timedelta(days=x) for x in range(n_days)]
    date_range.reverse()
    data = {
        'date': date_range,
        'page_views': np.random.randint(1000, 5000, size=n_days),
        'unique_visitors': np.random.randint(500, 2500, size=n_days),
        'bounce_rate': np.random.uniform(0.3, 0.7, size=n_days),
        'avg_session_duration': np.random.uniform(60, 300, size=n_days)
    }
    df = pd.DataFrame(data)
    df.to_csv(filename, index=False)

if __name__ == '__main__':
    generate_web_data()