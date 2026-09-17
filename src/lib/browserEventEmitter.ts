/**
 * Browser-compatible EventEmitter
 * Simple event emitter for browser environments (no Node.js 'events' module)
 */

type EventHandler = (...args: any[]) => void;

export class BrowserEventEmitter {
  private events: Map<string, EventHandler[]> = new Map();

  on(event: string, handler: EventHandler): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(handler);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const handlers = this.events.get(event);
    if (!handlers || handlers.length === 0) {
      return false;
    }
    
    handlers.forEach(handler => {
      try {
        handler(...args);
      } catch (error) {
        console.error(`Error in event handler for "${event}":`, error);
      }
    });
    
    return true;
  }

  removeListener(event: string, handler: EventHandler): this {
    const handlers = this.events.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
    return this;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  listenerCount(event: string): number {
    const handlers = this.events.get(event);
    return handlers ? handlers.length : 0;
  }
}
