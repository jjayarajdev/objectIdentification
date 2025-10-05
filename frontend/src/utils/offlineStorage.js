/**
 * Offline Storage Utility for Surveyor Application
 * Manages local storage of images and analysis results for offline functionality
 */

class OfflineStorage {
  constructor() {
    this.dbName = 'SurveyorOfflineDB';
    this.dbVersion = 1;
    this.db = null;
    this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        if (!db.objectStoreNames.contains('images')) {
          const imageStore = db.createObjectStore('images', { keyPath: 'id' });
          imageStore.createIndex('timestamp', 'timestamp', { unique: false });
          imageStore.createIndex('projectId', 'projectId', { unique: false });
          imageStore.createIndex('synced', 'synced', { unique: false });
        }

        if (!db.objectStoreNames.contains('analysis')) {
          const analysisStore = db.createObjectStore('analysis', { keyPath: 'id' });
          analysisStore.createIndex('imageId', 'imageId', { unique: false });
          analysisStore.createIndex('timestamp', 'timestamp', { unique: false });
          analysisStore.createIndex('synced', 'synced', { unique: false });
        }

        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('timestamp', 'timestamp', { unique: false });
          projectStore.createIndex('synced', 'synced', { unique: false });
        }

        if (!db.objectStoreNames.contains('queue')) {
          const queueStore = db.createObjectStore('queue', { keyPath: 'id' });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          queueStore.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  async ensureDB() {
    if (!this.db) {
      await this.initDB();
    }
    return this.db;
  }

  // Image Storage Methods
  async saveImage(imageData) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['images'], 'readwrite');
    const store = transaction.objectStore('images');

    const imageRecord = {
      id: imageData.id || `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      filename: imageData.filename,
      blob: imageData.blob,
      size: imageData.size,
      type: imageData.type,
      projectId: imageData.projectId,
      timestamp: new Date().toISOString(),
      synced: false,
      metadata: imageData.metadata || {}
    };

    return new Promise((resolve, reject) => {
      const request = store.add(imageRecord);
      request.onsuccess = () => resolve(imageRecord);
      request.onerror = () => reject(request.error);
    });
  }

  async getImage(imageId) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['images'], 'readonly');
    const store = transaction.objectStore('images');

    return new Promise((resolve, reject) => {
      const request = store.get(imageId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getProjectImages(projectId) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['images'], 'readonly');
    const store = transaction.objectStore('images');
    const index = store.index('projectId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(projectId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Analysis Storage Methods
  async saveAnalysis(analysisData) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['analysis'], 'readwrite');
    const store = transaction.objectStore('analysis');

    const analysisRecord = {
      id: analysisData.id || `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      imageId: analysisData.imageId,
      sceneType: analysisData.sceneType,
      sceneOverview: analysisData.sceneOverview,
      simplifiedData: analysisData.simplifiedData,
      narrativeReport: analysisData.narrativeReport,
      analysisData: analysisData.analysisData,
      keyObservations: analysisData.keyObservations,
      estimatedPropertyValue: analysisData.estimatedPropertyValue,
      timestamp: new Date().toISOString(),
      synced: false
    };

    return new Promise((resolve, reject) => {
      const request = store.add(analysisRecord);
      request.onsuccess = () => resolve(analysisRecord);
      request.onerror = () => reject(request.error);
    });
  }

  async getAnalysis(analysisId) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['analysis'], 'readonly');
    const store = transaction.objectStore('analysis');

    return new Promise((resolve, reject) => {
      const request = store.get(analysisId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getImageAnalysis(imageId) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['analysis'], 'readonly');
    const store = transaction.objectStore('analysis');
    const index = store.index('imageId');

    return new Promise((resolve, reject) => {
      const request = index.get(imageId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Project Storage Methods
  async saveProject(projectData) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['projects'], 'readwrite');
    const store = transaction.objectStore('projects');

    const projectRecord = {
      id: projectData.id || `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: projectData.name,
      description: projectData.description,
      location: projectData.location,
      client: projectData.client,
      timestamp: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      synced: false,
      metadata: projectData.metadata || {}
    };

    return new Promise((resolve, reject) => {
      const request = store.add(projectRecord);
      request.onsuccess = () => resolve(projectRecord);
      request.onerror = () => reject(request.error);
    });
  }

  async getProject(projectId) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['projects'], 'readonly');
    const store = transaction.objectStore('projects');

    return new Promise((resolve, reject) => {
      const request = store.get(projectId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllProjects() {
    const db = await this.ensureDB();
    const transaction = db.transaction(['projects'], 'readonly');
    const store = transaction.objectStore('projects');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateProject(projectId, updates) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['projects'], 'readwrite');
    const store = transaction.objectStore('projects');

    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const updatedProject = {
      ...project,
      ...updates,
      lastModified: new Date().toISOString(),
      synced: false
    };

    return new Promise((resolve, reject) => {
      const request = store.put(updatedProject);
      request.onsuccess = () => resolve(updatedProject);
      request.onerror = () => reject(request.error);
    });
  }

  // Queue Management for Sync
  async addToQueue(item) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['queue'], 'readwrite');
    const store = transaction.objectStore('queue');

    const queueItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: item.type, // 'image', 'analysis', 'project'
      action: item.action, // 'create', 'update', 'delete'
      data: item.data,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };

    return new Promise((resolve, reject) => {
      const request = store.add(queueItem);
      request.onsuccess = () => resolve(queueItem);
      request.onerror = () => reject(request.error);
    });
  }

  async getQueueItems() {
    const db = await this.ensureDB();
    const transaction = db.transaction(['queue'], 'readonly');
    const store = transaction.objectStore('queue');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeFromQueue(queueId) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['queue'], 'readwrite');
    const store = transaction.objectStore('queue');

    return new Promise((resolve, reject) => {
      const request = store.delete(queueId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Sync Methods
  async getUnsyncedItems() {
    const db = await this.ensureDB();
    const unsynced = {
      images: [],
      analysis: [],
      projects: []
    };

    // Get unsynced images
    const imageTransaction = db.transaction(['images'], 'readonly');
    const imageStore = imageTransaction.objectStore('images');
    const imageSyncIndex = imageStore.index('synced');

    const images = await new Promise((resolve, reject) => {
      const request = imageSyncIndex.getAll(false);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    unsynced.images = images;

    // Get unsynced analysis
    const analysisTransaction = db.transaction(['analysis'], 'readonly');
    const analysisStore = analysisTransaction.objectStore('analysis');
    const analysisSyncIndex = analysisStore.index('synced');

    const analysis = await new Promise((resolve, reject) => {
      const request = analysisSyncIndex.getAll(false);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    unsynced.analysis = analysis;

    // Get unsynced projects
    const projectTransaction = db.transaction(['projects'], 'readonly');
    const projectStore = projectTransaction.objectStore('projects');
    const projectSyncIndex = projectStore.index('synced');

    const projects = await new Promise((resolve, reject) => {
      const request = projectSyncIndex.getAll(false);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    unsynced.projects = projects;

    return unsynced;
  }

  async markAsSynced(type, id) {
    const db = await this.ensureDB();
    const transaction = db.transaction([type], 'readwrite');
    const store = transaction.objectStore(type);

    const item = await new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!item) {
      throw new Error(`${type} item not found`);
    }

    item.synced = true;

    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }

  // Utility Methods
  async clearAll() {
    const db = await this.ensureDB();
    const stores = ['images', 'analysis', 'projects', 'queue'];

    const promises = stores.map(storeName => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    return Promise.all(promises);
  }

  async getStorageStats() {
    const db = await this.ensureDB();
    const stats = {
      images: { count: 0, totalSize: 0 },
      analysis: { count: 0 },
      projects: { count: 0 },
      queue: { count: 0 }
    };

    // Get image stats
    const imageTransaction = db.transaction(['images'], 'readonly');
    const imageStore = imageTransaction.objectStore('images');
    const images = await new Promise((resolve, reject) => {
      const request = imageStore.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    stats.images.count = images.length;
    stats.images.totalSize = images.reduce((sum, img) => sum + (img.size || 0), 0);

    // Get analysis count
    const analysisTransaction = db.transaction(['analysis'], 'readonly');
    const analysisStore = analysisTransaction.objectStore('analysis');
    const analysisCount = await new Promise((resolve, reject) => {
      const request = analysisStore.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    stats.analysis.count = analysisCount;

    // Get project count
    const projectTransaction = db.transaction(['projects'], 'readonly');
    const projectStore = projectTransaction.objectStore('projects');
    const projectCount = await new Promise((resolve, reject) => {
      const request = projectStore.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    stats.projects.count = projectCount;

    // Get queue count
    const queueTransaction = db.transaction(['queue'], 'readonly');
    const queueStore = queueTransaction.objectStore(['queue']);
    const queueCount = await new Promise((resolve, reject) => {
      const request = queueStore.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    stats.queue.count = queueCount;

    return stats;
  }
}

// Export singleton instance
const offlineStorage = new OfflineStorage();
export default offlineStorage;