import React from 'react';

export const Layout: React.FC<{
  commandBar: React.ReactNode;
  dataStrip: React.ReactNode;
  intelligencePanelLeft: React.ReactNode;
  intelligencePanelRight: React.ReactNode;
}> = ({ commandBar, dataStrip, intelligencePanelLeft, intelligencePanelRight }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Zone 1: Command Bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)' }}>
        {commandBar}
      </div>

      {/* Zone 2: Data Strip */}
      <div style={{ padding: '0 24px', marginTop: '24px' }}>
        {dataStrip}
      </div>

      {/* Zone 3: Intelligence Panel */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', 
        gap: '24px', 
        padding: '24px',
        flex: 1
      }}
      className="responsive-grid"
      >
        <div className="glass-panel" style={{ height: 'calc(100vh - 250px)', minHeight: '400px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <h3 className="text-section-header" style={{ padding: '24px 24px 0 24px' }}>Scope 3 Supply Chain Network</h3>
          <div style={{ flex: 1, position: 'relative' }}>
            {intelligencePanelLeft}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {intelligencePanelRight}
        </div>
      </div>
    </div>
  );
};
