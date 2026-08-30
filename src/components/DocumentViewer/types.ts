import { ScannedFile } from '../../types';

export type ScaleMode = 'custom' | 'fitWidth' | 'fitPage';

export interface CommentItem {
  id: string;
  author: string;
  date?: string;
  text: string;
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface ViewerRenderProps {
  file: ScannedFile;
  scale: number;
  scaleMode: ScaleMode;
  searchQuery: string;
  activeMatch: number;
  onPageCount: (n: number) => void;
  onPageChange: (n: number) => void;
  registerNav: (fn: ((n: number) => void) | null) => void;
  onToc: (items: TocItem[]) => void;
  onComments: (items: CommentItem[]) => void;
  onWordCount: (n: number) => void;
  onMatchCount: (n: number) => void;
  onActiveMatchChange: (n: number) => void;
  onTextExtracted: (text: string) => void;
  registerTocNav?: (fn: ((item: TocItem) => void) | null) => void;
}

export const PAGE_PADDING = 48;
