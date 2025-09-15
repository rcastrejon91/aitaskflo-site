/**
 * Genetic Algorithm - Evolutionary optimization system
 * Part of the AITaskFlo autonomous AI agent system
 */

const { v4: uuidv4 } = require('uuid');

class GeneticAlgorithm {
  constructor(config = {}) {
    this.agentId = config.agentId || 'default';
    this.name = 'GeneticAlgorithm';
    this.version = '1.0.0';
    this.status = 'inactive';
    
    // Genetic algorithm parameters
    this.config = {
      populationSize: config.populationSize || 50,
      mutationRate: config.mutationRate || 0.1,
      crossoverRate: config.crossoverRate || 0.7,
      elitismRate: 0.1, // Keep top 10% of population
      maxGenerations: 1000,
      convergenceThreshold: 0.001,
      ...config
    };
    
    // Population management
    this.population = [];
    this.currentGeneration = 0;
    this.bestIndividual = null;
    this.generationHistory = [];
    
    // Fitness tracking
    this.fitnessStats = {
      maxFitness: 0,
      avgFitness: 0,
      minFitness: 0,
      fitnessVariance: 0
    };
    
    // Evolution strategies
    this.evolutionStrategies = {
      selection: {
        tournament: this.tournamentSelection.bind(this),
        roulette: this.rouletteSelection.bind(this),
        rank: this.rankSelection.bind(this),
        elitist: this.elitistSelection.bind(this)
      },
      crossover: {
        uniform: this.uniformCrossover.bind(this),
        singlePoint: this.singlePointCrossover.bind(this),
        twoPoint: this.twoPointCrossover.bind(this),
        arithmetic: this.arithmeticCrossover.bind(this)
      },
      mutation: {
        gaussian: this.gaussianMutation.bind(this),
        uniform: this.uniformMutation.bind(this),
        boundary: this.boundaryMutation.bind(this),
        adaptive: this.adaptiveMutation.bind(this)
      }
    };
    
    // Current strategy configuration
    this.currentStrategies = {
      selection: 'tournament',
      crossover: 'uniform',
      mutation: 'adaptive'
    };
    
    // Gene definitions for AI agent optimization
    this.geneDefinitions = {
      autonomyLevel: { min: 0.0, max: 1.0, type: 'continuous' },
      emotionWeight: { min: 0.0, max: 1.0, type: 'continuous' },
      logicWeight: { min: 0.0, max: 1.0, type: 'continuous' },
      decisionThreshold: { min: 0.1, max: 0.9, type: 'continuous' },
      learningRate: { min: 0.01, max: 0.3, type: 'continuous' },
      responseTime: { min: 100, max: 5000, type: 'integer' },
      creativityLevel: { min: 0.0, max: 1.0, type: 'continuous' },
      riskTolerance: { min: 0.0, max: 1.0, type: 'continuous' },
      adaptationSpeed: { min: 0.1, max: 1.0, type: 'continuous' },
      memoryRetention: { min: 0.5, max: 1.0, type: 'continuous' }
    };
    
    // Performance metrics for fitness evaluation
    this.performanceMetrics = {
      accuracy: 0.5,
      efficiency: 0.5,
      userSatisfaction: 0.5,
      adaptability: 0.5,
      stability: 0.5
    };
  }

  async initialize() {
    console.log(`🧬 Initializing ${this.name} for agent ${this.agentId}...`);
    
    try {
      // Load existing population if available
      await this.loadPopulation();
      
      // Initialize population if empty
      if (this.population.length === 0) {
        await this.initializePopulation();
      }
      
      // Evaluate initial population
      await this.evaluatePopulation();
      
      this.status = 'active';
      console.log(`✅ ${this.name} initialized with population of ${this.population.length}`);
    } catch (error) {
      console.error(`❌ ${this.name} initialization failed:`, error);
      this.status = 'error';
      throw error;
    }
  }

  /**
   * Initialize population with random individuals
   */
  async initializePopulation() {
    console.log(`🌱 Creating initial population of ${this.config.populationSize} individuals...`);
    
    this.population = [];
    
    for (let i = 0; i < this.config.populationSize; i++) {
      const individual = {
        id: uuidv4(),
        generation: 0,
        genes: this.createRandomGenes(),
        fitness: 0,
        age: 0,
        parentIds: null,
        mutations: 0,
        crossovers: 0
      };
      
      this.population.push(individual);
    }
    
    console.log(`✅ Initial population created with ${this.population.length} individuals`);
  }

  /**
   * Create random genes for an individual
   */
  createRandomGenes() {
    const genes = {};
    
    for (const [geneName, definition] of Object.entries(this.geneDefinitions)) {
      if (definition.type === 'continuous') {
        genes[geneName] = Math.random() * (definition.max - definition.min) + definition.min;
      } else if (definition.type === 'integer') {
        genes[geneName] = Math.floor(Math.random() * (definition.max - definition.min + 1)) + definition.min;
      }
    }
    
    return genes;
  }

  /**
   * Evaluate fitness of entire population
   */
  async evaluatePopulation() {
    console.log(`📊 Evaluating population fitness...`);
    
    for (const individual of this.population) {
      individual.fitness = await this.calculateFitness(individual);
    }
    
    // Update population statistics
    this.updatePopulationStats();
    
    // Find best individual
    this.bestIndividual = this.population.reduce((best, current) => 
      current.fitness > best.fitness ? current : best
    );
    
    console.log(`📈 Population evaluated. Best fitness: ${this.bestIndividual.fitness.toFixed(4)}`);
  }

  /**
   * Calculate fitness score for an individual
   */
  async calculateFitness(individual) {
    // Fitness function combines multiple performance metrics
    let fitness = 0;
    
    // Performance-based fitness
    const performanceFitness = this.calculatePerformanceFitness(individual);
    fitness += performanceFitness * 0.4;
    
    // Stability fitness (penalize extreme values)
    const stabilityFitness = this.calculateStabilityFitness(individual);
    fitness += stabilityFitness * 0.2;
    
    // Efficiency fitness
    const efficiencyFitness = this.calculateEfficiencyFitness(individual);
    fitness += efficiencyFitness * 0.2;
    
    // Adaptability fitness
    const adaptabilityFitness = this.calculateAdaptabilityFitness(individual);
    fitness += adaptabilityFitness * 0.1;
    
    // Novelty fitness (encourage diversity)
    const noveltyFitness = this.calculateNoveltyFitness(individual);
    fitness += noveltyFitness * 0.1;
    
    return Math.max(0, Math.min(1, fitness));
  }

  /**
   * Calculate performance-based fitness
   */
  calculatePerformanceFitness(individual) {
    let score = 0;
    
    // Optimal autonomy level contributes to performance
    const autonomyScore = 1 - Math.abs(individual.genes.autonomyLevel - 0.7);
    score += autonomyScore * 0.3;
    
    // Balanced emotion and logic weights
    const emotionLogicBalance = 1 - Math.abs(
      individual.genes.emotionWeight - individual.genes.logicWeight
    );
    score += emotionLogicBalance * 0.2;
    
    // Decision threshold should be moderate
    const decisionScore = 1 - Math.abs(individual.genes.decisionThreshold - 0.6);
    score += decisionScore * 0.2;
    
    // Learning rate should be moderate
    const learningScore = 1 - Math.abs(individual.genes.learningRate - 0.1);
    score += learningScore * 0.15;
    
    // Response time should be reasonable
    const responseScore = Math.max(0, 1 - (individual.genes.responseTime - 1000) / 4000);
    score += responseScore * 0.15;
    
    return score;
  }

  /**
   * Calculate stability fitness (penalize extreme values)
   */
  calculateStabilityFitness(individual) {
    let stabilityScore = 1.0;
    
    for (const [geneName, value] of Object.entries(individual.genes)) {
      const definition = this.geneDefinitions[geneName];
      const range = definition.max - definition.min;
      const normalizedValue = (value - definition.min) / range;
      
      // Penalize values too close to extremes
      if (normalizedValue < 0.1 || normalizedValue > 0.9) {
        stabilityScore -= 0.1;
      }
    }
    
    return Math.max(0, stabilityScore);
  }

  /**
   * Calculate efficiency fitness
   */
  calculateEfficiencyFitness(individual) {
    // Faster response times are better (within reason)
    const responseEfficiency = Math.max(0, 1 - (individual.genes.responseTime - 500) / 4500);
    
    // Higher adaptation speed is generally better
    const adaptationEfficiency = individual.genes.adaptationSpeed;
    
    // Moderate creativity level is efficient
    const creativityEfficiency = 1 - Math.abs(individual.genes.creativityLevel - 0.6);
    
    return (responseEfficiency + adaptationEfficiency + creativityEfficiency) / 3;
  }

  /**
   * Calculate adaptability fitness
   */
  calculateAdaptabilityFitness(individual) {
    // Higher learning rate indicates better adaptability
    const learningFitness = individual.genes.learningRate / 0.3;
    
    // Higher adaptation speed is better
    const speedFitness = individual.genes.adaptationSpeed;
    
    // Memory retention affects adaptability
    const memoryFitness = individual.genes.memoryRetention;
    
    return (learningFitness + speedFitness + memoryFitness) / 3;
  }

  /**
   * Calculate novelty fitness to encourage diversity
   */
  calculateNoveltyFitness(individual) {
    if (this.population.length < 2) return 0.5;
    
    let totalDistance = 0;
    let comparisons = 0;
    
    for (const other of this.population) {
      if (other.id !== individual.id) {
        const distance = this.calculateGeneticDistance(individual, other);
        totalDistance += distance;
        comparisons++;
      }
    }
    
    const averageDistance = comparisons > 0 ? totalDistance / comparisons : 0.5;
    return Math.min(1, averageDistance * 2); // Scale and cap at 1
  }

  /**
   * Calculate genetic distance between two individuals
   */
  calculateGeneticDistance(individual1, individual2) {
    let distance = 0;
    let geneCount = 0;
    
    for (const geneName of Object.keys(this.geneDefinitions)) {
      const value1 = individual1.genes[geneName];
      const value2 = individual2.genes[geneName];
      const definition = this.geneDefinitions[geneName];
      
      // Normalize the difference
      const range = definition.max - definition.min;
      const normalizedDiff = Math.abs(value1 - value2) / range;
      
      distance += normalizedDiff;
      geneCount++;
    }
    
    return geneCount > 0 ? distance / geneCount : 0;
  }

  /**
   * Evolve population by one generation
   */
  async evolveGeneration() {
    if (this.status !== 'active') return;
    
    console.log(`🔄 Evolving generation ${this.currentGeneration + 1}...`);
    
    try {
      // Create new population
      const newPopulation = [];
      
      // Keep elite individuals
      const eliteCount = Math.floor(this.population.length * this.config.elitismRate);
      const elites = this.selectElites(eliteCount);
      newPopulation.push(...elites);
      
      // Generate offspring to fill remaining population
      while (newPopulation.length < this.config.populationSize) {
        // Select parents
        const parent1 = this.selectParent();
        const parent2 = this.selectParent();
        
        // Create offspring through crossover
        const offspring = await this.crossover(parent1, parent2);
        
        // Apply mutation
        for (const child of offspring) {
          await this.mutate(child);
          child.generation = this.currentGeneration + 1;
          child.age = 0;
          newPopulation.push(child);
          
          if (newPopulation.length >= this.config.populationSize) break;
        }
      }
      
      // Replace population
      this.population = newPopulation.slice(0, this.config.populationSize);
      
      // Evaluate new population
      await this.evaluatePopulation();
      
      // Update generation counter
      this.currentGeneration++;
      
      // Record generation statistics
      this.recordGenerationStats();
      
      // Check for convergence
      const converged = this.checkConvergence();
      
      console.log(`✅ Generation ${this.currentGeneration} evolved. Best fitness: ${this.bestIndividual.fitness.toFixed(4)}`);
      
      if (converged) {
        console.log(`🎯 Population converged after ${this.currentGeneration} generations`);
      }
      
      return {
        generation: this.currentGeneration,
        bestFitness: this.bestIndividual.fitness,
        avgFitness: this.fitnessStats.avgFitness,
        converged
      };
      
    } catch (error) {
      console.error('Evolution error:', error);
      return { error: error.message };
    }
  }

  /**
   * Select elite individuals for next generation
   */
  selectElites(count) {
    return this.population
      .sort((a, b) => b.fitness - a.fitness)
      .slice(0, count)
      .map(individual => ({
        ...individual,
        id: uuidv4(), // New ID for elite copy
        age: individual.age + 1
      }));
  }

  /**
   * Select parent using current selection strategy
   */
  selectParent() {
    const strategy = this.evolutionStrategies.selection[this.currentStrategies.selection];
    return strategy();
  }

  /**
   * Tournament selection
   */
  tournamentSelection(tournamentSize = 3) {
    const tournament = [];
    
    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * this.population.length);
      tournament.push(this.population[randomIndex]);
    }
    
    return tournament.reduce((best, current) => 
      current.fitness > best.fitness ? current : best
    );
  }

  /**
   * Roulette wheel selection
   */
  rouletteSelection() {
    const totalFitness = this.population.reduce((sum, ind) => sum + ind.fitness, 0);
    let randomValue = Math.random() * totalFitness;
    
    for (const individual of this.population) {
      randomValue -= individual.fitness;
      if (randomValue <= 0) {
        return individual;
      }
    }
    
    return this.population[this.population.length - 1];
  }

  /**
   * Rank-based selection
   */
  rankSelection() {
    const sortedPopulation = [...this.population].sort((a, b) => a.fitness - b.fitness);
    const totalRanks = (this.population.length * (this.population.length + 1)) / 2;
    let randomValue = Math.random() * totalRanks;
    
    for (let i = 0; i < sortedPopulation.length; i++) {
      randomValue -= (i + 1);
      if (randomValue <= 0) {
        return sortedPopulation[i];
      }
    }
    
    return sortedPopulation[sortedPopulation.length - 1];
  }

  /**
   * Elitist selection
   */
  elitistSelection() {
    return this.population.reduce((best, current) => 
      current.fitness > best.fitness ? current : best
    );
  }

  /**
   * Crossover between two parents
   */
  async crossover(parent1, parent2) {
    if (Math.random() > this.config.crossoverRate) {
      // No crossover, return copies of parents
      return [
        { ...parent1, id: uuidv4(), parentIds: [parent1.id] },
        { ...parent2, id: uuidv4(), parentIds: [parent2.id] }
      ];
    }
    
    const strategy = this.evolutionStrategies.crossover[this.currentStrategies.crossover];
    const offspring = await strategy(parent1, parent2);
    
    // Set parent information
    offspring.forEach(child => {
      child.parentIds = [parent1.id, parent2.id];
      child.crossovers = Math.max(parent1.crossovers || 0, parent2.crossovers || 0) + 1;
    });
    
    return offspring;
  }

  /**
   * Uniform crossover
   */
  async uniformCrossover(parent1, parent2) {
    const child1 = { id: uuidv4(), genes: {}, fitness: 0, age: 0, mutations: 0 };
    const child2 = { id: uuidv4(), genes: {}, fitness: 0, age: 0, mutations: 0 };
    
    for (const geneName of Object.keys(this.geneDefinitions)) {
      if (Math.random() < 0.5) {
        child1.genes[geneName] = parent1.genes[geneName];
        child2.genes[geneName] = parent2.genes[geneName];
      } else {
        child1.genes[geneName] = parent2.genes[geneName];
        child2.genes[geneName] = parent1.genes[geneName];
      }
    }
    
    return [child1, child2];
  }

  /**
   * Single-point crossover
   */
  async singlePointCrossover(parent1, parent2) {
    const geneNames = Object.keys(this.geneDefinitions);
    const crossoverPoint = Math.floor(Math.random() * geneNames.length);
    
    const child1 = { id: uuidv4(), genes: {}, fitness: 0, age: 0, mutations: 0 };
    const child2 = { id: uuidv4(), genes: {}, fitness: 0, age: 0, mutations: 0 };
    
    for (let i = 0; i < geneNames.length; i++) {
      const geneName = geneNames[i];
      if (i < crossoverPoint) {
        child1.genes[geneName] = parent1.genes[geneName];
        child2.genes[geneName] = parent2.genes[geneName];
      } else {
        child1.genes[geneName] = parent2.genes[geneName];
        child2.genes[geneName] = parent1.genes[geneName];
      }
    }
    
    return [child1, child2];
  }

  /**
   * Two-point crossover
   */
  async twoPointCrossover(parent1, parent2) {
    const geneNames = Object.keys(this.geneDefinitions);
    const point1 = Math.floor(Math.random() * geneNames.length);
    const point2 = Math.floor(Math.random() * geneNames.length);
    const [start, end] = [Math.min(point1, point2), Math.max(point1, point2)];
    
    const child1 = { id: uuidv4(), genes: {}, fitness: 0, age: 0, mutations: 0 };
    const child2 = { id: uuidv4(), genes: {}, fitness: 0, age: 0, mutations: 0 };
    
    for (let i = 0; i < geneNames.length; i++) {
      const geneName = geneNames[i];
      if (i >= start && i <= end) {
        child1.genes[geneName] = parent2.genes[geneName];
        child2.genes[geneName] = parent1.genes[geneName];
      } else {
        child1.genes[geneName] = parent1.genes[geneName];
        child2.genes[geneName] = parent2.genes[geneName];
      }
    }
    
    return [child1, child2];
  }

  /**
   * Arithmetic crossover
   */
  async arithmeticCrossover(parent1, parent2) {
    const alpha = Math.random();
    
    const child1 = { id: uuidv4(), genes: {}, fitness: 0, age: 0, mutations: 0 };
    const child2 = { id: uuidv4(), genes: {}, fitness: 0, age: 0, mutations: 0 };
    
    for (const geneName of Object.keys(this.geneDefinitions)) {
      const value1 = parent1.genes[geneName];
      const value2 = parent2.genes[geneName];
      
      child1.genes[geneName] = alpha * value1 + (1 - alpha) * value2;
      child2.genes[geneName] = (1 - alpha) * value1 + alpha * value2;
      
      // Ensure values stay within bounds
      const definition = this.geneDefinitions[geneName];
      child1.genes[geneName] = Math.max(definition.min, Math.min(definition.max, child1.genes[geneName]));
      child2.genes[geneName] = Math.max(definition.min, Math.min(definition.max, child2.genes[geneName]));
      
      // Round integers
      if (definition.type === 'integer') {
        child1.genes[geneName] = Math.round(child1.genes[geneName]);
        child2.genes[geneName] = Math.round(child2.genes[geneName]);
      }
    }
    
    return [child1, child2];
  }

  /**
   * Apply mutation to an individual
   */
  async mutate(individual) {
    if (Math.random() > this.config.mutationRate) return;
    
    const strategy = this.evolutionStrategies.mutation[this.currentStrategies.mutation];
    await strategy(individual);
    
    individual.mutations = (individual.mutations || 0) + 1;
  }

  /**
   * Gaussian mutation
   */
  async gaussianMutation(individual) {
    const genesToMutate = Math.ceil(Math.random() * Object.keys(this.geneDefinitions).length / 2);
    const geneNames = Object.keys(this.geneDefinitions);
    
    for (let i = 0; i < genesToMutate; i++) {
      const geneName = geneNames[Math.floor(Math.random() * geneNames.length)];
      const definition = this.geneDefinitions[geneName];
      
      // Gaussian noise
      const range = definition.max - definition.min;
      const stdDev = range * 0.1; // 10% of range
      const noise = this.gaussianRandom() * stdDev;
      
      individual.genes[geneName] = Math.max(
        definition.min,
        Math.min(definition.max, individual.genes[geneName] + noise)
      );
      
      if (definition.type === 'integer') {
        individual.genes[geneName] = Math.round(individual.genes[geneName]);
      }
    }
  }

  /**
   * Uniform mutation
   */
  async uniformMutation(individual) {
    const genesToMutate = Math.ceil(Math.random() * Object.keys(this.geneDefinitions).length / 3);
    const geneNames = Object.keys(this.geneDefinitions);
    
    for (let i = 0; i < genesToMutate; i++) {
      const geneName = geneNames[Math.floor(Math.random() * geneNames.length)];
      const definition = this.geneDefinitions[geneName];
      
      if (definition.type === 'continuous') {
        individual.genes[geneName] = Math.random() * (definition.max - definition.min) + definition.min;
      } else if (definition.type === 'integer') {
        individual.genes[geneName] = Math.floor(Math.random() * (definition.max - definition.min + 1)) + definition.min;
      }
    }
  }

  /**
   * Boundary mutation
   */
  async boundaryMutation(individual) {
    const geneName = Object.keys(this.geneDefinitions)[
      Math.floor(Math.random() * Object.keys(this.geneDefinitions).length)
    ];
    const definition = this.geneDefinitions[geneName];
    
    // Set to min or max value
    individual.genes[geneName] = Math.random() < 0.5 ? definition.min : definition.max;
  }

  /**
   * Adaptive mutation
   */
  async adaptiveMutation(individual) {
    // Adapt mutation rate based on individual's fitness
    const adaptiveMutationRate = this.config.mutationRate * (1 - individual.fitness);
    
    for (const geneName of Object.keys(this.geneDefinitions)) {
      if (Math.random() < adaptiveMutationRate) {
        const definition = this.geneDefinitions[geneName];
        const range = definition.max - definition.min;
        const mutationStrength = range * (0.5 - individual.fitness) * 0.2;
        
        const noise = (Math.random() - 0.5) * mutationStrength;
        individual.genes[geneName] = Math.max(
          definition.min,
          Math.min(definition.max, individual.genes[geneName] + noise)
        );
        
        if (definition.type === 'integer') {
          individual.genes[geneName] = Math.round(individual.genes[geneName]);
        }
      }
    }
  }

  /**
   * Generate Gaussian random number
   */
  gaussianRandom() {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Update population statistics
   */
  updatePopulationStats() {
    const fitnesses = this.population.map(ind => ind.fitness);
    
    this.fitnessStats.maxFitness = Math.max(...fitnesses);
    this.fitnessStats.minFitness = Math.min(...fitnesses);
    this.fitnessStats.avgFitness = fitnesses.reduce((sum, f) => sum + f, 0) / fitnesses.length;
    
    // Calculate variance
    const avgFitness = this.fitnessStats.avgFitness;
    const variance = fitnesses.reduce((sum, f) => sum + Math.pow(f - avgFitness, 2), 0) / fitnesses.length;
    this.fitnessStats.fitnessVariance = variance;
  }

  /**
   * Record generation statistics
   */
  recordGenerationStats() {
    this.generationHistory.push({
      generation: this.currentGeneration,
      maxFitness: this.fitnessStats.maxFitness,
      avgFitness: this.fitnessStats.avgFitness,
      minFitness: this.fitnessStats.minFitness,
      variance: this.fitnessStats.fitnessVariance,
      bestIndividual: { ...this.bestIndividual },
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 generations
    if (this.generationHistory.length > 100) {
      this.generationHistory = this.generationHistory.slice(-100);
    }
  }

  /**
   * Check for convergence
   */
  checkConvergence() {
    if (this.generationHistory.length < 10) return false;
    
    const recentGenerations = this.generationHistory.slice(-10);
    const fitnessImprovement = recentGenerations[recentGenerations.length - 1].maxFitness - 
                              recentGenerations[0].maxFitness;
    
    return fitnessImprovement < this.config.convergenceThreshold;
  }

  /**
   * Get best genes for AI agent configuration
   */
  getBestConfiguration() {
    if (!this.bestIndividual) return null;
    
    return {
      individualId: this.bestIndividual.id,
      generation: this.bestIndividual.generation,
      fitness: this.bestIndividual.fitness,
      genes: { ...this.bestIndividual.genes },
      age: this.bestIndividual.age,
      mutations: this.bestIndividual.mutations,
      crossovers: this.bestIndividual.crossovers
    };
  }

  /**
   * Apply best configuration to AI agent
   */
  async applyBestConfiguration(aiAgent) {
    if (!this.bestIndividual) return false;
    
    const genes = this.bestIndividual.genes;
    
    try {
      // Apply genetic configuration to AI agent
      aiAgent.autonomyLevel = genes.autonomyLevel;
      
      // Update engine configurations
      if (aiAgent.engines.emotion) {
        aiAgent.engines.emotion.weight = genes.emotionWeight;
      }
      
      if (aiAgent.engines.logic) {
        aiAgent.engines.logic.weight = genes.logicWeight;
      }
      
      if (aiAgent.engines.decision) {
        aiAgent.engines.decision.threshold = genes.decisionThreshold;
        aiAgent.engines.decision.riskTolerance = genes.riskTolerance;
      }
      
      if (aiAgent.engines.learning) {
        aiAgent.engines.learning.baseRate = genes.learningRate;
        aiAgent.engines.learning.adaptationSpeed = genes.adaptationSpeed;
      }
      
      if (aiAgent.engines.dream) {
        aiAgent.engines.dream.creativityLevel = genes.creativityLevel;
      }
      
      if (aiAgent.memoryManager) {
        aiAgent.memoryManager.retentionRate = genes.memoryRetention;
      }
      
      console.log(`🧬 Applied genetic configuration from individual ${this.bestIndividual.id} (fitness: ${this.bestIndividual.fitness.toFixed(4)})`);
      
      return true;
      
    } catch (error) {
      console.error('Error applying genetic configuration:', error);
      return false;
    }
  }

  /**
   * Update performance metrics used in fitness calculation
   */
  updatePerformanceMetrics(metrics) {
    Object.assign(this.performanceMetrics, metrics);
  }

  /**
   * Load population from persistent storage
   */
  async loadPopulation() {
    // Implementation for loading population from file system or database
    console.log('Loading genetic population...');
  }

  /**
   * Save population to persistent storage
   */
  async savePopulation() {
    // Implementation for saving population
    console.log('Saving genetic population...');
  }

  /**
   * Get status and statistics
   */
  getStatus() {
    return {
      name: this.name,
      version: this.version,
      status: this.status,
      currentGeneration: this.currentGeneration,
      populationSize: this.population.length,
      bestFitness: this.bestIndividual?.fitness || 0,
      averageFitness: this.fitnessStats.avgFitness,
      fitnessVariance: this.fitnessStats.fitnessVariance,
      strategies: this.currentStrategies,
      config: this.config,
      convergenceStatus: this.checkConvergence() ? 'converged' : 'evolving'
    };
  }

  /**
   * Stop evolution
   */
  stop() {
    this.status = 'stopped';
    console.log(`🛑 ${this.name} stopped`);
  }

  /**
   * Shutdown genetic algorithm
   */
  async shutdown() {
    console.log(`👋 Shutting down ${this.name}`);
    
    // Save current population
    await this.savePopulation();
    
    this.status = 'shutdown';
  }
}

module.exports = GeneticAlgorithm;