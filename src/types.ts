export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export type BotTone = 'friendly' | 'casual' | 'professional' | 'concise';
export type BotLanguage = 'id' | 'en';

export interface BotConfig {
  botName: string;
  welcomeMessage: string;
  businessName: string;
  businessDescription: string;
  category: string;
  operationalHours: string;
  addressOrWebsite: string;
  contactNumber: string;
  refundPolicy: string;
  faqs: FAQItem[];
  tone: BotTone;
  language: BotLanguage;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  responseTime?: number; // response time in milliseconds
}

export interface ChatSession {
  id: string;
  customerName: string;
  messages: Message[];
  createdAt: string;
}

export interface KeywordStat {
  text: string;
  value: number;
}
