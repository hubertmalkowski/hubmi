<script lang="ts">
	// Dictation via the Web Speech API. Hidden when the browser has no support.
	import { onMount } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { Button } from '$lib/components/ui/button';
	import MicIcon from '@lucide/svelte/icons/mic';
	import MicOffIcon from '@lucide/svelte/icons/mic-off';

	let { onText }: { onText: (text: string) => void } = $props();

	type Recognition = {
		lang: string;
		continuous: boolean;
		interimResults: boolean;
		start(): void;
		stop(): void;
		onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
		onend: (() => void) | null;
		onerror: ((e: { error: string }) => void) | null;
	};

	let supported = $state(false);
	let listening = $state(false);
	let status = $state('');
	let rec: Recognition | undefined;

	const LANGS: Record<string, string> = { pl: 'pl-PL', en: 'en-GB', uk: 'uk-UA' };

	onMount(() => {
		const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
		const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
		if (!Ctor) return;
		supported = true;
		rec = new Ctor();
		rec.lang = LANGS[getLocale()] ?? 'pl-PL';
		rec.continuous = true;
		rec.interimResults = false;
		rec.onresult = (e) => {
			for (let i = e.resultIndex; i < e.results.length; i++) {
				if (e.results[i].isFinal) onText(e.results[i][0].transcript.trim());
			}
		};
		rec.onend = () => {
			listening = false;
			status = m.voice_stopped();
		};
		rec.onerror = (e) => {
			listening = false;
			status = e.error === 'not-allowed' ? m.voice_denied() : m.voice_error();
		};
	});

	function toggle() {
		if (!rec) return;
		if (listening) {
			rec.stop();
		} else {
			rec.start();
			listening = true;
			status = m.voice_listening();
		}
	}
</script>

{#if supported}
	<div class="flex items-center gap-3">
		<Button type="button" variant={listening ? 'destructive' : 'secondary'} size="lg" onclick={toggle} aria-pressed={listening}>
			{#if listening}<MicOffIcon class="size-5" aria-hidden="true" />{m.voice_stop()}{:else}<MicIcon
					class="size-5"
					aria-hidden="true"
				/>{m.voice_start()}{/if}
		</Button>
		<span class="text-muted-foreground text-sm" aria-live="polite">{status}</span>
	</div>
{/if}
