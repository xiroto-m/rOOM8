import { Timestamp } from "firebase/firestore";

export interface CreatorCard {
  id?: string;
  name: string;
  specialty: string;
  bio: string;
  imageUrl?: string;
  instagram?: string;
  twitter?: string;
  likesCount?: number;
  isExhibitingToday?: boolean;
  isPastExhibitor?: boolean;
  createdAt: any; // Date, Timestamp or ServerTimestamp
}

export interface Referral {
  id?: string;
  creatorId: string;
  introducerName: string;
  introducerContact?: string;
  reason: string;
  icebreakers: string[];
  conversationCount: number;
  authorDeviceId?: string;
  authorIP?: string;
  likesCount?: number;
  createdAt: any;
}

export interface MediaContent {
  id?: string;
  title: string;
  description?: string;
  youtubeUrl: string;
  likesCount: number;
  tipsCount: number;
  tipsTotalYen: number;
  createdAt: any;
}

export interface TipTransaction {
  id?: string;
  contentId: string;
  amount: number;
  backerName: string;
  cheerMessage?: string;
  authorDeviceId?: string;
  authorIP?: string;
  likesCount?: number;
  createdAt: any;
}

export interface LostItem {
  id?: string;
  title: string;
  artist: string;
  description: string;
  imageUrl: string;
  foundDate: string;
  frameStyle: 'gold' | 'wood' | 'brutalist' | 'neon' | 'none';
  status: 'exhibiting' | 'claimed' | 'archived';
  likesCount?: number;
  createdAt: any;
}

