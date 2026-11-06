'use strict';
// Each map: a 30×30 cell grid carved out of solid wall ('#').
// '.' floor · 'A'/'B' bomb sites · 'S' KT spawn · 'T' T spawn · 'c' crate · 'C' stacked crate / container
// 'h' boost spot: a block too tall to jump onto alone — a teammate has to boost you · houses: rooms with a roof
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
      put(27, 3, 'h'); put(4, 6, 'h'); // boost joylari
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
      put(10, 3, 'h'); put(14, 14, 'h'); // boost joylari
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
      put(6, 3, 'h'); put(16, 2, 'h'); // boost joylari
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
      put(6, 21, 'h'); put(26, 21, 'h'); // boost joylari
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
  },
  {
    id: 'registon', code: 'de_registon', name: 'Registon', blurb: 'Uch madrasa maydoni · koshinli devorlar, quyosh botishi',
    build(carve, put) {
      carve(11, 1, 18, 3); carve(11, 25, 18, 28);                       // KT va T spawn
      carve(1, 3, 8, 9); carve(21, 3, 28, 9);                           // A va B
      carve(5, 1, 10, 3); carve(19, 1, 24, 3);                          // KT → saytlar
      carve(9, 11, 20, 18);                                              // Registon maydoni
      put(12, 13, '#'); put(17, 13, '#'); put(12, 16, '#'); put(17, 16, '#'); // maydondagi ustunlar
      carve(14, 4, 15, 10); carve(14, 19, 15, 24);                      // o‘rta yo‘l
      carve(4, 10, 8, 12); carve(21, 10, 25, 12);                       // maydon → saytlar
      carve(1, 10, 3, 26); carve(4, 24, 10, 26);                        // uzun A
      carve(26, 10, 28, 26); carve(19, 24, 25, 26);                     // uzun B
      carve(4, 16, 8, 17); carve(21, 15, 25, 16);                       // yon eshiklar
      carve(2, 4, 7, 8, 'A'); carve(22, 4, 27, 8, 'B'); carve(12, 1, 17, 2, 'S'); carve(12, 26, 17, 27, 'T');
      [[3,5,'C'],[6,7,'c'],[5,4,'c'],[24,5,'C'],[22,7,'c'],[26,4,'c'],[10,12,'c'],[19,17,'C'],[14,15,'c'],
       [2,20,'c'],[27,14,'c'],[7,25,'C'],[22,25,'c'],[13,22,'c'],[15,7,'c']].forEach(([x, y, c]) => put(x, y, c));
      put(3, 7, 'h'); put(26, 7, 'h'); // boost joylari
    },
    letters: { A: [4.5, 5.5], B: [24.5, 5.5] },
    via: { A: [[2, 18], [6, 11]], B: [[27, 18], [23, 11]] }, mid: [[14, 8], [15, 6]],
    theme: {
      sky: [0x34508f, 0xf0b27a, 0xe59a58], cloud: 0.35, fog: [0xe6b48a, 55, 250], exposure: 1.05,
      sunDir: [-0.7, 0.36, 0.42], sunCol: 0xffc68a, sunI: 2.4, hemi: [0xffd8b0, 0x6f5236, 0.75],
      floor: { style: 'slabs', base: '#c8b089' }, wall: { style: 'majolica', base: '#c9a77a' }, wallH: [6.4, 9.4],
      cap: 0x2f8f9d, crate: 'wood', ground: 0xb89a70, far: 0xc9a77a, landmark: 'dome',
      windows: 'shutter', shutter: '#2f6f8f', awnings: [0x2f6f8f, 0xc7922f, 0x8f2d2d], cables: false, barrels: 0x6b4a2b, stepF: 600, wind: 0.1
    }
  },
  {
    id: 'voha', code: 'de_voha', name: 'Voha', blurb: 'Cho‘ldagi voha · palmalar, oq uylar, uch yo‘lak',
    build(carve, put) {
      carve(1, 11, 4, 18); carve(25, 11, 28, 18);                       // KT va T spawn
      carve(10, 1, 19, 7); carve(10, 22, 19, 28);                       // A va B
      carve(9, 11, 20, 18); carve(13, 13, 16, 16, '#');                 // markaziy hovli, o‘rtada uy
      carve(2, 4, 4, 10); carve(5, 4, 9, 5);                            // KT → A
      carve(2, 19, 4, 25); carve(5, 24, 9, 25);                         // KT → B
      carve(5, 14, 8, 15); carve(21, 14, 24, 15);                       // spawnlar → hovli
      carve(25, 4, 27, 10); carve(20, 4, 24, 5);                        // T → A
      carve(25, 19, 27, 25); carve(20, 24, 24, 25);                     // T → B
      carve(14, 8, 15, 10); carve(14, 19, 15, 21);                      // hovli → saytlar
      carve(11, 2, 18, 6, 'A'); carve(11, 23, 18, 27, 'B'); carve(1, 12, 3, 17, 'S'); carve(26, 12, 28, 17, 'T');
      [[12,3,'C'],[16,5,'c'],[17,2,'c'],[12,25,'c'],[16,24,'C'],[13,27,'c'],[10,12,'c'],[19,17,'c'],[10,17,'C'],
       [18,12,'C'],[3,7,'c'],[26,8,'c'],[3,22,'c'],[26,21,'C'],[7,4,'c'],[22,25,'c']].forEach(([x, y, c]) => put(x, y, c));
      put(18, 5, 'h'); put(11, 15, 'h'); // boost joylari
    },
    letters: { A: [14.5, 4], B: [14.5, 25] },
    via: { A: [[26, 7], [22, 5]], B: [[26, 22], [22, 24]] }, mid: [[11, 12], [11, 17], [8, 15]],
    theme: {
      sky: [0x3c86d6, 0xd9ecf5, 0xf0e2c0], cloud: 0.2, fog: [0xe5dcc4, 70, 300], exposure: 1.0,
      sunDir: [0.3, 0.85, -0.35], sunCol: 0xfff4de, sunI: 2.8, hemi: [0xe2efff, 0x9c8a5c, 0.8],
      floor: { style: 'slabs', base: '#d8c294' }, wall: { style: 'stucco', base: '#ece4d4' }, wallH: [4.8, 7],
      cap: 0x8a6a46, crate: 'wood', ground: 0xd6bd88, far: 0xc9b88f, landmark: 'palms',
      windows: 'shutter', shutter: '#3b7a8f', awnings: [0x2f8f6f, 0xd8a73a, 0xb3412e], cables: false, barrels: 0x3e6b45, stepF: 520, wind: 0.14
    }
  },
  {
    id: 'tungi', code: 'de_tungi_bozor', name: 'Tungi bozor', blurb: 'Kechasi · chiroqlar, rastalar va tor yo‘laklar',
    build(carve, put) {
      carve(1, 1, 6, 5); carve(23, 24, 28, 28);                         // KT va T spawn
      carve(20, 1, 28, 8); carve(1, 21, 9, 28);                         // A va B
      carve(9, 9, 20, 20); carve(14, 14, 15, 15, '#');                  // bozor zali
      carve(7, 2, 19, 3); carve(2, 6, 3, 20);                           // KT → A, KT → B
      carve(10, 24, 22, 25); carve(26, 9, 27, 23);                      // T → B, T → A
      carve(14, 4, 15, 8); carve(14, 21, 15, 23);                       // zalga eshiklar
      carve(4, 14, 8, 15); carve(21, 14, 25, 15);
      carve(21, 2, 27, 7, 'A'); carve(2, 22, 8, 27, 'B'); carve(2, 2, 5, 4, 'S'); carve(24, 25, 27, 27, 'T');
      [[11,11,'C'],[18,11,'c'],[11,18,'c'],[18,18,'C'],[12,14,'c'],[17,15,'c'],[23,3,'C'],[25,6,'c'],[27,2,'c'],
       [4,23,'C'],[6,26,'c'],[8,22,'c'],[12,2,'c'],[2,12,'c'],[17,25,'c'],[27,17,'c']].forEach(([x, y, c]) => put(x, y, c));
      put(25, 3, 'h'); put(16, 11, 'h'); // boost joylari
    },
    letters: { A: [24, 4.5], B: [5, 24.5] },
    via: { A: [[26, 16], [15, 6]], B: [[16, 24], [6, 14]] }, mid: [[12, 12], [17, 12], [14, 10]],
    theme: {
      sky: [0x0a1030, 0x2a3566, 0x4a3a50], cloud: 0.3, fog: [0x1f2740, 40, 190], exposure: 1.5,
      sunDir: [-0.35, 0.7, 0.5], sunCol: 0xa8bcff, sunI: 1.0, hemi: [0x7080c0, 0x9a6232, 1.2],
      floor: { style: 'cobble', base: '#8a8276' }, wall: { style: 'stucco', base: '#cdb08c' }, wallH: [5.2, 7.8],
      cap: 0x5a3f2a, crate: 'wood', ground: 0x3a362f, far: 0x1d2030, landmark: 'dome',
      windows: 'glass-warm', awnings: [0xb3412e, 0x2f6f8f, 0xd8a73a, 0x6a3a8f], cables: true, lamps: 'many', barrels: 0x6b4a2b, stepF: 900, wind: 0.06
    }
  },
  {
    id: 'mahalla', code: 'de_mahalla', name: 'Mahalla', cell: 3.6, blurb: 'Uylar ichidan qisqa yo‘l, ko‘chalardan uzun yo‘l · B uy ichida · boost joylari',
    build(carve, put) {
      carve(11, 1, 18, 3); carve(11, 25, 18, 28);                                                  // KT va T spawn
      carve(1, 4, 8, 11); carve(21, 4, 28, 11);                                                    // A hovli, B — katta uy ichida
      carve(5, 1, 10, 3); carve(19, 1, 24, 3);                                                     // KT → saytlar
      carve(14, 4, 15, 24);                                                                        // o‘rta ko‘cha
      carve(1, 12, 2, 26); carve(3, 25, 10, 26);                                                   // uzun A ko‘chasi
      carve(27, 12, 28, 26); carve(19, 25, 26, 26);                                                // uzun B ko‘chasi
      carve(5, 15, 10, 20); carve(7, 21, 8, 24); carve(6, 12, 7, 14); carve(11, 17, 13, 17);      // 1-uy: qisqa A
      carve(19, 15, 24, 20); carve(21, 21, 22, 24); carve(22, 12, 23, 14); carve(16, 17, 18, 17); // 2-uy (choyxona): qisqa B
      carve(9, 8, 13, 9); carve(16, 8, 20, 9);                                                     // o‘rtadan saytlarga
      carve(2, 5, 7, 10, 'A'); carve(22, 5, 27, 10, 'B'); carve(12, 1, 17, 2, 'S'); carve(12, 26, 17, 27, 'T');
      [[3,6,'h'],[26,9,'h'],[14,13,'h'],[5,9,'C'],[6,6,'c'],[24,6,'C'],[23,9,'c'],[9,18,'c'],[20,16,'c'],[2,20,'c'],[27,21,'c'],[15,21,'c'],[12,25,'c'],[17,3,'c'],[10,15,'c'],[19,19,'C']]
        .forEach(([x, y, c]) => put(x, y, c));
    },
    letters: { A: [4.5, 7.5], B: [24.5, 7.5] },
    houses: [[5, 15, 10, 20], [19, 15, 24, 20], [21, 4, 28, 11]],
    via: { A: [[1, 18], [7, 17]], B: [[28, 18], [21, 17]] }, mid: [[14, 10], [15, 7]],
    theme: {
      sky: [0x4a82c8, 0xdfe8ef, 0xe9dcc2], cloud: 0.35, fog: [0xe0d6c4, 60, 260], exposure: 1.05,
      sunDir: [0.45, 0.75, 0.4], sunCol: 0xfff0d8, sunI: 2.5, hemi: [0xe2ecff, 0x9a8466, 0.95],
      floor: { style: 'cobble', base: '#a49480' }, wall: { style: 'stucco', base: '#e8dcc6' }, wallH: [4.2, 5.6],
      cap: 0x8a5a3a, crate: 'wood', ground: 0xa49480, far: 0xd8c8aa, landmark: 'tower',
      windows: 'shutter', shutter: '#3f6b8f', awnings: [0xb3412e, 0x2f6f8f, 0xd8a73a, 0x4f7a3a], cables: true, barrels: 0x6b4a2b, stepF: 900, wind: 0.08
    }
  },
  // ---------- Gun Game arenas: small, fast, no bomb sites ----------
  {
    id: 'gg_hovli', code: 'gg_hovli', name: 'Hovli', pool: 'gg', blurb: 'Gun Game · to‘rtta uy orasidagi kichik hovli',
    build(carve, put) {
      carve(6, 6, 23, 23);
      carve(10, 10, 12, 12, '#'); carve(17, 10, 19, 12, '#'); carve(10, 17, 12, 19, '#'); carve(17, 17, 19, 19, '#'); carve(14, 14, 15, 15, '#');
      carve(7, 7, 8, 8, 'S'); carve(21, 21, 22, 22, 'T'); put(14, 8, 'A'); put(15, 21, 'B');
      [[8,14,'c'],[21,15,'c'],[14,11,'C'],[15,18,'c'],[7,20,'c'],[22,9,'C'],[11,15,'c'],[18,14,'c']].forEach(([x, y, c]) => put(x, y, c));
    },
    letters: {}, via: { A: [[14, 7]], B: [[15, 22]] }, mid: [[13, 13], [16, 16]],
    theme: {
      sky: [0x4a86cf, 0xdbe6ee, 0xe6d3ae], cloud: 0.3, fog: [0xdccdb0, 60, 260], exposure: 1.0,
      sunDir: [0.4, 0.8, -0.35], sunCol: 0xfff0d6, sunI: 2.6, hemi: [0xdfe9ff, 0xa8835a, 0.8],
      floor: { style: 'cobble', base: '#9a8f7e' }, wall: { style: 'stucco', base: '#e0c49a' }, wallH: [4.6, 6.6],
      cap: 0xa0522d, crate: 'wood', ground: 0x9a8f7e, far: 0xd8c3a2, landmark: 'tower',
      windows: 'shutter', shutter: '#4f6b3f', awnings: [0xb3412e, 0x2f6f8f, 0xd8a73a], cables: true, barrels: 0x6b4a2b, stepF: 900, wind: 0.1
    }
  },
  {
    id: 'gg_zal', code: 'gg_sport_zali', name: 'Sport zali', pool: 'gg', blurb: 'Gun Game · yopiq zal, o‘rtada uzun devor',
    build(carve, put) {
      carve(3, 9, 26, 20);
      carve(8, 14, 21, 15, '#'); put(6, 11, '#'); put(23, 18, '#'); put(23, 11, '#'); put(6, 18, '#');
      carve(4, 10, 5, 11, 'S'); carve(24, 18, 25, 19, 'T'); put(14, 10, 'A'); put(15, 19, 'B');
      [[11,11,'c'],[18,12,'C'],[11,18,'C'],[18,17,'c'],[3,15,'c'],[26,14,'c'],[14,17,'c'],[15,12,'c']].forEach(([x, y, c]) => put(x, y, c));
    },
    letters: {}, roofs: [[3, 9, 26, 20]], via: { A: [[14, 11]], B: [[15, 18]] }, mid: [[4, 14], [25, 15]],
    theme: {
      sky: [0x7f97ad, 0xc9d1d6, 0xa9adae], cloud: 0.7, fog: [0xb9c0c5, 45, 220], exposure: 1.15,
      sunDir: [0.3, 0.8, -0.5], sunCol: 0xeef2ff, sunI: 1.8, hemi: [0xdfe6ee, 0x6a6e70, 1.15],
      floor: { style: 'slabs', base: '#b08a5a' }, wall: { style: 'concrete', base: '#b8b9b4' }, wallH: [6, 7],
      cap: 0x6d6f70, crate: 'container', ground: 0x56595b, far: 0x8c9196, landmark: 'cranes',
      windows: 'glass', awnings: null, cables: false, lamps: 'many', barrels: 0x2f5c8a, stepF: 1400, wind: 0.04
    }
  },
  {
    id: 'gg_labirint', code: 'gg_qor_labirint', name: 'Qor labirinti', pool: 'gg', blurb: 'Gun Game · tor yo‘laklar va markaziy maydon',
    build(carve, put) {
      carve(3, 3, 26, 5); carve(3, 24, 26, 26); carve(3, 3, 5, 26); carve(24, 3, 26, 26);
      carve(3, 14, 26, 15); carve(14, 3, 15, 26); carve(10, 10, 19, 19);
      carve(4, 4, 5, 5, 'S'); carve(24, 25, 25, 26, 'T'); put(14, 4, 'A'); put(15, 25, 'B');
      [[12,12,'C'],[17,17,'C'],[12,17,'c'],[17,12,'c'],[9,4,'c'],[20,25,'c'],[4,20,'c'],[25,9,'c'],[8,15,'c'],[21,14,'c']].forEach(([x, y, c]) => put(x, y, c));
    },
    letters: {}, via: { A: [[14, 7]], B: [[15, 22]] }, mid: [[11, 11], [18, 18]],
    theme: {
      sky: [0x8aa5c0, 0xe4ebf1, 0xdfe6ec], cloud: 0.75, fog: [0xdde5ec, 35, 170], exposure: 1.0,
      sunDir: [0.5, 0.55, 0.45], sunCol: 0xfff3e2, sunI: 1.6, hemi: [0xdbe6f2, 0xb9c4cf, 1.05],
      floor: { style: 'snow', base: '#e6ecf1' }, wall: { style: 'brick', base: '#7a4a3a' }, wallH: [4.4, 6],
      cap: 0xf2f6f9, crate: 'wood', crateSnow: true, ground: 0xe9eff4, far: 0x6f5a4c, landmark: 'pines',
      windows: 'glass-warm', awnings: null, cables: true, barrels: 0x7a2e24, snow: true, stepF: 380, wind: 0.2
    }
  },
  // ---------- Modli jang: one map, mods rolled at random ----------
  {
    id: 'mod_orol', code: 'mod_sirli_orol', name: 'Sirli orol', pool: 'mod', blurb: 'Modli jang · har 45 soniyada yangi tasodifiy modlar',
    build(carve, put) {
      carve(2, 2, 27, 27);
      carve(6, 6, 9, 9, '#'); carve(20, 6, 23, 9, '#'); carve(6, 20, 9, 23, '#'); carve(20, 20, 23, 23, '#');
      carve(13, 4, 16, 6, '#'); carve(13, 23, 16, 25, '#'); carve(4, 13, 6, 16, '#'); carve(23, 13, 25, 16, '#');
      carve(13, 13, 16, 16, '#');
      carve(3, 3, 4, 4, 'S'); carve(25, 25, 26, 26, 'T'); put(14, 10, 'A'); put(15, 19, 'B');
      [[11,11,'c'],[18,11,'C'],[11,18,'C'],[18,18,'c'],[14,9,'c'],[15,20,'c'],[9,14,'c'],[20,15,'c'],[3,26,'C'],[26,3,'C']].forEach(([x, y, c]) => put(x, y, c));
    },
    letters: {}, via: { A: [[14, 11]], B: [[15, 18]] }, mid: [[10, 10], [19, 19]],
    theme: {
      sky: [0x2a1050, 0xff7ab6, 0xffc46b], cloud: 0.4, fog: [0xe8a6c8, 50, 230], exposure: 1.1,
      sunDir: [-0.6, 0.45, 0.45], sunCol: 0xffc8e0, sunI: 2.2, hemi: [0xffd0f0, 0x6a4a8a, 0.9],
      floor: { style: 'slabs', base: '#8fd0c4' }, wall: { style: 'plaster', base: '#d9a6c9' }, wallH: [5, 8],
      cap: 0x6a3a8f, crate: 'container', ground: 0x8fd0c4, far: 0xb88ad0, landmark: 'palms',
      windows: 'glass-warm', awnings: [0xff5fa2, 0x38e1ff, 0xffd23a, 0x8a6cff], cables: true, lamps: 'many', barrels: 0x8a6cff, stepF: 700, wind: 0.12
    }
  }
];
