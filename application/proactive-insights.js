// Enhanced AI Agent: Proactive Intelligence System
// Generates insights and recommendations from learned knowledge

const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

class ProactiveIntelligence extends EventEmitter {
  constructor(knowledgeGraph, continuousLearner, config = {}) {
    super();
    this.knowledgeGraph = knowledgeGraph;
    this.continuousLearner = continuousLearner;
    
    this.config = {
      insightGenerationEnabled: true,
      predictionEnabled: true,
      recommendationEnabled: true,
      trendAnalysisEnabled: true,
      anomalyDetectionEnabled: true,
      insightThreshold: 0.7,
      updateInterval: 300000, // 5 minutes
      maxInsightsPerSession: 50,
      ...config
    };
    
    this.insights = {
      current: [],
      trends: [],
      predictions: [],
      recommendations: [],
      anomalies: []
    };
    
    this.userProfiles = new Map();
    this.contextHistory = [];
    this.performanceMetrics = {
      insightsGenerated: 0,
      predictionsAccurate: 0,
      recommendationsAccepted: 0,
      trendsIdentified: 0
    };
    
    this.isRunning = false;
    
    console.log('🔮 Proactive Intelligence System initialized');
    this.loadExistingInsights();
  }

  // Start proactive intelligence generation
  async startProactiveIntelligence() {
    if (this.isRunning) {
      console.log('⚠️ Proactive intelligence already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting proactive intelligence generation...');
    
    // Initial insight generation
    await this.generateProactiveInsights();
    
    // Set up periodic insight generation
    this.insightInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.generateProactiveInsights();
      }
    }, this.config.updateInterval);
    
    this.emit('proactive-intelligence-started');
  }

  // Stop proactive intelligence
  stopProactiveIntelligence() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.insightInterval) {
      clearInterval(this.insightInterval);
    }
    
    console.log('🔄 Proactive intelligence stopped');
    this.emit('proactive-intelligence-stopped');
  }

  // Generate comprehensive proactive insights
  async generateProactiveInsights() {
    console.log('🧠 Generating proactive insights...');
    const startTime = Date.now();
    
    try {
      const session = {
        id: `insight_session_${Date.now()}`,
        startTime: new Date().toISOString(),
        insights: [],
        predictions: [],
        recommendations: [],
        trends: [],
        anomalies: []
      };

      // Analyze recent learning for actionable insights
      const learningInsights = await this.analyzeRecentLearning();
      session.insights.push(...learningInsights);

      // Predict user needs based on new knowledge
      const predictions = await this.predictUserNeeds();
      session.predictions.push(...predictions);

      // Generate recommendations
      const recommendations = await this.generateRecommendations();
      session.recommendations.push(...recommendations);

      // Identify trends
      const trends = await this.identifyTrends();
      session.trends.push(...trends);

      // Detect anomalies
      const anomalies = await this.detectAnomalies();
      session.anomalies.push(...anomalies);

      // Optimize ongoing processes
      const optimizations = await this.optimizeProcesses();
      session.optimizations = optimizations;

      // Update current insights
      this.updateCurrentInsights(session);
      
      // Update performance metrics
      this.performanceMetrics.insightsGenerated += session.insights.length;
      this.performanceMetrics.trendsIdentified += session.trends.length;
      
      const duration = Date.now() - startTime;
      console.log(`✅ Proactive insights generated in ${duration}ms: ${session.insights.length} insights, ${session.predictions.length} predictions`);
      
      this.emit('insights-generated', session);
      
      // Save insights
      await this.saveInsights();
      
      return session;
    } catch (error) {
      console.error('❌ Failed to generate proactive insights:', error.message);
      throw error;
    }
  }

  // Analyze recent learning for actionable insights
  async analyzeRecentLearning() {
    const insights = [];
    const learningStats = this.continuousLearner.getStats();
    
    // Knowledge growth insights
    if (learningStats.knowledgeBase.totalFacts > 0) {
      const growthInsight = {
        type: 'knowledge_growth',
        title: 'Knowledge Base Expansion',
        content: `Knowledge base has grown to ${learningStats.knowledgeBase.totalFacts} facts with ${learningStats.knowledgeBase.totalPatterns} patterns identified`,
        confidence: 0.9,
        priority: 'medium',
        category: 'learning_progress',
        actionable: true,
        actions: [
          'Review high-confidence knowledge for decision making',
          'Identify knowledge gaps for targeted learning',
          'Apply learned patterns to current challenges'
        ],
        metadata: {
          totalFacts: learningStats.knowledgeBase.totalFacts,
          totalPatterns: learningStats.knowledgeBase.totalPatterns,
          averageConfidence: learningStats.knowledgeBase.averageConfidence
        },
        timestamp: new Date().toISOString()
      };
      insights.push(growthInsight);
    }

    // Pattern discovery insights
    const recentPatterns = await this.analyzeRecentPatterns();
    recentPatterns.forEach(pattern => {
      const patternInsight = {
        type: 'pattern_discovery',
        title: `${pattern.type} Pattern Identified`,
        content: `Discovered recurring pattern: ${pattern.description}`,
        confidence: pattern.confidence,
        priority: this.calculateInsightPriority(pattern.confidence, pattern.frequency),
        category: 'pattern_analysis',
        actionable: true,
        actions: pattern.suggestedActions || [],
        metadata: pattern.metadata,
        timestamp: new Date().toISOString()
      };
      insights.push(patternInsight);
    });

    // Source reliability insights
    const sourceInsights = await this.analyzeSourceReliability();
    insights.push(...sourceInsights);

    // Learning efficiency insights
    const efficiencyInsights = await this.analyzeLearningEfficiency();
    insights.push(...efficiencyInsights);

    return insights.filter(insight => insight.confidence >= this.config.insightThreshold);
  }

  // Analyze recent patterns in the knowledge base
  async analyzeRecentPatterns() {
    const patterns = [];
    const graphStats = this.knowledgeGraph.getStats();
    
    // Topic clustering patterns
    const topicClusters = await this.analyzeTopicClusters();
    topicClusters.forEach(cluster => {
      patterns.push({
        type: 'topic_clustering',
        description: `Strong clustering around "${cluster.topic}" with ${cluster.nodeCount} related items`,
        confidence: cluster.coherence,
        frequency: cluster.nodeCount,
        suggestedActions: [
          `Deep dive into ${cluster.topic} for specialized insights`,
          'Monitor for emerging subtopics',
          'Apply knowledge cluster to relevant decisions'
        ],
        metadata: {
          topic: cluster.topic,
          nodeCount: cluster.nodeCount,
          coherence: cluster.coherence,
          relatedTopics: cluster.relatedTopics
        }
      });
    });

    // Temporal patterns
    const temporalPatterns = await this.analyzeTemporalPatterns();
    patterns.push(...temporalPatterns);

    // Source correlation patterns
    const sourcePatterns = await this.analyzeSourceCorrelations();
    patterns.push(...sourcePatterns);

    return patterns;
  }

  // Analyze topic clusters for patterns
  async analyzeTopicClusters() {
    const clusters = [];
    const topicCounts = new Map();
    
    // Count nodes by topic
    const allNodes = this.knowledgeGraph.query({ limit: 1000 });
    allNodes.forEach(node => {
      node.tags.forEach(tag => {
        topicCounts.set(tag, (topicCounts.get(tag) || 0) + 1);
      });
    });
    
    // Identify significant clusters
    topicCounts.forEach((count, topic) => {
      if (count >= 5) { // Significant cluster threshold
        const topicNodes = this.knowledgeGraph.query({ topic, limit: 100 });
        const coherence = this.calculateTopicCoherence(topicNodes);
        
        clusters.push({
          topic,
          nodeCount: count,
          coherence,
          relatedTopics: this.findRelatedTopics(topic, topicNodes)
        });
      }
    });
    
    return clusters.sort((a, b) => b.coherence * b.nodeCount - a.coherence * a.nodeCount);
  }

  // Calculate coherence of a topic cluster
  calculateTopicCoherence(nodes) {
    if (nodes.length < 2) return 1.0;
    
    let totalConnections = 0;
    let possibleConnections = 0;
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        possibleConnections++;
        if (nodes[i].connections && nodes[i].connections.has(nodes[j].id)) {
          totalConnections++;
        }
      }
    }
    
    return possibleConnections > 0 ? totalConnections / possibleConnections : 0;
  }

  // Find topics related to a given topic
  findRelatedTopics(targetTopic, nodes) {
    const relatedTopics = new Map();
    
    nodes.forEach(node => {
      node.tags.forEach(tag => {
        if (tag !== targetTopic) {
          relatedTopics.set(tag, (relatedTopics.get(tag) || 0) + 1);
        }
      });
    });
    
    return Array.from(relatedTopics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
  }

  // Analyze temporal patterns in knowledge acquisition
  async analyzeTemporalPatterns() {
    const patterns = [];
    const now = new Date();
    const timeWindows = [
      { name: 'last_hour', duration: 60 * 60 * 1000 },
      { name: 'last_day', duration: 24 * 60 * 60 * 1000 },
      { name: 'last_week', duration: 7 * 24 * 60 * 60 * 1000 }
    ];
    
    timeWindows.forEach(window => {
      const windowStart = new Date(now.getTime() - window.duration);
      const recentNodes = Array.from(this.knowledgeGraph.nodes.values())
        .filter(node => new Date(node.createdAt) > windowStart);
      
      if (recentNodes.length > 0) {
        const avgConfidence = recentNodes.reduce((sum, node) => sum + node.confidence, 0) / recentNodes.length;
        const topicDistribution = this.analyzeTopicDistribution(recentNodes);
        
        patterns.push({
          type: 'temporal_activity',
          description: `High knowledge acquisition activity in ${window.name}: ${recentNodes.length} new items`,
          confidence: avgConfidence,
          frequency: recentNodes.length,
          suggestedActions: [
            'Review recent acquisitions for immediate application',
            'Identify knowledge acquisition trends'
          ],
          metadata: {
            timeWindow: window.name,
            itemCount: recentNodes.length,
            averageConfidence: avgConfidence,
            topicDistribution
          }
        });
      }
    });
    
    return patterns;
  }

  // Analyze topic distribution in a set of nodes
  analyzeTopicDistribution(nodes) {
    const distribution = new Map();
    
    nodes.forEach(node => {
      node.tags.forEach(tag => {
        distribution.set(tag, (distribution.get(tag) || 0) + 1);
      });
    });
    
    return Object.fromEntries(
      Array.from(distribution.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    );
  }

  // Analyze source correlations and patterns
  async analyzeSourceCorrelations() {
    const patterns = [];
    const sourceStats = new Map();
    
    // Gather source statistics
    Array.from(this.knowledgeGraph.nodes.values()).forEach(node => {
      node.sources.forEach(source => {
        if (!sourceStats.has(source)) {
          sourceStats.set(source, {
            nodeCount: 0,
            totalConfidence: 0,
            topics: new Set(),
            avgConfidence: 0
          });
        }
        
        const stats = sourceStats.get(source);
        stats.nodeCount++;
        stats.totalConfidence += node.confidence;
        node.tags.forEach(tag => stats.topics.add(tag));
        stats.avgConfidence = stats.totalConfidence / stats.nodeCount;
      });
    });
    
    // Identify high-performing sources
    sourceStats.forEach((stats, source) => {
      if (stats.nodeCount >= 5 && stats.avgConfidence >= 0.7) {
        patterns.push({
          type: 'source_reliability',
          description: `High-quality source identified: ${source}`,
          confidence: stats.avgConfidence,
          frequency: stats.nodeCount,
          suggestedActions: [
            `Prioritize monitoring ${source} for new information`,
            'Analyze successful content patterns from this source'
          ],
          metadata: {
            source,
            nodeCount: stats.nodeCount,
            avgConfidence: stats.avgConfidence,
            topicCoverage: Array.from(stats.topics)
          }
        });
      }
    });
    
    return patterns;
  }

  // Analyze source reliability for insights
  async analyzeSourceReliability() {
    const insights = [];
    const graphStats = this.knowledgeGraph.getStats();
    
    // Get source performance data
    const sourcePerformance = await this.calculateSourcePerformance();
    
    // Top performing sources
    const topSources = sourcePerformance
      .sort((a, b) => b.reliabilityScore - a.reliabilityScore)
      .slice(0, 3);
    
    if (topSources.length > 0) {
      const topSourceInsight = {
        type: 'source_performance',
        title: 'Top Performing Information Sources',
        content: `Most reliable sources: ${topSources.map(s => s.name).join(', ')}`,
        confidence: 0.9,
        priority: 'high',
        category: 'source_analysis',
        actionable: true,
        actions: [
          'Increase monitoring frequency for top sources',
          'Analyze content patterns from reliable sources',
          'Use top sources for validation of uncertain information'
        ],
        metadata: {
          topSources: topSources.map(s => ({
            name: s.name,
            score: s.reliabilityScore,
            contributions: s.contributions
          }))
        },
        timestamp: new Date().toISOString()
      };
      insights.push(topSourceInsight);
    }
    
    return insights;
  }

  // Calculate source performance metrics
  async calculateSourcePerformance() {
    const sourceMetrics = new Map();
    
    Array.from(this.knowledgeGraph.nodes.values()).forEach(node => {
      node.sources.forEach(source => {
        if (!sourceMetrics.has(source)) {
          sourceMetrics.set(source, {
            name: source,
            contributions: 0,
            totalConfidence: 0,
            highConfidenceItems: 0,
            avgResponseTime: 0
          });
        }
        
        const metrics = sourceMetrics.get(source);
        metrics.contributions++;
        metrics.totalConfidence += node.confidence;
        
        if (node.confidence >= 0.8) {
          metrics.highConfidenceItems++;
        }
      });
    });
    
    // Calculate reliability scores
    const performance = Array.from(sourceMetrics.values()).map(metrics => {
      const avgConfidence = metrics.contributions > 0 
        ? metrics.totalConfidence / metrics.contributions 
        : 0;
      
      const highQualityRatio = metrics.contributions > 0 
        ? metrics.highConfidenceItems / metrics.contributions 
        : 0;
      
      const reliabilityScore = (avgConfidence * 0.7) + (highQualityRatio * 0.3);
      
      return {
        ...metrics,
        avgConfidence,
        highQualityRatio,
        reliabilityScore
      };
    });
    
    return performance;
  }

  // Analyze learning efficiency
  async analyzeLearningEfficiency() {
    const insights = [];
    const learningStats = this.continuousLearner.getStats();
    
    if (learningStats.learningSession && learningStats.learningSession.processed > 0) {
      const integrationRate = learningStats.learningSession.integrated / learningStats.learningSession.processed;
      const rejectionRate = learningStats.learningSession.rejected / learningStats.learningSession.processed;
      
      const efficiencyInsight = {
        type: 'learning_efficiency',
        title: 'Learning Process Efficiency',
        content: `Current learning session: ${(integrationRate * 100).toFixed(1)}% integration rate`,
        confidence: 0.8,
        priority: integrationRate > 0.7 ? 'low' : 'high',
        category: 'process_optimization',
        actionable: true,
        actions: integrationRate > 0.7 
          ? ['Maintain current learning parameters']
          : [
              'Review rejection reasons for process improvement',
              'Adjust confidence thresholds',
              'Improve source filtering'
            ],
        metadata: {
          integrationRate,
          rejectionRate,
          processed: learningStats.learningSession.processed,
          integrated: learningStats.learningSession.integrated,
          rejected: learningStats.learningSession.rejected
        },
        timestamp: new Date().toISOString()
      };
      insights.push(efficiencyInsight);
    }
    
    return insights;
  }

  // Predict user needs based on new knowledge
  async predictUserNeeds() {
    const predictions = [];
    
    // Analyze user interaction patterns
    const userPatterns = await this.analyzeUserPatterns();
    
    // Knowledge gap predictions
    const knowledgeGaps = await this.identifyKnowledgeGaps();
    knowledgeGaps.forEach(gap => {
      predictions.push({
        type: 'knowledge_gap',
        title: `Potential Knowledge Gap: ${gap.topic}`,
        content: `Limited information available on ${gap.topic}, may need focused research`,
        confidence: gap.confidence,
        priority: 'medium',
        category: 'learning_needs',
        timeline: 'next_week',
        actions: [
          `Search for information on ${gap.topic}`,
          'Add specialized sources for this topic area',
          'Monitor for related developments'
        ],
        metadata: gap,
        timestamp: new Date().toISOString()
      });
    });
    
    // Trend-based predictions
    const trendPredictions = await this.generateTrendPredictions();
    predictions.push(...trendPredictions);
    
    // Seasonal predictions based on temporal patterns
    const seasonalPredictions = await this.generateSeasonalPredictions();
    predictions.push(...seasonalPredictions);
    
    return predictions.filter(p => p.confidence >= 0.6);
  }

  // Analyze user interaction patterns
  async analyzeUserPatterns() {
    // This would analyze user behavior from logs, queries, etc.
    // For now, return simplified patterns
    return {
      mostQueriedTopics: ['artificial intelligence', 'automation', 'technology'],
      preferredSources: ['ArXiv AI Papers', 'TechCrunch RSS'],
      interactionTrends: 'increasing',
      averageSessionDuration: 15 // minutes
    };
  }

  // Identify knowledge gaps
  async identifyKnowledgeGaps() {
    const gaps = [];
    const topicCoverage = new Map();
    
    // Analyze topic coverage
    Array.from(this.knowledgeGraph.nodes.values()).forEach(node => {
      node.tags.forEach(tag => {
        if (!topicCoverage.has(tag)) {
          topicCoverage.set(tag, {
            count: 0,
            totalConfidence: 0,
            avgConfidence: 0,
            recentActivity: 0
          });
        }
        
        const coverage = topicCoverage.get(tag);
        coverage.count++;
        coverage.totalConfidence += node.confidence;
        coverage.avgConfidence = coverage.totalConfidence / coverage.count;
        
        // Check recent activity (last 7 days)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        if (new Date(node.createdAt) > weekAgo) {
          coverage.recentActivity++;
        }
      });
    });
    
    // Identify topics with low coverage or confidence
    topicCoverage.forEach((coverage, topic) => {
      if (coverage.count < 3 || coverage.avgConfidence < 0.6) {
        gaps.push({
          topic,
          currentCount: coverage.count,
          avgConfidence: coverage.avgConfidence,
          recentActivity: coverage.recentActivity,
          confidence: 1 - coverage.avgConfidence, // Higher confidence for bigger gaps
          severity: coverage.count === 0 ? 'high' : coverage.avgConfidence < 0.4 ? 'medium' : 'low'
        });
      }
    });
    
    return gaps.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
  }

  // Generate trend-based predictions
  async generateTrendPredictions() {
    const predictions = [];
    const recentTrends = await this.identifyTrends();
    
    recentTrends.forEach(trend => {
      if (trend.trajectory === 'increasing') {
        predictions.push({
          type: 'trend_prediction',
          title: `Rising Interest: ${trend.topic}`,
          content: `${trend.topic} showing ${trend.growthRate}% growth, expect continued interest`,
          confidence: trend.confidence * 0.8, // Reduce confidence for predictions
          priority: 'medium',
          category: 'trend_forecast',
          timeline: 'next_month',
          actions: [
            `Increase monitoring for ${trend.topic}`,
            'Prepare insights and recommendations for this topic',
            'Identify related subtopics for exploration'
          ],
          metadata: {
            originalTrend: trend,
            predictedGrowth: trend.growthRate * 1.2
          },
          timestamp: new Date().toISOString()
        });
      }
    });
    
    return predictions;
  }

  // Generate seasonal predictions
  async generateSeasonalPredictions() {
    const predictions = [];
    const now = new Date();
    const month = now.getMonth();
    const hour = now.getHours();
    
    // Time-based prediction patterns
    const timePatterns = {
      morning: hour >= 6 && hour < 12,
      afternoon: hour >= 12 && hour < 18,
      evening: hour >= 18 && hour < 24,
      night: hour >= 0 && hour < 6
    };
    
    // Simple seasonal predictions based on time patterns
    if (timePatterns.morning) {
      predictions.push({
        type: 'temporal_prediction',
        title: 'Morning Knowledge Consumption Pattern',
        content: 'Morning hours typically show increased interest in news and research content',
        confidence: 0.7,
        priority: 'low',
        category: 'temporal_forecast',
        timeline: 'next_few_hours',
        actions: [
          'Prioritize news and research content discovery',
          'Prepare morning briefing insights'
        ],
        metadata: {
          timePattern: 'morning',
          hour: hour
        },
        timestamp: new Date().toISOString()
      });
    }
    
    return predictions;
  }

  // Generate recommendations based on knowledge
  async generateRecommendations() {
    const recommendations = [];
    
    // Content recommendations based on user patterns
    const contentRecs = await this.generateContentRecommendations();
    recommendations.push(...contentRecs);
    
    // Source recommendations
    const sourceRecs = await this.generateSourceRecommendations();
    recommendations.push(...sourceRecs);
    
    // Action recommendations
    const actionRecs = await this.generateActionRecommendations();
    recommendations.push(...actionRecs);
    
    // Process optimization recommendations
    const processRecs = await this.generateProcessRecommendations();
    recommendations.push(...processRecs);
    
    return recommendations.filter(r => r.confidence >= 0.6);
  }

  // Generate content recommendations
  async generateContentRecommendations() {
    const recommendations = [];
    const highConfidenceNodes = this.knowledgeGraph.query({ 
      confidence: 'high', 
      limit: 10 
    });
    
    if (highConfidenceNodes.length > 0) {
      const topTopics = this.getTopTopics(highConfidenceNodes);
      
      topTopics.forEach(topic => {
        recommendations.push({
          type: 'content_recommendation',
          title: `Explore High-Quality Content: ${topic.name}`,
          content: `${topic.count} high-confidence items available on ${topic.name}`,
          confidence: 0.8,
          priority: 'medium',
          category: 'content_discovery',
          actions: [
            `Review all ${topic.name} content for insights`,
            'Identify knowledge application opportunities',
            'Look for related topics to explore'
          ],
          metadata: {
            topic: topic.name,
            itemCount: topic.count,
            avgConfidence: topic.avgConfidence
          },
          timestamp: new Date().toISOString()
        });
      });
    }
    
    return recommendations;
  }

  // Get top topics from a set of nodes
  getTopTopics(nodes) {
    const topicStats = new Map();
    
    nodes.forEach(node => {
      node.tags.forEach(tag => {
        if (!topicStats.has(tag)) {
          topicStats.set(tag, {
            name: tag,
            count: 0,
            totalConfidence: 0,
            avgConfidence: 0
          });
        }
        
        const stats = topicStats.get(tag);
        stats.count++;
        stats.totalConfidence += node.confidence;
        stats.avgConfidence = stats.totalConfidence / stats.count;
      });
    });
    
    return Array.from(topicStats.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  // Generate source recommendations
  async generateSourceRecommendations() {
    const recommendations = [];
    const sourcePerformance = await this.calculateSourcePerformance();
    
    // Recommend underutilized high-quality sources
    const underutilizedSources = sourcePerformance
      .filter(source => source.reliabilityScore > 0.8 && source.contributions < 10)
      .sort((a, b) => b.reliabilityScore - a.reliabilityScore)
      .slice(0, 3);
    
    underutilizedSources.forEach(source => {
      recommendations.push({
        type: 'source_recommendation',
        title: `Increase Monitoring: ${source.name}`,
        content: `High-quality source with potential for more frequent monitoring`,
        confidence: source.reliabilityScore,
        priority: 'medium',
        category: 'source_optimization',
        actions: [
          `Increase monitoring frequency for ${source.name}`,
          'Analyze content patterns from this source',
          'Set up alerts for new content'
        ],
        metadata: {
          source: source.name,
          reliabilityScore: source.reliabilityScore,
          currentContributions: source.contributions
        },
        timestamp: new Date().toISOString()
      });
    });
    
    return recommendations;
  }

  // Generate action recommendations
  async generateActionRecommendations() {
    const recommendations = [];
    const graphStats = this.knowledgeGraph.getStats();
    
    // Recommend knowledge graph optimization
    if (graphStats.averageConnectivity < 2) {
      recommendations.push({
        type: 'action_recommendation',
        title: 'Improve Knowledge Connectivity',
        content: 'Knowledge graph shows low connectivity, consider relationship building',
        confidence: 0.8,
        priority: 'medium',
        category: 'system_optimization',
        actions: [
          'Lower relationship threshold to create more connections',
          'Add semantic analysis for better relationship detection',
          'Review isolated knowledge nodes'
        ],
        metadata: {
          currentConnectivity: graphStats.averageConnectivity,
          recommendedThreshold: this.config.relationshipThreshold * 0.8
        },
        timestamp: new Date().toISOString()
      });
    }
    
    return recommendations;
  }

  // Generate process recommendations
  async generateProcessRecommendations() {
    const recommendations = [];
    const learningStats = this.continuousLearner.getStats();
    
    // Learning process optimization
    if (learningStats.knowledgeBase.averageConfidence < 0.7) {
      recommendations.push({
        type: 'process_recommendation',
        title: 'Improve Information Quality Control',
        content: 'Average knowledge confidence below optimal threshold',
        confidence: 0.9,
        priority: 'high',
        category: 'quality_control',
        actions: [
          'Increase confidence threshold for knowledge integration',
          'Improve source validation processes',
          'Add additional cross-validation steps'
        ],
        metadata: {
          currentConfidence: learningStats.knowledgeBase.averageConfidence,
          recommendedThreshold: 0.7
        },
        timestamp: new Date().toISOString()
      });
    }
    
    return recommendations;
  }

  // Identify trends in the knowledge base
  async identifyTrends() {
    const trends = [];
    const timeWindows = [
      { name: 'daily', duration: 24 * 60 * 60 * 1000 },
      { name: 'weekly', duration: 7 * 24 * 60 * 60 * 1000 }
    ];
    
    for (const window of timeWindows) {
      const windowTrends = await this.analyzeTrendsInWindow(window);
      trends.push(...windowTrends);
    }
    
    return trends.filter(trend => trend.confidence >= 0.6);
  }

  // Analyze trends within a specific time window
  async analyzeTrendsInWindow(window) {
    const trends = [];
    const now = new Date();
    const windowStart = new Date(now.getTime() - window.duration);
    const previousWindowStart = new Date(now.getTime() - (window.duration * 2));
    
    // Get nodes for current and previous windows
    const currentNodes = Array.from(this.knowledgeGraph.nodes.values())
      .filter(node => new Date(node.createdAt) > windowStart);
    
    const previousNodes = Array.from(this.knowledgeGraph.nodes.values())
      .filter(node => {
        const created = new Date(node.createdAt);
        return created > previousWindowStart && created <= windowStart;
      });
    
    // Analyze topic trends
    const currentTopics = this.analyzeTopicDistribution(currentNodes);
    const previousTopics = this.analyzeTopicDistribution(previousNodes);
    
    Object.keys(currentTopics).forEach(topic => {
      const currentCount = currentTopics[topic] || 0;
      const previousCount = previousTopics[topic] || 0;
      
      if (currentCount > 0 && previousCount > 0) {
        const growthRate = ((currentCount - previousCount) / previousCount) * 100;
        
        if (Math.abs(growthRate) > 20) { // Significant change threshold
          trends.push({
            topic,
            window: window.name,
            currentCount,
            previousCount,
            growthRate,
            trajectory: growthRate > 0 ? 'increasing' : 'decreasing',
            confidence: Math.min(Math.abs(growthRate) / 100, 0.9),
            significance: Math.abs(growthRate) > 50 ? 'high' : 'medium',
            timestamp: new Date().toISOString()
          });
        }
      }
    });
    
    return trends;
  }

  // Detect anomalies in the knowledge base
  async detectAnomalies() {
    const anomalies = [];
    
    // Confidence anomalies
    const confidenceAnomalies = await this.detectConfidenceAnomalies();
    anomalies.push(...confidenceAnomalies);
    
    // Source anomalies
    const sourceAnomalies = await this.detectSourceAnomalies();
    anomalies.push(...sourceAnomalies);
    
    // Content anomalies
    const contentAnomalies = await this.detectContentAnomalies();
    anomalies.push(...contentAnomalies);
    
    return anomalies.filter(anomaly => anomaly.severity !== 'low');
  }

  // Detect confidence-related anomalies
  async detectConfidenceAnomalies() {
    const anomalies = [];
    const allNodes = Array.from(this.knowledgeGraph.nodes.values());
    
    if (allNodes.length > 10) {
      const avgConfidence = allNodes.reduce((sum, node) => sum + node.confidence, 0) / allNodes.length;
      const stdDev = Math.sqrt(
        allNodes.reduce((sum, node) => sum + Math.pow(node.confidence - avgConfidence, 2), 0) / allNodes.length
      );
      
      // Find nodes with unusually low confidence
      const lowConfidenceNodes = allNodes.filter(
        node => node.confidence < (avgConfidence - 2 * stdDev)
      );
      
      if (lowConfidenceNodes.length > 0) {
        anomalies.push({
          type: 'confidence_anomaly',
          title: 'Unusually Low Confidence Items',
          content: `${lowConfidenceNodes.length} items with significantly low confidence detected`,
          severity: lowConfidenceNodes.length > 5 ? 'high' : 'medium',
          confidence: 0.8,
          actions: [
            'Review low-confidence items for accuracy',
            'Consider removing or improving these items',
            'Investigate source reliability'
          ],
          metadata: {
            averageConfidence: avgConfidence,
            standardDeviation: stdDev,
            affectedNodes: lowConfidenceNodes.length,
            threshold: avgConfidence - 2 * stdDev
          },
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return anomalies;
  }

  // Detect source-related anomalies
  async detectSourceAnomalies() {
    const anomalies = [];
    const sourceStats = new Map();
    
    // Gather source statistics
    Array.from(this.knowledgeGraph.nodes.values()).forEach(node => {
      node.sources.forEach(source => {
        if (!sourceStats.has(source)) {
          sourceStats.set(source, { count: 0, totalConfidence: 0 });
        }
        const stats = sourceStats.get(source);
        stats.count++;
        stats.totalConfidence += node.confidence;
      });
    });
    
    // Detect sources with unusual patterns
    sourceStats.forEach((stats, source) => {
      const avgConfidence = stats.totalConfidence / stats.count;
      
      // Unusually low confidence from a source
      if (stats.count >= 5 && avgConfidence < 0.4) {
        anomalies.push({
          type: 'source_anomaly',
          title: `Low Quality Source: ${source}`,
          content: `Source consistently providing low confidence information`,
          severity: 'medium',
          confidence: 0.9,
          actions: [
            `Review and potentially remove ${source}`,
            'Investigate source reliability issues',
            'Adjust source monitoring parameters'
          ],
          metadata: {
            source,
            averageConfidence: avgConfidence,
            contributionCount: stats.count
          },
          timestamp: new Date().toISOString()
        });
      }
    });
    
    return anomalies;
  }

  // Detect content-related anomalies
  async detectContentAnomalies() {
    const anomalies = [];
    
    // Find nodes with unusual content patterns
    const allNodes = Array.from(this.knowledgeGraph.nodes.values());
    const contentLengths = allNodes.map(node => node.content.length);
    
    if (contentLengths.length > 10) {
      const avgLength = contentLengths.reduce((sum, len) => sum + len, 0) / contentLengths.length;
      const unusuallyShort = allNodes.filter(node => node.content.length < avgLength * 0.1);
      const unusuallyLong = allNodes.filter(node => node.content.length > avgLength * 5);
      
      if (unusuallyShort.length > 3) {
        anomalies.push({
          type: 'content_anomaly',
          title: 'Unusually Short Content Detected',
          content: `${unusuallyShort.length} items with very short content`,
          severity: 'low',
          confidence: 0.7,
          actions: [
            'Review short content items for completeness',
            'Consider content quality thresholds'
          ],
          metadata: {
            averageLength: avgLength,
            shortItemCount: unusuallyShort.length
          },
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return anomalies;
  }

  // Optimize ongoing processes
  async optimizeProcesses() {
    const optimizations = {
      discoveryEngine: await this.optimizeDiscoveryEngine(),
      learningProcess: await this.optimizeLearningProcess(),
      knowledgeGraph: await this.optimizeKnowledgeGraph(),
      systemPerformance: await this.optimizeSystemPerformance()
    };
    
    return optimizations;
  }

  // Optimize discovery engine based on insights
  async optimizeDiscoveryEngine() {
    const optimizations = [];
    const sourcePerformance = await this.calculateSourcePerformance();
    
    // Adjust source priorities based on performance
    const topSources = sourcePerformance
      .filter(source => source.reliabilityScore > 0.8)
      .map(source => source.name);
    
    if (topSources.length > 0) {
      optimizations.push({
        type: 'source_prioritization',
        action: 'Increase monitoring frequency for top sources',
        sources: topSources,
        expectedImpact: 'Improved information quality and discovery rate'
      });
    }
    
    return optimizations;
  }

  // Optimize learning process
  async optimizeLearningProcess() {
    const optimizations = [];
    const learningStats = this.continuousLearner.getStats();
    
    // Adjust confidence thresholds
    if (learningStats.knowledgeBase.averageConfidence < 0.7) {
      optimizations.push({
        type: 'confidence_threshold',
        action: 'Increase confidence threshold for knowledge integration',
        currentThreshold: this.continuousLearner.config.confidenceThreshold,
        recommendedThreshold: 0.75,
        expectedImpact: 'Higher quality knowledge base'
      });
    }
    
    return optimizations;
  }

  // Optimize knowledge graph
  async optimizeKnowledgeGraph() {
    const optimizations = [];
    const graphStats = this.knowledgeGraph.getStats();
    
    // Improve connectivity
    if (graphStats.averageConnectivity < 2) {
      optimizations.push({
        type: 'relationship_threshold',
        action: 'Lower relationship threshold to improve connectivity',
        currentThreshold: this.knowledgeGraph.config.relationshipThreshold,
        recommendedThreshold: this.knowledgeGraph.config.relationshipThreshold * 0.8,
        expectedImpact: 'Better knowledge interconnection and discovery'
      });
    }
    
    return optimizations;
  }

  // Optimize system performance
  async optimizeSystemPerformance() {
    const optimizations = [];
    
    // Memory optimization
    const memoryUsage = process.memoryUsage();
    if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.8) {
      optimizations.push({
        type: 'memory_optimization',
        action: 'Implement knowledge base cleanup and archiving',
        currentUsage: memoryUsage.heapUsed,
        threshold: memoryUsage.heapTotal * 0.8,
        expectedImpact: 'Improved system performance and stability'
      });
    }
    
    return optimizations;
  }

  // Update current insights with new session data
  updateCurrentInsights(session) {
    // Keep only recent insights (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    this.insights.current = this.insights.current
      .filter(insight => new Date(insight.timestamp) > yesterday)
      .concat(session.insights)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.config.maxInsightsPerSession);
    
    this.insights.trends = session.trends;
    this.insights.predictions = session.predictions;
    this.insights.recommendations = session.recommendations;
    this.insights.anomalies = session.anomalies;
  }

  // Calculate insight priority
  calculateInsightPriority(confidence, impact = 1) {
    const score = confidence * impact;
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  }

  // Get current insights
  getCurrentInsights(category = null, limit = 20) {
    let insights = this.insights.current;
    
    if (category) {
      insights = insights.filter(insight => insight.category === category);
    }
    
    return insights
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  // Get performance metrics
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      currentInsights: this.insights.current.length,
      currentTrends: this.insights.trends.length,
      currentPredictions: this.insights.predictions.length,
      currentRecommendations: this.insights.recommendations.length,
      currentAnomalies: this.insights.anomalies.length
    };
  }

  // Save insights to disk
  async saveInsights() {
    try {
      const dataDir = './data/insights';
      if (!fs.existsSync('./data')) fs.mkdirSync('./data');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
      
      const insightsData = {
        insights: this.insights,
        performanceMetrics: this.performanceMetrics,
        lastUpdated: new Date().toISOString()
      };
      
      const filename = path.join(dataDir, 'proactive-insights.json');
      fs.writeFileSync(filename, JSON.stringify(insightsData, null, 2));
      
      console.log(`💾 Proactive insights saved: ${this.insights.current.length} current insights`);
    } catch (error) {
      console.error('Failed to save insights:', error.message);
    }
  }

  // Load existing insights
  async loadExistingInsights() {
    try {
      const filename = './data/insights/proactive-insights.json';
      if (!fs.existsSync(filename)) {
        console.log('🔮 No existing insights found, starting fresh');
        return;
      }
      
      const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
      
      this.insights = data.insights || this.insights;
      this.performanceMetrics = { ...this.performanceMetrics, ...data.performanceMetrics };
      
      console.log(`🔮 Loaded existing insights: ${this.insights.current.length} current insights`);
    } catch (error) {
      console.error('Failed to load existing insights:', error.message);
    }
  }
}

module.exports = ProactiveIntelligence;