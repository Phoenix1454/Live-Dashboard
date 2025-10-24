// API Configuration
// This allows the frontend to work in both development and production

/// <reference types="vite/client" />

export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
