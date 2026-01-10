import { ComponentInfo } from '../types/storybook.js';

export interface CompactComponentInfo {
  id: string;
  name: string;
  title: string;
  category?: string;
  variantCount: number;
}

export interface StoryMappingOptions {
  filterFn?: ((story: any, componentName: string, category?: string) => boolean) | undefined;
  useComponentKey?: 'name' | 'title' | undefined;
}

export function mapStoriesToComponents(
  stories: Record<string, any> | any[],
  options: StoryMappingOptions = {}
): Map<string, ComponentInfo> {
  const { filterFn, useComponentKey = 'name' } = options;
  const componentMap = new Map<string, ComponentInfo>();

  const storyArray = Array.isArray(stories) ? stories : Object.values(stories);

  storyArray.forEach(story => {
    const componentName = story.title.split('/').pop() || story.title;
    const categoryParts = story.title.split('/').slice(0, -1);
    const category = categoryParts.length > 0 ? categoryParts.join('/') : undefined;

    // Apply filter if provided
    if (filterFn && !filterFn(story, componentName, category)) {
      return;
    }

    // Determine the key to use for the component map
    const mapKey = useComponentKey === 'title' ? story.title.toLowerCase() : componentName;

    if (!componentMap.has(mapKey)) {
      const componentInfo: ComponentInfo = {
        id: story.id.split('--')[0] || story.id,
        name: componentName,
        title: story.title,
        stories: [],
      };

      if (category) {
        componentInfo.category = category;
      }

      componentMap.set(mapKey, componentInfo);
    }

    componentMap.get(mapKey)!.stories.push(story);
  });

  return componentMap;
}

export function getComponentsArray(componentMap: Map<string, ComponentInfo>): ComponentInfo[] {
  return Array.from(componentMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Convert full component info to compact format (smaller response size)
 */
export function toCompactComponent(component: ComponentInfo): CompactComponentInfo {
  return {
    id: component.id,
    name: component.name,
    title: component.title,
    ...(component.category && { category: component.category }),
    variantCount: component.stories?.length || 0,
  };
}

/**
 * Convert array of components to compact format
 */
export function toCompactComponents(components: ComponentInfo[]): CompactComponentInfo[] {
  return components.map(toCompactComponent);
}
