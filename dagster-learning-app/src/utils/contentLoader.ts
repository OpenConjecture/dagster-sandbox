import matter from 'gray-matter';
import type { Curriculum, Module, Section } from '@/types/content';

export class ContentLoader {
  private baseUrl = '/content';
  private cache = new Map<string, any>();

  async loadCurriculum(): Promise<Curriculum> {
    return this.fetchJSON<Curriculum>('/curriculum.json');
  }

  async loadModule(level: string, moduleId: string): Promise<Module> {
    const path = `/modules/${level}/${moduleId}/module.json`;
    const module = await this.fetchJSON<Module>(path);
    
    // Add level to module
    module.level = level;
    
    // Load section content
    const sectionsWithContent = await Promise.all(
      module.sections.map(async (section) => {
        const content = await this.loadSectionContent(level, moduleId, section.file);
        return { ...section, content };
      })
    );
    
    return { ...module, sections: sectionsWithContent };
  }

  async loadSectionContent(level: string, moduleId: string, file: string): Promise<string> {
    const path = `/modules/${level}/${moduleId}/${file}`;
    const markdown = await this.fetchText(path);
    const { content } = matter(markdown);
    return content;
  }

  private async fetchJSON<T>(path: string): Promise<T> {
    const cacheKey = `json:${path}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(this.baseUrl + path);
      if (!response.ok) {
        throw new Error(`Failed to load ${path}: ${response.statusText}`);
      }
      const data = await response.json();
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`Error loading ${path}:`, error);
      throw error;
    }
  }

  private async fetchText(path: string): Promise<string> {
    const cacheKey = `text:${path}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(this.baseUrl + path);
      if (!response.ok) {
        throw new Error(`Failed to load ${path}: ${response.statusText}`);
      }
      const text = await response.text();
      this.cache.set(cacheKey, text);
      return text;
    } catch (error) {
      console.error(`Error loading ${path}:`, error);
      throw error;
    }
  }
}

export const contentLoader = new ContentLoader();