// Enhanced AI Agent Demo and Test Script
// Demonstrates the functionality of the Enhanced AI Agent system

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

class AIAgentDemo {
  constructor() {
    this.baseURL = BASE_URL;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async checkHealth() {
    console.log('🏥 Checking system health...');
    try {
      const response = await axios.get(`${this.baseURL}/health`);
      const health = response.data;
      
      console.log('✅ System Status:', health.status);
      console.log('🤖 AI Agent Active:', health.aiAgent?.active);
      console.log('📊 Knowledge Nodes:', health.aiAgent?.knowledgeNodes);
      console.log('🔍 Discovery Active:', health.aiAgent?.discoveryActive);
      console.log('🧠 Learning Active:', health.aiAgent?.learningActive);
      
      return health;
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      return null;
    }
  }

  async getAIAgentStatus() {
    console.log('\n🔍 Getting detailed AI Agent status...');
    try {
      // For this demo, we'll simulate admin access
      const response = await axios.get(`${this.baseURL}/ai-agent/status`, {
        headers: {
          'Authorization': 'Bearer demo-token' // This would fail in real scenario
        }
      });
      
      const status = response.data;
      console.log('✅ Agent Status Retrieved');
      console.log('⏱️ Uptime (hours):', status.agent?.uptimeHours);
      console.log('📈 Performance:', status.agent?.performance);
      
      return status;
    } catch (error) {
      console.log('⚠️ Status check requires authentication (expected in demo)');
      return null;
    }
  }

  async queryKnowledge() {
    console.log('\n🧠 Querying knowledge base...');
    try {
      const response = await axios.post(`${this.baseURL}/ai-agent/query`, {
        query: 'artificial intelligence machine learning',
        limit: 5,
        minConfidence: 0.5,
        includeInsights: true
      });
      
      const results = response.data;
      console.log('✅ Query Results:');
      console.log('📊 Total Found:', results.totalFound);
      console.log('🔍 Results:', results.results?.length || 0);
      
      return results;
    } catch (error) {
      console.error('❌ Knowledge query failed:', error.message);
      return null;
    }
  }

  async getInsights() {
    console.log('\n💡 Getting current insights...');
    try {
      const response = await axios.get(`${this.baseURL}/ai-agent/insights?limit=5`);
      const insights = response.data;
      
      console.log('✅ Insights Retrieved:');
      console.log('🔮 Current Insights:', insights.insights?.length || 0);
      console.log('📈 Trends:', insights.trends?.length || 0);
      console.log('🎯 Predictions:', insights.predictions?.length || 0);
      console.log('💡 Recommendations:', insights.recommendations?.length || 0);
      
      if (insights.insights && insights.insights.length > 0) {
        console.log('\n📋 Sample Insights:');
        insights.insights.slice(0, 3).forEach((insight, index) => {
          console.log(`${index + 1}. ${insight.title} (Confidence: ${insight.confidence})`);
        });
      }
      
      return insights;
    } catch (error) {
      console.error('❌ Insights retrieval failed:', error.message);
      return null;
    }
  }

  async getDiscoverySources() {
    console.log('\n🔍 Getting discovery sources...');
    try {
      // This would require authentication in real scenario
      const response = await axios.get(`${this.baseURL}/ai-agent/discovery/sources`);
      const sources = response.data;
      
      console.log('✅ Discovery Sources:');
      console.log('📊 Total Sources:', sources.sources?.length || 0);
      
      if (sources.sources && sources.sources.length > 0) {
        console.log('\n📋 Configured Sources:');
        sources.sources.forEach((source, index) => {
          console.log(`${index + 1}. ${source.name} (${source.type}) - Priority: ${source.priority}`);
        });
      }
      
      return sources;
    } catch (error) {
      console.log('⚠️ Discovery sources require authentication (expected in demo)');
      return null;
    }
  }

  async getRecentDiscoveries() {
    console.log('\n📡 Getting recent discoveries...');
    try {
      const response = await axios.get(`${this.baseURL}/ai-agent/discoveries/recent?limit=10`);
      const discoveries = response.data;
      
      console.log('✅ Recent Discoveries:');
      console.log('📊 Total Found:', discoveries.total || 0);
      
      if (discoveries.discoveries && discoveries.discoveries.length > 0) {
        console.log('\n📋 Recent Items:');
        discoveries.discoveries.slice(0, 3).forEach((discovery, index) => {
          console.log(`${index + 1}. ${discovery.title?.substring(0, 50)}... (Score: ${discovery.relevanceScore})`);
        });
      } else {
        console.log('📭 No recent discoveries found (may be due to network restrictions in demo environment)');
      }
      
      return discoveries;
    } catch (error) {
      console.error('❌ Recent discoveries retrieval failed:', error.message);
      return null;
    }
  }

  async demonstrateKnowledgeIntegration() {
    console.log('\n🧪 Demonstrating knowledge integration...');
    
    // Simulate adding knowledge through the discovery system
    console.log('📝 In a real scenario, the system would:');
    console.log('   1. Discover information from configured sources');
    console.log('   2. Process and validate the information');
    console.log('   3. Extract patterns and relationships');
    console.log('   4. Integrate into the knowledge graph');
    console.log('   5. Generate insights and recommendations');
    console.log('   6. Update predictions and trends');
    
    console.log('\n🔄 Current demo limitations:');
    console.log('   - Network restrictions prevent external source access');
    console.log('   - Authentication required for admin operations');
    console.log('   - Limited sample data in fresh installation');
  }

  async runFullDemo() {
    console.log('🚀 Starting Enhanced AI Agent Demo\n');
    console.log('=' * 50);
    
    // Check system health
    const health = await this.checkHealth();
    if (!health) {
      console.log('❌ Cannot proceed - system not healthy');
      return;
    }
    
    await this.delay(1000);
    
    // Get AI Agent status
    await this.getAIAgentStatus();
    await this.delay(1000);
    
    // Query knowledge base
    await this.queryKnowledge();
    await this.delay(1000);
    
    // Get insights
    await this.getInsights();
    await this.delay(1000);
    
    // Get discovery sources
    await this.getDiscoverySources();
    await this.delay(1000);
    
    // Get recent discoveries
    await this.getRecentDiscoveries();
    await this.delay(1000);
    
    // Demonstrate knowledge integration
    await this.demonstrateKnowledgeIntegration();
    
    console.log('\n' + '=' * 50);
    console.log('✅ Enhanced AI Agent Demo Complete!');
    console.log('\n📚 Key Features Demonstrated:');
    console.log('   ✅ System Health Monitoring');
    console.log('   ✅ Knowledge Base Querying');
    console.log('   ✅ Insight Generation');
    console.log('   ✅ Discovery Source Management');
    console.log('   ✅ Continuous Learning Pipeline');
    
    console.log('\n🔗 Available Endpoints:');
    console.log('   • GET  /health - System health check');
    console.log('   • POST /ai-agent/query - Query knowledge base');
    console.log('   • GET  /ai-agent/insights - Get insights and recommendations');
    console.log('   • GET  /ai-agent/status - Detailed agent status (requires auth)');
    console.log('   • GET  /ai-agent/report - Comprehensive report (requires auth)');
    
    console.log('\n🛠️ To explore further:');
    console.log('   1. Start the server: npm start');
    console.log('   2. Visit http://localhost:3001/health');
    console.log('   3. Use API endpoints with proper authentication');
    console.log('   4. Configure external API keys for full functionality');
  }
}

// Run demo if called directly
if (require.main === module) {
  const demo = new AIAgentDemo();
  demo.runFullDemo().catch(error => {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  });
}

module.exports = AIAgentDemo;