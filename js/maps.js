'use strict';
// Each map: a 30×30 cell grid carved out of solid wall ('#').
// '.' floor · 'A'/'B' bomb sites · 'S' KT spawn · 'T' T spawn · 'c' crate · 'C' stacked crate / container
// letters: where the site letter is painted · via: route cells T bots may take · mid: cells KT bots hold
const MAPS = [
  {
    id: 'qumtepa', code: 'de_qumtepa', name: 'Qumtepa', blurb: 'Cho‘l shaharchasi · uzun A, tor tunnellar',
    build(carve, put) {
      carve(1, 1, 8, 7); carve(11, 1, 18, 4); carve(21, 1, 28, 7); carve(8, 2, 11, 3); carve(18, 2, 21, 3); carve(9, 5, 12, 5);
      carve(13, 5, 16, 22); carve(25, 8, 27, 22); carve(17, 8, 20, 9); carve(19, 6, 20, 8);
      carve(2, 8, 4, 20); carve(5, 15, 12, 16); carve(9, 23, 20, 28); carve(2, 20, 9, 24); carve(20, 22, 27, 25);
      put(13, 12, '#'); put(16, 12, '#'); put(25, 10, '#'); put(2, 13, '#');
      carve(2, 2, 7, 6, 'B'); carve(22, 2, 27, 6, 'A'); carve(12, 1, 17, 2, 'S'); carve(11, 26, 18, 27, 'T');
      [[3,3,'c'],[4,3,'C'],[6,5,'c'],[2,6,'c'],[7,2,'c'],[24,3,'c'],[25,3,'C'],[25,4,'c'],[27,6,'c'],[22,5,'c'],
       [15,9,'c'],[14,17,'c'],[27,15,'c'],[25,19,'C'],[12,24,'c'],[17,25,'c'],[18,25,'C'],[4,11,'c'],[6,22,'c'],[7,22,'C'],
       [18,9,'c'],[23,23,'C']].forEach(([x, y, c]) => put(x, y, c));
    },
    letters: { A: [24.5, 4], B: [4.5, 4] },
    via: { A: [[26, 15], [18, 8]], B: [[3, 14], [8, 15]] }, mid: [[14, 7], [15, 6]],
    theme: {
      sky: [0x4f86cf, 0xd6e3ee, 0xe2cfaa], cloud: 0.25, fog: [0xd9cbb0, 70, 300], exposure: 1.0,
      sunDir: [0.45, 0.8, 0.3], sunCol: 0xfff0d6, sunI: 2.6, hemi: [0xdfe9ff, 0xa8835a, 0.75],
      floor: { style: 'slabs', base: '#bd9a62' }, wall: { style: 'plaster', base: '#cdb081' }, wallH: [5.2, 7.6],
      cap: 0x9a7d55, crate: 'wood', ground: 0xc9a872, far: 0xcdb48a, landmark: 'dome',
      windows: 'dark', awnings: [0xb3412e, 0x2f6f8f, 0xd8a73a], cables: true, barrels: 0x5b6a3a, stepF: 520, wind: 0.12
    }
  },
  {
    id: 'eskishahar', code: 'de_eskishahar', name: 'Eskishahar', blurb: 'Tosh ko‘chalar · saroy, bozor va o‘rta yo‘lak',
    build(carve, put) {
      carve(24, 11, 28, 19);  // T spawn
      carve(1, 11, 5, 18);    // KT spawn
      carve(5, 21, 13, 28);   // A
      carve(5, 1, 13, 8);     // B
      carve(20, 17, 23, 19); carve(20, 20, 21, 22); carve(14, 22, 21, 23); // rampa → A
      carve(25, 20, 27, 27); carve(14, 26, 27, 27);                         // saroy → A
      carve(9, 13, 23, 15); carve(6, 15, 8, 16);                            // o‘rta
      carve(10, 16, 12, 20);                                                // o‘rmon → A
      carve(24, 5, 26, 10); carve(14, 5, 23, 6);                            // kvartiralar → B
      carve(15, 7, 16, 12);                                                 // o‘rta → B
      carve(1, 8, 4, 10); carve(1, 19, 4, 24);                              // KT → B, KT → A
      carve(6, 22, 12, 27, 'A'); carve(6, 2, 12, 7, 'B'); carve(2, 12, 4, 16, 'S'); carve(25, 13, 27, 17, 'T');
      [[8,23,'C'],[9,23,'c'],[11,26,'c'],[6,27,'c'],[8,4,'c'],[10,5,'C'],[12,3,'c'],[17,14,'C'],[12,13,'c'],
       [26,23,'c'],[20,5,'c'],[22,13,'c'],[3,21,'c'],[21,22,'c'],[2,9,'c']].forEach(([x, y, c]) => put(x, y, c));
    },
    letters: { A: [8.5, 24.5], B: [8.5, 4] },
    via: { A: [[21, 21], [26, 24]], B: [[24, 7], [16, 10]] }, mid: [[11, 14], [7, 16], [11, 18]],
    theme: {
      sky: [0x3f78c0, 0xe6dccb, 0xd9c3a0], cloud: 0.45, fog: [0xdfd3c2, 60, 280], exposure: 1.05,
      sunDir: [-0.55, 0.62, -0.45], sunCol: 0xffdcae, sunI: 2.7, hemi: [0xd6e4ff, 0x8a7258, 0.7],
      floor: { style: 'cobble', base: '#8f8576' }, wall: { style: 'stucco', base: '#d9b48a' }, wallH: [5.6, 8.4],
      cap: 0xa0522d, crate: 'wood', ground: 0x8e8473, far: 0xd8c3a2, landmark: 'tower',
      windows: 'shutter', shutter: '#3f6b4f', awnings: [0x8f2d2d, 0x2c5a7a, 0xc7922f, 0x4f7a3a], cables: true, barrels: 0x6b4a2b, stepF: 900, wind: 0.08
    }
  },
  {
    id: 'ombor', code: 'de_ombor', name: 'Ombor', blurb: 'Port hovlisi · konteynerlar va yopiq ombor',
    build(carve, put) {
      carve(1, 22, 8, 28); carve(21, 1, 28, 7);           // T va KT spawn
      carve(1, 1, 8, 21); carve(9, 1, 20, 6); carve(21, 8, 28, 28); carve(9, 23, 20, 28); // hovlilar
      carve(11, 9, 18, 20);                                 // ombor zali
      carve(9, 12, 10, 13); carve(19, 16, 20, 17); carve(14, 7, 15, 8); carve(13, 21, 14, 22); // ombor eshiklari
      carve(2, 2, 7, 7, 'A'); carve(12, 10, 17, 14, 'B'); carve(2, 25, 7, 27, 'T'); carve(22, 2, 27, 3, 'S');
      [[4,10,'C'],[5,10,'C'],[3,14,'c'],[6,17,'C'],[2,19,'c'],[12,3,'C'],[13,3,'C'],[17,4,'c'],[24,11,'C'],[25,11,'C'],
       [23,15,'c'],[26,19,'C'],[27,19,'C'],[24,24,'c'],[12,25,'C'],[16,26,'c'],[18,24,'C'],[4,4,'C'],[5,5,'c'],
       [14,12,'C'],[16,13,'c'],[12,18,'c'],[17,17,'C'],[7,23,'c'],[22,6,'c']].forEach(([x, y, c]) => put(x, y, c));
    },
    letters: { A: [4.5, 4.5], B: [14.5, 12] },
    roofs: [[11, 9, 18, 20]],
    via: { A: [[5, 15], [10, 3]], B: [[9, 12], [13, 22]] }, mid: [[22, 12], [19, 16], [15, 7]],
    theme: {
      sky: [0x7f97ad, 0xc9d1d6, 0xa9adae], cloud: 0.8, fog: [0xb9c0c5, 45, 230], exposure: 1.1,
      sunDir: [0.3, 0.75, -0.55], sunCol: 0xeef2ff, sunI: 1.9, hemi: [0xcfd8e2, 0x55585a, 1.0],
      floor: { style: 'asphalt', base: '#5d5f60' }, wall: { style: 'concrete', base: '#9a9b96' }, wallH: [6, 8.8],
      cap: 0x6d6f70, crate: 'container', ground: 0x56595b, far: 0x8c9196, landmark: 'cranes',
      windows: 'glass', awnings: null, cables: false, lamps: true, barrels: 0x2f5c8a, stepF: 1400, wind: 0.18
    }
  },
  {
    id: 'qorliq', code: 'de_qorliq', name: 'Qorliq', blurb: 'Qishki qishloq · markaziy maydon, ikki yon yo‘l',
    build(carve, put) {
      carve(10, 1, 19, 4); carve(11, 25, 18, 28);           // T va KT spawn
      carve(1, 19, 9, 27); carve(20, 19, 28, 27);           // A va B
      carve(10, 25, 10, 27); carve(19, 25, 19, 27);         // KT → saytlar
      carve(2, 3, 4, 18); carve(5, 3, 9, 4);                // g‘arbiy yo‘l
      carve(25, 3, 27, 18); carve(20, 3, 24, 4);            // sharqiy yo‘l
      carve(13, 5, 16, 12); carve(8, 13, 21, 17); carve(13, 14, 16, 16, '#'); // markaz va maydon
      carve(7, 17, 8, 18); carve(21, 17, 22, 18); carve(13, 18, 16, 24);      // maydon → saytlar, KT o‘rta
      carve(5, 10, 12, 11); carve(17, 7, 24, 8);            // yon bog‘lovchilar
      carve(2, 20, 8, 26, 'A'); carve(21, 20, 27, 26, 'B'); carve(11, 1, 18, 2, 'T'); carve(12, 27, 17, 28, 'S');
      [[3,21,'C'],[5,23,'c'],[7,25,'c'],[8,20,'c'],[22,21,'c'],[24,22,'C'],[26,25,'c'],[21,24,'c'],[10,15,'c'],[19,14,'C'],
       [3,9,'c'],[26,13,'c'],[14,3,'C'],[15,8,'c'],[14,21,'c']].forEach(([x, y, c]) => put(x, y, c));
    },
    letters: { A: [5, 23], B: [24, 23] },
    via: { A: [[3, 12], [8, 16]], B: [[26, 12], [21, 16]] }, mid: [[14, 19], [15, 22], [10, 14]],
    theme: {
      sky: [0x8aa5c0, 0xe4ebf1, 0xdfe6ec], cloud: 0.75, fog: [0xdde5ec, 35, 190], exposure: 1.0,
      sunDir: [0.5, 0.55, 0.45], sunCol: 0xfff3e2, sunI: 1.6, hemi: [0xdbe6f2, 0xb9c4cf, 1.05],
      floor: { style: 'snow', base: '#e6ecf1' }, wall: { style: 'brick', base: '#8a5a44' }, wallH: [5.4, 7.2],
      cap: 0xf2f6f9, crate: 'wood', crateSnow: true, ground: 0xe9eff4, far: 0x6f5a4c, landmark: 'pines',
      windows: 'glass-warm', awnings: null, cables: true, barrels: 0x7a2e24, snow: true, stepF: 380, wind: 0.22
    }
  }
];
