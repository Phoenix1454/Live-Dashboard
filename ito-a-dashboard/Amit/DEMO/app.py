import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler

# --- Page Config ---
st.set_page_config(page_title="Smart Analytics for Growth", layout="wide", page_icon="📊")

# --- Data Loading and Processing ---
@st.cache_data
def load_all_data():
    """
    Loads all 5 data sources from /data, processes them, 
    and returns a dictionary of dataframes and the merged master_df.
    """
    try:
        data_sources = {
            'email': pd.read_csv('data/email_campaigns.csv'),
            'linkedin': pd.read_csv('data/linkedin_posts.csv'),
            'blog': pd.read_csv('data/blog_posts.csv'),
            'web': pd.read_csv('data/web_analytics_daily.csv'),
            'seo': pd.read_csv('data/seo_metrics_daily.csv')
        }
    except FileNotFoundError as e:
        st.error(f"Error: {e}. Please make sure all 5 CSV files are in the /data folder.")
        return None, None

    # Convert date columns
    for df_name, date_col in [('email', 'send_date'), ('linkedin', 'post_date'), ('blog', 'publish_date'), ('web', 'date'), ('seo', 'date')]:
        data_sources[df_name][date_col] = pd.to_datetime(data_sources[df_name][date_col])

    # Aggregate and Merge for Master DF
    daily_email = data_sources['email'].groupby('send_date')[['sends', 'opens', 'clicks']].sum().reset_index().rename(columns={'send_date': 'date', 'clicks': 'email_clicks'})
    daily_linkedin = data_sources['linkedin'].groupby('post_date')[['likes', 'comments', 'shares', 'impressions']].sum().reset_index().rename(columns={'post_date': 'date'})
    daily_blog = data_sources['blog'].groupby('publish_date')[['views', 'comments', 'shares']].sum().reset_index().rename(columns={'publish_date': 'date', 'comments': 'blog_comments', 'shares': 'blog_shares'})
    daily_seo = data_sources['seo'].groupby('date')[['clicks', 'impressions']].sum().reset_index().rename(columns={'clicks': 'seo_clicks', 'impressions': 'seo_impressions'})
    
    master_df = data_sources['web'].copy()
    for df_to_merge in [daily_email, daily_linkedin, daily_blog, daily_seo]:
        master_df = pd.merge(master_df, df_to_merge, on='date', how='left')

    master_df = master_df.fillna(0)
    master_df['total_social_engagement'] = master_df['likes'] + master_df['comments'] + master_df['shares'] + master_df['blog_comments'] + master_df['blog_shares']
    
    return data_sources, master_df

# --- Machine Learning Functions ---
@st.cache_data
def run_visitor_forecasting(_df):
    """Runs a model to find drivers of future visitors."""
    df_model = _df.copy()
    df_model['target_visitors'] = df_model['unique_visitors'].shift(-1)
    df_model.dropna(inplace=True)
    
    features = ['page_views', 'sends', 'total_social_engagement', 'seo_clicks']
    # Ensure all features exist, fill with 0 if not (for robustness)
    for f in features:
        if f not in df_model.columns:
            df_model[f] = 0
            
    X = df_model[features]
    y = df_model['target_visitors']
    
    regressor = RandomForestRegressor(random_state=42)
    regressor.fit(X, y)
    importances = pd.Series(regressor.feature_importances_, index=features).sort_values(ascending=False)
    return importances

# --- Recommendation Engine ---
def generate_overview_recommendations(importances, master_df):
    """Generates recommendations for the main overview tab."""
    recs = []
    top_feature = importances.index[0]
    recs.append(f"**Prioritize `{top_feature}`:** The model shows this is your #1 driver for future website visitors. Double down on this activity.")
    
    if importances['seo_clicks'] > (master_df['email_clicks'].sum() / master_df['sends'].sum() if master_df['sends'].sum() > 0 else 0):
         recs.append("**Boost SEO Efforts:** SEO is currently a powerful driver for traffic. Consider investing more in keyword optimization.")
    else:
        recs.append("**Enhance Email Campaigns:** Email is a strong traffic driver. Focus on list growth and compelling calls-to-action.")
    return recs

# --- Reusable Analytics Functions ---
def display_email_analytics(df_email):
    """Displays the analytics and recommendations for an email dataframe."""
    st.subheader("💡 Recommendations")
    avg_ctor = df_email['CTOR'].mean()
    st.info(f"**Improve CTOR:** Your average click-to-open rate is {avg_ctor:.2%}. Aim to increase this by using stronger calls-to-action.")
    st.info(f"**Analyze Top Subject:** Your best campaign had an open rate of {df_email['open_rate'].max():.2%}. Use its subject line style as a template.")

    col1, col2 = st.columns(2)
    with col1:
        st.metric("Total Campaigns", f"{df_email.shape[0]}")
        st.metric("Avg. Open Rate", f"{df_email['open_rate'].mean():.2%}")
        st.metric("Avg. CTOR", f"{df_email['CTOR'].mean():.2%}")
    with col2:
        fig_funnel = go.Figure(go.Funnel(
            y = ["Sends", "Opens", "Clicks"],
            x = [df_email['sends'].sum(), df_email['opens'].sum(), df_email['clicks'].sum()]
        ))
        fig_funnel.update_layout(title="Email Funnel Performance")
        st.plotly_chart(fig_funnel, use_container_width=True)

def display_linkedin_analytics(df_linkedin):
    """Displays the analytics and recommendations for a LinkedIn dataframe."""
    st.subheader("💡 Recommendations")
    top_post = df_linkedin.loc[df_linkedin['impressions'].idxmax()]
    st.info(f"**Replicate Success:** Your post from `{top_post['post_date'].date()}` had the most impressions ({top_post['impressions']:,}). Analyze its content and format.")
    
    col1, col2 = st.columns(2)
    with col1:
         st.metric("Total Posts", f"{df_linkedin.shape[0]}")
         st.metric("Total Impressions", f"{df_linkedin['impressions'].sum():,}")
         st.metric("Total Engagement", f"{df_linkedin['likes'].sum() + df_linkedin['comments'].sum() + df_linkedin['shares'].sum():,}")
    with col2:
        df_linkedin_sorted = df_linkedin.sort_values(by='impressions', ascending=False).head(10)
        fig_bar = px.bar(df_linkedin_sorted, x='impressions', y='content', orientation='h', title='Top 10 Posts by Impressions')
        st.plotly_chart(fig_bar, use_container_width=True)

# (You can create similar functions for Blog, SEO, and Web)

# --- Main App ---
st.title("📊 Smart Analytics for Growth")
st.markdown("An AI-Powered Marketing Dashboard for **ItoA**.")

# Load all data
data_sources, master_df = load_all_data()

if data_sources is not None:
    # --- Create Tabs ---
    tab1, tab2, tab3, tab4, tab5, tab6, tab7 = st.tabs([
        "📈 Overview", 
        "📧 Email", 
        "🔗 LinkedIn", 
        "📝 Blog", 
        "🔍 SEO", 
        "🌐 Web Analytics", 
        "⬆️ Upload & Analyze"
    ])

    # --- Tab 1: Overview ---
    with tab1:
        st.header("Combined Performance Overview")
        
        # --- Top Level KPIs ---
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("Total Visitors", f"{master_df['unique_visitors'].sum():,}")
        col2.metric("Total Engagement", f"{master_df['total_social_engagement'].sum():,}")
        col3.metric("Email Clicks", f"{master_df['email_clicks'].sum():,}")
        col4.metric("SEO Clicks", f"{master_df['seo_clicks'].sum():,}")
        
        st.markdown("---")
        
        # --- Main Time-Series Chart ---
        st.subheader("Key Metrics Over Time")
        fig_time = px.line(master_df, x='date', y=['unique_visitors', 'total_social_engagement'], title='Website Visitors vs. Social Engagement')
        fig_time.update_layout(legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1))
        st.plotly_chart(fig_time, use_container_width=True)

        # --- AI Insights Section ---
        st.header("🤖 AI-Powered Insights")
        feature_importances = run_visitor_forecasting(master_df)
        recommendations = generate_overview_recommendations(feature_importances, master_df)
        
        st.subheader("💡 Key Recommendations")
        for rec in recommendations:
            st.info(rec)

        st.subheader("What Drives Future Website Visitors?")
        fig_imp = px.bar(feature_importances, orientation='h', title='Feature Importance for Predicting Future Visitors')
        st.plotly_chart(fig_imp, use_container_width=True)

    # --- Tab 2: Email ---
    with tab2:
        st.header("📧 Email Campaign Analytics")
        display_email_analytics(data_sources['email'])

    # --- Tab 3: LinkedIn ---
    with tab3:
        st.header("🔗 LinkedIn Performance")
        display_linkedin_analytics(data_sources['linkedin'])
            
    # --- Placeholder Tabs ---
    with tab4: 
        st.header("📝 Blog Post Analytics")
        st.warning("Analytics for this section are under development. Use the 'Upload & Analyze' tab to check your own data.")
    with tab5: 
        st.header("🔍 SEO Analytics")
        st.warning("Analytics for this section are under development. Use the 'Upload & Analyze' tab to check your own data.")
    with tab6: 
        st.header("🌐 Web Analytics Deep Dive")
        st.warning("Analytics for this section are under development. Use the 'Upload & Analyze' tab to check your own data.")

    # --- Tab 7: Upload & Analyze ---
    with tab7:
        st.header("⬆️ Analyze Your Own CSV Data")
        st.markdown("Select the type of marketing data you want to analyze and upload your CSV file.")

        channel_type = st.selectbox(
            "Select Channel Data Type",
            ("--- Select ---", "Email", "LinkedIn", "Blog", "SEO", "Web Analytics")
        )

        uploaded_file = st.file_uploader("Upload your CSV file", type="csv")

        if st.button("Generate Analysis"):
            if channel_type == "--- Select ---":
                st.error("Please select a channel data type first.")
            elif uploaded_file is None:
                st.error("Please upload a CSV file first.")
            else:
                try:
                    # Read the uploaded file into a dataframe
                    user_df = pd.read_csv(uploaded_file)
                    st.success("File analyzed successfully! Here are your results:")

                    # --- This is the core logic: Display analysis based on the selected channel ---
                    if channel_type == "Email":
                        # Convert date col for safety
                        user_df['send_date'] = pd.to_datetime(user_df['send_date'])
                        display_email_analytics(user_df)

                    elif channel_type == "LinkedIn":
                        # Convert date col for safety
                        user_df['post_date'] = pd.to_datetime(user_df['post_date'])
                        display_linkedin_analytics(user_df)
                    
                    # Add elif blocks for Blog, SEO, and Web Analytics
                    # elif channel_type == "Blog":
                    #    display_blog_analytics(user_df)
                    
                    else:
                        st.warning("Analysis for this channel is not yet implemented.")

                except Exception as e:
                    st.error(f"An error occurred during analysis: {e}")
                    st.error("Please ensure your CSV format matches the data dictionary for the selected channel.")