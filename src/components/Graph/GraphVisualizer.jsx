import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import ControlsPanel from './ControlsPanel';
import OutputPanel from './OutputPanel';

const GraphVisualizer = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [mode, setMode] = useState('addNode'); // 'addNode', 'addEdge'
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [activeProcessingNode, setActiveProcessingNode] = useState(null);
  
  const [mstEdges, setMstEdges] = useState([]);
  const [totalCost, setTotalCost] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const svgRef = useRef(null);

  // Dragging State Refs to avoid triggering continuous renders until move completes if we optimize, 
  // but for smooth visual updates we can update state directly.
  const dragState = useRef({ isDragging: false, nodeId: null, startX: 0, startY: 0, hasMoved: false });

  // Custom Dialog State
  const [dialogState, setDialogState] = useState({ isOpen: false, type: 'add', sourceNode: null, targetNode: null, editEdgeId: null });
  const [edgeWeightInput, setEdgeWeightInput] = useState('1.5');

  // Generate unique IDs and names
  const generateId = () => Math.random().toString(36).substr(2, 9);
  
  const getNextNodeName = () => {
    if (nodes.length === 0) return "Restaurant 🍔";
    const charCode = 64 + nodes.length; // 65 = A
    return `Customer ${String.fromCharCode(charCode)}`;
  };

  // ----------------------------------------------------
  // Interactions: Dragging & Clicking Let's map it cleanly
  // ----------------------------------------------------

  const handlePointerDown = (nodeId, e) => {
    if (isAnimating || dialogState.isOpen) return;
    
    // Capture the pointer to our SVG element so dragging outside boundaries still fires events reliably
    e.target.setPointerCapture(e.pointerId);

    dragState.current = {
      isDragging: true,
      nodeId: nodeId,
      startX: e.clientX,
      startY: e.clientY,
      hasMoved: false
    };
  };

  const handlePointerMove = (e) => {
    if (!dragState.current.isDragging || isAnimating) return;
    
    // Ensure we actually dragged it more than 3px to prevent micro-jitters counting as drags
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragState.current.hasMoved = true;
    }

    if (dragState.current.hasMoved) {
      const rect = svgRef.current.getBoundingClientRect();
      const newX = e.clientX - rect.left;
      const newY = e.clientY - rect.top;

      setNodes(prev => prev.map(n => n.id === dragState.current.nodeId ? { ...n, x: newX, y: newY } : n));
      
      // If we move the map, we invalidate the current optimized routes because distances logically changed visually
      if (mstEdges.length > 0) {
        setMstEdges([]);
        setTotalCost(0);
      }
    }
  };

  const handlePointerUpNode = (nodeId, e) => {
     if (isAnimating || dialogState.isOpen) return;
     if (dragState.current.isDragging) {
        e.target.releasePointerCapture(e.pointerId);
        const wasDragged = dragState.current.hasMoved;
        
        // Reset drag lock
        dragState.current = { isDragging: false, nodeId: null, startX: 0, startY: 0, hasMoved: false };

        // If it was just a clean click without dragging, process Node Selection
        if (!wasDragged) {
            processNodeClickLogic(nodeId);
        }
     }
  };

  const processNodeClickLogic = (nodeId) => {
    if (mode !== 'addEdge') return;

    if (!selectedNodeId) {
      setSelectedNodeId(nodeId);
    } else {
      if (selectedNodeId !== nodeId) {
        // Prevent duplicate edges
        const exists = edges.find(
          edge => (edge.source === selectedNodeId && edge.target === nodeId) ||
                  (edge.source === nodeId && edge.target === selectedNodeId)
        );
        if (!exists) {
          setDialogState({ isOpen: true, type: 'add', sourceNode: selectedNodeId, targetNode: nodeId, editEdgeId: null });
        }
      }
      setSelectedNodeId(null);
    }
  };

  const handleSvgBackgroundClick = (e) => {
    if (mode !== 'addNode' || isAnimating || dialogState.isOpen) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cityName = getNextNodeName();
    setNodes([...nodes, { id: generateId(), x, y, name: cityName, isRestaurant: nodes.length === 0 }]);
    setMstEdges([]);
    setTotalCost(0);
  };

  const handleEdgeClick = (edgeId, currentWeight, e) => {
    e.stopPropagation(); // prevent SVG bg click
    if (isAnimating || dialogState.isOpen) return;

    setEdgeWeightInput(currentWeight.toString());
    setDialogState({ isOpen: true, type: 'edit', editEdgeId: edgeId, sourceNode: null, targetNode: null });
  };

  // ----------------------------------------------------
  // Dialog Actions
  // ----------------------------------------------------
  const confirmDialogAction = () => {
    const weight = parseFloat(edgeWeightInput);
    if (!isNaN(weight) && weight > 0) {
      if (dialogState.type === 'add') {
        setEdges([...edges, { id: generateId(), source: dialogState.sourceNode, target: dialogState.targetNode, weight }]);
      } else if (dialogState.type === 'edit') {
        setEdges(prev => prev.map(e => e.id === dialogState.editEdgeId ? { ...e, weight } : e));
      }
      // Any logic changes wipe the current route output
      setMstEdges([]);
      setTotalCost(0);
    }
    setDialogState({ isOpen: false, type: 'add', sourceNode: null, targetNode: null, editEdgeId: null });
  };


  // ----------------------------------------------------
  // Prim's Algorithm
  // ----------------------------------------------------
  const runPrimsAlgorithm = async () => {
    if (nodes.length === 0 || edges.length === 0 || isAnimating) return;
    setIsAnimating(true);
    setMstEdges([]);
    setTotalCost(0);
    setActiveProcessingNode(null);

    // Always start from Restaurant (node 0)
    let visited = new Set([nodes[0].id]);
    let currentMst = [];
    let currentCost = 0;

    while (visited.size < nodes.length) {
      let minEdge = null;
      let minWeight = Infinity;
      let nextNode = null;
      let expandingFromNode = null;

      // Find shortest edge from visited to unvisited
      for (const edge of edges) {
        let isSourceVisited = visited.has(edge.source);
        let isTargetVisited = visited.has(edge.target);

        if (isSourceVisited !== isTargetVisited) {
          if (edge.weight < minWeight) {
            minWeight = edge.weight;
            minEdge = edge;
            nextNode = isSourceVisited ? edge.target : edge.source;
            expandingFromNode = isSourceVisited ? edge.source : edge.target;
          }
        }
      }

      if (!minEdge) break;

      // Highlight the node we are expanding from
      setActiveProcessingNode(expandingFromNode);
      await new Promise(res => setTimeout(res, 1000)); // 1 second delay requirement

      visited.add(nextNode);
      currentMst.push(minEdge.id);
      currentCost += minWeight;

      setMstEdges([...currentMst]);
      setTotalCost(currentCost);
      setActiveProcessingNode(nextNode); // Highlight the newly discovered node briefly
      await new Promise(res => setTimeout(res, 500)); 
    }

    if (visited.size < nodes.length) {
      alert("Some customers are completely disconnected! Generated partial route.");
    }
    
    setActiveProcessingNode(null);
    setIsAnimating(false);
  };

  const resetGraph = () => {
    if (isAnimating) return;
    if (window.confirm('Clear all locations and roads?')) {
      setNodes([]);
      setEdges([]);
      setMstEdges([]);
      setTotalCost(0);
      setSelectedNodeId(null);
    }
  };

  const getMidpoint = (sourceId, targetId) => {
    const s = nodes.find(n => n.id === sourceId);
    const t = nodes.find(n => n.id === targetId);
    if (!s || !t) return { x: 0, y: 0 };
    return { x: (s.x + t.x) / 2, y: (s.y + t.y) / 2 };
  };

  return (
    <div className="viz-container">
      <ControlsPanel 
        mode={mode} 
        setMode={setMode} 
        resetGraph={resetGraph} 
        runPrimsAlgorithm={runPrimsAlgorithm} 
        isAnimating={isAnimating} 
        nodes={nodes} 
        edges={edges} 
      />

      <div className="viz-workspace" style={{ cursor: mode === 'addNode' ? 'crosshair' : 'default', minWidth: '500px' }}>
        <svg 
          ref={svgRef} 
          width="100%" 
          height="100%" 
          onPointerDown={handleSvgBackgroundClick} 
          onPointerMove={handlePointerMove}
          onPointerUp={() => { if(dragState.current.isDragging) dragState.current.isDragging = false; }} // fallback
        >
          {/* Edges */}
          {edges.map(edge => {
            const s = nodes.find(n => n.id === edge.source);
            const t = nodes.find(n => n.id === edge.target);
            if (!s || !t) return null;
            
            const isMst = mstEdges.includes(edge.id);
            const mid = getMidpoint(edge.source, edge.target);
            
            return (
              <g key={edge.id}>
                <motion.line
                  x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                  stroke={isMst ? 'var(--accent-success)' : 'var(--border-color)'}
                  strokeWidth={isMst ? 4 : 2}
                  className={isMst ? "" : "edge-line-normal"}
                  animate={{ stroke: isMst ? '#10b981' : '#475569' }}
                  transition={{ duration: 0.5 }}
                />
                
                {/* Clickable Edge Weight Group */}
                <g 
                  style={{ cursor: isAnimating ? 'default' : 'pointer' }}
                  onPointerDown={(e) => { e.stopPropagation(); handleEdgeClick(edge.id, edge.weight, e); }}
                >
                  {/* Invisible larger rect to make the click target forgiving */}
                  <rect x={mid.x - 24} y={mid.y - 18} width={48} height={36} fill="transparent" />
                  <rect 
                    x={mid.x - 18} y={mid.y - 12} 
                    width={36} height={24} 
                    rx={4} ry={4} 
                    className="edge-weight-bg" 
                  />
                  <text x={mid.x} y={mid.y + 4} textAnchor="middle" className="edge-weight-text">
                    {edge.weight.toFixed(1)} km
                  </text>
                </g>
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const isSelected = selectedNodeId === node.id;
            const isProcessing = activeProcessingNode === node.id;
            
            let nodeClass = "delivery-node-customer";
            if (node.isRestaurant) nodeClass = "delivery-node-restaurant";
            if (isProcessing) nodeClass = "delivery-node-active";

            return (
              <g 
                key={node.id} 
                onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(node.id, e); }}
                onPointerUp={(e) => { e.stopPropagation(); handlePointerUpNode(node.id, e); }}
                style={{ cursor: isAnimating ? 'default' : (mode === 'addEdge' ? 'crosshair' : 'grab') }}
              >
                <motion.circle
                  cx={node.x} cy={node.y} r={18}
                  className={nodeClass}
                  strokeWidth={isSelected || isProcessing ? 3 : 2}
                  initial={{ scale: 0 }}
                  animate={{ scale: isSelected ? 1.2 : 1 }}
                  transition={{ type: "spring" }}
                />
                <rect x={node.x - 40} y={node.y - 42} width={80} height={18} fill="rgba(15, 23, 42, 0.6)" rx={4} style={{ pointerEvents: 'none' }} />
                <text 
                  x={node.x} y={node.y - 29} textAnchor="middle" 
                  fill={node.isRestaurant ? "#fbbf24" : "var(--text-primary)"} 
                  fontSize="12px" fontWeight="600" style={{ pointerEvents: 'none' }}
                >
                  {node.name}
                </text>
                <text 
                  x={node.x} y={node.y + 5} textAnchor="middle" 
                  fill={node.isRestaurant || isProcessing ? "#fff" : "var(--text-secondary)"} 
                  fontSize={node.isRestaurant ? "12px" : "14px"} fontWeight="bold" style={{ pointerEvents: 'none' }}
                >
                  {node.isRestaurant ? "🍔" : node.name.slice(-1)}
                </text>
              </g>
            );
          })}
        </svg>

        {nodes.length === 0 && (
          <div style={{ position: 'absolute', color: 'var(--text-secondary)', textAlign: 'center', pointerEvents: 'none' }}>
            <MapPin size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>Delivery Area Empty. Click to place a Restaurant.</p>
          </div>
        )}

        {dialogState.isOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-title">
                {dialogState.type === 'add' ? 'Distance to Customer (km)' : 'Edit Distance (km)'}
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {dialogState.type === 'add' ? 'Enter realistic local distance (e.g. 1.5):' : 'Update the road distance:'}
              </p>
              <input 
                type="number" step="0.1" min="0.1"
                className="input-field" 
                value={edgeWeightInput}
                onChange={e => setEdgeWeightInput(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && confirmDialogAction()}
              />
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setDialogState({ isOpen: false })}>Cancel</button>
                <button className="btn btn-primary" onClick={confirmDialogAction}>
                  {dialogState.type === 'add' ? 'Add Road' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <OutputPanel 
        nodes={nodes} 
        edges={edges} 
        mstEdges={mstEdges} 
        totalCost={totalCost} 
      />

    </div>
  );
};

export default GraphVisualizer;
