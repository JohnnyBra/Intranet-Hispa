import React from 'react';

export interface User {
  email: string;
  name: string;
  avatar?: string;
  role: 'teacher' | 'admin';
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'doc' | 'link' | 'video' | 'image';
  url: string;
  uploadedBy: string;
  date: string;
  category: string;
  // New tagging fields
  courses?: string[]; // Array to allow multiple courses (e.g. ['1º ESO', '2º ESO'])
  subject?: string;   // e.g. 'Matemáticas'
}

export interface Photo {
  id: string;
  url: string; // Base64 or URL
  uploadedBy: string;
  date: string;
}

export interface ClassFolder {
  id: string;
  className: string; // e.g., "1º Primaria A"
  photos: Photo[];
}

export interface SchoolEvent {
  id: string;
  title: string; // e.g., "Carnaval 2025"
  date: string;
  folders: ClassFolder[];
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface SectionInfo {
  id: string; // matches path
  title: string;
  description: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactNode; 
  iconName?: string; 
  path?: string; 
  externalUrl?: string;
  children?: NavItem[];
}