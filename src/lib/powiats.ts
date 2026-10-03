// Schematic tile layout of the 22 Małopolska powiats (official TERYT codes), placed on
// a grid roughly by geography. A cartogram keeps every powiat the same size, so small
// city powiats stay readable and clickable.
export type PowiatTile = { teryt: string; name: string; col: number; row: number; city?: boolean };

export const POWIAT_TILES: PowiatTile[] = [
	{ teryt: '1212', name: 'olkuski', col: 1, row: 0 },
	{ teryt: '1208', name: 'miechowski', col: 2, row: 0 },
	{ teryt: '1203', name: 'chrzanowski', col: 0, row: 1 },
	{ teryt: '1206', name: 'krakowski', col: 1, row: 1 },
	{ teryt: '1214', name: 'proszowicki', col: 2, row: 1 },
	{ teryt: '1204', name: 'dąbrowski', col: 5, row: 1 },
	{ teryt: '1213', name: 'oświęcimski', col: 0, row: 2 },
	{ teryt: '1261', name: 'Kraków', col: 1, row: 2, city: true },
	{ teryt: '1219', name: 'wielicki', col: 2, row: 2 },
	{ teryt: '1201', name: 'bocheński', col: 3, row: 2 },
	{ teryt: '1202', name: 'brzeski', col: 4, row: 2 },
	{ teryt: '1263', name: 'Tarnów', col: 5, row: 2, city: true },
	{ teryt: '1216', name: 'tarnowski', col: 6, row: 2 },
	{ teryt: '1218', name: 'wadowicki', col: 0, row: 3 },
	{ teryt: '1209', name: 'myślenicki', col: 1, row: 3 },
	{ teryt: '1207', name: 'limanowski', col: 3, row: 3 },
	{ teryt: '1210', name: 'nowosądecki', col: 4, row: 3 },
	{ teryt: '1205', name: 'gorlicki', col: 6, row: 3 },
	{ teryt: '1215', name: 'suski', col: 1, row: 4 },
	{ teryt: '1211', name: 'nowotarski', col: 2, row: 4 },
	{ teryt: '1262', name: 'Nowy Sącz', col: 4, row: 4, city: true },
	{ teryt: '1217', name: 'tatrzański', col: 2, row: 5 }
];

export const POWIAT_NAME = new Map(POWIAT_TILES.map((p) => [p.teryt, p.name]));
