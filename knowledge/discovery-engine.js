// Enhanced AI Agent: Information Discovery Engine
// Continuously discovers new information from various sources

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

class InformationDiscoveryEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      webScrapingEnabled: true,
      apiMonitoringEnabled: true,
      newsAnalysisEnabled: true,
      socialMediaEnabled: true,
      researchTrackingEnabled: true,
      discoveryInterval: 60000, // 1 minute
      maxConcurrentRequests: 5,
      sources: [],
      ...config
    };
    
    this.activeSources = new Map();
    this.discoveries = [];
    this.isRunning = false;
    this.stats = {
      totalDiscoveries: 0,
      successfulRequests: 0,
      failedRequests: 0,
      sourcesMonitored: 0,
      lastDiscoveryTime: null
    };
    
    console.log('🔍 Information Discovery Engine initialized');
  }

  // Start continuous discovery
  async startDiscovery() {
    if (this.isRunning) {
      console.log('⚠️ Discovery engine already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting continuous information discovery...');
    
    // Load default sources if none configured
    if (this.config.sources.length === 0) {
      await this.loadDefaultSources();
    }

    // Start discovery intervals
    this.discoveryInterval = setInterval(async () => {
      await this.performDiscoveryRound();
    }, this.config.discoveryInterval);

    // Initial discovery
    await this.performDiscoveryRound();
    
    this.emit('discovery-started');
  }

  // Stop discovery
  stopDiscovery() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
    
    console.log('🔄 Information discovery stopped');
    this.emit('discovery-stopped');
  }

  // Load default information sources
  async loadDefaultSources() {
    const defaultSources = [
      // News sources
      {
        type: 'news',
        name: 'TechCrunch RSS',
        url: 'https://techcrunch.com/feed/',
        method: 'rss',
        priority: 'high',
        tags: ['technology', 'startups', 'ai']
      },
      {
        type: 'news',
        name: 'Hacker News',
        url: 'https://hacker-news.firebaseio.com/v0/topstories.json',
        method: 'api',
        priority: 'high',
        tags: ['technology', 'programming', 'startups']
      },
      
      // Research sources
      {
        type: 'research',
        name: 'ArXiv AI Papers',
        url: 'http://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=10',
        method: 'xml',
        priority: 'medium',
        tags: ['ai', 'research', 'machine-learning']
      },
      
      // Web sources
      {
        type: 'web',
        name: 'OpenAI Blog',
        url: 'https://openai.com/blog',
        method: 'scrape',
        priority: 'high',
        tags: ['ai', 'research', 'technology']
      },
      
      // API sources
      {
        type: 'api',
        name: 'GitHub Trending',
        url: 'https://api.github.com/search/repositories?q=language:javascript&sort=stars&order=desc',
        method: 'api',
        priority: 'medium',
        tags: ['programming', 'open-source', 'trends']
      }
    ];

    this.config.sources = defaultSources;
    console.log(`📂 Loaded ${defaultSources.length} default information sources`);
  }

  // Perform a complete discovery round
  async performDiscoveryRound() {
    if (!this.isRunning) return;

    console.log('🔄 Starting discovery round...');
    const startTime = Date.now();
    let discoveries = [];

    const promises = this.config.sources.map(async (source) => {
      try {
        const sourceDiscoveries = await this.discoverFromSource(source);
        discoveries = discoveries.concat(sourceDiscoveries);
        this.stats.successfulRequests++;
      } catch (error) {
        console.error(`❌ Discovery failed for ${source.name}:`, error.message);
        this.stats.failedRequests++;
      }
    });

    // Execute with concurrency limit
    await this.executeConcurrent(promises, this.config.maxConcurrentRequests);

    // Process discoveries
    const validDiscoveries = discoveries.filter(d => d && d.content);
    
    if (validDiscoveries.length > 0) {
      await this.processDiscoveries(validDiscoveries);
      this.stats.totalDiscoveries += validDiscoveries.length;
      this.stats.lastDiscoveryTime = new Date().toISOString();
      
      console.log(`✅ Discovery round completed: ${validDiscoveries.length} new discoveries`);
      this.emit('discoveries-found', validDiscoveries);
    } else {
      console.log('📭 No new discoveries found');
    }

    const duration = Date.now() - startTime;
    console.log(`⏱️ Discovery round took ${duration}ms`);
  }

  // Discover information from a specific source
  async discoverFromSource(source) {
    console.log(`🔍 Discovering from ${source.name}...`);
    
    switch (source.method) {
      case 'api':
        return await this.discoverFromAPI(source);
      case 'scrape':
        return await this.discoverFromWebScraping(source);
      case 'rss':
        return await this.discoverFromRSS(source);
      case 'xml':
        return await this.discoverFromXML(source);
      default:
        throw new Error(`Unknown discovery method: ${source.method}`);
    }
  }

  // Discover from API endpoints
  async discoverFromAPI(source) {
    try {
      const response = await axios.get(source.url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'AITaskFlo-DiscoveryEngine/3.0.0',
          'Accept': 'application/json'
        }
      });

      const discoveries = [];
      
      if (source.name === 'Hacker News') {
        // Process Hacker News API
        const storyIds = response.data.slice(0, 10);
        for (const id of storyIds) {
          try {
            const storyResponse = await axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
            const story = storyResponse.data;
            
            if (story && story.title) {
              discoveries.push({
                source: source.name,
                type: 'news',
                title: story.title,
                content: story.text || story.title,
                url: story.url,
                score: story.score,
                timestamp: new Date().toISOString(),
                tags: source.tags,
                metadata: {
                  author: story.by,
                  score: story.score,
                  comments: story.descendants
                }
              });
            }
          } catch (error) {
            console.error(`Failed to fetch story ${id}:`, error.message);
          }
        }
      } else if (source.name === 'GitHub Trending') {
        // Process GitHub API
        response.data.items.forEach(repo => {
          discoveries.push({
            source: source.name,
            type: 'repository',
            title: repo.full_name,
            content: repo.description || repo.full_name,
            url: repo.html_url,
            score: repo.stargazers_count,
            timestamp: new Date().toISOString(),
            tags: source.tags,
            metadata: {
              language: repo.language,
              stars: repo.stargazers_count,
              forks: repo.forks_count,
              issues: repo.open_issues_count
            }
          });
        });
      }

      return discoveries;
    } catch (error) {
      throw new Error(`API discovery failed: ${error.message}`);
    }
  }

  // Discover from web scraping
  async discoverFromWebScraping(source) {
    try {
      const response = await axios.get(source.url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AITaskFlo-DiscoveryEngine/3.0.0)'
        }
      });

      const $ = cheerio.load(response.data);
      const discoveries = [];

      if (source.name === 'OpenAI Blog') {
        // Scrape OpenAI blog posts
        $('article, .post, .blog-post').each((i, element) => {
          const title = $(element).find('h1, h2, h3, .title').first().text().trim();
          const content = $(element).find('p').first().text().trim();
          const link = $(element).find('a').first().attr('href');
          
          if (title && content) {
            discoveries.push({
              source: source.name,
              type: 'blog_post',
              title: title,
              content: content,
              url: link ? new URL(link, source.url).href : source.url,
              timestamp: new Date().toISOString(),
              tags: source.tags,
              metadata: {
                wordCount: content.split(' ').length,
                scrapedFrom: source.url
              }
            });
          }
        });
      }

      return discoveries;
    } catch (error) {
      throw new Error(`Web scraping failed: ${error.message}`);
    }
  }

  // Discover from RSS feeds
  async discoverFromRSS(source) {
    // This would typically use a feed parser library
    // For now, implementing a basic version
    try {
      const response = await axios.get(source.url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'AITaskFlo-DiscoveryEngine/3.0.0'
        }
      });

      const discoveries = [];
      // Basic RSS parsing using cheerio
      const $ = cheerio.load(response.data, { xmlMode: true });
      
      $('item').each((i, element) => {
        const title = $(element).find('title').text().trim();
        const description = $(element).find('description').text().trim();
        const link = $(element).find('link').text().trim();
        const pubDate = $(element).find('pubDate').text().trim();
        
        if (title && description) {
          discoveries.push({
            source: source.name,
            type: 'rss_article',
            title: title,
            content: description,
            url: link,
            timestamp: pubDate || new Date().toISOString(),
            tags: source.tags,
            metadata: {
              pubDate: pubDate,
              feedUrl: source.url
            }
          });
        }
      });

      return discoveries;
    } catch (error) {
      throw new Error(`RSS discovery failed: ${error.message}`);
    }
  }

  // Discover from XML sources (like ArXiv)
  async discoverFromXML(source) {
    try {
      const response = await axios.get(source.url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'AITaskFlo-DiscoveryEngine/3.0.0'
        }
      });

      const discoveries = [];
      const $ = cheerio.load(response.data, { xmlMode: true });
      
      if (source.name === 'ArXiv AI Papers') {
        $('entry').each((i, element) => {
          const title = $(element).find('title').text().trim();
          const summary = $(element).find('summary').text().trim();
          const link = $(element).find('id').text().trim();
          const published = $(element).find('published').text().trim();
          const authors = [];
          
          $(element).find('author name').each((j, author) => {
            authors.push($(author).text().trim());
          });
          
          if (title && summary) {
            discoveries.push({
              source: source.name,
              type: 'research_paper',
              title: title,
              content: summary,
              url: link,
              timestamp: published || new Date().toISOString(),
              tags: source.tags,
              metadata: {
                authors: authors,
                published: published,
                arxivId: link.split('/').pop()
              }
            });
          }
        });
      }

      return discoveries;
    } catch (error) {
      throw new Error(`XML discovery failed: ${error.message}`);
    }
  }

  // Execute promises with concurrency limit
  async executeConcurrent(promises, limit) {
    const results = [];
    for (let i = 0; i < promises.length; i += limit) {
      const batch = promises.slice(i, i + limit);
      const batchResults = await Promise.allSettled(batch);
      results.push(...batchResults);
    }
    return results;
  }

  // Process discovered information
  async processDiscoveries(discoveries) {
    // Sort by priority and relevance
    const processed = discoveries
      .filter(d => d.content && d.content.length > 20) // Filter out very short content
      .map(discovery => ({
        ...discovery,
        id: this.generateDiscoveryId(discovery),
        relevanceScore: this.calculateRelevanceScore(discovery),
        processedAt: new Date().toISOString()
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Store discoveries
    await this.storeDiscoveries(processed);
    
    // Emit event for further processing
    this.emit('discoveries-processed', processed);
    
    return processed;
  }

  // Generate unique ID for discovery
  generateDiscoveryId(discovery) {
    const content = discovery.title + discovery.content;
    return require('crypto')
      .createHash('md5')
      .update(content)
      .digest('hex');
  }

  // Calculate relevance score for discovery
  calculateRelevanceScore(discovery) {
    let score = 0;
    
    // Base score from source priority
    const priorityScores = { high: 10, medium: 5, low: 2 };
    const sourceConfig = this.config.sources.find(s => s.name === discovery.source);
    score += priorityScores[sourceConfig?.priority] || 2;
    
    // Content length bonus
    score += Math.min(discovery.content.length / 100, 5);
    
    // Tag relevance
    const aiKeywords = ['ai', 'artificial intelligence', 'machine learning', 'neural', 'deep learning'];
    const techKeywords = ['technology', 'software', 'programming', 'automation'];
    
    const content = (discovery.title + ' ' + discovery.content).toLowerCase();
    
    aiKeywords.forEach(keyword => {
      if (content.includes(keyword)) score += 3;
    });
    
    techKeywords.forEach(keyword => {
      if (content.includes(keyword)) score += 1;
    });
    
    // External score (GitHub stars, HN score, etc.)
    if (discovery.score) {
      score += Math.log10(discovery.score + 1);
    }
    
    return Math.round(score * 10) / 10;
  }

  // Store discoveries
  async storeDiscoveries(discoveries) {
    try {
      const storageDir = './data/discoveries';
      if (!fs.existsSync('./data')) fs.mkdirSync('./data');
      if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir);
      
      const filename = `discoveries-${new Date().toISOString().split('T')[0]}.json`;
      const filepath = path.join(storageDir, filename);
      
      let existingData = [];
      if (fs.existsSync(filepath)) {
        const data = fs.readFileSync(filepath, 'utf8');
        existingData = data ? JSON.parse(data) : [];
      }
      
      // Merge with existing discoveries (avoid duplicates)
      const existingIds = new Set(existingData.map(d => d.id));
      const newDiscoveries = discoveries.filter(d => !existingIds.has(d.id));
      
      if (newDiscoveries.length > 0) {
        existingData.push(...newDiscoveries);
        fs.writeFileSync(filepath, JSON.stringify(existingData, null, 2));
        console.log(`💾 Stored ${newDiscoveries.length} new discoveries`);
      }
      
      // Keep discoveries in memory for quick access
      this.discoveries = [...existingData.slice(-1000)]; // Keep last 1000
      
    } catch (error) {
      console.error('Failed to store discoveries:', error.message);
    }
  }

  // Get discovery statistics
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      sourcesConfigured: this.config.sources.length,
      discoveredItemsInMemory: this.discoveries.length,
      averageRelevanceScore: this.discoveries.length > 0 
        ? this.discoveries.reduce((sum, d) => sum + d.relevanceScore, 0) / this.discoveries.length 
        : 0
    };
  }

  // Get recent discoveries
  getRecentDiscoveries(limit = 50) {
    return this.discoveries
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  // Search discoveries
  searchDiscoveries(query, limit = 20) {
    const queryLower = query.toLowerCase();
    return this.discoveries
      .filter(d => 
        d.title.toLowerCase().includes(queryLower) ||
        d.content.toLowerCase().includes(queryLower) ||
        d.tags.some(tag => tag.toLowerCase().includes(queryLower))
      )
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  // Add custom source
  addSource(source) {
    this.config.sources.push(source);
    console.log(`➕ Added new information source: ${source.name}`);
    this.emit('source-added', source);
  }

  // Remove source
  removeSource(sourceName) {
    const index = this.config.sources.findIndex(s => s.name === sourceName);
    if (index > -1) {
      const removed = this.config.sources.splice(index, 1)[0];
      console.log(`➖ Removed information source: ${sourceName}`);
      this.emit('source-removed', removed);
      return true;
    }
    return false;
  }
}

module.exports = InformationDiscoveryEngine;