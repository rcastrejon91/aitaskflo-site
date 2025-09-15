// Enhanced AI Agent: Knowledge Graph System
// Graph-based knowledge storage and semantic relationships

const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

class KnowledgeGraph extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxNodes: 10000,
      maxRelationships: 50000,
      relationshipThreshold: 0.5,
      semanticAnalysisEnabled: true,
      autoClusteringEnabled: true,
      persistenceEnabled: true,
      ...config
    };
    
    this.nodes = new Map(); // Knowledge nodes
    this.relationships = new Map(); // Relationships between nodes
    this.clusters = new Map(); // Knowledge clusters
    this.index = {
      byType: new Map(),
      byTopic: new Map(),
      bySource: new Map(),
      byConfidence: new Map()
    };
    
    this.stats = {
      totalNodes: 0,
      totalRelationships: 0,
      totalClusters: 0,
      averageConnectivity: 0,
      lastUpdated: null
    };
    
    console.log('🕸️ Knowledge Graph initialized');
    this.loadExistingGraph();
  }

  // Add knowledge node to the graph
  async addKnowledge(knowledgeItem) {
    try {
      const nodeId = this.generateNodeId(knowledgeItem);
      
      // Create knowledge node
      const node = {
        id: nodeId,
        type: knowledgeItem.type || 'fact',
        title: knowledgeItem.title,
        content: knowledgeItem.content,
        confidence: knowledgeItem.confidence || 0.5,
        sources: knowledgeItem.sources || [],
        tags: knowledgeItem.tags || [],
        createdAt: knowledgeItem.createdAt || new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        connections: new Set(),
        metadata: {
          relevanceScore: knowledgeItem.relevanceScore,
          patterns: knowledgeItem.patterns || [],
          sessionId: knowledgeItem.sessionId
        }
      };
      
      // Check for existing node
      if (this.nodes.has(nodeId)) {
        await this.updateNode(nodeId, knowledgeItem);
        return nodeId;
      }
      
      // Add node to graph
      this.nodes.set(nodeId, node);
      
      // Update indexes
      this.updateIndexes(node);
      
      // Find and create relationships
      await this.createRelationships(node);
      
      // Update clustering if enabled
      if (this.config.autoClusteringEnabled) {
        await this.updateClusters(node);
      }
      
      // Update statistics
      this.updateStats();
      
      console.log(`➕ Added knowledge node: ${node.title.substring(0, 50)}...`);
      this.emit('node-added', node);
      
      // Persist changes
      if (this.config.persistenceEnabled) {
        await this.saveGraph();
      }
      
      return nodeId;
    } catch (error) {
      console.error('Failed to add knowledge to graph:', error.message);
      throw error;
    }
  }

  // Generate unique node ID
  generateNodeId(knowledgeItem) {
    const content = knowledgeItem.title + knowledgeItem.content;
    return require('crypto')
      .createHash('sha256')
      .update(content)
      .digest('hex')
      .substring(0, 16);
  }

  // Update existing node
  async updateNode(nodeId, knowledgeItem) {
    const existingNode = this.nodes.get(nodeId);
    if (!existingNode) return false;
    
    // Merge sources
    const newSources = knowledgeItem.sources || [];
    existingNode.sources = [...new Set([...existingNode.sources, ...newSources])];
    
    // Update confidence (weighted average)
    const newConfidence = knowledgeItem.confidence || 0.5;
    existingNode.confidence = (existingNode.confidence + newConfidence) / 2;
    
    // Merge tags
    const newTags = knowledgeItem.tags || [];
    existingNode.tags = [...new Set([...existingNode.tags, ...newTags])];
    
    // Update metadata
    if (knowledgeItem.patterns) {
      existingNode.metadata.patterns = [
        ...existingNode.metadata.patterns,
        ...knowledgeItem.patterns
      ];
    }
    
    existingNode.lastUpdated = new Date().toISOString();
    
    console.log(`🔄 Updated knowledge node: ${existingNode.title.substring(0, 50)}...`);
    this.emit('node-updated', existingNode);
    
    return true;
  }

  // Update indexes for efficient querying
  updateIndexes(node) {
    // Index by type
    if (!this.index.byType.has(node.type)) {
      this.index.byType.set(node.type, new Set());
    }
    this.index.byType.get(node.type).add(node.id);
    
    // Index by topics (tags)
    node.tags.forEach(tag => {
      if (!this.index.byTopic.has(tag)) {
        this.index.byTopic.set(tag, new Set());
      }
      this.index.byTopic.get(tag).add(node.id);
    });
    
    // Index by source
    node.sources.forEach(source => {
      if (!this.index.bySource.has(source)) {
        this.index.bySource.set(source, new Set());
      }
      this.index.bySource.get(source).add(node.id);
    });
    
    // Index by confidence level
    const confidenceLevel = this.getConfidenceLevel(node.confidence);
    if (!this.index.byConfidence.has(confidenceLevel)) {
      this.index.byConfidence.set(confidenceLevel, new Set());
    }
    this.index.byConfidence.get(confidenceLevel).add(node.id);
  }

  // Get confidence level category
  getConfidenceLevel(confidence) {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    if (confidence >= 0.4) return 'low';
    return 'very_low';
  }

  // Create relationships between nodes
  async createRelationships(newNode) {
    const relationships = [];
    
    // Find semantically similar nodes
    const candidateNodes = await this.findSimilarNodes(newNode);
    
    for (const candidateNode of candidateNodes) {
      const relationship = await this.analyzeRelationship(newNode, candidateNode);
      
      if (relationship && relationship.strength >= this.config.relationshipThreshold) {
        const relationshipId = this.createRelationshipId(newNode.id, candidateNode.id);
        
        this.relationships.set(relationshipId, {
          id: relationshipId,
          source: newNode.id,
          target: candidateNode.id,
          type: relationship.type,
          strength: relationship.strength,
          confidence: relationship.confidence,
          createdAt: new Date().toISOString(),
          metadata: relationship.metadata || {}
        });
        
        // Update node connections
        newNode.connections.add(candidateNode.id);
        candidateNode.connections.add(newNode.id);
        
        relationships.push(relationshipId);
      }
    }
    
    if (relationships.length > 0) {
      console.log(`🔗 Created ${relationships.length} relationships for new node`);
      this.emit('relationships-created', { nodeId: newNode.id, relationships });
    }
    
    return relationships;
  }

  // Find nodes similar to the given node
  async findSimilarNodes(targetNode, limit = 20) {
    const candidates = [];
    
    // Find nodes with shared tags
    const sharedTagNodes = new Set();
    targetNode.tags.forEach(tag => {
      const tagNodes = this.index.byTopic.get(tag);
      if (tagNodes) {
        tagNodes.forEach(nodeId => {
          if (nodeId !== targetNode.id) {
            sharedTagNodes.add(nodeId);
          }
        });
      }
    });
    
    // Calculate similarity scores
    for (const nodeId of sharedTagNodes) {
      const node = this.nodes.get(nodeId);
      if (node) {
        const similarity = this.calculateNodeSimilarity(targetNode, node);
        if (similarity > 0.3) {
          candidates.push({ node, similarity });
        }
      }
    }
    
    // Sort by similarity and return top candidates
    return candidates
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.node);
  }

  // Calculate similarity between two nodes
  calculateNodeSimilarity(node1, node2) {
    let similarity = 0;
    
    // Tag similarity (Jaccard coefficient)
    const tags1 = new Set(node1.tags);
    const tags2 = new Set(node2.tags);
    const intersection = new Set([...tags1].filter(x => tags2.has(x)));
    const union = new Set([...tags1, ...tags2]);
    
    if (union.size > 0) {
      similarity += (intersection.size / union.size) * 0.4;
    }
    
    // Content similarity (simplified)
    const contentSimilarity = this.calculateTextSimilarity(node1.content, node2.content);
    similarity += contentSimilarity * 0.3;
    
    // Type similarity
    if (node1.type === node2.type) {
      similarity += 0.2;
    }
    
    // Source similarity
    const sources1 = new Set(node1.sources);
    const sources2 = new Set(node2.sources);
    const sourceIntersection = new Set([...sources1].filter(x => sources2.has(x)));
    
    if (sources1.size > 0 && sources2.size > 0) {
      similarity += (sourceIntersection.size / Math.max(sources1.size, sources2.size)) * 0.1;
    }
    
    return Math.min(similarity, 1);
  }

  // Calculate text similarity using word overlap
  calculateTextSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(/\W+/).filter(w => w.length > 3));
    const words2 = new Set(text2.toLowerCase().split(/\W+/).filter(w => w.length > 3));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  // Analyze relationship between two nodes
  async analyzeRelationship(node1, node2) {
    const relationship = {
      type: 'related',
      strength: 0,
      confidence: 0.5,
      metadata: {}
    };
    
    // Calculate base similarity
    const similarity = this.calculateNodeSimilarity(node1, node2);
    relationship.strength = similarity;
    
    // Determine relationship type based on content analysis
    const relationshipType = this.determineRelationshipType(node1, node2);
    relationship.type = relationshipType.type;
    relationship.confidence = relationshipType.confidence;
    
    // Add metadata
    relationship.metadata = {
      sharedTags: node1.tags.filter(tag => node2.tags.includes(tag)),
      confidenceDifference: Math.abs(node1.confidence - node2.confidence),
      temporalDistance: this.calculateTemporalDistance(node1, node2)
    };
    
    return relationship;
  }

  // Determine the type of relationship between nodes
  determineRelationshipType(node1, node2) {
    const content1 = (node1.title + ' ' + node1.content).toLowerCase();
    const content2 = (node2.title + ' ' + node2.content).toLowerCase();
    
    // Causal relationships
    if (content1.includes('cause') && content2.includes('effect') ||
        content1.includes('because') || content2.includes('because')) {
      return { type: 'causal', confidence: 0.8 };
    }
    
    // Temporal relationships
    if (content1.includes('before') && content2.includes('after') ||
        content1.includes('then') || content2.includes('then')) {
      return { type: 'temporal', confidence: 0.7 };
    }
    
    // Contradictory relationships
    if (content1.includes('not') && !content2.includes('not') ||
        content1.includes('false') && content2.includes('true')) {
      return { type: 'contradictory', confidence: 0.9 };
    }
    
    // Supportive relationships
    if (content1.includes('support') || content2.includes('support') ||
        content1.includes('confirm') || content2.includes('confirm')) {
      return { type: 'supportive', confidence: 0.8 };
    }
    
    // Hierarchical relationships
    if (content1.includes('part of') || content2.includes('part of') ||
        content1.includes('subset') || content2.includes('subset')) {
      return { type: 'hierarchical', confidence: 0.8 };
    }
    
    // Default to related
    return { type: 'related', confidence: 0.6 };
  }

  // Calculate temporal distance between nodes
  calculateTemporalDistance(node1, node2) {
    const time1 = new Date(node1.createdAt).getTime();
    const time2 = new Date(node2.createdAt).getTime();
    
    return Math.abs(time1 - time2) / (1000 * 60 * 60 * 24); // Days
  }

  // Create relationship ID
  createRelationshipId(sourceId, targetId) {
    const sorted = [sourceId, targetId].sort();
    return `${sorted[0]}_${sorted[1]}`;
  }

  // Update knowledge clusters
  async updateClusters(newNode) {
    // Find the best cluster for the new node
    let bestCluster = null;
    let bestScore = 0;
    
    for (const [clusterId, cluster] of this.clusters) {
      const score = this.calculateClusterAffinity(newNode, cluster);
      if (score > bestScore && score > 0.5) {
        bestCluster = clusterId;
        bestScore = score;
      }
    }
    
    if (bestCluster) {
      // Add to existing cluster
      const cluster = this.clusters.get(bestCluster);
      cluster.nodes.add(newNode.id);
      cluster.lastUpdated = new Date().toISOString();
      cluster.coherence = this.calculateClusterCoherence(cluster);
      
      console.log(`📊 Added node to cluster: ${cluster.name}`);
    } else {
      // Create new cluster if node has sufficient connections
      if (newNode.connections.size >= 2) {
        await this.createCluster(newNode);
      }
    }
  }

  // Calculate how well a node fits into a cluster
  calculateClusterAffinity(node, cluster) {
    let affinity = 0;
    let connections = 0;
    
    // Check connections to cluster nodes
    for (const nodeId of cluster.nodes) {
      if (node.connections.has(nodeId)) {
        connections++;
      }
    }
    
    if (cluster.nodes.size > 0) {
      affinity += (connections / cluster.nodes.size) * 0.5;
    }
    
    // Check topic overlap
    const clusterTopics = new Set(cluster.topics);
    const nodeTopics = new Set(node.tags);
    const topicOverlap = new Set([...clusterTopics].filter(x => nodeTopics.has(x)));
    
    if (clusterTopics.size > 0) {
      affinity += (topicOverlap.size / clusterTopics.size) * 0.3;
    }
    
    // Check type compatibility
    if (cluster.dominantType === node.type) {
      affinity += 0.2;
    }
    
    return affinity;
  }

  // Create a new cluster around a node
  async createCluster(centerNode) {
    const clusterId = `cluster_${Date.now()}`;
    const connectedNodes = new Set([centerNode.id]);
    
    // Add connected nodes to cluster
    centerNode.connections.forEach(nodeId => {
      connectedNodes.add(nodeId);
    });
    
    // Determine cluster topics and type
    const topics = new Set(centerNode.tags);
    const types = new Map();
    types.set(centerNode.type, 1);
    
    connectedNodes.forEach(nodeId => {
      const node = this.nodes.get(nodeId);
      if (node) {
        node.tags.forEach(tag => topics.add(tag));
        types.set(node.type, (types.get(node.type) || 0) + 1);
      }
    });
    
    // Find dominant type
    let dominantType = centerNode.type;
    let maxCount = 1;
    for (const [type, count] of types) {
      if (count > maxCount) {
        dominantType = type;
        maxCount = count;
      }
    }
    
    const cluster = {
      id: clusterId,
      name: this.generateClusterName(topics, dominantType),
      nodes: connectedNodes,
      topics: Array.from(topics),
      dominantType: dominantType,
      centerNode: centerNode.id,
      coherence: 0,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    cluster.coherence = this.calculateClusterCoherence(cluster);
    this.clusters.set(clusterId, cluster);
    
    console.log(`🎯 Created new cluster: ${cluster.name} (${connectedNodes.size} nodes)`);
    this.emit('cluster-created', cluster);
    
    return clusterId;
  }

  // Generate a descriptive name for a cluster
  generateClusterName(topics, dominantType) {
    const topicArray = Array.from(topics).slice(0, 3);
    if (topicArray.length > 0) {
      return `${dominantType}: ${topicArray.join(', ')}`;
    }
    return `${dominantType} cluster`;
  }

  // Calculate cluster coherence (how well-connected the cluster is)
  calculateClusterCoherence(cluster) {
    if (cluster.nodes.size < 2) return 1.0;
    
    let totalConnections = 0;
    let possibleConnections = 0;
    
    const nodeArray = Array.from(cluster.nodes);
    
    for (let i = 0; i < nodeArray.length; i++) {
      const node1 = this.nodes.get(nodeArray[i]);
      if (!node1) continue;
      
      for (let j = i + 1; j < nodeArray.length; j++) {
        const node2Id = nodeArray[j];
        possibleConnections++;
        
        if (node1.connections.has(node2Id)) {
          totalConnections++;
        }
      }
    }
    
    return possibleConnections > 0 ? totalConnections / possibleConnections : 0;
  }

  // Update graph statistics
  updateStats() {
    this.stats.totalNodes = this.nodes.size;
    this.stats.totalRelationships = this.relationships.size;
    this.stats.totalClusters = this.clusters.size;
    
    // Calculate average connectivity
    let totalConnections = 0;
    this.nodes.forEach(node => {
      totalConnections += node.connections.size;
    });
    
    this.stats.averageConnectivity = this.nodes.size > 0 
      ? totalConnections / this.nodes.size 
      : 0;
    
    this.stats.lastUpdated = new Date().toISOString();
  }

  // Query the knowledge graph
  query(params = {}) {
    const {
      nodeId,
      type,
      topic,
      source,
      confidence,
      limit = 20,
      includeRelationships = false
    } = params;
    
    let results = [];
    
    if (nodeId) {
      // Get specific node
      const node = this.nodes.get(nodeId);
      if (node) {
        results = [node];
      }
    } else {
      // Query by parameters
      let candidateIds = new Set(this.nodes.keys());
      
      if (type) {
        const typeIds = this.index.byType.get(type);
        if (typeIds) {
          candidateIds = new Set([...candidateIds].filter(x => typeIds.has(x)));
        } else {
          candidateIds.clear();
        }
      }
      
      if (topic) {
        const topicIds = this.index.byTopic.get(topic);
        if (topicIds) {
          candidateIds = new Set([...candidateIds].filter(x => topicIds.has(x)));
        } else {
          candidateIds.clear();
        }
      }
      
      if (source) {
        const sourceIds = this.index.bySource.get(source);
        if (sourceIds) {
          candidateIds = new Set([...candidateIds].filter(x => sourceIds.has(x)));
        } else {
          candidateIds.clear();
        }
      }
      
      if (confidence) {
        const confidenceIds = this.index.byConfidence.get(confidence);
        if (confidenceIds) {
          candidateIds = new Set([...candidateIds].filter(x => confidenceIds.has(x)));
        } else {
          candidateIds.clear();
        }
      }
      
      // Convert to nodes and sort by confidence
      results = Array.from(candidateIds)
        .map(id => this.nodes.get(id))
        .filter(node => node)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, limit);
    }
    
    // Include relationships if requested
    if (includeRelationships) {
      results = results.map(node => ({
        ...node,
        relationships: this.getNodeRelationships(node.id)
      }));
    }
    
    return results;
  }

  // Get relationships for a specific node
  getNodeRelationships(nodeId) {
    const relationships = [];
    
    this.relationships.forEach(rel => {
      if (rel.source === nodeId || rel.target === nodeId) {
        relationships.push(rel);
      }
    });
    
    return relationships;
  }

  // Find shortest path between two nodes
  findShortestPath(sourceId, targetId, maxDepth = 5) {
    if (sourceId === targetId) return [sourceId];
    
    const visited = new Set();
    const queue = [{ nodeId: sourceId, path: [sourceId] }];
    
    while (queue.length > 0) {
      const { nodeId, path } = queue.shift();
      
      if (path.length > maxDepth) continue;
      if (visited.has(nodeId)) continue;
      
      visited.add(nodeId);
      
      const node = this.nodes.get(nodeId);
      if (!node) continue;
      
      for (const connectedId of node.connections) {
        if (connectedId === targetId) {
          return [...path, connectedId];
        }
        
        if (!visited.has(connectedId)) {
          queue.push({
            nodeId: connectedId,
            path: [...path, connectedId]
          });
        }
      }
    }
    
    return null; // No path found
  }

  // Get graph statistics
  getStats() {
    return {
      ...this.stats,
      indexes: {
        types: this.index.byType.size,
        topics: this.index.byTopic.size,
        sources: this.index.bySource.size,
        confidenceLevels: this.index.byConfidence.size
      },
      clusterStats: this.getClusterStats()
    };
  }

  // Get cluster statistics
  getClusterStats() {
    const stats = {
      totalClusters: this.clusters.size,
      averageClusterSize: 0,
      averageCoherence: 0,
      largestCluster: 0
    };
    
    if (this.clusters.size > 0) {
      let totalSize = 0;
      let totalCoherence = 0;
      let largestSize = 0;
      
      this.clusters.forEach(cluster => {
        const size = cluster.nodes.size;
        totalSize += size;
        totalCoherence += cluster.coherence;
        largestSize = Math.max(largestSize, size);
      });
      
      stats.averageClusterSize = totalSize / this.clusters.size;
      stats.averageCoherence = totalCoherence / this.clusters.size;
      stats.largestCluster = largestSize;
    }
    
    return stats;
  }

  // Save graph to disk
  async saveGraph() {
    try {
      const dataDir = './data/knowledge';
      if (!fs.existsSync('./data')) fs.mkdirSync('./data');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
      
      // Convert to serializable format
      const graphData = {
        nodes: {},
        relationships: {},
        clusters: {},
        stats: this.stats,
        savedAt: new Date().toISOString()
      };
      
      // Convert nodes (handle Set serialization)
      this.nodes.forEach((node, id) => {
        graphData.nodes[id] = {
          ...node,
          connections: Array.from(node.connections)
        };
      });
      
      // Convert relationships
      this.relationships.forEach((rel, id) => {
        graphData.relationships[id] = rel;
      });
      
      // Convert clusters (handle Set serialization)
      this.clusters.forEach((cluster, id) => {
        graphData.clusters[id] = {
          ...cluster,
          nodes: Array.from(cluster.nodes)
        };
      });
      
      const filename = path.join(dataDir, 'knowledge-graph.json');
      fs.writeFileSync(filename, JSON.stringify(graphData, null, 2));
      
      console.log(`💾 Knowledge graph saved: ${this.nodes.size} nodes, ${this.relationships.size} relationships`);
    } catch (error) {
      console.error('Failed to save knowledge graph:', error.message);
    }
  }

  // Load existing graph
  async loadExistingGraph() {
    try {
      const filename = './data/knowledge/knowledge-graph.json';
      if (!fs.existsSync(filename)) {
        console.log('🕸️ No existing knowledge graph found, starting fresh');
        return;
      }
      
      const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
      
      // Restore nodes (handle Set deserialization)
      Object.entries(data.nodes || {}).forEach(([id, node]) => {
        this.nodes.set(id, {
          ...node,
          connections: new Set(node.connections || [])
        });
      });
      
      // Restore relationships
      Object.entries(data.relationships || {}).forEach(([id, rel]) => {
        this.relationships.set(id, rel);
      });
      
      // Restore clusters (handle Set deserialization)
      Object.entries(data.clusters || {}).forEach(([id, cluster]) => {
        this.clusters.set(id, {
          ...cluster,
          nodes: new Set(cluster.nodes || [])
        });
      });
      
      // Rebuild indexes
      this.rebuildIndexes();
      
      // Update stats
      this.updateStats();
      
      console.log(`🕸️ Loaded knowledge graph: ${this.nodes.size} nodes, ${this.relationships.size} relationships, ${this.clusters.size} clusters`);
    } catch (error) {
      console.error('Failed to load knowledge graph:', error.message);
    }
  }

  // Rebuild indexes from loaded data
  rebuildIndexes() {
    // Clear existing indexes
    this.index.byType.clear();
    this.index.byTopic.clear();
    this.index.bySource.clear();
    this.index.byConfidence.clear();
    
    // Rebuild from nodes
    this.nodes.forEach((node, id) => {
      this.updateIndexes(node);
    });
  }
}

module.exports = KnowledgeGraph;