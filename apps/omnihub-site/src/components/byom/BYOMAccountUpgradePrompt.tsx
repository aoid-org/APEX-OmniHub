import React from 'react';

export const BYOMAccountUpgradePrompt: React.FC = () => {
  return (
    <div style={{
      padding: '24px',
      borderRadius: '12px',
      backgroundColor: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border)',
      marginTop: '24px'
    }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px' }}>
        Upgrade to a Managed Account
      </h3>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
        You are currently using APEX OmniHub in BYOM (Bring Your Own Model) mode. Your API key is your identity, and your data is completely sovereign.
        <br/><br/>
        Ready to access advanced features like Persistent Agent Memory, Team Collaboration, and Managed Compute? Upgrade to a managed APEX account.
      </p>
      <button
        type="button"
        style={{
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: 'var(--color-primary)',
        color: 'white',
        cursor: 'pointer',
        fontWeight: 500
      }}>
        Upgrade Now
      </button>
    </div>
  );
};
