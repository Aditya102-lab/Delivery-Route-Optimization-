import React from 'react';
import { Package } from 'lucide-react';

const OutputPanel = ({ nodes, edges, mstEdges, totalCost }) => {
  // Calculate potential savings: Total of all roads minus Total Cost of MST
  const totalPossibleDistance = edges.reduce((acc, edge) => acc + edge.weight, 0);
  const distanceSaved = totalPossibleDistance - totalCost;

  // Process steps for UI
  const deliverySteps = mstEdges.map((edgeId, index) => {
    const edge = edges.find(e => e.id === edgeId);
    if (!edge) return null;
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    return (
      <div key={edgeId} style={{ padding: '0.5rem', background: 'var(--bg-card)', borderRadius: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Step {index + 1}:</span><br/>
        <strong>{sourceNode?.name}</strong> <span style={{ color: 'var(--accent-primary)' }}>→</span> <strong>{targetNode?.name}</strong> 
        <span style={{ float: 'right', color: 'var(--accent-success)' }}>{edge.weight.toFixed(1)} km</span>
      </div>
    );
  });

  return (
    <div className="card toolbar" style={{ flexShrink: 0 }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Package size={20} className="text-accent-success" />
        Delivery Result
      </h3>

      {mstEdges.length > 0 ? (
        <div style={{ flexGrow: 1, overflowY: 'auto' }}>
          {deliverySteps}
        </div>
      ) : (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', flexGrow: 1 }}>
          Run the optimization to generate the fastest delivery route.
        </div>
      )}

      <div style={{ marginTop: 'auto', background: 'var(--bg-primary)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Optimized Distance</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
            {totalCost > 0 ? `${totalCost.toFixed(1)} km` : '--'}
          </div>
        </div>

        {mstEdges.length > 0 && distanceSaved > 0 && (
          <div style={{ paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)' }}>
             <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Distance Saved</div>
             <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-success)' }}>
               {distanceSaved.toFixed(1)} km
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputPanel;
