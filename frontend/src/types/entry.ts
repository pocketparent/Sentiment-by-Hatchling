import { JournalEntry } from './index';

export interface EntryFilters {
  tag?: string;
  author_id?: string;
  privacy?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface EntryFormData {
  content?: string;
  date_of_memory: string;
  privacy: 'private' | 'shared' | 'public';
  tags?: string[];
  media?: File | null;
  author_id?: string;
  source_type?: 'app' | 'sms' | 'voice';
}

export interface TagGenerationResponse {
  tags: string[];
  success: boolean;
  error?: string;
}

export interface EntryResponse {
  entry: JournalEntry;
  success: boolean;
  message?: string;
}

export interface EntriesResponse {
  entries: JournalEntry[];
  success: boolean;
  total?: number;
  message?: string;
}
