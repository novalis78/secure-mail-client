declare module 'electron-store' {
    export default class Store<T extends Record<string, any>> {
      constructor(options?: Store.Options<T>);
      
      public get<K extends keyof T>(key: K): T[K];
      public set<K extends keyof T>(key: K, value: T[K]): void;
      public has(key: string): boolean;
      public delete(key: string): void;
      public clear(): void;
      public store: T;
    }
    
    namespace Store {
      interface Options<T> {
        name?: string;
        cwd?: string;
        defaults?: T;
      }
    }
  }