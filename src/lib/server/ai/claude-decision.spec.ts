import { describe, it, expect, vi } from 'vitest';
import { choice, noul, score } from '@typesafe-ai/sdk';

vi.mock('./claude', () => ({
	structured: vi.fn(async () => ({
		area: { label: 'aging', confidence: 0.8 },
		urgent: { probability: 0.3 },
		fit: { level: 3, confidence: 0.6 }
	}))
}));
vi.mock('../env', () => ({ models: { fast: 'claude-haiku-4-5', generate: 'claude-sonnet-5-5' } }));

const { claudeDecisionProvider } = await import('./claude-decision');

describe('claudeDecisionProvider', () => {
	it('maps Claude answers onto the SystemOne response shapes', async () => {
		const a = await claudeDecisionProvider.ask(
			'test',
			{ text: 'x' },
			{
				area: choice('Which area?', { aging: 'Ageing', other: 'Other' }),
				urgent: noul('Urgent?'),
				fit: score('Fit?', ['0', '1', '2', '3', '4'])
			}
		);
		expect(a.area.choice).toBe('aging');
		expect(a.area.probabilities.aging).toBeCloseTo(0.8);
		expect(a.area.probabilities.other).toBeCloseTo(0.2);
		expect(a.urgent.noul).toBeCloseTo(0.3);
		expect(a.fit.probabilities['3']).toBeCloseTo(0.6);
		// expected score: 3 * 0.6 + (0 + 1 + 2 + 4) * 0.1
		expect(a.fit.score).toBeCloseTo(2.5);
	});
});
