import { useState } from 'react';
import { OverviewTab } from '../components/OverviewTab';
import { EmailTab } from '../components/EmailTab';
import { LinkedInTab } from '../components/LinkedInTab';
import { BlogTab } from '../components/BlogTab';
import { SEOTab } from '../components/SEOTab';
import { WebAnalyticsTab } from '../components/WebAnalyticsTab';
import { UploadCSVTab } from '../components/UploadCSVTab';

interface DashboardProps {
  activeTab: string;
}

export function Dashboard({ activeTab }: DashboardProps) {
  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'email':
        return <EmailTab />;
      case 'linkedin':
        return <LinkedInTab />;
      case 'blog':
        return <BlogTab />;
      case 'seo':
        return <SEOTab />;
      case 'web':
        return <WebAnalyticsTab />;
      case 'upload':
        return <UploadCSVTab />;
      default:
        return <OverviewTab />;
    }
  };

  return <>{renderContent()}</>;
}
