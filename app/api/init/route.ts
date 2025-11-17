import { NextResponse } from 'next/server';

// Run initialization on first request
let isInitialized = false;

function initializeApp() {
  if (isInitialized) return;
  
  console.log('[Init Route] Initializing application...');
  
  // Import and run initialization
  import('@/lib/init');
  
  isInitialized = true;
  console.log('[Init Route] ✓ Application initialized');
}

export async function GET() {
  // Initialize on first request
  initializeApp();
  
  return NextResponse.json({ 
    status: 'ok', 
    initialized: isInitialized,
    message: 'Application initialized successfully' 
  });
}