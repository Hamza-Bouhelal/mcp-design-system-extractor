export interface StorybookStory {
  id: string;
  title: string;
  name: string;
  importPath?: string;
  kind?: string;
  story?: string;
  parameters?: Record<string, any>;
  args?: Record<string, any>;
  argTypes?: Record<string, any>;
}

export interface StorybookIndex {
  v: number;
  stories?: Record<string, StorybookStory>;
  entries?: Record<string, StorybookStory>;
}

export interface ComponentInfo {
  id: string;
  name: string;
  title: string;
  category?: string;
  stories: StorybookStory[];
}

export interface ComponentHTML {
  storyId: string;
  html: string;
  styles?: string[];
  classes?: string[];
}

export interface CSSRule {
  selector: string;
  styles: Record<string, string>;
  mediaQuery?: string;
}

export interface DesignToken {
  name: string;
  value: string;
  type: 'color' | 'spacing' | 'typography' | 'shadow' | 'border' | 'other';
  category?: string;
}

export interface ComponentDependencies {
  storyId: string;
  dependencies: string[];
  internalComponents: string[];
  externalComponents: string[];
}

export interface ThemeInfo {
  colors: Record<string, string>;
  spacing: Record<string, string>;
  typography: Record<string, any>;
  breakpoints: Record<string, string>;
  shadows: Record<string, string>;
  radii: Record<string, string>;
}
