import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { GRAPH_NODES, type GraphNode, type NodeType } from './knowledgeData'

const TYPE_LABELS: Record<NodeType, string> = {
  holding: 'Holding',
  operations: 'Operations',
  product: 'Produkt',
  system: 'System',
  person: 'Person/AI',
  market: 'Marknad',
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string
  name: string
  type: NodeType
  color: string
  description: string
  layer: number
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: string | SimNode
  target: string | SimNode
}

export function KnowledgeGraph() {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)

    // Defs: glow filter
    const defs = svg.append('defs')
    const filter = defs.append('filter').attr('id', 'glow')
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur')
    const feMerge = filter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Zoom
    const g = svg.append('g')
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', event => {
        g.attr('transform', event.transform)
      })
    svg.call(zoom)

    // Build nodes & links
    const nodes: SimNode[] = GRAPH_NODES.map(n => ({ ...n }))
    const links: SimLink[] = []
    GRAPH_NODES.forEach(n => {
      if (n.links) {
        n.links.forEach(targetId => {
          links.push({ source: n.id, target: targetId })
        })
      }
    })

    // Simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink<SimNode, SimLink>(links).id(d => d.id).distance(120).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50))
      .force('y', d3.forceY<SimNode>(d => (d.layer * height) / 5).strength(0.15))

    // Links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', '#ffffff12')
      .attr('stroke-width', 1)

    // Node groups
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, SimNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x; d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x; d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null; d.fy = null
          })
      )
      .on('click', (event, d) => {
        event.stopPropagation()
        const original = GRAPH_NODES.find(n => n.id === d.id)
        setSelectedNode(original ?? null)
      })

    // Circles
    const nodeRadius: Record<NodeType, number> = {
      holding: 28,
      operations: 22,
      product: 20,
      system: 16,
      person: 18,
      market: 14,
    }

    node.append('circle')
      .attr('r', d => nodeRadius[d.type])
      .attr('fill', d => d.color + '20')
      .attr('stroke', d => d.color)
      .attr('stroke-width', 1.5)
      .style('filter', d => d.type === 'holding' || d.type === 'person' ? 'url(#glow)' : '')

    // Icons / Labels inside
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', d => d.type === 'holding' ? '14px' : '10px')
      .attr('fill', d => d.color)
      .text(d => {
        const icons: Record<NodeType, string> = {
          holding: '♟',
          operations: '⚙',
          product: '◆',
          system: '▣',
          person: '★',
          market: '◉',
        }
        return icons[d.type]
      })

    // Name label below
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => nodeRadius[d.type] + 14)
      .attr('font-size', '9px')
      .attr('fill', '#9CA3AF')
      .attr('font-family', 'monospace')
      .text(d => d.name.length > 14 ? d.name.substring(0, 13) + '…' : d.name)

    // Click on background: deselect
    svg.on('click', () => setSelectedNode(null))

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as SimNode).x ?? 0)
        .attr('y1', d => (d.source as SimNode).y ?? 0)
        .attr('x2', d => (d.target as SimNode).x ?? 0)
        .attr('y2', d => (d.target as SimNode).y ?? 0)

      node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    return () => { simulation.stop() }
  }, [])

  return (
    <div className="h-full flex gap-4">
      {/* Graph */}
      <div ref={containerRef} className="flex-1 relative bg-[#07080F] rounded-xl border border-surface-border overflow-hidden">
        <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
          {(['holding', 'operations', 'product', 'system', 'person', 'market'] as NodeType[]).map(type => {
            const colorMap: Record<NodeType, string> = {
              holding: '#8B5CF6', operations: '#6366F1', product: '#F59E0B',
              system: '#3B82F6', person: '#EC4899', market: '#0EA5E9'
            }
            return (
              <div key={type} className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-lg">
                <div className="h-2 w-2 rounded-full" style={{ background: colorMap[type] }} />
                <span className="text-[9px] text-gray-500 font-mono">{TYPE_LABELS[type]}</span>
              </div>
            )
          })}
        </div>

        <div className="absolute bottom-3 left-3 z-10 text-[9px] text-gray-700 font-mono">
          Scroll: zoom · Drag: pan/move · Klick: info
        </div>

        <svg ref={svgRef} className="w-full h-full" />
      </div>

      {/* Info panel */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3">
        <div className="bg-[#0D0F1A] border border-surface-border rounded-xl p-4 flex-shrink-0">
          <h3 className="text-xs font-mono text-gray-600 mb-3">KUNSKAPSGRAF</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Interaktiv karta över Wavult Groups bolag, system och relationer.
            Klicka på en nod för att se detaljer.
          </p>
          <div className="mt-3 pt-3 border-t border-surface-border">
            <div className="flex justify-between text-xs font-mono text-gray-600">
              <span>Noder</span><span className="text-gray-400">{GRAPH_NODES.length}</span>
            </div>
            <div className="flex justify-between text-xs font-mono text-gray-600 mt-1">
              <span>Kopplingar</span>
              <span className="text-gray-400">
                {GRAPH_NODES.reduce((sum, n) => sum + (n.links?.length ?? 0), 0)}
              </span>
            </div>
          </div>
        </div>

        {selectedNode ? (
          <div className="bg-[#0D0F1A] border rounded-xl p-4 flex-1" style={{ borderColor: selectedNode.color + '40' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: selectedNode.color }} />
              <h3 className="text-sm font-semibold text-white">{selectedNode.name}</h3>
            </div>

            <div
              className="inline-block px-2 py-0.5 rounded text-xs font-mono mb-3"
              style={{ background: selectedNode.color + '20', color: selectedNode.color }}
            >
              {TYPE_LABELS[selectedNode.type]}
            </div>

            <p className="text-xs text-gray-400 leading-relaxed mb-4">{selectedNode.description}</p>

            {selectedNode.links && selectedNode.links.length > 0 && (
              <div>
                <p className="text-xs text-gray-600 font-mono mb-2">KOPPLINGAR ({selectedNode.links.length})</p>
                <div className="flex flex-col gap-1">
                  {selectedNode.links.map(linkId => {
                    const linked = GRAPH_NODES.find(n => n.id === linkId)
                    if (!linked) return null
                    return (
                      <div key={linkId} className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: linked.color }} />
                        <span className="text-xs text-gray-500">{linked.name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-surface-border">
              <span className="text-xs text-gray-700 font-mono">Layer {selectedNode.layer}</span>
            </div>
          </div>
        ) : (
          <div className="bg-[#0D0F1A] border border-surface-border rounded-xl p-4 flex-1 flex flex-col items-center justify-center text-center">
            <span className="text-3xl mb-2">🔬</span>
            <p className="text-xs text-gray-600">Klicka på en nod i grafen för att se detaljer</p>
          </div>
        )}
      </div>
    </div>
  )
}
