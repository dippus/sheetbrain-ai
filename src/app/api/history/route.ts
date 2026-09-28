import { NextResponse } from 'next/server';

export async function GET() {
  const history = [
    { id: '1', prompt: 'Build a 12-month SaaS runway model with 3 hiring tiers and burn rate chart', timestamp: new Date().toISOString() },
    { id: '2', prompt: 'E-Commerce CAC & LTV Retention Cohort', timestamp: new Date().toISOString() },
    { id: '3', prompt: 'Cap Table Dilution Model for Series A', timestamp: new Date().toISOString() },
  ];
  return NextResponse.json({ success: true, history });
}
