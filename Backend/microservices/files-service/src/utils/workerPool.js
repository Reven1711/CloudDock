import { Worker } from "worker_threads";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Worker Pool for parallel file processing
 * Manages a pool of worker threads for optimal performance
 */
export class WorkerPool {
  constructor(workerPath, poolSize = null) {
    this.workerPath = workerPath;
    this.poolSize = poolSize || Math.max(2, os.cpus().length - 1); // Leave one CPU free
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    this.initialized = false;

    console.log(`🔧 Worker Pool initialized with ${this.poolSize} workers`);
  }

  /**
   * Initialize the worker pool
   */
  async init(workerData = {}) {
    if (this.initialized) return;

    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(this.workerPath, {
        workerData: {
          workerId: i,
          ...workerData,
        },
      });

      worker.on("error", (error) => {
        console.error(`Worker ${i} error:`, error);
      });

      worker.on("exit", (code) => {
        if (code !== 0) {
          console.error(`Worker ${i} stopped with exit code ${code}`);
        }
      });

      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }

    this.initialized = true;
    console.log(`✅ Worker Pool ready with ${this.poolSize} workers`);
  }

  /**
   * Execute a task using an available worker
   */
  async execute(data) {
    return new Promise((resolve, reject) => {
      const task = { data, resolve, reject };

      if (this.availableWorkers.length > 0) {
        this._runTask(task);
      } else {
        this.taskQueue.push(task);
      }
    });
  }

  /**
   * Execute multiple tasks in parallel
   */
  async executeParallel(tasksData) {
    const promises = tasksData.map((data) => this.execute(data));
    return Promise.allSettled(promises);
  }

  /**
   * Execute tasks in batches
   */
  async executeBatch(tasksData, batchSize = null) {
    const effectiveBatchSize = batchSize || this.poolSize;
    const results = [];

    for (let i = 0; i < tasksData.length; i += effectiveBatchSize) {
      const batch = tasksData.slice(i, i + effectiveBatchSize);
      const batchResults = await this.executeParallel(batch);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Run a task on an available worker
   */
  _runTask(task) {
    const worker = this.availableWorkers.shift();

    const messageHandler = (message) => {
      if (
        message.type === "result" ||
        message.type === "batchResult" ||
        message.type === "dbResult"
      ) {
        worker.off("message", messageHandler);
        worker.off("error", errorHandler);

        this.availableWorkers.push(worker);
        task.resolve(message.data);

        // Process next task in queue
        if (this.taskQueue.length > 0) {
          const nextTask = this.taskQueue.shift();
          this._runTask(nextTask);
        }
      } else if (message.type === "error") {
        worker.off("message", messageHandler);
        worker.off("error", errorHandler);

        this.availableWorkers.push(worker);
        task.reject(new Error(message.error));

        if (this.taskQueue.length > 0) {
          const nextTask = this.taskQueue.shift();
          this._runTask(nextTask);
        }
      }
    };

    const errorHandler = (error) => {
      worker.off("message", messageHandler);
      worker.off("error", errorHandler);

      this.availableWorkers.push(worker);
      task.reject(error);

      if (this.taskQueue.length > 0) {
        const nextTask = this.taskQueue.shift();
        this._runTask(nextTask);
      }
    };

    worker.on("message", messageHandler);
    worker.on("error", errorHandler);

    worker.postMessage(task.data);
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      totalWorkers: this.poolSize,
      availableWorkers: this.availableWorkers.length,
      busyWorkers: this.poolSize - this.availableWorkers.length,
      queuedTasks: this.taskQueue.length,
    };
  }

  /**
   * Terminate all workers
   */
  async terminate() {
    const terminationPromises = this.workers.map((worker) =>
      worker.terminate()
    );
    await Promise.all(terminationPromises);
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
    this.initialized = false;
    console.log("✅ Worker Pool terminated");
  }
}

/**
 * Create a singleton worker pool instance
 */
let workerPoolInstance = null;

export function getWorkerPool() {
  if (!workerPoolInstance) {
    const workerPath = path.join(
      __dirname,
      "../workers/fileProcessorWorker.js"
    );
    workerPoolInstance = new WorkerPool(workerPath);
  }
  return workerPoolInstance;
}

/**
 * Initialize the global worker pool
 */
export async function initializeWorkerPool(config = {}) {
  const pool = getWorkerPool();
  await pool.init({
    awsConfig: {
      region: config.awsRegion || process.env.AWS_REGION,
      accessKeyId: config.awsAccessKeyId || process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey:
        config.awsSecretAccessKey || process.env.AWS_SECRET_ACCESS_KEY,
    },
    mongoUri: config.mongoUri || process.env.MONGODB_URI,
  });
  return pool;
}
