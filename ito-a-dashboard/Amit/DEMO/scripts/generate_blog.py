import pandas as pd
import numpy as np
from datetime import date, timedelta

def generate_blog_data(n_posts=24, n_days=365, filename="data/blog_posts.csv"):
    base_date = date.today()
    publish_dates = [base_date - timedelta(days=int(x)) for x in np.random.choice(range(n_days), n_posts, replace=False)]
    publish_dates.sort()
    data = {
        'blog_id': [f'BLOG_{i+1:03}' for i in range(n_posts)],
        'publish_date': publish_dates,
        'title': [f'The Ultimate Guide to Topic {i+1}' for i in range(n_posts)],
        'author': np.random.choice(['Alice', 'Bob', 'Charlie'], size=n_posts),
        'views': np.random.randint(500, 10000, size=n_posts),
        'comments': np.random.randint(10, 200, size=n_posts),
        'shares': np.random.randint(5, 150, size=n_posts),
        'clicks': np.random.randint(50, 1000, size=n_posts)
    }
    df = pd.DataFrame(data)
    df.to_csv(filename, index=False)

if __name__ == '__main__':
    generate_blog_data()