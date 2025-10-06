// Offline Storage Service for IndexedDB operations
// Provides offline-first capabilities with background sync

class OfflineStorage {
  constructor() {
    this.dbName = 'CBRESurveyorDB';
    this.version = 2;
    this.db = null;
  }

  async initDB() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject(new Error('Failed to open database'));
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('images')) {
          const imageStore = db.createObjectStore('images', {
            keyPath: 'id',
            autoIncrement: true
          });
          imageStore.createIndex('filename', 'filename', { unique: false });
          imageStore.createIndex('projectId', 'projectId', { unique: false });
          imageStore.createIndex('synced', 'synced', { unique: false });
          imageStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('analysis')) {
          const analysisStore = db.createObjectStore('analysis', {
            keyPath: 'id',
            autoIncrement: true
          });
          analysisStore.createIndex('imageId', 'imageId', { unique: false });
          analysisStore.createIndex('projectId', 'projectId', { unique: false });
          analysisStore.createIndex('synced', 'synced', { unique: false });
          analysisStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', {
            keyPath: 'id',
            autoIncrement: true
          });
          projectStore.createIndex('name', 'name', { unique: false });
          projectStore.createIndex('synced', 'synced', { unique: false });
          projectStore.createIndex('timestamp', 'timestamp', { unique: false });
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

  // Image operations
  async saveImage(imageData) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['images'], 'readwrite');
    const store = transaction.objectStore('images');

    const imageRecord = {
      filename: imageData.filename,
      blob: imageData.blob,
      size: imageData.size,
      type: imageData.type,
      projectId: imageData.projectId,
      metadata: imageData.metadata || {},
      synced: false,
      syncedAt: null,
      timestamp: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(imageRecord);
      request.onsuccess = () => {
        imageRecord.id = request.result;
        resolve(imageRecord);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getImage(id) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['images'], 'readonly');
    const store = transaction.objectStore('images');

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllImages() {
    const db = await this.ensureDB();
    const transaction = db.transaction(['images'], 'readonly');
    const store = transaction.objectStore('images');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteImage(id) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['images'], 'readwrite');
    const store = transaction.objectStore('images');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Analysis operations
  async saveAnalysis(analysisData) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['analysis'], 'readwrite');
    const store = transaction.objectStore('analysis');

    const analysisRecord = {
      imageId: analysisData.imageId,
      projectId: analysisData.projectId,
      sceneType: analysisData.sceneType,
      sceneOverview: analysisData.sceneOverview,
      detectedItems: analysisData.detectedItems || [],
      simplifiedData: analysisData.simplifiedData || [],
      narrativeReport: analysisData.narrativeReport,
      estimatedValue: analysisData.estimatedValue,
      keyObservations: analysisData.keyObservations || [],
      metadata: analysisData.metadata || {},
      synced: false,
      syncedAt: null,
      timestamp: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(analysisRecord);
      request.onsuccess = () => {
        analysisRecord.id = request.result;
        resolve(analysisRecord);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAnalysis(id) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['analysis'], 'readonly');
    const store = transaction.objectStore('analysis');

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAnalysisByImageId(imageId) {
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

  async getAllAnalysis() {
    const db = await this.ensureDB();
    const transaction = db.transaction(['analysis'], 'readonly');
    const store = transaction.objectStore('analysis');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Project operations
  async saveProject(projectData) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['projects'], 'readwrite');
    const store = transaction.objectStore('projects');

    const projectRecord = {
      name: projectData.name,
      description: projectData.description,
      location: projectData.location,
      clientName: projectData.clientName,
      metadata: projectData.metadata || {},
      synced: false,
      syncedAt: null,
      timestamp: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(projectRecord);
      request.onsuccess = () => {
        projectRecord.id = request.result;
        resolve(projectRecord);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getProject(id) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['projects'], 'readonly');
    const store = transaction.objectStore('projects');

    return new Promise((resolve, reject) => {
      const request = store.get(id);
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

  // Storage stats
  async getStorageStats() {
    const db = await this.ensureDB();
    const stats = {
      images: { count: 0, totalSize: 0 },
      analysis: { count: 0 },
      projects: { count: 0 }
    };

    // Get image stats
    const images = await this.getAllImages();
    stats.images.count = images.length;
    stats.images.totalSize = images.reduce((total, img) => total + (img.size || 0), 0);

    // Get analysis stats
    const analysis = await this.getAllAnalysis();
    stats.analysis.count = analysis.length;

    // Get project stats
    const projects = await this.getAllProjects();
    stats.projects.count = projects.length;

    return stats;
  }

  // Sync operations
  async getUnsyncedItems() {
    try {
      const db = await this.ensureDB();
      const unsynced = { images: [], analysis: [], projects: [] };

      // Get all images and filter for unsynced
      try {
        const images = await this.getAllImages();
        unsynced.images = images.filter(item => item.synced === false);
      } catch (err) {
        console.log('Error getting unsynced images:', err);
      }

      // Get all analysis and filter for unsynced
      try {
        const analysis = await this.getAllAnalysis();
        unsynced.analysis = analysis.filter(item => item.synced === false);
      } catch (err) {
        console.log('Error getting unsynced analysis:', err);
      }

      // Get all projects and filter for unsynced
      try {
        const projects = await this.getAllProjects();
        unsynced.projects = projects.filter(item => item.synced === false);
      } catch (err) {
        console.log('Error getting unsynced projects:', err);
      }

      return unsynced;
    } catch (err) {
      console.error('Error in getUnsyncedItems:', err);
      return { images: [], analysis: [], projects: [] };
    }
  }

  // Alias for getUnsyncedItems for compatibility
  async getQueueItems() {
    return this.getUnsyncedItems();
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

    if (item) {
      item.synced = true;
      item.syncedAt = new Date().toISOString();

      return new Promise((resolve, reject) => {
        const request = store.put(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  // Clear operations
  async clearAll() {
    const db = await this.ensureDB();
    const transaction = db.transaction(['images', 'analysis', 'projects'], 'readwrite');

    const promises = ['images', 'analysis', 'projects'].map(storeName => {
      return new Promise((resolve, reject) => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    return Promise.all(promises);
  }

  async clearStore(storeName) {
    const db = await this.ensureDB();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Export singleton instance
const offlineStorage = new OfflineStorage();
export default offlineStorage;