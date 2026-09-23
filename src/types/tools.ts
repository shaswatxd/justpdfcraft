import { ModalType } from '@/stores/uiStore';
import { ToolMode } from '@/stores/toolStore';

export type ToolCategory = 'pdf' | 'image' | 'student';

export type ToolBadge = 'popular' | 'recommended' | 'new' | 'special';

export type ToolActionType = 
  | { type: 'modal'; modal: ModalType; initialTab?: string }
  | { type: 'workflow'; modal?: ModalType; viewMode?: 'single' | 'continuous' | 'organize' | 'spread'; tool?: ToolMode; label: string }
  | { type: 'viewMode'; viewMode: 'organize' }
  | { type: 'tool'; tool: ToolMode; label: string }
  | { type: 'custom'; handler: string };

export interface ToolDefinition {
  id: string;
  name: string;
  shortDesc: string;
  category: ToolCategory;
  iconName: string;
  color: string;
  badge?: ToolBadge;
  tags: string[];
  action: ToolActionType;
}
