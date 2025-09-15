-- Enhanced AI Agent: Database Schema for Knowledge Management
-- Database schema for storing and managing discovered knowledge, learning sessions, and insights

-- Knowledge Sources and Discovery
CREATE TABLE information_sources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  source_type VARCHAR(50) NOT NULL,
  source_url VARCHAR(500) NOT NULL,
  source_name VARCHAR(200) NOT NULL,
  reliability_score DECIMAL(3,2) DEFAULT 0.50,
  last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  discovery_method VARCHAR(100),
  status ENUM('active', 'inactive', 'error') DEFAULT 'active',
  priority ENUM('high', 'medium', 'low') DEFAULT 'medium',
  tags JSON,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_source_type (source_type),
  INDEX idx_status (status),
  INDEX idx_reliability (reliability_score)
);

CREATE TABLE discovered_information (
  id INT AUTO_INCREMENT PRIMARY KEY,
  source_id INT,
  content_hash VARCHAR(64) UNIQUE NOT NULL,
  title TEXT,
  raw_content TEXT NOT NULL,
  processed_content JSON,
  relevance_score DECIMAL(3,2) DEFAULT 0.50,
  confidence_score DECIMAL(3,2) DEFAULT 0.50,
  discovery_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processing_status ENUM('pending', 'processed', 'integrated', 'rejected') DEFAULT 'pending',
  rejection_reason TEXT,
  tags JSON,
  metadata JSON,
  url TEXT,
  FOREIGN KEY (source_id) REFERENCES information_sources(id) ON DELETE SET NULL,
  INDEX idx_processing_status (processing_status),
  INDEX idx_relevance_score (relevance_score),
  INDEX idx_discovery_timestamp (discovery_timestamp),
  INDEX idx_content_hash (content_hash)
);

-- Knowledge Graph and Relationships
CREATE TABLE knowledge_nodes (
  id VARCHAR(16) PRIMARY KEY,
  node_type VARCHAR(50) NOT NULL DEFAULT 'fact',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  properties JSON,
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0.50,
  sources JSON NOT NULL,
  tags JSON,
  source_count INT DEFAULT 1,
  connection_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_accessed TIMESTAMP,
  metadata JSON,
  INDEX idx_node_type (node_type),
  INDEX idx_confidence (confidence),
  INDEX idx_created_at (created_at),
  FULLTEXT idx_content_search (title, content)
);

CREATE TABLE knowledge_relationships (
  id VARCHAR(32) PRIMARY KEY,
  source_node_id VARCHAR(16) NOT NULL,
  target_node_id VARCHAR(16) NOT NULL,
  relationship_type VARCHAR(100) NOT NULL DEFAULT 'related',
  strength DECIMAL(3,2) NOT NULL DEFAULT 0.50,
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0.50,
  evidence JSON,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (source_node_id) REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (target_node_id) REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  INDEX idx_source_node (source_node_id),
  INDEX idx_target_node (target_node_id),
  INDEX idx_relationship_type (relationship_type),
  INDEX idx_strength (strength)
);

CREATE TABLE knowledge_clusters (
  id VARCHAR(32) PRIMARY KEY,
  cluster_name VARCHAR(200) NOT NULL,
  dominant_type VARCHAR(50),
  center_node_id VARCHAR(16),
  node_count INT DEFAULT 0,
  coherence DECIMAL(3,2) DEFAULT 0.50,
  topics JSON,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (center_node_id) REFERENCES knowledge_nodes(id) ON DELETE SET NULL,
  INDEX idx_dominant_type (dominant_type),
  INDEX idx_coherence (coherence),
  INDEX idx_node_count (node_count)
);

CREATE TABLE knowledge_cluster_nodes (
  cluster_id VARCHAR(32) NOT NULL,
  node_id VARCHAR(16) NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cluster_id, node_id),
  FOREIGN KEY (cluster_id) REFERENCES knowledge_clusters(id) ON DELETE CASCADE,
  FOREIGN KEY (node_id) REFERENCES knowledge_nodes(id) ON DELETE CASCADE
);

-- Learning History and Performance
CREATE TABLE learning_sessions (
  id VARCHAR(32) PRIMARY KEY,
  session_type VARCHAR(50) DEFAULT 'discovery_learning',
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP NULL,
  information_processed INT DEFAULT 0,
  information_integrated INT DEFAULT 0,
  information_rejected INT DEFAULT 0,
  patterns_discovered INT DEFAULT 0,
  knowledge_updated INT DEFAULT 0,
  performance_metrics JSON,
  insights_generated INT DEFAULT 0,
  status ENUM('active', 'completed', 'failed') DEFAULT 'active',
  metadata JSON,
  INDEX idx_session_type (session_type),
  INDEX idx_start_time (start_time),
  INDEX idx_status (status)
);

CREATE TABLE learning_feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  feedback_type VARCHAR(50) NOT NULL,
  source VARCHAR(100),
  feedback_data JSON NOT NULL,
  learning_impact JSON,
  applied_changes JSON,
  confidence_impact DECIMAL(3,2),
  session_id VARCHAR(32),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES learning_sessions(id) ON DELETE SET NULL,
  INDEX idx_feedback_type (feedback_type),
  INDEX idx_timestamp (timestamp)
);

-- Pattern Recognition and Analysis
CREATE TABLE knowledge_patterns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pattern_type VARCHAR(50) NOT NULL,
  pattern_value TEXT NOT NULL,
  pattern_hash VARCHAR(32) UNIQUE NOT NULL,
  occurrences INT DEFAULT 1,
  confidence DECIMAL(3,2) DEFAULT 0.50,
  sources JSON,
  related_nodes JSON,
  first_discovered TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  metadata JSON,
  INDEX idx_pattern_type (pattern_type),
  INDEX idx_occurrences (occurrences),
  INDEX idx_confidence (confidence),
  INDEX idx_pattern_hash (pattern_hash)
);

-- Proactive Intelligence and Insights
CREATE TABLE generated_insights (
  id INT AUTO_INCREMENT PRIMARY KEY,
  insight_type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  priority ENUM('high', 'medium', 'low') NOT NULL,
  category VARCHAR(50),
  actionable BOOLEAN DEFAULT FALSE,
  actions JSON,
  evidence JSON,
  metadata JSON,
  session_id VARCHAR(32),
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  status ENUM('active', 'applied', 'expired', 'rejected') DEFAULT 'active',
  FOREIGN KEY (session_id) REFERENCES learning_sessions(id) ON DELETE SET NULL,
  INDEX idx_insight_type (insight_type),
  INDEX idx_priority (priority),
  INDEX idx_category (category),
  INDEX idx_generated_at (generated_at),
  INDEX idx_status (status)
);

CREATE TABLE predictions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prediction_type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  timeline VARCHAR(50),
  predicted_outcome JSON,
  evidence JSON,
  accuracy_score DECIMAL(3,2) NULL,
  actual_outcome JSON,
  verified_at TIMESTAMP NULL,
  session_id VARCHAR(32),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  status ENUM('pending', 'verified', 'failed', 'expired') DEFAULT 'pending',
  FOREIGN KEY (session_id) REFERENCES learning_sessions(id) ON DELETE SET NULL,
  INDEX idx_prediction_type (prediction_type),
  INDEX idx_timeline (timeline),
  INDEX idx_confidence (confidence),
  INDEX idx_status (status)
);

CREATE TABLE recommendations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recommendation_type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  priority ENUM('high', 'medium', 'low') NOT NULL,
  actions JSON NOT NULL,
  expected_impact TEXT,
  acceptance_score DECIMAL(3,2) NULL,
  implementation_status ENUM('pending', 'accepted', 'rejected', 'implemented') DEFAULT 'pending',
  feedback JSON,
  session_id VARCHAR(32),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  implemented_at TIMESTAMP NULL,
  FOREIGN KEY (session_id) REFERENCES learning_sessions(id) ON DELETE SET NULL,
  INDEX idx_recommendation_type (recommendation_type),
  INDEX idx_priority (priority),
  INDEX idx_implementation_status (implementation_status)
);

-- Trend Analysis
CREATE TABLE identified_trends (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trend_topic VARCHAR(200) NOT NULL,
  trend_type VARCHAR(50) DEFAULT 'topic_trend',
  trajectory ENUM('increasing', 'decreasing', 'stable', 'volatile') NOT NULL,
  growth_rate DECIMAL(5,2),
  confidence DECIMAL(3,2) NOT NULL,
  significance ENUM('high', 'medium', 'low') NOT NULL,
  time_window VARCHAR(50) NOT NULL,
  current_count INT DEFAULT 0,
  previous_count INT DEFAULT 0,
  supporting_evidence JSON,
  related_topics JSON,
  identified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  status ENUM('active', 'confirmed', 'expired') DEFAULT 'active',
  INDEX idx_trend_topic (trend_topic),
  INDEX idx_trajectory (trajectory),
  INDEX idx_significance (significance),
  INDEX idx_identified_at (identified_at)
);

-- Anomaly Detection
CREATE TABLE detected_anomalies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  anomaly_type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  severity ENUM('high', 'medium', 'low') NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  affected_items JSON,
  detection_criteria JSON,
  recommended_actions JSON,
  resolution_status ENUM('open', 'investigating', 'resolved', 'false_positive') DEFAULT 'open',
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  metadata JSON,
  INDEX idx_anomaly_type (anomaly_type),
  INDEX idx_severity (severity),
  INDEX idx_resolution_status (resolution_status),
  INDEX idx_detected_at (detected_at)
);

-- System Performance and Monitoring
CREATE TABLE system_performance_metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  metric_type VARCHAR(50) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,4) NOT NULL,
  unit VARCHAR(20),
  threshold_warning DECIMAL(10,4),
  threshold_critical DECIMAL(10,4),
  status ENUM('normal', 'warning', 'critical') DEFAULT 'normal',
  component VARCHAR(50),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSON,
  INDEX idx_metric_type (metric_type),
  INDEX idx_component (component),
  INDEX idx_recorded_at (recorded_at),
  INDEX idx_status (status)
);

-- User Interaction and Feedback
CREATE TABLE user_knowledge_interactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(50),
  interaction_type VARCHAR(50) NOT NULL,
  query_text TEXT,
  results_returned INT DEFAULT 0,
  results_clicked JSON,
  satisfaction_score INT,
  feedback_text TEXT,
  knowledge_applied BOOLEAN DEFAULT FALSE,
  session_duration INT, -- seconds
  interaction_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  INDEX idx_user_id (user_id),
  INDEX idx_interaction_type (interaction_type),
  INDEX idx_interaction_timestamp (interaction_timestamp)
);

-- Search and Query Optimization
CREATE TABLE knowledge_search_queries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  query_text TEXT NOT NULL,
  query_hash VARCHAR(32) UNIQUE NOT NULL,
  results_count INT DEFAULT 0,
  average_relevance DECIMAL(3,2),
  execution_time_ms INT,
  optimization_suggestions JSON,
  frequency INT DEFAULT 1,
  first_queried TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_queried TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_query_hash (query_hash),
  INDEX idx_frequency (frequency),
  INDEX idx_last_queried (last_queried),
  FULLTEXT idx_query_search (query_text)
);

-- Integration Logs
CREATE TABLE integration_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  integration_type VARCHAR(50) NOT NULL,
  component_name VARCHAR(100) NOT NULL,
  operation VARCHAR(50) NOT NULL,
  status ENUM('success', 'partial', 'failed') NOT NULL,
  details TEXT,
  execution_time_ms INT,
  error_message TEXT,
  data_processed INT DEFAULT 0,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSON,
  INDEX idx_integration_type (integration_type),
  INDEX idx_component_name (component_name),
  INDEX idx_status (status),
  INDEX idx_timestamp (timestamp)
);

-- Create views for common queries
CREATE VIEW knowledge_summary AS
SELECT 
  kn.node_type,
  COUNT(*) as node_count,
  AVG(kn.confidence) as avg_confidence,
  AVG(kn.connection_count) as avg_connections,
  MIN(kn.created_at) as earliest_node,
  MAX(kn.created_at) as latest_node
FROM knowledge_nodes kn
GROUP BY kn.node_type;

CREATE VIEW learning_performance AS
SELECT 
  DATE(ls.start_time) as learning_date,
  COUNT(*) as sessions_count,
  SUM(ls.information_processed) as total_processed,
  SUM(ls.information_integrated) as total_integrated,
  SUM(ls.patterns_discovered) as total_patterns,
  AVG(ls.information_integrated / NULLIF(ls.information_processed, 0)) as avg_integration_rate
FROM learning_sessions ls
WHERE ls.status = 'completed'
GROUP BY DATE(ls.start_time)
ORDER BY learning_date DESC;

CREATE VIEW insight_effectiveness AS
SELECT 
  gi.insight_type,
  gi.category,
  COUNT(*) as total_insights,
  SUM(CASE WHEN gi.status = 'applied' THEN 1 ELSE 0 END) as applied_count,
  AVG(gi.confidence) as avg_confidence,
  COUNT(CASE WHEN gi.priority = 'high' THEN 1 END) as high_priority_count
FROM generated_insights gi
GROUP BY gi.insight_type, gi.category
ORDER BY applied_count DESC, avg_confidence DESC;

-- Indexes for performance optimization
CREATE INDEX idx_knowledge_nodes_composite ON knowledge_nodes(node_type, confidence, created_at);
CREATE INDEX idx_discovered_info_composite ON discovered_information(processing_status, relevance_score, discovery_timestamp);
CREATE INDEX idx_insights_priority_status ON generated_insights(priority, status, generated_at);
CREATE INDEX idx_trends_active ON identified_trends(status, significance, identified_at);

-- Insert default configuration data
INSERT INTO information_sources (source_type, source_name, source_url, discovery_method, reliability_score, priority, tags) VALUES
('news', 'TechCrunch RSS', 'https://techcrunch.com/feed/', 'rss', 0.85, 'high', '["technology", "startups", "ai"]'),
('news', 'Hacker News', 'https://hacker-news.firebaseio.com/v0/topstories.json', 'api', 0.80, 'high', '["technology", "programming", "startups"]'),
('research', 'ArXiv AI Papers', 'http://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=10', 'xml', 0.95, 'high', '["ai", "research", "machine-learning"]'),
('web', 'OpenAI Blog', 'https://openai.com/blog', 'scrape', 0.90, 'high', '["ai", "research", "technology"]'),
('api', 'GitHub Trending', 'https://api.github.com/search/repositories?q=language:javascript&sort=stars&order=desc', 'api', 0.75, 'medium', '["programming", "open-source", "trends"]');

-- Create stored procedures for common operations
DELIMITER //

CREATE PROCEDURE GetKnowledgeStats()
BEGIN
  SELECT 
    (SELECT COUNT(*) FROM knowledge_nodes) as total_nodes,
    (SELECT COUNT(*) FROM knowledge_relationships) as total_relationships,
    (SELECT COUNT(*) FROM knowledge_clusters) as total_clusters,
    (SELECT AVG(confidence) FROM knowledge_nodes) as avg_confidence,
    (SELECT COUNT(*) FROM generated_insights WHERE status = 'active') as active_insights,
    (SELECT COUNT(*) FROM learning_sessions WHERE status = 'active') as active_sessions;
END //

CREATE PROCEDURE CleanupExpiredData()
BEGIN
  -- Clean up expired insights
  UPDATE generated_insights 
  SET status = 'expired' 
  WHERE expires_at < NOW() AND status = 'active';
  
  -- Clean up expired predictions
  UPDATE predictions 
  SET status = 'expired' 
  WHERE expires_at < NOW() AND status = 'pending';
  
  -- Clean up old performance metrics (keep last 30 days)
  DELETE FROM system_performance_metrics 
  WHERE recorded_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
  
  -- Clean up old search queries with low frequency (keep popular ones)
  DELETE FROM knowledge_search_queries 
  WHERE frequency = 1 AND last_queried < DATE_SUB(NOW(), INTERVAL 7 DAY);
END //

DELIMITER ;

-- Add triggers for automatic updates
DELIMITER //

CREATE TRIGGER update_node_connections 
AFTER INSERT ON knowledge_relationships
FOR EACH ROW
BEGIN
  UPDATE knowledge_nodes 
  SET connection_count = (
    SELECT COUNT(*) FROM knowledge_relationships 
    WHERE source_node_id = NEW.source_node_id OR target_node_id = NEW.source_node_id
  )
  WHERE id = NEW.source_node_id;
  
  UPDATE knowledge_nodes 
  SET connection_count = (
    SELECT COUNT(*) FROM knowledge_relationships 
    WHERE source_node_id = NEW.target_node_id OR target_node_id = NEW.target_node_id
  )
  WHERE id = NEW.target_node_id;
END //

CREATE TRIGGER update_cluster_node_count
AFTER INSERT ON knowledge_cluster_nodes
FOR EACH ROW
BEGIN
  UPDATE knowledge_clusters 
  SET node_count = (
    SELECT COUNT(*) FROM knowledge_cluster_nodes 
    WHERE cluster_id = NEW.cluster_id
  )
  WHERE id = NEW.cluster_id;
END //

DELIMITER ;