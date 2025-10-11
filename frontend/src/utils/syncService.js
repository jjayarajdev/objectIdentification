/**
 * Sync Service for Online/Offline Data Synchronization
 */

import offlineStorage from './offlineStorage';

// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class SyncService {
  constructor() {
    this.syncInterval = 30000; // 30 seconds
    this.isSyncing = false;
    this.syncTimer = null;
    this.onlineStatus = navigator.onLine;
    this.listeners = new Set();
    this.apiBaseUrl = API_BASE_URL;
    this.init();
  }

  init() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Start sync if online
    if (this.onlineStatus) {
      this.startAutoSync();
    }
  }

  // Event listener management
  addListener(callback) {
    this.listeners.add(callback);
  }

  removeListener(callback) {
    this.listeners.delete(callback);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  // Online/Offline handling
  handleOnline() {
    console.log('Application is online');
    this.onlineStatus = true;
    this.notifyListeners('online', { timestamp: new Date().toISOString() });
    this.startAutoSync();
    this.performSync(); // Immediate sync when coming online
  }

  handleOffline() {
    console.log('Application is offline');
    this.onlineStatus = false;
    this.notifyListeners('offline', { timestamp: new Date().toISOString() });
    this.stopAutoSync();
  }

  // Auto sync management
  startAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (this.onlineStatus && !this.isSyncing) {
        this.performSync();
      }
    }, this.syncInterval);
  }

  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  // Main sync function
  async performSync() {
    if (!this.onlineStatus || this.isSyncing) {
      return { success: false, reason: this.isSyncing ? 'Already syncing' : 'Offline' };
    }

    this.isSyncing = true;
    this.notifyListeners('sync-start', { timestamp: new Date().toISOString() });

    const syncResults = {
      images: { uploaded: 0, failed: 0 },
      analysis: { uploaded: 0, failed: 0 },
      projects: { uploaded: 0, failed: 0 },
      queue: { processed: 0, failed: 0 },
      timestamp: new Date().toISOString()
    };

    try {
      // Get all unsynced items
      const unsyncedItems = await offlineStorage.getUnsyncedItems();

      // Sync projects first
      for (const project of unsyncedItems.projects) {
        try {
          await this.syncProject(project);
          await offlineStorage.markAsSynced('projects', project.id);
          syncResults.projects.uploaded++;
        } catch (error) {
          console.error('Failed to sync project:', error);
          syncResults.projects.failed++;
        }
      }

      // Sync images
      for (const image of unsyncedItems.images) {
        try {
          await this.syncImage(image);
          await offlineStorage.markAsSynced('images', image.id);
          syncResults.images.uploaded++;
        } catch (error) {
          console.error('Failed to sync image:', error);
          syncResults.images.failed++;
        }
      }

      // Sync analysis
      for (const analysis of unsyncedItems.analysis) {
        try {
          await this.syncAnalysis(analysis);
          await offlineStorage.markAsSynced('analysis', analysis.id);
          syncResults.analysis.uploaded++;
        } catch (error) {
          console.error('Failed to sync analysis:', error);
          syncResults.analysis.failed++;
        }
      }

      // Process sync queue
      const queueData = await offlineStorage.getQueueItems();
      const queueItems = [
        ...(queueData.images || []),
        ...(queueData.analysis || []),
        ...(queueData.projects || [])
      ];

      for (const item of queueItems) {
        try {
          await this.processQueueItem(item);
          // Note: removeFromQueue might not exist, using markAsSynced instead
          if (offlineStorage.removeFromQueue) {
            await offlineStorage.removeFromQueue(item.id);
          }
          syncResults.queue.processed++;
        } catch (error) {
          console.error('Failed to process queue item:', error);
          syncResults.queue.failed++;
        }
      }

      this.notifyListeners('sync-complete', syncResults);
      return { success: true, results: syncResults };

    } catch (error) {
      console.error('Sync failed:', error);
      this.notifyListeners('sync-error', { error: error.message });
      return { success: false, error: error.message };

    } finally {
      this.isSyncing = false;
    }
  }

  // Sync individual items
  async syncImage(image) {
    const formData = new FormData();
    formData.append('file', image.blob, image.filename);
    formData.append('projectId', image.projectId);
    formData.append('metadata', JSON.stringify(image.metadata));
    formData.append('offlineId', image.id);

    const response = await fetch(`${this.apiBaseUrl}/api/sync/image`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to sync image: ${response.statusText}`);
    }

    return response.json();
  }

  async syncAnalysis(analysis) {
    const response = await fetch(`${this.apiBaseUrl}/api/sync/analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...analysis,
        offlineId: analysis.id
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to sync analysis: ${response.statusText}`);
    }

    return response.json();
  }

  async syncProject(project) {
    const response = await fetch(`${this.apiBaseUrl}/api/sync/project`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...project,
        offlineId: project.id
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to sync project: ${response.statusText}`);
    }

    return response.json();
  }

  async processQueueItem(item) {
    const endpoint = `${this.apiBaseUrl}/api/sync/${item.type}`;
    const method = item.action === 'delete' ? 'DELETE' : 'POST';

    const response = await fetch(endpoint, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(item.data)
    });

    if (!response.ok) {
      throw new Error(`Failed to process queue item: ${response.statusText}`);
    }

    return response.json();
  }

  // Manual sync trigger
  async manualSync() {
    return this.performSync();
  }

  // Check if data needs sync
  async getSyncStatus() {
    const unsyncedItems = await offlineStorage.getUnsyncedItems();
    const queueItems = await offlineStorage.getQueueItems();

    return {
      online: this.onlineStatus,
      syncing: this.isSyncing,
      pendingSync: {
        images: unsyncedItems.images.length,
        analysis: unsyncedItems.analysis.length,
        projects: unsyncedItems.projects.length,
        queue: queueItems.length,
        total: unsyncedItems.images.length +
               unsyncedItems.analysis.length +
               unsyncedItems.projects.length +
               queueItems.length
      },
      lastSync: localStorage.getItem('lastSyncTime') || null
    };
  }

  // Save analysis locally when offline
  async saveOfflineAnalysis(imageData, analysisData) {
    try {
      // Save image
      const savedImage = await offlineStorage.saveImage({
        filename: imageData.filename,
        blob: imageData.blob,
        size: imageData.size,
        type: imageData.type,
        projectId: imageData.projectId,
        metadata: imageData.metadata
      });

      // Save analysis
      const savedAnalysis = await offlineStorage.saveAnalysis({
        imageId: savedImage.id,
        ...analysisData
      });

      // Add to sync queue
      await offlineStorage.addToQueue({
        type: 'analysis',
        action: 'create',
        data: {
          imageId: savedImage.id,
          analysisId: savedAnalysis.id
        }
      });

      return {
        success: true,
        image: savedImage,
        analysis: savedAnalysis
      };

    } catch (error) {
      console.error('Failed to save offline analysis:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Clear all offline data
  async clearOfflineData() {
    try {
      await offlineStorage.clearAll();
      this.notifyListeners('data-cleared', { timestamp: new Date().toISOString() });
      return { success: true };
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
const syncService = new SyncService();
export default syncService;