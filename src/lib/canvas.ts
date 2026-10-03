import { m } from '$lib/paraglide/messages';

export const CANVAS_KEYS = ['problem', 'beneficiaries', 'solution', 'value', 'partners', 'resources', 'costs', 'risks', 'measures'] as const;
export type CanvasKey = (typeof CANVAS_KEYS)[number];

export function canvasLabel(k: string) {
	return (
		{
			problem: m.canvas_problem,
			beneficiaries: m.canvas_beneficiaries,
			solution: m.canvas_solution,
			value: m.canvas_value,
			partners: m.canvas_partners,
			resources: m.canvas_resources,
			costs: m.canvas_costs,
			risks: m.canvas_risks,
			measures: m.canvas_measures
		}[k] ?? (() => k)
	)();
}
