import pandas as pd
import numpy as np
from datetime import date, timedelta

def generate_linkedin_data(n_posts=150, n_days=365, filename="data/linkedin_posts.csv"):
    base_date = date.today()
    post_dates = [base_date - timedelta(days=int(x)) for x in np.random.choice(range(n_days), n_posts, replace=False)]
    post_dates.sort()
    data = {
        'post_id': [f'LI_{i+1:03}' for i in range(n_posts)],
        'post_date': post_dates,
        'content': [f'Insightful post about AI in marketing, topic #{i+1}.' for i in range(n_posts)],
        'likes': np.random.randint(20, 500, size=n_posts),
        'comments': np.random.randint(5, 100, size=n_posts),
        'shares': np.random.randint(2, 50, size=n_posts),
        'impressions': np.random.randint(1000, 15000, size=n_posts)
    }
    df = pd.DataFrame(data)
    df.to_csv(filename, index=False)

if __name__ == '__main__':
    generate_linkedin_data()