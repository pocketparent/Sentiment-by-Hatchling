export interface JournalEntry {
  entry_id: string;
  content: string;
  media_url?: string;
  transcription?: string | null;
  tags: string[];
  date_of_memory: string;
  timestamp_created: string;
  author: {
    name: string;
    avatar: string;
  };
  privacy: 'private' | 'shared' | 'public';
  source_type: 'sms' | 'app' | 'voice';
}
