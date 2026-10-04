import '@fontsource-variable/inter';
import '@fontsource-variable/source-serif-4';
import { Composition } from 'remotion';
import { Main, DURATION } from './Main';
import { FPS } from './theme';

export const Root = () => (
	<Composition
		id="Main"
		component={Main}
		durationInFrames={DURATION}
		fps={FPS}
		width={1920}
		height={1080}
	/>
);
